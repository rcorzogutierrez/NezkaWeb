import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import {
  LucideFileSpreadsheet,
  LucideImageOff,
  LucidePackage,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { displayDate, todayIso } from '../../core/estimates/estimate';
import { I18nService } from '../../core/i18n/i18n.service';
import { PdfService } from '../../core/pdf/pdf.service';
import {
  MISSING_INFO,
  type MissingInfo,
  formatMoney,
  matchesProductSearch,
  missingInfo,
} from '../../core/products/product';
import { ProductsService } from '../../core/products/products.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { type Notice, NoticeService } from '../../shared/ui/notice.service';
import { StatusBadge } from '../../shared/ui/status-badge';

type StatusFilter = 'all' | 'active' | 'inactive';
const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'active', 'inactive'];
/** `any` lists products missing something; a MissingInfo lists those missing that one item. */
type MissingFilter = '' | 'any' | MissingInfo;

/** The catalog with photos, search, status and missing-data filters (all kept in the URL). */
@Component({
  selector: 'app-products-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    LucideFileSpreadsheet,
    LucideImageOff,
    LucidePackage,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideX,
    FormAlert,
    StatusBadge,
  ],
  templateUrl: './products-page.html',
})
export class ProductsPage {
  private readonly router = inject(Router);
  private readonly files = inject(PdfService);
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  readonly q = input<string>();
  readonly status = input<string>();
  readonly missing = input<string>();

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly missingOptions = MISSING_INFO;
  protected readonly search = linkedSignal(() => this.q() ?? '');
  protected readonly statusFilter = linkedSignal<StatusFilter>(() => {
    const s = this.status() as StatusFilter;
    return STATUS_FILTERS.includes(s) ? s : 'all';
  });
  protected readonly missingFilter = linkedSignal<MissingFilter>(() => {
    const m = this.missing() ?? '';
    return m === 'any' || MISSING_INFO.includes(m as MissingInfo) ? (m as MissingFilter) : '';
  });

  private readonly live = inject(ProductsService).watchAll();
  protected readonly products = this.live.products;
  protected readonly loadFailed = this.live.error;
  protected readonly notice = signal<Notice | null>(inject(NoticeService).take());

  protected readonly counts = computed(() => {
    const list = this.products() ?? [];
    const active = list.filter((p) => p.active).length;
    return { all: list.length, active, inactive: list.length - active };
  });

  protected readonly shown = computed(() => {
    const status = this.statusFilter();
    const missing = this.missingFilter();
    const search = this.search();
    return (this.products() ?? [])
      .map((p) => ({ product: p, missing: missingInfo(p) }))
      .filter(
        ({ product, missing: lacks }) =>
          (status === 'all' || product.active === (status === 'active')) &&
          (missing === '' || (missing === 'any' ? lacks.length > 0 : lacks.includes(missing))) &&
          matchesProductSearch(product, search),
      );
  });

  protected readonly money = formatMoney;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected missingText(lacks: readonly MissingInfo[]): string {
    const short = this.t().products.missingShort;
    return lacks.map((m) => short[m]).join(', ');
  }

  // "Exportar faltantes": the listed products that lack something, as an Excel file.
  protected readonly exporting = signal(false);
  protected readonly exportFailed = signal(false);
  protected readonly exportable = computed(() =>
    this.shown()
      .filter(({ missing }) => missing.length > 0)
      .map(({ product }) => product),
  );

  protected async exportMissing(): Promise<void> {
    const products = this.exportable();
    if (this.exporting() || !products.length) return;
    this.exporting.set(true);
    this.exportFailed.set(false);
    try {
      const { missingDataXlsx, missingDataFileName } =
        await import('../../core/products/missing-xlsx');
      const t = this.t().products;
      const filter = this.missingFilter();
      const title =
        filter && filter !== 'any'
          ? `${t.exportSheet.title} (${t.missingFilter[filter].toLowerCase()})`
          : t.exportSheet.title;
      const date = todayIso();
      const text = { ...t.exportSheet, missingShort: t.missingShort };
      const blob = missingDataXlsx(products, text, displayDate(date, this.i18n.language()), title);
      this.files.download(blob, missingDataFileName(date));
    } catch {
      this.exportFailed.set(true);
    } finally {
      this.exporting.set(false);
    }
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.syncUrl();
  }

  protected setStatus(value: StatusFilter): void {
    this.statusFilter.set(value);
    this.syncUrl();
  }

  protected setMissing(value: string): void {
    this.missingFilter.set(value as MissingFilter);
    this.syncUrl();
  }

  protected clear(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.missingFilter.set('');
    this.syncUrl();
  }

  private syncUrl(): void {
    const q = this.search().trim();
    const status = this.statusFilter();
    const missing = this.missingFilter();
    void this.router.navigate([], {
      queryParams: {
        q: q || null,
        status: status === 'all' ? null : status,
        missing: missing || null,
      },
      replaceUrl: true,
    });
  }
}
