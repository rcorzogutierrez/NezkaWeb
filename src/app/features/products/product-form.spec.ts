import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FirebaseError } from 'firebase/app';
import { vi } from 'vitest';
import {
  createAuthServiceMock,
  provideAuthServiceMock,
  testUser,
} from '../../../testing/auth-service.mock';
import { buttonByText, inputByLabel, submit, type } from '../../../testing/dom';
import {
  type ProductsServiceMock,
  createProductsServiceMock,
  provideProductsServiceMock,
  testProduct,
} from '../../../testing/products-service.mock';
import { useLanguage } from '../../../testing/setup';
import { NoticeService } from '../../shared/ui/notice.service';
import { ProductForm } from './product-form';

const mango = testProduct({
  id: 'mango',
  ref: '12',
  description: 'Mango Pulp',
  upc: '012345678905',
  pricePerBox: 24,
  photoPath: 'products/mango/a.webp',
  photoUrl: 'https://example.test/a.webp',
});

/** A browser that can decode pictures: jsdom has no createImageBitmap or canvas. */
function fakeImageSupport() {
  vi.stubGlobal('createImageBitmap', async () => ({
    width: 1200,
    height: 800,
    close: () => undefined,
  }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    fillRect: () => undefined,
    drawImage: () => undefined,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((done) =>
    done(new Blob(['webp'], { type: 'image/webp' })),
  );
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
}

describe('ProductForm', () => {
  let products: ProductsServiceMock;
  let harness: RouterTestingHarness;
  let page: HTMLElement;

  async function open(url: string, role: 'admin' | 'user' = 'user') {
    products = createProductsServiceMock([mango]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'products/new', component: ProductForm },
            { path: 'products/:id', component: ProductForm },
            { path: 'products', children: [] },
          ],
          withComponentInputBinding(),
        ),
        provideProductsServiceMock(products),
        provideAuthServiceMock(createAuthServiceMock(testUser({ role }))),
      ],
    });
    useLanguage('en');
    harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    page = harness.routeNativeElement as HTMLElement;
  }

  async function send() {
    submit(page);
    await harness.fixture.whenStable();
  }

  async function choose(file: File) {
    const input = page.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    harness.fixture.detectChanges();
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a product with a typed price and goes back with a notice', async () => {
    await open('/products/new');
    type(page, 'Description', 'Guava Paste');
    type(page, 'Price per case', '$1,250.5');
    await send();
    expect(products.save).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ description: 'Guava Paste', pricePerBox: 1250.5, active: true }),
      { kind: 'keep' },
      undefined,
    );
    expect(TestBed.inject(Router).url).toBe('/products');
    expect(TestBed.inject(NoticeService).take()?.text()).toBe('Guava Paste was saved.');
  });

  it('requires a description and a valid price', async () => {
    await open('/products/new');
    type(page, 'Price per case', '12,5,0');
    await send();
    expect(products.save).not.toHaveBeenCalled();
    expect(page.textContent).toContain('This field is required.');
    expect(page.textContent).toContain('Enter a valid price, for example 24.00.');
  });

  it('warns about a repeated ref or UPC and saves on the second try', async () => {
    await open('/products/new');
    products.duplicates.mockResolvedValue({ ref: mango, upc: mango });
    type(page, 'Ref.', '12');
    type(page, 'Description', 'Mango Pulp 2');
    await send();
    expect(products.save).not.toHaveBeenCalled();
    expect(page.textContent).toContain('Reference 12 is already used by “Mango Pulp”.');
    expect(page.textContent).toContain('“Mango Pulp” already has that UPC.');
    buttonByText(page, 'Save anyway');
    await send();
    expect(products.save).toHaveBeenCalledTimes(1);
  });

  it('loads a product with its photo and saves changes', async () => {
    await open('/products/mango');
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Mango Pulp');
    expect(inputByLabel(page, 'Price per case').value).toBe('24.00');
    expect(page.querySelector('form img')?.getAttribute('src')).toBe(mango.photoUrl);
    type(page, 'Pack', '12');
    await send();
    expect(products.save).toHaveBeenCalledWith(
      'mango',
      expect.objectContaining({ pack: '12', pricePerBox: 24 }),
      { kind: 'keep' },
      mango,
    );
  });

  it('replaces the photo with a resized WebP', async () => {
    fakeImageSupport();
    await open('/products/mango');
    await choose(new File(['jpeg'], 'mango.jpg', { type: 'image/jpeg' }));
    expect(page.querySelector('form img')?.getAttribute('src')).toBe('blob:preview');
    await send();
    const change = products.save.mock.calls[0][2];
    if (change.kind !== 'replace') throw new Error('expected a new photo');
    expect(change.kind).toBe('replace');
    expect(change.file.type).toBe('image/webp');
  });

  it('rejects a file that is not a picture', async () => {
    await open('/products/new');
    await choose(new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' }));
    expect(page.textContent).toContain('That file is not an image that can be opened.');
  });

  it('removes the photo', async () => {
    await open('/products/mango');
    buttonByText(page, 'Remove photo').click();
    harness.fixture.detectChanges();
    expect(page.querySelector('form img')).toBeNull();
    await send();
    expect(products.save.mock.calls[0][2]).toEqual({ kind: 'remove' });
  });

  it('says so when the product does not exist', async () => {
    await open('/products/nada');
    expect(page.textContent).toContain('That product does not exist or was deleted.');
  });

  it('shows the save error', async () => {
    await open('/products/mango');
    products.save.mockRejectedValue(new FirebaseError('permission-denied', 'x'));
    await send();
    expect(page.textContent).toContain('You do not have permission to do this.');
  });

  it('only administrators can delete, after confirming', async () => {
    await open('/products/mango');
    expect(page.textContent).not.toContain('Delete product');
    TestBed.resetTestingModule();
    await open('/products/mango', 'admin');
    const dialog = page.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = function () {
      this.open = true;
    };
    dialog.close = function () {
      this.open = false;
    };
    buttonByText(page, 'Delete product').click();
    buttonByText(dialog, 'Delete').click();
    await harness.fixture.whenStable();
    expect(products.remove).toHaveBeenCalledWith(mango);
    expect(TestBed.inject(Router).url).toBe('/products');
  });
});
