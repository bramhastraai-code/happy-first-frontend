/** Time-based greeting used on home-style page headers. */
export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstNameFrom(fullName?: string | null, fallback = 'there') {
  const name = String(fullName || '').trim();
  if (!name) return fallback;
  return name.split(/\s+/)[0] || fallback;
}
