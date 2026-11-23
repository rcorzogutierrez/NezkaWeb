import { Component, input } from '@angular/core';
import { LucideCircleExclamationPoint, LucideCircleCheck } from '@lucide/angular';

/** Form-level message: a failed submit or a confirmation. Announced to screen readers. */
@Component({
  selector: 'app-form-alert',
  imports: [LucideCircleExclamationPoint, LucideCircleCheck],
  template: `
    <div
      [attr.role]="tone() === 'error' ? 'alert' : 'status'"
      class="flex gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-snug font-medium"
      [class]="
        tone() === 'error' ? 'bg-danger-50 text-danger-700' : 'bg-success-50 text-success-700'
      "
    >
      @if (tone() === 'error') {
        <svg lucideCircleExclamationPoint class="mt-px size-4 shrink-0" aria-hidden="true"></svg>
      } @else {
        <svg lucideCircleCheck class="mt-px size-4 shrink-0" aria-hidden="true"></svg>
      }
      <p><ng-content /></p>
    </div>
  `,
  host: { class: 'block' },
})
export class FormAlert {
  readonly tone = input<'error' | 'success'>('error');
}
