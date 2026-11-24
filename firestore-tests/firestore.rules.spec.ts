import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const profile = (name: string, role: 'admin' | 'user', extra: Record<string, unknown> = {}) => ({
  name,
  email: `${name.toLowerCase()}@example.com`,
  role,
  active: true,
  createdAt: serverTimestamp(),
  ...extra,
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

/** Seeds data bypassing the rules. */
async function seed(data: Record<string, Record<string, unknown>>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [path, value] of Object.entries(data)) {
      await setDoc(doc(db, path), value);
    }
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nezka-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

describe('first administrator', () => {
  it('anyone can check whether the setup is pending', async () => {
    await assertSucceeds(getDoc(doc(anonymous(), 'settings/setup')));
  });

  it('the first signed-in person can create their admin profile together with the setup', async () => {
    const db = as('ana');
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/ana'), profile('Ana', 'admin', { createdBy: 'ana' }));
    batch.set(doc(db, 'settings/setup'), { admin: 'ana', createdAt: serverTimestamp() });
    await assertSucceeds(batch.commit());
  });

  it('cannot become admin alone, without completing the setup', async () => {
    await assertFails(setDoc(doc(as('ana'), 'users/ana'), profile('Ana', 'admin')));
  });

  it('nobody can repeat the setup once it is done', async () => {
    await seed({ 'settings/setup': { admin: 'ana' }, 'users/ana': profile('Ana', 'admin') });
    const db = as('intruso');
    const batch = writeBatch(db);
    batch.set(doc(db, 'users/intruso'), profile('Intruso', 'admin'));
    batch.set(doc(db, 'settings/setup'), { admin: 'intruso', createdAt: serverTimestamp() });
    await assertFails(batch.commit());
  });
});

describe('users', () => {
  beforeEach(() =>
    seed({
      'settings/setup': { admin: 'ana' },
      'users/ana': profile('Ana', 'admin'),
      'users/beto': profile('Beto', 'user'),
      'users/carla': profile('Carla', 'admin', { active: false }),
    }),
  );

  it('a user reads their own profile but not the others', async () => {
    await assertSucceeds(getDoc(doc(as('beto'), 'users/beto')));
    await assertFails(getDoc(doc(as('beto'), 'users/ana')));
  });

  it('someone with an account but no profile can read only their (missing) profile', async () => {
    await assertSucceeds(getDoc(doc(as('nuevo'), 'users/nuevo')));
    await assertFails(getDoc(doc(as('nuevo'), 'users/ana')));
  });

  it('visitors cannot read profiles', async () => {
    await assertFails(getDoc(doc(anonymous(), 'users/ana')));
  });

  it('an admin reads everyone and creates users', async () => {
    await assertSucceeds(getDoc(doc(as('ana'), 'users/beto')));
    await assertSucceeds(
      setDoc(doc(as('ana'), 'users/dora'), profile('Dora', 'user', { createdBy: 'ana' })),
    );
  });

  it('a regular user cannot create users or give themselves access', async () => {
    await assertFails(setDoc(doc(as('beto'), 'users/dora'), profile('Dora', 'user')));
    await assertFails(setDoc(doc(as('nuevo'), 'users/nuevo'), profile('Nuevo', 'user')));
  });

  it('a deactivated admin has no admin rights', async () => {
    await assertFails(getDoc(doc(as('carla'), 'users/beto')));
    await assertFails(updateDoc(doc(as('carla'), 'users/carla'), { active: true }));
  });

  it('rejects profiles with an unknown role or extra fields', async () => {
    await assertFails(setDoc(doc(as('ana'), 'users/dora'), profile('Dora', 'owner' as 'admin')));
    await assertFails(
      setDoc(doc(as('ana'), 'users/dora'), profile('Dora', 'user', { esJefe: true })),
    );
  });

  it('an admin changes role and active state of others', async () => {
    await assertSucceeds(updateDoc(doc(as('ana'), 'users/beto'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(as('ana'), 'users/beto'), { active: false }));
  });

  it('an admin cannot demote or deactivate themselves', async () => {
    await assertFails(updateDoc(doc(as('ana'), 'users/ana'), { role: 'user' }));
    await assertFails(updateDoc(doc(as('ana'), 'users/ana'), { active: false }));
    await assertSucceeds(updateDoc(doc(as('ana'), 'users/ana'), { name: 'Ana María' }));
  });

  it('the email of an account cannot be changed', async () => {
    await assertFails(updateDoc(doc(as('ana'), 'users/beto'), { email: 'otro@example.com' }));
  });

  it('a user cannot change their own role', async () => {
    await assertFails(updateDoc(doc(as('beto'), 'users/beto'), { role: 'admin' }));
  });

  it('an admin creates a user with a temporary password', async () => {
    await assertSucceeds(
      setDoc(
        doc(as('ana'), 'users/dora'),
        profile('Dora', 'user', { createdBy: 'ana', mustChangePassword: true }),
      ),
    );
    await assertFails(
      setDoc(doc(as('ana'), 'users/eva'), profile('Eva', 'user', { mustChangePassword: 'yes' })),
    );
  });

  it('a user clears their own temporary-password flag, and nothing else', async () => {
    await seed({ 'users/dora': profile('Dora', 'user', { mustChangePassword: true }) });
    await assertFails(updateDoc(doc(as('beto'), 'users/dora'), { mustChangePassword: false }));
    await assertFails(
      updateDoc(doc(as('dora'), 'users/dora'), { mustChangePassword: false, role: 'admin' }),
    );
    await assertSucceeds(updateDoc(doc(as('dora'), 'users/dora'), { mustChangePassword: false }));
    await assertFails(updateDoc(doc(as('dora'), 'users/dora'), { mustChangePassword: true }));
  });

  it('nobody deletes profiles', async () => {
    await assertFails(deleteDoc(doc(as('ana'), 'users/beto')));
  });
});

describe('clients', () => {
  const client = (uid: string, extra: Record<string, unknown> = {}) => ({
    name: 'Tree Logistics',
    branch: 'A Tree Corporation Branch',
    contactName: '',
    taxId: '',
    email: 'compras@treelogistics.com',
    phone: '305-555-0142',
    mobile: '',
    address: '',
    city: 'Miami',
    state: 'FL',
    zipCode: '33142',
    country: '',
    notes: '',
    active: true,
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...extra,
  });

  beforeEach(async () => {
    await seed({
      'users/ana': profile('Ana', 'admin'),
      'users/beto': profile('Beto', 'user'),
      'users/carla': profile('Carla', 'user', { active: false }),
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'clients/tree'), client('ana'));
    });
  });

  it('active users read, create and edit clients', async () => {
    await assertSucceeds(getDoc(doc(as('beto'), 'clients/tree')));
    await assertSucceeds(setDoc(doc(as('beto'), 'clients/nuevo'), client('beto')));
    await assertSucceeds(
      updateDoc(doc(as('beto'), 'clients/tree'), {
        city: 'Doral',
        updatedAt: serverTimestamp(),
        updatedBy: 'beto',
      }),
    );
  });

  it('people without access see nothing', async () => {
    await assertFails(getDoc(doc(as('carla'), 'clients/tree')));
    await assertFails(getDoc(doc(as('nadie'), 'clients/tree')));
    await assertFails(getDoc(doc(anonymous(), 'clients/tree')));
    await assertFails(setDoc(doc(as('carla'), 'clients/nuevo'), client('carla')));
  });

  it('rejects clients without a name, with a bad email or extra fields', async () => {
    await assertFails(setDoc(doc(as('beto'), 'clients/x'), client('beto', { name: '' })));
    await assertFails(setDoc(doc(as('beto'), 'clients/x'), client('beto', { email: 'no' })));
    await assertFails(setDoc(doc(as('beto'), 'clients/x'), client('beto', { saldo: 10 })));
    await assertFails(
      setDoc(doc(as('beto'), 'clients/x'), client('beto', { notes: 'x'.repeat(2001) })),
    );
  });

  it('the author and the audit fields cannot be faked', async () => {
    await assertFails(setDoc(doc(as('beto'), 'clients/x'), client('ana')));
    await assertFails(
      updateDoc(doc(as('beto'), 'clients/tree'), {
        createdBy: 'beto',
        updatedAt: serverTimestamp(),
        updatedBy: 'beto',
      }),
    );
    await assertFails(updateDoc(doc(as('beto'), 'clients/tree'), { city: 'Doral' }));
  });

  it('only administrators delete clients', async () => {
    await assertFails(deleteDoc(doc(as('beto'), 'clients/tree')));
    await assertSucceeds(deleteDoc(doc(as('ana'), 'clients/tree')));
  });
});

describe('products', () => {
  const product = (uid: string, extra: Record<string, unknown> = {}) => ({
    ref: '01',
    description: 'NEZKA CHICOTICOS JAMON',
    upc: '612789567096',
    size: '6 OZ',
    pack: '6',
    qtyPerPallet: '63',
    pricePerBox: 24,
    notes: '',
    active: true,
    photoPath: '',
    photoUrl: '',
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...extra,
  });

  beforeEach(async () => {
    await seed({
      'users/ana': profile('Ana', 'admin'),
      'users/beto': profile('Beto', 'user'),
      'users/carla': profile('Carla', 'user', { active: false }),
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'products/p1'), product('ana'));
    });
  });

  it('active users read, create and edit products', async () => {
    await assertSucceeds(getDoc(doc(as('beto'), 'products/p1')));
    await assertSucceeds(setDoc(doc(as('beto'), 'products/p2'), product('beto')));
    await assertSucceeds(
      updateDoc(doc(as('beto'), 'products/p1'), {
        pricePerBox: 25.5,
        pricePerUnit: 1.06,
        photoPath: 'products/p1/a.webp',
        photoUrl: 'https://example.com/a.webp',
        photoThumb: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        updatedAt: serverTimestamp(),
        updatedBy: 'beto',
      }),
    );
  });

  it('people without access see nothing', async () => {
    await assertFails(getDoc(doc(as('carla'), 'products/p1')));
    await assertFails(getDoc(doc(anonymous(), 'products/p1')));
  });

  it('rejects bad prices, missing descriptions and photos outside the product folder', async () => {
    await assertFails(setDoc(doc(as('beto'), 'products/x'), product('beto', { pricePerBox: -1 })));
    await assertFails(
      setDoc(doc(as('beto'), 'products/x'), product('beto', { pricePerBox: '24' })),
    );
    await assertFails(setDoc(doc(as('beto'), 'products/x'), product('beto', { pricePerUnit: -1 })));
    await assertFails(
      setDoc(doc(as('beto'), 'products/x'), product('beto', { pricePerUnit: '1.00' })),
    );
    await assertFails(setDoc(doc(as('beto'), 'products/x'), product('beto', { description: '' })));
    await assertFails(
      setDoc(doc(as('beto'), 'products/x'), product('beto', { photoPath: 'users/ana/a.webp' })),
    );
    await assertFails(
      setDoc(
        doc(as('beto'), 'products/x'),
        product('beto', { photoThumb: 'data:text/html;base64,PHNjcmlwdD4=' }),
      ),
    );
  });

  it('only administrators delete products', async () => {
    await assertFails(deleteDoc(doc(as('beto'), 'products/p1')));
    await assertSucceeds(deleteDoc(doc(as('ana'), 'products/p1')));
  });
});

