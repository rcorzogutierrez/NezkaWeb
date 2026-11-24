import { DestroyRef, Service, inject, signal } from '@angular/core';
import type { Client } from '../clients/client';
import { FIREBASE_AUTH } from '../firebase/firebase.providers';
import { FirestoreLoader } from '../firebase/firestore.loader';
import {
  ESTIMATES_COLLECTION,
  type Estimate,
  type EstimateData,
  compareEstimates,
  nextNumber,
  normalizeEstimate,
  toEstimate,
  totals,
} from './estimate';

/** Estimates (proformas) in Firestore. Every active user reads and edits them; admins delete. */
@Service()
export class EstimatesService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly firestore = inject(FirestoreLoader);

  /** Live list, newest first, while the calling component is alive. */
  watchAll(destroyRef = inject(DestroyRef)) {
    const estimates = signal<readonly Estimate[] | undefined>(undefined);
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
          collection(db, ESTIMATES_COLLECTION),
          (snap) =>
            estimates.set(snap.docs.map((d) => toEstimate(d.id, d.data())).sort(compareEstimates)),
          () => error.set(true),
        );
      },
      () => error.set(true),
    );
    return { estimates: estimates.asReadonly(), error: error.asReadonly() };
  }

  async get(id: string): Promise<Estimate | null> {
    const { db, doc, getDoc } = await this.firestore.load();
    const snap = await getDoc(doc(db, ESTIMATES_COLLECTION, id));
    return snap.exists() ? toEstimate(snap.id, snap.data()) : null;
  }

  private async numbers(exceptId?: string): Promise<string[]> {
    const { db, collection, getDocs } = await this.firestore.load();
    const snap = await getDocs(collection(db, ESTIMATES_COLLECTION));
    return snap.docs.filter((d) => d.id !== exceptId).map((d) => String(d.data()['number'] ?? ''));
  }

  /** The next free PF-<year>-NNNN number. */
  async nextNumber(year: number): Promise<string> {
    return nextNumber(year, await this.numbers());
  }

  /** True when another estimate already uses this number (ignoring case). */
  async numberTaken(number: string, exceptId?: string): Promise<boolean> {
    const wanted = number.trim().toLowerCase();
    return (await this.numbers(exceptId)).some((n) => n.trim().toLowerCase() === wanted);
  }

  /** Creates or updates an estimate. Returns its id. */
  async save(
    id: string | undefined,
    data: EstimateData,
    client: Pick<Client, 'name' | 'branch'>,
  ): Promise<string> {
    const { db, collection, doc, setDoc, updateDoc, serverTimestamp } = await this.firestore.load();
    const ref = id ? doc(db, ESTIMATES_COLLECTION, id) : doc(collection(db, ESTIMATES_COLLECTION));
    const uid = this.auth.currentUser?.uid ?? null;
    const clean = normalizeEstimate(data);
    const sums = totals(clean.lines);
    const values = {
      ...clean,
      lines: clean.lines.map((l) => ({ ...l })),
      clientName: client.name,
      clientBranch: client.branch,
      totalBoxes: sums.boxes,
      total: sums.total,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    };
    if (id) await updateDoc(ref, values);
    else await setDoc(ref, { ...values, createdAt: serverTimestamp(), createdBy: uid });
    return ref.id;
  }

  /** Administrators only (enforced by the rules). */
  async remove(id: string): Promise<void> {
    const { db, doc, deleteDoc } = await this.firestore.load();
    await deleteDoc(doc(db, ESTIMATES_COLLECTION, id));
  }
}
