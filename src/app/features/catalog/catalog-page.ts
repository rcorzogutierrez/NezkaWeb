import { Component, DOCUMENT, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideExternalLink,
  LucideFileDown,
  LucideImageOff,
  LucideLoaderCircle,
  LucideSearch,
} from '@lucide/angular';
import { todayIso } from '../../core/estimates/estimate';
import { I18nService } from '../../core/i18n/i18n.service';
import { catalogFileName } from '../../core/pdf/catalog';
import { PdfService } from '../../core/pdf/pdf.service';
import { type Product, formatMoney, matchesProductSearch } from '../../core/products/product';
import { ProductsService } from '../../core/products/products.service';
import { FormAlert } from '../../shared/ui/form-alert';

/** Pick the products and download the catalog PDF, with or without prices. */
@Component({
  selector: 'app-catalog-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    LucideExternalLink,
    LucideFileDown,
    LucideImageOff,
    LucideLoaderCircle,
    LucideSearch,
    FormAlert,
  ],
  templateUrl: './catalog-page.html',
})
export class CatalogPage {
  private readonly pdf = inject(PdfService);
  private readonly document = inject(DOCUMENT);
  protected readonly t = inject(I18nService).t;

  private readonly live = inject(ProductsService).watchAll();
  protected readonly products = this.live.products;
  protected readonly loadFailed = this.live.error;

  protected readonly showPrices = signal(true);
  protected readonly includeInactive = signal(false);
  protected readonly search = signal('');
  /** Products unchecked by the person; everything else goes in, so new products do too. */
  private readonly excluded = signal<ReadonlySet<string>>(new Set());

  /** Products that can go in the catalog, in reference order. */
  private readonly candidates = computed(() =>
    (this.products() ?? []).filter((p) => p.active || this.includeInactive()),
  );
  protected readonly shown = computed(() =>
    this.candidates().filter((p) => matchesProductSearch(p, this.search())),
  );
  protected readonly chosen = computed(() =>
    this.candidates().filter((p) => !this.excluded().has(p.id)),
  );

  protected readonly money = formatMoney;

  protected isIncluded(p: Product): boolean {
    return !this.excluded().has(p.id);
  }

  protected toggle(p: Product, included: boolean): void {
    this.excluded.update((set) => {
      const next = new Set(set);
      if (included) next.delete(p.id);
      else next.add(p.id);
      return next;
    });
  }

  /** Checks or unchecks the products shown by the current search. */
  protected markShown(included: boolean): void {
    const ids = this.shown().map((p) => p.id);
    this.excluded.update((set) => {
      const next = new Set(set);
      for (const id of ids) {
        if (included) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected async makePdf(open: boolean): Promise<void> {
    const products = this.chosen();
    if (!products.length || this.busy()) return;
    const tab = open ? this.document.defaultView?.open('', '_blank') : null;
    const date = todayIso();
    this.busy.set(true);
    this.failed.set(false);
    try {
      const blob = await this.pdf.catalog(products, this.showPrices(), date);
      if (open) this.pdf.open(blob, tab ?? null);
      else this.pdf.download(blob, catalogFileName(date));
    } catch {
      tab?.close();
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
}