describe('product photos (Storage)', () => {
  const image = new Uint8Array([82, 73, 70, 70]);
  const put = (uid: string | null, path: string, size = image, contentType = 'image/webp') => {
    const storage = uid
      ? env.authenticatedContext(uid).storage()
      : env.unauthenticatedContext().storage();
    return storage.ref(path).put(size, { contentType });
  };

  beforeEach(() =>
    seed({
      'users/beto': profile('Beto', 'user'),
      'users/carla': profile('Carla', 'user', { active: false }),
    }),
  );

  it('an active user uploads, reads and deletes a product photo', async () => {
    await assertSucceeds(put('beto', 'products/p1/a.webp'));
    const storage = env.authenticatedContext('beto').storage();
    await assertSucceeds(storage.ref('products/p1/a.webp').getMetadata());
    await assertSucceeds(storage.ref('products/p1/a.webp').delete());
  });

  it('nobody else uploads', async () => {
    await assertFails(put('carla', 'products/p1/a.webp'));
    await assertFails(put(null, 'products/p1/a.webp'));
  });

  it('only images, only in the product folders, and not too big', async () => {
    await assertFails(put('beto', 'products/p1/a.pdf', image, 'application/pdf'));
    await assertFails(put('beto', 'otros/a.webp'));
    await assertFails(put('beto', 'products/p1/big.webp', new Uint8Array(2 * 1024 * 1024)));
  });
});

