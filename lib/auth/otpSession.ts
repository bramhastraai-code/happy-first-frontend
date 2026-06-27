export const DEFAULT_OTP_EXPIRY_MINUTES = 10;
export const DEFAULT_OTP_EXPIRY_SECONDS = DEFAULT_OTP_EXPIRY_MINUTES * 60;

function sessionKey(phoneNumber: string, countryCode: string) {
  return `otp_expires_${countryCode}_${phoneNumber}`;
}

export function markOtpSession(
  phoneNumber: string,
  countryCode: string,
  expiresInSeconds = DEFAULT_OTP_EXPIRY_SECONDS
) {
  if (typeof window === 'undefined') return;
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  sessionStorage.setItem(sessionKey(phoneNumber, countryCode), String(expiresAt));
}

export function getOtpSecondsLeft(phoneNumber: string, countryCode: string): number {
  if (typeof window === 'undefined') return 0;
  const raw = sessionStorage.getItem(sessionKey(phoneNumber, countryCode));
  if (!raw) return 0;
  const expiresAt = Number.parseInt(raw, 10);
  if (Number.isNaN(expiresAt)) return 0;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

export function formatOtpCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
