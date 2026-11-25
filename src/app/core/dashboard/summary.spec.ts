import { testClient } from '../../../testing/clients-service.mock';
import { testEstimate } from '../../../testing/estimates-service.mock';
import { testProduct } from '../../../testing/products-service.mock';
import { dayPart, firstName, summarize } from './summary';

const at = (ms: number) => ({ toMillis: () => ms }) as never;

describe('summarize', () => {
  const clients = [testClient(), testClient({ id: 'cafe', name: 'Café Habana', active: false })];
  const products = [
    testProduct({
      id: 'old',
      createdAt: at(1),
      upc: '1',
      size: '1',
      pack: '1',
      qtyPerPallet: '1',
      pricePerBox: 5,
      photoUrl: 'x',
    }),
    testProduct({ id: 'new', createdAt: at(3) }),
    testProduct({ id: 'gone', createdAt: at(9), active: false }),
  ];
  const estimates = [
    testEstimate({ id: 'a', clientId: 'tree', status: 'draft', date: '2026-11-20' }),
    testEstimate({
      id: 'b',
      clientId: 'cafe',
      clientName: 'Café Habana',
      status: 'accepted',
      date: '2026-11-10',
    }),
    testEstimate({ id: 'c', clientId: 'tree', status: 'sent', date: '2026-10-28' }),
    testEstimate({
      id: 'd',
      clientId: 'cafe',
      clientName: 'Café Habana',
      status: 'rejected',
      date: '2026-09-01',
    }),
    testEstimate({ id: 'e', clientId: 'tree', status: 'accepted', date: '2025-12-01' }),
  ];
  const s = summarize(clients, products, estimates, 2026);

  it('counts active records and what is still open', () => {
    expect(s.clients).toEqual({ active: 1, total: 2 });
    expect(s.products).toEqual({ active: 2, total: 3, missingData: 1 });
    expect(s.estimates.drafts).toBe(1);
    expect(s.estimates.sent).toBe(1);
  });

  it('sums the year without rejected estimates', () => {
    expect(s.estimates.year).toBe(3);
    expect(s.estimates.quotedYear).toBe(720);
    expect(s.estimates.acceptedYear).toBe(240);
  });

  it('ranks clients by amount quoted in the year', () => {
    expect(s.topClients.map((c) => [c.name, c.total, c.estimates, c.share])).toEqual([
      ['Tree Logistics', 480, 2, 1],
      ['Café Habana', 240, 1, 0.5],
    ]);
  });

  it('lists the newest active products and the latest estimates', () => {
    expect(s.newProducts.map((p) => p.id)).toEqual(['new', 'old']);
    expect(s.recent.map((e) => e.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('greeting helpers', () => {
  it('picks the part of the day', () => {
    expect([dayPart(8), dayPart(12), dayPart(18), dayPart(19)]).toEqual([
      'morning',
      'afternoon',
      'afternoon',
      'evening',
    ]);
  });

  it('uses the first name, or the email when there is none', () => {
    expect(firstName('Rafael Corzo', 'r@x.com')).toBe('Rafael');
    expect(firstName('  ', 'rafa@x.com')).toBe('rafa');
  });
});
