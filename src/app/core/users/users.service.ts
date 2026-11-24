import { DestroyRef, Service, inject, signal } from '@angular/core';
import { type FirebaseApp, FirebaseError, getApps, initializeApp } from 'firebase/app';
import {
  type Auth,
  createUserWithEmailAndPassword,
  deleteUser,
  inMemoryPersistence,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { APP_ENVIRONMENT, FIREBASE_AUTH, createAuth } from '../firebase/firebase.providers';
import { FirestoreLoader } from '../firebase/firestore.loader';
import {
  SETUP_DOC,
  USERS_COLLECTION,
  type UserProfile,
  type UserRole,
  toUserProfile,
} from './user-profile';

export interface NewUser {
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  /**
   * Set by the administrator and handed over in person. The user must replace it at their
   * first sign-in. Without it, the person gets an email to choose their password.
   */
  readonly temporaryPassword?: string;
  /**
   * The current password of a sign-in account that already exists for this email (someone
   * deleted from the list). With it the account is reused instead of created.
   */
  readonly currentPassword?: string;
}

export interface FirstAdmin {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export type UserChanges = Partial<Pick<UserProfile, 'name' | 'role' | 'active'>>;

/** Error code when the email already belongs to someone in the list. */
export const USER_EXISTS = 'app/user-exists';

/** Name of the second Firebase app used to create accounts without signing the admin out. */
const PROVISIONING_APP = 'user-provisioning';

/** Easy to read out loud or type from a note: no 0/O, 1/l/I. */
const READABLE = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A temporary password for an administrator to hand over, like `Kp7m-x4Qz-9tRw`. */
export function temporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = [...bytes].map((b) => READABLE[b % READABLE.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}

/** A throwaway password nobody knows: the new user sets their own from the email link. */
function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...bytes));
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Accounts of the people who use the app. Everything here except the first setup is admin-only. */
@Service()
export class UsersService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly firestore = inject(FirestoreLoader);
  private readonly env = inject(APP_ENVIRONMENT);
  private provisioningAuth: Auth | null = null;

  /** Live list of users, sorted by name, while the calling component is alive. */
  watchAll(destroyRef = inject(DestroyRef)) {
    const users = signal<readonly UserProfile[] | undefined>(undefined);
    const error = signal(false);
    let stop: (() => void) | null = null;
    let destroyed = false;
    destroyRef.onDestroy(() => {
      destroyed = true;
      stop?.();
    });
    this.firestore.load().then(
      ({ db, collection, query, orderBy, onSnapshot }) => {
        if (destroyed) return;
        stop = onSnapshot(
          query(collection(db, USERS_COLLECTION), orderBy('name')),
          (snap) => users.set(snap.docs.map((d) => toUserProfile(d.id, d.data()))),
          () => error.set(true),
        );
      },
      () => error.set(true),
    );
    return { users: users.asReadonly(), error: error.asReadonly() };
  }

  /**
   * Creates the sign-in account and the profile. With a temporary password the person must
   * change it when they first sign in; otherwise they get an email to choose their password.
   * The account is created through a second Firebase app so the administrator stays signed in.
   */
  async create({ name, email, role, temporaryPassword, currentPassword }: NewUser): Promise<void> {
    const address = normalizeEmail(email);
    const { db, collection, doc, getDocs, query, setDoc, serverTimestamp, where } =
      await this.firestore.load();
    const listed = await getDocs(
      query(collection(db, USERS_COLLECTION), where('email', '==', address)),
    );
    if (!listed.empty) throw new FirebaseError(USER_EXISTS, 'That email is already in the list.');

    const password = temporaryPassword || randomPassword();
    const uid = currentPassword
      ? await this.reuseAccount(address, currentPassword, password)
      : await this.createAccount(address, password);
    await setDoc(doc(db, USERS_COLLECTION, uid), {
      name: name.trim(),
      email: address,
      role,
      active: true,
      mustChangePassword: !!temporaryPassword,
      createdAt: serverTimestamp(),
      createdBy: this.auth.currentUser?.uid ?? null,
    });
    if (!temporaryPassword) await this.sendPasswordSetup(address);
  }

  private async createAccount(email: string, password: string): Promise<string> {
    const provisioning = this.getProvisioningAuth();
    const { user } = await createUserWithEmailAndPassword(provisioning, email, password);
    await signOut(provisioning);
    return user.uid;
  }

  /**
   * Signs in to an existing account with its current password and gives it the new one. This
   * is how a deleted person comes back without the Blaze plan: the browser cannot delete or
   * reset another person's sign-in account.
   */
  private async reuseAccount(email: string, current: string, next: string): Promise<string> {
    const provisioning = this.getProvisioningAuth();
    const { user } = await signInWithEmailAndPassword(provisioning, email, current);
    try {
      if (next !== current) await updatePassword(user, next);
      return user.uid;
    } finally {
      await signOut(provisioning);
    }
  }

  /**
   * Removes the person from the app: without a profile they cannot get in. Their sign-in
   * account stays in Firebase Authentication (deleting it needs the Admin SDK), so they can be
   * added again later with the same email. Estimates keep their author's id.
   */
  async remove(uid: string): Promise<void> {
    const { db, doc, deleteDoc } = await this.firestore.load();
    await deleteDoc(doc(db, USERS_COLLECTION, uid));
  }

  async update(uid: string, changes: UserChanges): Promise<void> {
    const { db, doc, updateDoc } = await this.firestore.load();
    await updateDoc(doc(db, USERS_COLLECTION, uid), changes);
  }

  /** Emails the "choose your password" link (Firebase's password reset email). */
  async sendPasswordSetup(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  /** True until the first administrator exists. Anyone may ask. */
  async isSetupPending(): Promise<boolean> {
    const { db, doc, getDoc } = await this.firestore.load();
    const snap = await getDoc(doc(db, ...SETUP_DOC));
    return !snap.exists();
  }

  /**
   * First run only: the person creating the first account becomes administrator.
   * The security rules allow it once, while `settings/setup` does not exist.
   */
  async createFirstAdmin({ name, email, password }: FirstAdmin): Promise<void> {
    const address = normalizeEmail(email);
    const { db, doc, writeBatch, serverTimestamp } = await this.firestore.load();
    const { user } = await createUserWithEmailAndPassword(this.auth, address, password);
    const batch = writeBatch(db);
    batch.set(doc(db, USERS_COLLECTION, user.uid), {
      name: name.trim(),
      email: address,
      role: 'admin',
      active: true,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
    });
    batch.set(doc(db, ...SETUP_DOC), { admin: user.uid, createdAt: serverTimestamp() });
    try {
      await batch.commit();
    } catch (error) {
      // Someone finished the setup first: do not leave an account without a profile behind.
      await deleteUser(user).catch(() => undefined);
      throw error;
    }
  }

  private getProvisioningAuth(): Auth {
    if (!this.provisioningAuth) {
      const app: FirebaseApp =
        getApps().find((a) => a.name === PROVISIONING_APP) ??
        initializeApp(this.env.firebase, PROVISIONING_APP);
      this.provisioningAuth = createAuth(app, this.env, inMemoryPersistence);
    }
    return this.provisioningAuth;
  }
}
