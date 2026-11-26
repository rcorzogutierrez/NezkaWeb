import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
} from '../../../testing/auth-service.mock';
import { submit, type } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import {
  createUsersServiceMock,
  provideUsersServiceMock,
} from '../../../testing/users-service.mock';
import type { Language } from '../../core/i18n/i18n.service';
import { NoticeService } from '../../shared/ui/notice.service';
import { Login } from './login';

describe('Login', () => {
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(
    url = '/login',
    {
      setupPending = false,
      language = 'en',
      notice,
    }: { setupPending?: boolean; language?: Language; notice?: string } = {},
  ) {
    auth = createAuthServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'login', component: Login },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideAuthServiceMock(auth),
        provideUsersServiceMock(createUsersServiceMock([], setupPending)),
      ],
    });
    useLanguage(language);
    if (notice) TestBed.inject(NoticeService).show({ tone: 'info', text: () => notice });
    harness = await RouterTestingHarness.create(url);
    page = harness.routeNativeElement as HTMLElement;
  }

  async function send() {
    submit(page);
    await harness.fixture.whenStable();
  }

  it('asks for the email and password before calling Firebase', async () => {
    await open();
    await send();
    expect(page.textContent).toContain('This field is required.');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('signs in and goes to the page the user asked for', async () => {
    await open('/login?returnUrl=%2Fproducts');
    type(page, 'Email', 'ana@example.com');
    type(page, 'Password', 'secret123');
    await send();
    expect(auth.login).toHaveBeenCalledWith('ana@example.com', 'secret123');
    expect(TestBed.inject(Router).url).toBe('/products');
  });

  it('explains wrong credentials in the current language', async () => {
    await open('/login', { language: 'es' });
    auth.login.mockRejectedValueOnce(new FirebaseError('auth/invalid-credential', 'x'));
    type(page, 'Correo', 'ana@example.com');
    type(page, 'Contraseña', 'wrong');
    await send();
    expect(page.querySelector('[role=alert]')?.textContent).toContain(
      'El correo o la contraseña no son correctos.',
    );
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('points to the administrator instead of a sign-up form', async () => {
    await open();
    expect(page.textContent).toContain('Ask your administrator');
    expect(page.querySelector('a[href="/setup"]')).toBeNull();
  });

  it('offers the first-administrator setup on a fresh install', async () => {
    await open('/login', { setupPending: true });
    await harness.fixture.whenStable();
    expect(page.querySelector('a[href="/setup"]')?.textContent).toContain(
      'Create the administrator account',
    );
  });

  it('says why the session was closed', async () => {
    await open('/login', { notice: 'We signed you out after 15 minutes of inactivity.' });
    const alert = page.querySelector('[role=status]');
    expect(alert?.textContent).toContain('We signed you out after 15 minutes of inactivity.');
  });
});
