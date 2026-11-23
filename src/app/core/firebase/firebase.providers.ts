import {
  type EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { type FirebaseApp, initializeApp } from 'firebase/app';
import {
  type Auth,
  browserLocalPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import type { AppEnvironment } from '../../../environments/environment.model';

export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

/**
 * Registers the Firebase JS SDK (modular, tree-shakeable) without AngularFire.
 * Each instance is created lazily the first time something injects it. Firestore joins
 * here with the first feature that stores data (clientes), so it stays out of the bundle until then.
 */
export function provideFirebase(env: AppEnvironment): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FIREBASE_APP, useFactory: () => initializeApp(env.firebase) },
    {
      provide: FIREBASE_AUTH,
      useFactory: () => {
        // initializeAuth (instead of getAuth) leaves the popup/redirect code out of the
        // bundle: this app only signs in with email and password.
        const auth = initializeAuth(inject(FIREBASE_APP), {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        });
        auth.languageCode = 'es';
        if (env.useEmulators) {
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        }
        return auth;
      },
    },
  ]);
}
