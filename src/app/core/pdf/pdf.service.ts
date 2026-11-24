import { DOCUMENT, Service, inject } from '@angular/core';
import { ClientsService } from '../clients/clients.service';
import type { Estimate } from '../estimates/estimate';
import { ProductsService } from '../products/products.service';
import type { BrandImages, PdfImage } from './pdf-kit';

/** Builds the PDFs in the browser: nothing is uploaded, the file is saved or opened locally. */
@Service()
export class PdfService {
  private readonly document = inject(DOCUMENT);
  private readonly clients = inject(ClientsService);
  private readonly products = inject(ProductsService);
  private brand: Promise<BrandImages> | null = null;

  /** The proforma of an estimate, with the client's address and the product photos. */
  async proforma(estimate: Estimate): Promise<Blob> {
    const [lazy, brand, client, photos] = await Promise.all([
      import('./pdf.lazy'),
      this.brandImages(),
      estimate.clientId ? this.clients.get(estimate.clientId).catch(() => null) : null,
      this.photos(estimate.lines.map((l) => l.productId)),
    ]);
    return lazy.proformasPdf([{ estimate, client, photos }], brand);
  }

  /** Saves the file with its name, as the browser's download. */
  download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = fileName;
    this.document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /** Shows the PDF in a new tab, where it can be printed. */
  open(blob: Blob, target: Window | null): void {
    const url = URL.createObjectURL(blob);
    if (target) target.location.href = url;
    else this.document.defaultView?.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10 * 60_000);
  }

  private async photos(ids: readonly string[]): Promise<Map<string, PdfImage>> {
    const thumbs = await this.products.thumbs(ids).catch(() => new Map<string, string>());
    const images = new Map<string, PdfImage>();
    await Promise.all(
      [...thumbs].map(async ([id, data]) => {
        const img = await loadImage(this.document, data).catch(() => null);
        if (img) images.set(id, { data, width: img.naturalWidth, height: img.naturalHeight });
      }),
    );
    return images;
  }

  private brandImages(): Promise<BrandImages> {
    this.brand ??= Promise.all([
      this.asJpeg('brand/logo.webp'),
      this.asJpeg('brand/frutas.webp'),
    ]).then(([logo, mascots]) => ({ logo, mascots }));
    return this.brand;
  }

  /** jsPDF takes JPEG and PNG; the brand pictures are WebP, so they go through a canvas. */
  private async asJpeg(path: string): Promise<PdfImage | null> {
    try {
      const img = await loadImage(this.document, new URL(path, this.document.baseURI).href);
      const canvas = this.document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      return {
        data: canvas.toDataURL('image/jpeg', 0.92),
        width: canvas.width,
        height: canvas.height,
      };
    } catch {
      return null;
    }
  }
}

function loadImage(document: Document, src: string): Promise<HTMLImageElement> {
  const img = document.createElement('img');
  img.src = src;
  return img.decode().then(() => img);
}
