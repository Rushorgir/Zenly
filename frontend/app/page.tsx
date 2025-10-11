"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Brain, Users, BookOpen, Shield, MessageCircle, HeartPulse } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)

  const features = [
    {
      icon: <Brain className="h-8 w-8 text-primary" />,
      title: "AI Journal Analysis",
      description: "Get personalized insights and support based on your daily reflections",
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "Peer Support",
      description: "Connect with fellow students in a safe, moderated environment",
    },
    {
      icon: <BookOpen className="h-8 w-8 text-primary" />,
      title: "Resource Hub",
      description: "Access mental wellness guides and self-help tools tailored for students",
    },
    {
      icon: <MessageCircle className="h-8 w-8 text-primary" />,
      title: "24/7 AI Support",
      description: "Get immediate help and coping strategies anytime you need",
    },
    {
      icon: <Shield className="h-8 w-8 text-primary" />,
      title: "Complete Privacy",
      description: "Your mental health journey remains completely confidential",
    },
    {
      icon: <HeartPulse className="h-8 w-8 text-primary" />,
      title: "Mood Tracking",
      description: "Track your emotional patterns over time with easy visual summaries and progress insights",
    }

  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-balance">Zenly</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in-up">
          <h2 className="text-5xl font-bold mb-6 text-balance bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Your Mental Health Journey Starts Here
          </h2>
            <p className="text-xl text-muted-foreground mb-8 text-pretty leading-relaxed">
            A comprehensive digital platform designed specifically for college students, offering AI-powered insights,
            professional support, and peer connections in a safe, stigma-free environment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Your Journey
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-primary/5 border-y py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 text-balance">Everything You Need for Mental Wellness</h3>
            <p className="text-lg text-muted-foreground text-pretty">
              Comprehensive tools designed with student needs in mind
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {feature.icon}
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 text-balance">Making a Real Impact on Student Mental Health</h3>
            <p className="text-lg text-muted-foreground text-pretty">
              Our platform is designed with evidence-based approaches and real student needs in mind
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">75%</div>
              <div className="text-sm text-muted-foreground mb-2">of college students</div>
              <div className="font-medium">experience anxiety or depression</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground mb-2">availability</div>
              <div className="font-medium">AI support when you need it most</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <div className="text-sm text-muted-foreground mb-2">confidential</div>
              <div className="font-medium">your privacy is our priority</div>
            </div>
          </div>
          <div className="text-center mt-12">
            <div className="max-w-3xl mx-auto bg-background/80 backdrop-blur-sm border rounded-lg p-6">
              <blockquote className="text-lg italic text-muted-foreground mb-4">
                &quot;Mental health support shouldn&apos;t be a luxury. Every student deserves access to the tools and resources they need to thrive academically and personally.&quot;
              </blockquote>
              <div className="text-sm font-medium">- Team Zenly</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-muted-foreground">
            <p className="text-sm">&copy; 2025 Zenly</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-sm hover:underline">Privacy</Link>
              <Link href="/terms" className="text-sm hover:underline">Terms</Link>
              <Link href="/contact" className="text-sm hover:underline">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
