import { computed, signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService, type SessionStatus } from '../app/core/auth/auth.service';
import type { UserProfile } from '../app/core/users/user-profile';

export function testUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'ana',
    name: 'Ana Pérez',
    email: 'ana@example.com',
    role: 'user',
    active: true,
    ...overrides,
  };
}

/** In-memory stand-in for AuthService: no Firebase, every method is a spy. */
export function createAuthServiceMock(
  profile: UserProfile | null = null,
  signedInWithoutAccess = false,
) {
  const state = signal<UserProfile | null>(profile);
  const status = computed<SessionStatus>(() => {
    const p = state();
    if (p) return p.active ? 'active' : 'no-access';
    return signedInWithoutAccess ? 'no-access' : 'anonymous';
  });
  return {
    status,
    user: computed(() => (status() === 'active' ? state() : null)),
    isAdmin: computed(() => status() === 'active' && state()?.role === 'admin'),
    email: computed(() => state()?.email ?? (signedInWithoutAccess ? 'nuevo@example.com' : '')),
    whenSettled: vi.fn(async () => status()),
    reloadProfile: vi.fn(async () => status()),
    login: vi.fn(async () => undefined),
    sendPasswordReset: vi.fn(async () => undefined),
    logout: vi.fn(async () => state.set(null)),
    setUser: (next: UserProfile | null) => state.set(next),
  };
}

export type AuthServiceMock = ReturnType<typeof createAuthServiceMock>;

export function provideAuthServiceMock(mock: AuthServiceMock) {
  return { provide: AuthService, useValue: mock };
}
