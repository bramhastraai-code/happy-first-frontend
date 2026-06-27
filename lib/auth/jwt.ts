export interface JwtPayload {
  exp?: number;
  userId?: string;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiryMs(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000;
}

export function isTokenExpired(token: string, bufferMs = 0): boolean {
  const expiry = getTokenExpiryMs(token);
  if (!expiry) return false;
  return Date.now() >= expiry - bufferMs;
}

export function isTokenExpiringSoon(token: string, bufferMs = 2 * 60 * 1000): boolean {
  return isTokenExpired(token, bufferMs);
}
