import { Component, computed, input } from '@angular/core';
import { LucideCircleCheck, LucideCircleExclamationPoint, LucideInfo } from '@lucide/angular';

const TONE_CLASSES = {
  error: 'bg-danger-50 text-danger-700',
  success: 'bg-success-50 text-success-700',
  info: 'bg-brand-50 text-brand-800',
} as const;

/** Form-level message: a failed submit, a confirmation or a note. Announced to screen readers. */
@Component({
  selector: 'app-form-alert',
  imports: [LucideCircleExclamationPoint, LucideCircleCheck, LucideInfo],
  template: `
    <div
      [attr.role]="tone() === 'error' ? 'alert' : 'status'"
      class="flex gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-snug font-medium"
      [class]="toneClasses()"
    >
      @switch (tone()) {
        @case ('error') {
          <svg lucideCircleExclamationPoint class="mt-px size-4 shrink-0" aria-hidden="true"></svg>
        }
        @case ('info') {
          <svg lucideInfo class="mt-px size-4 shrink-0" aria-hidden="true"></svg>
        }
        @default {
          <svg lucideCircleCheck class="mt-px size-4 shrink-0" aria-hidden="true"></svg>
        }
      }
      <p><ng-content /></p>
    </div>
  `,
  host: { class: 'block' },
})
export class FormAlert {
  readonly tone = input<'error' | 'success' | 'info'>('error');
  protected readonly toneClasses = computed(() => TONE_CLASSES[this.tone()]);
}
