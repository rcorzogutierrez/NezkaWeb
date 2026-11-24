import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  createProductsServiceMock,
  provideProductsServiceMock,
  testProduct,
} from '../../../testing/products-service.mock';
import { buttonByText } from '../../../testing/dom';
import { useLanguage } from '../../../testing/setup';
import { ProductsPage } from './products-page';

const mango = testProduct({
  id: 'mango',
  ref: '2',
  description: 'Mango Pulp',
  upc: '012345678905',
  size: '14 oz',
  pack: '24',
  qtyPerPallet: '120',
  pricePerBox: 24,
  photoUrl: 'https://example.test/mango.webp',
});
const guava = testProduct({ id: 'guava', ref: '10', description: 'Guayaba en almíbar' });
const old = testProduct({
  ...mango,
  id: 'old',
  ref: '30',
  description: 'Tamarindo',
  active: false,
});

describe('ProductsPage', () => {
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(url: string, list = [mango, guava, old]) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'products', component: ProductsPage }], withComponentInputBinding()),
        provideProductsServiceMock(createProductsServiceMock(list)),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create(url);
    page = harness.routeNativeElement as HTMLElement;
  }

  const rows = () => [...page.querySelectorAll('tbody tr')];
  const names = () =>
    rows().map((r) =>
      r
        .querySelector('td:nth-child(3) a')
        ?.textContent?.replace(/^.*\. /, '')
        .trim(),
    );

  it('lists the products with photo, UPC, price and what is missing', async () => {
    await open('/products');
    expect(names()).toEqual(['Mango Pulp', 'Guayaba en almíbar', 'Tamarindo']);
    const [first, second] = rows();
    expect(first.querySelector('img')?.getAttribute('src')).toBe(mango.photoUrl);
    expect(first.textContent).toContain('UPC 012345678905');
    expect(first.textContent).toContain('$24.00');
    expect(first.textContent).not.toContain('Missing:');
    expect(second.textContent).toContain('No UPC');
    expect(second.textContent).toContain('Missing: UPC, size, pack, cases/pallet, price, photo');
    expect(page.textContent).toContain('3 products');
  });

  it('searches and keeps the search in the URL', async () => {
    await open('/products');
    const input = page.querySelector('input[type=search]') as HTMLInputElement;
    input.value = 'almibar';
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    expect(names()).toEqual(['Guayaba en almíbar']);
    expect(TestBed.inject(Router).url).toBe('/products?q=almibar');
  });

  it('reads the filters from the URL', async () => {
    await open('/products?status=inactive');
    expect(names()).toEqual(['Tamarindo']);
  });

  it('filters by missing data', async () => {
    await open('/products?missing=photo');
    expect(names()).toEqual(['Guayaba en almíbar']);
    const select = page.querySelector('select') as HTMLSelectElement;
    select.value = 'any';
    select.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    expect(names()).toEqual(['Guayaba en almíbar']);
    expect(TestBed.inject(Router).url).toBe('/products?missing=any');
  });

  it('offers to clear filters when nothing matches', async () => {
    await open('/products?q=zzz');
    expect(page.textContent).toContain('No product matches');
    buttonByText(page, 'Clear filters').click();
    await harness.fixture.whenStable();
    expect(names()).toHaveLength(3);
  });

  it('teaches what to do when the catalog is empty', async () => {
    await open('/products', []);
    expect(page.textContent).toContain('The catalog is empty');
  });
});
