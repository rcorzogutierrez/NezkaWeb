import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideFileDown,
  LucideFileText,
  LucideLoaderCircle,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import {
  ESTIMATE_STATUSES,
  type Estimate,
  type EstimateStatus,
  displayDate,
  isActive,
  isPending,
  matchesEstimateSearch,
  proformaFileName,
} from '../../core/estimates/estimate';
import { EstimatesService } from '../../core/estimates/estimates.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { formatMoney } from '../../core/products/product';
import { FormAlert } from '../../shared/ui/form-alert';
import { type Notice, NoticeService } from '../../shared/ui/notice.service';
import { EstimateStatusBadge } from './estimate-status-badge';

/** `open` hides rejected estimates, like the desktop app with "Mostrar rechazados" off. */
type StatusFilter = 'open' | 'all' | EstimateStatus;
const STATUS_FILTERS: readonly StatusFilter[] = ['open', 'all', ...ESTIMATE_STATUSES];

/** Proformas with totals, search and a status filter (kept in the URL). */
@Component({
  selector: 'app-estimates-page',
  imports: [
    RouterLink,
    LucideFileDown,
    LucideFileText,
    LucideLoaderCircle,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideX,
    FormAlert,
    EstimateStatusBadge,
  ],
  templateUrl: './estimates-page.html',
})
export class EstimatesPage {
  private readonly router = inject(Router);
  private readonly pdf = inject(PdfService);
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;

  readonly q = input<string>();
  readonly status = input<string>();

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly search = linkedSignal(() => this.q() ?? '');
  protected readonly statusFilter = linkedSignal<StatusFilter>(() => {
    const s = this.status() as StatusFilter;
    return STATUS_FILTERS.includes(s) ? s : 'open';
  });

  private readonly live = inject(EstimatesService).watchAll();
  protected readonly estimates = this.live.estimates;
  protected readonly loadFailed = this.live.error;
  protected readonly notice = signal<Notice | null>(inject(NoticeService).take());

  protected readonly stats = computed(() => {
    const list = this.estimates() ?? [];
    return {
      total: list.length,
      pending: list.filter(isPending).length,
      quoted: list.filter(isActive).reduce((sum, e) => sum + e.total, 0),
    };
  });

  protected readonly shown = computed(() => {
    const status = this.statusFilter();
    const search = this.search();
    return (this.estimates() ?? []).filter(
      (e) =>
        (status === 'all' || (status === 'open' ? isActive(e) : e.status === status)) &&
        matchesEstimateSearch(e, search),
    );
  });

  protected readonly money = formatMoney;
  protected readonly skeletonRows = [0, 1, 2, 3];

  protected date(iso: string): string {
    return displayDate(iso, this.i18n.language());
  }

  protected count(n: number): string {
    return n.toLocaleString('en-US');
  }

  // PDF of one estimate, straight from the list.
  protected readonly pdfBusy = signal<string | null>(null);
  protected readonly pdfFailed = signal(false);

  protected async downloadPdf(e: Estimate): Promise<void> {
    if (this.pdfBusy()) return;
    this.pdfBusy.set(e.id);
    this.pdfFailed.set(false);
    try {
      this.pdf.download(await this.pdf.proforma(e), proformaFileName(e));
    } catch {
      this.pdfFailed.set(true);
    } finally {
      this.pdfBusy.set(null);
    }
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.syncUrl();
  }

  protected setStatus(value: string): void {
    this.statusFilter.set(value as StatusFilter);
    this.syncUrl();
  }

  protected clear(): void {
    this.search.set('');
    this.statusFilter.set('all');
    this.syncUrl();
  }

  private syncUrl(): void {
    const q = this.search().trim();
    const status = this.statusFilter();
    void this.router.navigate([], {
      queryParams: { q: q || null, status: status === 'open' ? null : status },
      replaceUrl: true,
    });
  }
}
