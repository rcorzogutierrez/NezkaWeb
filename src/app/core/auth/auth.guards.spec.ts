import { TestBed } from '@angular/core/testing';
import {
  type PartialMatchRouteSnapshot,
  type Route,
  Router,
  UrlSegment,
  type UrlTree,
  provideRouter,
} from '@angular/router';
import {
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../../testing/auth-service.mock';
import {
  createUsersServiceMock,
  provideUsersServiceMock,
} from '../../../testing/users-service.mock';
import type { UserProfile } from '../users/user-profile';
import { adminGuard, authGuard, guestGuard, noAccessGuard, setupGuard } from './auth.guards';

const segments = (...paths: string[]) => paths.map((p) => new UrlSegment(p, {}));

function setup(profile: UserProfile | null, { noAccess = false, setupPending = false } = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideAuthServiceMock(createAuthServiceMock(profile, noAccess)),
      provideUsersServiceMock(createUsersServiceMock([], setupPending)),
    ],
  });
  return TestBed.inject(Router);
}

async function url(guard: typeof authGuard, segs: UrlSegment[] = []) {
  const result = await (TestBed.runInInjectionContext(() =>
    guard({} as Route, segs, {} as PartialMatchRouteSnapshot),
  ) as Promise<boolean | UrlTree>);
  return result === true ? true : TestBed.inject(Router).serializeUrl(result as UrlTree);
}

describe('authGuard', () => {
  it('lets users with access through', async () => {
    setup(testUser());
    expect(await url(authGuard, segments('clients'))).toBe(true);
  });

  it('sends visitors to sign in and remembers where they were going', async () => {
    setup(null);
    expect(await url(authGuard, segments('products'))).toBe('/login?returnUrl=%2Fproducts');
    expect(await url(authGuard)).toBe('/login');
  });

  it('sends signed-in people without access to the no-access page', async () => {
    setup(testUser({ active: false }));
    expect(await url(authGuard, segments('clients'))).toBe('/no-access');
  });
});

describe('adminGuard', () => {
  it('only lets administrators in', async () => {
    setup(testUser({ role: 'admin' }));
    expect(await url(adminGuard)).toBe(true);
  });

  it('sends regular users home', async () => {
    setup(testUser());
    expect(await url(adminGuard)).toBe('/');
  });
});

describe('guestGuard', () => {
  it('lets visitors see the sign-in pages', async () => {
    setup(null);
    expect(await url(guestGuard)).toBe(true);
  });

  it('sends signed-in users to the app or the no-access page', async () => {
    setup(testUser());
    expect(await url(guestGuard)).toBe('/');
    TestBed.resetTestingModule();
    setup(null, { noAccess: true });
    expect(await url(guestGuard)).toBe('/no-access');
  });
});

describe('noAccessGuard', () => {
  it('only shows the page to people without access', async () => {
    setup(null, { noAccess: true });
    expect(await url(noAccessGuard)).toBe(true);
    TestBed.resetTestingModule();
    setup(testUser());
    expect(await url(noAccessGuard)).toBe('/');
  });
});

describe('setupGuard', () => {
  it('opens the first-admin page only while no administrator exists', async () => {
    setup(null, { setupPending: true });
    expect(await url(setupGuard)).toBe(true);
    TestBed.resetTestingModule();
    setup(null, { setupPending: false });
    expect(await url(setupGuard)).toBe('/login');
  });
});
