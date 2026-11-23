import { Component, inject, signal } from '@angular/core';
import { FormRoot, email, form, minLength, required, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { LucideLoaderCircle } from '@lucide/angular';
import { authErrorMessage } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { TextField } from '../../shared/ui/text-field';

export const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-register',
  imports: [FormRoot, RouterLink, LucideLoaderCircle, FormAlert, TextField],
  template: `
    <h1 class="text-2xl font-bold tracking-tight text-ink">Crea tu cuenta</h1>
    <p class="mt-1.5 text-[0.9375rem] text-ink-muted">
      Usarás este correo y esta contraseña para entrar.
    </p>

    <form [formRoot]="registerForm" class="mt-7 space-y-5" novalidate>
      @if (error()) {
        <app-form-alert>{{ error() }}</app-form-alert>
      }
      <app-text-field [field]="registerForm.name" label="Nombre" autocomplete="name" />
      <app-text-field
        [field]="registerForm.email"
        label="Correo"
        type="email"
        autocomplete="email"
      />
      <app-text-field
        [field]="registerForm.password"
        label="Contraseña"
        type="password"
        autocomplete="new-password"
        [hint]="'Al menos ' + minLength + ' caracteres.'"
      />
      <app-text-field
        [field]="registerForm.confirm"
        label="Repite la contraseña"
        type="password"
        autocomplete="new-password"
      />
      <button type="submit" class="btn-primary w-full" [disabled]="registerForm().submitting()">
        @if (registerForm().submitting()) {
          <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
          Creando cuenta…
        } @else {
          Crear cuenta
        }
      </button>
    </form>

    <p class="mt-7 border-t border-line pt-6 text-center text-[0.9375rem] text-ink-muted">
      ¿Ya tienes cuenta?
      <a routerLink="/acceso" class="link font-semibold">Inicia sesión</a>
    </p>
  `,
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly error = signal('');

  protected readonly registerForm = form(
    signal({ name: '', email: '', password: '', confirm: '' }),
    (path) => {
      required(path.name, { message: 'Escribe tu nombre.' });
      required(path.email, { message: 'Escribe tu correo.' });
      email(path.email, { message: 'Ese correo no tiene un formato válido.' });
      required(path.password, { message: 'Escribe una contraseña.' });
      minLength(path.password, MIN_PASSWORD_LENGTH, {
        message: `La contraseña necesita al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      });
      required(path.confirm, { message: 'Repite la contraseña.' });
      validate(path.confirm, ({ value, valueOf }) =>
        value() && value() !== valueOf(path.password)
          ? { kind: 'mismatch', message: 'Las contraseñas no coinciden.' }
          : undefined,
      );
    },
    {
      submission: {
        action: async (f) => {
          this.error.set('');
          const { name, email, password } = f().value();
          try {
            await this.auth.register({ name, email, password });
          } catch (e) {
            this.error.set(authErrorMessage(e));
            return;
          }
          await this.router.navigateByUrl('/');
        },
      },
    },
  );
}
