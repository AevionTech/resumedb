# Authentication & User Sync Flow Documentation

This document explains the complete authentication and user synchronization logic between the frontend (Next.js) and backend (FastAPI).

## Overview

The system uses **Auth0** for authentication with a **session-based** approach. When a user logs in, they are authenticated via Auth0, and the frontend automatically syncs the user data to the backend database.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│   Next.js    │────────▶│   FastAPI   │
│             │         │   Frontend    │         │   Backend   │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │                        │
      │                        │                        │
      ▼                        ▼                        ▼
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Auth0     │         │   Session    │         │  Database   │
│  (OAuth)    │         │   (Cookies)  │         │ (PostgreSQL) │
└─────────────┘         └──────────────┘         └─────────────┘
```

## Frontend Logic

### 1. Auth0 Configuration (`lib/auth0.ts`)

**Purpose:** Configure Auth0 client for Next.js

```typescript
export const auth0 = new Auth0Client({
  authorizationParams: {
    scope: 'openid profile email',
    audience: process.env.AUTH0_AUDIENCE || process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  },
  routes: {
    callback: '/auth/callback',
    postLogoutRedirect: '/',
  },
});
```

**Key Points:**
- Requests `openid profile email` scopes
- Configures `audience` for API access tokens (optional)
- Sets up callback and logout routes

### 2. Middleware (`middleware.ts`)

**Purpose:** Protect routes and handle Auth0 session management

**Logic:**
1. Intercepts all requests (except static files)
2. Calls `auth0.middleware()` to validate session
3. Handles JWE (JSON Web Encryption) errors gracefully
4. Clears corrupted cookies if needed

**Flow:**
```
Request → middleware.ts → auth0.middleware() → Next.js Route
```

### 3. Dashboard Page (`app/dashboard/page.tsx`)

**Purpose:** Server-side page that requires authentication

**Logic Flow:**

1. **Check Session:**
   ```typescript
   session = await auth0.getSession();
   user = session?.user;
   ```

2. **Redirect if Not Authenticated:**
   ```typescript
   if (!user) {
     redirect("/");
   }
   ```

3. **Server-Side Sync Attempt:**
   - Calls `/api/sync-user` endpoint
   - Silently fails if sync doesn't work (client-side will handle it)

4. **Render Dashboard:**
   - Includes `<UserSync />` component for client-side sync fallback

### 4. UserSync Component (`components/UserSync.tsx`)

**Purpose:** Client-side component that syncs user with backend on login

**Logic Flow:**

```typescript
useEffect(() => {
  const syncUser = async () => {
    // 1. Wait for user to be available
    if (isLoading || !user) return;
    
    // 2. Prevent duplicate syncs
    if (hasSyncedRef.current || hasAttemptedRef.current) return;
    
    // 3. Mark as attempted
    hasAttemptedRef.current = true;
    
    // 4. Call sync API route
    const response = await fetch("/api/sync-user", {
      cache: "no-store",
    });
    
    // 5. Handle response
    if (syncData.synced) {
      hasSyncedRef.current = true;
    }
  };
  
  syncUser();
}, [user, isLoading]);
```

**Key Features:**
- Only runs once per session
- Uses refs to prevent infinite loops
- Non-blocking (doesn't render anything)
- Gracefully handles errors

### 5. Sync User API Route (`app/api/sync-user/route.ts`)

**Purpose:** Server-side API route that handles user synchronization with backend

**Logic Flow (Multi-Tier Fallback):**

#### Tier 1: Access Token (Preferred)
```typescript
// Try to get access token from session
const accessToken = sessionAny.accessToken || 
                   sessionAny.access_token || 
                   sessionAny.token?.access_token;

