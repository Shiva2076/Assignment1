"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Briefcase, LogOut } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { JobCard } from "@/components/job-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Real-time job listener
  useEffect(() => {
    let unsubscribeJobs = () => {};
    
    const initializeDashboard = async () => {
      try {
        const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            
            // Set up real-time listener for jobs
            const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
            unsubscribeJobs = onSnapshot(jobsQuery, (snapshot) => {
              const jobsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setJobs(jobsList);
              setLoading(false);
            });
          } else {
            router.push("/login");
          }
        });

        return () => {
          authUnsubscribe();
          unsubscribeJobs();
        };
      } catch (error) {
        console.error("Initialization error:", error);
        setError("Failed to initialize dashboard.");
        setLoading(false);
      }
    };

    const cleanup = initializeDashboard();
    return () => {
      cleanup.then(fn => fn && fn());
    };
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-md">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            Admin Dashboard
          </h1>
          {user && <p className="text-muted-foreground">Welcome, {user.displayName || user.email}</p>}
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/create-job">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </Link>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Job Postings</h2>
        {jobs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No jobs found</CardTitle>
              <CardDescription>Create your first job posting to get started.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/create-job">
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Your First Job
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}