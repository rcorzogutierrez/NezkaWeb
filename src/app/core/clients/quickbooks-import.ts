/**
 * Reads the customer list exported from QuickBooks and turns it into clients. Port of
 * `nezka_invoice/quickbooks_import.py` from the desktop app, with the same rules.
 *
 * QuickBooks (Desktop and Online) exports customers as Excel (.xlsx / .xlsm), CSV or, in
 * Desktop, IIF (File > Utilities > Export > Lists to IIF). Column names differ between
 * versions, so headers are matched against known aliases instead of fixed positions.
 */
import { CLIENT_MAX_LENGTH, type ClientData, type ClientField, emptyClient, fold } from './client';

export const ACCEPTED_FILES = '.csv,.xlsx,.xlsm,.iif,.txt';

export type SkipReason = 'noName' | 'exists' | 'repeated';

/** One customer from the file, ready to be saved, or why it is skipped. */
export interface ImportRow {
  readonly client: ClientData;
  /** Line in the file, counting from 1. */
  readonly line: number;
  readonly skip: SkipReason | null;
}

export interface ImportPreview {
  readonly rows: readonly ImportRow[];
  /** "Customer:Job" rows: jobs of a customer in QuickBooks Desktop, not customers. */
  readonly jobsSkipped: number;
}

export type ImportErrorCode = 'noNameColumn' | 'oldExcel' | 'noIifCustomers' | 'unreadable';

export class ImportFileError extends Error {
  constructor(readonly code: ImportErrorCode) {
    super(code);
  }
}

/** Prefixes for what goes into the notes, in the language of the person importing. */
export interface NoteLabels {
  readonly otherEmails: string;
  readonly website: string;
  readonly invalidEmail: string;
  readonly otherPhone: string;
  readonly fax: string;
  readonly otherContact: string;
  readonly terms: string;
  readonly account: string;
  readonly shipTo: string;
}

// Normalized header -> field. Headers are lowercased and stripped of everything that is not
// a letter or digit ("Bill to 1" -> "billto1").
const ALIASES: Record<string, readonly string[]> = {
  name: [
    'customer',
    'customername',
    'name',
    'displayname',
    'customerfullname',
    'customerdisplayname',
    'fullname',
  ],
  company: ['company', 'companyname'],
  contactName: ['contact', 'primarycontact', 'cont1', 'contactname'],
  firstName: ['firstname'],
  lastName: ['lastname'],
  email: ['email', 'mainemail', 'emailaddress', 'primaryemail'],
  phone: ['phone', 'mainphone', 'phone1', 'phonenumber', 'workphone', 'primaryphone'],
  mobile: ['mobile', 'mobilephone', 'cell', 'cellphone'],
  altPhone: ['altphone', 'phone2', 'alternatephone', 'otherphone'],
  street: [
    'streetaddress',
    'billingstreet',
    'billingaddress',
    'billtostreet1',
    'billingaddressline1',
    'address',
  ],
  street2: ['billtostreet2', 'billingaddressline2'],
  city: ['city', 'billtocity', 'billingcity', 'billingaddresscity'],
  state: [
    'state',
    'billtostate',
    'billingstate',
    'billingaddressstate',
    'province',
    'stateprovince',
  ],
  zipCode: [
    'zip',
    'zipcode',
    'postalcode',
    'billtozip',
    'billingzip',
    'billingzipcode',
    'billingaddresspostalcode',
  ],
  country: ['country', 'billtocountry', 'billingcountry', 'billingaddresscountry'],
  taxId: ['taxid', 'resalenum', 'resalenumber', 'taxregistrationnumber', 'taxresaleno', 'ein'],
  fax: ['fax', 'faxnum'],
  secondaryContact: ['secondarycontact', 'altcontact', 'cont2'],
  terms: ['terms'],
  accountNo: ['accountno', 'accountnumber'],
  notes: ['note', 'notes', 'notepad'],
  status: ['activestatus', 'status', 'active'],
  hidden: ['hidden'],
};
const HEADER_FIELDS = new Map(
  Object.entries(ALIASES).flatMap(([field, aliases]) => aliases.map((a) => [a, field] as const)),
);
// Free-form address lines: "Bill to 1".."Bill to 5" (Desktop) and BADDR1..5 (IIF).
const ADDRESS_LINE_RE = /^(?:billto|baddr|billingaddress)([1-5])$/;
const SHIP_LINE_RE = /^(?:shipto|saddr)([1-5])$/;

