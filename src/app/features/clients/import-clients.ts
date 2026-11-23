import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideFileSpreadsheet,
  LucideLoaderCircle,
  LucideUpload,
} from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { clientLocation } from '../../core/clients/client';
import { ClientsService } from '../../core/clients/clients.service';
import {
  ACCEPTED_FILES,
  type ImportErrorCode,
  ImportFileError,
  type ImportPreview,
  previewFile,
} from '../../core/clients/quickbooks-import';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';

/** Pick a QuickBooks customer export, preview it and add the new clients. */
@Component({
  selector: 'app-import-clients',
  imports: [
    RouterLink,
    LucideArrowLeft,
    LucideFileSpreadsheet,
    LucideLoaderCircle,
    LucideUpload,
    FormAlert,
  ],
  templateUrl: './import-clients.html',
})
export class ImportClients {
  private readonly clients = inject(ClientsService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;

  protected readonly accept = ACCEPTED_FILES;
  protected readonly location = clientLocation;
  private readonly existing = this.clients.watchAll().clients;

  protected readonly fileName = signal('');
  protected readonly reading = signal(false);
  protected readonly dragging = signal(false);
  protected readonly preview = signal<ImportPreview | null>(null);
  protected readonly fileError = signal<ImportErrorCode | null>(null);
  protected readonly saveError = signal<ErrorKey | null>(null);
  protected readonly saving = signal(false);

  protected readonly fresh = computed(() => this.preview()?.rows.filter((r) => !r.skip) ?? []);
  protected readonly skipped = computed(
    () => (this.preview()?.rows.length ?? 0) - this.fresh().length,
  );

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.load(file);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.load(file);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  async load(file: File): Promise<void> {
    this.fileName.set(file.name);
    this.fileError.set(null);
    this.saveError.set(null);
    this.preview.set(null);
    this.reading.set(true);
    try {
      const names = (this.existing() ?? []).map((c) => c.name);
      this.preview.set(await previewFile(file, names, this.t().clients.import.notes));
    } catch (e) {
      this.fileError.set(e instanceof ImportFileError ? e.code : 'unreadable');
    } finally {
      this.reading.set(false);
    }
  }

  protected async save(): Promise<void> {
    const list = this.fresh().map((r) => r.client);
    if (!list.length) return;
    this.saving.set(true);
    this.saveError.set(null);
    try {
      await this.clients.createMany(list);
    } catch (e) {
      this.saveError.set(errorKey(e));
      return;
    } finally {
      this.saving.set(false);
    }
    const count = list.length;
    this.notices.show({ tone: 'success', text: () => this.t().clients.import.done(count) });
    await this.router.navigateByUrl('/clients');
  }
}
