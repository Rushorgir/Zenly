"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { User, Settings, LogOut, UserCircle, Shield } from "lucide-react"
import { userAPI } from "@/lib/api"

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("User")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const isAdminPage = pathname === "/admin"

  // Load user profile data on mount
  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const response = await userAPI.getProfile()
      if (response.success && response.data) {
        setProfilePicture(response.data.avatarUrl || null)
        setUserName(response.data.name || "User")
      }
    } catch (error) {
      console.error("Failed to load user profile:", error)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSignOut = () => {
    // Clear localStorage and redirect to login
    localStorage.clear()
    window.location.href = "/"
    setIsOpen(false)
  }

  const handleAdminLogout = () => {
    // Clear admin authentication and redirect to dashboard
    localStorage.removeItem("zenly_admin_authenticated")
    localStorage.removeItem("zenly_admin_login_time")
    window.location.href = "/dashboard"
    setIsOpen(false)
  }

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full"></div>
        {profilePicture ? (
          <img 
            src={profilePicture} 
            alt={userName} 
            className="w-full h-full rounded-full object-cover relative z-10"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold relative z-10">
            {getInitials(userName)}
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <Link 
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors cursor-pointer"
          >
            <UserCircle className="h-4 w-4" />
            Profile
          </Link>
          
          {!isAdminPage && (
            <Link 
              href="/admin/login"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors cursor-pointer border-t border-border"
            >
              <Settings className="h-4 w-4" />
              Admin Login
            </Link>
          )}

          {isAdminPage && (
            <button
              onClick={handleAdminLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors cursor-pointer border-t border-border text-left"
            >
              <Shield className="h-4 w-4" />
              Exit Admin Mode
            </button>
          )}
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-destructive/10 transition-colors cursor-pointer border-t border-border text-left text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
