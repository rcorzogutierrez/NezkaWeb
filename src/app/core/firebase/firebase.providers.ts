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
  type Persistence,
} from 'firebase/auth';
import type { AppEnvironment } from '../../../environments/environment.model';

export const APP_ENVIRONMENT = new InjectionToken<AppEnvironment>('APP_ENVIRONMENT');
export const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

/**
 * Creates an Auth instance for `app`. `initializeAuth` (instead of `getAuth`) leaves the
 * popup/redirect code out of the bundle: this app only signs in with email and password.
 */
export function createAuth(
  app: FirebaseApp,
  env: AppEnvironment,
  persistence: Persistence | Persistence[],
): Auth {
  const auth = initializeAuth(app, { persistence });
  if (env.useEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return auth;
}

/**
 * Registers the Firebase JS SDK (modular, tree-shakeable) without AngularFire.
 * Each instance is created lazily the first time something injects it. Firestore is loaded
 * on demand through `FirestoreLoader`.
 */
export function provideFirebase(env: AppEnvironment): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: APP_ENVIRONMENT, useValue: env },
    { provide: FIREBASE_APP, useFactory: () => initializeApp(env.firebase) },
    {
      provide: FIREBASE_AUTH,
      useFactory: () =>
        createAuth(inject(FIREBASE_APP), env, [indexedDBLocalPersistence, browserLocalPersistence]),
    },
  ]);
}
