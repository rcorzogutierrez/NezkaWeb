import { Component, computed, input } from '@angular/core';
import type { EstimateStatus } from '../../core/estimates/estimate';

const TONES: Record<EstimateStatus, string> = {
  draft: 'bg-line text-ink-muted',
  sent: 'bg-brand-50 text-brand-700',
  accepted: 'bg-success-50 text-success-700',
  rejected: 'bg-danger-50 text-danger-700',
};

/** Pill with the estimate's status; the text comes from the parent so it is translated. */
@Component({
  selector: 'app-estimate-status-badge',
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      [class]="tone()"
    >
      <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
      <ng-content />
    </span>
  `,
})
export class EstimateStatusBadge {
  readonly status = input.required<EstimateStatus>();
  protected readonly tone = computed(() => TONES[this.status()]);
}
