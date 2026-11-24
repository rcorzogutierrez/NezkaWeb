import { TestBed } from '@angular/core/testing';
import { emptyClient } from '../clients/client';
import {
  createClientsServiceMock,
  provideClientsServiceMock,
} from '../../../testing/clients-service.mock';
import {
  createProductsServiceMock,
  provideProductsServiceMock,
} from '../../../testing/products-service.mock';
import { emptyProduct } from '../products/product';
import { DesktopImportService } from './desktop-import.service';

describe('DesktopImportService', () => {
  it('adds the clients, then each product, reporting progress and failures', async () => {
    const products = createProductsServiceMock();
    const clients = createClientsServiceMock();
    TestBed.configureTestingModule({
      providers: [provideProductsServiceMock(products), provideClientsServiceMock(clients)],
    });
    products.save.mockImplementation(async (_id, data) => {
      if (data.description === 'Roto') throw new Error('x');
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
    expect(result).toEqual({ products: 2, clients: 1, failed: ['Roto'] });
    expect(progress.at(-1)).toBe(4);
  });
});
