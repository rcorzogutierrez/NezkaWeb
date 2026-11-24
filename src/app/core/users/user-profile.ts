import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'user';
export const USER_ROLES: readonly UserRole[] = ['user', 'admin'];

/** Document `users/{uid}` in Firestore. Only an administrator writes it. */
export interface UserProfile {
  readonly uid: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly active: boolean;
  /** Created with a temporary password: must choose their own before using the app. */
  readonly mustChangePassword: boolean;
  readonly createdAt?: Timestamp;
}

export const USERS_COLLECTION = 'users';
/** `settings/setup` exists once the first administrator has been created. */
export const SETUP_DOC = ['settings', 'setup'] as const;

export function toUserProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    name: String(data['name'] ?? ''),
    email: String(data['email'] ?? ''),
    role: data['role'] === 'admin' ? 'admin' : 'user',
    active: data['active'] === true,
    mustChangePassword: data['mustChangePassword'] === true,
    createdAt: data['createdAt'] as Timestamp | undefined,
  };
}
