import { Component, inject, signal } from '@angular/core';
import { FormRoot, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideKeyRound, LucideLoaderCircle } from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';
import { TextField } from '../../shared/ui/text-field';
import { MIN_PASSWORD_LENGTH, newPassword } from './password-match';

/**
 * New password for whoever is signed in. Required after signing in with a temporary password
 * (the app routes there until it is done); otherwise reached from the menu.
 */
@Component({
  selector: 'app-change-password',
  imports: [FormRoot, RouterLink, LucideKeyRound, LucideLoaderCircle, FormAlert, TextField],
  template: `
    <span class="grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
      <svg lucideKeyRound class="size-5" aria-hidden="true"></svg>
    </span>
    <h1 class="mt-5 text-2xl font-bold tracking-tight text-ink">
      {{ required() ? t().auth.changePassword.firstTitle : t().auth.changePassword.title }}
    </h1>
    <p class="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-muted">
      {{ required() ? t().auth.changePassword.firstIntro : t().auth.changePassword.intro }}
    </p>

    <form [formRoot]="passwordForm" class="mt-7 space-y-5" novalidate>
      @if (error(); as key) {
        <app-form-alert>{{ t().errors[key] }}</app-form-alert>
      }
      <input type="email" class="hidden" autocomplete="username" [value]="email()" readonly />
      <app-text-field
        [field]="passwordForm.password"
        [label]="t().auth.changePassword.newPassword"
        type="password"
        autocomplete="new-password"
        [hint]="t().auth.passwordHint(minLength)"
      />
      <app-text-field
        [field]="passwordForm.confirm"
        [label]="t().auth.confirmPassword"
        type="password"
        autocomplete="new-password"
      />
      <button type="submit" class="btn-primary w-full" [disabled]="passwordForm().submitting()">
        @if (passwordForm().submitting()) {
          <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
          {{ t().auth.changePassword.submitting }}
        } @else {
          {{ t().auth.changePassword.submit }}
        }
      </button>
    </form>

    <p class="mt-7 border-t border-line pt-6 text-center text-[0.9375rem]">
      @if (required()) {
        <button type="button" class="link font-semibold" (click)="logout()">
          {{ t().auth.changePassword.logout }}
        </button>
      } @else {
        <a routerLink="/" class="link font-semibold">{{ t().auth.changePassword.cancel }}</a>
      }
    </p>
  `,
})
export class ChangePassword {
  private readonly auth = inject(AuthService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly required = this.auth.mustChangePassword;
  protected readonly email = this.auth.email;
  protected readonly error = signal<ErrorKey | null>(null);

  protected readonly passwordForm = form(
    signal({ password: '', confirm: '' }),
    (path) => newPassword(path.password, path.confirm),
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          try {
            await this.auth.changePassword(f().value().password);
          } catch (e) {
            this.error.set(errorKey(e));
            return;
          }
          this.notices.show({ tone: 'success', text: () => this.t().auth.changePassword.saved });
          await this.router.navigateByUrl('/');
        },
      },
    },
  );

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
