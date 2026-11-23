import { Component, input } from '@angular/core';

/** Green "Active" / grey "Inactive" pill used in lists. */
@Component({
  selector: 'app-status-badge',
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      [class]="active() ? 'bg-success-50 text-success-700' : 'bg-line text-ink-muted'"
    >
      <span class="size-1.5 rounded-full bg-current" aria-hidden="true"></span>
      <ng-content />
    </span>
  `,
})
export class StatusBadge {
  readonly active = input.required<boolean>();
}