if (accessToken) {
  // Call backend with access token
  fetch(`${backendUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}
```

**When Available:**
- `AUTH0_AUDIENCE` is configured
- User has logged in after audience was set
- Auth0 has granted API access

#### Tier 2: ID Token (Fallback)
```typescript
if (!accessToken) {
  const idToken = sessionAny.idToken || sessionAny.id_token;
  
  if (idToken) {
    // Call backend with ID token
    fetch(`${backendUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
  }
}
```

**When Available:**
- Always available in Auth0 sessions
- Contains user info (sub, email, name, picture)
- Can be used for authentication

#### Tier 3: Session Data Token (Last Resort)
```typescript
if (!idToken) {
  // Create minimal JWT from session data
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString('base64url');
  
  const payload = Buffer.from(JSON.stringify({
    sub: session.user.sub,
    email: session.user.email,
    name: session.user.name,
    picture: session.user.picture,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  
  const minimalToken = `${header}.${payload}.`;
  
  // Call backend with minimal token
  fetch(`${backendUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${minimalToken}` }
  });
}
```

**When Used:**
- Neither access token nor ID token available
- Session is still valid
- Creates a JWT-like structure that backend can decode

**Token Structure:**
```
header.payload.signature
eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJnb29nbGUtb2F1dGgyfDEwNjEwNTg2NzYwNTU3NTk4NjI2NyIsImVtYWlsIjoiY2hlbmdob28ueC4xMjNAZ21haWwuY29tIn0.
```

**Key Points:**
- Uses `alg: "none"` (no signature verification)
- Backend decodes without verification
- Contains all necessary user data

## Backend Logic

### 1. Authentication Middleware (`app/auth/middleware.py`)

**Purpose:** Validate JWT tokens and sync users to database

**Function:** `get_current_user()`

**Logic Flow:**

#### Step 1: Extract Token
```python
token = credentials.credentials  # From Authorization: Bearer <token>
```

#### Step 2: Decode Token (Without Verification)
```python
payload = jwt.decode(
    token,
    "",  # Empty key when not verifying signature
    options={"verify_signature": False}
)
```

**Why Empty Key?**
- `jose.jwt.decode()` requires a `key` parameter
- Even with `verify_signature=False`, key is required
- Empty string allows decoding without verification

**Supported Token Types:**
- ✅ Auth0 access tokens (RS256)
- ✅ Auth0 ID tokens (RS256)
- ✅ Minimal tokens from session data (alg: "none")

#### Step 3: Validate Required Claims
```python
if "sub" not in payload:
    raise HTTPException(status_code=401, detail="Invalid token: missing 'sub' claim")

auth0_id = payload.get("sub")
email = payload.get("email", "")
name = payload.get("name") or payload.get("nickname")
picture = payload.get("picture")
```

**Required Claims:**
- `sub`: Auth0 user ID (required)
- `email`: User email (optional, defaults to "")
- `name`: User name (optional)
- `picture`: Profile picture URL (optional)

#### Step 4: Check if User Exists
```python
user = db.query(User).filter(User.auth0_id == auth0_id).first()
```

#### Step 5a: Create New User (If Doesn't Exist)
```python
if not user:
    user = User(
        id=str(uuid.uuid4()),
        auth0_id=auth0_id,
        email=email,
        name=name,
        picture=picture,
        last_login=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(user)
    db.commit()
    logger.info(f"Created user: {user.id} ({user.email})")
```

#### Step 5b: Update Existing User (If Exists)
```python
else:
    # Update last_login
    user.last_login = datetime.now(timezone.utc)
    
    # Update picture if changed
    if picture and user.picture != picture:
        user.picture = picture
    
    # Update name if changed
    if name and user.name != name:
        user.name = name
    
    db.commit()
    logger.info(f"Updated user: {user.id}")
```

#### Step 6: Return User Object
```python
return user  # User object from database
```

**Key Features:**
- Automatic user creation on first API call
- Automatic user updates on subsequent calls
- Always returns database User object (not Auth0 data)

### 2. Auth Router (`app/auth/router.py`)

**Purpose:** Expose user endpoints

**Endpoint:** `GET /api/v1/auth/me`

**Logic:**
```python
@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.get_user_by_id(current_user.id)
```

**Flow:**
1. `get_current_user` dependency validates token and syncs user
2. Returns User object from database
3. Converts to UserResponse schema

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGS IN                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Auth0 Authentication                          │
│  - User authenticates with Auth0                                 │
│  - Auth0 redirects to /auth/callback                             │
│  - Session stored in cookies                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend: Dashboard Page Loads                      │
│  app/dashboard/page.tsx                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Check session: auth0.getSession()                      │  │
│  │ 2. Redirect if not authenticated                          │  │
│  │ 3. Attempt server-side sync (optional)                      │  │
│  │ 4. Render dashboard with <UserSync />                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            Frontend: UserSync Component (Client-Side)            │
│  components/UserSync.tsx                                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ useEffect(() => {                                          │  │
│  │   if (user && !hasSynced) {                                │  │
│  │     fetch("/api/sync-user")                               │  │
│  │   }                                                        │  │
│  │ }, [user])                                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         Frontend: Sync User API Route (Server-Side)             │
│  app/api/sync-user/route.ts                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Get session: auth0.getSession()                        │  │
│  │ 2. Try access token → ID token → session data token       │  │
│  │ 3. Call backend: GET /api/v1/auth/me                      │  │
│  │    Headers: Authorization: Bearer <token>                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend: Authentication Middleware                  │
│  app/auth/middleware.py - get_current_user()                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Extract token from Authorization header               │  │
│  │ 2. Decode token (without verification)                    │  │
│  │ 3. Extract: sub, email, name, picture                    │  │
│  │ 4. Check if user exists (by auth0_id)                    │  │
│  │ 5. Create or update user in database                     │  │
│  │ 6. Return User object                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend: Auth Router                                │
│  app/auth/router.py - GET /api/v1/auth/me                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. get_current_user() validates & syncs user            │  │
│  │ 2. Return UserResponse with user data                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Receives Response                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ {                                                          │  │
│  │   synced: true,                                            │  │
│  │   user: { id, auth0_id, email, name, picture, ... }       │  │
│  │ }                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ✅ USER SYNCED                                │
│              User exists in backend database                     │
└─────────────────────────────────────────────────────────────────┘
```

## Token Flow Details

### Access Token Flow (When AUTH0_AUDIENCE is Configured)

```
Auth0 Login
    │
    ├─► Auth0 Issues:
    │   - ID Token (user info)
    │   - Access Token (API access)
    │
    └─► Session Contains:
        - session.accessToken ✅
        - session.idToken ✅
        - session.user ✅

Frontend Sync
    │
    └─► Uses: Access Token
        Authorization: Bearer <access_token>

Backend
    │
    └─► Decodes & Validates
        Creates/Updates User
```

### ID Token Flow (Fallback)

```
Auth0 Login
    │
    ├─► Auth0 Issues:
    │   - ID Token (user info) ✅
    │   - Access Token ❌ (not requested)
    │
    └─► Session Contains:
        - session.idToken ✅
        - session.user ✅

Frontend Sync
    │
    └─► Uses: ID Token
        Authorization: Bearer <id_token>

Backend
    │
    └─► Decodes & Validates
        Creates/Updates User
```

### Session Data Token Flow (Last Resort)

```
Auth0 Login
    │
    └─► Session Contains:
        - session.user ✅
        - session.idToken ❌
        - session.accessToken ❌

Frontend Sync
    │
    ├─► Creates Minimal JWT:
    │   {
    │     "alg": "none",
    │     "typ": "JWT"
    │   }
    │   {
    │     "sub": "google-oauth2|...",
    │     "email": "user@example.com",
    │     "name": "User Name",
    │     "picture": "https://...",
    │     "iat": 1234567890,
    │     "exp": 1234571490
    │   }
    │
    └─► Uses: Minimal Token
        Authorization: Bearer <minimal_token>

Backend
    │
    └─► Decodes (no verification)
        Creates/Updates User
```

## Key Design Decisions

### 1. Multi-Tier Token Fallback

**Why?**
- Auth0 Next.js SDK v4 doesn't always include access tokens
- Access tokens require `AUTH0_AUDIENCE` configuration
- Need to work even without proper API setup

**Solution:**
- Try access token first (best)
- Fall back to ID token (good)
- Fall back to session data token (works)

### 2. Decode Without Verification

**Why?**
- Development environment
- Need to support minimal tokens
- Faster development cycle

**Trade-offs:**
- ⚠️ **NOT SECURE FOR PRODUCTION**
- ✅ Works for development
- ✅ Supports all token types

**Production TODO:**
- Implement proper JWKS validation
- Verify token signatures
- Validate issuer and audience

### 3. Automatic User Sync

**Why?**
- Users should exist in database automatically
- No manual user creation needed
- Sync happens on first API call

**Benefits:**
- Seamless user experience
- No separate registration step
- Always up-to-date user data

### 4. Client + Server-Side Sync

**Why?**
- Server-side: Faster, happens during page load
- Client-side: Fallback if server-side fails
- Redundant but reliable

**Benefits:**
- Higher success rate
- Works even if one method fails
- Better user experience

## Error Handling

### Frontend Errors

1. **No Session:**
   - Redirect to home page
   - User must log in

2. **Sync Fails:**
   - Log error to console
   - Don't block user experience
   - User will sync on first API call

3. **Token Not Available:**
   - Try next tier (access → ID → session)
   - Log warning
   - Continue with fallback

### Backend Errors

1. **JWT Decode Error:**
   - Log error with token details
   - Return 401 Unauthorized
   - User must re-authenticate

2. **Missing 'sub' Claim:**
   - Log error
   - Return 401 Unauthorized
   - Token is invalid

3. **Database Error:**
   - Log error
   - Return 500 Internal Server Error
   - User can retry

## Environment Variables

### Frontend (`.env.local`)

```env
# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=your-secret-key
AUTH0_AUDIENCE=your-api-identifier  # Optional but recommended
NEXT_PUBLIC_AUTH0_AUDIENCE=your-api-identifier  # Optional but recommended

# Application URLs
APP_BASE_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### Backend (`.env`)

```env
# Auth0 Configuration
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier  # Should match frontend

# Database
DATABASE_URL=postgresql://user:password@localhost/resumedb
```

## Testing the Flow

### 1. Check Frontend Logs

```bash
# Browser Console
✅ User synced with backend: {id: '...', email: '...'}
```

### 2. Check Backend Logs

```bash
# Backend Terminal
INFO: Creating new user with auth0_id: google-oauth2|...
INFO: Created user: 27029a0e-3644-424a-a258-20bbda6d0e34 (user@example.com)
```

### 3. Check Database

```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

## Summary

The authentication and sync system works through a **multi-tier fallback approach**:

1. **Frontend** validates session and attempts sync
2. **Frontend** tries multiple token types (access → ID → session data)
3. **Backend** decodes token and extracts user info
4. **Backend** creates or updates user in database
5. **Backend** returns user data to frontend

This design ensures:
- ✅ Works even without `AUTH0_AUDIENCE` configured
- ✅ Automatic user creation/updates
- ✅ Reliable sync with multiple fallbacks
- ✅ Seamless user experience

The system is currently working with the **session data token** approach, which creates a minimal JWT from session data when access tokens aren't available.
