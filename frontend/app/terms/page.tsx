"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              Welcome to Zenly. By using our services, you agree to the following terms and conditions.
            </p>

            <h3 className="font-semibold mt-4">Use of Service</h3>
            <p className="text-sm text-muted-foreground">You must be at least 16 years old to use this service. Use the platform responsibly and do not misuse the AI features.</p>

            <h3 className="font-semibold mt-4">User Content</h3>
            <p className="text-sm text-muted-foreground">You retain ownership of the content you create. By submitting content, you grant Zenly a license to use it to provide and improve the service.</p>

            <h3 className="font-semibold mt-4">Acceptable Use</h3>
            <p className="text-sm text-muted-foreground">Harassment, threats, or illegal content are prohibited. Report violations to support.</p>

            <h3 className="font-semibold mt-4">Limitation of Liability</h3>
            <p className="text-sm text-muted-foreground">Zenly is not a substitute for professional medical advice. In emergencies, contact local authorities or crisis services.</p>

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
