import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to /api routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('x-api-key');
    const clientType = request.headers.get('x-client-type');
    
    // Check if it's a CLI request
    if (clientType === 'cli' && apiKey === process.env.CLI_SECRET_KEY) {
      return NextResponse.next();
    }
    
    // Check if it's a server request
    if (apiKey === process.env.API_SECRET_KEY) {
      return NextResponse.next();
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