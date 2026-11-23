import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
} from '../../../testing/auth-service.mock';
import { Register } from './register';

describe('Register', () => {
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(async () => {
    auth = createAuthServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'acceso/registro', component: Register },
          { path: '**', children: [] },
        ]),
        provideAuthServiceMock(auth),
      ],
    });
    harness = await RouterTestingHarness.create('/acceso/registro');
    page = harness.routeNativeElement as HTMLElement;
  });

  function type(label: string, value: string) {
    const el = [...page.querySelectorAll('label')]
      .find((l) => l.textContent?.trim() === label)!
      .parentElement!.querySelector('input')!;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    el.dispatchEvent(new Event('blur'));
  }

  async function submit() {
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
  }

  it('rejects short passwords and passwords that do not match', async () => {
    type('Nombre', 'Ana');
    type('Correo', 'ana@ejemplo.com');
    type('Contraseña', 'corta');
    type('Repite la contraseña', 'otra');
    await submit();
    expect(page.textContent).toContain('La contraseña necesita al menos 8 caracteres.');
    expect(page.textContent).toContain('Las contraseñas no coinciden.');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('creates the account and opens the app', async () => {
    type('Nombre', 'Ana Pérez');
    type('Correo', 'ana@ejemplo.com');
    type('Contraseña', 'secreto123');
    type('Repite la contraseña', 'secreto123');
    await submit();
    expect(auth.register).toHaveBeenCalledWith({
      name: 'Ana Pérez',
      email: 'ana@ejemplo.com',
      password: 'secreto123',
    });
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
