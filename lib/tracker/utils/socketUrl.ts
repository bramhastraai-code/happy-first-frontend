export function getSocketBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const configured =
      process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_API_BACKEND_URL?.replace(/\/$/, '');
    if (configured) return configured;
    return window.location.origin;
  }

  return (
    process.env.NEXT_PUBLIC_SOCKET_URL?.replace(/\/$/, '') ||
    process.env.API_BACKEND_URL?.replace(/\/$/, '') ||
    'http://localhost:8000'
  );
}
