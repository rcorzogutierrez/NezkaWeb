/**
 * Everything the app uses from Firestore, loaded on demand: the login page does not pay for
 * the Firestore SDK (about 130 kB compressed). Add new imports here as features need them.
 */
import type { FirebaseApp } from 'firebase/app';
import { type Firestore, connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

export {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

export function connect(app: FirebaseApp, useEmulators: boolean): Firestore {
  const db = getFirestore(app);
  if (useEmulators) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  return db;
}
