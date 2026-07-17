/**
 * Firebase Client Integration for Fidfud
 * Loaded from firebase-applet-config.json
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  onSnapshot,
  setLogLevel
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Silence Firestore benign idle gRPC stream cancellation warnings
try {
  setLogLevel('error');
} catch (e) {
  console.warn('Failed to set Firestore log level:', e);
}

// Read config
const firebaseConfig = {
  projectId: "gen-lang-client-0442526754",
  appId: "1:294554297456:web:ed85b28799ece8861f80b5",
  apiKey: "AIzaSyB63Sj8sgyILTG4a5aVw1ryAFxhGcO-K-g",
  authDomain: "gen-lang-client-0442526754.firebaseapp.com",
  databaseId: "ai-studio-fidfud-a58740f7-99ad-4888-a11e-4f294d600c73",
  storageBucket: "gen-lang-client-0442526754.firebasestorage.app",
  messagingSenderId: "294554297456"
};

let app: any = null;
let db: any = null;
let auth: any = null;

const ensureInit = () => {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (err) {
      console.error("Firebase app initialization failed:", err);
    }
  }
};

export const getFirebaseDB = () => {
  if (!db) {
    ensureInit();
    try {
      db = getFirestore(app, firebaseConfig.databaseId);
    } catch (err) {
      console.error("Firestore initialization failed:", err);
    }
  }
  return db;
};

export const getFirebaseAuth = () => {
  if (!auth) {
    ensureInit();
    try {
      auth = getAuth(app);
    } catch (err) {
      console.error("Firebase Auth initialization failed:", err);
    }
  }
  return auth;
};

export default getFirebaseDB;
