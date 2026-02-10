# Frontend-Backend Integration Guide

## Overview

This document explains how the frontend (Next.js) and backend (FastAPI) are integrated for user authentication and sync.

## Architecture

### Frontend (Next.js)
- Uses Auth0 Next.js SDK for authentication
- Gets Auth0 access token after login
- Calls backend API to sync user

### Backend (FastAPI)
- Validates Auth0 JWT tokens
- Automatically syncs users on each API call
- Creates user if doesn't exist, updates if exists

## Flow

1. **User Logs In** (Frontend)
   - User clicks "Login" → Redirected to Auth0
   - After authentication → Redirected back to `/dashboard`
   - Auth0 session is stored in cookies

2. **User Sync** (Frontend → Backend)
   - `UserSync` component detects user is logged in
   - Gets Auth0 access token using `getAccessTokenSilently()`
   - Calls `GET /api/v1/auth/me` with token in Authorization header

3. **User Sync** (Backend)
   - `get_current_user` dependency:
     - Validates JWT token
     - Extracts `sub`, `email`, `name`, `picture` from token
     - Checks database for user with matching `auth0_id`
     - **Creates user if doesn't exist**
     - **Updates `last_login` if exists**
     - Returns User object from database

## Files

### Frontend
- `components/UserSync.tsx` - Client component that syncs user on login
- `app/dashboard/page.tsx` - Includes UserSync component
- `lib/auth0.ts` - Auth0 configuration with audience for API

### Backend
- `app/auth/middleware.py` - `get_current_user` dependency with sync logic
- `app/auth/router.py` - `/api/v1/auth/me` endpoint
- `app/models/user.py` - User SQLAlchemy model

## Environment Variables

### Frontend (.env.local)
```env
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_SECRET=your-long-random-secret
APP_BASE_URL=http://localhost:3000

# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Auth0 API Audience (for getting access tokens)
NEXT_PUBLIC_AUTH0_AUDIENCE=your-api-identifier
```

### Backend (.env)
```env
DATABASE_URL=sqlite:///./resumedb.db
# OR for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost/resumedb

AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier
```

## Setup Steps

1. **Initialize Backend Database**
   ```bash
   cd resumedb-backend
   python init_db.py
   ```

2. **Start Backend Server**
   ```bash
   cd resumedb-backend
   uvicorn main:app --reload
   ```

3. **Start Frontend Server**
   ```bash
   cd resumedb
   npm run dev
   ```

4. **Configure Auth0**
   - Create an API in Auth0 Dashboard
   - Set the API Identifier (this is your `AUTH0_AUDIENCE`)
   - Update `.env.local` and backend `.env` with the audience

## Testing

1. Login via frontend
2. Check browser console for "✅ User synced with backend" message
3. Check backend logs for user creation/update
4. Verify user exists in database

## API Endpoints

### `GET /api/v1/auth/me`
- **Purpose**: Get current user info and sync user
- **Auth**: Requires `Authorization: Bearer <JWT_TOKEN>`
- **Response**: User object from database
- **Side Effect**: Automatically creates/updates user in database

## Troubleshooting

### User not syncing
- Check browser console for errors
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly
- Verify `NEXT_PUBLIC_AUTH0_AUDIENCE` matches backend `AUTH0_AUDIENCE`
- Check backend logs for authentication errors

### CORS errors
- Verify backend `CORS_ORIGINS` includes frontend URL
- Check backend is running on correct port

### Token errors
- Verify Auth0 API is configured correctly
- Check that `AUTH0_AUDIENCE` matches in both frontend and backend
