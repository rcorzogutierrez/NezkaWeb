import { Service, computed, inject, signal } from '@angular/core';
import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { FIREBASE_AUTH } from '../firebase/firebase.providers';

export interface SessionUser {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
}

export interface Registration {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

function toSessionUser(user: User): SessionUser {
  const email = user.email ?? '';
  return { uid: user.uid, email, displayName: user.displayName?.trim() || email };
}

/** Email and password session backed by Firebase Auth, exposed as signals. */
@Service()
export class AuthService {
  private readonly auth = inject(FIREBASE_AUTH);

  /** `undefined` while Firebase restores the session, `null` when signed out. */
  private readonly state = signal<SessionUser | null | undefined>(undefined);

  readonly user = computed(() => this.state() ?? null);
  readonly isAuthenticated = computed(() => this.state() != null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => this.state.set(user ? toSessionUser(user) : null));
  }

  /** Resolves once the persisted session is known, so guards never guess. */
  async ready(): Promise<boolean> {
    await this.auth.authStateReady();
    return this.auth.currentUser !== null;
  }

  async login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  async register({ name, email, password }: Registration): Promise<void> {
    const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
    await updateProfile(user, { displayName: name.trim() });
    // onAuthStateChanged fired before the profile had a name.
    this.state.set(toSessionUser(user));
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
  }
}
