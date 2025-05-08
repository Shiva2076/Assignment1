import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, ExternalLink } from "lucide-react"

export function JobCard({ job }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    return timestamp.toDate().toLocaleDateString()
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            <CardTitle className="text-xl">{job.title}</CardTitle>
          </div>
        </div>
        <CardDescription>Created on {formatDate(job.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="line-clamp-3 text-muted-foreground">{job.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" asChild>
          <Link href={`/apply/${job.id}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            View Application
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/dashboard/jobs/${job.id}`}>Manage</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
