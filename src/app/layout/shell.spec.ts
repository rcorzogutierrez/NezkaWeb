import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../testing/auth-service.mock';
import { buttonByText } from '../../testing/dom';
import { useLanguage } from '../../testing/setup';
import type { UserProfile } from '../core/users/user-profile';
import { Shell } from './shell';

describe('Shell', () => {
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(user: UserProfile) {
    auth = createAuthServiceMock(user);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', children: [] },
          { path: '', component: Shell, children: [{ path: '**', children: [] }] },
        ]),
        provideAuthServiceMock(auth),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/clients');
    page = harness.routeNativeElement as HTMLElement;
  }

  const navLabels = () => [...page.querySelectorAll('nav a')].map((a) => a.textContent?.trim());

  it('shows the work sections and marks the current one', async () => {
    await open(testUser());
    expect(navLabels()).toEqual(['Home', 'Clients', 'Products', 'Estimates', 'Catalog']);
    const current = [...page.querySelectorAll('nav a[aria-current=page]')];
    expect(current.map((a) => a.textContent?.trim())).toEqual(['Clients']);
  });

  it('adds Users for administrators only', async () => {
    await open(testUser({ role: 'admin' }));
    expect(navLabels()).toContain('Users');
  });

  it('shows who is signed in', async () => {
    await open(testUser());
    expect(page.textContent).toContain('Ana Pérez');
    expect(page.textContent).toContain('ana@example.com');
    expect(page.textContent).toContain('AP');
  });

  it('switches language from the sidebar', async () => {
    await open(testUser());
    buttonByText(page, 'es Español').click();
    await harness.fixture.whenStable();
    expect(navLabels()).toEqual(['Inicio', 'Clientes', 'Productos', 'Estimados', 'Catálogo']);
  });

  it('signs out and returns to the login page', async () => {
    await open(testUser());
    (page.querySelector('[aria-label="Sign out"]') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(auth.logout).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('opens and closes the menu on small screens', async () => {
    await open(testUser());
    const toggle = page.querySelector('[aria-controls=navigation]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await harness.fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await harness.fixture.whenStable();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });
});
