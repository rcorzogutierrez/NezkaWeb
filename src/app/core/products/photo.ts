/** Longest side of a stored photo, as in the desktop app. */
export const PHOTO_MAX_SIDE = 600;
/** Largest file accepted before resizing; `storage.rules` caps the stored file at 2 MB. */
export const PHOTO_MAX_INPUT_BYTES = 15 * 1024 * 1024;

export class PhotoError extends Error {
  constructor(readonly code: 'notImage' | 'tooBig') {
    super(code);
  }
}

/**
 * Scales the picture down to PHOTO_MAX_SIDE on a white background (the photos are product
 * shots on white) and encodes it as WebP, so the list loads fast on a phone.
 */
export async function preparePhoto(file: Blob): Promise<Blob> {
  if (file.size > PHOTO_MAX_INPUT_BYTES) throw new PhotoError('tooBig');
  if (file.type && !file.type.startsWith('image/')) throw new PhotoError('notImage');
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PhotoError('notImage');
  }
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoError('notImage');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85),
  );
  if (!blob) throw new PhotoError('notImage');
  return blob;
}
