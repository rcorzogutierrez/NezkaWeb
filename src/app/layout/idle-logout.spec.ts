import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, RouterOutlet, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  type AuthServiceMock,
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../testing/auth-service.mock';
import { buttonByText } from '../../testing/dom';
import { useLanguage } from '../../testing/setup';
import { ACTIVITY_KEY, IDLE_LIMIT_MS, readActivity } from '../core/session/activity';
import { UnsavedChanges } from '../core/session/unsaved-changes.service';
import { NoticeService } from '../shared/ui/notice.service';
import { IdleLogout } from './idle-logout';

/** A page with a form whose "unsaved" state the test controls. */
@Component({ template: '' })
class EditingPage {
  static readonly dirty = signal(false);
  constructor() {
    inject(UnsavedChanges).watch(() => EditingPage.dirty());
  }
}

@Component({
  imports: [IdleLogout, RouterOutlet],
  template: '<app-idle-logout /><router-outlet />',
})
class Host {}

describe('IdleLogout', () => {
  let auth: AuthServiceMock;
  let harness: RouterTestingHarness;
  let dialog: HTMLDialogElement;
  const minutes = (n: number) => n * 60_000;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-26T10:00:00'));
    // jsdom has no modal dialogs.
    const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    proto['showModal'] = function (this: HTMLDialogElement) {
      this.open = true;
    };
    proto['close'] = function (this: HTMLDialogElement) {
      this.open = false;
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    const proto = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    delete proto['showModal'];
    delete proto['close'];
    localStorage.clear();
    EditingPage.dirty.set(false);
  });

  async function open() {
    auth = createAuthServiceMock(testUser());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', children: [] },
          { path: 'edit', component: Host, children: [{ path: '', component: EditingPage }] },
          { path: '**', component: Host },
        ]),
        provideAuthServiceMock(auth),
      ],
    });
    useLanguage('es');
    harness = await RouterTestingHarness.create('/clients');
    dialog = (harness.fixture.nativeElement as HTMLElement).querySelector(
      'app-idle-logout dialog',
    ) as HTMLDialogElement;
  }

  async function wait(ms: number) {
    vi.advanceTimersByTime(ms);
    await harness.fixture.whenStable();
  }

  it('warns one minute before closing and counts down', async () => {
    await open();
    await wait(minutes(13) + 59_000);
    expect(dialog.open).toBe(false);
    await wait(1_000);
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Tu sesión va a cerrarse en 60 segundos');
    await wait(30_000);
    expect(dialog.textContent).toContain('en 30 segundos');
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('signs out after 15 minutes and says why on the login page', async () => {
    await open();
    await wait(IDLE_LIMIT_MS);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).url).toBe('/login');
    const notice = TestBed.inject(NoticeService).take();
    expect(notice?.tone).toBe('info');
    expect(notice?.text()).toContain('Cerramos tu sesión por inactividad');
  });

  it('activity restarts the 15 minutes', async () => {
    await open();
    await wait(minutes(10));
    document.dispatchEvent(new Event('pointerdown'));
    await wait(minutes(10));
    expect(dialog.open).toBe(false);
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('"Seguir conectado" keeps the session open', async () => {
    await open();
    await wait(minutes(14) + 10_000);
    buttonByText(dialog, 'Seguir conectado').click();
    await harness.fixture.whenStable();
    expect(dialog.open).toBe(false);
    await wait(minutes(10));
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('a key press behind the warning does not dismiss it', async () => {
    await open();
    await wait(minutes(14) + 10_000);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    await wait(1_000);
    expect(dialog.open).toBe(true);
  });

  it('"Cerrar sesión" signs out right away without the inactivity message', async () => {
    await open();
    await wait(minutes(14) + 10_000);
    buttonByText(dialog, 'Cerrar sesión').click();
    await harness.fixture.whenStable();
    expect(auth.logout).toHaveBeenCalled();
    expect(TestBed.inject(NoticeService).take()).toBeNull();
  });

  it('activity in another tab keeps this one open', async () => {
    await open();
    await wait(minutes(14) + 10_000);
    expect(dialog.open).toBe(true);
    const now = String(Date.now());
    localStorage.setItem(ACTIVITY_KEY, now);
    window.dispatchEvent(new StorageEvent('storage', { key: ACTIVITY_KEY, newValue: now }));
    await harness.fixture.whenStable();
    expect(dialog.open).toBe(false);
    await wait(minutes(10));
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('shares its own activity with the other tabs', async () => {
    await open();
    await wait(minutes(3));
    document.dispatchEvent(new Event('pointerdown'));
    expect(readActivity()).toBe(Date.now());
  });

  it('closes a session restored after more than 15 minutes away', async () => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now() - minutes(40)));
    await open();
    await wait(1_000);
    expect(auth.logout).toHaveBeenCalled();
  });

  it('warns that unsaved changes would be lost', async () => {
    await open();
    await harness.navigateByUrl('/edit');
    dialog = (harness.fixture.nativeElement as HTMLElement).querySelector(
      'app-idle-logout dialog',
    ) as HTMLDialogElement;
    EditingPage.dirty.set(true);
    await wait(minutes(14));
    expect(dialog.textContent).toContain('Tienes cambios sin guardar');
  });

  it('leaves the timing alone once signed out elsewhere', async () => {
    await open();
    auth.setUser(null);
    await wait(IDLE_LIMIT_MS + minutes(1));
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