describe('estimates', () => {
  const line = {
    productId: 'p1',
    ref: '01',
    description: 'NEZKA CHICOTICOS JAMON',
    upc: '612789567096',
    size: '6 OZ',
    pack: '6',
    boxes: 334,
    pricePerBox: 24,
  };
  const estimate = (uid: string, extra: Record<string, unknown> = {}) => ({
    number: 'PF-2026-1028',
    clientId: 'c1',
    clientName: 'Tree Logistics',
    clientBranch: '',
    date: '2026-10-28',
    reference: 'Quote request',
    status: 'sent',
    notes: '',
    lines: [line],
    totalBoxes: 334,
    total: 8016,
    createdAt: serverTimestamp(),
    createdBy: uid,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...extra,
  });

  beforeEach(async () => {
    await seed({
      'users/ana': profile('Ana', 'admin'),
      'users/beto': profile('Beto', 'user'),
      'users/carla': profile('Carla', 'user', { active: false }),
      'clients/c1': { name: 'Tree Logistics' },
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'estimates/e1'), estimate('ana'));
    });
  });

  it('active users read, create and edit estimates', async () => {
    await assertSucceeds(getDoc(doc(as('beto'), 'estimates/e1')));
    await assertSucceeds(setDoc(doc(as('beto'), 'estimates/e2'), estimate('beto')));
    await assertSucceeds(
      updateDoc(doc(as('beto'), 'estimates/e1'), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
        updatedBy: 'beto',
      }),
    );
  });

  it('people without access see nothing', async () => {
    await assertFails(getDoc(doc(as('carla'), 'estimates/e1')));
    await assertFails(getDoc(doc(anonymous(), 'estimates/e1')));
  });

  it('rejects unknown clients, statuses, dates and empty estimates', async () => {
    const bad = (extra: Record<string, unknown>) =>
      assertFails(setDoc(doc(as('beto'), 'estimates/x'), estimate('beto', extra)));
    await bad({ clientId: 'nobody' });
    await bad({ status: 'Enviado' });
    await bad({ date: '28/10/2026' });
    await bad({ lines: [] });
    await bad({ number: '' });
    await bad({ createdBy: 'ana' });
  });

  it('only administrators delete estimates', async () => {
    await assertFails(deleteDoc(doc(as('beto'), 'estimates/e1')));
    await assertSucceeds(deleteDoc(doc(as('ana'), 'estimates/e1')));
  });
});

describe('everything else', () => {
  it('is closed until a feature opens it', async () => {
    await seed({ 'users/ana': profile('Ana', 'admin') });
    await assertFails(setDoc(doc(as('ana'), 'otra/cosa'), { a: 1 }));
  });
});
