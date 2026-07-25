/** Compress/resize an image file for upload (max edge 1280px, JPEG ~0.82). */
export async function compressImageForUpload(
  file: File,
  options?: { maxEdge?: number; quality?: number }
): Promise<Blob> {
  const maxEdge = options?.maxEdge ?? 1280;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  // Skip canvas for HEIC — browsers often can't decode it here.
  if (/heic|heif/i.test(file.type) || /\.heic$/i.test(file.name)) {
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
