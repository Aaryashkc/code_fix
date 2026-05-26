import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

interface ExtendedJwtPayload {
  exp: number;
  role: 'admin' | 'guide' | 'tourist';
  [key: string]: unknown;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/login-otp',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/places',
    '/guides',
    '/destinations',
    '/unauthorized',
  ];

  // Check if the path is public (reserved for future use)
  publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // Application sessions are delivered only through the HTTP-only cookie.
  const token = request.cookies.get('token')?.value;

  // Protected routes that require authentication
  const protectedRoutes = [
    '/user/',
    '/admin/',
    '/guide/',
    '/dashboard',
  ];

  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );

  // If trying to access protected route without token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection with proper JWT validation
  if (token && isProtectedRoute) {
    try {
      // Decode and validate JWT
      const payload = jwtDecode(token) as ExtendedJwtPayload;
      
      // Check if token is expired
      if (payload.exp && payload.exp < Date.now() / 1000) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('reason', 'expired');
        return NextResponse.redirect(loginUrl);
      }

      const userRole = payload.role;

      // Admin routes protection
      if (pathname.startsWith('/admin/') && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized?role=admin', request.url));
      }

      // Guide routes protection
      if (pathname.startsWith('/guide/') && userRole !== 'guide' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized?role=guide', request.url));
      }

      // User routes protection
      if (pathname.startsWith('/user/') && userRole !== 'tourist' && userRole !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized?role=user', request.url));
      }

      // Dashboard route protection (role-based routing)
      if (pathname === '/dashboard') {
        switch (userRole) {
          case 'admin':
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
          case 'guide':
            return NextResponse.redirect(new URL('/guide/dashboard', request.url));
          case 'tourist':
            return NextResponse.redirect(new URL('/user/dashboard', request.url));
          default:
            return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }

    } catch (_error) {
      // Invalid token, redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('reason', 'invalid');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
