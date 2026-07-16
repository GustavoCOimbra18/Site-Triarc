import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import appletConfig from '../firebase-applet-config.json';

// Use the production Firebase project (triarc-store) to ensure absolute synchronization of products and data across all devices and previews
const firebaseConfig = {
  apiKey: "AIzaSyAKbIy4gahZxDH1dEBL7aO6Zo4o2ip-seU",
  authDomain: "triarc-store.firebaseapp.com",
  projectId: "triarc-store",
  storageBucket: "triarc-store.firebasestorage.app",
  messagingSenderId: "55645290288",
  appId: "1:55645290288:web:a564c52b75ed8f767cd2f5",
  measurementId: "G-59TKMBXTHM"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics could not be loaded in sandboxed environment:", e);
}

export { analytics };

// Setup Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Secure Log Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
