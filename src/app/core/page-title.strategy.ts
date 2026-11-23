import { Service, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n/i18n.service';

/** Looks up a dotted key such as `nav.clients` in the current catalog. */
function lookup(catalog: unknown, key: string): string | null {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      catalog,
    );
  return typeof value === 'string' ? value : null;
}

/** "Clientes · Elpidio Jr. Produce", translated, and updated when the language changes. */
@Service({ autoProvided: false })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18nService);
  private readonly key = signal<string | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      const t = this.i18n.t();
      const key = this.key();
      const page = key ? (lookup(t, key) ?? key) : null;
      this.title.setTitle(page ? `${page} · ${t.app.name}` : t.app.name);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set(this.buildTitle(snapshot));
  }
}
