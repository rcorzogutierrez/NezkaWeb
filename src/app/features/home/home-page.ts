import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideChevronRight,
  LucideCircleCheck,
  LucideFilePenLine,
  LucideFilePlus,
  LucideImageOff,
  LucidePackagePlus,
  LucideSend,
  LucideTriangleAlert,
  LucideUserCog,
  LucideUserPlus,
} from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { ClientsService } from '../../core/clients/clients.service';
import { dayPart, firstName, summarize } from '../../core/dashboard/summary';
import { displayDate } from '../../core/estimates/estimate';
import { EstimatesService } from '../../core/estimates/estimates.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { formatMoney } from '../../core/products/product';
import { ProductsService } from '../../core/products/products.service';
import { UsersService } from '../../core/users/users.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { EstimateStatusBadge } from '../estimates/estimate-status-badge';

/**
 * The page after signing in: greeting, quick actions, the figures that matter today, recent
 * estimates and what needs attention. Administrators also see the team.
 */
@Component({
  selector: 'app-home-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    LucideArrowRight,
    LucideChevronRight,
    LucideCircleCheck,
    LucideFilePenLine,
    LucideFilePlus,
    LucideImageOff,
    LucidePackagePlus,
    LucideSend,
    LucideTriangleAlert,
    LucideUserCog,
    LucideUserPlus,
    FormAlert,
    EstimateStatusBadge,
  ],
  templateUrl: './home-page.html',
})
export class HomePage {
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly isAdmin = this.auth.isAdmin;

  private readonly now = new Date();
  protected readonly year = this.now.getFullYear();

  private readonly clients = inject(ClientsService).watchAll();
  private readonly products = inject(ProductsService).watchAll();
  private readonly estimates = inject(EstimatesService).watchAll();
  /** Only administrators can read the people list (rules), so only they ask for it. */
  private readonly users = this.auth.isAdmin() ? inject(UsersService).watchAll() : null;

  protected readonly loadFailed = computed(
    () => this.clients.error() || this.products.error() || this.estimates.error(),
  );

  protected readonly summary = computed(() => {
    const clients = this.clients.clients();
    const products = this.products.products();
    const estimates = this.estimates.estimates();
    if (!clients || !products || !estimates) return null;
    return summarize(clients, products, estimates, this.year);
  });

  protected readonly team = computed(() => {
    const list = this.users?.users();
    if (!list) return null;
    return { active: list.filter((u) => u.active).length, total: list.length };
  });

  protected readonly greeting = computed(() => {
    const u = this.auth.user();
    const name = u ? firstName(u.name, u.email) : '';
    return this.t().home.greeting[dayPart(this.now.getHours())](name);
  });

  protected readonly today = computed(() =>
    new Intl.DateTimeFormat(this.i18n.language() === 'es' ? 'es-US' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(this.now),
  );

  protected readonly money = formatMoney;
  protected readonly skeleton = [0, 1, 2, 3];

  protected date(iso: string): string {
    return displayDate(iso, this.i18n.language());
  }
}
