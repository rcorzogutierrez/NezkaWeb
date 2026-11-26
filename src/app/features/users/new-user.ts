import { Component, inject, signal } from '@angular/core';
import {
  FormField,
  FormRoot,
  applyWhen,
  email,
  form,
  minLength,
  required,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideLoaderCircle, LucideRefreshCw } from '@lucide/angular';
import { type ErrorKey, errorKey } from '../../core/auth/auth-errors';
import { I18nService } from '../../core/i18n/i18n.service';
import { UnsavedChanges } from '../../core/session/unsaved-changes.service';
import { USER_ROLES, type UserRole } from '../../core/users/user-profile';
import { UsersService, temporaryPassword } from '../../core/users/users.service';
import { MIN_PASSWORD_LENGTH } from '../auth/password-match';
import { FormAlert } from '../../shared/ui/form-alert';
import { NoticeService } from '../../shared/ui/notice.service';
import { TextField } from '../../shared/ui/text-field';

type Access = 'temporary' | 'email';
const ACCESS: readonly Access[] = ['temporary', 'email'];

/** Where an administrator deletes a sign-in account (the browser cannot). */
const CONSOLE_USERS_URL =
  'https://console.firebase.google.com/project/nezka-web/authentication/users';

/**
 * Admin creates an account, either with a temporary password to hand over (changed at the
 * first sign-in) or with an email link to choose one.
 */
@Component({
  selector: 'app-new-user',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    LucideArrowLeft,
    LucideLoaderCircle,
    LucideRefreshCw,
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
      @if (reuse()) {
        <div class="space-y-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
          <div>
            <p class="font-semibold text-ink">{{ t().users.form.reuseTitle }}</p>
            <p class="mt-1 text-sm leading-relaxed text-ink-muted">
              {{ t().users.form.reuseBody }}
            </p>
          </div>
          <app-text-field
            [field]="userForm.currentPassword"
            [label]="t().users.form.currentPassword"
            type="password"
            autocomplete="off"
          />
          <p class="text-sm leading-relaxed text-ink-muted">
            {{ t().users.form.reuseConsole }}
            <a class="link font-semibold" [href]="consoleUrl" target="_blank" rel="noopener">{{
              t().users.form.reuseConsoleLink
            }}</a>
          </p>
        </div>
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

      <fieldset>
        <legend class="mb-2 text-sm font-semibold text-ink">{{ t().users.form.access }}</legend>
        <div class="grid gap-3 sm:grid-cols-2">
          @for (option of accessOptions; track option) {
            <label
              class="flex cursor-pointer gap-3 rounded-xl border border-line-strong p-4 transition-colors has-checked:border-brand-600 has-checked:bg-brand-50 has-focus-visible:ring-3 has-focus-visible:ring-brand-600/25"
            >
              <input
                type="radio"
                [value]="option"
                [formField]="userForm.access"
                class="mt-0.5 size-4 accent-brand-600 focus:outline-none"
              />
              <span>
                <span class="block text-[0.9375rem] font-semibold text-ink">
                  {{ t().users.form.accessOptions[option] }}
                </span>
                <span class="mt-0.5 block text-sm leading-snug text-ink-muted">
                  {{ t().users.form.accessHelp[option] }}
                </span>
              </span>
            </label>
          }
        </div>
      </fieldset>

      @if (model().access === 'temporary') {
        <div class="flex items-start gap-3">
          <app-text-field
            class="min-w-0 flex-1 [&_input]:font-mono [&_input]:tracking-wide"
            [field]="userForm.password"
            [label]="t().users.form.password"
            [hint]="t().users.form.passwordHint"
            autocomplete="off"
          />
          <button type="button" class="btn-secondary mt-7 shrink-0" (click)="regenerate()">
            <svg lucideRefreshCw class="size-4" aria-hidden="true"></svg>
            {{ t().users.form.newPassword }}
          </button>
        </div>
      }

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
  protected readonly accessOptions = ACCESS;
  protected readonly error = signal<ErrorKey | null>(null);
  /** The email already has a sign-in account (someone deleted from the list): offer to reuse it. */
  protected readonly reuse = signal(false);
  protected readonly consoleUrl = CONSOLE_USERS_URL;

  protected readonly model = signal({
    name: '',
    email: '',
    role: 'user' as UserRole,
    access: 'temporary' as Access,
    password: temporaryPassword(),
    currentPassword: '',
  });

  protected regenerate(): void {
    this.model.update((m) => ({ ...m, password: temporaryPassword() }));
  }

  protected readonly userForm = form(
    this.model,
    (path) => {
      required(path.name);
      required(path.email);
      email(path.email);
      applyWhen(
        path,
        ({ value }) => value().access === 'temporary',
        (p) => {
          required(p.password);
          minLength(p.password, MIN_PASSWORD_LENGTH);
        },
      );
    },
    {
      submission: {
        action: async (f) => {
          this.error.set(null);
          const { name, email, role, access, password, currentPassword } = f().value();
          const temporary = access === 'temporary' ? password : undefined;
          const current = this.reuse() && currentPassword ? currentPassword : undefined;
          try {
            await this.users.create({
              name,
              email,
              role,
              temporaryPassword: temporary,
              currentPassword: current,
            });
          } catch (e) {
            const key = errorKey(e);
            if (key === 'emailInUse') {
              this.reuse.set(true);
              this.error.set(null);
            } else {
              this.error.set(key);
            }
            return;
          }
          this.notices.show({
            tone: 'success',
            text: () =>
              temporary
                ? this.t().users.createdWithPassword(name.trim(), temporary)
                : this.t().users.created(name.trim(), email.trim().toLowerCase()),
          });
          await this.router.navigateByUrl('/users');
        },
      },
    },
  );

  constructor() {
    inject(UnsavedChanges).watch(() => this.userForm().dirty());
  }
}
