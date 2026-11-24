import {
  compareRefs,
  formatMoney,
  matchesProductSearch,
  missingInfo,
  normalizeProduct,
  normalizeUpc,
  nextRef,
  parsePrice,
  priceText,
  unitPriceFromBox,
} from './product';
import { testProduct } from '../../../testing/products-service.mock';

describe('product helpers', () => {
  it('parses prices the way people type them', () => {
    expect(parsePrice('')).toBe(0);
    expect(parsePrice(' 24 ')).toBe(24);
    expect(parsePrice('24.5')).toBe(24.5);
    expect(parsePrice('$1,234.50')).toBe(1234.5);
    expect(parsePrice('24.555')).toBeNull();
    expect(parsePrice('abc')).toBeNull();
    expect(parsePrice('-3')).toBeNull();
    expect(parsePrice('1000000')).toBeNull();
  });

  it('shows the price with cents, or empty for none', () => {
    expect(priceText(24)).toBe('24.00');
    expect(priceText(0)).toBe('');
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  it('trims the text and rounds the price to cents', () => {
    const data = normalizeProduct({
      ...testProduct(),
      description: ' Mango ',
      pricePerBox: 24.499,
    });
    expect(data.description).toBe('Mango');
    expect(data.pricePerBox).toBe(24.5);
  });

  it('compares UPCs without spaces or dashes', () => {
    expect(normalizeUpc('0 12345-67890 5')).toBe('012345678905');
  });

  it('sorts numeric references first, in numeric order', () => {
    const list = ['10', 'B', '2', 'A'].map((ref) => testProduct({ ref }));
    expect(list.sort(compareRefs).map((p) => p.ref)).toEqual(['2', '10', 'A', 'B']);
  });

  it('lists what is missing, like the desktop app', () => {
    expect(missingInfo(testProduct())).toEqual(['upc', 'size', 'pack', 'pallet', 'price', 'photo']);
    const done = testProduct({
      upc: '123',
      size: '14 oz',
      pack: '24',
      qtyPerPallet: '100',
      pricePerBox: 20,
      photoUrl: 'https://x/y.webp',
      notes: 'upc por confirmar',
    });
    expect(missingInfo(done)).toEqual(['upcToConfirm']);
  });

  it('searches by description, ref and UPC without accents', () => {
    const p = testProduct({ description: 'Guayaba en almíbar', upc: '0 1234-5' });
    expect(matchesProductSearch(p, 'almibar guay')).toBe(true);
    expect(matchesProductSearch(p, '012345')).toBe(true);
    expect(matchesProductSearch(p, '12 guayaba')).toBe(true);
    expect(matchesProductSearch(p, 'mango')).toBe(false);
  });
});

describe('unitPriceFromBox', () => {
  it('divides the case price by a plain number of units', () => {
    expect(unitPriceFromBox(21, '24')).toBe(0.88);
    expect(unitPriceFromBox(24, ' 12 ')).toBe(2);
    expect(unitPriceFromBox(24, '4/750PC')).toBeNull();
    expect(unitPriceFromBox(24, 'N12')).toBeNull();
    expect(unitPriceFromBox(24, '0')).toBeNull();
    expect(unitPriceFromBox(0, '24')).toBeNull();
  });
});

describe('nextRef', () => {
  it('proposes one more than the highest numeric reference, with two digits', () => {
    expect(nextRef([])).toBe('01');
    expect(nextRef([{ ref: '01' }, { ref: '9' }, { ref: 'A-7' }, { ref: '' }])).toBe('10');
    expect(nextRef([{ ref: '103' }, { ref: '56' }])).toBe('104');
  });
});
