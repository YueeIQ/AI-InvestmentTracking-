
import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Helper to get env vars from either import.meta.env (Vite) or process.env (compat)
const getEnvVar = (key: string) => {
  const metaEnv = (import.meta as any).env || {};
  return metaEnv[key] || (typeof process !== 'undefined' ? process.env?.[key] : undefined);
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
};

let app;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Only initialize if API Key is present
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY_HERE') {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("✅ Firebase initialized successfully.");
  } catch (e) {
    console.error("❌ Firebase initialization error:", e);
  }
} else {
  console.warn("⚠️ Firebase Config Missing or Invalid: VITE_FIREBASE_API_KEY is not set.");
  console.warn("The app will run in 'Local Mode'. Create a .env file to enable Cloud Sync.");
}

export { auth, db };
