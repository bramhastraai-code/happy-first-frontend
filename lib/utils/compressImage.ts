/** Compress/resize an image file for upload (max edge 1280px, JPEG ~0.82). */
export async function compressImageForUpload(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? 1280;
  const quality = options?.quality ?? 0.82;

  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  const hasImageMime = file.type.startsWith('image/');
  const hasImageExt = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name);

  // Files app pickers often omit MIME type — allow by extension.
  if (!hasImageMime && !hasImageExt) {
    throw new Error('Please choose an image file');
  }

  // Skip canvas for HEIC — browsers often can't decode it here.
  if (isHeic) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
  });

  return blob ?? file;
}
