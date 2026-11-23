import { Component, computed, inject, input } from '@angular/core';
import { LucideCheck, LucideHourglass } from '@lucide/angular';
import { I18nService } from '../../core/i18n/i18n.service';

export type UpcomingKey = 'products' | 'estimates' | 'catalog';

/** Section that is planned but not migrated from the desktop app yet. */
@Component({
  selector: 'app-upcoming-section',
  imports: [LucideCheck, LucideHourglass],
  template: `
    <header class="max-w-3xl">
      <h1 class="text-[1.75rem] leading-tight font-bold tracking-tight text-ink">
        {{ t().nav[section()] }}
      </h1>
      <p class="mt-1.5 text-base text-ink-muted">{{ copy().summary }}</p>
    </header>

    <section
      class="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 sm:p-8"
      aria-labelledby="upcoming"
    >
      <div class="flex items-center gap-3">
        <span class="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-600">
          <svg lucideHourglass class="size-5" aria-hidden="true"></svg>
        </span>
        <h2 id="upcoming" class="text-lg font-semibold text-ink">{{ t().upcoming.heading }}</h2>
      </div>
      <p class="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-muted">
        {{ t().upcoming.intro }}
      </p>
      <ul class="mt-4 space-y-2.5">
        @for (feature of copy().features; track $index) {
          <li class="flex gap-2.5 text-[0.9375rem] text-ink">
            <svg lucideCheck class="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true"></svg>
            {{ feature }}
          </li>
        }
      </ul>
    </section>
  `,
})
export class UpcomingSection {
  /** Set from the route's `data`. */
  readonly section = input.required<UpcomingKey>();

  protected readonly t = inject(I18nService).t;
  protected readonly copy = computed(() => this.t().upcoming[this.section()]);
}
