import type { jsPDF } from 'jspdf';
import { type Client, clientLocation } from '../clients/client';
import { type Estimate, type EstimateLine, lineTotal, longDate } from '../estimates/estimate';
import {
  BLUE,
  type BrandImages,
  CONTENT_BOTTOM,
  CONTENT_W,
  INK,
  MARGIN,
  MUTED,
  PAGE_W,
  Painter,
  type PdfImage,
  ROW_ALT,
  WHITE,
  COMPANY_NAME,
  companyHeading,
  money,
  pageFrame,
} from './pdf-kit';

export interface ProformaInput {
  readonly estimate: Estimate;
  readonly client: Client | null;
  /** Product photos by product id. */
  readonly photos: ReadonlyMap<string, PdfImage>;
}

const PHOTO_BOX = { w: 32, h: 30 };
const HEADER_H = 29;
const TOTALS_W = 216;
const TOTALS_ROW_H = 18;
const TOTAL_BAND_H = 27;
const TEXT = 7.2;

interface Column {
  readonly title: string[];
  readonly x: number;
  readonly w: number;
  readonly align: 'left' | 'center' | 'right';
}

/** Columns of the reference proforma PF-2026-1028. */
const COLUMNS: readonly Column[] = [
  { title: ['PHOTO'], x: MARGIN, w: 46, align: 'center' },
  { title: ['REF. / ITEM DESCRIPTION'], x: 86, w: 162, align: 'left' },
  { title: ['UPC'], x: 253, w: 70, align: 'left' },
  { title: ['ITEM SIZE', 'UNIT'], x: 324, w: 52, align: 'left' },
  { title: ['PACK'], x: 384, w: 58, align: 'center' },
  { title: ['BOX'], x: 444, w: 30, align: 'center' },
  { title: ['PRICE', 'PER BOX'], x: 474, w: 45, align: 'right' },
  { title: ['TOTAL'], x: 519, w: 54, align: 'right' },
];

/** The cell's box; right-aligned columns keep 4 pt from the next one. */
function cell(index: number): { x: number; w: number; align: Column['align'] } {
  const c = COLUMNS[index];
  return { x: c.x, w: c.w - (c.align === 'right' ? 4 : 0), align: c.align };
}

interface Row {
  readonly line: EstimateLine;
  readonly photo: PdfImage | null;
  readonly desc: string[];
  readonly prefixW: number;
  readonly height: number;
}

/** Draws one estimate, starting on the current page. Returns the pages it used. */
export function drawProforma(doc: jsPDF, input: ProformaInput, brand: BrandImages): number {
  const p = new Painter(doc);
  const { estimate } = input;
  const label = estimate.clientName;
  const rows = estimate.lines.map((line) => measure(p, line, input.photos));

  let page = 1;
  pageFrame(p, page, label);
  companyHeading(p, brand);
  let y = letterhead(p, input) + 14;
  y = tableHeader(p, y);
  rows.forEach((row, index) => {
    if (y + row.height > CONTENT_BOTTOM) {
      doc.addPage();
      pageFrame(p, ++page, label);
      y = tableHeader(p, 30);
    }
    tableRow(p, row, y, index % 2 === 1);
    y += row.height;
  });
  if (y + closingHeight(p, estimate) > CONTENT_BOTTOM) {
    doc.addPage();
    pageFrame(p, ++page, label);
    y = 30;
  }
  closing(p, estimate, y + 18);
  return page;
}

function measure(p: Painter, line: EstimateLine, photos: ProformaInput['photos']): Row {
  const photo = (line.productId && photos.get(line.productId)) || null;
  let photoH = 0;
  if (photo)
    photoH = photo.height * Math.min(PHOTO_BOX.w / photo.width, PHOTO_BOX.h / photo.height);
  const { w } = cell(1);
  let prefixW = 0;
  if (line.ref) {
    p.font(TEXT, true);
    prefixW = p.doc.getTextWidth(`${line.ref}. `);
  }
  const desc = p.lines(line.description, w - prefixW, TEXT);
  const textH = Painter.height(desc.length, TEXT);
  return { line, photo, desc, prefixW, height: Math.max(21, photoH + 8, textH + 10) };
}

function letterhead(p: Painter, { estimate, client }: ProformaInput): number {
  const top = 117;
  const customer: string[] = [];
  if (client) {
    customer.push(client.branch, client.address, clientLocation(client), client.country);
    customer.push([client.phone, client.email].filter(Boolean).join(' · '));
  } else if (estimate.clientBranch) {
    customer.push(estimate.clientBranch);
  }
  const customerLines = customer.filter(Boolean);
  const name = client?.name || estimate.clientName;
  const reference = estimate.reference.trim() || '—';
  const widths = [CONTENT_W * 0.44, CONTENT_W * 0.3, CONTENT_W * 0.26];
  const refLines = p.lines(reference, widths[1] - 22, TEXT);
  const refH = Painter.height(refLines.length, TEXT);
  const height = Math.max(52, 36 + 11 * customerLines.length + 10, 24 + refH + 10);

  let x = MARGIN;
  for (const w of widths) {
    p.fill(x, top, w - 1.5, height, ROW_ALT);
    x += w;
  }

  x = MARGIN + 11;
  p.text('CUSTOMER', x, top + 10, 200, 10, 6.3, { bold: true, color: BLUE });
  p.text(name, x, top + 24, widths[0] - 22, 12, 7.5, { bold: true });
  customerLines.forEach((line, i) =>
    p.text(line, x, top + 36 + i * 11, widths[0] - 22, 11, TEXT, { color: MUTED }),
  );

  x = MARGIN + widths[0] + 11;
  p.text('REFERENCE', x, top + 10, 200, 10, 6.3, { bold: true, color: BLUE });
  p.paragraph(refLines, x, top + 25, TEXT);

  x = MARGIN + widths[0] + widths[1] + 11;
  p.text('PROFORMA', x, top + 10, 200, 10, 6.3, { bold: true, color: BLUE });
  p.text(estimate.number, x, top + 24, widths[2] - 22, 12, 7.5, { bold: true });
  p.text(longDate(estimate.date), x, top + 36, widths[2] - 22, 11, TEXT, { color: MUTED });
  return top + height;
}

