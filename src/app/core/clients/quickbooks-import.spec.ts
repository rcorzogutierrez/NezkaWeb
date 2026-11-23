import { CUSTOMERS_XLSX, DESKTOP_XLSM } from '../../../testing/quickbooks-fixtures';
import { es } from '../i18n/messages.es';
import {
  ImportFileError,
  type NoteLabels,
  parseRows,
  previewFile,
  readCsv,
  rowToClient,
} from './quickbooks-import';

// The same cases as tests/test_quickbooks_import.py in the desktop app.
const labels: NoteLabels = es.clients.import.notes;

const DESKTOP_CSV =
  ',Active Status,Customer,Balance,Company,First Name,Last Name,Main Phone,Alt. Phone,Main Email,' +
  'Bill to 1,Bill to 2,Bill to 3,Bill to 4,Resale Num\r\n' +
  ',Active,Tree Logistics,0.00,A Tree Corporation Branch,Ana,Pérez,305-555-0101,305-555-0199,' +
  'ops@tree.com; billing@tree.com,A Tree Corporation Branch,7200 NW 25th St,"Miami, FL 33122",USA,12-3456789\r\n' +
  ',Active,Tree Logistics:Warehouse 2,0.00,,,,,,,,,,,\r\n' +
  ',Inactive,Bodega Latina,0.00,,,,786-555-0000,,no-es-correo,,,,,\r\n';

const IIF =
  '!HDR\tPROD\tVER\r\n' +
  'HDR\tQuickBooks Pro\tVersion 33.0\r\n' +
  '!CUST\tNAME\tBADDR1\tBADDR2\tBADDR3\tPHONE1\tEMAIL\tCONT1\tCOMPANYNAME\tHIDDEN\r\n' +
  'CUST\tSedano\'s\t"3140 W 76th St"\tHialeah, FL 33018\t\t305-555-2222\tcompras@sedanos.com\tLuis\tSedano\'s Supermarkets\tN\r\n' +
  'CUST\tOld Client\t\t\t\t\t\t\t\tY\r\n';

const ONLINE_CSV =
  'Customer,Company name,Street Address,City,State,Country,Zip,Phone,Email,Open Balance,Notes\n' +
  'Presidente Supermarket,Presidente Supermarket,1200 W 49th St,Hialeah,FL,USA,33012,305-555-3333,' +
  'ap@presidente.com,100.00,Paga a 30 días\n';

/** cp1252 bytes for the characters these tests use. */
function cp1252(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([...text].map((ch) => ch.charCodeAt(0)));
}

const file = (name: string, content: string | Uint8Array<ArrayBuffer>) => new File([content], name);
const fromBase64 = (name: string, data: string) =>
  file(
    name,
    Uint8Array.from(atob(data), (ch) => ch.charCodeAt(0)),
  );

