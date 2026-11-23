import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { FormRoot, email, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideLoaderCircle } from '@lucide/angular';
import { FirebaseError } from 'firebase/app';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { TextField } from '../../shared/ui/text-field';

@Component({
  selector: 'app-reset-password',
  imports: [FormRoot, RouterLink, LucideArrowLeft, LucideLoaderCircle, FormAlert, TextField],
  template: `
    <h1 class="text-2xl font-bold tracking-tight text-ink">{{ t().auth.reset.title }}</h1>
    <p class="mt-1.5 text-[0.9375rem] text-ink-muted">{{ t().auth.reset.intro }}</p>

    <form [formRoot]="resetForm" class="mt-7 space-y-5" novalidate>
      @if (sentTo()) {
        <app-form-alert tone="success">{{ t().auth.reset.sent(sentTo()) }}</app-form-alert>
      } @else if (error(); as key) {
        <app-form-alert>{{ t().errors[key] }}</app-form-alert>
      }
      <app-text-field
        [field]="resetForm.email"
        [label]="t().auth.email"
        type="email"
        autocomplete="email"
      />
      <button type="submit" class="btn-primary w-full" [disabled]="resetForm().submitting()">
        @if (resetForm().submitting()) {
          <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
          {{ t().auth.reset.submitting }}
        } @else {
          {{ t().auth.reset.submit }}
        }
      </button>
    </form>

    <a
      routerLink="/login"
      class="link mt-7 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold"
    >
      <svg lucideArrowLeft class="size-4" aria-hidden="true"></svg>
      {{ t().auth.reset.back }}
    </a>
  `,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);
  protected readonly t = inject(I18nService).t;

  /** Prefilled from the login page (`?email=`). */
  readonly email = input<string>();

  protected readonly sentTo = signal('');
  protected readonly error = signal<ErrorKey | null>(null);
  private readonly model = linkedSignal(() => ({ email: this.email() ?? '' }));

  protected readonly resetForm = form(
    this.model,
    (path) => {
      required(path.email);
      email(path.email);
    },
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          this.sentTo.set('');
          const { email } = f().value();
          try {
            await this.auth.sendPasswordReset(email);
          } catch (e) {
            // Never reveal whether an account exists for that address.
            if (!(e instanceof FirebaseError && e.code === 'auth/user-not-found')) {
              this.error.set(errorKey(e));
              return;
            }
          }
          this.sentTo.set(email.trim());
        },
      },
    },
  );
}
