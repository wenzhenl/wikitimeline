import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  if (['en', 'de', 'zh'].includes(subdomain)) {
    const url = request.nextUrl.clone();
    const originalPathname = url.pathname;
    const rewrittenPathname = `/timeline/${subdomain}${url.pathname.replace(/^\/timeline/, '')}`;

    // Logging for troubleshooting
    console.log('Hostname:', hostname);
    console.log('Subdomain:', subdomain);
    console.log('Original Pathname:', originalPathname);
    console.log('Rewritten Pathname:', rewrittenPathname);

    // Rewrite the URL
    url.pathname = rewrittenPathname;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};