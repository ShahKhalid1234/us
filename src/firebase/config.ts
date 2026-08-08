import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA0XOGQXrkGkONikGcaT7Xfbnbi-Q7Bc7w",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "perceptive-upgrade-j5jvd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "perceptive-upgrade-j5jvd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "perceptive-upgrade-j5jvd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "884767084550",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:884767084550:web:c831634bc0fae85125b387"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if provided, fallback to default if not configured or empty
const firestoreDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-481acba6-bb8f-457c-8024-07278a92f145";
export const db = initializeFirestore(app, {}, firestoreDbId);

export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