function tableHeader(p: Painter, y: number): number {
  p.fill(MARGIN, y, CONTENT_W, HEADER_H, BLUE);
  COLUMNS.forEach((c, i) => {
    const { x, w, align } = cell(i);
    const lineH = 7.6;
    const start = y + (HEADER_H - c.title.length * lineH) / 2;
    c.title.forEach((t, j) =>
      p.text(t, x, start + j * lineH, w, lineH, 6.3, { bold: true, color: WHITE, align }),
    );
  });
  return y + HEADER_H;
}

function tableRow(p: Painter, row: Row, y: number, shaded: boolean): void {
  const { line } = row;
  const h = row.height;
  if (shaded) p.fill(MARGIN, y, CONTENT_W, h, ROW_ALT);
  p.hline(MARGIN, PAGE_W - MARGIN, y + h);

  const photo = cell(0);
  p.image(
    row.photo,
    photo.x + (photo.w - PHOTO_BOX.w) / 2,
    y + (h - PHOTO_BOX.h) / 2,
    PHOTO_BOX.w,
    PHOTO_BOX.h,
  );

  // Bold "01." followed by the description, wrapping inside the column.
  const desc = cell(1);
  const textH = Painter.height(row.desc.length, TEXT);
  const top = y + (h - textH) / 2;
  if (line.ref) p.text(`${line.ref}.`, desc.x, top, 40, TEXT * 1.2, TEXT, { bold: true });
  p.paragraph(row.desc, desc.x + row.prefixW, top + 0.6, TEXT);

  const at = (i: number, value: string, size: number, opts: { bold?: boolean; color?: string }) => {
    const c = cell(i);
    p.text(value, c.x, y, c.w, h, size, { ...opts, align: c.align });
  };
  at(2, line.upc, 6.8, {});
  at(3, line.size, 6.8, { color: MUTED });
  at(4, line.pack, TEXT, {});
  at(5, line.boxes.toLocaleString('en-US'), TEXT, { bold: true });
  at(6, money(line.pricePerBox), TEXT, {});
  at(7, money(lineTotal(line)), TEXT, { bold: true });
}

function notesLines(p: Painter, estimate: Estimate): string[] {
  const notes = estimate.notes.trim();
  return notes ? p.lines(notes, CONTENT_W - TOTALS_W - 30, TEXT) : [];
}

function closingHeight(p: Painter, estimate: Estimate): number {
  const totalsH = 3 * TOTALS_ROW_H + TOTAL_BAND_H;
  const lines = notesLines(p, estimate);
  const notesH = lines.length ? 14 + Painter.height(lines.length, TEXT) : 0;
  return 18 + Math.max(totalsH, notesH) + 70;
}

function closing(p: Painter, estimate: Estimate, y: number): void {
  const x = PAGE_W - MARGIN - TOTALS_W;
  const count = estimate.lines.length;
  const rows: [string, string][] = [
    ['Items quoted', `${count} of ${count}`],
    ['Boxes', estimate.totalBoxes.toLocaleString('en-US')],
    ['Subtotal', money(estimate.total)],
  ];
  rows.forEach(([label, value], i) => {
    const ry = y + i * TOTALS_ROW_H;
    p.text(label, x + 9, ry, TOTALS_W - 18, TOTALS_ROW_H, TEXT);
    p.text(value, x + 9, ry, TOTALS_W - 18, TOTALS_ROW_H, TEXT, { align: 'right' });
    if (i < rows.length - 1) p.hline(x + 9, x + TOTALS_W - 4, ry + TOTALS_ROW_H);
  });
  const bandY = y + 3 * TOTALS_ROW_H + 2;
  p.fill(x, bandY, TOTALS_W, TOTAL_BAND_H, BLUE);
  p.text('TOTAL USD', x + 9, bandY, TOTALS_W - 18, TOTAL_BAND_H, 10, { bold: true, color: WHITE });
  p.text(money(estimate.total), x + 9, bandY, TOTALS_W - 18, TOTAL_BAND_H, 11, {
    bold: true,
    color: WHITE,
    align: 'right',
  });
  let bottom = bandY + TOTAL_BAND_H;

  const lines = notesLines(p, estimate);
  if (lines.length) {
    p.text('NOTES', MARGIN, y, 200, 10, 6.3, { bold: true, color: BLUE });
    p.paragraph(lines, MARGIN, y + 14, TEXT);
    bottom = Math.max(bottom, y + 14 + Painter.height(lines.length, TEXT));
  }

  const signY = bottom + 50;
  p.hline(MARGIN, MARGIN + 150, signY - 2, INK, 0.6);
  p.text(`${COMPANY_NAME} · Authorized signature`, MARGIN, signY + 1, 300, 11, TEXT, {
    color: MUTED,
  });
}
