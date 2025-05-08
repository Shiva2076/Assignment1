"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, Calendar, ArrowRight, Search, ArrowUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState("newest")

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        setError("")
        
        const jobsRef = collection(db, "jobs")
        const jobsSnapshot = await getDocs(jobsRef)
        
        const jobsData = jobsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }))
        
        setJobs(jobsData)
      } catch (error: any) {
        console.error("Error fetching jobs:", error)
        setError(error.message || "Failed to fetch jobs. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [])

  const filteredJobs = jobs.filter((job) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchLower) ||
      job.description?.toLowerCase().includes(searchLower) ||
      job.company?.toLowerCase().includes(searchLower) ||
      job.location?.toLowerCase().includes(searchLower)
    );
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = a.createdAt || new Date(0)
    const dateB = b.createdAt || new Date(0)
    return sortOrder === "newest" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
  })

  const getRelativeTimeString = (date: Date) => {
    if (!date) return "Recently"
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    return format(date, 'MMM d, yyyy')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-6 max-w-7xl">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-5 w-5" />
            <span>JobPortal</span>
          </Link>
          <div className="ml-auto flex gap-2">
            <Link href="/login">
              <Button variant="outline">For Admins</Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 sm:px-6 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Available Job Openings</h1>
            <p className="text-muted-foreground mt-2">
              Browse and apply for open positions
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search jobs by title, description, company or location..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-md">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : sortedJobs.length === 0 ? (
            <Card className="p-6 text-center">
              <div className="mb-4">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No jobs found</h3>
              {searchTerm ? (
                <p className="text-muted-foreground mt-2">
                  No jobs match your search criteria. Try different keywords.
                </p>
              ) : (
                <p className="text-muted-foreground mt-2">
                  There are no job openings available at the moment. Please check back later.
                </p>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedJobs.map((job) => (
                <Card key={job.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl">{job.title}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      {job.company && (
                        <span className="font-medium">{job.company}</span>
                      )}
                      {job.company && job.location && (
                        <span className="text-muted-foreground">•</span>
                      )}
                      {job.location && (
                        <span>{job.location}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-muted-foreground">
                      {job.description}
                    </p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between border-t pt-4 pb-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="mr-1 h-3.5 w-3.5" />
                      <span>{getRelativeTimeString(job.createdAt)}</span>
                    </div>
                    <Link href={`/apply/${job.id}`} passHref>
                      <Button size="sm">
                        Apply Now
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}