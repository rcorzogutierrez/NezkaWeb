import { Component, input } from '@angular/core';
import { LucideCheck, LucideHourglass } from '@lucide/angular';

/** Section that is planned but not migrated from the desktop app yet. */
@Component({
  selector: 'app-upcoming-section',
  imports: [LucideCheck, LucideHourglass],
  template: `
    <header class="max-w-3xl">
      <h1 class="text-[1.75rem] leading-tight font-bold tracking-tight text-ink">{{ title() }}</h1>
      <p class="mt-1.5 text-base text-ink-muted">{{ summary() }}</p>
    </header>

    <section
      class="mt-8 max-w-3xl rounded-2xl border border-line bg-white p-6 sm:p-8"
      aria-labelledby="pendiente"
    >
      <div class="flex items-center gap-3">
        <span class="grid size-10 place-items-center rounded-full bg-brand-50 text-brand-600">
          <svg lucideHourglass class="size-5" aria-hidden="true"></svg>
        </span>
        <h2 id="pendiente" class="text-lg font-semibold text-ink">Llega en una próxima entrega</h2>
      </div>
      <p class="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-muted">
        Esta sección todavía vive en la app de escritorio. Cuando pase a la web podrás:
      </p>
      <ul class="mt-4 space-y-2.5">
        @for (feature of features(); track feature) {
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
  readonly title = input.required<string>();
  readonly summary = input.required<string>();
  readonly features = input.required<readonly string[]>();
}
