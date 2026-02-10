# Access Token Issue Analysis

## Problem
The frontend is not receiving access tokens during sync on login. The sync route is trying to get access tokens from the Auth0 session, but they're not available.

## Root Cause

**Auth0 Next.js SDK v4** stores sessions in cookies, but **access tokens are only included in the session if**:
1. `AUTH0_AUDIENCE` is configured in the Auth0Client initialization
2. `AUTH0_AUDIENCE` matches an API identifier in your Auth0 Dashboard
3. The user has granted access to that API (happens automatically on first login with audience)

## Current Situation

### What We Have:
- ✅ **Valid Auth0 session** - `auth0.getSession()` returns a session with user info
- ✅ **User is authenticated** - Session contains user.email, user.sub, etc.
- ❌ **Access token missing** - Not in session object

### Why Access Token is Missing:
1. **AUTH0_AUDIENCE not set** - Check your `.env.local` file
2. **AUTH0_AUDIENCE doesn't match** - Must match the API identifier in Auth0 Dashboard
3. **User needs to re-login** - If AUTH0_AUDIENCE was added after initial login

## Solution Options

### Option 1: Configure AUTH0_AUDIENCE (Recommended)

1. **In Auth0 Dashboard:**
   - Go to APIs → Create API (or select existing)
   - Note the **Identifier** (e.g., `https://api.resumedb.com`)

2. **In Frontend `.env.local`:**
   ```env
   AUTH0_AUDIENCE=https://api.resumedb.com
   NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.resumedb.com
   ```

3. **In `lib/auth0.ts`:**
   - Already configured correctly (line 7)

4. **User must re-login** after setting AUTH0_AUDIENCE

### Option 2: Use ID Token (Current Fallback)

The code already tries to use ID tokens as fallback. ID tokens are **always available** in the session and contain user information (sub, email, name, picture).

**Pros:**
- Always available
- Contains user info needed for sync

**Cons:**
- Not meant for API authentication (but works for our use case)
- Backend needs to accept ID tokens

### Option 3: Session-Based Authentication

If Auth0 SDK v4 uses sessions instead of tokens, we can:
1. Verify the session is valid (already done via `getSession()`)
2. Extract user info from session
3. Send session cookie to backend (requires backend changes)

## Current Code Behavior

The `sync-user` route (`app/api/sync-user/route.ts`) already handles multiple scenarios:

1. **Tries access token first** (lines 32-41)
2. **Falls back to ID token** (lines 52-99)
3. **Falls back to session data** (lines 103-184)

## Debugging Steps

1. **Check environment variables:**
   ```bash
   # In frontend directory
   cat .env.local | grep AUTH0_AUDIENCE
   ```

2. **Check Auth0 Dashboard:**
   - APIs → Your API → Identifier
   - Must match AUTH0_AUDIENCE in .env.local

3. **Check browser console:**
   - Look for "❌ NO ACCESS TOKEN FOUND" messages
   - Check what tokens are available

4. **Check backend logs:**
   - Should see JWT decode attempts
   - Should see user creation/update

## Verification

To verify if session is valid (even without access token):

```typescript
const session = await auth0.getSession();
if (session && session.user) {
  // Session is valid!
  // User is authenticated
  // We can use session.user.sub, session.user.email, etc.
}
```

## Next Steps

1. **Verify AUTH0_AUDIENCE is set** in `.env.local`
2. **Check Auth0 Dashboard** - API identifier matches
3. **User re-login** after setting AUTH0_AUDIENCE
4. **Check logs** - See what tokens are actually available
5. **Test sync** - Should work with ID token fallback if access token unavailable

## Conclusion

The frontend **does have a valid session**, but **access tokens are only available if AUTH0_AUDIENCE is properly configured**. The current code already handles this with fallbacks to ID tokens and session data.

**The session itself is valid and can be verified** - we just need to ensure AUTH0_AUDIENCE is set correctly for access tokens, or rely on the ID token fallback that's already implemented.
