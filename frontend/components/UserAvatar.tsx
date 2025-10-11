"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User } from "lucide-react"
import { userAPI } from "@/lib/api"

interface UserAvatarProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function UserAvatar({ className = "", size = "md" }: UserAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("User")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserAvatar()
  }, [])

  const loadUserAvatar = async () => {
    try {
      const response = await userAPI.getProfile()
      if (response.success && response.data) {
        setAvatarUrl(response.data.avatarUrl || null)
        setUserName(response.data.name || "User")
      }
    } catch (error) {
      console.error("Failed to load user avatar:", error)
    } finally {
      setLoading(false)
    }
  }

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  }

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  }

  // Get initials from name
  const getInitials = (name: string) => {
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-muted animate-pulse ${className}`} />
    )
  }

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={userName} />
      ) : null}
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitials(userName)}
      </AvatarFallback>
    </Avatar>
  )
}
