import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  query,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication & Google Provider
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Cloud Firestore with dedicated Database ID
export const db = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId || '(default)'
);

// Connection verification as mandated by Firebase skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline. Verify network connection.');
    }
  }
}
testConnection();

// Standardized error handler conforming to FirestoreErrorInfo
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Sign In via popup
export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleAuthProvider);
  const user = result.user;

  // Persist / update profile doc
  const userDocPath = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Mindful Seeker',
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, userDocPath);
  }

  return user;
}

// Sign Out
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Save or Update Journal Entry in Firestore subcollection /users/{userId}/journalEntries/{id}
export async function saveJournalEntryToCloud(
  userId: string,
  entry: JournalEntry
): Promise<void> {
  const path = `users/${userId}/journalEntries/${entry.id}`;
  try {
    const payload: Record<string, any> = {
      id: entry.id,
      userId,
      sessionId: entry.sessionId || 'session',
      sessionTitle: entry.sessionTitle || 'Mindful Practice',
      date: entry.date || new Date().toISOString(),
      durationMinutes: entry.durationMinutes || 1,
      stressBefore: entry.stressBefore ?? 5,
      calmnessAfter: entry.calmnessAfter ?? 8,
      notes: entry.notes || '',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', userId, 'journalEntries', entry.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete Journal Entry from Firestore
export async function deleteJournalEntryFromCloud(
  userId: string,
  entryId: string
): Promise<void> {
  const path = `users/${userId}/journalEntries/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'journalEntries', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Real-time listener for user's journal entries
export function subscribeToUserJournal(
  userId: string,
  onEntries: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void
): () => void {
  const path = `users/${userId}/journalEntries`;
  const entriesQuery = query(collection(db, 'users', userId, 'journalEntries'));

  const unsubscribe = onSnapshot(
    entriesQuery,
    (snapshot) => {
      const items: JournalEntry[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: d.id || docSnap.id,
          sessionId: d.sessionId || 'session',
          sessionTitle: d.sessionTitle || 'Mindful Practice',
          date: d.date || new Date().toISOString(),
          durationMinutes: d.durationMinutes || 1,
          stressBefore: d.stressBefore ?? 5,
          calmnessAfter: d.calmnessAfter ?? 8,
          notes: d.notes || '',
        });
      });

      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onEntries(items);
    },
    (error) => {
      onError?.(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );

  return unsubscribe;
}
