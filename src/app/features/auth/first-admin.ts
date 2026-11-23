import { Component, inject, signal } from '@angular/core';
import { FormRoot, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle } from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { UsersService } from '../../core/users/users.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { TextField } from '../../shared/ui/text-field';
import { MIN_PASSWORD_LENGTH, newPassword } from './password-match';

/** First run only: creates the administrator account that then adds everyone else. */
@Component({
  selector: 'app-first-admin',
  imports: [FormRoot, RouterLink, LucideLoaderCircle, FormAlert, TextField],
  template: `
    <h1 class="text-2xl font-bold tracking-tight text-ink">{{ t().auth.setup.title }}</h1>
    <p class="mt-1.5 text-[0.9375rem] text-ink-muted">{{ t().auth.setup.intro }}</p>

    <form [formRoot]="adminForm" class="mt-7 space-y-5" novalidate>
      @if (error(); as key) {
        <app-form-alert>{{ t().errors[key] }}</app-form-alert>
      }
      <app-text-field [field]="adminForm.name" [label]="t().auth.name" autocomplete="name" />
      <app-text-field
        [field]="adminForm.email"
        [label]="t().auth.email"
        type="email"
        autocomplete="email"
      />
      <app-text-field
        [field]="adminForm.password"
        [label]="t().auth.password"
        type="password"
        autocomplete="new-password"
        [hint]="t().auth.passwordHint(minLength)"
      />
      <app-text-field
        [field]="adminForm.confirm"
        [label]="t().auth.confirmPassword"
        type="password"
        autocomplete="new-password"
      />
      <button type="submit" class="btn-primary w-full" [disabled]="adminForm().submitting()">
        @if (adminForm().submitting()) {
          <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
          {{ t().auth.setup.submitting }}
        } @else {
          {{ t().auth.setup.submit }}
        }
      </button>
    </form>

    <p class="mt-7 border-t border-line pt-6 text-center text-[0.9375rem] text-ink-muted">
      {{ t().auth.setup.haveAccount }}
      <a routerLink="/login" class="link font-semibold">{{ t().auth.setup.loginLink }}</a>
    </p>
  `,
})
export class FirstAdmin {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly error = signal<ErrorKey | null>(null);

  protected readonly adminForm = form(
    signal({ name: '', email: '', password: '', confirm: '' }),
    (path) => {
      required(path.name);
      required(path.email);
      email(path.email);
      newPassword(path.password, path.confirm);
    },
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          const { name, email, password } = f().value();
          try {
            await this.users.createFirstAdmin({ name, email, password });
            await this.auth.reloadProfile();
          } catch (e) {
            this.error.set(errorKey(e));
            return;
          }
          await this.router.navigateByUrl('/');
        },
      },
    },
  );
}
