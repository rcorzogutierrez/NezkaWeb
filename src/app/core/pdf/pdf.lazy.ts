/** jsPDF and the document layouts, loaded the first time someone asks for a PDF. */
import { jsPDF } from 'jspdf';
import { COMPANY_NAME, type BrandImages } from './pdf-kit';
import { type ProformaInput, drawProforma } from './proforma';

function newDocument(title: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.setProperties({ title, creator: COMPANY_NAME, author: COMPANY_NAME });
  return doc;
}

/** One or more proformas in one PDF, each starting on a new page. */
export function proformasPdf(inputs: readonly ProformaInput[], brand: BrandImages): Blob {
  const first = inputs[0]?.estimate;
  const doc = newDocument(
    inputs.length === 1 && first ? `${first.number} – ${first.clientName}` : 'Proformas',
  );
  inputs.forEach((input, i) => {
    if (i) doc.addPage();
    drawProforma(doc, input, brand);
  });
  return doc.output('blob');
}
