import { Component, computed, input, signal } from '@angular/core';
import { type FieldTree, FormField } from '@angular/forms/signals';
import { LucideEye, LucideEyeOff } from '@lucide/angular';

let nextId = 0;

/** Labelled input bound to a Signal Forms field, with its error and an optional hint. */
@Component({
  selector: 'app-text-field',
  imports: [FormField, LucideEye, LucideEyeOff],
  template: `
    <label [for]="id" class="mb-1.5 block text-sm font-semibold text-ink">{{ label() }}</label>
    <div class="relative">
      <input
        [id]="id"
        [formField]="field()"
        [type]="inputType()"
        [attr.autocomplete]="autocomplete()"
        [attr.inputmode]="type() === 'email' ? 'email' : null"
        [attr.aria-invalid]="showError()"
        [attr.aria-describedby]="describedBy()"
        spellcheck="false"
        class="block h-11 w-full rounded-lg border bg-white px-3.5 text-[0.9375rem] text-ink shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-ink-subtle focus:border-brand-600 focus:ring-3 focus:ring-brand-600/20 disabled:bg-canvas disabled:text-ink-muted"
        [class.pr-11]="type() === 'password'"
        [class.border-line-strong]="!showError()"
        [class.border-danger-600]="showError()"
      />
      @if (type() === 'password') {
        <button
          type="button"
          class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-ink-muted transition-colors hover:text-ink focus-visible:text-brand-600"
          [attr.aria-label]="revealed() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="revealed()"
          (click)="revealed.set(!revealed())"
        >
          @if (revealed()) {
            <svg lucideEyeOff class="size-[1.125rem]" aria-hidden="true"></svg>
          } @else {
            <svg lucideEye class="size-[1.125rem]" aria-hidden="true"></svg>
          }
        </button>
      }
    </div>
    @if (showError()) {
      <p [id]="id + '-error'" class="mt-1.5 text-sm font-medium text-danger-700">
        {{ errorMessage() }}
      </p>
    } @else if (hint()) {
      <p [id]="id + '-hint'" class="mt-1.5 text-sm text-ink-muted">{{ hint() }}</p>
    }
  `,
  host: { class: 'block' },
})
export class TextField {
  readonly field = input.required<FieldTree<string>>();
  readonly label = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly autocomplete = input<string>();
  readonly hint = input<string>();

  protected readonly id = `campo-${nextId++}`;
  protected readonly revealed = signal(false);

  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );
  protected readonly showError = computed(() => {
    const state = this.field()();
    return state.touched() && state.invalid();
  });
  protected readonly errorMessage = computed(() => this.field()().errors()[0]?.message ?? '');
  protected readonly describedBy = computed(() => {
    if (this.showError()) return `${this.id}-error`;
    return this.hint() ? `${this.id}-hint` : null;
  });
}
