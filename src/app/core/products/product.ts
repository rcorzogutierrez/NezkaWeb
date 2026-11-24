import type { Timestamp } from 'firebase/firestore';
import { fold } from '../clients/client';

/** Text fields of a product, as in the desktop app's product form. */
export const PRODUCT_TEXT_FIELDS = [
  'ref',
  'description',
  'upc',
  'size',
  'pack',
  'qtyPerPallet',
  'notes',
] as const;

export type ProductTextField = (typeof PRODUCT_TEXT_FIELDS)[number];

export type ProductData = Record<ProductTextField, string> & {
  pricePerBox: number;
  active: boolean;
};

/** Where the photo lives in Storage and the URL to show it. Empty strings when there is none. */
export interface ProductPhoto {
  readonly photoPath: string;
  readonly photoUrl: string;
}

/** Document `products/{id}`: an item of the catalog that can be quoted. */
export interface Product extends Readonly<ProductData>, ProductPhoto {
  readonly id: string;
  readonly createdAt?: Timestamp;
  readonly updatedAt?: Timestamp;
}

export const PRODUCTS_COLLECTION = 'products';

/** Longest value per field; `firestore.rules` checks the same limits. */
export const PRODUCT_MAX_LENGTH: Record<ProductTextField, number> = {
  ref: 20,
  description: 200,
  upc: 40,
  size: 60,
  pack: 40,
  qtyPerPallet: 40,
  notes: 2000,
};

export const MAX_PRICE = 1_000_000;

export function emptyProduct(): ProductData {
  const text = Object.fromEntries(PRODUCT_TEXT_FIELDS.map((f) => [f, ''])) as Record<
    ProductTextField,
    string
  >;
  return { ...text, pricePerBox: 0, active: true };
}

export function toProduct(id: string, data: Record<string, unknown>): Product {
  const text = Object.fromEntries(
    PRODUCT_TEXT_FIELDS.map((f) => [f, typeof data[f] === 'string' ? data[f] : '']),
  ) as Record<ProductTextField, string>;
  const price = Number(data['pricePerBox']);
  return {
    id,
    ...text,
    pricePerBox: Number.isFinite(price) ? price : 0,
    active: data['active'] !== false,
    photoPath: typeof data['photoPath'] === 'string' ? data['photoPath'] : '',
    photoUrl: typeof data['photoUrl'] === 'string' ? data['photoUrl'] : '',
    createdAt: data['createdAt'] as Timestamp | undefined,
    updatedAt: data['updatedAt'] as Timestamp | undefined,
  };
}

/** Text trimmed and the price rounded to cents: what gets stored. */
export function normalizeProduct(data: ProductData): ProductData {
  const text = Object.fromEntries(PRODUCT_TEXT_FIELDS.map((f) => [f, data[f].trim()])) as Record<
    ProductTextField,
    string
  >;
  return { ...text, pricePerBox: Math.round(data.pricePerBox * 100) / 100, active: data.active };
}

/** UPC as compared for duplicates: "0 12345-67890 5" equals "012345678905". */
export function normalizeUpc(upc: string): string {
  return upc.replace(/[\s-]/g, '');
}

/** Numeric references first, in numeric order (2 before 10), like the desktop app. */
export function compareRefs(a: Pick<Product, 'ref' | 'description'>, b: typeof a): number {
  const na = /^\d+$/.test(a.ref) ? Number(a.ref) : null;
  const nb = /^\d+$/.test(b.ref) ? Number(b.ref) : null;
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;
  return a.ref.localeCompare(b.ref) || fold(a.description).localeCompare(fold(b.description));
}

/** What still has to be asked for before the product is complete. */
export type MissingInfo = 'upc' | 'upcToConfirm' | 'photo' | 'price' | 'size' | 'pack' | 'pallet';
export const MISSING_INFO: readonly MissingInfo[] = [
  'upc',
  'upcToConfirm',
  'photo',
  'price',
  'size',
  'pack',
  'pallet',
];

export function missingInfo(p: Product): MissingInfo[] {
  const missing: MissingInfo[] = [];
  if (!p.upc.trim()) missing.push('upc');
  if (!p.size.trim()) missing.push('size');
  if (!p.pack.trim()) missing.push('pack');
  if (!p.qtyPerPallet.trim()) missing.push('pallet');
  if (p.upc.trim() && p.notes.toUpperCase().includes('UPC POR CONFIRMAR'))
    missing.push('upcToConfirm');
  if (!p.pricePerBox) missing.push('price');
  if (!p.photoUrl) missing.push('photo');
  return missing;
}

export function matchesProductSearch(p: Product, search: string): boolean {
  const words = fold(search).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(
    [p.ref, p.description, p.upc, normalizeUpc(p.upc), p.size, p.notes].join(' '),
  );
  return words.every((w) => haystack.includes(w));
}

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
export function formatMoney(value: number): string {
  return money.format(value);
}

/**
 * Price typed in the form: "24", "24.5", "$1,234.50". Empty means 0. Returns null when it is
 * not a price.
 */
export function parsePrice(text: string): number | null {
  const clean = text
    .trim()
    .replace(/^\$\s*/, '')
    .replace(/,(?=\d{3}(\D|$))/g, '');
  if (!clean) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const value = Number(clean);
  return value < MAX_PRICE ? value : null;
}

/** The price as it is shown in the form field: "24.00", or empty for 0. */
export function priceText(value: number): string {
  return value ? value.toFixed(2) : '';
}
