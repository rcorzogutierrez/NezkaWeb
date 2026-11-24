import { columnName, xlsx } from './xlsx';
import { crc32, zip } from './zip';

describe('xlsx', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('names columns like Excel', () => {
    expect([0, 25, 26, 27, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });

  it('writes a ZIP whose directory points at every file', () => {
    const bytes = zip([
      { name: 'a.txt', data: new TextEncoder().encode('hola') },
      { name: 'b/c.xml', data: new Uint8Array() },
    ]);
    const view = new DataView(bytes.buffer);
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const dirStart = view.getUint32(end + 16, true);
    expect(view.getUint32(dirStart, true)).toBe(0x02014b50);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
  });

  it('escapes the text and keeps the sheet parts', async () => {
    const blob = xlsx({
      name: "Faltan <datos> & 'más'",
      widths: [10],
      rows: [[{ value: 'A & B <c>', style: 'header' }], [{ value: '0123', style: 'text' }]],
      freeze: { rows: 1, cols: 0 },
      headerRow: 1,
    });
    const text = new TextDecoder().decode(await blob.arrayBuffer());
    expect(blob.type).toContain('spreadsheetml');
    for (const part of ['[Content_Types].xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']) {
      expect(text).toContain(part);
    }
    expect(text).toContain('A &amp; B &lt;c&gt;');
    expect(text).toContain('<autoFilter ref="A1:A2"/>');
    expect(text).toContain('ySplit="1" topLeftCell="A2"');
    expect(text).toContain("'Faltan &lt;datos&gt; &amp; ''más'''!$1:$1");
  });
});
