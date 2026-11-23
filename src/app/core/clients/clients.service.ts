import { DestroyRef, Service, inject, signal } from '@angular/core';
import { FIREBASE_AUTH } from '../firebase/firebase.providers';
import { FirestoreLoader } from '../firebase/firestore.loader';
import {
  CLIENTS_COLLECTION,
  type Client,
  type ClientData,
  fold,
  normalizeClient,
  toClient,
} from './client';

/** Customers in Firestore. Every active user reads and edits them; only admins delete. */
@Service()
export class ClientsService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly firestore = inject(FirestoreLoader);

  /** Live list of clients, sorted by name, while the calling component is alive. */
  watchAll(destroyRef = inject(DestroyRef)) {
    const clients = signal<readonly Client[] | undefined>(undefined);
    const error = signal(false);
    let stop: (() => void) | null = null;
    let destroyed = false;
    destroyRef.onDestroy(() => {
      destroyed = true;
      stop?.();
    });
    this.firestore.load().then(
      ({ db, collection, onSnapshot }) => {
        if (destroyed) return;
        stop = onSnapshot(
          collection(db, CLIENTS_COLLECTION),
          (snap) =>
            clients.set(
              snap.docs
                .map((d) => toClient(d.id, d.data()))
                .sort((a, b) => fold(a.name).localeCompare(fold(b.name))),
            ),
          () => error.set(true),
        );
      },
      () => error.set(true),
    );
    return { clients: clients.asReadonly(), error: error.asReadonly() };
  }

  async get(id: string): Promise<Client | null> {
    const { db, doc, getDoc } = await this.firestore.load();
    const snap = await getDoc(doc(db, CLIENTS_COLLECTION, id));
    return snap.exists() ? toClient(snap.id, snap.data()) : null;
  }

  /** True when another client already has this name (ignoring case and accents). */
  async nameTaken(name: string, exceptId?: string): Promise<boolean> {
    const { db, collection, getDocs } = await this.firestore.load();
    const wanted = fold(name);
    const snap = await getDocs(collection(db, CLIENTS_COLLECTION));
    return snap.docs.some(
      (d) => d.id !== exceptId && fold(String(d.data()['name'] ?? '')) === wanted,
    );
  }

  /** Saves a new client and returns its id. */
  async create(data: ClientData): Promise<string> {
    const { db, collection, doc, setDoc, serverTimestamp } = await this.firestore.load();
    const ref = doc(collection(db, CLIENTS_COLLECTION));
    const uid = this.auth.currentUser?.uid ?? null;
    await setDoc(ref, {
      ...normalizeClient(data),
      createdAt: serverTimestamp(),
      createdBy: uid,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
    return ref.id;
  }

  /** Saves many clients at once (QuickBooks import), in batches of 400 writes. */
  async createMany(list: readonly ClientData[]): Promise<void> {
    const { db, collection, doc, writeBatch, serverTimestamp } = await this.firestore.load();
    const uid = this.auth.currentUser?.uid ?? null;
    for (let start = 0; start < list.length; start += 400) {
      const batch = writeBatch(db);
      for (const data of list.slice(start, start + 400)) {
        batch.set(doc(collection(db, CLIENTS_COLLECTION)), {
          ...normalizeClient(data),
          createdAt: serverTimestamp(),
          createdBy: uid,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      }
      await batch.commit();
    }
  }

  async update(id: string, data: ClientData): Promise<void> {
    const { db, doc, updateDoc, serverTimestamp } = await this.firestore.load();
    await updateDoc(doc(db, CLIENTS_COLLECTION, id), {
      ...normalizeClient(data),
      updatedAt: serverTimestamp(),
      updatedBy: this.auth.currentUser?.uid ?? null,
    });
  }

  async setActive(id: string, active: boolean): Promise<void> {
    const { db, doc, updateDoc, serverTimestamp } = await this.firestore.load();
    await updateDoc(doc(db, CLIENTS_COLLECTION, id), {
      active,
      updatedAt: serverTimestamp(),
      updatedBy: this.auth.currentUser?.uid ?? null,
    });
  }

  /** Administrators only (enforced by the rules). */
  async remove(id: string): Promise<void> {
    const { db, doc, deleteDoc } = await this.firestore.load();
    await deleteDoc(doc(db, CLIENTS_COLLECTION, id));
  }
}
