import type { Route, Routes } from '@angular/router';
import {
  adminGuard,
  authGuard,
  guestGuard,
  noAccessGuard,
  setupGuard,
} from './core/auth/auth.guards';

const upcoming = () =>
  import('./features/placeholder/upcoming-section').then((m) => m.UpcomingSection);

/**
 * Every URL is in English. `title` holds a key under `nav`/`auth` that PageTitleStrategy
 * translates.
 */
const authLayout = () => import('./features/auth/auth-layout').then((m) => m.AuthLayout);

/** A sign-in page inside the split-screen layout. */
function authPage(
  path: string,
  title: string,
  canMatch: Route['canMatch'],
  loadComponent: Route['loadComponent'],
): Route {
  return {
    path,
    canMatch,
    loadComponent: authLayout,
    children: [{ path: '', title, loadComponent }],
  };
}

export const routes: Routes = [
  authPage('login', 'auth.login.title', [guestGuard], () =>
    import('./features/auth/login').then((m) => m.Login),
  ),
  authPage('forgot-password', 'auth.reset.title', [guestGuard], () =>
    import('./features/auth/reset-password').then((m) => m.ResetPassword),
  ),
  authPage('setup', 'auth.setup.title', [guestGuard, setupGuard], () =>
    import('./features/auth/first-admin').then((m) => m.FirstAdmin),
  ),
  authPage('no-access', 'auth.noAccess.title', [noAccessGuard], () =>
    import('./features/auth/no-access').then((m) => m.NoAccess),
  ),
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'clients' },
      {
        path: 'clients',
        title: 'nav.clients',
        loadComponent: upcoming,
        data: { section: 'clients' },
      },
      {
        path: 'products',
        title: 'nav.products',
        loadComponent: upcoming,
        data: { section: 'products' },
      },
      {
        path: 'estimates',
        title: 'nav.estimates',
        loadComponent: upcoming,
        data: { section: 'estimates' },
      },
      {
        path: 'catalog',
        title: 'nav.catalog',
        loadComponent: upcoming,
        data: { section: 'catalog' },
      },
      {
        path: 'users',
        canMatch: [adminGuard],
        children: [
          {
            path: '',
            title: 'nav.users',
            loadComponent: () => import('./features/users/users-page').then((m) => m.UsersPage),
          },
          {
            path: 'new',
            title: 'users.form.title',
            loadComponent: () => import('./features/users/new-user').then((m) => m.NewUser),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
