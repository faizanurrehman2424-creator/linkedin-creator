import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api');
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/set-password');
  const isAdminLoginRoute = pathname.startsWith('/admin/login');
  const isAdminRoute = pathname.startsWith('/admin');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isOldUsersRoute = pathname === '/users';
  
  // API routes must never be redirected to HTML pages
  if (isApiRoute) {
    return supabaseResponse;
  }

  // Admin routes use their own JWT auth (not Supabase)
  if (isAdminRoute && !isAdminLoginRoute) {
    // Admin dashboard and sub-pages are protected by their own cookie check client-side
    return supabaseResponse;
  }

  // Admin login page is always accessible
  if (isAdminLoginRoute) {
    return supabaseResponse;
  }

  // Set-password page is always accessible (token-based)
  if (pathname.startsWith('/set-password')) {
    return supabaseResponse;
  }

  // Redirect old /users route to admin dashboard
  if (isOldUsersRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/dashboard';
    return NextResponse.redirect(url);
  }

  if (!user && !isAuthRoute) {
    // no user, redirect to login page
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  } else if (user && isAuthRoute) {
    // User is logged in, redirect away from login
    const url = request.nextUrl.clone();
    url.pathname = '/ideas';
    return NextResponse.redirect(url);
  }

  // Check if user needs onboarding (no context data set yet)
  if (user && !isOnboardingRoute && !isAuthRoute) {
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { createClient: createServiceClient } = await import('@supabase/supabase-js');
        const adminClient = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        const { data: profile } = await adminClient
          .from('profiles')
          .select('headline, target_audience')
          .eq('id', user.id)
          .maybeSingle();

        // If profile exists but has no context, redirect to onboarding
        if (profile && !profile.headline && !profile.target_audience) {
          const url = request.nextUrl.clone();
          url.pathname = '/onboarding';
          return NextResponse.redirect(url);
        }
      }
    } catch (e) {
      console.error('Middleware profile check error:', e);
    }
  }

  // Handle default redirect for root path
  if (user && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/ideas';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
