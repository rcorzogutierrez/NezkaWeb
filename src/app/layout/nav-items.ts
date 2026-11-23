import {
  LucideBookOpen,
  LucideFileText,
  LucidePackage,
  LucideUsers,
  type LucideIcon,
} from '@lucide/angular';

export interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/clientes', label: 'Clientes', icon: LucideUsers },
  { path: '/productos', label: 'Productos', icon: LucidePackage },
  { path: '/estimados', label: 'Estimados', icon: LucideFileText },
  { path: '/catalogo', label: 'Catálogo', icon: LucideBookOpen },
];
