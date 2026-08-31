export function getCommunityJoinPath(communityId: string) {
  return `/community/join/${communityId}`;
}

export function getCommunityJoinUrl(communityId: string) {
  if (typeof window === 'undefined') return getCommunityJoinPath(communityId);
  return `${window.location.origin}${getCommunityJoinPath(communityId)}`;
}

const OBJECT_ID = /[a-f0-9]{24}/i;

function idFromPathname(pathname: string): string | null {
  const match = pathname.match(/\/community\/(?:join\/)?([a-f0-9]{24})\/?/i);
  return match?.[1] ?? null;
}

export function parseCommunityIdFromQrText(raw: string): string | null {
  const text = String(raw || '').trim().replace(/^\uFEFF/, '');
  if (!text) return null;

  try {
    const url = new URL(text);
    const fromPath = idFromPathname(url.pathname);
    if (fromPath) return fromPath;
    const fromQuery =
      url.searchParams.get('community') ||
      url.searchParams.get('communityId') ||
      url.searchParams.get('id');
    if (fromQuery && OBJECT_ID.test(fromQuery.trim()) && fromQuery.trim().length === 24) {
      return fromQuery.trim();
    }
  } catch {
    // not a full URL — try path or bare id
  }

  try {
    const decoded = decodeURIComponent(text);
    if (decoded !== text) {
      const nested = parseCommunityIdFromQrText(decoded);
      if (nested) return nested;
    }
  } catch {
    // ignore malformed encoding
  }

  const pathMatch = idFromPathname(text);
  if (pathMatch) return pathMatch;

  if (/^[a-f0-9]{24}$/i.test(text)) return text;

  const anyId = text.match(/\b[a-f0-9]{24}\b/i);
  return anyId?.[0] ?? null;
}
