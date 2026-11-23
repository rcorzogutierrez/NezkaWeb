import { Service, inject } from '@angular/core';
import type { Firestore } from 'firebase/firestore';
import { APP_ENVIRONMENT, FIREBASE_APP } from './firebase.providers';

type FirestoreModule = typeof import('./firestore.lazy');
export type FirestoreKit = FirestoreModule & { readonly db: Firestore };

/** Loads the Firestore SDK the first time something needs data, then reuses it. */
@Service()
export class FirestoreLoader {
  private readonly app = inject(FIREBASE_APP);
  private readonly env = inject(APP_ENVIRONMENT);
  private kit: Promise<FirestoreKit> | null = null;

  load(): Promise<FirestoreKit> {
    this.kit ??= import('./firestore.lazy').then((m) => ({
      ...m,
      db: m.connect(this.app, this.env.useEmulators),
    }));
    return this.kit;
  }
}
