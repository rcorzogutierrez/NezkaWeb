import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { FormRoot, email, form, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideLoaderCircle } from '@lucide/angular';
import { FirebaseError } from 'firebase/app';
import { authErrorMessage } from '../../core/auth/auth-errors';
import { AuthService } from '../../core/auth/auth.service';
import { FormAlert } from '../../shared/ui/form-alert';
import { TextField } from '../../shared/ui/text-field';

@Component({
  selector: 'app-reset-password',
  imports: [FormRoot, RouterLink, LucideArrowLeft, LucideLoaderCircle, FormAlert, TextField],
  template: `
    <h1 class="text-2xl font-bold tracking-tight text-ink">Recupera tu contraseña</h1>
    <p class="mt-1.5 text-[0.9375rem] text-ink-muted">
      Te enviamos un enlace para que elijas una contraseña nueva.
    </p>

    <form [formRoot]="resetForm" class="mt-7 space-y-5" novalidate>
      @if (sentTo()) {
        <app-form-alert tone="success">
          Si {{ sentTo() }} tiene una cuenta, el enlace ya va en camino. Revisa también la carpeta
          de correo no deseado.
        </app-form-alert>
      } @else if (error()) {
        <app-form-alert>{{ error() }}</app-form-alert>
      }
      <app-text-field [field]="resetForm.email" label="Correo" type="email" autocomplete="email" />
      <button type="submit" class="btn-primary w-full" [disabled]="resetForm().submitting()">
        @if (resetForm().submitting()) {
          <svg lucideLoaderCircle class="size-4 animate-spin" aria-hidden="true"></svg>
          Enviando…
        } @else {
          Enviar enlace
        }
      </button>
    </form>

    <a
      routerLink="/acceso"
      class="link mt-7 inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold"
    >
      <svg lucideArrowLeft class="size-4" aria-hidden="true"></svg>
      Volver a iniciar sesión
    </a>
  `,
})
export class ResetPassword {
  private readonly auth = inject(AuthService);

  /** Prefilled from the login page (`?correo=`). */
  readonly correo = input<string>();

  protected readonly sentTo = signal('');
  protected readonly error = signal('');
  private readonly model = linkedSignal(() => ({ email: this.correo() ?? '' }));

  protected readonly resetForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Escribe tu correo.' });
      email(path.email, { message: 'Ese correo no tiene un formato válido.' });
    },
    {
      submission: {
        action: async (f) => {
          this.error.set('');
          this.sentTo.set('');
          const { email } = f().value();
          try {
            await this.auth.sendPasswordReset(email);
          } catch (e) {
            // Never reveal whether an account exists for that address.
            if (!(e instanceof FirebaseError && e.code === 'auth/user-not-found')) {
              this.error.set(authErrorMessage(e));
              return;
            }
          }
          this.sentTo.set(email.trim());
        },
      },
    },
  );
}
