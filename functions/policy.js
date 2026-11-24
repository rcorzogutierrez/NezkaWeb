/**
 * The rules for the account functions, kept apart from Firebase so they can be tested alone.
 * Each check throws a PolicyError, which index.js turns into the callable's error code.
 */

/** Firebase Auth refuses shorter passwords; the app adds no rule of its own. */
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 128;

export class PolicyError extends Error {
  /**
   * @param {'unauthenticated' | 'permission-denied' | 'invalid-argument' | 'failed-precondition'} code
   * @param {string} reason Stable word the web app can show a message for.
   */
  constructor(code, reason) {
    super(reason);
    this.code = code;
    this.reason = reason;
  }
}

/**
 * Only an active administrator may call. `profile` is the caller's `users/{uid}` document.
 * @param {string | undefined} callerUid
 * @param {{ role?: unknown, active?: unknown } | undefined} profile
 */
export function assertAdmin(callerUid, profile) {
  if (!callerUid) throw new PolicyError('unauthenticated', 'signed-out');
  if (!profile || profile.role !== 'admin' || profile.active !== true) {
    throw new PolicyError('permission-denied', 'not-admin');
  }
}

/** @param {unknown} uid */
export function checkUid(uid) {
  if (typeof uid !== 'string' || uid.length === 0 || uid.length > 128 || uid.includes('/')) {
    throw new PolicyError('invalid-argument', 'bad-uid');
  }
  return uid;
}

/**
 * Nobody deletes their own account, and the app always keeps an active administrator.
 * @param {{ callerUid: string, targetUid: string, activeAdmins: readonly string[] }} args
 */
export function checkDelete({ callerUid, targetUid, activeAdmins }) {
  if (targetUid === callerUid) throw new PolicyError('failed-precondition', 'self');
  if (!activeAdmins.some((uid) => uid !== targetUid)) {
    throw new PolicyError('failed-precondition', 'last-admin');
  }
}

/**
 * Any password Firebase accepts. Your own is changed from "Cambiar contraseña" instead.
 * @param {{ callerUid: string, targetUid: string, password: unknown }} args
 */
export function checkPassword({ callerUid, targetUid, password }) {
  if (targetUid === callerUid) throw new PolicyError('failed-precondition', 'self');
  if (
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new PolicyError('invalid-argument', 'weak-password');
  }
  return password;
}
