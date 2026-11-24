import type { jsPDF } from 'jspdf';
import { longDate } from '../estimates/estimate';
import type { Product } from '../products/product';
import {
  BLUE,
  type BrandImages,
  CONTENT_BOTTOM,
  CONTENT_W,
  MARGIN,
  MUTED,
  Painter,
  type PdfImage,
  ROW_ALT,
  WHITE,
  companyHeading,
  money,
  pageFrame,
} from './pdf-kit';

export const CATALOG_TITLE = 'Product Catalog';

export interface CatalogInput {
  readonly products: readonly Product[];
  readonly showPrices: boolean;
  /** ISO date printed on the catalog. */
  readonly date: string;
  /** Product photos by product id. */
  readonly photos: ReadonlyMap<string, PdfImage>;
}

const PHOTO_BOX = { w: 50, h: 44 };
const HEADER_H = 29;
const PRICE_W = 52;
const TEXT = 7.6;

interface Column {
  readonly title: string[];
  readonly x: number;
  readonly w: number;
  readonly align: 'left' | 'center' | 'right';
}

/** Columns of the desktop catalog; without prices the description takes the space. */
function columns(showPrices: boolean): Column[] {
  const extra = showPrices ? 0 : PRICE_W;
  const cols: Column[] = [
    { title: ['PHOTO'], x: MARGIN, w: 60, align: 'center' },
    { title: ['REF. / ITEM DESCRIPTION'], x: 100, w: 184 + extra, align: 'left' },
  ];
  let x = 288 + extra;
  for (const [title, w, align] of [
    [['UPC'], 78, 'left'],
    [['ITEM SIZE', 'UNIT'], 60, 'left'],
    [['PACK'], 50, 'center'],
    [['BOXES PER', 'PALLET'], 48, 'center'],
  ] as const) {
    cols.push({ title: [...title], x, w, align });
    x += w;
  }
  if (showPrices) cols.push({ title: ['PRICE', 'PER BOX'], x, w: PRICE_W, align: 'right' });
  return cols;
}

function cell(c: Column) {
  return { x: c.x, w: c.w - (c.align === 'right' ? 4 : 0), align: c.align };
}

/** `Catalogo_Elpidio_Jr_2026-11-24.pdf`, like the desktop app. */
export function catalogFileName(date: string): string {
  return `Catalogo_Elpidio_Jr_${date}.pdf`;
}

/** Draws the catalog, starting on the current page. Returns the pages it used. */
export function drawCatalog(doc: jsPDF, input: CatalogInput, brand: BrandImages): number {
  const p = new Painter(doc);
  const cols = columns(input.showPrices);

  const rows = input.products.map((product) => {
    const photo = input.photos.get(product.id) ?? null;
    const photoH = photo
      ? photo.height * Math.min(PHOTO_BOX.w / photo.width, PHOTO_BOX.h / photo.height)
      : 0;
    let prefixW = 0;
    if (product.ref) {
      p.font(TEXT, true);
      prefixW = doc.getTextWidth(`${product.ref}. `);
    }
    const desc = p.lines(product.description, cols[1].w - prefixW, TEXT);
    const size = p.lines(product.size, cols[3].w - 4, 6.8);
    const textH = Math.max(Painter.height(desc.length, TEXT), Painter.height(size.length, 6.8));
    return { product, photo, desc, size, prefixW, height: Math.max(30, photoH + 10, textH + 12) };
  });

  let page = 1;
  pageFrame(p, page, CATALOG_TITLE);
  companyHeading(p, brand);
  let y = titleBlock(p, input) + 14;
  y = tableHeader(p, cols, y);
  rows.forEach((row, index) => {
    if (y + row.height > CONTENT_BOTTOM) {
      doc.addPage();
      pageFrame(p, ++page, CATALOG_TITLE);
      y = tableHeader(p, cols, 30);
    }
    const h = row.height;
    if (index % 2 === 1) p.fill(MARGIN, y, CONTENT_W, h, ROW_ALT);
    p.hline(MARGIN, MARGIN + CONTENT_W, y + h);

    const photo = cell(cols[0]);
    p.image(
      row.photo,
      photo.x + (photo.w - PHOTO_BOX.w) / 2,
      y + (h - PHOTO_BOX.h) / 2,
      PHOTO_BOX.w,
      PHOTO_BOX.h,
    );

    const desc = cell(cols[1]);
    const top = y + (h - Painter.height(row.desc.length, TEXT)) / 2;
    if (row.product.ref) {
      p.text(`${row.product.ref}.`, desc.x, top, 40, TEXT * 1.2, TEXT, { bold: true });
    }
    p.paragraph(row.desc, desc.x + row.prefixW, top + 0.6, TEXT);

    const at = (
      i: number,
      value: string,
      size: number,
      opts: { bold?: boolean; color?: string } = {},
    ) => {
      const c = cell(cols[i]);
      p.text(value, c.x, y, c.w, h, size, { ...opts, align: c.align });
    };
    at(2, row.product.upc, 6.8);
    const sizeCell = cell(cols[3]);
    p.paragraph(
      row.size,
      sizeCell.x,
      y + (h - Painter.height(row.size.length, 6.8)) / 2 + 0.6,
      6.8,
      {
        color: MUTED,
      },
    );
    at(4, row.product.pack, 7.2);
    at(5, row.product.qtyPerPallet, 7.2);
    if (input.showPrices) {
      at(6, row.product.pricePerBox ? money(row.product.pricePerBox) : '—', TEXT, { bold: true });
    }
    y += h;
  });
  return page;
}

function titleBlock(p: Painter, input: CatalogInput): number {
  const top = 117;
  const height = 46;
  p.fill(MARGIN, top, CONTENT_W, height, ROW_ALT);
  p.fill(MARGIN, top, 4, height, BLUE);
  const left = MARGIN + 16;
  p.text(CATALOG_TITLE.toUpperCase(), left, top + 8, CONTENT_W / 2, 18, 13, {
    bold: true,
    color: BLUE,
  });
  const count = input.products.length;
  let detail = `${count} product${count === 1 ? '' : 's'}`;
  if (input.showPrices) detail += ' · Prices in USD per box, subject to change without notice';
  p.text(detail, left, top + 26, CONTENT_W - 140, 18, 7.2, { color: MUTED });
  const right = MARGIN + CONTENT_W / 2;
  const w = CONTENT_W / 2 - 14;
  p.text('DATE', right, top + 8, w, 12, 6.3, { bold: true, color: BLUE, align: 'right' });
  p.text(longDate(input.date), right, top + 22, w, 12, 7.5, { bold: true, align: 'right' });
  return top + height;
}

function tableHeader(p: Painter, cols: readonly Column[], y: number): number {
  p.fill(MARGIN, y, CONTENT_W, HEADER_H, BLUE);
  for (const c of cols) {
    const { x, w, align } = cell(c);
    const lineH = 7.6;
    const start = y + (HEADER_H - c.title.length * lineH) / 2;
    c.title.forEach((t, j) =>
      p.text(t, x, start + j * lineH, w, lineH, 6.3, { bold: true, color: WHITE, align }),
    );
  }
  return y + HEADER_H;
}
