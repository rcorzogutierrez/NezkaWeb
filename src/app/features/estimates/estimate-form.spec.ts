import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../../testing/auth-service.mock';
import {
  createClientsServiceMock,
  provideClientsServiceMock,
  testClient,
} from '../../../testing/clients-service.mock';
import { buttonByText, inputByLabel, submit } from '../../../testing/dom';
import {
  type EstimatesServiceMock,
  createEstimatesServiceMock,
  provideEstimatesServiceMock,
  testEstimate,
} from '../../../testing/estimates-service.mock';
import {
  createProductsServiceMock,
  provideProductsServiceMock,
  testProduct,
} from '../../../testing/products-service.mock';
import { useLanguage } from '../../../testing/setup';
import { PdfService } from '../../core/pdf/pdf.service';
import { EstimateForm } from './estimate-form';

const mango = testProduct({ pricePerBox: 24, upc: '612789567096' });
const guava = testProduct({ id: 'guava', ref: '13', description: 'Guava Paste', pricePerBox: 10 });

describe('EstimateForm', () => {
  let estimates: EstimatesServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(url: string, role: 'admin' | 'user' = 'user') {
    estimates = createEstimatesServiceMock([testEstimate()]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'estimates/new', component: EstimateForm },
            { path: 'estimates/:id', component: EstimateForm },
            { path: 'estimates', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideEstimatesServiceMock(estimates),
        provideClientsServiceMock(createClientsServiceMock([testClient()])),
        provideProductsServiceMock(createProductsServiceMock([mango, guava])),
        provideAuthServiceMock(createAuthServiceMock(testUser({ role }))),
        { provide: PdfService, useValue: {} },
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    page = harness.routeNativeElement as HTMLElement;
  }

  async function settle() {
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r));
      harness.detectChanges();
      await harness.fixture.whenStable();
    }
  }

  async function addProduct(search: string, boxes: string) {
    const pick = page.querySelector<HTMLInputElement>('#pick-input')!;
    pick.value = search;
    pick.dispatchEvent(new Event('input'));
    await settle();
    page.querySelector<HTMLElement>('[role=option]')!.click();
    await settle();
    const count = page.querySelector<HTMLInputElement>('#add-boxes')!;
    count.value = boxes;
    count.dispatchEvent(new Event('input'));
    await settle();
    buttonByText(page, 'Add').click();
    await settle();
  }

  it('suggests the next number and saves the client and products', async () => {
    await open('/estimates/new');
    expect(inputByLabel(page, 'Number').value).toBe('PF-2026-1029');

    const client = page.querySelector<HTMLSelectElement>('#estimate-client')!;
    client.value = 'tree';
    client.dispatchEvent(new Event('input'));
    client.dispatchEvent(new Event('change'));
    await addProduct('mango', '3');
    await addProduct('guava', '2');
    await addProduct('mango', '1');
    expect(page.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(page.textContent).toContain('$116.00');

    submit(page);
    await settle();
    expect(estimates.save).toHaveBeenCalledTimes(1);
    const [id, data, savedClient] = estimates.save.mock.calls[0];
    expect(id).toBeUndefined();
    expect(savedClient.name).toBe('Tree Logistics');
    expect(data).toEqual(
      expect.objectContaining({ number: 'PF-2026-1029', clientId: 'tree', status: 'draft' }),
    );
    expect(data.lines.map((l) => [l.productId, l.boxes, l.pricePerBox])).toEqual([
      ['mango', 4, 24],
      ['guava', 2, 10],
    ]);
    expect(TestBed.inject(Router).url).toBe('/estimates');
  });

  it('asks for a client and at least one product', async () => {
    await open('/estimates/new');
    submit(page);
    await settle();
    expect(estimates.save).not.toHaveBeenCalled();
    expect(page.textContent).toContain('Choose a client.');
    expect(page.textContent).toContain('Add at least one product.');
  });

  it('stops on a duplicate number', async () => {
    await open('/estimates/e1');
    estimates.numberTaken.mockResolvedValue(true);
    submit(page);
    await settle();
    expect(estimates.save).not.toHaveBeenCalled();
    expect(page.textContent).toContain('There is already an estimate numbered PF-2026-1028.');
  });

  it('offers the PDF only while there are no unsaved changes', async () => {
    await open('/estimates/e1');
    expect(buttonByText(page, 'Download PDF').disabled).toBe(false);
    const boxes = page.querySelector<HTMLInputElement>('tbody input')!;
    boxes.value = '0';
    boxes.dispatchEvent(new Event('input'));
    await settle();
    expect(buttonByText(page, 'Download PDF').disabled).toBe(true);
    expect(page.textContent).toContain('Type a whole number of boxes, 1 or more.');
    expect(page.textContent).toContain('Save the changes to download the PDF.');
  });

  it('lets only administrators delete', async () => {
    await open('/estimates/e1');
    expect(() => buttonByText(page, 'Delete estimate')).toThrow();
    TestBed.resetTestingModule();
    await open('/estimates/e1', 'admin');
    expect(buttonByText(page, 'Delete estimate')).toBeTruthy();
  });
});
