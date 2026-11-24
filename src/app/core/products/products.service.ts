import { DestroyRef, Service, inject, signal } from '@angular/core';
import { FIREBASE_AUTH } from '../firebase/firebase.providers';
import { FirestoreLoader } from '../firebase/firestore.loader';
import { StorageLoader } from '../firebase/storage.loader';
import { photoThumb } from './photo';
import {
  PRODUCTS_COLLECTION,
  type Product,
  type ProductData,
  type ProductPhoto,
  compareRefs,
  normalizeProduct,
  normalizeUpc,
  toProduct,
} from './product';

/** What to do with the photo when saving: keep it, replace it with a new file, or remove it. */
export type PhotoChange = { kind: 'keep' } | { kind: 'replace'; file: Blob } | { kind: 'remove' };

/** The product catalog in Firestore, with photos in Storage. */
@Service()
export class ProductsService {
  private readonly auth = inject(FIREBASE_AUTH);
  private readonly firestore = inject(FirestoreLoader);
  private readonly storage = inject(StorageLoader);

  /** Live catalog, sorted by reference, while the calling component is alive. */
  watchAll(destroyRef = inject(DestroyRef)) {
    const products = signal<readonly Product[] | undefined>(undefined);
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
          collection(db, PRODUCTS_COLLECTION),
          (snap) => products.set(snap.docs.map((d) => toProduct(d.id, d.data())).sort(compareRefs)),
          () => error.set(true),
        );
      },
      () => error.set(true),
    );
    return { products: products.asReadonly(), error: error.asReadonly() };
  }

  async get(id: string): Promise<Product | null> {
    const { db, doc, getDoc } = await this.firestore.load();
    const snap = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
    return snap.exists() ? toProduct(snap.id, snap.data()) : null;
  }

  /** Other products with the same reference and the same UPC, to warn before saving. */
  async duplicates(
    data: Pick<ProductData, 'ref' | 'upc'>,
    exceptId?: string,
  ): Promise<{ ref: Product | null; upc: Product | null }> {
    const { db, collection, getDocs } = await this.firestore.load();
    const snap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const others = snap.docs.filter((d) => d.id !== exceptId).map((d) => toProduct(d.id, d.data()));
    const ref = data.ref.trim().toLowerCase();
    const upc = normalizeUpc(data.upc);
    return {
      ref: (ref && others.find((p) => p.ref.trim().toLowerCase() === ref)) || null,
      upc: (upc && others.find((p) => normalizeUpc(p.upc) === upc)) || null,
    };
  }

  /** Creates or updates a product and applies the photo change. Returns the product id. */
  async save(
    id: string | undefined,
    data: ProductData,
    photo: PhotoChange,
    current?: ProductPhoto,
  ) {
    const { db, collection, doc, setDoc, updateDoc, serverTimestamp } = await this.firestore.load();
    const ref = id ? doc(db, PRODUCTS_COLLECTION, id) : doc(collection(db, PRODUCTS_COLLECTION));
    const uid = this.auth.currentUser?.uid ?? null;

    let next: ProductPhoto = {
      photoPath: current?.photoPath ?? '',
      photoUrl: current?.photoUrl ?? '',
      photoThumb: current?.photoThumb ?? '',
    };
    if (photo.kind === 'replace') next = await this.upload(ref.id, photo.file);
    if (photo.kind === 'remove') next = { photoPath: '', photoUrl: '', photoThumb: '' };

    const values = {
      ...normalizeProduct(data),
      ...next,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    };
    if (id) await updateDoc(ref, values);
    else await setDoc(ref, { ...values, createdAt: serverTimestamp(), createdBy: uid });

    // The old file goes only after the product points to the new one.
    if (photo.kind !== 'keep' && current?.photoPath && current.photoPath !== next.photoPath) {
      await this.deleteFile(current.photoPath);
    }
    return ref.id;
  }

  /** Administrators only (enforced by the rules). Removes the photo too. */
  async remove(product: Product): Promise<void> {
    const { db, doc, deleteDoc } = await this.firestore.load();
    await deleteDoc(doc(db, PRODUCTS_COLLECTION, product.id));
    if (product.photoPath) await this.deleteFile(product.photoPath);
  }

  private async upload(productId: string, file: Blob): Promise<ProductPhoto> {
    const { storage, ref, uploadBytes, getDownloadURL } = await this.storage.load();
    const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg';
    const path = `${PRODUCTS_COLLECTION}/${productId}/${crypto.randomUUID()}.${ext}`;
    const target = ref(storage, path);
    await uploadBytes(target, file, {
      contentType: file.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    const thumb = await photoThumb(file).catch(() => '');
    return { photoPath: path, photoUrl: await getDownloadURL(target), photoThumb: thumb };
  }

  /** A file that is already gone is not an error. */
  private async deleteFile(path: string): Promise<void> {
    const { storage, ref, deleteObject } = await this.storage.load();
    await deleteObject(ref(storage, path)).catch((e: { code?: string }) => {
      if (e?.code !== 'storage/object-not-found') throw e;
    });
  }
}
