import { FirebaseError } from 'firebase/app';
import type { Messages } from '../i18n/messages.es';

export type ErrorKey = keyof Messages['errors'];

/** Firebase errors a user can actually cause, mapped to a translated message. */
const KEYS: Readonly<Record<string, ErrorKey>> = {
  'auth/invalid-credential': 'invalidCredentials',
  'auth/wrong-password': 'invalidCredentials',
  'auth/user-not-found': 'invalidCredentials',
  'auth/invalid-email': 'invalidEmail',
  'auth/user-disabled': 'userDisabled',
  'auth/email-already-in-use': 'emailInUse',
  'auth/weak-password': 'weakPassword',
  'auth/password-does-not-meet-requirements': 'weakPassword',
  'auth/too-many-requests': 'tooManyRequests',
  'auth/network-request-failed': 'network',
  'auth/operation-not-allowed': 'notEnabled',
  'auth/requires-recent-login': 'recentLogin',
  'permission-denied': 'permissionDenied',
  unavailable: 'network',
  // Cloud Functions (delete a user, set a password).
  'functions/unauthenticated': 'permissionDenied',
  'functions/permission-denied': 'permissionDenied',
  'functions/invalid-argument': 'weakPassword',
  'functions/failed-precondition': 'protectedAccount',
  'functions/not-found': 'serverUnavailable',
  'functions/internal': 'serverUnavailable',
  'functions/unavailable': 'network',
};

export function errorKey(error: unknown): ErrorKey {
  return error instanceof FirebaseError ? (KEYS[error.code] ?? 'unknown') : 'unknown';
}
