import {
  Component,
  DestroyRef,
  type ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { LucideClock } from '@lucide/angular';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../core/i18n/i18n.service';
import {
  ACTIVITY_KEY,
  IDLE_WARNING_MS,
  type IdleState,
  idleState,
  readActivity,
  writeActivity,
} from '../core/session/activity';
import { UnsavedChanges } from '../core/session/unsaved-changes.service';
import { FormAlert } from '../shared/ui/form-alert';
import { NoticeService } from '../shared/ui/notice.service';

/** Activity is written for the other tabs at most this often. */
const WRITE_EVERY_MS = 5_000;

/**
 * Closes the session after 15 minutes without clicks, typing, touches or scrolling in any
 * open tab. One minute before, a dialog counts down and offers to stay signed in.
 */
@Component({
  selector: 'app-idle-logout',
  imports: [LucideClock, FormAlert],
  template: `
    <dialog
      #dialog
      role="alertdialog"
      aria-labelledby="idle-title"
      aria-describedby="idle-body"
      class="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-ink shadow-panel backdrop:bg-brand-900/40"
      (cancel)="onEscape($event)"
    >
      <div class="p-6">
        <div class="flex items-start gap-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"
            aria-hidden="true"
          >
            <svg lucideClock class="size-5"></svg>
          </span>
          <div class="min-w-0">
            <h2 id="idle-title" class="text-lg font-bold text-ink">{{ t().session.idle.title }}</h2>
            <p id="idle-body" class="mt-1 text-[0.9375rem] leading-relaxed text-ink-muted">
              {{ t().session.idle.countdown(seconds()) }}
            </p>
          </div>
        </div>
        @if (unsaved()) {
          <app-form-alert class="mt-4">{{ t().session.idle.unsaved }}</app-form-alert>
        }
      </div>
      <div
        class="flex flex-col-reverse gap-3 border-t border-line bg-canvas/60 px-6 py-4 sm:flex-row sm:justify-end"
      >
        <button type="button" class="btn-secondary" (click)="signOut(false)">
          {{ t().session.idle.signOut }}
        </button>
        <button type="button" class="btn-primary" autofocus (click)="stay()">
          {{ t().session.idle.stay }}
        </button>
      </div>
    </dialog>
  `,
  host: {
    '(document:pointerdown)': 'onActivity()',
    '(document:keydown)': 'onActivity()',
    '(window:scroll)': 'onActivity()',
    '(window:storage)': 'onStorage($event)',
    // Phones pause the timer while the browser is in the background: check again on return.
    '(document:visibilitychange)': 'tick()',
    '(window:pageshow)': 'tick()',
    '(window:focus)': 'tick()',
  },
})
export class IdleLogout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notices = inject(NoticeService);
  protected readonly t = inject(I18nService).t;
  protected readonly unsaved = inject(UnsavedChanges).any;

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly state = signal<IdleState>({ kind: 'active' });
  protected readonly seconds = computed(() => {
    const s = this.state();
    return s.kind === 'warning' ? s.seconds : IDLE_WARNING_MS / 1000;
  });

  /** Latest activity known to this tab (its own or another tab's). */
  private lastActivity: number;
  private lastWritten = 0;
  private closing = false;

  constructor() {
    // A session restored after the browser sat closed keeps its old time and closes at once.
    const stored = readActivity();
    this.lastActivity = stored ?? Date.now();
    if (stored === null) this.share(this.lastActivity);
    const timer = setInterval(() => this.tick(), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private get warningOpen(): boolean {
    return this.dialog()?.nativeElement.open === true;
  }

  private share(time: number): void {
    writeActivity(time);
    this.lastWritten = time;
  }

  protected onActivity(): void {
    // While the warning is up only "Stay signed in" counts, so a stray key does not hide it.
    if (this.closing || this.warningOpen || this.auth.status() !== 'active') return;
    const now = Date.now();
    // The first touch after the phone wakes the tab must not revive a session whose time ran out.
    const last = Math.max(this.lastActivity, readActivity() ?? 0);
    if (idleState(now - last).kind !== 'active') return this.tick();
    this.lastActivity = now;
    if (now - this.lastWritten >= WRITE_EVERY_MS) this.share(now);
  }

  protected onStorage(event: StorageEvent): void {
    if (event.key === ACTIVITY_KEY) this.tick();
  }

  protected tick(): void {
    if (this.closing) return;
    // Signed out in another tab: nothing to time until someone signs in again.
    if (this.auth.status() !== 'active') return this.closeWarning();
    this.lastActivity = Math.max(this.lastActivity, readActivity() ?? 0);
    const state = idleState(Date.now() - this.lastActivity);
    this.state.set(state);
    if (state.kind === 'warning') {
      const dialog = this.dialog()?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
    } else {
      this.closeWarning();
      if (state.kind === 'expired') void this.signOut(true);
    }
  }

  private closeWarning(): void {
    if (this.warningOpen) this.dialog()?.nativeElement.close();
  }

  protected stay(): void {
    const now = Date.now();
    this.lastActivity = now;
    this.share(now);
    this.tick();
  }

  /** Escape means the person is here: keep the session. */
  protected onEscape(event: Event): void {
    event.preventDefault();
    this.stay();
  }

  protected async signOut(idle: boolean): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    this.closeWarning();
    if (idle) this.notices.show({ tone: 'info', text: () => this.t().session.idle.signedOut });
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
