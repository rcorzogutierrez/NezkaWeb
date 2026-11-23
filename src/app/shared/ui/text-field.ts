import { Component, computed, inject, input, signal } from '@angular/core';
import { type FieldTree, FormField } from '@angular/forms/signals';
import { LucideEye, LucideEyeOff } from '@lucide/angular';
import { I18nService } from '../../core/i18n/i18n.service';

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
        [attr.inputmode]="type() === 'email' || type() === 'tel' ? type() : null"
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
          [attr.aria-label]="revealed() ? t().auth.hidePassword : t().auth.showPassword"
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
  readonly type = input<'text' | 'email' | 'password' | 'tel'>('text');
  readonly autocomplete = input<string>();
  readonly hint = input<string>();

  protected readonly t = inject(I18nService).t;
  protected readonly id = `field-${nextId++}`;
  protected readonly revealed = signal(false);

  protected readonly inputType = computed(() =>
    this.type() === 'password' && this.revealed() ? 'text' : this.type(),
  );
  protected readonly showError = computed(() => {
    const state = this.field()();
    return state.touched() && state.invalid();
  });
  /** Validation errors are translated by kind, so they follow the language switch. */
  protected readonly errorMessage = computed(() => {
    const error = this.field()().errors()[0];
    if (!error) return '';
    const v = this.t().validation;
    switch (error.kind) {
      case 'required':
        return v.required;
      case 'email':
        return v.email;
      case 'minLength':
        return v.minLength((error as unknown as { minLength: number }).minLength);
      case 'mismatch':
        return v.mismatch;
      case 'maxLength':
        return v.maxLength((error as unknown as { maxLength: number }).maxLength);
      default:
        return error.message ?? '';
    }
  });
  protected readonly describedBy = computed(() => {
    if (this.showError()) return `${this.id}-error`;
    return this.hint() ? `${this.id}-hint` : null;
  });
}
