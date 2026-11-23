import { FirebaseError } from 'firebase/app';

/** Spanish messages for the Firebase Auth errors a user can actually cause. */
const MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-credential': 'El correo o la contraseña no son correctos.',
  'auth/wrong-password': 'El correo o la contraseña no son correctos.',
  'auth/user-not-found': 'El correo o la contraseña no son correctos.',
  'auth/invalid-email': 'Ese correo no tiene un formato válido.',
  'auth/user-disabled': 'Esta cuenta está desactivada. Pide al administrador que la active.',
  'auth/email-already-in-use':
    'Ya existe una cuenta con ese correo. Inicia sesión o recupera la contraseña.',
  'auth/weak-password': 'La contraseña es muy débil. Usa al menos 8 caracteres.',
  'auth/password-does-not-meet-requirements':
    'La contraseña no cumple los requisitos de seguridad. Usa al menos 8 caracteres.',
  'auth/too-many-requests':
    'Demasiados intentos seguidos. Espera unos minutos o recupera la contraseña.',
  'auth/network-request-failed':
    'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  'auth/operation-not-allowed': 'El acceso con correo y contraseña no está activado en Firebase.',
};

const FALLBACK = 'No se pudo completar la operación. Inténtalo de nuevo.';

export function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? FALLBACK;
  }
  return FALLBACK;
}
