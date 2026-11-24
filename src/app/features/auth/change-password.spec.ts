import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../../testing/auth-service.mock';
import { buttonByText, submit, type } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import { NoticeService } from '../../shared/ui/notice.service';
import { ChangePassword } from './change-password';

describe('ChangePassword', () => {
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(mustChangePassword: boolean) {
    auth = createAuthServiceMock(testUser({ mustChangePassword }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'change-password', component: ChangePassword },
          { path: 'login', children: [] },
          { path: '', children: [] },
        ]),
        provideAuthServiceMock(auth),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/change-password');
    page = harness.routeNativeElement as HTMLElement;
  }

  async function send() {
    submit(page);
    await harness.fixture.whenStable();
  }

  it('asks for a new password after signing in with a temporary one', async () => {
    await open(true);
    expect(page.querySelector('h1')?.textContent).toContain('Choose your password');
    expect(page.textContent).toContain('temporary password');
    type(page, 'New password', 'MiClave2026');
    type(page, 'Repeat the password', 'MiClave2026');
    await send();
    expect(auth.changePassword).toHaveBeenCalledWith('MiClave2026');
    expect(TestBed.inject(Router).url).toBe('/');
    expect(TestBed.inject(NoticeService).take()?.text()).toBe('Your new password was saved.');
  });

  it('checks length and that both passwords match', async () => {
    await open(true);
    type(page, 'New password', 'corta');
    type(page, 'Repeat the password', 'otra');
    await send();
    expect(auth.changePassword).not.toHaveBeenCalled();
    expect(page.textContent).toContain('Use at least 6 characters.');
  });

  it('explains when Firebase wants a fresh sign-in', async () => {
    await open(false);
    expect(page.querySelector('h1')?.textContent).toContain('Change your password');
    auth.changePassword.mockRejectedValue(new FirebaseError('auth/requires-recent-login', 'x'));
    type(page, 'New password', 'MiClave2026');
    type(page, 'Repeat the password', 'MiClave2026');
    await send();
    expect(page.textContent).toContain('sign out and sign in again');
  });

  it('can sign out instead', async () => {
    await open(true);
    buttonByText(page, 'Sign out').click();
    await harness.fixture.whenStable();
    expect(auth.logout).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
