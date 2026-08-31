export function getCommunityJoinPath(communityId: string) {
  return `/community/join/${communityId}`;
}

export function getCommunityJoinUrl(communityId: string) {
  if (typeof window === 'undefined') return getCommunityJoinPath(communityId);
  return `${window.location.origin}${getCommunityJoinPath(communityId)}`;
}

export function parseCommunityIdFromQrText(raw: string): string | null {
  const text = String(raw || '').trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const match = url.pathname.match(/\/community\/(?:join\/)?([a-f0-9]{24})\/?/i);
    if (match?.[1]) return match[1];
  } catch {
    // not a full URL — try path or bare id
  }

  const pathMatch = text.match(/\/community\/(?:join\/)?([a-f0-9]{24})\/?/i);
  if (pathMatch?.[1]) return pathMatch[1];

  if (/^[a-f0-9]{24}$/i.test(text)) return text;

  return null;
}
