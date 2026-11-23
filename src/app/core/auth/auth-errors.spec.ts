import { FirebaseError } from 'firebase/app';
import { authErrorMessage } from './auth-errors';

describe('authErrorMessage', () => {
  it('translates wrong credentials without revealing which part failed', () => {
    const message = 'El correo o la contraseña no son correctos.';
    expect(authErrorMessage(new FirebaseError('auth/invalid-credential', 'x'))).toBe(message);
    expect(authErrorMessage(new FirebaseError('auth/user-not-found', 'x'))).toBe(message);
    expect(authErrorMessage(new FirebaseError('auth/wrong-password', 'x'))).toBe(message);
  });

  it('explains an email that is already registered', () => {
    expect(authErrorMessage(new FirebaseError('auth/email-already-in-use', 'x'))).toContain(
      'Ya existe una cuenta',
    );
  });

  it('falls back to a generic message for unknown errors', () => {
    const fallback = 'No se pudo completar la operación. Inténtalo de nuevo.';
    expect(authErrorMessage(new FirebaseError('auth/something-new', 'x'))).toBe(fallback);
    expect(authErrorMessage(new Error('boom'))).toBe(fallback);
    expect(authErrorMessage(undefined)).toBe(fallback);
  });
});
