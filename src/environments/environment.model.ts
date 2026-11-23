import type { FirebaseOptions } from 'firebase/app';

export interface AppEnvironment {
  readonly production: boolean;
  /** Connect Auth and Firestore to the local Firebase emulators. */
  readonly useEmulators: boolean;
  readonly firebase: FirebaseOptions;
}
