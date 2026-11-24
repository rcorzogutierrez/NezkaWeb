/**
 * Admin-only account tasks that need the Admin SDK: the browser cannot delete another
 * person's sign-in account or set their password. Both are HTTPS callables; the caller must be
 * an active administrator in `users/{uid}`. They run on the Blaze plan.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { PolicyError, assertAdmin, checkDelete, checkPassword, checkUid } from './policy.js';

initializeApp();
// A handful of people use the app: one instance is plenty and keeps the cost at zero.
setGlobalOptions({ region: 'us-central1', maxInstances: 2, memory: '256MiB' });

const users = () => getFirestore().collection('users');

/** @param {import('firebase-functions/v2/https').CallableRequest} request */
async function adminCaller(request) {
  const uid = request.auth?.uid;
  const profile = uid ? (await users().doc(uid).get()).data() : undefined;
  assertAdmin(uid, profile);
  return /** @type {string} */ (uid);
}

/**
 * @template T
 * @param {(request: import('firebase-functions/v2/https').CallableRequest) => Promise<T>} task
 */
function callable(task) {
  return onCall(async (request) => {
    try {
      return await task(request);
    } catch (e) {
      if (e instanceof PolicyError) throw new HttpsError(e.code, e.reason, { reason: e.reason });
      throw e;
    }
  });
}

/** Deletes the sign-in account and the profile, so the email can be used again. */
export const deleteUser = callable(async (request) => {
  const callerUid = await adminCaller(request);
  const targetUid = checkUid(request.data?.uid);
  const admins = await users().where('role', '==', 'admin').get();
  const activeAdmins = admins.docs.filter((d) => d.get('active') === true).map((d) => d.id);
  checkDelete({ callerUid, targetUid, activeAdmins });
  await getAuth()
    .deleteUser(targetUid)
    .catch((e) => {
      // Already gone from Auth: still remove the profile.
      if (e?.code !== 'auth/user-not-found') throw e;
    });
  await users().doc(targetUid).delete();
  return { ok: true };
});

/** Sets someone's password; with `mustChange` they replace it at their next sign-in. */
export const setUserPassword = callable(async (request) => {
  const callerUid = await adminCaller(request);
  const targetUid = checkUid(request.data?.uid);
  const password = checkPassword({ callerUid, targetUid, password: request.data?.password });
  const mustChange = request.data?.mustChange === true;
  await getAuth().updateUser(targetUid, { password });
  await users().doc(targetUid).update({ mustChangePassword: mustChange });
  return { ok: true };
});
