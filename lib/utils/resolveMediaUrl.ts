/** Resolve activity photo URLs (absolute S3/CloudFront, or relative app paths). */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
}
