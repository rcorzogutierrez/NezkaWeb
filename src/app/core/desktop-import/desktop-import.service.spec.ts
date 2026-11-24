import { TestBed } from '@angular/core/testing';
import { emptyClient } from '../clients/client';
import {
  createClientsServiceMock,
  provideClientsServiceMock,
  testClient,
} from '../../../testing/clients-service.mock';
import {
  createProductsServiceMock,
  provideProductsServiceMock,
  testProduct,
} from '../../../testing/products-service.mock';
import {
  createEstimatesServiceMock,
  provideEstimatesServiceMock,
} from '../../../testing/estimates-service.mock';
import { emptyProduct } from '../products/product';
import { productKey } from './desktop-db';
import { DesktopImportService } from './desktop-import.service';

describe('DesktopImportService', () => {
  it('adds the clients, then each product, reporting progress and failures', async () => {
    const products = createProductsServiceMock();
    const clients = createClientsServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideProductsServiceMock(products),
        provideClientsServiceMock(clients),
        provideEstimatesServiceMock(createEstimatesServiceMock()),
      ],
    });
    products.save.mockImplementation(async (_id, data) => {
      if (data.description === 'Roto') {
        throw Object.assign(new Error('denied'), { code: 'storage/unauthorized' });
      }
      return 'id';
    });
    const items = ['Mango', 'Roto', 'Guayaba'].map((description) => ({
      data: { ...emptyProduct(), description },
      image: null,
    }));
    const progress: number[] = [];
    const result = await TestBed.inject(DesktopImportService).run(
      items,
      [{ ...emptyClient(), name: 'Bodega' }],
      (p) => progress.push(p.done),
    );
    expect(clients.createMany).toHaveBeenCalledWith([expect.objectContaining({ name: 'Bodega' })]);
    expect(products.save).toHaveBeenCalledTimes(3);
    expect(products.save.mock.calls[0][2]).toEqual({ kind: 'keep' });
    expect(result).toEqual({
      products: 2,
      clients: 1,
      estimates: 0,
      failed: [{ name: 'Roto', reason: 'storage/unauthorized' }],
    });
    expect(progress.at(-1)).toBe(4);
  });

  it('links imported estimates to the web client and products', async () => {
    const mango = testProduct();
    const products = createProductsServiceMock([mango]);
    const clients = createClientsServiceMock([testClient()]);
    const estimates = createEstimatesServiceMock();
    TestBed.configureTestingModule({
      providers: [
        provideProductsServiceMock(products),
        provideClientsServiceMock(clients),
        provideEstimatesServiceMock(estimates),
      ],
    });
    const line = {
      ref: '12',
      description: 'Mango Pulp',
      upc: '',
      size: '',
      pack: '',
      pricePerBox: 24,
      productKeys: productKey(mango),
    };
    const estimate = (number: string, client: string) => ({
      number,
      date: '2026-10-28',
      reference: '',
      status: 'sent' as const,
      notes: '',
      client: { name: client, branch: '' },
      lines: [
        { ...line, boxes: 3 },
        { ...line, description: 'Otro', productKeys: ['ref:|otro'], boxes: 0 },
      ],
      total: 72,
    });
    const result = await TestBed.inject(DesktopImportService).run([], [], undefined, [
      estimate('PF-1', 'tree logistics'),
      estimate('PF-2', 'Nadie'),
    ]);
    expect(result).toEqual({
      products: 0,
      clients: 0,
      estimates: 1,
      failed: [{ name: 'PF-2', reason: 'client not found' }],
    });
    expect(estimates.save).toHaveBeenCalledTimes(1);
    const [id, data, client] = estimates.save.mock.calls[0];
    expect(id).toBeUndefined();
    expect(client.name).toBe('Tree Logistics');
    expect(data.clientId).toBe('tree');
    expect(data.lines).toEqual([expect.objectContaining({ productId: 'mango', boxes: 3 })]);
  });
});
