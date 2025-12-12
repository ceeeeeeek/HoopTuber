// lib/uploadPollingService.ts - Background polling service for upload jobs

import { uploadQueue, UploadJob } from './uploadQueue';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://hooptuber-fastapi-web-service-docker.onrender.com";
const POLL_INTERVAL = 3000; // 3 seconds
const MAX_POLL_ATTEMPTS = 600; // 30 minutes max (600 * 3s = 1800s)

interface JobRecord {
  jobId: string;
  status: "queued" | "processing" | "done" | "error" | "publish_error";
  videoGcsUri?: string;
  outputGcsUri?: string;
  error?: string;
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

      if (res.status === 409) {
      // Still processing - update progress
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
    
    if (res.status === 500) {
      // Analysis failed
      const errorData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
      const errorMsg = errorData.detail || 'Video analysis failed';
      
      this.stopPollingJob(uploadId);
      uploadQueue.errorJob(uploadId, errorMsg);
      console.error(`[UploadPollingService] Job failed: ${errorMsg}`);
      return;
    }
    
    if (res.status === 404) {
      // Job not found
      this.stopPollingJob(uploadId);
      uploadQueue.errorJob(uploadId, 'Job not found');
      console.error(`[UploadPollingService] Job not found: ${jobId}`);
      return;
    }

      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const data: JobRecord = await res.json();
      console.log('[uploadPollingService] job ${jobId}');
      // Handle error states
      if (data.status === 'error' || data.status === 'publish_error') {
        this.stopPollingJob(uploadId);
        uploadQueue.errorJob(uploadId, data.error || 'Processing failed');
        console.error(`[UploadPollingService] Job failed: ${data.error}`);
        return;
      }

      // Handle completion
      if (data.status === 'done' && data.outputGcsUri) {
        console.log(`[UploadPollingService] Job ${jobId} completed, fetching download URL`);

        // Update to finalizing stage
        uploadQueue.updateJob(uploadId, {
          progress: 95,
          statusMessage: 'Applying final touches...',
        });

        // Fetch final download + analysis
        const dlRes = await fetch(`${API_BASE}/vertex/jobs/${jobId}/result`);
        if (dlRes.ok) {
          const result = await dlRes.json();

          const shotEvents = result.shot_events || [];
          const gameStats = shotEvents.length > 0 ? this.calculateGameStats(shotEvents) : undefined;

          uploadQueue.completeJob(uploadId, {
            downloadUrl: result.url,
            shotEvents,
            gameStats,
          });

          console.log(`[UploadPollingService] Job ${jobId} fully complete`);
        } else {
          console.error('[UploadPollingService] Failed to fetch download URL');
          uploadQueue.errorJob(uploadId, 'Failed to fetch download URL');
        }

        this.stopPollingJob(uploadId);
      } else {
        // Still processing - update progress
        const currentProgress = Math.min(50 + (attempts * 2), 90);

        let statusMessage = 'Processing video...';
        if (currentProgress < 65) {
          statusMessage = 'Analyzing video...';
        } else if (currentProgress < 80) {
          statusMessage = 'Detecting shots and movements...';
        } else {
          statusMessage = 'Generating highlights...';
        }

        uploadQueue.updateJob(uploadId, {
          status: 'processing',
          progress: currentProgress,
          statusMessage,
        });
      }
    } catch (error) {
      console.warn(`[UploadPollingService] Polling error for ${jobId}:`, error);
      // Don't stop polling on network errors - keep trying
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
