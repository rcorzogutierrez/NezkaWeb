import { Service, inject } from '@angular/core';
import type { FirebaseStorage } from 'firebase/storage';
import { APP_ENVIRONMENT, FIREBASE_APP } from './firebase.providers';

type StorageModule = typeof import('./storage.lazy');
export type StorageKit = StorageModule & { readonly storage: FirebaseStorage };

/** Loads the Storage SDK the first time a photo is uploaded or removed. */
@Service()
export class StorageLoader {
  private readonly app = inject(FIREBASE_APP);
  private readonly env = inject(APP_ENVIRONMENT);
  private kit: Promise<StorageKit> | null = null;

  load(): Promise<StorageKit> {
    this.kit ??= import('./storage.lazy').then((m) => ({
      ...m,
      storage: m.connect(this.app, this.env.useEmulators),
    }));
    return this.kit;
  }
}
