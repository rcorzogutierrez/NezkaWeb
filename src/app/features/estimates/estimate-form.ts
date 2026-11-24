import {
  Component,
  DOCUMENT,
  type ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { FormField, FormRoot, form, maxLength, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideExternalLink,
  LucideFileDown,
  LucideImageOff,
  LucideLoaderCircle,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { ClientsService } from '../../core/clients/clients.service';
import {
  ESTIMATE_MAX_LENGTH,
  ESTIMATE_STATUSES,
  type Estimate,
  type EstimateData,
  type EstimateLine,
  type EstimateStatus,
  MAX_BOXES,
  MAX_LINES,
  isIsoDate,
  lineFromProduct,
  lineTotal,
  linkLines,
  normalizeEstimate,
  proformaFileName,
  todayIso,
  totals,
} from '../../core/estimates/estimate';
import { EstimatesService } from '../../core/estimates/estimates.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { PdfService } from '../../core/pdf/pdf.service';
import {
  type Product,
  formatMoney,
  matchesProductSearch,
  parsePrice,
  priceText,
} from '../../core/products/product';
import { ProductsService } from '../../core/products/products.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';
import { TextField } from '../../shared/ui/text-field';

/** The estimate's own fields, as the form edits them. */
interface HeaderModel {
  clientId: string;
  number: string;
  date: string;
  reference: string;
  status: EstimateStatus;
  notes: string;
}

/** A line with the boxes and price as typed, so a half-typed value is not lost. */
interface LineDraft {
  readonly line: EstimateLine;
  readonly boxes: string;
  readonly price: string;
}

function toHeader(e: Estimate | null | undefined, suggested = ''): HeaderModel {
  return {
    clientId: e?.clientId ?? '',
    number: e?.number ?? suggested,
    date: e?.date ?? todayIso(),
    reference: e?.reference ?? '',
    status: e?.status ?? 'draft',
    notes: e?.notes ?? '',
  };
}

function toDraft(line: EstimateLine): LineDraft {
  return { line, boxes: String(line.boxes), price: priceText(line.pricePerBox) || '0.00' };
}

function parseBoxes(text: string): number | null {
  const clean = text.trim().replace(/,/g, '');
  if (!/^\d+$/.test(clean)) return null;
  const n = Number(clean);
  return n >= 1 && n < MAX_BOXES ? n : null;
}

/** The line with the typed values, or null where they are not valid. */
function parsed(d: LineDraft): { boxes: number | null; price: number | null } {
  return { boxes: parseBoxes(d.boxes), price: parsePrice(d.price) };
}

const MAX_OPTIONS = 40;

/** Create (`/estimates/new`) or edit (`/estimates/:id`) a proforma and download its PDF. */
@Component({
  selector: 'app-estimate-form',
  imports: [
    FormField,
    FormRoot,
    NgOptimizedImage,
    RouterLink,
    LucideArrowLeft,
    LucideExternalLink,
    LucideFileDown,
    LucideImageOff,
    LucideLoaderCircle,
    LucidePlus,
    LucideSearch,
    LucideTrash2,
    FormAlert,
    TextField,
  ],
  templateUrl: './estimate-form.html',
})
export class EstimateForm {
  private readonly estimates = inject(EstimatesService);
  private readonly notices = inject(NoticeService);
  private readonly pdf = inject(PdfService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly t = inject(I18nService).t;
  protected readonly isAdmin = inject(AuthService).isAdmin;

  /** Route parameter; absent on `/estimates/new`. */
  readonly id = input<string>();

  private readonly existing = resource({
    params: () => this.id(),
    loader: ({ params }) => this.estimates.get(params),
  });
  /** The next number of the series, for a new estimate. */
  private readonly suggested = resource({
    params: () => (this.id() ? undefined : Number(todayIso().slice(0, 4))),
    loader: ({ params }) => this.estimates.nextNumber(params),
  });

  protected readonly editing = computed(() => !!this.id());
  protected readonly loading = computed(() => this.editing() && this.existing.isLoading());
  protected readonly notFound = computed(
    () => this.editing() && !this.existing.isLoading() && this.existing.value() === null,
  );
  protected readonly loadError = computed(() =>
    this.existing.error() ? errorKey(this.existing.error()) : null,
  );
  protected readonly savedNumber = computed(() => this.existing.value()?.number ?? '');

  private readonly header = linkedSignal<
    { estimate: Estimate | null | undefined; suggested: string | undefined },
    HeaderModel
  >({
    source: () => ({ estimate: this.existing.value(), suggested: this.suggested.value() }),
    computation: (src, prev) => {
      // The suggested number arrives after the form is shown: keep what was typed meanwhile.
      if (prev && !src.estimate && prev.source.estimate === src.estimate) {
        return { ...prev.value, number: prev.value.number || (src.suggested ?? '') };
      }
      return toHeader(src.estimate, src.suggested);
    },
  });

  protected readonly lines = linkedSignal<LineDraft[]>(() =>
    (this.existing.value()?.lines ?? []).map(toDraft),
  );

  // Catalog and clients, live.
  private readonly liveClients = inject(ClientsService).watchAll();
  private readonly liveProducts = inject(ProductsService).watchAll();
  protected readonly statuses = ESTIMATE_STATUSES;

  /** Active clients, plus the estimate's own client even if it was deactivated. */
  protected readonly clientOptions = computed(() => {
    const current = this.header().clientId;
    return (this.liveClients.clients() ?? []).filter((c) => c.active || c.id === current);
  });
  protected readonly clientsLoaded = computed(() => this.liveClients.clients() !== undefined);

  private readonly productsById = computed(
    () => new Map((this.liveProducts.products() ?? []).map((p) => [p.id, p])),
  );

  /** The line's product; lines saved without one find it by ref or UPC plus description. */
  private productIdOf(line: EstimateLine): string {
    if (line.productId) return line.productId;
    return linkLines([line], this.liveProducts.products() ?? [])[0].productId;
  }

  protected photoOf(line: EstimateLine): string {
    return this.productsById().get(this.productIdOf(line))?.photoUrl ?? '';
  }

  // Totals follow what is typed; invalid values count as zero until fixed.
  protected readonly lineValues = computed(() =>
    this.lines().map((d) => {
      const v = parsed(d);
      return {
        boxesInvalid: v.boxes === null,
        priceInvalid: v.price === null,
        total: lineTotal({ boxes: v.boxes ?? 0, pricePerBox: v.price ?? 0 }),
      };
    }),
  );
  protected readonly summary = computed(() =>
    totals(
      this.lines().map((d) => {
        const v = parsed(d);
        return { boxes: v.boxes ?? 0, pricePerBox: v.price ?? 0 };
      }),
    ),
  );
  protected readonly money = formatMoney;
  protected count(n: number): string {
    return n.toLocaleString('en-US');
  }

  protected setBoxes(index: number, value: string): void {
    this.lines.update((list) => list.map((d, i) => (i === index ? { ...d, boxes: value } : d)));
  }

  protected setPrice(index: number, value: string): void {
    this.lines.update((list) => list.map((d, i) => (i === index ? { ...d, price: value } : d)));
  }

  /** Shows the price as 24.00 once the person leaves the field. */
  protected tidyPrice(index: number): void {
    const draft = this.lines()[index];
    const price = draft ? parsePrice(draft.price) : null;
    if (price !== null) this.setPrice(index, priceText(price) || '0.00');
  }

  protected readonly lineNotice = signal('');

  protected removeLine(index: number): void {
    const name = this.lines()[index]?.line.description ?? '';
    this.lines.update((list) => list.filter((_, i) => i !== index));
    this.lineNotice.set(this.t().estimates.form.removed(name));
    this.pickInput()?.nativeElement.focus();
  }

  // Product picker: an accessible combobox over the active catalog.
  private readonly pickInput = viewChild<ElementRef<HTMLInputElement>>('pickInput');
  private readonly boxesInput = viewChild<ElementRef<HTMLInputElement>>('boxesInput');
  protected readonly pickQuery = signal('');
  protected readonly pickOpen = signal(false);
  protected readonly activeOption = signal(0);
  protected readonly picked = signal<Product | null>(null);
  protected readonly addBoxes = signal('1');
  protected readonly pickError = signal(false);

  protected readonly options = computed(() => {
    const q = this.pickQuery();
    return (this.liveProducts.products() ?? [])
      .filter((p) => p.active && matchesProductSearch(p, q))
      .slice(0, MAX_OPTIONS);
  });

  protected optionLabel(p: Product): string {
    return p.ref ? `${p.ref}. ${p.description}` : p.description;
  }

  protected onPickInput(value: string): void {
    this.pickQuery.set(value);
    this.picked.set(null);
    this.pickError.set(false);
    this.activeOption.set(0);
    this.pickOpen.set(true);
  }

  protected onPickKeydown(event: KeyboardEvent): void {
    const count = this.options().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.pickOpen()) this.pickOpen.set(true);
        else if (count) this.activeOption.set((this.activeOption() + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.activeOption.set((this.activeOption() - 1 + count) % count);
        break;
      case 'Enter': {
        event.preventDefault();
        const option = this.pickOpen() ? this.options()[this.activeOption()] : null;
        if (option) this.choose(option);
        else if (this.picked()) this.addPicked();
        break;
      }
      case 'Escape':
        if (this.pickOpen()) {
          event.preventDefault();
          this.pickOpen.set(false);
        }
        break;
    }
  }

  protected choose(p: Product): void {
    this.picked.set(p);
    this.pickQuery.set(this.optionLabel(p));
    this.pickOpen.set(false);
    this.pickError.set(false);
    const boxes = this.boxesInput()?.nativeElement;
    boxes?.focus();
    boxes?.select();
  }

  /** Closes the list when focus leaves the picker (but not on a click inside it). */
  protected onPickFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    const box = (event.currentTarget as HTMLElement | null) ?? null;
    if (!next || !box?.contains(next)) this.pickOpen.set(false);
  }

  protected readonly addBoxesInvalid = computed(() => parseBoxes(this.addBoxes()) === null);

  protected addPicked(): void {
    const product = this.picked();
    if (!product) {
      this.pickError.set(true);
      this.pickInput()?.nativeElement.focus();
      return;
    }
    const boxes = parseBoxes(this.addBoxes());
    if (boxes === null || this.lines().length >= MAX_LINES) return;
    const index = this.lines().findIndex((d) => d.line.productId === product.id);
    if (index >= 0) {
      // Already on the estimate: add the boxes to its line, like the desktop app.
      this.lines.update((list) =>
        list.map((d, i) =>
          i === index ? { ...d, boxes: String((parseBoxes(d.boxes) ?? 0) + boxes) } : d,
        ),
      );
    } else {
      this.lines.update((list) => [...list, toDraft(lineFromProduct(product, boxes))]);
    }
    this.lineNotice.set(this.t().estimates.form.added(product.description));
    this.picked.set(null);
    this.pickQuery.set('');
    this.addBoxes.set('1');
    this.pickInput()?.nativeElement.focus();
  }

  // Saving.
  protected readonly error = signal<ErrorKey | null>(null);
  protected readonly problems = signal<string[]>([]);

  /** The estimate as it would be saved, or null when lines have invalid values. */
  private currentData(): EstimateData | null {
    const lines: EstimateLine[] = [];
    for (const d of this.lines()) {
      const v = parsed(d);
      if (v.boxes === null || v.price === null) return null;
      lines.push({
        ...d.line,
        productId: this.productIdOf(d.line),
        boxes: v.boxes,
        pricePerBox: v.price,
      });
    }
    return normalizeEstimate({ ...this.header(), lines });
  }

  /** True when what is on screen differs from what was saved. */
  protected readonly dirty = computed(() => {
    const saved = this.existing.value();
    if (!saved) return true;
    const current = this.currentData();
    if (!current) return true;
    const before = normalizeEstimate({
      number: saved.number,
      clientId: saved.clientId,
      date: saved.date,
      reference: saved.reference,
      status: saved.status,
      notes: saved.notes,
      // Linking a line to its product is not a change the person made.
      lines: saved.lines.map((l) => ({ ...l, productId: this.productIdOf(l) })),
    });
    return JSON.stringify(before) !== JSON.stringify(current);
  });

  protected readonly estimateForm = form(
    this.header,
    (path) => {
      required(path.clientId);
      required(path.number);
      maxLength(path.number, ESTIMATE_MAX_LENGTH.number);
      maxLength(path.reference, ESTIMATE_MAX_LENGTH.reference);
      maxLength(path.notes, ESTIMATE_MAX_LENGTH.notes);
      validate(path.date, ({ value }) => (isIsoDate(value()) ? null : { kind: 'date' }));
    },
    {
      submission: {
        action: async () => {
          this.error.set(null);
          const f = this.t().estimates.form;
          const data = this.currentData();
          const problems: string[] = [];
          if (!this.lines().length) problems.push(f.needLines);
          if (!data) problems.push(f.badLines);
          const client = this.liveClients.clients()?.find((c) => c.id === this.header().clientId);
          if (!client) problems.push(f.needClient);
          this.problems.set(problems);
          if (problems.length || !data || !client) return;
          const id = this.id();
          try {
            if (await this.estimates.numberTaken(data.number, id)) {
              this.problems.set([f.numberTaken(data.number)]);
              return;
            }
            await this.estimates.save(id, data, client);
          } catch (e) {
            this.error.set(errorKey(e));
            return;
          }
          const number = data.number;
          this.notices.show({
            tone: 'success',
            text: () =>
              id ? this.t().estimates.updated(number) : this.t().estimates.created(number),
          });
          await this.router.navigateByUrl('/estimates');
        },
      },
    },
  );

  /** Shows every problem at once when the person tries to save. */
  protected onSubmitAttempt(): void {
    const f = this.t().estimates.form;
    const problems: string[] = [];
    if (!this.header().clientId) problems.push(f.needClient);
    if (!this.lines().length) problems.push(f.needLines);
    else if (!this.currentData()) problems.push(f.badLines);
    this.problems.set(problems);
  }

  // PDF of the saved estimate.
  protected readonly pdfBusy = signal(false);
  protected readonly pdfFailed = signal(false);

  protected async makePdf(open: boolean): Promise<void> {
    const saved = this.existing.value();
    if (!saved || this.dirty() || this.pdfBusy()) return;
    // A tab opened right away is not blocked as a pop-up; the PDF goes into it when ready.
    const tab = open ? this.document.defaultView?.open('', '_blank') : null;
    this.pdfBusy.set(true);
    this.pdfFailed.set(false);
    try {
      const blob = await this.pdf.proforma(saved);
      if (open) this.pdf.open(blob, tab ?? null);
      else this.pdf.download(blob, proformaFileName(saved));
    } catch {
      tab?.close();
      this.pdfFailed.set(true);
    } finally {
      this.pdfBusy.set(false);
    }
  }

  // Deleting, behind a confirmation dialog (administrators only).
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('deleteDialog');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<ErrorKey | null>(null);

  protected askDelete(): void {
    this.deleteError.set(null);
    this.dialog()?.nativeElement.showModal();
  }

  protected closeDelete(): void {
    this.dialog()?.nativeElement.close();
  }

  protected async confirmDelete(): Promise<void> {
    const estimate = this.existing.value();
    if (!estimate) return;
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await this.estimates.remove(estimate.id);
    } catch (e) {
      this.deleteError.set(errorKey(e));
      return;
    } finally {
      this.deleting.set(false);
    }
    this.closeDelete();
    const number = estimate.number;
    this.notices.show({ tone: 'success', text: () => this.t().estimates.deleted(number) });
    await this.router.navigateByUrl('/estimates');
  }
}
