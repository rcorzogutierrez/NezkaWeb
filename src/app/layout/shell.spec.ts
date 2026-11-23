import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
} from '../../testing/auth-service.mock';
import { Shell } from './shell';

describe('Shell', () => {
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(async () => {
    auth = createAuthServiceMock({ uid: '1', email: 'ana@ejemplo.com', displayName: 'Ana Pérez' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'acceso', children: [] },
          { path: '', component: Shell, children: [{ path: 'clientes', children: [] }] },
        ]),
        provideAuthServiceMock(auth),
      ],
    });
    harness = await RouterTestingHarness.create('/clientes');
    page = harness.routeNativeElement as HTMLElement;
  });

  it('shows every section and marks the current one', () => {
    const links = [...page.querySelectorAll('nav a')];
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Clientes',
      'Productos',
      'Estimados',
      'Catálogo',
    ]);
    expect(links[0].getAttribute('aria-current')).toBe('page');
  });

  it('shows who is signed in', () => {
    expect(page.textContent).toContain('Ana Pérez');
    expect(page.textContent).toContain('ana@ejemplo.com');
    expect(page.textContent).toContain('AP');
  });

  it('signs out and returns to the login page', async () => {
    (page.querySelector('[aria-label="Cerrar sesión"]') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(auth.logout).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/acceso');
  });

  it('opens and closes the menu on small screens', async () => {
    const toggle = page.querySelector('[aria-controls=navegacion]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await harness.fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await harness.fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
