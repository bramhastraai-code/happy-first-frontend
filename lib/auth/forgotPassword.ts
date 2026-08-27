/** Build /forgot-password URL with optional phone + country prefill. */
export function buildForgotPasswordHref(
  phoneNumber?: string,
  countryCode?: string,
  options?: { fromRegister?: boolean }
): string {
  const params = new URLSearchParams();
  const phone = String(phoneNumber || '').replace(/\D/g, '');
  const country = String(countryCode || '').trim();
  if (phone) params.set('phone', phone);
  if (country) params.set('country', country);
  if (options?.fromRegister) params.set('from', 'register');
  const query = params.toString();
  return query ? `/forgot-password?${query}` : '/forgot-password';
}

export function isExistingAccountError(message?: string | null): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('user already')
  );
}
