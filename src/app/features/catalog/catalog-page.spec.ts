import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { buttonByText } from '../../../testing/dom';
import {
  createProductsServiceMock,
  provideProductsServiceMock,
  testProduct,
} from '../../../testing/products-service.mock';
import { useLanguage } from '../../../testing/setup';
import { PdfService } from '../../core/pdf/pdf.service';
import { CatalogPage } from './catalog-page';

describe('CatalogPage', () => {
  const pdf = {
    catalog: vi.fn(async () => new Blob(['%PDF'])),
    download: vi.fn(),
    open: vi.fn(),
  };
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'catalog', component: CatalogPage }]),
        provideProductsServiceMock(
          createProductsServiceMock([
            testProduct(),
            testProduct({ id: 'guava', ref: '13', description: 'Guava Paste' }),
            testProduct({ id: 'old', ref: '14', description: 'Old Jam', active: false }),
          ]),
        ),
        { provide: PdfService, useValue: pdf },
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create('/catalog');
    await harness.fixture.whenStable();
    page = harness.routeNativeElement as HTMLElement;
  });

  async function settle() {
    harness.detectChanges();
    await harness.fixture.whenStable();
  }

  it('starts with every active product and downloads the chosen ones', async () => {
    expect(page.textContent).toContain('2 products in the catalog');
    const guava = page.querySelector<HTMLInputElement>(
      '[aria-label="Include Guava Paste in the catalog"]',
    )!;
    guava.checked = false;
    guava.dispatchEvent(new Event('change'));
    await settle();
    expect(page.textContent).toContain('1 product in the catalog');

    buttonByText(page, 'Download PDF').click();
    await settle();
    const [products, showPrices] = pdf.catalog.mock.calls[0] as unknown as [
      { id: string }[],
      boolean,
    ];
    expect(products.map((p) => p.id)).toEqual(['mango']);
    expect(showPrices).toBe(true);
    expect(pdf.download).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^Catalogo_Elpidio_Jr_\d{4}-\d{2}-\d{2}\.pdf$/),
    );
  });

  it('adds inactive products only when asked', async () => {
    const inactive = [...page.querySelectorAll('label')]
      .find((l) => l.textContent?.includes('Include inactive products'))!
      .querySelector('input')!;
    inactive.checked = true;
    inactive.dispatchEvent(new Event('change'));
    await settle();
    expect(page.textContent).toContain('3 products in the catalog');
  });
});
