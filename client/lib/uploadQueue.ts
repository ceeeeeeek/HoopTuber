// lib/uploadQueue.ts - Persistent upload queue management

export interface UploadJob {
  id: string;
  jobId?: string; // FastAPI job ID once available
  fileName: string;
  fileSize: number;
  status: 'preparing' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  statusMessage: string;
  error?: string;

  // Upload metadata
  uploadUrl?: string;
  gcsUri?: string;
  downloadUrl?: string;

  // Timestamps
  createdAt: number;
  startedAt?: number;
  completedAt?: number;

  // User context
  userEmail?: string;

  // Results
  shotEvents?: Array<{
    id: string;
    timestamp_end: string;
    timestamp_start: string;
    outcome: string;
    subject: string;
    shot_type: string;
    shot_location: string;
  }>;

  gameStats?: {
    totalShots: number;
    madeShots: number;
    shootingPercentage: number;
    shotTypes: Record<string, number>;
    locations: Record<string, number>;
  };
}

const STORAGE_KEY = 'hooptuber_upload_queue';
const MAX_STORED_JOBS = 10; // Keep last 10 jobs for history

export class UploadQueueManager {
  private static instance: UploadQueueManager;
  private listeners: Set<(jobs: UploadJob[]) => void> = new Set();

  private constructor() {
    // Initialize instance
    this.cleanupOldJobs();
  }

  static getInstance(): UploadQueueManager {
    if (!UploadQueueManager.instance) {
      UploadQueueManager.instance = new UploadQueueManager();
    }
    return UploadQueueManager.instance;
  }

  // Subscribe to queue changes
  subscribe(listener: (jobs: UploadJob[]) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.getAllJobs());

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const jobs = this.getAllJobs();
    this.listeners.forEach(listener => listener(jobs));
  }

  // Get all jobs from localStorage
  getAllJobs(): UploadJob[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const jobs: UploadJob[] = JSON.parse(stored);
      return jobs.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error reading upload queue:', error);
      return [];
    }
  }

  // Get active (non-complete) jobs
  getActiveJobs(): UploadJob[] {
    return this.getAllJobs().filter(
      job => job.status !== 'complete' && job.status !== 'error'
    );
  }

  // Get a specific job by ID
  getJob(id: string): UploadJob | null {
    return this.getAllJobs().find(job => job.id === id) || null;
  }

  // Get job by FastAPI jobId
  getJobByJobId(jobId: string): UploadJob | null {
    return this.getAllJobs().find(job => job.jobId === jobId) || null;
  }

  // Create a new job
  createJob(fileName: string, fileSize: number, userEmail?: string): UploadJob {
    const job: UploadJob = {
      id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName,
      fileSize,
      status: 'preparing',
      progress: 0,
      statusMessage: 'Preparing upload...',
      createdAt: Date.now(),
      userEmail,
    };

    this.saveJob(job);
    return job;
  }

  // Update an existing job
  updateJob(id: string, updates: Partial<UploadJob>): void {
    const jobs = this.getAllJobs();
    const index = jobs.findIndex(job => job.id === id);

    if (index === -1) return;

    jobs[index] = { ...jobs[index], ...updates };
    this.saveJobs(jobs);
  }

  // Save a single job (creates or updates)
  saveJob(job: UploadJob): void {
    const jobs = this.getAllJobs();
    const index = jobs.findIndex(j => j.id === job.id);

    if (index >= 0) {
      jobs[index] = job;
    } else {
      jobs.push(job);
    }

    this.saveJobs(jobs);
  }

  // Save all jobs to localStorage
  private saveJobs(jobs: UploadJob[]): void {
    if (typeof window === 'undefined') return;

    try {
      // Keep only the most recent jobs to avoid localStorage bloat
      const trimmedJobs = jobs
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, MAX_STORED_JOBS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedJobs));
      this.notify();
    } catch (error) {
      console.error('Error saving upload queue:', error);
    }
  }

  // Remove a job from the queue
  removeJob(id: string): void {
    const jobs = this.getAllJobs().filter(job => job.id !== id);
    this.saveJobs(jobs);
  }

  // Mark job as complete
  completeJob(id: string, result: Partial<UploadJob>): void {
    this.updateJob(id, {
      status: 'complete',
      progress: 100,
      statusMessage: 'Complete!',
      completedAt: Date.now(),
      ...result,
    });
  }

  // Mark job as error
  errorJob(id: string, error: string): void {
    this.updateJob(id, {
      status: 'error',
      error,
      statusMessage: 'Error',
      completedAt: Date.now(),
    });
  }

  // Clean up old completed/errored jobs (older than 24 hours)
  private cleanupOldJobs(): void {
    const jobs = this.getAllJobs();
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const filteredJobs = jobs.filter(job => {
      // Keep all active jobs
      if (job.status === 'uploading' || job.status === 'processing') {
        return true;
      }

      // Keep recent jobs
      if (job.createdAt > oneDayAgo) {
        return true;
      }

      return false;
    });

    if (filteredJobs.length !== jobs.length) {
      this.saveJobs(filteredJobs);
    }
  }

  // Clear all completed jobs
  clearCompleted(): void {
    const jobs = this.getAllJobs().filter(
      job => job.status !== 'complete' && job.status !== 'error'
    );
    this.saveJobs(jobs);
  }

  // Clear all jobs (use with caution)
  clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }
}

// Export singleton instance
export const uploadQueue = UploadQueueManager.getInstance();
