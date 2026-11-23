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

  it('nobody deletes profiles', async () => {
    await assertFails(deleteDoc(doc(as('ana'), 'users/beto')));
  });
});

describe('everything else', () => {
  it('is closed until a feature opens it', async () => {
    await seed({ 'users/ana': profile('Ana', 'admin') });
    await assertFails(setDoc(doc(as('ana'), 'otra/cosa'), { a: 1 }));
  });
});
