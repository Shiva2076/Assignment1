// lib/firebase-service.js
import { 
  addDoc, 
  collection, 
  getDoc, 
  doc, 
  serverTimestamp,
  setDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  orderBy
} from "firebase/firestore";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./firebase";

// Job Functions
export const createJob = async (jobData) => {
  try {
    const docRef = await addDoc(collection(db, "jobs"), {
      title: jobData.title,
      description: jobData.description,
      createdAt: serverTimestamp(),
    });
    return docRef;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

// Auth Functions
export const registerUser = async (email, password, name) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name,
      email,
      createdAt: serverTimestamp()
    });

    return { uid: user.uid, email: user.email };
  } catch (error) {
    console.error("Registration error:", error);
    throw new Error(error.message || "Registration failed");
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      throw new Error("User data not found");
    }

    return {
      uid: user.uid,
      email: user.email,
      name: userDoc.data().name
    };
  } catch (error) {
    console.error("Login error:", error);
    throw new Error(error.message || "Login failed");
  }
};

// Application Service
export const applicationService = {
  // Check for duplicate applications
  async checkDuplicateApplication(jobId, email) {
    try {
      const applicationsRef = collection(db, "applications");
      const q = query(
        applicationsRef,
        where("jobId", "==", jobId),
        where("email", "==", email)
      );
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking duplicate application:", error);
      throw new Error("Failed to check for duplicate applications");
    }
  },

  // Upload resume to storage
  async uploadResume(file, jobId) {
    try {
      const fileRef = ref(storage, `resumes/${jobId}/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error("Error uploading resume:", error);
      throw new Error("Failed to upload resume");
    }
  },

  // Submit application
  async submitApplication(data) {
    try {
      if (!data.fullName?.trim()) {
        throw new Error("Full name is required");
      }
  
      if (!data.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error("Valid email is required");
      }
  
      if (!data.resumeFile) {
        throw new Error("Resume file is required");
      }
  
      const resumeUrl = await this.uploadResume(data.resumeFile, data.jobId);
  
      const applicationData = {
        jobId: data.jobId,
        jobTitle: data.jobTitle,
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone || null,
        coverLetter: data.coverLetter || null,
        resumeUrl,
        submittedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, "applications"), applicationData);
      return { id: docRef.id, ...applicationData };
  
    } catch (error) {
      console.error("Error submitting application:", error);
      throw new Error(error.message || "Failed to submit application");
    }
  },

  // Get applications by job ID
  async getApplicationsByJob(jobId) {
    try {
      if (!jobId) {
        console.error("getApplicationsByJob called with invalid jobId:", jobId);
        return [];
      }

      console.log("Fetching applications for jobId:", jobId);
      
      const q = query(
        collection(db, "applications"),
        where("jobId", "==", jobId),
        orderBy("submittedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const applications = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt || null
      }));
      
      console.log(`Found ${applications.length} applications for job ${jobId}`);
      return applications;
    } catch (error) {
      console.error("Error fetching applications:", error);
      throw new Error("Failed to fetch applications");
    }
  },

  async getApplicationsByJob(jobId) {
    try {
      const q = query(
        collection(db, "applications"),
        where("jobId", "==", jobId),
        orderBy("submittedAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching applications:", error);
      throw error;
    }
  },
  // In lib/firebase-service.js
async getApplicationsByJob(jobId) {
  try {
    console.log(`Fetching applications for job: ${jobId}`);
    
    const q = query(
      collection(db, "applications"),
      where("jobId", "==", jobId),
      orderBy("submittedAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Found ${querySnapshot.size} applications`);
    
    const applications = querySnapshot.docs.map(doc => {
      console.log(`Application ID: ${doc.id}`, doc.data());
      return {
        id: doc.id,
        ...doc.data()
      };
    });
    
    return applications;
  } catch (error) {
    console.error("Error in getApplicationsByJob:", error);
    throw error;
  }
},
  // Delete application
  async deleteApplication(applicationId) {
    try {
      if (!applicationId) {
        throw new Error("Application ID is required");
      }
      
      await deleteDoc(doc(db, "applications", applicationId));
      return true;
    } catch (error) {
      console.error("Error deleting application:", error);
      throw new Error(error.message || "Failed to delete application");
    }
  }
};