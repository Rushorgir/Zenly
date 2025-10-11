"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authAPI, getUser, clearTokens } from "@/lib/api"

interface User {
  id: string
  email: string
  name: string
  role: string
}

export function useAuth(requireAuth = true) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = getUser()
        
        if (storedUser) {
          setUser(storedUser)
        } else if (requireAuth) {
          // Try to fetch user from API
          try {
            const result = await authAPI.getMe()
            setUser(result.data)
          } catch (error) {
            // Not authenticated
            clearTokens()
            router.push("/auth/login")
          }
        }
      } catch (error) {
        console.error("Error loading user:", error)
        if (requireAuth) {
          clearTokens()
          router.push("/auth/login")
        }
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [requireAuth, router])

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      router.push("/auth/login")
    }
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
  }
}
