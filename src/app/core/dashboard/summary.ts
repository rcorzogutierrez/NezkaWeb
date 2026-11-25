import type { Client } from '../clients/client';
import { type Estimate, isActive } from '../estimates/estimate';
import { type Product, missingInfo } from '../products/product';

/** One client's share of what was quoted in the year. */
export interface TopClient {
  readonly clientId: string;
  readonly name: string;
  readonly total: number;
  readonly estimates: number;
  /** Total relative to the first client in the list, 0 to 1, for the bar. */
  readonly share: number;
}

/** What the home page shows, worked out from the live lists. */
export interface HomeSummary {
  readonly clients: { readonly active: number; readonly total: number };
  readonly products: {
    readonly active: number;
    readonly total: number;
    /** Active products lacking a UPC, photo, price… (see `missingInfo`). */
    readonly missingData: number;
  };
  readonly estimates: {
    readonly drafts: number;
    readonly sent: number;
    /** Estimates of the year that are not rejected. */
    readonly year: number;
    readonly quotedYear: number;
    readonly acceptedYear: number;
  };
  readonly recent: readonly Estimate[];
  readonly topClients: readonly TopClient[];
  readonly newProducts: readonly Product[];
}

const RECENT = 6;
const TOP = 5;
const NEW_PRODUCTS = 4;

const cents = (n: number) => Math.round(n * 100) / 100;

function createdMillis(p: Product): number {
  const at = p.createdAt as { toMillis?: () => number } | undefined;
  return typeof at?.toMillis === 'function' ? at.toMillis() : 0;
}

/**
 * Totals and short lists for the home page. `estimates` come newest first, as
 * `EstimatesService.watchAll` gives them; `year` is the current year.
 */
export function summarize(
  clients: readonly Client[],
  products: readonly Product[],
  estimates: readonly Estimate[],
  year: number,
): HomeSummary {
  const ofYear = estimates.filter((e) => e.date.startsWith(`${year}-`) && isActive(e));

  const byClient = new Map<string, { name: string; total: number; estimates: number }>();
  for (const e of ofYear) {
    const key = e.clientId || e.clientName;
    const entry = byClient.get(key) ?? { name: e.clientName, total: 0, estimates: 0 };
    entry.total += e.total;
    entry.estimates += 1;
    byClient.set(key, entry);
  }
  const ranked = [...byClient.entries()]
    .map(([clientId, c]) => ({ clientId, ...c, total: cents(c.total) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, TOP);
  const top = ranked[0]?.total ?? 0;

  const activeProducts = products.filter((p) => p.active);

  return {
    clients: { active: clients.filter((c) => c.active).length, total: clients.length },
    products: {
      active: activeProducts.length,
      total: products.length,
      missingData: activeProducts.filter((p) => missingInfo(p).length > 0).length,
    },
    estimates: {
      drafts: estimates.filter((e) => e.status === 'draft').length,
      sent: estimates.filter((e) => e.status === 'sent').length,
      year: ofYear.length,
      quotedYear: cents(ofYear.reduce((sum, e) => sum + e.total, 0)),
      acceptedYear: cents(
        ofYear.filter((e) => e.status === 'accepted').reduce((sum, e) => sum + e.total, 0),
      ),
    },
    recent: estimates.slice(0, RECENT),
    topClients: ranked.map((c) => ({ ...c, share: top ? c.total / top : 0 })),
    newProducts: [...products]
      .filter((p) => p.active)
      .sort((a, b) => createdMillis(b) - createdMillis(a))
      .slice(0, NEW_PRODUCTS),
  };
}

export type DayPart = 'morning' | 'afternoon' | 'evening';

/** Morning until noon, afternoon until 7 PM, evening after. */
export function dayPart(hour: number): DayPart {
  if (hour < 12) return 'morning';
  return hour < 19 ? 'afternoon' : 'evening';
}

/** "Rafael" from "Rafael Corzo", or the part of the email before the @. */
export function firstName(name: string, email: string): string {
  return name.trim().split(/\s+/)[0] || email.split('@')[0] || '';
}
