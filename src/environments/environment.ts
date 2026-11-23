import type { AppEnvironment } from './environment.model';

/**
 * Production: the `nezka-web` Firebase project. This web config is public by design;
 * access is protected by Firebase Auth and the Firestore security rules.
 */
export const environment: AppEnvironment = {
  production: true,
  useEmulators: false,
  firebase: {
    apiKey: 'AIzaSyDw1cbWlCUZyuWVqu_5Nr_PKhdaRfYBCDk',
    authDomain: 'nezka-web.firebaseapp.com',
    projectId: 'nezka-web',
    storageBucket: 'nezka-web.firebasestorage.app',
    messagingSenderId: '873813130124',
    appId: '1:873813130124:web:6ebf04244019af9f77f4a9',
  },
};
