import { initializeApp, getApps } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

let app
let auth
let db
let storage
let googleProvider

const initializeFirebase = () => {
  try {
    if (typeof window !== "undefined" && !getApps().length) {
      app = initializeApp(firebaseConfig)
      auth = getAuth(app)
      db = getFirestore(app)
      storage = getStorage(app)
      googleProvider = new GoogleAuthProvider()
      
      // For debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('Firebase initialized successfully')
      }
    }
  } catch (error) {
    console.error("Firebase initialization error:", error)
    throw error // Re-throw for error boundaries
  }
}

// Initialize immediately in browser context
if (typeof window !== "undefined") {
  initializeFirebase()
}

export { auth, db, storage, googleProvider, initializeFirebase }