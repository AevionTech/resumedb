# How to Check Backend Logs

The frontend logs show the token is being sent, but we need to see the **backend logs** to understand why it's being rejected.

## Check if Backend is Running

```bash
# Check if backend process is running
ps aux | grep uvicorn

# Or check if port 8000 is in use
lsof -i :8000
```

## Start Backend (if not running)

```bash
cd resumedb-backend
uvicorn main:app --reload --port 8000
```

## What to Look For in Backend Logs

When you visit `/dashboard`, the backend should log:

1. **JWT decode error** (if token format is wrong):
   ```
   JWT decode error: ...
   Token (first 100 chars): ...
   ```

2. **User creation** (if successful):
   ```
   Creating new user with auth0_id: google-oauth2|...
   Created user: ...
   ```

## Alternative: Check Backend Response

The backend error should be in the response. The frontend logs now show:
- Token length
- Token parts count
- First 50 chars of token

This will help us debug the JWT format issue.

## Quick Test

You can also test the backend directly:

```bash
# Test if backend is responding
curl http://localhost:8000/health

# Test with a simple token (will fail but show error)
curl -H "Authorization: Bearer test" http://localhost:8000/api/v1/auth/me
```
