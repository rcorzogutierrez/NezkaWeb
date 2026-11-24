import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// Inject everything before the first `await`: the injection context ends there.

/** Lets users with access through; everyone else goes to login or to the no-access page. */
export const authGuard: CanMatchFn = async (_route, segments) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const status = await auth.whenSettled();
  if (status === 'active') {
    // A temporary password has to be replaced before using the app.
    return !auth.mustChangePassword() || router.createUrlTree(['/change-password']);
  }
  if (status === 'no-access') return router.createUrlTree(['/no-access']);
  const redirect = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(['/login'], {
    queryParams: redirect === '/' ? {} : { returnUrl: redirect },
  });
};

/** Only administrators. */
export const adminGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenSettled();
  return auth.isAdmin() || router.createUrlTree(['/']);
};

/** Keeps signed-in users away from the login pages. */
export const guestGuard: CanMatchFn = async () => {
  const router = inject(Router);
  const status = await inject(AuthService).whenSettled();
  if (status === 'anonymous') return true;
  return router.createUrlTree([status === 'active' ? '/' : '/no-access']);
};

/** The no-access page only makes sense for a signed-in user without access. */
export const noAccessGuard: CanMatchFn = async () => {
  const router = inject(Router);
  const status = await inject(AuthService).whenSettled();
  return status === 'no-access' || router.createUrlTree(['/']);
};

/** The first-administrator page only exists until that account is created. */
export const setupGuard: CanMatchFn = async () => {
  const router = inject(Router);
  const pending = await inject(UsersService)
    .isSetupPending()
    .catch(() => false);
  return pending || router.createUrlTree(['/login']);
};

/** Choosing a new password: any signed-in user with access. */
export const changePasswordGuard: CanMatchFn = async () => {
  const router = inject(Router);
  const status = await inject(AuthService).whenSettled();
  if (status === 'active') return true;
  return router.createUrlTree([status === 'no-access' ? '/no-access' : '/login']);
};
