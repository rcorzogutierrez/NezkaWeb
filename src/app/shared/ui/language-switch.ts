import { Component, inject, input } from '@angular/core';
import { I18nService, LANGUAGES } from '../../core/i18n/i18n.service';

/** ES | EN segmented control. Each option names its language in that language. */
@Component({
  selector: 'app-language-switch',
  template: `
    <div
      role="group"
      [attr.aria-label]="t().language.label"
      class="inline-flex rounded-lg p-0.5"
      [class]="tone() === 'dark' ? 'bg-white/10' : 'bg-canvas'"
    >
      @for (lang of languages; track lang) {
        <button
          type="button"
          [attr.lang]="lang"
          [attr.aria-pressed]="i18n.language() === lang"
          [attr.title]="t().language[lang]"
          class="h-8 min-w-10 rounded-md px-2.5 text-xs font-bold tracking-wide uppercase transition-colors duration-150 pointer-coarse:h-11 pointer-coarse:min-w-11"
          [class]="buttonClass(lang)"
          (click)="i18n.use(lang)"
        >
          {{ lang }}
          <span class="sr-only">{{ t().language[lang] }}</span>
        </button>
      }
    </div>
  `,
  host: { class: 'inline-block' },
})
export class LanguageSwitch {
  protected readonly i18n = inject(I18nService);
  protected readonly t = this.i18n.t;
  protected readonly languages = LANGUAGES;
  readonly tone = input<'light' | 'dark'>('light');

  protected buttonClass(lang: string): string {
    const active = this.i18n.language() === lang;
    if (this.tone() === 'dark') {
      return active ? 'bg-white text-brand-800' : 'text-brand-100 hover:text-white';
    }
    return active ? 'bg-white text-brand-700 shadow-xs' : 'text-ink-muted hover:text-ink';
  }
}
