import { CLIENT_FIELDS, type ClientData, type ClientField, fold } from '../clients/client';
import {
  PRODUCT_TEXT_FIELDS,
  type ProductData,
  type ProductTextField,
  normalizeUpc,
} from '../products/product';

/** Where sql.js finds its WebAssembly file (copied there by angular.json). */
export const SQL_WASM_URL = '/vendor/sql.js/sql-wasm-browser.wasm';

/** Where the desktop app keeps its database on Windows. */
export const DESKTOP_DB_FOLDER = String.raw`%APPDATA%\Elpidio Jr. Produce Co\Nezka Invoice`;

export type DesktopDbErrorCode = 'notSqlite' | 'notDesktopDb' | 'unreadable';

export class DesktopDbError extends Error {
  constructor(readonly code: DesktopDbErrorCode) {
    super(code);
  }
}

export interface DesktopProduct {
  readonly data: ProductData;
  /** The photo as the desktop app stored it (PNG), or null. */
  readonly image: Uint8Array<ArrayBuffer> | null;
}

export interface DesktopData {
  readonly products: readonly DesktopProduct[];
  readonly clients: readonly ClientData[];
}

/** Desktop column for each web field (the desktop uses snake_case). */
const CLIENT_COLUMNS: Record<ClientField, string> = {
  name: 'name',
  branch: 'branch',
  contactName: 'contact_name',
  taxId: 'tax_id',
  email: 'email',
  phone: 'phone',
  mobile: 'mobile',
  address: 'address',
  city: 'city',
  state: 'state',
  zipCode: 'zip_code',
  country: 'country',
  notes: 'notes',
};

const PRODUCT_COLUMNS: Record<ProductTextField, string> = {
  ref: 'ref',
  description: 'description',
  upc: 'upc',
  size: 'size',
  pack: 'pack',
  qtyPerPallet: 'qty_per_pallet',
  notes: 'notes',
};

type Row = Record<string, unknown>;

const text = (value: unknown) =>
  value === null || value === undefined ? '' : String(value).trim();

export function toClientData(row: Row): ClientData {
  const values = Object.fromEntries(
    CLIENT_FIELDS.map((f) => [f, text(row[CLIENT_COLUMNS[f]])]),
  ) as Record<ClientField, string>;
  return { ...values, active: Number(row['active'] ?? 1) !== 0 };
}

export function toDesktopProduct(row: Row): DesktopProduct {
  const values = Object.fromEntries(
    PRODUCT_TEXT_FIELDS.map((f) => [f, text(row[PRODUCT_COLUMNS[f]])]),
  ) as Record<ProductTextField, string>;
  const price = Number(row['price_per_box']);
  const image = row['image'];
  return {
    data: {
      ...values,
      pricePerBox: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : 0,
      active: Number(row['active'] ?? 1) !== 0,
    },
    image: image instanceof Uint8Array && image.length ? new Uint8Array(image) : null,
  };
}

const SQLITE_HEADER = 'SQLite format 3\0';

/** Opens the desktop app's `nezka.db` in the browser (sql.js, loaded only here). */
export async function readDesktopDb(file: Blob, wasmUrl = SQL_WASM_URL): Promise<DesktopData> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder().decode(bytes.subarray(0, SQLITE_HEADER.length));
  if (header !== SQLITE_HEADER) throw new DesktopDbError('notSqlite');

  const { default: initSqlJs } = await import('sql.js');
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  let db;
  try {
    db = new SQL.Database(bytes);
  } catch {
    throw new DesktopDbError('unreadable');
  }
  try {
    const tables = new Set(
      (db.exec("SELECT name FROM sqlite_master WHERE type = 'table'")[0]?.values ?? []).map((v) =>
        String(v[0]),
      ),
    );
    if (!tables.has('products') || !tables.has('clients')) {
      throw new DesktopDbError('notDesktopDb');
    }
    const rows = (sql: string): Row[] => {
      const statement = db.prepare(sql);
      const out: Row[] = [];
      while (statement.step()) out.push(statement.getAsObject() as Row);
      statement.free();
      return out;
    };
    return {
      products: rows('SELECT * FROM products ORDER BY id').map(toDesktopProduct),
      clients: rows('SELECT * FROM clients ORDER BY id').map(toClientData),
    };
  } catch (e) {
    throw e instanceof DesktopDbError ? e : new DesktopDbError('unreadable');
  } finally {
    db.close();
  }
}

/**
 * Already in the web app: same description and the same UPC or reference. The description is
 * always part of it, because the desktop catalog has different products sharing a UPC.
 */
export function productKey(p: Pick<ProductData, 'ref' | 'upc' | 'description'>): string[] {
  const description = fold(p.description);
  const keys = [`ref:${fold(p.ref)}|${description}`];
  const upc = normalizeUpc(p.upc);
  if (upc) keys.push(`upc:${upc}|${description}`);
  return keys;
}

/** Already in the web app: same name and branch, ignoring case and accents. */
export function clientKey(c: Pick<ClientData, 'name' | 'branch'>): string {
  return `${fold(c.name)}|${fold(c.branch)}`;
}

export interface ImportRow<T> {
  readonly item: T;
  readonly exists: boolean;
}

export interface ImportPlan {
  readonly products: readonly ImportRow<DesktopProduct>[];
  readonly clients: readonly ImportRow<ClientData>[];
}

/** Marks what is already in the web app (and repeats inside the file) so it is not added twice. */
export function planImport(
  data: DesktopData,
  existingProducts: readonly Pick<ProductData, 'ref' | 'upc' | 'description'>[],
  existingClients: readonly Pick<ClientData, 'name' | 'branch'>[],
): ImportPlan {
  const productKeys = new Set(existingProducts.flatMap(productKey));
  const products = data.products
    .filter((p) => p.data.description)
    .map((p) => {
      const keys = productKey(p.data);
      const exists = keys.some((k) => productKeys.has(k));
      keys.forEach((k) => productKeys.add(k));
      return { item: p, exists };
    });
  const clientKeys = new Set(existingClients.map(clientKey));
  const clients = data.clients
    .filter((c) => c.name)
    .map((c) => {
      const key = clientKey(c);
      const exists = clientKeys.has(key);
      clientKeys.add(key);
      return { item: c, exists };
    });
  return { products, clients };
}
