import { Service, inject } from '@angular/core';
import { type ClientData } from '../clients/client';
import { ClientsService } from '../clients/clients.service';
import { preparePhoto } from '../products/photo';
import { type PhotoChange, ProductsService } from '../products/products.service';
import type { DesktopProduct } from './desktop-db';

export interface ImportProgress {
  readonly done: number;
  readonly total: number;
}

export interface ImportResult {
  readonly products: number;
  readonly clients: number;
  /** Descriptions of the products that could not be saved. */
  readonly failed: readonly string[];
}

/** Products go up a few at a time: each one is a photo upload plus a write. */
const PARALLEL_UPLOADS = 4;

/** Writes what was read from the desktop database into Firestore and Storage. */
@Service()
export class DesktopImportService {
  private readonly products = inject(ProductsService);
  private readonly clients = inject(ClientsService);

  async run(
    products: readonly DesktopProduct[],
    clients: readonly ClientData[],
    onProgress: (p: ImportProgress) => void = () => undefined,
  ): Promise<ImportResult> {
    const total = products.length + (clients.length ? 1 : 0);
    let done = 0;
    const step = () => onProgress({ done: ++done, total });
    onProgress({ done, total });

    if (clients.length) {
      await this.clients.createMany(clients);
      step();
    }

    const failed: string[] = [];
    let saved = 0;
    const queue = [...products];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        try {
          await this.products.save(undefined, next.data, await this.photo(next));
          saved++;
        } catch {
          failed.push(next.data.description);
        }
        step();
      }
    };
    await Promise.all(Array.from({ length: PARALLEL_UPLOADS }, worker));
    return { products: saved, clients: clients.length, failed };
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
