# User Sync Debugging Guide

## Issue: No user record created in database

### Step 1: Verify Database is Initialized

Run the database initialization script:

```bash
cd resumedb-backend
python init_db.py
```

This should create the `users` table. If using SQLite, check for `resumedb.db` file.

### Step 2: Verify Backend is Running

Make sure your FastAPI backend is running:

```bash
cd resumedb-backend
uvicorn main:app --reload --port 8000
```

Test the backend health endpoint:
```bash
curl http://localhost:8000/health
```

### Step 3: Check Environment Variables

**Frontend (.env.local):**
```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=your-secret
AUTH0_AUDIENCE=your-api-identifier  # ⚠️ IMPORTANT: This must match backend
NEXT_PUBLIC_AUTH0_AUDIENCE=your-api-identifier
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
APP_BASE_URL=http://localhost:3000
```

**Backend (.env):**
```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier  # ⚠️ Must match frontend
DATABASE_URL=sqlite:///./resumedb.db  # or your PostgreSQL URL
```

### Step 4: Verify Auth0 API Configuration

1. Go to Auth0 Dashboard → APIs
2. Create or select your API
3. Note the **Identifier** (this is your `AUTH0_AUDIENCE`)
4. Make sure this identifier is set in both frontend and backend `.env` files

### Step 5: Test the Sync Flow

1. **Check browser console** for sync messages:
   - `✅ User synced with backend:` = Success
   - `⚠️ Access token not available` = AUTH0_AUDIENCE not configured
   - `❌ Failed to sync user` = Backend error

2. **Check backend logs** when you visit `/dashboard`:
   - Should see: `Creating new user with auth0_id: ...`
   - Or: `Updating existing user: ...`

3. **Manually test the sync endpoint**:
   ```bash
   # First, get your access token from browser dev tools
   # Then test:
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:8000/api/v1/auth/me
   ```

### Step 6: Verify Database Connection

Check if the database file exists and has the users table:

**SQLite:**
```bash
cd resumedb-backend
sqlite3 resumedb.db
.tables  # Should show 'users'
SELECT * FROM users;  # Check if users exist
```

**PostgreSQL:**
```bash
psql -d your_database_name
\dt  # List tables
SELECT * FROM users;  # Check if users exist
```

### Common Issues

1. **Access token not available**
   - **Cause**: `AUTH0_AUDIENCE` not set or doesn't match Auth0 API identifier
   - **Fix**: Set `AUTH0_AUDIENCE` in `.env.local` and restart Next.js dev server

2. **Backend not receiving requests**
   - **Cause**: Backend not running or wrong URL
   - **Fix**: Start backend and verify `NEXT_PUBLIC_BACKEND_URL` is correct

3. **Database not initialized**
   - **Cause**: `init_db.py` not run
   - **Fix**: Run `python init_db.py` in backend directory

4. **CORS errors**
   - **Cause**: Backend CORS not configured for frontend URL
   - **Fix**: Add frontend URL to `CORS_ORIGINS` in backend config

### Alternative: Sync on First API Call

If the access token isn't available, the user will be automatically synced when they make their first API call to the backend (e.g., uploading a resume). The backend's `get_current_user` dependency handles this automatically.
