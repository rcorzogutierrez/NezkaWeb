import {
  ACTIVITY_KEY,
  IDLE_LIMIT_MS,
  clearActivity,
  idleState,
  readActivity,
  writeActivity,
} from './activity';

describe('idleState', () => {
  it('stays quiet until the last minute', () => {
    expect(idleState(0)).toEqual({ kind: 'active' });
    expect(idleState(IDLE_LIMIT_MS - 61_000)).toEqual({ kind: 'active' });
  });

  it('counts down the last 60 seconds', () => {
    expect(idleState(IDLE_LIMIT_MS - 60_000)).toEqual({ kind: 'warning', seconds: 60 });
    expect(idleState(IDLE_LIMIT_MS - 1_500)).toEqual({ kind: 'warning', seconds: 2 });
    expect(idleState(IDLE_LIMIT_MS - 1)).toEqual({ kind: 'warning', seconds: 1 });
  });

  it('expires at 15 minutes', () => {
    expect(IDLE_LIMIT_MS).toBe(15 * 60_000);
    expect(idleState(IDLE_LIMIT_MS)).toEqual({ kind: 'expired' });
  });
});

describe('activity storage', () => {
  afterEach(() => localStorage.clear());

  it('writes, reads and clears the shared time', () => {
    writeActivity(1234);
    expect(localStorage.getItem(ACTIVITY_KEY)).toBe('1234');
    expect(readActivity()).toBe(1234);
    clearActivity();
    expect(readActivity()).toBeNull();
  });

  it('ignores a value that is not a time', () => {
    localStorage.setItem(ACTIVITY_KEY, 'nope');
    expect(readActivity()).toBeNull();
  });
});
