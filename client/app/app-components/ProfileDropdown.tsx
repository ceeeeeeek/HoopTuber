"use client"

import { useState, useRef, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { User, Settings, LogOut, ChevronDown } from "lucide-react"
import Link from "next/link"

export default function ProfileDropdown() {
  const { data: session, status } = useSession()
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
  if (status === "loading") {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
    )
  }

  if (status === "unauthenticated" || !session?.user) {
    return null
  }

  const user = session.user
  const userName = user.name || user.email || "User"
  const userEmail = user.email || ""
  const userImage = user.image || null

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }
<<<<<<< HEAD
const handleCheckIn = async () => {
  
}
=======

>>>>>>> origin/vercelbranchtest
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
      >
        {/* Profile Picture */}
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center overflow-hidden border-2 border-gray-200">
          {userImage ? (
            <img
              src={userImage}
              alt={userName}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
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

          {/* Menu Items */}
          <div className="py-1">
            {/* Profile/Dashboard Link */}
            <Link
<<<<<<< HEAD
              href="/"
=======
              href="/dashboard"
>>>>>>> origin/vercelbranchtest
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-gray-500" />
<<<<<<< HEAD
              <span>Profile</span>
=======
              Profile
>>>>>>> origin/vercelbranchtest
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
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/vercelbranchtest
