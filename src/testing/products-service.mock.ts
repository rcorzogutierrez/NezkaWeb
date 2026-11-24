import { signal } from '@angular/core';
import { vi } from 'vitest';
import { type Product, type ProductData, emptyProduct } from '../app/core/products/product';
import { type PhotoChange, ProductsService } from '../app/core/products/products.service';

export function testProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'mango',
    ...emptyProduct(),
    ref: '12',
    description: 'Mango Pulp',
    photoPath: '',
    photoUrl: '',
    photoThumb: '',
    ...overrides,
  };
}

/** ProductsService without Firebase: a fixed list and spies. */
export function createProductsServiceMock(list: readonly Product[] = []) {
  const products = signal<readonly Product[] | undefined>(list);
  return {
    products,
    watchAll: vi.fn(() => ({ products: products.asReadonly(), error: signal(false).asReadonly() })),
    get: vi.fn(async (id: string) => products()?.find((p) => p.id === id) ?? null),
    duplicates: vi.fn(async () => ({ ref: null as Product | null, upc: null as Product | null })),
    save: vi.fn(
      async (...args: [string | undefined, ProductData, PhotoChange, Product?]) =>
        args[0] ?? 'new-id',
    ),
    remove: vi.fn(async () => undefined),
  };
}

export type ProductsServiceMock = ReturnType<typeof createProductsServiceMock>;

export function provideProductsServiceMock(mock: ProductsServiceMock) {
  return { provide: ProductsService, useValue: mock };
}
