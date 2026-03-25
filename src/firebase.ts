import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, deleteDoc, query, where, onSnapshot, orderBy, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export { firebaseConfig };
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
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
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const signIn = async () => {
  try {
    console.log('Initiating sign-in with popup...');
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Sign-in successful:', result.user.email);
    return result;
  } catch (error: any) {
    console.error('Sign-in error code:', error.code);
    console.error('Sign-in error message:', error.message);
    
    if (error.code === 'auth/cancelled-popup-request') {
      console.warn('Sign-in popup request was cancelled by a newer request.');
    } else if (error.code === 'auth/popup-closed-by-user') {
      console.warn('Sign-in popup was closed by the user.');
    } else if (error.code === 'auth/unauthorized-domain') {
      const domain = window.location.hostname;
      console.error(`Domain "${domain}" is not authorized for Firebase Auth.`);
      console.error('To fix this:');
      console.error('1. Go to Firebase Console -> Authentication -> Settings -> Authorized domains');
      console.error(`2. Add "${domain}" to the list.`);
    } else if (error.code === 'auth/operation-not-allowed') {
      console.error('Google Sign-In is not enabled in your Firebase project.');
      console.error('To fix this:');
      console.error('1. Go to Firebase Console -> Authentication -> Sign-in method');
      console.error('2. Enable "Google" as a sign-in provider.');
    } else {
      console.error('Sign-in error:', error);
    }
    throw error;
  }
};
export const logOut = () => signOut(auth);

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
