import { Component, inject, input, resource, signal } from '@angular/core';
import { FormRoot, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle } from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UsersService } from '../../core/users/users.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';
import { TextField } from '../../shared/ui/text-field';
import { safeRedirect } from './safe-redirect';

@Component({
  selector: 'app-login',
  imports: [FormRoot, RouterLink, LucideLoaderCircle, FormAlert, TextField],
  template: `
    <h1 class="text-2xl font-bold tracking-tight text-ink">{{ t().auth.login.title }}</h1>
    <p class="mt-1.5 text-[0.9375rem] text-ink-muted">{{ t().auth.login.intro }}</p>

    <form [formRoot]="loginForm" class="mt-7 space-y-5" novalidate>
      @if (error(); as key) {
        <app-form-alert>{{ t().errors[key] }}</app-form-alert>
      } @else if (notice; as n) {
        <app-form-alert [tone]="n.tone">{{ n.text() }}</app-form-alert>
      }
      <app-text-field
        [field]="loginForm.email"
        [label]="t().auth.email"
        type="email"
        autocomplete="username"
      />
      <div>
        <app-text-field
          [field]="loginForm.password"
          [label]="t().auth.password"
          type="password"
          autocomplete="current-password"
        />
        <a
          routerLink="/forgot-password"
          [queryParams]="{ email: loginForm.email().value() || null }"
          class="link mt-2 inline-block text-sm"
          >{{ t().auth.login.forgot }}</a
        >
      </div>
      <button type="submit" class="btn-primary w-full" [disabled]="loginForm().submitting()">
        @if (loginForm().submitting()) {
          <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
          {{ t().auth.login.submitting }}
        } @else {
          {{ t().auth.login.submit }}
        }
      </button>
    </form>

    <p class="mt-7 border-t border-line pt-6 text-center text-[0.9375rem] text-ink-muted">
      @if (setupPending.value()) {
        {{ t().auth.login.firstRun }}
        <a routerLink="/setup" class="link font-semibold">{{ t().auth.login.firstRunLink }}</a>
      } @else {
        {{ t().auth.login.noAccount }}
      }
    </p>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;

  /** Page the user tried to open before being sent here (`?returnUrl=`). */
  readonly returnUrl = input<string>();

  protected readonly error = signal<ErrorKey | null>(null);
  /** Message carried from the previous page, e.g. the sign-out for inactivity. */
  protected readonly notice = inject(NoticeService).take();

  /** Until the first administrator exists, offer to create it instead of asking for one. */
  protected readonly setupPending = resource({
    loader: () => this.users.isSetupPending().catch(() => false),
  });

  protected readonly loginForm = form(
    signal({ email: '', password: '' }),
    (path) => {
      required(path.email);
      email(path.email);
      required(path.password);
    },
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          const { email, password } = f().value();
          try {
            await this.auth.login(email, password);
          } catch (e) {
            this.error.set(errorKey(e));
            return;
          }
          await this.router.navigateByUrl(safeRedirect(this.returnUrl()));
        },
      },
    },
  );
}
