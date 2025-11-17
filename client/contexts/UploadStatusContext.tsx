// contexts/UploadStatusContext.tsx - Global upload state management

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { uploadQueue, UploadJob } from '@/lib/uploadQueue';
import { pollingService } from '@/lib/uploadPollingService';

interface UploadStatusContextType {
  jobs: UploadJob[];
  activeJobs: UploadJob[];
  hasActiveUploads: boolean;
  getJob: (id: string) => UploadJob | null;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
}

const UploadStatusContext = createContext<UploadStatusContextType | undefined>(undefined);

export function UploadStatusProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);

  useEffect(() => {
    // Subscribe to upload queue changes
    const unsubscribe = uploadQueue.subscribe(setJobs);

    // Ensure polling service is running
    pollingService.start();

    return () => {
      unsubscribe();
    };
  }, []);

  const activeJobs = jobs.filter(
    job => job.status === 'uploading' || job.status === 'processing' || job.status === 'preparing'
  );

  const hasActiveUploads = activeJobs.length > 0;

  const getJob = (id: string) => {
    return jobs.find(job => job.id === id) || null;
  };

  const removeJob = (id: string) => {
    uploadQueue.removeJob(id);
  };

  const clearCompleted = () => {
    uploadQueue.clearCompleted();
  };

  return (
    <UploadStatusContext.Provider
      value={{
        jobs,
        activeJobs,
        hasActiveUploads,
        getJob,
        removeJob,
        clearCompleted,
      }}
    >
      {children}
    </UploadStatusContext.Provider>
  );
}

export function useUploadStatus() {
  const context = useContext(UploadStatusContext);
  if (context === undefined) {
    throw new Error('useUploadStatus must be used within an UploadStatusProvider');
  }
  return context;
}
