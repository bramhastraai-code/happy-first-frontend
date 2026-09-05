import { BRAND_NAME, getSiteUrl } from '@/lib/brand';

export function referralInviteUrl(code: string) {
  return `${getSiteUrl()}/register?ref=${code}`;
}

export function referralShareText(url: string) {
  return `Join me on ${BRAND_NAME}! ${url}`;
}

export async function copyReferralLink(url: string) {
  await navigator.clipboard.writeText(url);
}

export async function nativeShareReferral(url: string) {
  if (!navigator.share) return false;
  try {
    await navigator.share({
      title: BRAND_NAME,
      text: referralShareText(url),
      url,
    });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return true;
    return false;
  }
}

export function shareReferralWhatsApp(url: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(referralShareText(url))}`);
}

export function shareReferralEmail(url: string) {
  window.open(
    `mailto:?subject=${encodeURIComponent(`Join ${BRAND_NAME}`)}&body=${encodeURIComponent(referralShareText(url))}`
  );
}

export function shareReferralFacebook(url: string) {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

export async function shareReferralInstagram(url: string) {
  const shared = await nativeShareReferral(url);
  if (shared) return;
  await copyReferralLink(url);
  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
}
