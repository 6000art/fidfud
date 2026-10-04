/**
 * Firebase Client Integration for Fidfud
 * Loaded from firebase-applet-config.json
 */

import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDoc,
  onSnapshot,
  setLogLevel,
  disableNetwork
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Silence Firestore benign idle gRPC stream cancellation and offline retry warnings
try {
  setLogLevel('silent');
} catch (e) {
  // Ignored
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
      // Use initializeFirestore with long polling to ensure reliable connection in containerized & iframe environments
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true
      }, firebaseConfig.databaseId);
    } catch (err) {
      try {
        db = getFirestore(app, firebaseConfig.databaseId);
      } catch (fallbackErr) {
        console.warn("Firestore initialization fallback:", fallbackErr);
      }
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

export const getAuthBearerHeaders = async (): Promise<Record<string, string>> => {
  const authInstance = getFirebaseAuth();
  if (authInstance?.currentUser) {
    try {
      const token = await authInstance.currentUser.getIdToken();
      if (token) {
        return { 'Authorization': `Bearer ${token}` };
      }
    } catch {}
  }
  return {};
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const authInstance = getFirebaseAuth();
  const currentUser = authInstance?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let isClientQuotaExhausted = false;

export const isFirestoreQuotaExhausted = () => isClientQuotaExhausted;

export const handleQuotaExhausted = async () => {
  if (isClientQuotaExhausted) return;
  isClientQuotaExhausted = true;
  console.warn('[Firebase Client] Firestore daily free write/read quota reached. Seamlessly disabling remote network and continuing in local state mode.');
  if (db) {
    try {
      await disableNetwork(db);
    } catch (e) {
      // Ignored
    }
  }
};

export async function safeGetDoc(docRef: any): Promise<any | null> {
  if (isClientQuotaExhausted) return null;
  try {
    return await getDoc(docRef);
  } catch (error: any) {
    const isQuota = error && (
      error.code === 'resource-exhausted' ||
      error.code === 8 ||
      String(error.message || '').toLowerCase().includes('quota') ||
      String(error.message || '').toLowerCase().includes('exhausted')
    );
    if (isQuota) {
      await handleQuotaExhausted();
      return null;
    }
    console.warn('[Firebase Client] safeGetDoc warning:', error?.message || error);
    return null;
  }
}

export async function safeSetDoc(docRef: any, data: any, options?: any): Promise<boolean> {
  if (isClientQuotaExhausted) return false;
  try {
    if (options) {
      await setDoc(docRef, data, options);
    } else {
      await setDoc(docRef, data);
    }
    return true;
  } catch (error: any) {
    const isQuota = error && (
      error.code === 'resource-exhausted' ||
      error.code === 8 ||
      String(error.message || '').toLowerCase().includes('quota') ||
      String(error.message || '').toLowerCase().includes('exhausted')
    );
    if (isQuota) {
      await handleQuotaExhausted();
      return false;
    }
    console.warn('[Firebase Client] safeSetDoc warning:', error?.message || error);
    return false;
  }
}

export async function testConnection() {
  // Silent verification without generating artificial quota burn
  if (isClientQuotaExhausted) return;
  try {
    const database = getFirebaseDB();
    if (!database) return;
    // Database reference ready
  } catch (error: any) {
    console.warn('[Firebase Client] Connection readiness notice:', error?.message || error);
  }
}

export default getFirebaseDB;

