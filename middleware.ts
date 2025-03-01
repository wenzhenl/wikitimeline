import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {

  // disable middleware in development
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  // Only apply to /api routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('x-api-key');
    const clientType = request.headers.get('x-client-type');
    
    // Add client type to request headers for the API route to use
    const requestHeaders = new Headers(request.headers);
    if (clientType) {
      requestHeaders.set('x-internal-client-type', clientType);
    }
    
    // Check if it's a CLI request
    if (clientType === 'cli' && apiKey === process.env.CLI_SECRET_KEY) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    // Check if it's a server request
    if (apiKey === process.env.API_SECRET_KEY) {
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    // If neither key matches, return unauthorized
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
} 