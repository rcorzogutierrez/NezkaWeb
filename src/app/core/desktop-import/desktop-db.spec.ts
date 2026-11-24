import { emptyClient } from '../clients/client';
import { testProduct } from '../../../testing/products-service.mock';
import {
  DesktopDbError,
  planImport,
  readDesktopDb,
  toClientData,
  toDesktopProduct,
} from './desktop-db';

const productRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  ref: '09',
  description: 'NEZKA EVAPORATED FILLED ',
  upc: '0601968448202',
  size: '12OZ',
  pack: '24',
  qty_per_pallet: '104',
  price_per_box: 19.999,
  notes: '',
  image: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  active: 1,
  ...overrides,
});

describe('desktop database', () => {
  it('maps a desktop product row, rounding the price and keeping the photo', () => {
    const p = toDesktopProduct(productRow());
    expect(p.data).toEqual(
      expect.objectContaining({
        ref: '09',
        description: 'NEZKA EVAPORATED FILLED',
        qtyPerPallet: '104',
        pricePerBox: 20,
        active: true,
      }),
    );
    expect(p.image?.length).toBe(4);
    expect(toDesktopProduct(productRow({ image: null, active: 0 }))).toEqual(
      expect.objectContaining({ image: null, data: expect.objectContaining({ active: false }) }),
    );
  });

  it('maps a desktop client row from snake_case', () => {
    const c = toClientData({ name: 'Bodega', contact_name: 'María', zip_code: 33010, active: 0 });
    expect(c).toEqual({
      ...emptyClient(),
      name: 'Bodega',
      contactName: 'María',
      zipCode: '33010',
      active: false,
    });
  });

  it('rejects a file that is not a SQLite database', async () => {
    await expect(readDesktopDb(new Blob(['nombre,correo\n']))).rejects.toEqual(
      new DesktopDbError('notSqlite'),
    );
  });

  it('skips what is already on the web, but keeps different products sharing a UPC', () => {
    const evaporated = toDesktopProduct(productRow());
    const powdered = toDesktopProduct(
      productRow({ ref: '10', description: 'NEZKA POWDERED MILK (DRY MILK)' }),
    );
    const plan = planImport(
      {
        products: [evaporated, powdered, toDesktopProduct(productRow({ description: '' }))],
        clients: [
          toClientData({ name: 'Tree Logistics', branch: 'A Tree Corporation Branch' }),
          toClientData({ name: 'Café Habana' }),
          toClientData({ name: '' }),
        ],
      },
      [testProduct({ ref: '09', description: 'Nezka evaporated filled', upc: '' })],
      [{ name: 'TREE LOGISTICS', branch: 'a tree corporation branch' }],
    );
    expect(plan.products.map((r) => [r.item.data.ref, r.exists])).toEqual([
      ['09', true],
      ['10', false],
    ]);
    expect(plan.clients.map((r) => [r.item.name, r.exists])).toEqual([
      ['Tree Logistics', true],
      ['Café Habana', false],
    ]);
  });
});
