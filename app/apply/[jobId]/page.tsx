"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Briefcase, Upload, ArrowLeft, Link as LinkIcon } from "lucide-react"
import Link from "next/link"
import { db, storage } from "@/lib/firebase"
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { use } from "react" 

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
  resumeFile: File | null
  resumeUrl: string
  submissionMethod: 'file' | 'url'
}

export default function ApplyPage({ params }: { params: { jobId: string } }) {
  const router = useRouter()
  const unwrappedParams = use(params)
  const jobId = unwrappedParams.jobId
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    resumeFile: null,
    resumeUrl: "",
    submissionMethod: 'file'
  })
  const [resumeFileName, setResumeFileName] = useState("")
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Validate file type
      const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF, DOC, or DOCX file",
          variant: "destructive",
        })
        return
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        })
        return
      }
      setFormData(prev => ({
        ...prev,
        resumeFile: file,
        resumeUrl: "" 
      }))
      setResumeFileName(file.name)
    }
  }

  const handleMethodChange = (method: 'file' | 'url') => {
    setFormData(prev => ({
      ...prev,
      submissionMethod: method,
      resumeFile: method === 'url' ? null : prev.resumeFile,
      resumeUrl: method === 'file' ? '' : prev.resumeUrl
    }))
    if (method === 'file') setResumeFileName("")
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

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

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

    if (formData.submissionMethod === 'file' && !formData.resumeFile) {
      toast({
        title: "Error",
        description: "Please upload your resume file",
        variant: "destructive",
      })
      return
    }

    if (formData.submissionMethod === 'url' && (!formData.resumeUrl.trim() || !isValidUrl(formData.resumeUrl))) {
      toast({
        title: "Error",
        description: "Please enter a valid resume URL",
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

      let resumeUrl = ""
      if (formData.submissionMethod === 'file' && formData.resumeFile) {
        const fileRef = ref(storage, `resumes/${jobId}/${Date.now()}-${formData.resumeFile.name}`)
        await uploadBytes(fileRef, formData.resumeFile)
        resumeUrl = await getDownloadURL(fileRef)
      } else if (formData.submissionMethod === 'url') {
        resumeUrl = formData.resumeUrl.trim()
      }

      await addDoc(collection(db, "applications"), {
        jobId,
        jobTitle: job?.title || "",
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        resumeUrl,
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

            <div className="space-y-4">
              <Tabs 
                value={formData.submissionMethod} 
                onValueChange={(value) => handleMethodChange(value as 'file' | 'url')}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">Upload Resume</TabsTrigger>
                  <TabsTrigger value="url">Resume URL</TabsTrigger>
                </TabsList>
                <TabsContent value="file">
                  <div className="space-y-2">
                    <Label>Upload Resume (PDF, DOC, DOCX - max 5MB)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => document.getElementById("resume")?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {resumeFileName ? "Change File" : "Select File"}
                      </Button>
                      {resumeFileName && (
                        <span className="text-sm text-muted-foreground ml-2 truncate max-w-xs">
                          {resumeFileName}
                        </span>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="url">
                  <div className="space-y-2">
                    <Label htmlFor="resumeUrl">Resume URL *</Label>
                    <Input
                      id="resumeUrl"
                      name="resumeUrl"
                      type="url"
                      placeholder="https://example.com/my-resume.pdf"
                      value={formData.resumeUrl}
                      onChange={handleChange}
                    />
                  </div>
                </TabsContent>
              </Tabs>
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