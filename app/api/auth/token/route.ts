import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

/**
 * API route to get Auth0 access token for backend API calls.
 * This is needed because getAccessTokenSilently is not available in client components.
 * 
 * In Auth0 Next.js SDK v4, access tokens are stored in the session object.
 * The access token is only available if AUTH0_AUDIENCE is configured.
 */
export async function GET() {
  try {
    const session = await auth0.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Debug: Log session info
    console.log("🔍 Token route - Session debug:");
    console.log("   User:", session.user?.email);
    console.log("   AUTH0_AUDIENCE env:", process.env.AUTH0_AUDIENCE || process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "NOT SET");
    
    // In Auth0 Next.js SDK v4, access tokens are stored in the session object
    // Check all possible locations where the token might be stored
    const sessionAny = session as any;
    let accessToken: string | null = null;
    
    // Try multiple possible token locations
    accessToken = sessionAny.accessToken || 
                 sessionAny.access_token || 
                 sessionAny.token?.access_token;

    // If still no access token, check ID token as fallback
    if (!accessToken) {
      const sessionAny = session as any;
      const idToken = sessionAny.idToken || sessionAny.id_token;
      
      if (idToken) {
        console.log("⚠️ Access token not available, but ID token found");
        console.log("   This means AUTH0_AUDIENCE may not be configured correctly");
        console.log("   ID token can be used as fallback, but access token is preferred");
      }
    }

    if (accessToken) {
      console.log("✅ ACCESS TOKEN FOUND!");
      console.log("   Token (first 50 chars):", accessToken.substring(0, 50) + "...");
      console.log("   Token length:", accessToken.length);
      return NextResponse.json({ accessToken });
    } else {
      console.log("❌ NO ACCESS TOKEN FOUND IN SESSION");
      console.log("   This usually means:");
      console.log("   1. AUTH0_AUDIENCE is not set in environment variables");
      console.log("   2. AUTH0_AUDIENCE doesn't match the API identifier in Auth0 Dashboard");
      console.log("   3. User needs to re-login after AUTH0_AUDIENCE was added");
      
      // Return 200 with null token instead of 400 to prevent retry loops
      // The client will handle this gracefully
      return NextResponse.json(
        { 
          accessToken: null,
          error: "Access token not available",
          hint: "Make sure AUTH0_AUDIENCE is configured in lib/auth0.ts and .env.local. User will be synced on first backend API call.",
          debug: {
            hasSession: true,
            hasUser: !!session.user,
            audience: process.env.AUTH0_AUDIENCE || process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "NOT SET",
            sessionKeys: Object.keys(session as any),
          }
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Error getting access token:", error);
    return NextResponse.json(
      { error: "Failed to get access token", detail: error.message },
      { status: 500 }
    );
  }
}
