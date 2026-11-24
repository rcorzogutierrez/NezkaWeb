import {
  LucideBookOpen,
  LucideDatabase,
  LucideFileText,
  LucidePackage,
  LucideUserCog,
  LucideUsers,
  type LucideIcon,
} from '@lucide/angular';
import type { Messages } from '../core/i18n/messages.es';

export interface NavItem {
  readonly path: string;
  readonly label: keyof Messages['nav'];
  readonly icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/clients', label: 'clients', icon: LucideUsers },
  { path: '/products', label: 'products', icon: LucidePackage },
  { path: '/estimates', label: 'estimates', icon: LucideFileText },
  { path: '/catalog', label: 'catalog', icon: LucideBookOpen },
];

export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { path: '/users', label: 'users', icon: LucideUserCog },
  { path: '/import', label: 'import', icon: LucideDatabase },
];
