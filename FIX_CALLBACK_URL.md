# Fix Auth0 Callback URL Mismatch Error

## Problem

You're getting a "Callback URL mismatch" error because:
- Your app is running on **port 3001**: `http://localhost:3001`
- The callback URL being sent: `http://localhost:3001/auth/callback`
- But Auth0 only has `http://localhost:3000/auth/callback` configured

## Solution: Update Auth0 Application Settings

### Step 1: Go to Auth0 Dashboard

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Navigate to **Applications** → Your Application (the one with Client ID: `lj20gf3JeSoDOsWlp9UXGdaQRXpj1OLx`)

### Step 2: Update Allowed Callback URLs

In the **Application Settings**, find the **Allowed Callback URLs** field and add:

```
http://localhost:3001/auth/callback
```

**Or add both ports (recommended for flexibility):**
```
http://localhost:3000/auth/callback, http://localhost:3001/auth/callback
```

### Step 3: Update Other URLs

Also update these fields to include port 3001:

**Allowed Logout URLs:**
```
http://localhost:3000, http://localhost:3001
```

**Allowed Web Origins:**
```
http://localhost:3000, http://localhost:3001
```

### Step 4: Save Changes

Click **Save Changes** at the bottom of the page.

### Step 5: Verify Your .env.local

Make sure your `.env.local` file has the correct port:

```env
APP_BASE_URL=http://localhost:3001
```

## Quick Fix Script

If you want to add both ports at once, you can use this format in Auth0 Dashboard:

**Allowed Callback URLs:**
```
http://localhost:3000/auth/callback, http://localhost:3001/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000, http://localhost:3001
```

**Allowed Web Origins:**
```
http://localhost:3000, http://localhost:3001
```

## After Fixing

1. Save the changes in Auth0 Dashboard
2. Wait a few seconds for changes to propagate
3. Try logging in again
4. The error should be resolved!

## Why This Happened

The logs show your app is using port **3001**, but Auth0 was configured for port **3000**. The callback URL must match exactly what's configured in Auth0.
