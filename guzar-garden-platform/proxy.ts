import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Session refresh and the /staff gate.
 *
 * Next 16 calls this file `proxy.ts` (it was `middleware.ts`). It runs before
 * every matched request and does two things:
 *
 *   1. Refreshes the Supabase auth cookies, so a staff session does not expire
 *      mid-shift while somebody is looking at the floor view.
 *   2. Sends a signed-out visitor away from /staff.
 *
 * It is a redirect, not an authorisation check. The real check — is this user
 * active, and does their role allow this action — happens on the server in
 * lib/auth/staff.ts and again in the database's RLS policies. A gate that only
 * hides a page is not a gate.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [headerName, headerValue] of Object.entries(headers ?? {})) {
          response.headers.set(headerName, headerValue);
        }
      },
    },
  });

  // Nothing may run between creating the client and asking for the user:
  // the refreshed cookies are written during this call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isStaffArea = pathname.startsWith('/staff') && !pathname.startsWith('/staff/login');

  if (isStaffArea && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/staff/login';
    redirect.searchParams.set('next', pathname);
    const redirectResponse = NextResponse.redirect(redirect);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  if (pathname === '/staff/login' && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = '/staff';
    redirect.search = '';
    const redirectResponse = NextResponse.redirect(redirect);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and the image optimiser.
    '/((?!_next/static|_next/image|favicon.ico|assets/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
