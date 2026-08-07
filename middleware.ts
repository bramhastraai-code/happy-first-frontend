import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_ROUTES, PROTECTED_APP_ROUTES } from '@/lib/navigation/protectedRoutes';

function hasSession(request: NextRequest): boolean {
  // Access cookie is the normal gate. Refresh cookie (httpOnly, same-origin via
  // the Next proxy) proves the 7-day session is still alive when the short-lived
  // access cookie was dropped by a PWA / browser storage purge.
  return Boolean(
    request.cookies.get('accessToken')?.value ||
      request.cookies.get('refreshToken')?.value
  );
}

export function middleware(request: NextRequest) {
  const loggedIn = hasSession(request);
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    if (loggedIn) {
      return NextResponse.redirect(new URL('/select-profile', request.url));
    }
    return NextResponse.next();
  }

  if (PROTECTED_APP_ROUTES.some((route) => pathname.startsWith(route))) {
    if (pathname.startsWith('/tracker/live/share/')) {
      return NextResponse.next();
    }
    if (!loggedIn) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (AUTH_ROUTES.some((route) => pathname.startsWith(route)) && loggedIn) {
    return NextResponse.redirect(new URL('/select-profile', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|icons|serwist|manifest.webmanifest|sitemap.xml|robots.txt|opengraph-image|~offline|.*\\..*).*)',
  ],
};
