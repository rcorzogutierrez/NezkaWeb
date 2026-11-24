import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PolicyError, assertAdmin, checkDelete, checkPassword, checkUid } from './policy.js';

const fails = (fn, code, reason) =>
  assert.throws(fn, (e) => e instanceof PolicyError && e.code === code && e.reason === reason);

describe('assertAdmin', () => {
  it('lets active administrators in', () => {
    assert.doesNotThrow(() => assertAdmin('ana', { role: 'admin', active: true }));
  });
  it('refuses everyone else', () => {
    fails(() => assertAdmin(undefined, undefined), 'unauthenticated', 'signed-out');
    fails(() => assertAdmin('ana', undefined), 'permission-denied', 'not-admin');
    fails(
      () => assertAdmin('ana', { role: 'user', active: true }),
      'permission-denied',
      'not-admin',
    );
    fails(
      () => assertAdmin('ana', { role: 'admin', active: false }),
      'permission-denied',
      'not-admin',
    );
  });
});

describe('checkUid', () => {
  it('accepts a Firebase uid', () => assert.equal(checkUid('abc123'), 'abc123'));
  it('refuses anything else', () => {
    for (const uid of [undefined, '', 42, 'a/b', 'x'.repeat(129)]) {
      fails(() => checkUid(uid), 'invalid-argument', 'bad-uid');
    }
  });
});

describe('checkDelete', () => {
  it('deletes someone else', () => {
    assert.doesNotThrow(() =>
      checkDelete({ callerUid: 'ana', targetUid: 'beto', activeAdmins: ['ana', 'beto'] }),
    );
    assert.doesNotThrow(() =>
      checkDelete({ callerUid: 'ana', targetUid: 'carla', activeAdmins: ['ana'] }),
    );
  });
  it('never deletes yourself', () => {
    fails(
      () => checkDelete({ callerUid: 'ana', targetUid: 'ana', activeAdmins: ['ana', 'beto'] }),
      'failed-precondition',
      'self',
    );
  });
  it('never leaves the app without an active administrator', () => {
    fails(
      () => checkDelete({ callerUid: 'ana', targetUid: 'beto', activeAdmins: ['beto'] }),
      'failed-precondition',
      'last-admin',
    );
  });
});

describe('checkPassword', () => {
  it('takes any password of 6 characters or more, strong or not', () => {
    assert.equal(
      checkPassword({ callerUid: 'ana', targetUid: 'beto', password: '123456' }),
      '123456',
    );
  });
  it('refuses short, long or missing passwords', () => {
    for (const password of ['12345', '', undefined, 123456, 'x'.repeat(129)]) {
      fails(
        () => checkPassword({ callerUid: 'ana', targetUid: 'beto', password }),
        'invalid-argument',
        'weak-password',
      );
    }
  });
  it('leaves your own password to the change-password page', () => {
    fails(
      () => checkPassword({ callerUid: 'ana', targetUid: 'ana', password: '123456' }),
      'failed-precondition',
      'self',
    );
  });
});
