import { signal } from '@angular/core';
import { vi } from 'vitest';
import { type Client, emptyClient } from '../app/core/clients/client';
import { ClientsService } from '../app/core/clients/clients.service';

export function testClient(overrides: Partial<Client> = {}): Client {
  return { id: 'tree', ...emptyClient(), name: 'Tree Logistics', ...overrides };
}

/** ClientsService without Firebase: a fixed list and spies. */
export function createClientsServiceMock(list: readonly Client[] = []) {
  const clients = signal<readonly Client[] | undefined>(list);
  return {
    clients,
    watchAll: vi.fn(() => ({ clients: clients.asReadonly(), error: signal(false).asReadonly() })),
    get: vi.fn(async (id: string) => clients()?.find((c) => c.id === id) ?? null),
    nameTaken: vi.fn(async () => false),
    create: vi.fn(async () => 'new-id'),
    update: vi.fn(async () => undefined),
    setActive: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

export type ClientsServiceMock = ReturnType<typeof createClientsServiceMock>;

export function provideClientsServiceMock(mock: ClientsServiceMock) {
  return { provide: ClientsService, useValue: mock };
}
