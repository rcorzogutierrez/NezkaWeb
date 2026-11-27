import { TestBed } from '@angular/core/testing';
import type { User } from 'firebase/auth';
import { useLanguage } from '../../../testing/setup';
import { NoticeService } from '../../shared/ui/notice.service';
import { FIREBASE_AUTH } from '../firebase/firebase.providers';
import { FirestoreLoader } from '../firebase/firestore.loader';
import { ACTIVITY_KEY, IDLE_LIMIT_MS, readActivity } from '../session/activity';
import { AuthService } from './auth.service';

describe('AuthService session restore', () => {
  let emit: (user: User | null) => void;
  // Stand-in for the Firebase Auth instance: the SDK functions call these methods.
  const signOut = vi.fn(async () => undefined);
  const fakeAuth = {
    onAuthStateChanged: (next: (user: User | null) => void) => {
      emit = next;
      return () => undefined;
    },
    signOut,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FIREBASE_AUTH, useValue: fakeAuth },
        // The profile never loads: these tests only look at the restore check.
        { provide: FirestoreLoader, useValue: { load: () => new Promise(() => undefined) } },
      ],
    });
    useLanguage('es');
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const user = { uid: 'ana', email: 'ana@example.com' } as User;

  it('signs out a session restored more than 15 minutes after the last activity', () => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now() - IDLE_LIMIT_MS - 1));
    const auth = TestBed.inject(AuthService);
    emit(user);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(auth.status()).toBe('loading');
    expect(TestBed.inject(NoticeService).take()?.text()).toContain(
      'Cerramos tu sesión por inactividad',
    );
  });

  it('keeps a session restored within the 15 minutes', () => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now() - 60_000));
    TestBed.inject(AuthService);
    emit(user);
    expect(signOut).not.toHaveBeenCalled();
  });

  it('a new sign-in starts with a fresh clock', async () => {
    localStorage.setItem(ACTIVITY_KEY, String(Date.now() - IDLE_LIMIT_MS * 10));
    const auth = TestBed.inject(AuthService);
    emit(null);
    localStorage.setItem(ACTIVITY_KEY, String(Date.now() - IDLE_LIMIT_MS * 10));
    // The fake cannot sign in; only the clock cleared beforehand matters here.
    await auth.login('ana@example.com', 'secret').catch(() => undefined);
    expect(readActivity()).toBeNull();
  });
});