// The "Bill to" lines are typed by hand, so the last line comes in many shapes:
// "Miami, FL 33142", "MIAMI., FL. 33142", "Coral Gables,FL 33146", "HIALEAH,FL.33016-6314".
const STATE = String.raw`(?<state>FLORIDA|FLA|FLO|[A-Za-z]{2})`;
const CITY_STATE_ZIP_RE = new RegExp(
  String.raw`^(?<city>.*?)[\s,.]*\b${STATE}(?![a-z])[\s,.]*(?<zip>\d{5}(?:-\d{4})?)(?!\d)\W?[a-z0-9]*$`,
  'i',
);
const CITY_STATE_RE = new RegExp(String.raw`^(?<city>[^\d,]+?)\s*,\s*${STATE}\.?$`, 'i');
const FLORIDA = new Set(['FLORIDA', 'FLA', 'FLO']);
const COUNTRIES = new Set([
  'usa',
  'us',
  'united states',
  'united states of america',
  'estados unidos',
]);
const ZIP_ONLY_RE = /^[\s,.]*(?:(?:FLORIDA|FLA|FLO|FL)\.?)?[\s,.]*\d{5}(?:-\d{4})?\W*$/i;
// Cities typed on the same line as the street ("2101 NW 15 AVE MIAMI, FL 33142").
const KNOWN_CITIES = [
  'north miami beach',
  'north miami',
  'miami beach',
  'miami gardens',
  'miami lakes',
  'miami',
  'hialeah gardens',
  'hialeah',
  'doral',
  'medley',
  'miramar',
  'hollywood',
  'homestead',
  'davie',
  'opa locka',
  'opa-locka',
  'sunrise',
  'pompano beach',
  'fort lauderdale',
  'ft lauderdale',
  'ft. lauderdale',
  'fort pierce',
  'fort. pierce',
  'boca raton',
  'coral gables',
  'kendall',
  'sweetwater',
];
const SAME_AS_BILLING = new Set(['same', 'same as above', 'igual']);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeHeader(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Reading files ----------------------------------------------------------------------------

function decode(data: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(data);
  }
}

/** CSV with quoted fields; the delimiter (comma, semicolon or tab) is guessed from the top. */
export function readCsv(text: string): string[][] {
  const sample = text.slice(0, 4096);
  const delimiter = [',', ';', '\t'].reduce((best, d) =>
    sample.split(d).length > sample.split(best).length ? d : best,
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Keeps only the customer section (!CUST header and CUST rows) of an IIF file. */
export function readIif(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('\t');
    const tag = cells[0].trim().toUpperCase();
    if (tag === '!CUST') rows.push(cells.slice(1));
    else if (tag === 'CUST' && rows.length)
      rows.push(cells.slice(1).map((c) => c.replace(/^"|"$/g, '')));
  }
  if (!rows.length) throw new ImportFileError('noIifCustomers');
  return rows;
}

async function readExcel(file: Blob): Promise<string[][]> {
  const { default: readXlsxFile } = await import('read-excel-file/browser');
  let sheets;
  try {
    sheets = await readXlsxFile(file);
  } catch {
    throw new ImportFileError('unreadable');
  }
  const tables = sheets.map((s) =>
    s.data.map((row) => row.map((v) => (v === null || v === undefined ? '' : String(v)))),
  );
  // QuickBooks' workbook can start with an "Export Tips" sheet: use the first with a header.
  return tables.find((t) => findHeader(t) !== null) ?? tables[0] ?? [];
}

export async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) return readExcel(file);
  if (name.endsWith('.xls')) throw new ImportFileError('oldExcel');
  const text = decode(new Uint8Array(await file.arrayBuffer()));
  if (name.endsWith('.iif') || /(^|\n)\s*!CUST/i.test(text)) return readIif(text);
  return readCsv(text);
}

// Mapping ----------------------------------------------------------------------------------

/**
 * Index of the header row and a map column -> field. QuickBooks reports put a title and
 * blank lines above the header, so the first row with a customer-name column wins.
 */
function findHeader(
  rows: readonly string[][],
): { index: number; mapping: Map<number, string> } | null {
  for (let index = 0; index < Math.min(rows.length, 30); index++) {
    const mapping = new Map<number, string>();
    rows[index].forEach((header, column) => {
      const key = normalizeHeader(header);
      const known = HEADER_FIELDS.get(key);
      let match: RegExpMatchArray | null;
      if (known) {
        if (!mapping.has(column)) mapping.set(column, known);
      } else if ((match = key.match(ADDRESS_LINE_RE))) mapping.set(column, `line${match[1]}`);
      else if ((match = key.match(SHIP_LINE_RE))) mapping.set(column, `ship${match[1]}`);
    });
    const fields = [...mapping.values()];
    if (fields.includes('name') || fields.includes('company')) return { index, mapping };
  }
  return null;
}

