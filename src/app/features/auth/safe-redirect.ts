/** Only follow in-app paths after sign-in, never another site (`//evil.com`, `https:`). */
export function safeRedirect(target: string | null | undefined): string {
  if (!target || !target.startsWith('/') || target.startsWith('//') || target.includes('\\')) {
    return '/';
  }
  return target;
}
