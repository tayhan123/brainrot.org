import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs,
  query,
  orderBy
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Enforce standard testing of Firestore connection on startup
async function testFirestoreConnection() {
  try {
    const testDocRef = doc(db, 'test', 'connection');
    await getDocFromServer(testDocRef);
    console.log("[Firebase] Connection check successful.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firebase] Offline mode active.");
    }
  }
}
testFirestoreConnection();

// --- Firestore Error Handling as mandated by the Firebase Integration Skill ---
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
  console.error('[Firebase Helper] Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Firestore Database Services ---

export interface UserProfileData {
  uid: string;
  username: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  totalFocusMinutes: number;
  completedPomodoros: number;
  totalQuizzesTaken: number;
  lastActiveDate: string;
}

export interface NoteData {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  isPinned?: boolean;
}

export interface HistoryItemData {
  id: string;
  title: string;
  xp: number;
  timestamp: string;
}

/**
 * Fetch a user profile from Firestore.
 */
export async function getRemoteUserProfile(uid: string): Promise<UserProfileData | null> {
  const pathStr = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, pathStr);
    return null;
  }
}

/**
 * Save user profile and stats to Firestore.
 */
export async function saveRemoteUserProfile(uid: string, data: UserProfileData): Promise<void> {
  const pathStr = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathStr);
  }
}

/**
 * Fetch a user's notes from Firestore.
 */
export async function getRemoteNotes(uid: string): Promise<NoteData[]> {
  const pathStr = `users/${uid}/notes`;
  try {
    const notesColRef = collection(db, "users", uid, "notes");
    const notesSnap = await getDocs(notesColRef);
    const list: NoteData[] = [];
    notesSnap.forEach((doc) => {
      list.push(doc.data() as NoteData);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathStr);
    return [];
  }
}

/**
 * Save or update a note on Firestore.
 */
export async function saveRemoteNote(uid: string, note: NoteData): Promise<void> {
  const pathStr = `users/${uid}/notes/${note.id}`;
  try {
    const noteDocRef = doc(db, "users", uid, "notes", note.id);
    await setDoc(noteDocRef, note);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathStr);
  }
}

/**
 * Delete a note on Firestore.
 */
export async function deleteRemoteNote(uid: string, noteId: string): Promise<void> {
  const pathStr = `users/${uid}/notes/${noteId}`;
  try {
    const noteDocRef = doc(db, "users", uid, "notes", noteId);
    await deleteDoc(noteDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathStr);
  }
}

/**
 * Fetch a user's progress history logs from Firestore.
 */
export async function getRemoteHistory(uid: string): Promise<HistoryItemData[]> {
  const pathStr = `users/${uid}/history`;
  try {
    const historyColRef = collection(db, "users", uid, "history");
    const historySnap = await getDocs(historyColRef);
    const list: HistoryItemData[] = [];
    historySnap.forEach((doc) => {
      list.push(doc.data() as HistoryItemData);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, pathStr);
    return [];
  }
}

/**
 * Save a history accomplishment item on Firestore.
 */
export async function saveRemoteHistoryItem(uid: string, item: HistoryItemData): Promise<void> {
  const pathStr = `users/${uid}/history/${item.id}`;
  try {
    const historyDocRef = doc(db, "users", uid, "history", item.id);
    await setDoc(historyDocRef, item);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathStr);
  }
}

/**
 * Clear the user's focus history items on Firestore.
 */
export async function clearRemoteHistory(uid: string): Promise<void> {
  const pathStr = `users/${uid}/history`;
  try {
    const historyColRef = collection(db, "users", uid, "history");
    const historySnap = await getDocs(historyColRef);
    const deletePromises: Promise<void>[] = [];
    historySnap.forEach((docSnap) => {
      deletePromises.push(deleteDoc(doc(db, "users", uid, "history", docSnap.id)));
    });
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathStr);
  }
}

export { signInWithPopup, signOut };
