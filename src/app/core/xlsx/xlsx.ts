import { zip } from './zip';

/** The looks a cell can take; the stylesheet below defines each one. */
export type CellStyle =
  | 'title'
  | 'subtitle'
  | 'header'
  | 'cell'
  | 'highlight'
  | 'wrap'
  | 'alert'
  | 'text'
  | 'textHighlight';

const STYLE_INDEX: Record<CellStyle, number> = {
  title: 1,
  subtitle: 2,
  header: 3,
  cell: 4,
  highlight: 5,
  wrap: 6,
  alert: 7,
  text: 8,
  textHighlight: 9,
};

export interface Cell {
  readonly value: string;
  readonly style?: CellStyle;
}

export interface Sheet {
  readonly name: string;
  /** Column widths, in characters. */
  readonly widths: readonly number[];
  /** Row 1 first; `null` leaves a cell empty. */
  readonly rows: readonly (readonly (Cell | null)[])[];
  /** Rows and columns that stay in place while scrolling. */
  readonly freeze?: { readonly rows: number; readonly cols: number };
  /** The header row (1-based) for the filter buttons and to repeat on every printed page. */
  readonly headerRow?: number;
  readonly landscape?: boolean;
}

export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** A one-sheet Excel workbook, written in the browser. */
export function xlsx(sheet: Sheet): Blob {
  const encoder = new TextEncoder();
  const files: [string, string][] = [
    ['[Content_Types].xml', CONTENT_TYPES],
    ['_rels/.rels', ROOT_RELS],
    ['xl/workbook.xml', workbook(sheet)],
    ['xl/_rels/workbook.xml.rels', WORKBOOK_RELS],
    ['xl/styles.xml', STYLES],
    ['xl/worksheets/sheet1.xml', worksheet(sheet)],
  ];
  const bytes = zip(files.map(([name, xml]) => ({ name, data: encoder.encode(xml) })));
  return new Blob([bytes], { type: XLSX_TYPE });
}

/** 0 → A, 25 → Z, 26 → AA. */
export function columnName(index: number): string {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  }
  return name;
}

function escapeXml(text: string): string {
  return (
    text
      // Control characters are not allowed in XML 1.0.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  );
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function quotedSheet(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function lastColumn(sheet: Sheet): number {
  return Math.max(sheet.widths.length, ...sheet.rows.map((r) => r.length)) - 1;
}

function workbook(sheet: Sheet): string {
  const names: string[] = [];
  const row = sheet.headerRow;
  if (row) {
    const sheetRef = escapeXml(quotedSheet(sheet.name));
    const last = columnName(lastColumn(sheet));
    names.push(
      `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${sheetRef}!$A$${row}:$${last}$${sheet.rows.length}</definedName>`,
      `<definedName name="_xlnm.Print_Titles" localSheetId="0">${sheetRef}!$${row}:$${row}</definedName>`,
    );
  }
  return (
    XML_HEAD +
    `<workbook xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">` +
    `<sheets><sheet name="${escapeXml(sheet.name)}" sheetId="1" r:id="rId1"/></sheets>` +
    (names.length ? `<definedNames>${names.join('')}</definedNames>` : '') +
    '</workbook>'
  );
}

function worksheet(sheet: Sheet): string {
  const out: string[] = [XML_HEAD, `<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">`];
  out.push('<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');

  const freeze = sheet.freeze;
  if (freeze && (freeze.rows || freeze.cols)) {
    const topLeft = `${columnName(freeze.cols)}${freeze.rows + 1}`;
    const pane =
      freeze.rows && freeze.cols ? 'bottomRight' : freeze.rows ? 'bottomLeft' : 'topRight';
    out.push(
      '<sheetViews><sheetView workbookViewId="0">' +
        `<pane${freeze.cols ? ` xSplit="${freeze.cols}"` : ''}${freeze.rows ? ` ySplit="${freeze.rows}"` : ''}` +
        ` topLeftCell="${topLeft}" activePane="${pane}" state="frozen"/>` +
        `<selection pane="${pane}" activeCell="${topLeft}" sqref="${topLeft}"/>` +
        '</sheetView></sheetViews>',
    );
  }

  if (sheet.widths.length) {
    out.push('<cols>');
    sheet.widths.forEach((w, i) =>
      out.push(`<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`),
    );
    out.push('</cols>');
  }

  out.push('<sheetData>');
  sheet.rows.forEach((row, r) => {
    out.push(`<row r="${r + 1}">`);
    row.forEach((cell, c) => {
      if (!cell) return;
      const ref = `${columnName(c)}${r + 1}`;
      const s = cell.style ? ` s="${STYLE_INDEX[cell.style]}"` : '';
      out.push(
        cell.value === ''
          ? `<c r="${ref}"${s}/>`
          : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.value)}</t></is></c>`,
      );
    });
    out.push('</row>');
  });
  out.push('</sheetData>');

  if (sheet.headerRow && sheet.rows.length > sheet.headerRow) {
    const last = columnName(lastColumn(sheet));
    out.push(`<autoFilter ref="A${sheet.headerRow}:${last}${sheet.rows.length}"/>`);
  }
  out.push(
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>',
    `<pageSetup orientation="${sheet.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>`,
    '</worksheet>',
  );
  return out.join('');
}

const CONTENT_TYPES =
  XML_HEAD +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const ROOT_RELS =
  XML_HEAD +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
  '</Relationships>';

const WORKBOOK_RELS =
  XML_HEAD +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
  `<Relationship Id="rId2" Type="${REL_NS}/styles" Target="styles.xml"/>` +
  '</Relationships>';

const BLUE = 'FF1E3F9E';
const top = '<alignment vertical="top"/>';

/** Fonts, fills and borders by index; the cellXfs order matches STYLE_INDEX. */
const STYLES =
  XML_HEAD +
  `<styleSheet xmlns="${MAIN_NS}">` +
  '<fonts count="5">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  `<font><b/><sz val="14"/><color rgb="${BLUE}"/><name val="Calibri"/></font>` +
  '<font><sz val="11"/><color rgb="FF6B7285"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFB01418"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="4">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  `<fill><patternFill patternType="solid"><fgColor rgb="${BLUE}"/><bgColor indexed="64"/></patternFill></fill>` +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2B3"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border>' +
  ['left', 'right', 'top', 'bottom']
    .map((side) => `<${side} style="thin"><color rgb="FFD5DAE5"/></${side}>`)
    .join('') +
  '<diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="10">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">${top}</xf>` +
  `<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1">${top}</xf>` +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
  `<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">${top}</xf>` +
  `<xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1">${top}</xf>` +
  `<xf numFmtId="49" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1" applyAlignment="1">${top}</xf>` +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';
