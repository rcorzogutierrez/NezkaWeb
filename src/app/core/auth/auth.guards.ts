import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Lets signed-in users through; sends everyone else to the login page. */
export const authGuard: CanMatchFn = async (_route, segments) => {
  const router = inject(Router);
  if (await inject(AuthService).ready()) {
    return true;
  }
  const redirect = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(['/acceso'], {
    queryParams: redirect === '/' ? {} : { volver: redirect },
  });
};

/** Keeps signed-in users away from the login and sign-up pages. */
export const guestGuard: CanMatchFn = async () => {
  const router = inject(Router);
  return (await inject(AuthService).ready()) ? router.createUrlTree(['/']) : true;
};