function clean(value: unknown): string {
  const text = String(value ?? '')
    .trim()
    .replace(/[ \t]{2,}/g, ' ');
  return ['nan', 'none'].includes(text.toLowerCase()) ? '' : text;
}

const titleIfUpper = (text: string) =>
  text === text.toUpperCase() && text !== text.toLowerCase()
    ? text
        .toLowerCase()
        .replace(/(^|[^a-z'])([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase())
    : text;

const stripChars = (text: string, chars: string) => {
  let start = 0;
  let end = text.length;
  while (start < end && chars.includes(text[start])) start++;
  while (end > start && chars.includes(text[end - 1])) end--;
  return text.slice(start, end);
};

/** Splits QuickBooks' free-form "Bill to" lines into address, city, state, zip and country. */
export function splitAddressLines(
  rawLines: readonly string[],
  skip: ReadonlySet<string>,
): Partial<Record<'address' | 'city' | 'state' | 'zipCode' | 'country', string>> {
  // The first line is usually the customer's name and the second the contact: drop those.
  let lines = rawLines.filter((l) => l && !skip.has(normalizeHeader(l)));
  // A ZIP typed on its own line belongs to the line above ("MIAMI FL," / "33142").
  const merged: string[] = [];
  for (const line of lines) {
    if (merged.length && ZIP_ONLY_RE.test(line) && !CITY_STATE_ZIP_RE.test(merged.at(-1)!)) {
      merged[merged.length - 1] = `${merged.at(-1)} ${line.trim()}`;
    } else merged.push(line);
  }
  lines = merged;
  const result: Partial<Record<'address' | 'city' | 'state' | 'zipCode' | 'country', string>> = {};
  for (let index = lines.length - 1; index >= 0; index--) {
    const match = lines[index].match(CITY_STATE_ZIP_RE) ?? lines[index].match(CITY_STATE_RE);
    if (!match?.groups) continue;
    let city = stripChars(match.groups['city'], ' ,.');
    if (!city && index > 0 && CITY_STATE_ZIP_RE.test(lines[index - 1])) continue; // repeated "FL 33178"
    let streetTail: string | null = null;
    if (/\d/.test(city)) {
      // The street is on the same line: "2101 NW 15 AVE MIAMI, FL 33142".
      streetTail = city;
      city = '';
      for (const known of KNOWN_CITIES) {
        if (streetTail.toLowerCase().endsWith(' ' + known)) {
          city = streetTail.slice(-known.length);
          streetTail = stripChars(streetTail.slice(0, -known.length), ' ,.');
          break;
        }
      }
    }
    const state = match.groups['state'].toUpperCase();
    result.city = titleIfUpper(city);
    result.state = FLORIDA.has(state) ? 'FL' : state;
    if (match.groups['zip']) result.zipCode = match.groups['zip'];
    const extra: string[] = [];
    for (const line of lines.slice(index + 1)) {
      const cleaned = stripChars(line, " .`'").toLowerCase();
      if (COUNTRIES.has(cleaned.replace(/\./g, ''))) result.country = 'USA';
      else if (cleaned !== 'florida' && cleaned !== 'fl' && !CITY_STATE_ZIP_RE.test(line))
        extra.push(line);
    }
    lines = [...lines.slice(0, index), ...(streetTail ? [streetTail] : []), ...extra];
    break;
  }
  if (lines.length) result.address = lines.join(', ');
  return result;
}

/** First valid email and the rest. QuickBooks allows several separated by , or ;. */
function firstEmail(text: string): [string, string] {
  const parts = text.split(/[;,\s]+/).filter(Boolean);
  const valid = parts.find((p) => EMAIL_RE.test(p));
  if (!valid) return ['', text];
  return [valid, parts.filter((p) => p !== valid).join(', ')];
}

export function rowToClient(
  values: Readonly<Record<string, string>>,
  labels: NoteLabels,
): ClientData {
  const v = (k: string) => values[k] ?? '';
  const company = v('company');
  const name = v('name') || company;
  const contact = v('contactName') || [v('firstName'), v('lastName')].filter(Boolean).join(' ');
  const notes = [v('notes')];

  const [email, extraEmail] = firstEmail(v('email'));
  if (extraEmail) {
    if (email) notes.push(`${labels.otherEmails}: ${extraEmail}`);
    else if (!extraEmail.includes('@')) notes.push(`${labels.website}: ${extraEmail}`);
    else notes.push(`${labels.invalidEmail}: ${extraEmail}`);
  }
  const mobile = v('mobile') || v('altPhone');
  if (v('mobile') && v('altPhone')) notes.push(`${labels.otherPhone}: ${v('altPhone')}`);
  if (v('fax')) notes.push(`${labels.fax}: ${v('fax')}`);
  if (v('secondaryContact')) notes.push(`${labels.otherContact}: ${v('secondaryContact')}`);
  if (v('terms')) notes.push(`${labels.terms}: ${v('terms')}`);
  if (v('accountNo')) notes.push(`${labels.account}: ${v('accountNo')}`);
  const own = new Set([normalizeHeader(name), normalizeHeader(company)]);
  const ship = [1, 2, 3, 4, 5]
    .map((i) => v(`ship${i}`))
    .filter((l) => l && !own.has(normalizeHeader(l)));
  const isSame = (l: string) => SAME_AS_BILLING.has(stripChars(l, " .`'").toLowerCase());
  if (ship.length && !ship.every(isSame)) {
    notes.push(`${labels.shipTo}: ${ship.filter((l) => !isSame(l)).join(', ')}`);
  }

  let address: ReturnType<typeof splitAddressLines> = {};
  const lines = [1, 2, 3, 4, 5].map((i) => v(`line${i}`));
  if (lines.some(Boolean)) {
    const skip = new Set([name, company, contact].map(normalizeHeader).filter(Boolean));
    address = splitAddressLines(lines, skip);
  }
  const street = [v('street'), v('street2')].filter(Boolean).join(', ');
  if (street) address.address = street;
  for (const key of ['city', 'state', 'zipCode', 'country'] as const) {
    if (v(key)) address[key] = v(key);
  }

  const status = v('status').toLowerCase();
  const active = !(
    status.startsWith('inactiv') ||
    ['no', 'false', '0'].includes(status) ||
    v('hidden').toUpperCase() === 'Y'
  );

  const client: ClientData = {
    ...emptyClient(),
    name,
    branch: company && company.toLowerCase() !== name.toLowerCase() ? company : '',
    contactName: contact,
    email,
    phone: v('phone'),
    mobile,
    address: address.address ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    zipCode: address.zipCode ?? '',
    country: address.country ?? '',
    taxId: v('taxId'),
    notes: notes.filter(Boolean).join('\n'),
    active,
  };
  // Long values would be rejected by the database rules: keep what fits.
  for (const f of Object.keys(CLIENT_MAX_LENGTH) as ClientField[]) {
    client[f] = client[f].trim().slice(0, CLIENT_MAX_LENGTH[f]);
  }
  return client;
}

/** Turns raw rows into a preview, marking duplicates and QuickBooks jobs. */
export function parseRows(
  rows: readonly string[][],
  existingNames: Iterable<string>,
  labels: NoteLabels,
): ImportPreview {
  const header = findHeader(rows);
  if (!header) throw new ImportFileError('noNameColumn');
  const existing = new Set([...existingNames].map(fold));
  const seen = new Set<string>();
  const result: ImportRow[] = [];
  let jobsSkipped = 0;
  rows.slice(header.index + 1).forEach((row, offset) => {
    const values: Record<string, string> = {};
    for (const [column, field] of header.mapping) {
      const text = column < row.length ? clean(row[column]) : '';
      if (text && !(field in values)) values[field] = text;
    }
    if (!Object.keys(values).length) return;
    const name = values['name'] ?? '';
    // "Customer:Job" rows are jobs of a customer in QuickBooks Desktop.
    if (name.includes(':')) {
      jobsSkipped++;
      return;
    }
    // Report exports end with a "TOTAL" row; "TOTAL GREEN TROPICALS" stays.
    if (name.toLowerCase() === 'total') return;
    const client = rowToClient(values, labels);
    const key = fold(client.name);
    const skip: SkipReason | null = !client.name
      ? 'noName'
      : existing.has(key)
        ? 'exists'
        : seen.has(key)
          ? 'repeated'
          : null;
    seen.add(key);
    result.push({ client, line: header.index + offset + 2, skip });
  });
  return { rows: result, jobsSkipped };
}

export async function previewFile(
  file: File,
  existingNames: Iterable<string>,
  labels: NoteLabels,
): Promise<ImportPreview> {
  return parseRows(await readRows(file), existingNames, labels);
}
