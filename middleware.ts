import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  try {
    return await auth0.middleware(request);
  } catch (error: any) {
    // Handle JWEInvalid errors (usually from invalid/corrupted cookies)
    if (error?.name === 'JWEInvalid' || error?.message?.includes('JWE')) {
      // Clear the auth cookie and continue
      const response = NextResponse.next();
      response.cookies.delete('appSession');
      response.cookies.delete('appSession.0');
      response.cookies.delete('appSession.1');
      return response;
    }
    
    // Re-throw other errors
    throw error;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
