"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Play, Headphones, BookOpen, Loader2, Eye, ThumbsUp, Clock, ExternalLink, Sparkles, Library } from "lucide-react"
import Link from "next/link"
import ProfileDropdown from "@/components/ProfileDropdown"
import { io, Socket } from "socket.io-client"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

interface Resource {
  _id: string
  title: string
  description: string
  type: "video" | "audio" | "article"
  categories: string[]
  tags: string[]
  url: string
  duration?: string
  author?: string
  embedData?: {
    platform?: string
    embedId?: string
    thumbnailUrl?: string
  }
  isFeatured: boolean
  viewCount: number
  helpfulCount: number
}

type ResourceType = "videos" | "audios" | "articles"

export default function BrowseAllResourcesPage() {
  const [activeSection, setActiveSection] = useState<ResourceType>("videos")
  const [videos, setVideos] = useState<Resource[]>([])
  const [audios, setAudios] = useState<Resource[]>([])
  const [articles, setArticles] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [likedResources, setLikedResources] = useState<Set<string>>(new Set())
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    loadAllResources()
    // Load liked resources from localStorage
    const stored = localStorage.getItem('likedResources')
    if (stored) {
      setLikedResources(new Set(JSON.parse(stored)))
    }

    // Initialize Socket.IO connection
    socketRef.current = io(API_BASE, {
      transports: ['websocket', 'polling']
    })

    const socket = socketRef.current

    // Join resources room
    socket.emit('resources:join')

    // Listen for view count updates
    socket.on('resource:viewUpdate', ({ resourceId, viewCount }) => {
      setVideos(prev => prev.map(r => r._id === resourceId ? { ...r, viewCount } : r))
      setAudios(prev => prev.map(r => r._id === resourceId ? { ...r, viewCount } : r))
      setArticles(prev => prev.map(r => r._id === resourceId ? { ...r, viewCount } : r))
    })

    // Listen for like count updates
    socket.on('resource:likeUpdate', ({ resourceId, helpfulCount }) => {
      setVideos(prev => prev.map(r => r._id === resourceId ? { ...r, helpfulCount } : r))
      setAudios(prev => prev.map(r => r._id === resourceId ? { ...r, helpfulCount } : r))
      setArticles(prev => prev.map(r => r._id === resourceId ? { ...r, helpfulCount } : r))
    })

    // Cleanup on unmount
    return () => {
      socket.emit('resources:leave')
      socket.disconnect()
    }
  }, [])

  const loadAllResources = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/resources/all`)
      const data = await response.json()
      if (data.success) {
        setVideos(data.data.videos || [])
        setAudios(data.data.audios || [])
        setArticles(data.data.articles || [])
      }
    } catch (error) {
      console.error("Failed to load resources:", error)
    } finally {
      setLoading(false)
    }
  }

  const trackView = async (id: string) => {
    try {
      await fetch(`${API_BASE}/resources/${id}/view`, { method: "POST" })
    } catch (error) {
      console.error("Track view failed:", error)
    }
  }

  const markAsHelpful = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const isCurrentlyLiked = likedResources.has(id)
    const action = isCurrentlyLiked ? 'unlike' : 'like'

    try {
      const response = await fetch(`${API_BASE}/resources/${id}/helpful`, { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        const newLiked = new Set(likedResources)
        
        if (isCurrentlyLiked) {
          newLiked.delete(id)
        } else {
          newLiked.add(id)
        }
        
        setLikedResources(newLiked)
        localStorage.setItem('likedResources', JSON.stringify(Array.from(newLiked)))
      }
    } catch (error) {
      console.error("Mark helpful failed:", error)
    }
  }

  const renderVideoCard = (resource: Resource) => {
    const parsed = (() => {
      if (resource.embedData && (resource.embedData.embedId || resource.embedData.platform)) return resource.embedData
      try {
        const u = new URL(resource.url)
        if (u.hostname.includes('youtube.com')) {
          const id = u.searchParams.get('v')
          if (id) return { platform: 'youtube', embedId: id, thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }
        }
        if (u.hostname === 'youtu.be') {
          const id = u.pathname.slice(1)
          if (id) return { platform: 'youtube', embedId: id, thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }
        }
      } catch (err) {
      }
      return resource.embedData || {}
    })()

    const embedId = parsed.embedId
    const platform = parsed.platform
    const isLiked = likedResources.has(resource._id)

    return (
      <Card key={resource._id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { trackView(resource._id); window.open(resource.url, '_blank') }}>
        <div className="relative aspect-video bg-gray-900">
          {platform === 'youtube' && embedId ? (
            <img src={parsed.thumbnailUrl || `https://img.youtube.com/vi/${embedId}/hqdefault.jpg`} alt={resource.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-500/20 to-pink-500/20">
              <Play className="h-16 w-16 text-white" />
            </div>
          )}
          {resource.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-yellow-500">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-lg">{resource.title}</CardTitle>
            <Badge variant="outline"><Play className="h-3 w-3 mr-1" />Video</Badge>
          </div>
          {resource.author && <p className="text-sm text-muted-foreground">{resource.author}</p>}
          <CardDescription className="line-clamp-2 mt-2">{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-3">
              {resource.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{resource.duration}</span>}
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{resource.viewCount}</span>
            </div>
            <Button 
              variant={isLiked ? "default" : "ghost"} 
              size="sm" 
              onClick={(e) => markAsHelpful(resource._id, e)}
              className="transition-all"
              title={isLiked ? "Click to unlike" : "Click to like"}
            >
              <ThumbsUp className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />{resource.helpfulCount}
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap mb-3">
            {resource.categories.slice(0, 3).map((cat, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">{cat}</Badge>
            ))}
          </div>
          {platform !== 'youtube' && (
            <Button onClick={(e) => { e.stopPropagation(); trackView(resource._id); window.open(resource.url, '_blank') }} className="w-full" variant="outline">
              Watch Video<ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderAudioCard = (resource: Resource) => {
    const embedId = resource.embedData?.embedId
    const platform = resource.embedData?.platform
    const isLiked = likedResources.has(resource._id)

    return (
      <Card key={resource._id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { trackView(resource._id); window.open(resource.url, '_blank') }}>
        <div className="relative aspect-video bg-gradient-to-br from-green-500/20 to-emerald-500/20 overflow-hidden">
          {resource.embedData?.thumbnailUrl ? (
            <img src={resource.embedData.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
          ) : platform === 'spotify' && embedId ? (
            <iframe
              src={`https://open.spotify.com/embed/episode/${embedId}`}
              className="w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Headphones className="h-16 w-16 text-white" />
            </div>
          )}
          {resource.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-yellow-500">
              <Sparkles className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
        </div>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-lg">{resource.title}</CardTitle>
            <Badge variant="outline"><Headphones className="h-3 w-3 mr-1" />Audio</Badge>
          </div>
          {resource.author && <p className="text-sm text-muted-foreground">{resource.author}</p>}
          <CardDescription className="line-clamp-2 mt-2">{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-3">
              {resource.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{resource.duration}</span>}
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{resource.viewCount}</span>
            </div>
            <Button 
              variant={isLiked ? "default" : "ghost"} 
              size="sm" 
              onClick={(e) => markAsHelpful(resource._id, e)}
              className="transition-all"
              title={isLiked ? "Click to unlike" : "Click to like"}
            >
              <ThumbsUp className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />{resource.helpfulCount}
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap mb-3">
            {resource.categories.slice(0, 3).map((cat, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">{cat}</Badge>
            ))}
          </div>
          {/* No external Listen button — whole card is clickable */}
        </CardContent>
      </Card>
    )
  }

  const renderArticleCard = (resource: Resource) => {
    const isLiked = likedResources.has(resource._id)
    
    return (
      <Card key={resource._id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { trackView(resource._id); window.open(resource.url, '_blank') }}>
        <div className="relative h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 overflow-hidden">
          {resource.embedData?.thumbnailUrl ? (
            <img src={resource.embedData.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="h-16 w-16 text-white" />
            </div>
          )}
          {resource.isFeatured && (
            <Badge className="absolute top-2 right-2 bg-yellow-500">
              <Sparkles className="h-3 w-3 mr-1" />Featured
            </Badge>
          )}
        </div>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-lg">{resource.title}</CardTitle>
            <Badge variant="outline"><BookOpen className="h-3 w-3 mr-1" />Article</Badge>
          </div>
          {resource.author && <p className="text-sm text-muted-foreground">{resource.author}</p>}
          <CardDescription className="line-clamp-3 mt-2">{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-3">
              {resource.duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{resource.duration}</span>}
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{resource.viewCount}</span>
            </div>
            <Button 
              variant={isLiked ? "default" : "ghost"} 
              size="sm" 
              onClick={(e) => markAsHelpful(resource._id, e)}
              className="transition-all"
              title={isLiked ? "Click to unlike" : "Click to like"}
            >
              <ThumbsUp className={`h-3 w-3 mr-1 ${isLiked ? 'fill-current' : ''}`} />{resource.helpfulCount}
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {resource.categories.slice(0, 3).map((cat, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">{cat}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getCurrentResources = () => {
    switch (activeSection) {
      case "videos":
        return videos
      case "audios":
        return audios
      case "articles":
        return articles
      default:
        return []
    }
  }

  const renderCurrentSection = () => {
    const resources = getCurrentResources()
    
    if (resources.length === 0) {
      return (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            <p className="text-lg">No {activeSection} available yet.</p>
            <p className="text-sm mt-2">Check back soon for new content!</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resources.map((resource) => {
          if (resource.type === "video") return renderVideoCard(resource)
          if (resource.type === "audio") return renderAudioCard(resource)
          return renderArticleCard(resource)
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/resources">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Library className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Browse All Resources</h1>
            </div>
          </div>
          <ProfileDropdown />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Section Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <Button
            variant={activeSection === "videos" ? "default" : "outline"}
            size="lg"
            onClick={() => setActiveSection("videos")}
            className="flex items-center gap-2 min-w-fit"
          >
            <Play className="h-5 w-5" />
            Videos ({videos.length})
          </Button>
          <Button
            variant={activeSection === "audios" ? "default" : "outline"}
            size="lg"
            onClick={() => setActiveSection("audios")}
            className="flex items-center gap-2 min-w-fit"
          >
            <Headphones className="h-5 w-5" />
            Audio ({audios.length})
          </Button>
          <Button
            variant={activeSection === "articles" ? "default" : "outline"}
            size="lg"
            onClick={() => setActiveSection("articles")}
            className="flex items-center gap-2 min-w-fit"
          >
            <BookOpen className="h-5 w-5" />
            Articles ({articles.length})
          </Button>
        </div>

        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 capitalize">
            {activeSection === "videos" && "Video Resources"}
            {activeSection === "audios" && "Audio & Podcasts"}
            {activeSection === "articles" && "Articles & Guides"}
          </h2>
          <p className="text-muted-foreground">
            {activeSection === "videos" && "Educational videos and guided exercises for mental wellness"}
            {activeSection === "audios" && "Podcasts, meditations, and audio resources for relaxation"}
            {activeSection === "articles" && "In-depth articles and written guides on mental health topics"}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
          renderCurrentSection()
        )}
      </div>
    </div>
  )
}
