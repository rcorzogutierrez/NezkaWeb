import { TestBed } from '@angular/core/testing';
import {
  type PartialMatchRouteSnapshot,
  type Route,
  Router,
  UrlSegment,
  type UrlTree,
  provideRouter,
} from '@angular/router';
import { createAuthServiceMock, provideAuthServiceMock } from '../../../testing/auth-service.mock';
import { authGuard, guestGuard } from './auth.guards';

const route: Route = {};
const segments = (...paths: string[]) => paths.map((p) => new UrlSegment(p, {}));

function setup(signedIn: boolean) {
  const auth = createAuthServiceMock(
    signedIn ? { uid: '1', email: 'ana@ejemplo.com', displayName: 'Ana' } : null,
  );
  TestBed.configureTestingModule({ providers: [provideRouter([]), provideAuthServiceMock(auth)] });
  return TestBed.inject(Router);
}

const run = (guard: typeof authGuard, segs: UrlSegment[]) =>
  TestBed.runInInjectionContext(() =>
    guard(route, segs, {} as PartialMatchRouteSnapshot),
  ) as Promise<boolean | UrlTree>;

describe('authGuard', () => {
  it('lets signed-in users through', async () => {
    setup(true);
    expect(await run(authGuard, segments('clientes'))).toBe(true);
  });

  it('sends visitors to the login page and remembers where they were going', async () => {
    const router = setup(false);
    const result = await run(authGuard, segments('productos'));
    expect(router.serializeUrl(result as UrlTree)).toBe('/acceso?volver=%2Fproductos');
  });

  it('does not add a return path for the home page', async () => {
    const router = setup(false);
    const result = await run(authGuard, []);
    expect(router.serializeUrl(result as UrlTree)).toBe('/acceso');
  });
});

describe('guestGuard', () => {
  it('lets visitors open the login pages', async () => {
    setup(false);
    expect(await run(guestGuard, [])).toBe(true);
  });

  it('sends signed-in users to the app', async () => {
    const router = setup(true);
    const result = await run(guestGuard, []);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });
});
