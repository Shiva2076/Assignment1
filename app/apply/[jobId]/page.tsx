"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Briefcase, Upload, ArrowLeft, AlertTriangle, Link as LinkIcon } from "lucide-react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { use } from "react"

// Types
interface Job {
  id: string
  title: string
  description: string
  company?: string
  location?: string
  createdAt: { toDate: () => Date }
}

interface FormData {
  fullName: string
  email: string
  resumeUrl: string
}

export default function ApplyPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter()
  const { jobId } = use(params)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    resumeUrl: "",
  })
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        setLoading(true)
        setError("")

        if (!db) {
          throw new Error("Database is not properly configured.")
        }

        const jobDoc = await getDoc(doc(db, "jobs", jobId))

        if (!jobDoc.exists()) {
          throw new Error("Job not found")
        }

        setJob({
          id: jobDoc.id,
          ...jobDoc.data(),
        } as Job)
      } catch (error) {
        console.error("Error fetching job details:", error)
        setError(error instanceof Error ? error.message : "Failed to load job details")
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load job details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchJobDetails()
  }, [jobId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const checkDuplicateApplication = async (email: string) => {
    if (!db) return false

    try {
      const applicationsRef = collection(db, "applications")
      const q = query(
        applicationsRef,
        where("jobId", "==", jobId),
        where("email", "==", email)
      )
      const querySnapshot = await getDocs(q)
      return !querySnapshot.empty
    } catch (error) {
      console.error("Error checking duplicate application:", error)
      return false
    }
  }

  const validateUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.fullName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your full name",
        variant: "destructive",
      })
      return
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    if (formData.resumeUrl && !validateUrl(formData.resumeUrl)) {
      toast({
        title: "Error",
        description: "Please enter a valid URL for your resume",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)

      const isDuplicate = await checkDuplicateApplication(formData.email)
      if (isDuplicate) {
        toast({
          title: "Duplicate Application",
          description: "You have already applied for this job with this email address.",
          variant: "destructive",
        })
        return
      }

      await addDoc(collection(db, "applications"), {
        jobId,
        jobTitle: job?.title || "",
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        resumeUrl: formData.resumeUrl.trim(),
        submittedAt: serverTimestamp(),
      })

      setSubmitted(true)
    } catch (error) {
      console.error("Error submitting application:", error)
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full max-w-2xl mx-auto" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Job Not Found</CardTitle>
            <CardDescription className="text-center">
              {error || "The job you're looking for doesn't exist or has been removed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse Available Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Application Submitted!</CardTitle>
            <CardDescription className="text-center">
              Thank you for applying to {job.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6">We have received your application and will review it shortly.</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Browse More Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <CardTitle>Apply for: {job.title}</CardTitle>
          </div>
          <CardDescription>Complete the form below to apply for this position</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-md mb-4">
              <h3 className="font-semibold mb-2">Job Description</h3>
              <div className="whitespace-pre-line text-sm">{job.description}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumeUrl">Resume URL (Optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="resumeUrl"
                  name="resumeUrl"
                  type="url"
                  placeholder="https://example.com/your-resume.pdf"
                  value={formData.resumeUrl}
                  onChange={handleChange}
                />
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Provide a link to your resume (Google Drive, Dropbox, personal website, etc.)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}