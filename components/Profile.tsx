"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function Profile() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-text">Loading user profile...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Generate initials for fallback avatar
  const getInitials = (name: string | undefined | null): string => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // Default SVG avatar with initials
  const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r="55" fill="#475569"/>
      <text x="55" y="55" font-family="Arial, sans-serif" font-size="40" font-weight="600" fill="#e2e8f0" text-anchor="middle" dominant-baseline="central">${getInitials(user.name)}</text>
    </svg>
  `)}`;

  return (
    <div className="profile-card action-card">
      <div className="relative">
        <img
          src={user.picture || defaultAvatar}
          alt={user.name || 'User profile'}
          className="profile-picture"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            // Fallback to initials avatar if image fails to load
            if (target.src !== defaultAvatar) {
              target.src = defaultAvatar;
            }
          }}
        />
      </div>
      <h2 className="profile-name">{user.name || 'User'}</h2>
      <p className="profile-email">{user.email || 'No email'}</p>
    </div>
  );
}
