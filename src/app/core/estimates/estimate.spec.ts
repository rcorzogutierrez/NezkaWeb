import { testProduct } from '../../../testing/products-service.mock';
import { testEstimate } from '../../../testing/estimates-service.mock';
import {
  addProduct,
  displayDate,
  isIsoDate,
  linkLines,
  longDate,
  matchesEstimateSearch,
  nextNumber,
  proformaFileName,
  toEstimate,
  todayIso,
  totals,
} from './estimate';

describe('estimate helpers', () => {
  it('continues the PF-year-NNNN series after 1000, like the desktop app', () => {
    expect(nextNumber(2026, [])).toBe('PF-2026-1001');
    expect(nextNumber(2026, ['PF-2026-1028', 'PF-2025-1500', 'PF-2026-X'])).toBe('PF-2026-1029');
  });

  it('reads and shows dates', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-10-28')).toBe(true);
    expect(displayDate('2026-10-28', 'es')).toBe('28/10/2026');
    expect(displayDate('2026-10-28', 'en')).toBe('10/28/2026');
    expect(longDate('2026-10-28')).toBe('October 28, 2026');
  });

  it('adds boxes to a product already on the estimate', () => {
    const mango = testProduct({ pricePerBox: 24 });
    const once = addProduct([], mango, 3);
    const twice = addProduct(once, mango, 2);
    expect(twice).toHaveLength(1);
    expect(twice[0]).toEqual(expect.objectContaining({ productId: 'mango', boxes: 5 }));
    expect(totals(twice)).toEqual({ items: 1, boxes: 5, total: 120 });
  });

  it('rounds totals to cents', () => {
    expect(totals([{ boxes: 3, pricePerBox: 0.1 }]).total).toBe(0.3);
  });

  it('searches number, client and products', () => {
    const e = testEstimate();
    expect(matchesEstimateSearch(e, 'tree 1028')).toBe(true);
    expect(matchesEstimateSearch(e, 'mango')).toBe(true);
    expect(matchesEstimateSearch(e, '612789')).toBe(true);
    expect(matchesEstimateSearch(e, 'guayaba')).toBe(false);
  });

  it('reads a document defensively and recomputes totals', () => {
    const e = toEstimate('x', {
      number: 'PF-1',
      status: 'weird',
      lines: [{ description: 'A', boxes: 2, pricePerBox: 1.25 }],
      total: 999,
    });
    expect(e.status).toBe('draft');
    expect(e.total).toBe(2.5);
    expect(e.lines[0].productId).toBe('');
  });

  it('names the PDF like the desktop app', () => {
    expect(proformaFileName({ number: 'PF-2026-1028', clientName: 'Tree / Logistics' })).toBe(
      'Proforma_PF-2026-1028_Tree  Logistics.pdf',
    );
  });
});

describe('linkLines', () => {
  it('finds the product of a line saved without one, by ref or UPC and description', () => {
    const mango = testProduct({ id: 'mango', ref: '12', upc: '612789567096' });
    const lines = testEstimate().lines.map((l) => ({ ...l, productId: '' }));
    expect(linkLines(lines, [mango])[0].productId).toBe('mango');
    const other = { ...lines[0], ref: '', description: 'Otro', upc: '' };
    expect(linkLines([other], [mango])[0].productId).toBe('');
    const kept = { ...lines[0], productId: 'p9' };
    expect(linkLines([kept], [mango])[0].productId).toBe('p9');
  });
});
