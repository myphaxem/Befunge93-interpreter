import { initializeApp } from 'firebase/app';
import { getAuth, GithubAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Firebase configuration - these should be set via environment variables
// For development, you can use a .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Initialize Firebase only if configuration is provided
let auth: Auth | undefined;
let db: Firestore | undefined;
let githubProvider: GithubAuthProvider | undefined;

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    githubProvider = new GithubAuthProvider();
  }
} catch (error) {
  console.warn('Firebase initialization failed. Authentication features will be disabled.', error);
}

export { auth, db, githubProvider };
export const isFirebaseEnabled = !!(auth && db);
