import type { Timestamp } from 'firebase/firestore';

/** The fields a person edits, as in the desktop app's client form. */
export const CLIENT_FIELDS = [
  'name',
  'branch',
  'contactName',
  'taxId',
  'email',
  'phone',
  'mobile',
  'address',
  'city',
  'state',
  'zipCode',
  'country',
  'notes',
] as const;

export type ClientField = (typeof CLIENT_FIELDS)[number];
export type ClientData = Record<ClientField, string> & { active: boolean };

/** Document `clients/{id}`: a customer that proformas and invoices are issued to. */
export interface Client extends Readonly<ClientData> {
  readonly id: string;
  readonly createdAt?: Timestamp;
  readonly updatedAt?: Timestamp;
}

export const CLIENTS_COLLECTION = 'clients';

/** Longest value accepted per field; `firestore.rules` checks the same limits. */
export const CLIENT_MAX_LENGTH: Record<ClientField, number> = {
  name: 200,
  branch: 200,
  contactName: 200,
  taxId: 50,
  email: 200,
  phone: 50,
  mobile: 50,
  address: 300,
  city: 100,
  state: 100,
  zipCode: 20,
  country: 100,
  notes: 2000,
};

export function emptyClient(): ClientData {
  const data = Object.fromEntries(CLIENT_FIELDS.map((f) => [f, ''])) as Record<ClientField, string>;
  return { ...data, active: true };
}

export function toClient(id: string, data: Record<string, unknown>): Client {
  const values = Object.fromEntries(
    CLIENT_FIELDS.map((f) => [f, typeof data[f] === 'string' ? data[f] : '']),
  ) as Record<ClientField, string>;
  return {
    id,
    ...values,
    active: data['active'] !== false,
    createdAt: data['createdAt'] as Timestamp | undefined,
    updatedAt: data['updatedAt'] as Timestamp | undefined,
  };
}

/** Text values trimmed; what gets stored. */
export function normalizeClient(data: ClientData): ClientData {
  const values = Object.fromEntries(CLIENT_FIELDS.map((f) => [f, data[f].trim()])) as Record<
    ClientField,
    string
  >;
  return { ...values, email: values.email.toLowerCase(), active: data.active };
}

/** "Miami, FL 33142", like the desktop app's location column. */
export function clientLocation(c: Pick<ClientData, 'city' | 'state' | 'zipCode'>): string {
  const place = [c.city, c.state].filter(Boolean).join(', ');
  return [place, c.zipCode].filter(Boolean).join(' ');
}

/** Case- and accent-insensitive text used by search and duplicate checks. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** True when the client matches every word of the search. */
export function matchesSearch(c: Client, search: string): boolean {
  const words = fold(search).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(
    [
      c.name,
      c.branch,
      c.contactName,
      c.email,
      c.phone,
      c.mobile,
      c.city,
      c.state,
      c.zipCode,
      c.taxId,
    ].join(' '),
  );
  return words.every((w) => haystack.includes(w));
}
