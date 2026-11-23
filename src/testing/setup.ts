import { TestBed } from '@angular/core/testing';
import { I18nService, type Language } from '../app/core/i18n/i18n.service';

/** Pins the UI language for a test (jsdom reports an English browser). */
export function useLanguage(language: Language): void {
  TestBed.inject(I18nService).use(language);
}
