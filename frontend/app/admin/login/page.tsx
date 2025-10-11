"use client"

import { useState } from "react"
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Heart, ArrowLeft, Shield, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Check password locally first
    if (password !== (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "qwertyuiop")) {
      setError("Invalid password. Please try again.")
      setIsLoading(false)
      return
    }

    try {
      // Mark local admin session for UI flow
      localStorage.setItem("zenly_admin_authenticated", "true")
      localStorage.setItem("zenly_admin_login_time", Date.now().toString())

      // If the user is logged in, call backend to elevate role and refresh tokens
      const token = localStorage.getItem('zenly_access_token')
      if (token) {
        const resp = await fetch(`${API_BASE}/auth/admin-elevate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ password })
        })
        if (resp.ok) {
          const data = await resp.json()
          // Store elevated tokens and user in localStorage to unlock admin API routes
          localStorage.setItem('zenly_access_token', data.data.accessToken)
          localStorage.setItem('zenly_refresh_token', data.data.refreshToken)
          localStorage.setItem('zenly_user', JSON.stringify(data.data.user))
        }
      }

      // Redirect to admin dashboard
      router.push("/admin")
    } catch (e) {
      setError("Failed to elevate admin role. You can still view with limited data.")
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Admin Access</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Enter the admin password to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Admin Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? "Authenticating..." : "Access Admin Dashboard"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}