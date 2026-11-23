import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';
import { en } from './messages.en';
import { type Messages, es } from './messages.es';

export type Language = 'es' | 'en';
export const LANGUAGES: readonly Language[] = ['es', 'en'];

const CATALOGS: Readonly<Record<Language, Messages>> = { es, en };
const STORAGE_KEY = 'nezka.idioma';

function storedLanguage(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'es' || value === 'en' ? value : null;
  } catch {
    return null;
  }
}

/** Spanish unless the browser asks for English. */
function browserLanguage(): Language {
  const preferred = typeof navigator === 'undefined' ? [] : (navigator.languages ?? []);
  const first = preferred.find((l) => /^(es|en)\b/i.test(l));
  return first?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/**
 * Runtime translations held in signals: switching language updates every screen at once,
 * without reloading. Texts live in typed catalogs, so a missing translation fails the build.
 */
@Service()
export class I18nService {
  private readonly document = inject(DOCUMENT);

  readonly language = signal<Language>(storedLanguage() ?? browserLanguage());
  /** The texts of the current language: `t().auth.login.title`. */
  readonly t = computed(() => CATALOGS[this.language()]);

  constructor() {
    effect(() => {
      this.document.documentElement.lang = this.language();
    });
  }

  use(language: Language): void {
    this.language.set(language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // Private mode: the choice lasts until the tab closes.
    }
  }
}
