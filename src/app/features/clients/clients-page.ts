import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucidePencil, LucidePlus, LucideSearch, LucideUsers, LucideX } from '@lucide/angular';
import { type Client, clientLocation, matchesSearch } from '../../core/clients/client';
import { ClientsService } from '../../core/clients/clients.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { type Notice, NoticeService } from '../../shared/ui/notice.service';
import { StatusBadge } from '../../shared/ui/status-badge';

export type ClientFilter = 'all' | 'active' | 'inactive';
const FILTERS: readonly ClientFilter[] = ['all', 'active', 'inactive'];

/** The client list with search and an active/inactive filter, both kept in the URL. */
@Component({
  selector: 'app-clients-page',
  imports: [
    RouterLink,
    LucidePencil,
    LucidePlus,
    LucideSearch,
    LucideUsers,
    LucideX,
    FormAlert,
    StatusBadge,
  ],
  templateUrl: './clients-page.html',
})
export class ClientsPage {
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;

  /** `?q=` and `?status=` from the URL. */
  readonly q = input<string>();
  readonly status = input<string>();

  protected readonly filters = FILTERS;
  protected readonly search = linkedSignal(() => this.q() ?? '');
  protected readonly filter = linkedSignal<ClientFilter>(() => {
    const s = this.status() as ClientFilter;
    return FILTERS.includes(s) ? s : 'all';
  });

  private readonly live = inject(ClientsService).watchAll();
  protected readonly clients = this.live.clients;
  protected readonly loadFailed = this.live.error;
  protected readonly notice = signal<Notice | null>(inject(NoticeService).take());

  protected readonly counts = computed(() => {
    const list = this.clients() ?? [];
    const active = list.filter((c) => c.active).length;
    return { all: list.length, active, inactive: list.length - active };
  });

  protected readonly shown = computed(() => {
    const filter = this.filter();
    const search = this.search();
    return (this.clients() ?? []).filter(
      (c) => (filter === 'all' || c.active === (filter === 'active')) && matchesSearch(c, search),
    );
  });

  protected readonly location = clientLocation;
  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected phone(c: Client): string {
    return c.phone || c.mobile;
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.syncUrl();
  }

  protected setFilter(value: ClientFilter): void {
    this.filter.set(value);
    this.syncUrl();
  }

  protected clear(): void {
    this.search.set('');
    this.filter.set('all');
    this.syncUrl();
  }

  private syncUrl(): void {
    const q = this.search().trim();
    const status = this.filter();
    void this.router.navigate([], {
      queryParams: { q: q || null, status: status === 'all' ? null : status },
      replaceUrl: true,
    });
  }
}
