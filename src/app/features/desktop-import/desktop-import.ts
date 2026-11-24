import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideCopy,
  LucideDatabase,
  LucideImageOff,
  LucideLoaderCircle,
  LucideUpload,
} from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { clientLocation } from '../../core/clients/client';
import { ClientsService } from '../../core/clients/clients.service';
import {
  DESKTOP_DB_FOLDER,
  DesktopDbError,
  type DesktopDbErrorCode,
  type ImportPlan,
  planImport,
  readDesktopDb,
} from '../../core/desktop-import/desktop-db';
import {
  DesktopImportService,
  type ImportProgress,
} from '../../core/desktop-import/desktop-import.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatMoney } from '../../core/products/product';
import { ProductsService } from '../../core/products/products.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';

/** Admins pick the desktop app's nezka.db, review what is new and bring it to the web. */
@Component({
  selector: 'app-desktop-import',
  imports: [
    RouterLink,
    LucideCheck,
    LucideCopy,
    LucideDatabase,
    LucideImageOff,
    LucideLoaderCircle,
    LucideUpload,
    FormAlert,
  ],
  templateUrl: './desktop-import.html',
})
export class DesktopImport {
  private readonly importer = inject(DesktopImportService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;

  private readonly existingProducts = inject(ProductsService).watchAll().products;
  private readonly existingClients = inject(ClientsService).watchAll().clients;

  protected readonly folder = DESKTOP_DB_FOLDER;
  protected readonly location = clientLocation;
  protected readonly money = formatMoney;

  protected readonly fileName = signal('');
  protected readonly reading = signal(false);
  protected readonly dragging = signal(false);
  protected readonly copied = signal(false);
  protected readonly plan = signal<ImportPlan | null>(null);
  protected readonly fileError = signal<DesktopDbErrorCode | null>(null);
  protected readonly withProducts = signal(true);
  protected readonly withClients = signal(true);
  protected readonly progress = signal<ImportProgress | null>(null);
  protected readonly saveError = signal<ErrorKey | null>(null);

  /** Object URLs of the photos shown in the preview, by product position. */
  protected readonly thumbs = signal<readonly (string | null)[]>([]);

  protected readonly newProducts = computed(
    () =>
      this.plan()
        ?.products.filter((r) => !r.exists)
        .map((r) => r.item) ?? [],
  );
  protected readonly newClients = computed(
    () =>
      this.plan()
        ?.clients.filter((r) => !r.exists)
        .map((r) => r.item) ?? [],
  );
  protected readonly productPhotos = computed(
    () => this.newProducts().filter((p) => p.image).length,
  );
  protected readonly toImport = computed(
    () =>
      (this.withProducts() ? this.newProducts().length : 0) +
      (this.withClients() ? this.newClients().length : 0),
  );
  protected readonly busy = computed(() => this.progress() !== null);
  protected readonly percent = computed(() => {
    const p = this.progress();
    return p && p.total ? Math.round((p.done / p.total) * 100) : 0;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearThumbs());
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.load(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.load(file);
  }

  protected async copyFolder(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.folder);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Without clipboard access the folder is still there to select and copy.
    }
  }

  async load(file: File): Promise<void> {
    this.fileName.set(file.name);
    this.fileError.set(null);
    this.saveError.set(null);
    this.plan.set(null);
    this.clearThumbs();
    this.reading.set(true);
    try {
      const data = await readDesktopDb(file);
      const plan = planImport(data, this.existingProducts() ?? [], this.existingClients() ?? []);
      this.thumbs.set(
        plan.products.map((r) =>
          r.item.image
            ? URL.createObjectURL(new Blob([r.item.image], { type: 'image/png' }))
            : null,
        ),
      );
      this.plan.set(plan);
    } catch (e) {
      this.fileError.set(e instanceof DesktopDbError ? e.code : 'unreadable');
    } finally {
      this.reading.set(false);
    }
  }

  protected async run(): Promise<void> {
    if (!this.toImport() || this.busy()) return;
    const products = this.withProducts() ? this.newProducts() : [];
    const clients = this.withClients() ? this.newClients() : [];
    this.saveError.set(null);
    let result;
    try {
      result = await this.importer.run(products, clients, (p) => this.progress.set(p));
    } catch (e) {
      this.saveError.set(errorKey(e));
      return;
    } finally {
      this.progress.set(null);
    }
    const { failed } = result;
    const t = this.t;
    this.notices.show({
      tone: failed.length ? 'error' : 'success',
      text: () =>
        t().desktopImport.done(result.products, result.clients) +
        (failed.length ? ' ' + t().desktopImport.failed(failed.join(', ')) : ''),
    });
    await this.router.navigateByUrl(products.length || !clients.length ? '/products' : '/clients');
  }

  private clearThumbs(): void {
    for (const url of this.thumbs()) if (url) URL.revokeObjectURL(url);
    this.thumbs.set([]);
  }
}
