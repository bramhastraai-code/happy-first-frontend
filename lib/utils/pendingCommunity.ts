const PENDING_COMMUNITY_KEY = 'happyFirst.pendingCommunityId';
const PENDING_INVITER_KEY = 'happyFirst.pendingCommunityInviterProfileId';

/** Remember community invite while user registers / logs in. */
export function setPendingCommunityId(communityId: string, inviterProfileId?: string | null) {
  if (typeof window === 'undefined') return;
  const id = String(communityId || '').trim();
  if (!id) return;
  try {
    window.localStorage.setItem(PENDING_COMMUNITY_KEY, id);
    const inviter = String(inviterProfileId || '').trim();
    if (inviter) {
      window.localStorage.setItem(PENDING_INVITER_KEY, inviter);
    } else {
      window.localStorage.removeItem(PENDING_INVITER_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getPendingCommunityId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PENDING_COMMUNITY_KEY);
  } catch {
    return null;
  }
}

export function getPendingCommunityInviterProfileId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(PENDING_INVITER_KEY);
  } catch {
    return null;
  }
}

export function clearPendingCommunityId() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PENDING_COMMUNITY_KEY);
    window.localStorage.removeItem(PENDING_INVITER_KEY);
  } catch {
    /* ignore */
  }
}
