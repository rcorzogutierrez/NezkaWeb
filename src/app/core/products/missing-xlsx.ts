import type { Messages } from '../i18n/messages.es';
import { type Cell, type Sheet, xlsx } from '../xlsx/xlsx';
import { type MissingInfo, type Product, missingInfo } from './product';

export type MissingSheetText = Messages['products']['exportSheet'] &
  Pick<Messages['products'], 'missingShort'>;

interface Column {
  readonly header: string;
  readonly width: number;
  readonly value: (p: Product, lacks: readonly MissingInfo[]) => string;
  /** The missing item that paints the cell yellow. */
  readonly flags?: readonly MissingInfo[];
  readonly style?: 'text' | 'wrap' | 'alert';
}

/**
 * The listed products that lack something, as an Excel sheet to ask the supplier for it (like the
 * desktop app's "Exportar faltantes"). The prices are the company's own, so the sheet never shows
 * them, only whether one is missing.
 */
export function missingDataSheet(
  products: readonly Product[],
  text: MissingSheetText,
  date: string,
  title = text.title,
): Sheet {
  const listed = products
    .map((p) => ({ product: p, lacks: missingInfo(p) }))
    .filter(({ lacks }) => lacks.length > 0);
  const h = text.headers;
  const columns: Column[] = [
    { header: h.ref, width: 7, value: (p) => p.ref },
    { header: h.description, width: 42, value: (p) => p.description },
    {
      header: h.upc,
      width: 17,
      value: (p) => p.upc,
      flags: ['upc', 'upcToConfirm'],
      style: 'text',
    },
    { header: h.size, width: 20, value: (p) => p.size, flags: ['size'] },
    { header: h.pack, width: 9, value: (p) => p.pack, flags: ['pack'] },
    { header: h.pallet, width: 15, value: (p) => p.qtyPerPallet, flags: ['pallet'] },
    { header: h.photo, width: 8, value: (p) => (p.photoUrl ? text.yes : ''), flags: ['photo'] },
    {
      header: h.missing,
      width: 34,
      value: (_p, lacks) => lacks.map((m) => text.missingShort[m]).join(', '),
      style: 'alert',
    },
    { header: h.notes, width: 60, value: (p) => p.notes, style: 'wrap' },
  ];

  const rows: (Cell | null)[][] = [
    [{ value: title, style: 'title' }],
    [{ value: text.subtitle(date, listed.length), style: 'subtitle' }],
    [],
    columns.map((c) => ({ value: c.header, style: 'header' })),
  ];
  for (const { product, lacks } of listed) {
    rows.push(
      columns.map((c) => {
        const flagged = c.flags?.some((f) => lacks.includes(f)) ?? false;
        const style =
          c.style === 'text'
            ? flagged
              ? 'textHighlight'
              : 'text'
            : flagged
              ? 'highlight'
              : (c.style ?? 'cell');
        return { value: c.value(product, lacks), style };
      }),
    );
  }
  return {
    name: text.sheetName,
    widths: columns.map((c) => c.width),
    rows,
    freeze: { rows: 4, cols: 2 },
    headerRow: 4,
    landscape: true,
  };
}

export function missingDataXlsx(
  products: readonly Product[],
  text: MissingSheetText,
  date: string,
  title?: string,
): Blob {
  return xlsx(missingDataSheet(products, text, date, title));
}

/** `Productos_datos_faltantes_2026-11-24.xlsx`, like the desktop app. */
export function missingDataFileName(date: string): string {
  return `Productos_datos_faltantes_${date}.xlsx`;
}
