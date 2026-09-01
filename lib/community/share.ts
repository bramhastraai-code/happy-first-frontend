export function getCommunityJoinPath(communityId: string, inviterProfileId?: string | null) {
  const base = `/community/join/${communityId}`;
  const inviter = String(inviterProfileId || '').trim();
  if (!inviter) return base;
  return `${base}?invitedBy=${encodeURIComponent(inviter)}`;
}

export function getCommunityJoinUrl(communityId: string, inviterProfileId?: string | null) {
  if (typeof window === 'undefined') return getCommunityJoinPath(communityId, inviterProfileId);
  return `${window.location.origin}${getCommunityJoinPath(communityId, inviterProfileId)}`;
}

export function parseCommunityInviterFromUrl(search: string): string | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const raw = params.get('invitedBy') || params.get('inviter');
    const id = String(raw || '').trim();
    return /^[a-f0-9]{24}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
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
