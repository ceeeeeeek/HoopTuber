"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/lib/useAuth"
import { User, Settings, LogOut, ChevronDown, Upload, Loader2, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { useUploadStatus } from "@/contexts/UploadStatusContext"
import { Progress } from "@/components/ui/progress"

export default function ProfileDropdown() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const { activeJobs, jobs, removeJob, clearCompleted } = useUploadStatus()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Don't render if not authenticated
  if (authLoading) {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
    )
  }

  if (!currentUser) {
    return null
  }

  const userName = currentUser.displayName || currentUser.email || "User"
  const userEmail = currentUser.email || ""
  const userImage = currentUser.photoURL || null

  const handleLogout = async () => {
    try {
      await signOut(auth)
      window.location.href = "/"
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }
const handleCheckIn = async () => {
  
}
  const hasActiveUploads = activeJobs.length > 0
  const recentJobs = jobs.slice(0, 5) // Show last 5 jobs

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors relative"
      >
        {/* Profile Picture */}
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center overflow-hidden border-2 border-gray-200 relative">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
          {/* Upload indicator badge */}
          {hasActiveUploads && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>

        {/* Username (hidden on mobile) */}
        <span className="hidden md:block text-sm font-medium text-gray-700">
          {userName}
        </span>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Upload Status Section */}
          {recentJobs.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Uploads</span>
                {jobs.filter(j => j.status === 'complete' || j.status === 'error').length > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors border-t border-gray-50"
                  >
                    <div className="flex items-start space-x-2">
                      {/* Status Icon */}
                      <div className="mt-0.5">
                        {job.status === 'uploading' || job.status === 'processing' ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : job.status === 'complete' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : job.status === 'error' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Upload className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {/* Upload Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {job.fileName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {job.statusMessage}
                        </p>

                        {/* Progress Bar for Active Uploads */}
                        {(job.status === 'uploading' || job.status === 'processing') && (
                          <div className="mt-2">
                            <Progress value={job.progress} className="h-1" />
                            <p className="text-xs text-gray-400 mt-1">{job.progress}%</p>
                          </div>
                        )}

                        {/* Action Buttons */}
                        {job.status === 'complete' && (
                          <div className="mt-2 flex space-x-2">
                            <Link
                              href={`/upload/${job.jobId}`}
                              onClick={() => setIsOpen(false)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => removeJob(job.id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {job.status === 'error' && (
                          <div className="mt-2">
                            <p className="text-xs text-red-600">{job.error}</p>
                            <button
                              onClick={() => removeJob(job.id)}
                              className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-1">
            {/* Profile/Dashboard Link */}
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-gray-500" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/my-runs"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-purple-600" />
              My Runs
            </Link>

            {/* Join a Run Link */}
            <Link
              href="/join-a-run"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-blue-600" />
              Join a Run
            </Link>
            {/* Settings Link */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 mr-3 text-gray-500" />
              Settings
            </Link>
          </div>

          {/* Logout Section */}
          <div className="border-t border-gray-100 py-1">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}