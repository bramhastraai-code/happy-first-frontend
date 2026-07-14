import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_ROUTES, PROTECTED_APP_ROUTES } from '@/lib/navigation/protectedRoutes';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('accessToken');
  const { pathname } = request.nextUrl;

  if (pathname === '/') {
    if (token) {
      return NextResponse.redirect(new URL('/select-profile', request.url));
    }
    return NextResponse.next();
  }

  if (PROTECTED_APP_ROUTES.some((route) => pathname.startsWith(route))) {
    if (pathname.startsWith('/tracker/live/share/')) {
      return NextResponse.next();
    }
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (AUTH_ROUTES.some((route) => pathname.startsWith(route)) && token) {
    return NextResponse.redirect(new URL('/select-profile', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|sitemap.xml|robots.txt|opengraph-image|.*\\..*).*)'],
};
