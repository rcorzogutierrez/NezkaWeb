import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
} from '../../../testing/auth-service.mock';
import { Login } from './login';

describe('Login', () => {
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(url = '/acceso') {
    auth = createAuthServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'acceso', component: Login },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideAuthServiceMock(auth),
      ],
    });
    harness = await RouterTestingHarness.create(url);
    page = harness.routeNativeElement as HTMLElement;
  }

  const input = (label: string) =>
    [...page.querySelectorAll('label')]
      .find((l) => l.textContent?.trim() === label)
      ?.parentElement?.querySelector('input') as HTMLInputElement;

  function type(label: string, value: string) {
    const el = input(label);
    el.value = value;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
  }

  async function submit() {
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
  }

  it('asks for the email and password before calling Firebase', async () => {
    await open();
    await submit();
    expect(page.textContent).toContain('Escribe tu correo.');
    expect(page.textContent).toContain('Escribe tu contraseña.');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('signs in and goes to the page the user asked for', async () => {
    await open('/acceso?volver=%2Fproductos');
    type('Correo', 'ana@ejemplo.com');
    type('Contraseña', 'secreto123');
    await submit();
    expect(auth.login).toHaveBeenCalledWith('ana@ejemplo.com', 'secreto123');
    expect(TestBed.inject(Router).url).toBe('/productos');
  });

  it('shows a Spanish message when the credentials are wrong', async () => {
    await open();
    auth.login.mockRejectedValueOnce(new FirebaseError('auth/invalid-credential', 'x'));
    type('Correo', 'ana@ejemplo.com');
    type('Contraseña', 'mala');
    await submit();
    expect(page.querySelector('[role=alert]')?.textContent).toContain(
      'El correo o la contraseña no son correctos.',
    );
    expect(TestBed.inject(Router).url).toBe('/acceso');
  });
});
