import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideDynamicIcon,
  LucideKeyRound,
  LucideLogOut,
  LucideMenu,
  LucideX,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../core/i18n/i18n.service';
import { LanguageSwitch } from '../shared/ui/language-switch';
import { ADMIN_NAV_ITEMS, NAV_ITEMS } from './nav-items';

/** Signed-in frame: brand rule, sidebar navigation and the current page. */
@Component({
  selector: 'app-shell',
  imports: [
    NgOptimizedImage,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideDynamicIcon,
    LucideKeyRound,
    LucideLogOut,
    LucideMenu,
    LucideX,
    LanguageSwitch,
  ],
  templateUrl: './shell.html',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly t = inject(I18nService).t;
  protected readonly navItems = NAV_ITEMS;
  protected readonly adminItems = ADMIN_NAV_ITEMS;
  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly menuOpen = signal(false);
  protected readonly user = this.auth.user;
  protected readonly initials = computed(() => {
    const name = this.user()?.name || this.user()?.email || '';
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
