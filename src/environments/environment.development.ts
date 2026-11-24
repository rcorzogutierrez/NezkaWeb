import type { AppEnvironment } from './environment.model';

/**
 * Local development against the Firebase Emulator Suite (`npm run emulators`).
 * The `demo-` project id keeps every call inside the emulators.
 */
export const environment: AppEnvironment = {
  production: false,
  useEmulators: true,
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-nezka.firebaseapp.com',
    projectId: 'demo-nezka',
    storageBucket: 'demo-nezka.appspot.com',
    appId: 'demo-app',
  },
};