describe('QuickBooks import', () => {
  it('reads the Desktop CSV with title rows in cp1252', async () => {
    const content = cp1252('Elpidio Jr\r\nCustomer Contact List\r\n\r\n' + DESKTOP_CSV);
    const preview = await previewFile(file('customers.csv', content), [], labels);
    expect(preview.jobsSkipped).toBe(1);
    expect(preview.rows.map((r) => r.client.name)).toEqual(['Tree Logistics', 'Bodega Latina']);

    const tree = preview.rows[0].client;
    expect(tree.branch).toBe('A Tree Corporation Branch');
    expect(tree.contactName).toBe('Ana Pérez');
    expect(tree.email).toBe('ops@tree.com');
    expect(tree.phone).toBe('305-555-0101');
    expect(tree.mobile).toBe('305-555-0199');
    expect(tree.address).toBe('7200 NW 25th St');
    expect([tree.city, tree.state, tree.zipCode, tree.country]).toEqual([
      'Miami',
      'FL',
      '33122',
      'USA',
    ]);
    expect(tree.taxId).toBe('12-3456789');
    expect(tree.notes).toContain('billing@tree.com');
    expect(tree.active).toBe(true);

    const bodega = preview.rows[1].client;
    expect(bodega.active).toBe(false);
    expect(bodega.email).toBe('');
    expect(bodega.notes).toContain('no-es-correo');
  });

  it('reads the IIF customer list', async () => {
    const preview = await previewFile(file('lists.iif', IIF), [], labels);
    const [sedanos, old] = preview.rows.map((r) => r.client);
    expect(sedanos.name).toBe("Sedano's");
    expect(sedanos.branch).toBe("Sedano's Supermarkets");
    expect(sedanos.contactName).toBe('Luis');
    expect([sedanos.address, sedanos.city, sedanos.zipCode]).toEqual([
      '3140 W 76th St',
      'Hialeah',
      '33018',
    ]);
    expect(sedanos.active).toBe(true);
    expect(old.active).toBe(false);
  });

  it('reads the Online CSV with separate address columns', async () => {
    const [row] = (await previewFile(file('online.csv', ONLINE_CSV), [], labels)).rows;
    const c = row.client;
    expect(c.branch).toBe('');
    expect([c.address, c.city, c.state, c.zipCode]).toEqual([
      '1200 W 49th St',
      'Hialeah',
      'FL',
      '33012',
    ]);
    expect(c.notes).toBe('Paga a 30 días');
  });

  it('reads xlsx', async () => {
    const { rows } = await previewFile(fromBase64('customers.xlsx', CUSTOMERS_XLSX), [], labels);
    expect(rows).toHaveLength(1);
    expect(rows[0].client.email).toBe('ops@tree.com');
  });

  it('reads the Desktop xlsm that starts with a tips sheet', async () => {
    const { rows } = await previewFile(
      fromBase64('quickbooks-customers.xlsm', DESKTOP_XLSM),
      [],
      labels,
    );
    const [adolfo, totalGreen, freedom] = rows.map((r) => r.client);
    expect(adolfo.name).toBe('ADOLFO AND SON PRODUCE');
    expect(adolfo.branch).toBe('');
    expect(totalGreen.name).toBe('TOTAL GREEN TROPICALS,INC.');
    expect(totalGreen.phone).toBe('786-332-3850');
    expect(totalGreen.notes).toBe('Fax: 305-635-2350');
    expect(freedom.contactName).toBe('Luis');
    expect(freedom.email).toBe('');
    expect(freedom.notes).toBe('Sitio web: www.freedomfresh.com');
  });

  it('skips clients that exist or repeat, ignoring case and accents', () => {
    const rows = readCsv(DESKTOP_CSV + ',Active,Bodega Latina,0.00,,,,,,,,,,,\r\n');
    const preview = parseRows(rows, ['tree logistics', 'Otro'], labels);
    expect(preview.rows.map((r) => [r.client.name, r.skip])).toEqual([
      ['Tree Logistics', 'exists'],
      ['Bodega Latina', null],
      ['Bodega Latina', 'repeated'],
    ]);
  });

  it('rejects a file without a customer column', async () => {
    await expect(previewFile(file('x.csv', 'Item,Price\nApple,1\n'), [], labels)).rejects.toEqual(
      new ImportFileError('noNameColumn'),
    );
    await expect(previewFile(file('old.xls', ''), [], labels)).rejects.toEqual(
      new ImportFileError('oldExcel'),
    );
  });

  it.each([
    [
      ['AAA PRODUCE LLC.', 'Osmani Musuli', '1233 NW 21 st', 'Miami FL 31442'],
      ['1233 NW 21 st', 'Miami', 'FL', '31442', ''],
    ],
    [
      ['ADOLFO AND SON', '2100 NW 13 AVE.', 'MIAMI., FL. 33142', 'U.S.A.`'],
      ['2100 NW 13 AVE.', 'Miami', 'FL', '33142', 'USA'],
    ],
    [
      ['X', '4000 Ponce de Leon Boulevard', 'Suit #470', 'Coral Gables,FL 33146'],
      ['4000 Ponce de Leon Boulevard, Suit #470', 'Coral Gables', 'FL', '33146', ''],
    ],
    [
      ['X', '2101 NW 15 AVE MIAMI, FL 33142'],
      ['2101 NW 15 AVE', 'Miami', 'FL', '33142', ''],
    ],
    [
      ['X', '500 NE 185 ST MIAMI FLA,', '33179'],
      ['500 NE 185 ST', 'Miami', 'FL', '33179', ''],
    ],
    [
      ['X', '7630 MIRAMAR PARK WAY', 'MIRAMAR,FL.33023'],
      ['7630 MIRAMAR PARK WAY', 'Miramar', 'FL', '33023', ''],
    ],
    [
      ['X', '2151 NW 13 AVE', 'MIAMI,FL 33142', 'BAY 23'],
      ['2151 NW 13 AVE, BAY 23', 'Miami', 'FL', '33142', ''],
    ],
    [
      ['X', '11501NW 107 TH STREET', 'MIAMI, FL33178', 'FL 33178', 'USA'],
      ['11501NW 107 TH STREET', 'Miami', 'FL', '33178', 'USA'],
    ],
    [
      ['X', '201 MONTEREY - SALINAS HWY', 'SALINAS, CA 93908'],
      ['201 MONTEREY - SALINAS HWY', 'Salinas', 'CA', '93908', ''],
    ],
  ])('splits hand-typed Bill to lines %j', (lines, expected) => {
    const values: Record<string, string> = {
      name: lines[0],
      firstName: 'Osmani',
      lastName: 'Musuli',
    };
    lines.forEach((line, i) => (values[`line${i + 1}`] = line));
    const c = rowToClient(values, labels);
    expect([c.address, c.city, c.state, c.zipCode, c.country]).toEqual(expected);
  });

  it('puts terms, secondary contact and ship-to in the notes', () => {
    const c = rowToClient(
      {
        name: 'ALWAYS FRESH',
        terms: 'Net 21',
        secondaryContact: 'Jorge',
        ship1: 'ALWAYS FRESH',
        ship2: '2101 NW 15 AVE',
        ship3: 'MIAMI, FL 33142',
      },
      labels,
    );
    expect(c.notes.split('\n')).toEqual([
      'Otro contacto: Jorge',
      'Términos de pago: Net 21',
      'Enviar a: 2101 NW 15 AVE, MIAMI, FL 33142',
    ]);
    expect(rowToClient({ name: 'X', ship1: 'SAME' }, labels).notes).toBe('');
  });
});
