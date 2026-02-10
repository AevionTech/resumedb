# Auth0 Integration Setup Guide

## ✅ Files Created

1. **`lib/auth0.ts`** - Auth0 client configuration
2. **`middleware.ts`** - Authentication middleware
3. **`components/LoginButton.tsx`** - Login button component
4. **`components/LogoutButton.tsx`** - Logout button component
5. **`components/Profile.tsx`** - User profile display component
6. **`.env.local`** - Environment variables template (you need to create this manually)

## 📦 Installation

First, install the Auth0 SDK:

```bash
npm install @auth0/nextjs-auth0@latest --legacy-peer-deps
```

## 🔐 Environment Variables Setup

Create a `.env.local` file in the root directory with the following:

```env
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_SECRET=your-long-random-secret-here
APP_BASE_URL=http://localhost:3000
```

### Option 1: Automatic Setup (macOS)

If you have the Auth0 CLI installed:

```bash
AUTH0_APP_NAME="ResumeDB" && \
brew tap auth0/auth0-cli && \
brew install auth0 && \
auth0 login --no-input && \
auth0 apps create -n "${AUTH0_APP_NAME}" -t regular \
  -c http://localhost:3000/auth/callback \
  -l http://localhost:3000 \
  -o http://localhost:3000 \
  --reveal-secrets --json \
  --metadata created_by="resumedb-setup" > auth0-app-details.json && \
CLIENT_ID=$(jq -r '.client_id' auth0-app-details.json) && \
CLIENT_SECRET=$(jq -r '.client_secret' auth0-app-details.json) && \
DOMAIN=$(auth0 tenants list --json | jq -r '.[] | select(.active == true) | .name') && \
SECRET=$(openssl rand -hex 32) && \
echo "AUTH0_DOMAIN=${DOMAIN}" > .env.local && \
echo "AUTH0_CLIENT_ID=${CLIENT_ID}" >> .env.local && \
echo "AUTH0_CLIENT_SECRET=${CLIENT_SECRET}" >> .env.local && \
echo "AUTH0_SECRET=${SECRET}" >> .env.local && \
echo "APP_BASE_URL=http://localhost:3000" >> .env.local && \
rm auth0-app-details.json && \
cat .env.local
```

### Option 2: Manual Setup

1. Go to [Auth0 Dashboard](https://manage.auth0.com/dashboard/)
2. Click **"Create Application"** → Select **"Regular Web Application"**
3. Configure the following URLs:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`
4. Copy your **Domain**, **Client ID**, and **Client Secret**
5. Generate a random secret for `AUTH0_SECRET` (32+ characters):
   ```bash
   openssl rand -hex 32
   ```
6. Update `.env.local` with your values

## 🚀 Running the Application

After setting up environment variables:

```bash
npm run dev
```

Visit `http://localhost:3000` to see the Auth0 integration.

## 📝 Features

- ✅ Login/Logout functionality
- ✅ User profile display
- ✅ Protected routes (Resume Uploader requires login)
- ✅ Server-side session management
- ✅ Client-side user hooks

## 🔧 Troubleshooting

### Issue: "Cannot find module '@auth0/nextjs-auth0'"
**Solution**: Make sure you've installed the package:
```bash
npm install @auth0/nextjs-auth0@latest --legacy-peer-deps
```

### Issue: Authentication routes return 404
**Solution**: Ensure `middleware.ts` is in the root directory (same level as `package.json`)

### Issue: Environment variables not loading
**Solution**: 
1. Ensure `.env.local` is in the root directory
2. Restart the dev server after creating/modifying `.env.local`

### Issue: TypeScript errors for Auth0 imports
**Solution**: These are usually cache issues. The app will still work. Try:
1. Restart VS Code
2. Run `npm run dev` - the app should work despite the errors

## 📚 Documentation

- [Auth0 Next.js SDK Documentation](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Auth0 Dashboard](https://manage.auth0.com/)
