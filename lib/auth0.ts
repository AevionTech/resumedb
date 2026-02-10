import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  authorizationParams: {
    scope: 'openid profile email',
    // Request access token for the backend API
    audience: process.env.AUTH0_AUDIENCE || process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
  },
  // Set default returnTo URL after login
  routes: {
    callback: '/auth/callback',
    postLogoutRedirect: '/',
  },
});
