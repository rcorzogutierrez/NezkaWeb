import { computed, signal } from '@angular/core';
import { vi } from 'vitest';
import { AuthService, type SessionUser } from '../app/core/auth/auth.service';

/** In-memory stand-in for AuthService: no Firebase, every method is a spy. */
export function createAuthServiceMock(user: SessionUser | null = null) {
  const state = signal<SessionUser | null>(user);
  const mock = {
    user: state.asReadonly(),
    isAuthenticated: computed(() => state() !== null),
    ready: vi.fn(async () => state() !== null),
    login: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
    sendPasswordReset: vi.fn(async () => undefined),
    logout: vi.fn(async () => state.set(null)),
    setUser: (next: SessionUser | null) => state.set(next),
  };
  return mock;
}

export type AuthServiceMock = ReturnType<typeof createAuthServiceMock>;

export function provideAuthServiceMock(mock: AuthServiceMock) {
  return { provide: AuthService, useValue: mock };
}
