import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideLock } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';

/** Signed in, but the account has no active profile. */
@Component({
  selector: 'app-no-access',
  imports: [LucideLock],
  template: `
    <span class="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
      <svg lucideLock class="size-5" aria-hidden="true"></svg>
    </span>
    <h1 class="mt-5 text-2xl font-bold tracking-tight text-ink">{{ t().auth.noAccess.title }}</h1>
    <p class="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
      {{ t().auth.noAccess.body(email()) }}
    </p>
    <button type="button" class="btn-primary mt-7 w-full" (click)="logout()">
      {{ t().auth.noAccess.logout }}
    </button>
  `,
})
export class NoAccess {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;
  protected readonly email = this.auth.email;

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
