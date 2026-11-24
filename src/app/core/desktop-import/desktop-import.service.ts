import { Service, inject } from '@angular/core';
import { type Client, type ClientData } from '../clients/client';
import { ClientsService } from '../clients/clients.service';
import type { EstimateLine } from '../estimates/estimate';
import { EstimatesService } from '../estimates/estimates.service';
import { preparePhoto } from '../products/photo';
import { type PhotoChange, ProductsService } from '../products/products.service';
import { type DesktopEstimate, type DesktopProduct, clientKey, productKey } from './desktop-db';

export interface ImportProgress {
  readonly done: number;
  readonly total: number;
}

/** A product (by description) or estimate (by number) that could not be saved, and why. */
export interface ImportFailure {
  readonly name: string;
  /** The Firebase error code (`storage/unauthorized`, `permission-denied`…) or the message. */
  readonly reason: string;
}

export interface ImportResult {
  readonly products: number;
  readonly clients: number;
  readonly estimates: number;
  readonly failed: readonly ImportFailure[];
}

/** What went wrong, as short as it can be said: the Firebase code when there is one. */
export function failureReason(e: unknown): string {
  const { code, message } = (e ?? {}) as { code?: unknown; message?: unknown };
  if (typeof code === 'string' && code) return code;
  if (typeof message === 'string' && message) return message;
  return String(e);
}

/** Products go up a few at a time: each one is a photo upload plus a write. */
const PARALLEL_UPLOADS = 4;

/** Writes what was read from the desktop database into Firestore and Storage. */
@Service()
export class DesktopImportService {
  private readonly products = inject(ProductsService);
  private readonly clients = inject(ClientsService);
  private readonly estimates = inject(EstimatesService);

  async run(
    products: readonly DesktopProduct[],
    clients: readonly ClientData[],
    onProgress: (p: ImportProgress) => void = () => undefined,
    estimates: readonly DesktopEstimate[] = [],
  ): Promise<ImportResult> {
    const total = products.length + (clients.length ? 1 : 0) + estimates.length;
    let done = 0;
    const step = () => onProgress({ done: ++done, total });
    onProgress({ done, total });

    if (clients.length) {
      await this.clients.createMany(clients);
      step();
    }

    const failed: ImportFailure[] = [];
    let saved = 0;
    const queue = [...products];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        try {
          await this.products.save(undefined, next.data, await this.photo(next));
          saved++;
        } catch (e) {
          failed.push({ name: next.data.description, reason: failureReason(e) });
        }
        step();
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));

    let savedEstimates = 0;
    if (estimates.length) {
      const { clientIds, productIds } = await this.webIds();
      for (const e of estimates) {
        try {
          await this.saveEstimate(e, clientIds, productIds);
          savedEstimates++;
        } catch (err) {
          failed.push({ name: e.number, reason: failureReason(err) });
        }
        step();
      }
    }
    return { products: saved, clients: clients.length, estimates: savedEstimates, failed };
  }

  /** Web ids of every client (by name and branch) and product (by its keys), after the import. */
  private async webIds() {
    const [clients, products] = await Promise.all([this.clients.list(), this.products.list()]);
    const clientIds = new Map<string, Client>();
    for (const c of clients) if (!clientIds.has(clientKey(c))) clientIds.set(clientKey(c), c);
    const productIds = new Map<string, string>();
    for (const p of products) {
      for (const key of productKey(p)) if (!productIds.has(key)) productIds.set(key, p.id);
    }
    return { clientIds, productIds };
  }

  private async saveEstimate(
    e: DesktopEstimate,
    clientIds: Map<string, Client>,
    productIds: Map<string, string>,
  ): Promise<void> {
    const client = e.client ? clientIds.get(clientKey(e.client)) : undefined;
    if (!client) throw new Error('client not found');
    const lines: EstimateLine[] = e.lines
      .filter((l) => l.boxes > 0)
      .map(({ productKeys, ...line }) => ({
        ...line,
        productId: productKeys.map((k) => productIds.get(k)).find(Boolean) ?? '',
      }));
    if (!lines.length) throw new Error('no lines');
    await this.estimates.save(
      undefined,
      {
        number: e.number,
        clientId: client.id,
        date: e.date,
        reference: e.reference,
        status: e.status,
        notes: e.notes,
        lines,
      },
      client,
    );
  }

  /** A photo that cannot be read is skipped, not a reason to lose the product. */
  private async photo(p: DesktopProduct): Promise<PhotoChange> {
    if (!p.image) return { kind: 'keep' };
    try {
      const file = await preparePhoto(new Blob([p.image], { type: 'image/png' }));
      return { kind: 'replace', file };
    } catch {
      return { kind: 'keep' };
    }
  }
}
