import type { Route, Routes } from '@angular/router';
import {
  adminGuard,
  authGuard,
  changePasswordGuard,
  guestGuard,
  noAccessGuard,
  setupGuard,
} from './core/auth/auth.guards';

const clientForm = () => import('./features/clients/client-form').then((m) => m.ClientForm);

const productForm = () => import('./features/products/product-form').then((m) => m.ProductForm);

const estimateForm = () => import('./features/estimates/estimate-form').then((m) => m.EstimateForm);

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
  authPage('change-password', 'auth.changePassword.title', [changePasswordGuard], () =>
    import('./features/auth/change-password').then((m) => m.ChangePassword),
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
        children: [
          {
            path: '',
            title: 'nav.clients',
            loadComponent: () =>
              import('./features/clients/clients-page').then((m) => m.ClientsPage),
          },
          { path: 'new', title: 'clients.form.newTitle', loadComponent: clientForm },
          {
            path: 'import',
            title: 'clients.import.title',
            loadComponent: () =>
              import('./features/clients/import-clients').then((m) => m.ImportClients),
          },
          { path: ':id', title: 'clients.form.editTitle', loadComponent: clientForm },
        ],
      },
      {
        path: 'products',
        children: [
          {
            path: '',
            title: 'nav.products',
            loadComponent: () =>
              import('./features/products/products-page').then((m) => m.ProductsPage),
          },
          { path: 'new', title: 'products.form.newTitle', loadComponent: productForm },
          { path: ':id', title: 'products.form.editTitle', loadComponent: productForm },
        ],
      },
      {
        path: 'estimates',
        children: [
          {
            path: '',
            title: 'nav.estimates',
            loadComponent: () =>
              import('./features/estimates/estimates-page').then((m) => m.EstimatesPage),
          },
          { path: 'new', title: 'estimates.form.newTitle', loadComponent: estimateForm },
          { path: ':id', title: 'estimates.form.editTitle', loadComponent: estimateForm },
        ],
      },
      {
        path: 'catalog',
        title: 'nav.catalog',
        loadComponent: () => import('./features/catalog/catalog-page').then((m) => m.CatalogPage),
      },
      {
        path: 'import',
        canMatch: [adminGuard],
        title: 'desktopImport.title',
        loadComponent: () =>
          import('./features/desktop-import/desktop-import').then((m) => m.DesktopImport),
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
