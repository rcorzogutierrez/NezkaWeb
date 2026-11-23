import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it('keeps in-app paths', () => {
    expect(safeRedirect('/productos')).toBe('/productos');
    expect(safeRedirect('/estimados/PF-2026-1028')).toBe('/estimados/PF-2026-1028');
  });

  it.each([undefined, null, '', 'productos', '//evil.com', '/\\evil.com', 'https://evil.com'])(
    'sends %s to the home page',
    (target) => {
      expect(safeRedirect(target)).toBe('/');
    },
  );
});
