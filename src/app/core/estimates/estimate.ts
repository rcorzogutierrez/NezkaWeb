import type { Timestamp } from 'firebase/firestore';
import { fold } from '../clients/client';
import type { Product } from '../products/product';

/** Life of a proforma, as in the desktop app (Borrador, Enviado, Aceptado, Rechazado). */
export const ESTIMATE_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

/**
 * One product on an estimate. The product's data is copied, so the proforma keeps what was
 * quoted even if the catalog changes later.
 */
export interface EstimateLine {
  readonly productId: string;
  readonly ref: string;
  readonly description: string;
  readonly upc: string;
  readonly size: string;
  readonly pack: string;
  readonly boxes: number;
  readonly pricePerBox: number;
}

/** What a person edits on an estimate. */
export interface EstimateData {
  readonly number: string;
  readonly clientId: string;
  /** ISO date, `yyyy-mm-dd`. */
  readonly date: string;
  readonly reference: string;
  readonly status: EstimateStatus;
  readonly notes: string;
  readonly lines: readonly EstimateLine[];
}

/** Document `estimates/{id}`: a proforma issued to a client. */
export interface Estimate extends EstimateData {
  readonly id: string;
  /** Copied from the client when saving, so lists and PDFs need no extra reads. */
  readonly clientName: string;
  readonly clientBranch: string;
  readonly totalBoxes: number;
  readonly total: number;
  readonly createdAt?: Timestamp;
  readonly updatedAt?: Timestamp;
}

export const ESTIMATES_COLLECTION = 'estimates';

/** Limits `firestore.rules` checks too. */
export const ESTIMATE_MAX_LENGTH = { number: 30, reference: 200, notes: 2000 } as const;
export const MAX_LINES = 300;
export const MAX_BOXES = 1_000_000;

const NUMBER_PREFIX = (year: number) => `PF-${year}-`;

/** Next number in the PF-<year>-NNNN series; the desktop app started after 1000. */
export function nextNumber(year: number, existing: readonly string[]): string {
  const prefix = NUMBER_PREFIX(year);
  const used = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => n.slice(prefix.length))
    .filter((n) => /^\d+$/.test(n))
    .map(Number);
  const next = Math.max(1000, ...used) + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

/** Today in the person's time zone, as `yyyy-mm-dd`. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** "28/10/2026" in Spanish, "10/28/2026" in English. */
export function displayDate(iso: string, lang: 'es' | 'en'): string {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-');
  return lang === 'es' ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
}

/** "October 28, 2026": the proforma is printed in English, like the desktop app's. */
export function longDate(iso: string): string {
  if (!isIsoDate(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function lineTotal(line: Pick<EstimateLine, 'boxes' | 'pricePerBox'>): number {
  return Math.round(line.boxes * line.pricePerBox * 100) / 100;
}

export function totals(lines: readonly Pick<EstimateLine, 'boxes' | 'pricePerBox'>[]) {
  const boxes = lines.reduce((sum, l) => sum + l.boxes, 0);
  const total = Math.round(lines.reduce((sum, l) => sum + lineTotal(l), 0) * 100) / 100;
  return { items: lines.length, boxes, total };
}

export function lineFromProduct(p: Product, boxes = 1): EstimateLine {
  return {
    productId: p.id,
    ref: p.ref,
    description: p.description,
    upc: p.upc,
    size: p.size,
    pack: p.pack,
    boxes,
    pricePerBox: p.pricePerBox,
  };
}

/** Adds a product, or more boxes to its line when it is already on the estimate. */
export function addProduct(
  lines: readonly EstimateLine[],
  product: Product,
  boxes = 1,
): EstimateLine[] {
  const index = lines.findIndex((l) => l.productId === product.id);
  if (index < 0) return [...lines, lineFromProduct(product, boxes)];
  return lines.map((l, i) => (i === index ? { ...l, boxes: l.boxes + boxes } : l));
}

/** A rejected estimate no longer counts as quoted, like in the desktop app. */
export function isActive(e: Pick<Estimate, 'status'>): boolean {
  return e.status !== 'rejected';
}

/** Draft or sent: still waiting for the client. */
export function isPending(e: Pick<Estimate, 'status'>): boolean {
  return e.status === 'draft' || e.status === 'sent';
}

function text(data: Record<string, unknown>, key: string): string {
  const v = data[key];
  return typeof v === 'string' ? v : '';
}

function num(data: Record<string, unknown>, key: string): number {
  const v = Number(data[key]);
  return Number.isFinite(v) ? v : 0;
}

export function toLine(data: Record<string, unknown>): EstimateLine {
  return {
    productId: text(data, 'productId'),
    ref: text(data, 'ref'),
    description: text(data, 'description'),
    upc: text(data, 'upc'),
    size: text(data, 'size'),
    pack: text(data, 'pack'),
    boxes: num(data, 'boxes'),
    pricePerBox: num(data, 'pricePerBox'),
  };
}

export function toEstimate(id: string, data: Record<string, unknown>): Estimate {
  const status = data['status'] as EstimateStatus;
  const lines = Array.isArray(data['lines'])
    ? (data['lines'] as Record<string, unknown>[]).map(toLine)
    : [];
  const sums = totals(lines);
  return {
    id,
    number: text(data, 'number'),
    clientId: text(data, 'clientId'),
    clientName: text(data, 'clientName'),
    clientBranch: text(data, 'clientBranch'),
    date: text(data, 'date'),
    reference: text(data, 'reference'),
    status: ESTIMATE_STATUSES.includes(status) ? status : 'draft',
    notes: text(data, 'notes'),
    lines,
    totalBoxes: sums.boxes,
    total: sums.total,
    createdAt: data['createdAt'] as Timestamp | undefined,
    updatedAt: data['updatedAt'] as Timestamp | undefined,
  };
}

/** Text trimmed, boxes whole, prices in cents: what gets stored. */
export function normalizeEstimate(data: EstimateData): EstimateData {
  return {
    number: data.number.trim(),
    clientId: data.clientId,
    date: data.date,
    reference: data.reference.trim(),
    status: data.status,
    notes: data.notes.trim(),
    lines: data.lines.map((l) => ({
      productId: l.productId,
      ref: l.ref,
      description: l.description,
      upc: l.upc,
      size: l.size,
      pack: l.pack,
      boxes: Math.round(l.boxes),
      pricePerBox: Math.round(l.pricePerBox * 100) / 100,
    })),
  };
}

/** Number, client, reference, or any product's description, ref or UPC. */
export function matchesEstimateSearch(e: Estimate, search: string): boolean {
  const words = fold(search).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(
    [
      e.number,
      e.clientName,
      e.clientBranch,
      e.reference,
      ...e.lines.flatMap((l) => [l.ref, l.description, l.upc]),
    ].join(' '),
  );
  return words.every((w) => haystack.includes(w));
}

/** Newest first: by date, then by number. */
export function compareEstimates(a: Estimate, b: Estimate): number {
  return b.date.localeCompare(a.date) || b.number.localeCompare(a.number);
}

/** `Proforma_PF-2026-1028_Tree Logistics.pdf`, like the desktop app. */
export function proformaFileName(e: Pick<Estimate, 'number' | 'clientName'>): string {
  const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').trim();
  return `Proforma_${safe(e.number)}_${safe(e.clientName) || 'client'}.pdf`;
}
