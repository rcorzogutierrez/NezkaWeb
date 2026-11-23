import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageSwitch } from '../../shared/ui/language-switch';

/** Split screen for the sign-in pages: the company on the left, the form on brand blue. */
@Component({
  selector: 'app-auth-layout',
  imports: [NgOptimizedImage, RouterOutlet, LanguageSwitch],
  template: `
    <div class="brand-rule" aria-hidden="true"></div>
    <div class="grid min-h-[calc(100dvh-0.5rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside class="relative hidden flex-col bg-white px-14 pt-16 pb-10 lg:flex xl:px-20">
        <img
          ngSrc="brand/logo.webp"
          width="600"
          height="253"
          priority
          [alt]="t().app.company"
          class="h-auto w-full max-w-[25rem]"
        />
        <p
          class="mt-10 max-w-[26ch] text-[1.75rem] leading-tight font-bold tracking-tight text-balance text-ink"
        >
          {{ t().auth.statement }}
        </p>
        <p class="mt-4 max-w-[46ch] text-base leading-relaxed text-ink-muted">
          {{ t().auth.pitch }}
        </p>
        <div class="mt-auto flex items-end justify-between gap-8 pt-10">
          <p class="text-sm leading-relaxed text-ink-muted">5400 NW 32nd Ct<br />Miami, FL</p>
          <img
            ngSrc="brand/frutas.webp"
            width="360"
            height="211"
            priority
            alt=""
            class="h-auto w-[min(26rem,64%)]"
          />
        </div>
      </aside>

      <main class="flex flex-col items-center justify-center bg-brand-700 px-4 py-10 sm:px-8">
        <div class="mb-5 flex w-full max-w-[26rem] justify-end">
          <app-language-switch tone="dark" />
        </div>
        <div class="w-full max-w-[26rem] rounded-2xl bg-white p-7 shadow-panel sm:p-9">
          <img
            ngSrc="brand/logo.webp"
            width="600"
            height="253"
            priority
            [alt]="t().app.company"
            class="mx-auto mb-7 h-auto w-56 lg:hidden"
          />
          <router-outlet />
        </div>
        <p class="mt-6 text-sm text-brand-100">{{ t().app.tagline }}</p>
      </main>
    </div>
  `,
})
export class AuthLayout {
  protected readonly t = inject(I18nService).t;
}
