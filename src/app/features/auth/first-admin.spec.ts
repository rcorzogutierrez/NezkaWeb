import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
} from '../../../testing/auth-service.mock';
import { submit, type } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import {
  type UsersServiceMock,
  createUsersServiceMock,
  provideUsersServiceMock,
} from '../../../testing/users-service.mock';
import { FirstAdmin } from './first-admin';

describe('FirstAdmin', () => {
  let users: UsersServiceMock;
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(async () => {
    users = createUsersServiceMock([], true);
    auth = createAuthServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'setup', component: FirstAdmin },
          { path: '**', children: [] },
        ]),
        provideUsersServiceMock(users),
        provideAuthServiceMock(auth),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/setup');
    page = harness.routeNativeElement as HTMLElement;
  });

  async function send() {
    submit(page);
    await harness.fixture.whenStable();
  }

  it('rejects short passwords and passwords that do not match', async () => {
    type(page, 'Name', 'Ana');
    type(page, 'Email', 'ana@example.com');
    type(page, 'Password', 'short');
    type(page, 'Repeat the password', 'other');
    await send();
    expect(page.textContent).toContain('Use at least 8 characters.');
    expect(page.textContent).toContain('The passwords do not match.');
    expect(users.createFirstAdmin).not.toHaveBeenCalled();
  });

  it('creates the administrator and opens the app', async () => {
    type(page, 'Name', 'Ana Pérez');
    type(page, 'Email', 'ana@example.com');
    type(page, 'Password', 'secret123');
    type(page, 'Repeat the password', 'secret123');
    await send();
    expect(users.createFirstAdmin).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'secret123',
    });
    expect(auth.reloadProfile).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
