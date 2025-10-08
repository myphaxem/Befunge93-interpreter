import { 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  getDocs,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, githubProvider, isFirebaseEnabled } from './config';

export type UserProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

// Authentication functions
export async function signInWithGithub(): Promise<User | null> {
  if (!isFirebaseEnabled || !auth || !githubProvider) {
    throw new Error('Firebase is not configured');
  }
  
  try {
    const result = await signInWithPopup(auth, githubProvider);
    return result.user;
  } catch (error) {
    console.error('GitHub sign-in error:', error);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  if (!auth) return;
  await firebaseSignOut(auth);
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// Firestore data sync functions
export type AppStateData = {
  code: string;
  inputQueue: string;
  mode: 'edit' | 'interpreter';
  timestamp: number;
};

export type HistoryEntryData = {
  id: string;
  name: string;
  folder: string;
  code: string;
  createdAt: number;
  updatedAt: number;
};

export type HistoryStoreData = {
  version: number;
  folders: string[];
  entries: HistoryEntryData[];
};

export async function syncAppStateToFirestore(userId: string, state: AppStateData): Promise<void> {
  if (!db) return;
  
  try {
    const docRef = doc(db, 'users', userId, 'data', 'appState');
    await setDoc(docRef, {
      ...state,
      syncedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to sync app state to Firestore:', error);
  }
}

export async function loadAppStateFromFirestore(userId: string): Promise<AppStateData | null> {
  if (!db) return null;
  
  try {
    const docRef = doc(db, 'users', userId, 'data', 'appState');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        code: data.code,
        inputQueue: data.inputQueue,
        mode: data.mode,
        timestamp: data.timestamp
      };
    }
  } catch (error) {
    console.error('Failed to load app state from Firestore:', error);
  }
  
  return null;
}

export async function syncHistoryToFirestore(userId: string, historyData: HistoryStoreData): Promise<void> {
  if (!db) return;
  
  try {
    const docRef = doc(db, 'users', userId, 'data', 'history');
    await setDoc(docRef, {
      ...historyData,
      syncedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to sync history to Firestore:', error);
  }
}

export async function loadHistoryFromFirestore(userId: string): Promise<HistoryStoreData | null> {
  if (!db) return null;
  
  try {
    const docRef = doc(db, 'users', userId, 'data', 'history');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        version: data.version,
        folders: data.folders,
        entries: data.entries
      };
    }
  } catch (error) {
    console.error('Failed to load history from Firestore:', error);
  }
  
  return null;
}

// Migration helper: move localStorage data to Firestore on first login
export async function migrateLocalDataToFirestore(userId: string): Promise<void> {
  if (!db) return;
  
  try {
    // Check if user already has data in Firestore
    const historyDocRef = doc(db, 'users', userId, 'data', 'history');
    const historySnap = await getDoc(historyDocRef);
    
    if (historySnap.exists()) {
      // User already has Firestore data, don't overwrite
      return;
    }
    
    // Migrate app state
    const appStateRaw = localStorage.getItem('befunge.app.state');
    if (appStateRaw) {
      try {
        const appState = JSON.parse(appStateRaw);
        await syncAppStateToFirestore(userId, appState);
      } catch (e) {
        console.warn('Failed to migrate app state:', e);
      }
    }
    
    // Migrate history
    const historyRaw = localStorage.getItem('befunge.history.v1');
    if (historyRaw) {
      try {
        // Try to decompress if it's compressed
        const { decompressFromEncodedURIComponent } = await import('lz-string');
        const json = decompressFromEncodedURIComponent(historyRaw) || historyRaw;
        const historyData = JSON.parse(json);
        await syncHistoryToFirestore(userId, historyData);
      } catch (e) {
        console.warn('Failed to migrate history:', e);
      }
    }
  } catch (error) {
    console.error('Failed to migrate local data to Firestore:', error);
  }
}
