import { FirebaseError } from 'firebase/app';
import { errorKey } from './auth-errors';

describe('errorKey', () => {
  it('does not reveal which part of the credentials was wrong', () => {
    for (const code of ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password']) {
      expect(errorKey(new FirebaseError(code, 'x'))).toBe('invalidCredentials');
    }
  });

  it('maps Firestore permission errors', () => {
    expect(errorKey(new FirebaseError('permission-denied', 'x'))).toBe('permissionDenied');
  });

  it('maps the account functions', () => {
    expect(errorKey(new FirebaseError('functions/failed-precondition', 'x'))).toBe(
      'protectedAccount',
    );
    expect(errorKey(new FirebaseError('functions/internal', 'x'))).toBe('serverUnavailable');
  });

  it('falls back to a generic message', () => {
    expect(errorKey(new FirebaseError('auth/something-new', 'x'))).toBe('unknown');
    expect(errorKey(new Error('boom'))).toBe('unknown');
    expect(errorKey(undefined)).toBe('unknown');
  });
});
