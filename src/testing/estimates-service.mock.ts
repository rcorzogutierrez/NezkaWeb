import { signal } from '@angular/core';
import { vi } from 'vitest';
import type { Client } from '../app/core/clients/client';
import {
  type Estimate,
  type EstimateData,
  nextNumber,
  totals,
} from '../app/core/estimates/estimate';
import { EstimatesService } from '../app/core/estimates/estimates.service';

export function testEstimate(overrides: Partial<Estimate> = {}): Estimate {
  const lines = overrides.lines ?? [
    {
      productId: 'mango',
      ref: '12',
      description: 'Mango Pulp',
      upc: '612789567096',
      size: '14 OZ',
      pack: '24',
      boxes: 10,
      pricePerBox: 24,
    },
  ];
  const sums = totals(lines);
  return {
    id: 'e1',
    number: 'PF-2026-1028',
    clientId: 'tree',
    clientName: 'Tree Logistics',
    clientBranch: '',
    date: '2026-10-28',
    reference: 'Quote request',
    status: 'sent',
    notes: '',
    totalBoxes: sums.boxes,
    total: sums.total,
    ...overrides,
    lines,
  };
}

/** EstimatesService without Firebase: a fixed list and spies. */
export function createEstimatesServiceMock(list: readonly Estimate[] = []) {
  const estimates = signal<readonly Estimate[] | undefined>(list);
  return {
    estimates,
    watchAll: vi.fn(() => ({
      estimates: estimates.asReadonly(),
      error: signal(false).asReadonly(),
    })),
    get: vi.fn(async (id: string) => estimates()?.find((e) => e.id === id) ?? null),
    nextNumber: vi.fn(async (year: number) =>
      nextNumber(
        year,
        (estimates() ?? []).map((e) => e.number),
      ),
    ),
    numberTaken: vi.fn(async () => false),
    save: vi.fn(
      async (...args: [string | undefined, EstimateData, Pick<Client, 'name' | 'branch'>]) =>
        args[0] ?? 'new-id',
    ),
    remove: vi.fn(async () => undefined),
  };
}

export type EstimatesServiceMock = ReturnType<typeof createEstimatesServiceMock>;

export function provideEstimatesServiceMock(mock: EstimatesServiceMock) {
  return { provide: EstimatesService, useValue: mock };
}
