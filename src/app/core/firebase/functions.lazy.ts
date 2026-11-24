/**
 * The Cloud Functions client, loaded only when an administrator uses a server-side account
 * task (delete a user, set a password).
 */
import type { FirebaseApp } from 'firebase/app';
import { type Functions, connectFunctionsEmulator, getFunctions } from 'firebase/functions';

export { httpsCallable } from 'firebase/functions';

/** Same region as `functions/index.js`. */
export const FUNCTIONS_REGION = 'us-central1';

export function connect(app: FirebaseApp, useEmulators: boolean): Functions {
  const functions = getFunctions(app, FUNCTIONS_REGION);
  if (useEmulators) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return functions;
}
