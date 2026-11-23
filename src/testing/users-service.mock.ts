import { signal } from '@angular/core';
import { vi } from 'vitest';
import type { UserProfile } from '../app/core/users/user-profile';
import { UsersService } from '../app/core/users/users.service';

/** UsersService without Firebase: a fixed list and spies. */
export function createUsersServiceMock(list: readonly UserProfile[] = [], setupPending = false) {
  const users = signal<readonly UserProfile[] | undefined>(list);
  return {
    users,
    watchAll: vi.fn(() => ({ users: users.asReadonly(), error: signal(false).asReadonly() })),
    create: vi.fn(async () => undefined),
    update: vi.fn(async () => undefined),
    sendPasswordSetup: vi.fn(async () => undefined),
    isSetupPending: vi.fn(async () => setupPending),
    createFirstAdmin: vi.fn(async () => undefined),
  };
}

export type UsersServiceMock = ReturnType<typeof createUsersServiceMock>;

export function provideUsersServiceMock(mock: UsersServiceMock) {
  return { provide: UsersService, useValue: mock };
}
