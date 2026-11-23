import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { en } from './messages.en';
import { es } from './messages.es';

describe('I18nService', () => {
  beforeEach(() => localStorage.clear());

  it('switches every text and the page language at once', () => {
    const i18n = TestBed.inject(I18nService);
    i18n.use('es');
    TestBed.tick();
    expect(i18n.t().nav.clients).toBe('Clientes');
    expect(document.documentElement.lang).toBe('es');

    i18n.use('en');
    TestBed.tick();
    expect(i18n.t().nav.clients).toBe('Clients');
    expect(document.documentElement.lang).toBe('en');
  });

  it('remembers the choice for the next visit', () => {
    TestBed.inject(I18nService).use('en');
    expect(localStorage.getItem('nezka.idioma')).toBe('en');
  });

  it('has the same texts in both languages', () => {
    const shape = (value: unknown): unknown =>
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
        : Array.isArray(value)
          ? value.length
          : typeof value;
    expect(shape(en)).toEqual(shape(es));
  });
});
