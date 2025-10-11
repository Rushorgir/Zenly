"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              Your privacy is important to us. This Privacy Policy explains how Zenly collects, uses, and protects your personal information.
            </p>

            <h3 className="font-semibold mt-4">Information We Collect</h3>
            <p className="text-sm text-muted-foreground">We collect account information, journal entries, mood logs, and usage metrics to provide and improve our services.</p>

            <h3 className="font-semibold mt-4">How We Use Information</h3>
            <p className="text-sm text-muted-foreground">We use data to power features such as AI analysis, personalize recommendations, and maintain platform security. Personal data is not shared with third parties except as required by law or with explicit consent.</p>

            <h3 className="font-semibold mt-4">Data Security</h3>
            <p className="text-sm text-muted-foreground">We use industry-standard security practices to protect data at rest and in transit. However, no system is 100% secure; please avoid sharing extremely sensitive information.</p>

            <h3 className="font-semibold mt-4">Your Rights</h3>
            <p className="text-sm text-muted-foreground">You can request account deletion, export your data, or update your information via your profile settings or by contacting support.</p>

            <div className="mt-6 text-sm text-muted-foreground">
              <p>Last updated: October 11, 2025</p>
              <p>
                Back to <Link href="/" className="text-primary hover:underline">Home</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
