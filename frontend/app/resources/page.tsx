"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, ArrowLeft, Search, Play, Headphones, BookOpen, Clock, Loader2, ExternalLink,Folder, ThumbsUp, Eye, Sparkles } from "lucide-react"
import Link from "next/link"
import ProfileDropdown from "@/components/ProfileDropdown"
import { io, Socket } from "socket.io-client"
import { getUser } from "@/lib/api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

interface Resource {
  _id: string
  title: string
  description: string
  type: "video" | "audio" | "article"
  categories: string[]
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

interface FeaturedResources {
  videos: Resource[]
  audios: Resource[]
  articles: Resource[]
}

export default function ResourcesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Resource[]>([])
  const [selectedType, setSelectedType] = useState("all")
  const [featuredResources, setFeaturedResources] = useState<FeaturedResources>({
    videos: [],
    audios: [],
    articles: []
  })
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [likedResources, setLikedResources] = useState<Set<string>>(new Set())
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    loadFeaturedResources()
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
      setFeaturedResources(prev => ({
        videos: prev.videos.map(r => r._id === resourceId ? { ...r, viewCount } : r),
        audios: prev.audios.map(r => r._id === resourceId ? { ...r, viewCount } : r),
        articles: prev.articles.map(r => r._id === resourceId ? { ...r, viewCount } : r)
      }))
      setSearchResults(prev => prev.map(r => r._id === resourceId ? { ...r, viewCount } : r))
    })

    // Listen for like count updates
    socket.on('resource:likeUpdate', ({ resourceId, helpfulCount }) => {
      setFeaturedResources(prev => ({
        videos: prev.videos.map(r => r._id === resourceId ? { ...r, helpfulCount } : r),
        audios: prev.audios.map(r => r._id === resourceId ? { ...r, helpfulCount } : r),
        articles: prev.articles.map(r => r._id === resourceId ? { ...r, helpfulCount } : r)
      }))
      setSearchResults(prev => prev.map(r => r._id === resourceId ? { ...r, helpfulCount } : r))
    })

    // Cleanup on unmount
    return () => {
      socket.emit('resources:leave')
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadFeaturedResources = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/resources/featured`)
      const data = await response.json()
      if (data.success) {
        setFeaturedResources(data.data)
      }
    } catch (error) {
      console.error("Failed to load:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    try {
      setSearching(true)
      const response = await fetch(`${API_BASE}/resources/search?query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      if (data.success) {
        setSearchResults(data.data)
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setSearching(false)
    }
  }

  const trackView = async (id: string) => {
    try {
      // Include Authorization header when available
      const token = typeof window !== 'undefined' ? localStorage.getItem('zenly_access_token') : null
      await fetch(`${API_BASE}/resources/${id}/view`, { 
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
    } catch (error) {
      console.error("Track view failed:", error)
    }
  }

  const markAsHelpful = async (id: string, e?: React.MouseEvent) => {
    // Prevent default behavior and event bubbling
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    const isCurrentlyLiked = likedResources.has(id)
    const action = isCurrentlyLiked ? 'unlike' : 'like'

    try {
      const response = await fetch(`${API_BASE}/resources/${id}/helpful`, { 
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        const newLiked = new Set(likedResources)
        
        if (isCurrentlyLiked) {
          // Unlike - remove from set
          newLiked.delete(id)
        } else {
          // Like - add to set
          newLiked.add(id)
        }
        
        setLikedResources(newLiked)
        
        // Save to localStorage
        localStorage.setItem('likedResources', JSON.stringify(Array.from(newLiked)))
        
        // Note: Socket.IO will handle the real-time count update for all users
        // So we don't need to manually update the count here anymore
      }
    } catch (error) {
      console.error("Mark helpful failed:", error)
    }
  }

  const renderVideoCard = (resource: Resource) => {
    // Fallback: if embedData is missing (new resources), try to derive from URL
    const parsed = (() => {
      if (resource.embedData && (resource.embedData.embedId || resource.embedData.platform)) return resource.embedData
      try {
        const u = new URL(resource.url)
        // YouTube standard link or watch?v=ID
        if (u.hostname.includes('youtube.com')) {
          const id = u.searchParams.get('v')
          if (id) return { platform: 'youtube', embedId: id, thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }
        }
        // youtu.be short link
        if (u.hostname === 'youtu.be') {
          const id = u.pathname.slice(1)
          if (id) return { platform: 'youtube', embedId: id, thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }
        }
      } catch (err) {
        // ignore
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
            // show thumbnail image instead of embedding to match original format
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
          {/* hide the Watch Video button when we can show a thumbnail (youtube) */}
          {/* No external Watch button — whole card is clickable */}
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
            <iframe src={`https://open.spotify.com/embed/episode/${embedId}`} width="100%" height="100%" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Headphones className="h-16 w-16 text-white" />
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
          {/* No external Listen button — whole card is clickable and shows a thumbnail when available */}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div className="flex items-center gap-2">
              <Folder className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Resource Hub</h1>
            </div>
          </div>
          <ProfileDropdown />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Mental Wellness Resource Hub
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Curated videos, podcasts, and articles to support your mental health journey
          </p>
          <Link href="/resources/browse">
            <Button size="lg" variant="outline" className="gap-2">
              <BookOpen className="h-5 w-5" />
              Browse All Resources
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or tags (anxiety, stress, depression, etc.)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search resources"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="video">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Videos
                </div>
              </SelectItem>
              <SelectItem value="audio">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4" />
                  Audio
                </div>
              </SelectItem>
              <SelectItem value="article">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Articles
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {searchResults.length > 0 && (
          <div className="mb-12">
            {(() => {
              // Apply type filter to search results
              const filteredResults = selectedType === "all" 
                ? searchResults 
                : searchResults.filter(r => r.type === selectedType)
              
              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">
                      Search Results ({filteredResults.length})
                    </h3>
                    {selectedType !== "all" && (
                      <Badge variant="secondary" className="text-sm">
                        Filtered by: {selectedType === "video" ? "Videos" : selectedType === "audio" ? "Audio" : "Articles"}
                      </Badge>
                    )}
                  </div>
                  
                  {filteredResults.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No {selectedType === "all" ? "" : selectedType} resources found matching "{searchQuery}"</p>
                        <p className="text-sm mt-2">Try a different search term or change the filter</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredResults.map((r) => {
                        if (r.type === "video") return renderVideoCard(r)
                        if (r.type === "audio") return renderAudioCard(r)
                        return renderArticleCard(r)
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {!searchQuery && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {(selectedType === "all" || selectedType === "video") && (
                  <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <Play className="h-8 w-8 text-red-500" />
                      <h3 className="text-3xl font-bold">Featured Videos</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {featuredResources.videos.map(renderVideoCard)}
                    </div>
                    {featuredResources.videos.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No featured videos yet</p>
                    )}
                  </section>
                )}

                {(selectedType === "all" || selectedType === "audio") && (
                  <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <Headphones className="h-8 w-8 text-green-500" />
                      <h3 className="text-3xl font-bold">Featured Podcasts</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {featuredResources.audios.map(renderAudioCard)}
                    </div>
                    {featuredResources.audios.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No featured podcasts yet</p>
                    )}
                  </section>
                )}

                {(selectedType === "all" || selectedType === "article") && (
                  <section className="mb-16">
                    <div className="flex items-center gap-3 mb-6">
                      <BookOpen className="h-8 w-8 text-blue-500" />
                      <h3 className="text-3xl font-bold">Featured Articles</h3>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {featuredResources.articles.map(renderArticleCard)}
                    </div>
                    {featuredResources.articles.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No featured articles yet</p>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
