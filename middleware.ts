import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('accessToken');
    const { pathname } = request.nextUrl;

    const protectedRoutes = ['/home', '/tasks', '/referral', '/community', '/profile-setup', '/select-profile', '/change-password', '/settings', '/add-family-member'];
    const authRoutes = ['/login', '/register', '/verify-otp'];

    // 1. Handle root path ("/")
    if (pathname === '/') {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        } else {
            // Redirect to select-profile, which will handle the logic
            return NextResponse.redirect(new URL('/select-profile', request.url));
        }
    }

    // 2. Check if the current path is a protected route
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
    }

    // 3. Prevent authenticated users from accessing auth pages
    if (authRoutes.some(route => pathname.startsWith(route)) && token) {
        return NextResponse.redirect(new URL('/select-profile', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
