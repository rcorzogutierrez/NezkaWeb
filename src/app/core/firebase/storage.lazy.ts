/** The Storage SDK, loaded only by screens that show or upload photos. */
import type { FirebaseApp } from 'firebase/app';
import { type FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';

export { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export function connect(app: FirebaseApp, useEmulators: boolean): FirebaseStorage {
  const storage = getStorage(app);
  if (useEmulators) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  return storage;
}
