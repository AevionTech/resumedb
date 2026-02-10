# Auth0 Payloads and Request Flow

## Overview

The Auth0 Next.js SDK (v4) handles the OAuth 2.0 / OpenID Connect flow automatically. You don't manually send payloads - the SDK does it for you.

## Authentication Flow

### 1. Login Request (`/auth/login`)

When a user clicks the login button, they're redirected to:
```
GET /auth/login
```

**What happens internally:**
- The Auth0 SDK middleware intercepts this request
- It generates an authorization URL and redirects the user to Auth0

**Redirect to Auth0 Authorization Endpoint:**
```
GET https://{AUTH0_DOMAIN}/authorize?
  client_id={AUTH0_CLIENT_ID}
  &response_type=code
  &redirect_uri={APP_BASE_URL}/auth/callback
  &scope=openid profile email
  &state={random_state_string}
  &nonce={random_nonce_string}
```

**Query Parameters Sent:**
- `client_id`: Your Auth0 application Client ID
- `response_type`: Always `code` (Authorization Code flow)
- `redirect_uri`: Where Auth0 should redirect after login (must match configured callback URL)
- `scope`: Requested permissions (`openid profile email` by default)
- `state`: CSRF protection token (randomly generated)
- `nonce`: Replay attack protection (randomly generated)

### 2. Callback Request (`/auth/callback`)

After user authenticates with Auth0, Auth0 redirects back to:
```
GET /auth/callback?code={authorization_code}&state={state}
```

**What happens internally:**
- SDK validates the `state` parameter (CSRF protection)
- SDK exchanges the authorization code for tokens

**Token Exchange Request (made by SDK to Auth0):**
```
POST https://{AUTH0_DOMAIN}/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id={AUTH0_CLIENT_ID}
&client_secret={AUTH0_CLIENT_SECRET}
&code={authorization_code}
&redirect_uri={APP_BASE_URL}/auth/callback
```

**Response from Auth0:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "refresh_token": "..." // if offline_access scope requested
}
```

### 3. User Info Request (Optional)

If needed, the SDK can fetch additional user info:
```
GET https://{AUTH0_DOMAIN}/userinfo
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "sub": "auth0|123456789",
  "name": "John Doe",
  "email": "john@example.com",
  "email_verified": true,
  "picture": "https://..."
}
```

### 4. Logout Request (`/auth/logout`)

When user clicks logout:
```
GET /auth/logout
```

**What happens:**
- SDK clears the session cookie
- Optionally redirects to Auth0 logout endpoint:
```
GET https://{AUTH0_DOMAIN}/v2/logout?
  client_id={AUTH0_CLIENT_ID}
  &returnTo={APP_BASE_URL}
```

## Session Storage

After successful authentication, the SDK stores the session in an encrypted cookie:

**Cookie Name:** `appSession` (or `appSession.0`, `appSession.1` if chunked)

**Cookie Contents (encrypted with AUTH0_SECRET):**
```json
{
  "user": {
    "sub": "auth0|123456789",
    "name": "John Doe",
    "email": "john@example.com",
    "picture": "https://..."
  },
  "accessToken": "...", // if stored
  "idToken": "...",
  "refreshToken": "...", // if stored
  "expiresAt": 1234567890
}
```

## What You Don't Need to Do

With the Auth0 Next.js SDK v4, you **don't manually**:
- ❌ Create authorization URLs
- ❌ Handle token exchanges
- ❌ Manage state/nonce parameters
- ❌ Store tokens manually
- ❌ Refresh tokens manually

The SDK handles all of this automatically through:
- `middleware.ts` - Handles `/auth/*` routes
- `Auth0Client` - Server-side session management
- `Auth0Provider` - Client-side hooks

## Custom Scopes

To request additional scopes, configure in `lib/auth0.ts`:

```typescript
import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  authorizationParams: {
    scope: 'openid profile email offline_access read:resumes write:resumes'
  }
});
```

## Custom Claims

To include custom claims in the ID token, configure in Auth0 Dashboard:
1. Go to Actions → Flows → Login
2. Add custom claims to the ID token
3. They'll be available in `session.user`

## Debugging

To see what's being sent, enable debug logging:

```typescript
// In lib/auth0.ts
export const auth0 = new Auth0Client({
  httpOptions: {
    timeout: 10000,
  },
  // Enable debug mode
  debug: process.env.NODE_ENV === 'development'
});
```

Or check browser Network tab:
- Look for requests to `{AUTH0_DOMAIN}/authorize`
- Look for requests to `{AUTH0_DOMAIN}/oauth/token`
- Check cookies for `appSession`

## Summary

**Payloads sent to Auth0:**
1. **Authorization Request**: Query parameters in URL (client_id, redirect_uri, scope, state, nonce)
2. **Token Exchange**: Form data in POST body (grant_type, client_id, client_secret, code, redirect_uri)
3. **User Info** (optional): Bearer token in Authorization header
4. **Logout**: Query parameters in URL (client_id, returnTo)

All of this is handled automatically by the SDK - you just use:
- `<a href="/auth/login">` for login
- `<a href="/auth/logout">` for logout
- `auth0.getSession()` for server-side session access
- `useUser()` hook for client-side user data
