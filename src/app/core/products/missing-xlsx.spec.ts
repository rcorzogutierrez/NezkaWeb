import { testProduct } from '../../../testing/products-service.mock';
import { es } from '../i18n/messages.es';
import { missingDataFileName, missingDataSheet } from './missing-xlsx';

const text = { ...es.products.exportSheet, missingShort: es.products.missingShort };

describe('missingDataSheet', () => {
  it('lists only what lacks something, painting the empty cells and hiding prices', () => {
    const complete = testProduct({
      id: 'ok',
      description: 'Completo',
      upc: '012345678905',
      size: '14 oz',
      pack: '24',
      qtyPerPallet: '120',
      pricePerBox: 24,
      photoUrl: 'https://example.test/a.webp',
    });
    const lacking = testProduct({
      id: 'x',
      ref: '7',
      description: 'Sin datos',
      upc: '00123',
      notes: 'UPC por confirmar',
      pricePerBox: 31.5,
    });
    const sheet = missingDataSheet([complete, lacking], text, '11/24/2026');
    expect(sheet.rows).toHaveLength(5);
    expect(sheet.rows[1][0]?.value).toBe('Elpidio Jr. Produce Co. · 11/24/2026 · 1 producto');
    expect(sheet.rows[3].map((c) => c?.value)).toEqual([
      'REF.',
      'DESCRIPCIÓN',
      'UPC',
      'TAMAÑO / PESO',
      'PACK',
      'CAJAS / PALLET',
      'FOTO',
      'FALTA',
      'NOTAS',
    ]);
    const row = sheet.rows[4];
    expect(row.map((c) => c?.style)).toEqual([
      'cell',
      'cell',
      'textHighlight',
      'highlight',
      'highlight',
      'highlight',
      'highlight',
      'alert',
      'wrap',
    ]);
    expect(row[2]?.value).toBe('00123');
    expect(row[7]?.value).toBe('tamaño, pack, cajas/pallet, UPC por confirmar, foto');
    expect(JSON.stringify(sheet)).not.toContain('31.5');
    expect(missingDataFileName('2026-11-24')).toBe('Productos_datos_faltantes_2026-11-24.xlsx');
  });
});
