import type { jsPDF } from 'jspdf';

/**
 * Shared drawing for the PDFs (proforma and catalog), in points on a US Letter page, after
 * the desktop app's `proforma.py`. Texts on the documents are in English, like the desktop's.
 */
export const PAGE_W = 612;
export const PAGE_H = 792;
export const MARGIN = 36;
export const CONTENT_W = PAGE_W - 2 * MARGIN;
export const FOOTER_Y = 752;

export const BLUE = '#1e3f9e';
export const RED = '#d7191f';
export const INK = '#1f2433';
export const MUTED = '#6b7285';
export const LINE = '#e3e7ef';
export const ROW_ALT = '#f5f7fb';
export const WHITE = '#ffffff';

export const COMPANY_NAME = 'Elpidio Jr. Produce Co.';
export const COMPANY_LINES = [
  '5400 NW 32nd Ct.',
  'Miami, FL 33142',
  'elpidiojrproduce@aol.com',
  'Ph: 305-324-5556 · Cel: 305-525-1260',
];

/** Brand pictures as JPEG data URLs with their pixel size. */
export interface PdfImage {
  readonly data: string;
  readonly width: number;
  readonly height: number;
}

export interface BrandImages {
  readonly logo: PdfImage | null;
  readonly mascots: PdfImage | null;
}

export const LINE_HEIGHT = 1.2;

type Align = 'left' | 'center' | 'right';

/** Thin wrapper over jsPDF with the few operations the documents need. */
export class Painter {
  constructor(readonly doc: jsPDF) {
    doc.setLineHeightFactor(LINE_HEIGHT);
  }

  font(size: number, bold = false, color = INK): void {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(color);
  }

  /** One line of text vertically centered in a box. */
  text(
    value: string,
    x: number,
    y: number,
    w: number,
    h: number,
    size: number,
    opts: { bold?: boolean; color?: string; align?: Align } = {},
  ): void {
    if (!value) return;
    this.font(size, opts.bold, opts.color);
    const align = opts.align ?? 'left';
    const tx = align === 'left' ? x : align === 'center' ? x + w / 2 : x + w;
    this.doc.text(this.fit(value, w), tx, y + h / 2, { align, baseline: 'middle' });
  }

  /** Cuts a line that does not fit, with an ellipsis. */
  fit(value: string, w: number): string {
    if (this.doc.getTextWidth(value) <= w) return value;
    let cut = value;
    while (cut.length > 1 && this.doc.getTextWidth(cut + '…') > w) cut = cut.slice(0, -1);
    return cut + '…';
  }

  /** Wrapped lines of a paragraph at the current font. */
  lines(value: string, w: number, size: number, bold = false): string[] {
    this.font(size, bold);
    return this.doc.splitTextToSize(value, w) as string[];
  }

  /** Height of `count` lines at a font size. */
  static height(count: number, size: number): number {
    return count * size * LINE_HEIGHT;
  }

  /** A wrapped paragraph starting at the top of a box. */
  paragraph(
    lines: string[],
    x: number,
    y: number,
    size: number,
    opts: { bold?: boolean; color?: string } = {},
  ): void {
    if (!lines.length) return;
    this.font(size, opts.bold, opts.color);
    this.doc.text(lines, x, y, { baseline: 'top' });
  }

  fill(x: number, y: number, w: number, h: number, color: string): void {
    this.doc.setFillColor(color);
    this.doc.rect(x, y, w, h, 'F');
  }

  hline(x1: number, x2: number, y: number, color = LINE, width = 0.6): void {
    this.doc.setDrawColor(color);
    this.doc.setLineWidth(width);
    this.doc.line(x1, y, x2, y);
  }

  /** An image scaled to fit a box, centered in it. */
  image(img: PdfImage | null, x: number, y: number, w: number, h: number): void {
    if (!img) return;
    const ratio = Math.min(w / img.width, h / img.height);
    const iw = img.width * ratio;
    const ih = img.height * ratio;
    // jsPDF reuses an image added twice when it has the same alias.
    this.doc.addImage(img.data, 'JPEG', x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, aliasOf(img));
  }
}

const aliases = new WeakMap<PdfImage, string>();
let nextAlias = 0;
function aliasOf(img: PdfImage): string {
  let alias = aliases.get(img);
  if (!alias) aliases.set(img, (alias = `img${nextAlias++}`));
  return alias;
}

export function money(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Blue and red bars on top, and the footer with the company, a label and the page number. */
export function pageFrame(p: Painter, page: number, label: string): void {
  p.fill(0, 0, PAGE_W, 4.5, BLUE);
  p.fill(0, 4.5, PAGE_W, 2, RED);
  p.hline(MARGIN, PAGE_W - MARGIN, FOOTER_Y);
  const y = FOOTER_Y + 4;
  p.text(COMPANY_NAME.toUpperCase(), MARGIN, y, 110, 14, 6.5, { bold: true, color: BLUE });
  if (label) p.text(`|  ${label}`, MARGIN + 108, y, CONTENT_W - 170, 14, 6.5, { color: MUTED });
  p.text(`Page ${page}`, MARGIN, y, CONTENT_W, 14, 6.5, { color: MUTED, align: 'right' });
}

/** Logo, mascots and the company's address, at the top of the first page. */
export function companyHeading(p: Painter, brand: BrandImages): void {
  p.image(brand.logo, MARGIN, 33, 158.4, 67);
  p.image(brand.mascots, 459, 33, 117, 68.4);
  p.text(COMPANY_NAME, 200, 36, 250, 13, 8.5, { bold: true, align: 'center' });
  COMPANY_LINES.forEach((line, i) =>
    p.text(line, 200, 49 + i * 12.4, 250, 13, 7.5, { align: 'center' }),
  );
}

/** Where content must stop so it does not run into the footer. */
export const CONTENT_BOTTOM = FOOTER_Y - 8;
