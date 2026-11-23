import { Component, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideLoaderCircle } from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { I18nService } from '../../core/i18n/i18n.service';
import { USER_ROLES, type UserRole } from '../../core/users/user-profile';
import { UsersService } from '../../core/users/users.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';
import { TextField } from '../../shared/ui/text-field';

/** Admin creates an account; the person gets an email to choose their password. */
@Component({
  selector: 'app-new-user',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    LucideArrowLeft,
    LucideLoaderCircle,
    FormAlert,
    TextField,
  ],
  template: `
    <a routerLink="/users" class="link inline-flex items-center gap-1.5 text-sm font-semibold">
      <svg lucideArrowLeft class="size-4" aria-hidden="true"></svg>
      {{ t().users.form.back }}
    </a>
    <header class="mt-4 max-w-xl">
      <h1 class="text-[1.75rem] leading-tight font-bold tracking-tight text-ink">
        {{ t().users.form.title }}
      </h1>
      <p class="mt-1.5 text-base leading-relaxed text-ink-muted">{{ t().users.form.intro }}</p>
    </header>

    <form
      [formRoot]="userForm"
      class="mt-8 max-w-xl space-y-6 rounded-2xl border border-line bg-white p-6 sm:p-8"
      novalidate
    >
      @if (error(); as key) {
        <app-form-alert>{{ t().errors[key] }}</app-form-alert>
      }
      <app-text-field [field]="userForm.name" [label]="t().auth.name" autocomplete="off" />
      <app-text-field
        [field]="userForm.email"
        [label]="t().auth.email"
        type="email"
        autocomplete="off"
      />

      <fieldset>
        <legend class="mb-2 text-sm font-semibold text-ink">{{ t().users.form.role }}</legend>
        <div class="grid gap-3 sm:grid-cols-2">
          @for (role of roles; track role) {
            <label
              class="flex cursor-pointer gap-3 rounded-xl border border-line-strong p-4 transition-colors has-checked:border-brand-600 has-checked:bg-brand-50 has-focus-visible:ring-3 has-focus-visible:ring-brand-600/25"
            >
              <input
                type="radio"
                [value]="role"
                [formField]="userForm.role"
                class="mt-0.5 size-4 accent-brand-600 focus:outline-none"
              />
              <span>
                <span class="block text-[0.9375rem] font-semibold text-ink">
                  {{ t().users.roles[role] }}
                </span>
                <span class="mt-0.5 block text-sm leading-snug text-ink-muted">
                  {{ t().users.roleHelp[role] }}
                </span>
              </span>
            </label>
          }
        </div>
      </fieldset>

      <div class="flex flex-wrap gap-3 border-t border-line pt-6">
        <button type="submit" class="btn-primary" [disabled]="userForm().submitting()">
          @if (userForm().submitting()) {
            <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
            {{ t().users.form.submitting }}
          } @else {
            {{ t().users.form.submit }}
          }
        </button>
        <a routerLink="/users" class="btn-secondary">{{ t().users.form.cancel }}</a>
      </div>
    </form>
  `,
})
export class NewUser {
  private readonly users = inject(UsersService);
  private readonly notices = inject(NoticeService);
  private readonly router = inject(Router);
  protected readonly t = inject(I18nService).t;

  protected readonly roles = USER_ROLES;
  protected readonly error = signal<ErrorKey | null>(null);

  protected readonly userForm = form(
    signal({ name: '', email: '', role: 'user' as UserRole }),
    (path) => {
      required(path.name);
      required(path.email);
      email(path.email);
    },
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          const { name, email, role } = f().value();
          try {
            await this.users.create({ name, email, role });
          } catch (e) {
            this.error.set(errorKey(e));
            return;
          }
          this.notices.show({
            tone: 'success',
            text: () => this.t().users.created(name.trim(), email.trim().toLowerCase()),
          });
          await this.router.navigateByUrl('/users');
        },
      },
    },
  );
}
