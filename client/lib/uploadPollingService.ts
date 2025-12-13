// lib/uploadPollingService.ts - Background polling service for upload jobs

import { uploadQueue, UploadJob } from './uploadQueue';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-web-service-docker.onrender.com";
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 600; // 30 minutes max (600 * 3s = 1800s)

// What the /vertex/jobs/{job_id}/result endpoint returns when status is "done"
interface VertexJobResult {
  ok: boolean;
  jobId: string;
  sourceVideoUrl: string;  // Signed download URL
  rawEvents: any[];        // Shot events array
  ranges: [number, number][]; // Computed time ranges
  videoDurationSec: number;
}

export class UploadPollingService {
  private static instance: UploadPollingService;
  private pollingIntervals: Map<string, number> = new Map();
  private pollAttempts: Map<string, number> = new Map();
  private isRunning = false;

  private constructor() {
    // Start service automatically
    this.start();
  }

  static getInstance(): UploadPollingService {
    if (!UploadPollingService.instance) {
      UploadPollingService.instance = new UploadPollingService();
    }
    return UploadPollingService.instance;
  }

  // Start the polling service
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[UploadPollingService] Started');

    // Resume polling for any active jobs
    this.resumeAllActiveJobs();

    // Listen for new jobs
    uploadQueue.subscribe(jobs => {
      const activeJobs = jobs.filter(
        job => (job.status === 'uploading' || job.status === 'processing') && job.jobId
      );

      activeJobs.forEach(job => {
        if (!this.pollingIntervals.has(job.id) && job.jobId) {
          this.startPollingJob(job.id, job.jobId);
        }
      });
    });
  }

  // Stop the polling service
  stop(): void {
    this.isRunning = false;
    this.pollingIntervals.forEach(intervalId => window.clearInterval(intervalId));
    this.pollingIntervals.clear();
    this.pollAttempts.clear();
    console.log('[UploadPollingService] Stopped');
  }

  // Resume polling for all active jobs
  private resumeAllActiveJobs(): void {
    const activeJobs = uploadQueue.getActiveJobs();

    console.log(`[UploadPollingService] Resuming ${activeJobs.length} active jobs`);

    activeJobs.forEach(job => {
      if (job.jobId) {
        // If job has a jobId, it's in processing phase
        if (job.status === 'processing' || job.status === 'uploading') {
          this.startPollingJob(job.id, job.jobId);
        }
      }
    });
  }

  // Start polling a specific job
  startPollingJob(uploadId: string, jobId: string): void {
    // Prevent duplicate polling
    if (this.pollingIntervals.has(uploadId)) {
      return;
    }

    console.log(`[UploadPollingService] Starting polling for job ${jobId}`);

    // Initialize poll attempts
    this.pollAttempts.set(uploadId, 0);

    const intervalId = window.setInterval(async () => {
      await this.pollJob(uploadId, jobId);
    }, POLL_INTERVAL);

    this.pollingIntervals.set(uploadId, intervalId);

    // Do immediate first poll
    this.pollJob(uploadId, jobId);
  }

  // Stop polling a specific job
  stopPollingJob(uploadId: string): void {
    const intervalId = this.pollingIntervals.get(uploadId);
    if (intervalId) {
      window.clearInterval(intervalId);
      this.pollingIntervals.delete(uploadId);
      this.pollAttempts.delete(uploadId);
      console.log(`[UploadPollingService] Stopped polling for upload ${uploadId}`);
    }
  }

  // Poll a job's status
  private async pollJob(uploadId: string, jobId: string): Promise<void> {
    try {
      const attempts = this.pollAttempts.get(uploadId) || 0;
      this.pollAttempts.set(uploadId, attempts + 1);

      // Check if max attempts reached
      if (attempts >= MAX_POLL_ATTEMPTS) {
        console.error(`[UploadPollingService] Max poll attempts reached for ${jobId}`);
        this.stopPollingJob(uploadId);
        uploadQueue.errorJob(uploadId, 'Processing timeout - please contact support');
        return;
      }

      const res = await fetch(`${API_BASE}/vertex/jobs/${jobId}/result`);

      // Handle 409 - Still processing
      if (res.status === 409) {
        const currentProgress = Math.min(55 + (attempts * 0.5), 95);
        
        let statusMessage = 'Processing video...';
        if (currentProgress < 65) {
          statusMessage = 'Analyzing video with Vertex AI...';
        } else if (currentProgress < 80) {
          statusMessage = 'Detecting basketball shots...';
        } else {
          statusMessage = 'Generating highlights...';
        }

        uploadQueue.updateJob(uploadId, {
          status: 'processing',
          progress: currentProgress,
          statusMessage,
        });
        
        console.log(`[UploadPollingService] Job ${jobId} still processing (${currentProgress}%)`);
        return;
      }
      
      // Handle 500 - Analysis failed
      if (res.status === 500) {
        const errorData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
        const errorMsg = errorData.detail || 'Video analysis failed';
        
        this.stopPollingJob(uploadId);
        uploadQueue.errorJob(uploadId, errorMsg);
        console.error(`[UploadPollingService] Job failed: ${errorMsg}`);
        return;
      }
      
      // Handle 404 - Job not found
      if (res.status === 404) {
        this.stopPollingJob(uploadId);
        uploadQueue.errorJob(uploadId, 'Job not found');
        console.error(`[UploadPollingService] Job not found: ${jobId}`);
        uploadQueue.removeJob(uploadId);
        return;
      }

      // Handle other errors
      if (!res.ok) {
        throw new Error(`Unexpected status ${res.status}`);
      }

      // SUCCESS - Job is done (200 OK)
      // The response contains the full result with highlights
      const result: VertexJobResult = await res.json();

      console.log(`[UploadPollingService] Job ${jobId} completed with response:`, result);

      // Check for errors in the result
      if (result.ok === false) {
        const errorMsg = 'Video analysis failed';
        console.error(`[UploadPollingService] Job failed with ok=false`);
        this.stopPollingJob(uploadId);
        uploadQueue.errorJob(uploadId, errorMsg);
        return;
      }

      // Check for VERTEX: error: pattern in rawEvents or other error indicators
      const shotEvents = result.rawEvents || [];
      if (shotEvents.length > 0) {
        // Check if first event contains error message
        const firstEvent = shotEvents[0] as any;
        if (firstEvent.outcome && typeof firstEvent.outcome === 'string') {
          if (firstEvent.outcome.startsWith('VERTEX: error:') || firstEvent.outcome.toLowerCase().includes('error')) {
            const errorMsg = firstEvent.outcome.replace('VERTEX: error:', '').trim() || 'Video analysis failed';
            console.error(`[UploadPollingService] Job failed with error in shotEvents:`, errorMsg);
            this.stopPollingJob(uploadId);
            uploadQueue.errorJob(uploadId, errorMsg);
            return;
          }
        }
      }

      console.log(`[UploadPollingService] Job ${jobId} completed successfully`);
      console.log(`[UploadPollingService] Found ${shotEvents.length} highlights`);

      // Update to finalizing stage
      uploadQueue.updateJob(uploadId, {
        progress: 95,
        statusMessage: 'Loading highlights...',
      });

      // Calculate game stats
      const gameStats = shotEvents.length > 0 ? this.calculateGameStats(shotEvents) : undefined;

      // Mark job as complete with all the data
      uploadQueue.completeJob(uploadId, {
        downloadUrl: result.sourceVideoUrl,
        shotEvents,
        gameStats,
      });

      console.log(`[UploadPollingService] Job ${jobId} fully complete with ${shotEvents.length} shot events`);

      // Stop polling - we're done!
      this.stopPollingJob(uploadId);

    } catch (error) {
      console.warn(`[UploadPollingService] Polling error for ${jobId}:`, error);
      // Don't stop polling on network errors - keep trying
      // The job might succeed on the next attempt
    }
  }

  // Calculate game stats from shot events
  private calculateGameStats(shotEvents: any[]) {
    const totalShots = shotEvents.length;
    const madeShots = shotEvents.filter((s: any) =>
      s.outcome.toLowerCase().includes('make')
    ).length;
    const shootingPercentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;

    const shotTypes: Record<string, number> = {};
    const locations: Record<string, number> = {};

    for (const s of shotEvents) {
      shotTypes[s.shot_type] = (shotTypes[s.shot_type] || 0) + 1;
      locations[s.shot_location] = (locations[s.shot_location] || 0) + 1;
    }

    return { totalShots, madeShots, shootingPercentage, shotTypes, locations };
  }

  // Get current polling status
  getPollingStatus(uploadId: string): { isPolling: boolean; attempts: number } {
    return {
      isPolling: this.pollingIntervals.has(uploadId),
      attempts: this.pollAttempts.get(uploadId) || 0,
    };
  }
}

// Export singleton instance and auto-start
export const pollingService = UploadPollingService.getInstance();

// Auto-start on client side
if (typeof window !== 'undefined') {
  pollingService.start();
}