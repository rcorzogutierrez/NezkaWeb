import { Injector, Service, computed, effect, inject, signal } from '@angular/core';
import {
  type User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase/firebase.providers';
import { FirestoreLoader } from '../firebase/firestore.loader';
import { I18nService } from '../i18n/i18n.service';
import { clearActivity } from '../session/activity';
import { USERS_COLLECTION, type UserProfile, toUserProfile } from '../users/user-profile';

/**
 * - `loading`: Firebase is still restoring the session or reading the profile.
 * - `anonymous`: nobody is signed in.
 * - `no-access`: signed in, but an administrator has not given (or has removed) access.
 * - `active`: signed in with an active profile.
 */
export type SessionStatus = 'loading' | 'anonymous' | 'no-access' | 'active';

/** Email and password session backed by Firebase Auth plus the user's profile in Firestore. */
@Service()
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly firestore = inject(FirestoreLoader);

  private readonly firebaseUser = signal<User | null | undefined>(undefined);
  private readonly profileState = signal<UserProfile | null | undefined>(undefined);
  private stopProfile: (() => void) | null = null;
  /** Bumped on every sign-in change, so a slow load never attaches to the wrong user. */
  private watchId = 0;

  readonly status = computed<SessionStatus>(() => {
    const user = this.firebaseUser();
    if (user === undefined) return 'loading';
    if (user === null) return 'anonymous';
    const profile = this.profileState();
    if (profile === undefined) return 'loading';
    return profile?.active ? 'active' : 'no-access';
  });

  /** Active profile of the signed-in user, or `null`. */
  readonly user = computed(() => (this.status() === 'active' ? this.profileState()! : null));
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  /** Signed in with a temporary password that still has to be replaced. */
  readonly mustChangePassword = computed(() => this.user()?.mustChangePassword === true);
  /** Email of whoever is signed in, even without access. */
  readonly email = computed(() => this.firebaseUser()?.email ?? '');

  private readonly injector = inject(Injector);

  constructor() {
    // Password emails go out in the language the person is using.
    const language = inject(I18nService).language;
    effect(() => (this.auth.languageCode = language()));
    onAuthStateChanged(this.auth, (user) => {
      // The next sign-in starts a fresh inactivity clock.
      if (!user) clearActivity();
      this.firebaseUser.set(user);
      this.watchProfile(user);
    });
  }

  /**
   * Reads the profile again. Needed after the first administrator creates their own profile:
   * the earlier read was denied (no profile yet) and Firestore stops a denied listener.
   */
  reloadProfile(): Promise<SessionStatus> {
    this.watchProfile(this.auth.currentUser);
    return this.whenSettled();
  }

  private watchProfile(user: User | null): void {
    const id = ++this.watchId;
    this.stopProfile?.();
    this.stopProfile = null;
    this.profileState.set(user ? undefined : null);
    if (!user) return;
    void this.firestore.load().then(
      ({ db, doc, onSnapshot }) => {
        if (id !== this.watchId) return;
        this.stopProfile = onSnapshot(
          doc(db, USERS_COLLECTION, user.uid),
          (snap) =>
            this.profileState.set(snap.exists() ? toUserProfile(snap.id, snap.data()) : null),
          // The rules deny reading the profile: treat it as no access.
          () => this.profileState.set(null),
        );
      },
      () => id === this.watchId && this.profileState.set(null),
    );
  }

  /** Resolves once the session and the profile are known, so guards never guess. */
  whenSettled(): Promise<SessionStatus> {
    // Read the signal directly: a replayed observable value could be one change behind.
    const now = this.status();
    if (now !== 'loading') return Promise.resolve(now);
    return new Promise((resolve) => {
      const watcher = effect(
        () => {
          const status = this.status();
          if (status === 'loading') return;
          watcher.destroy();
          resolve(status);
        },
        { injector: this.injector },
      );
    });
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
    await this.whenSettled();
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  /** Sets a new password for whoever is signed in and clears the temporary-password flag. */
  async changePassword(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Not signed in');
    await updatePassword(user, password);
    if (this.mustChangePassword()) {
      const { db, doc, updateDoc } = await this.firestore.load();
      await updateDoc(doc(db, USERS_COLLECTION, user.uid), { mustChangePassword: false });
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
