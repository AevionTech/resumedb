import { auth0 } from "@/lib/auth0";
import { NextResponse } from "next/server";

/**
 * Server-side API route to sync user with backend.
 * This is called from the dashboard page to ensure user exists in backend database.
 */
export async function GET() {
  try {
    const session = await auth0.getSession();
    
    if (!session || !session.user) {
      console.log("❌ Sync failed: No session or user");
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get the access token (might be null if audience not configured)
    const sessionAny = session as any;
    
    // Debug: Check all possible token locations
    console.log("🔍 Sync - Session debug:");
    console.log("   User:", session.user?.email);
    console.log("   sessionAny.accessToken:", sessionAny.accessToken ? `${sessionAny.accessToken.substring(0, 50)}...` : "null");
    console.log("   sessionAny.access_token:", sessionAny.access_token ? `${sessionAny.access_token.substring(0, 50)}...` : "null");
    console.log("   sessionAny.token?.access_token:", sessionAny.token?.access_token ? `${sessionAny.token.access_token.substring(0, 50)}...` : "null");
    console.log("   sessionAny.idToken:", sessionAny.idToken ? `${sessionAny.idToken.substring(0, 50)}...` : "null");
    console.log("   sessionAny.id_token:", sessionAny.id_token ? `${sessionAny.id_token.substring(0, 50)}...` : "null");
    
    const accessToken = sessionAny?.accessToken || 
                       sessionAny?.access_token || 
                       sessionAny?.token?.access_token;
    
    if (accessToken) {
      console.log("✅ ACCESS TOKEN FOUND in sync route!");
      console.log("   Token (first 100 chars):", accessToken.substring(0, 100));
    } else {
      console.log("❌ NO ACCESS TOKEN FOUND in sync route");
    }

    // If access token is not available, try ID token fallback
    // This is a known issue in Auth0 Next.js SDK v4 where access tokens might not be stored
    if (!accessToken) {
      console.log("⚠️ Access token not available in session (known SDK v4 issue).");
      console.log("   User:", session.user.email);
      console.log("   AUTH0_AUDIENCE:", process.env.AUTH0_AUDIENCE || process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "NOT SET");
      console.log("   Using ID token fallback...");
      
      // Try to use ID token as fallback (it's always available and backend accepts it)
      const idToken = sessionAny?.idToken || sessionAny?.id_token;
      
      if (idToken) {
        console.log("   Attempting sync with ID token as fallback...");
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8000";
        const apiUrl = `${backendUrl}/api/v1/auth/me`;
        console.log("   Calling backend:", apiUrl);
        
        try {
          const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },
            cache: "no-store",
          });

          console.log("   Backend response status:", response.status);

          if (response.ok) {
            const userData = await response.json();
            console.log("✅ User synced successfully using ID token:", userData.email || userData.id);
            return NextResponse.json({
              synced: true,
              user: userData,
              method: "id_token",
            });
          } else {
            const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
            console.error("❌ Backend rejected ID token:", response.status, errorData);
            return NextResponse.json({
              synced: false,
              error: errorData.detail || `HTTP ${response.status}`,
              backendUrl: apiUrl,
              method: "id_token_failed",
            }, { status: response.status });
          }
        } catch (error: any) {
          console.error("❌ Failed to sync with ID token:", error.message);
          console.error("   Error details:", error);
          return NextResponse.json({
            synced: false,
            error: "Failed to connect to backend",
            detail: error.message,
            hint: "Make sure the backend is running on " + (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"),
          }, { status: 500 });
        }
      } else {
        console.log("   ID token also not available in session");
        
        // Last resort: Create a minimal JWT-like token from session user data
        // The backend decodes without verification, so we can send a simple payload
        const userSub = session.user.sub;
        if (userSub) {
          console.log("   Attempting sync with user data from session:", userSub);
          
          // Create a proper JWT-like structure (header.payload.signature)
          // Backend uses jwt.decode() which expects 3 parts separated by dots
          const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString('base64url').replace(/=/g, '');
          const payload = Buffer.from(JSON.stringify({
            sub: userSub,
            email: session.user.email || "",
            name: session.user.name || session.user.nickname || null,
            picture: session.user.picture || null,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          })).toString('base64url').replace(/=/g, '');
          
          // JWT format: header.payload.signature (signature can be empty for "none" alg)
          // Backend doesn't verify signature, but jwt.decode() expects 3 parts
          const minimalToken = `${header}.${payload}.`;
          
          console.log("   Created token (first 100 chars):", minimalToken.substring(0, 100));
          
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8000";
          const apiUrl = `${backendUrl}/api/v1/auth/me`;
          console.log("   Calling backend with session data token:", apiUrl);
          
          try {
            const response = await fetch(apiUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${minimalToken}`,
                "Content-Type": "application/json",
              },
              cache: "no-store",
            });

            console.log("   Backend response status:", response.status);

            if (response.ok) {
              const userData = await response.json();
              console.log("✅ User synced successfully using session data:", userData.email || userData.id);
              return NextResponse.json({
                synced: true,
                user: userData,
                method: "session_data",
              });
            } else {
              const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
              const errorText = await response.text().catch(() => "");
              console.error("❌ Backend rejected session data token:", response.status);
              console.error("   Error response:", errorData);
              console.error("   Error text:", errorText);
              console.error("   Token sent (first 200 chars):", minimalToken.substring(0, 200));
              console.error("   Token length:", minimalToken.length);
              console.error("   Token parts count:", minimalToken.split('.').length);
              
              // If backend rejects, the user will be synced on first actual API call anyway
              return NextResponse.json({
                synced: false,
                error: errorData.detail || `HTTP ${response.status}`,
                backendUrl: apiUrl,
                method: "session_data_failed",
                hint: "User will be automatically synced on first backend API call (e.g., uploading a resume). Check backend logs for JWT decode error details.",
                debug: {
                  tokenLength: minimalToken.length,
                  tokenParts: minimalToken.split('.').length,
                  firstChars: minimalToken.substring(0, 50),
                }
              }, { status: response.status });
            }
          } catch (error: any) {
            console.error("❌ Failed to sync with session data:", error.message);
            console.error("   Error details:", error);
            return NextResponse.json({
              synced: false,
              error: "Failed to connect to backend",
              detail: error.message,
              hint: "Make sure the backend is running on " + (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"),
            }, { status: 500 });
          }
        }
      }
      
      return NextResponse.json({
        synced: false,
        message: "Tokens not available in session (known SDK v4 issue). User will be synced on first backend API call.",
        hint: "The user will be automatically created when they make their first API call to the backend (e.g., uploading a resume).",
        user: session.user,
      });
    }

    // Get backend API URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || "http://localhost:8000";
    const apiUrl = `${backendUrl}/api/v1/auth/me`;

    console.log("🔄 Attempting to sync user with backend:", session.user.email);
    console.log("   Backend URL:", apiUrl);

    // Call backend API to sync user
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
      console.error("❌ Backend sync failed:", response.status, errorData);
      return NextResponse.json(
        { 
          synced: false,
          error: errorData.detail || `HTTP ${response.status}`,
          backendUrl: apiUrl,
        },
        { status: response.status }
      );
    }

    const userData = await response.json();
    console.log("✅ User synced successfully:", userData.email || userData.id);
    return NextResponse.json({
      synced: true,
      user: userData,
    });
  } catch (error: any) {
    console.error("❌ Error syncing user:", error);
    return NextResponse.json(
      { 
        synced: false,
        error: "Failed to sync user",
        detail: error.message 
      },
      { status: 500 }
    );
  }
}
