/** Minutes without clicks, typing, touches or scrolling before the session closes. */
export const IDLE_LIMIT_MS = 15 * 60_000;
/** How long before closing the warning appears. */
export const IDLE_WARNING_MS = 60_000;

/**
 * Time of the last activity, shared by every open tab through localStorage so that
 * working in one tab keeps the others open too.
 */
export const ACTIVITY_KEY = 'nezka.lastActivity';

/** localStorage can be missing or throw (private windows, blocked site data). */
function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readActivity(): number | null {
  try {
    const value = Number(store()?.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeActivity(time: number): void {
  try {
    store()?.setItem(ACTIVITY_KEY, String(time));
  } catch {
    // Without storage each tab keeps its own clock.
  }
}

/** Forgets the last activity, so the next sign-in starts a fresh 15 minutes. */
export function clearActivity(): void {
  try {
    store()?.removeItem(ACTIVITY_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * True when the last activity saved for this browser is older than the limit. A phone
 * that kept the tab asleep, or a browser reopened hours later, lands here.
 */
export function activityExpired(now: number): boolean {
  const last = readActivity();
  return last !== null && now - last >= IDLE_LIMIT_MS;
}

export type IdleState =
  { kind: 'active' } | { kind: 'warning'; seconds: number } | { kind: 'expired' };

/** What to show `idleMs` after the last activity. */
export function idleState(idleMs: number): IdleState {
  if (idleMs >= IDLE_LIMIT_MS) return { kind: 'expired' };
  const left = IDLE_LIMIT_MS - idleMs;
  if (left <= IDLE_WARNING_MS)
    return { kind: 'warning', seconds: Math.max(1, Math.ceil(left / 1000)) };
  return { kind: 'active' };
}
