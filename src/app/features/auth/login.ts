import { Component, inject, input, signal } from '@angular/core';
import { FormRoot, email, form, required } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle } from '@lucide/angular';
import { authErrorMessage } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { TextField } from '../../shared/ui/text-field';
import { safeRedirect } from './safe-redirect';

@Component({
  selector: 'app-login',
  imports: [FormRoot, RouterLink, LucideLoaderCircle, FormAlert, TextField],
  template: `
    <h1 class="text-2xl font-bold tracking-tight text-ink">Inicia sesión</h1>
    <p class="mt-1.5 text-[0.9375rem] text-ink-muted">Entra con tu correo y tu contraseña.</p>

    <form [formRoot]="loginForm" class="mt-7 space-y-5" novalidate>
      @if (error()) {
        <app-form-alert>{{ error() }}</app-form-alert>
      }
      <app-text-field
        [field]="loginForm.email"
        label="Correo"
        type="email"
        autocomplete="username"
      />
      <div>
        <app-text-field
          [field]="loginForm.password"
          label="Contraseña"
          type="password"
          autocomplete="current-password"
        />
        <a
          routerLink="/acceso/recuperar"
          [queryParams]="{ correo: loginForm.email().value() || null }"
          class="link mt-2 inline-block text-sm"
          >¿Olvidaste tu contraseña?</a
        >
      </div>
      <button type="submit" class="btn-primary w-full" [disabled]="loginForm().submitting()">
        @if (loginForm().submitting()) {
          <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
          Entrando…
        } @else {
          Entrar
        }
      </button>
    </form>

    <p class="mt-7 border-t border-line pt-6 text-center text-[0.9375rem] text-ink-muted">
      ¿Aún no tienes cuenta?
      <a routerLink="/acceso/registro" class="link font-semibold">Crea una</a>
    </p>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Page the user tried to open before being sent here (`?volver=`). */
  readonly volver = input<string>();

  protected readonly error = signal('');

  protected readonly loginForm = form(
    signal({ email: '', password: '' }),
    (path) => {
      required(path.email, { message: 'Escribe tu correo.' });
      email(path.email, { message: 'Ese correo no tiene un formato válido.' });
      required(path.password, { message: 'Escribe tu contraseña.' });
    },
    {
      submission: {
        action: async (f) => {
          this.error.set('');
          const { email, password } = f().value();
          try {
            await this.auth.login(email, password);
          } catch (e) {
            this.error.set(authErrorMessage(e));
            return;
          }
          await this.router.navigateByUrl(safeRedirect(this.volver()));
        },
      },
    },
  );
}
