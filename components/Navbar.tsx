"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Code } from "lucide-react";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";

function AvatarImage({ user }: { user: any }) {
  const [imageError, setImageError] = useState(false);

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
  // Edge's Tracking Prevention blocks Google user content images,
  // so we'll fall back to initials when the image is blocked
  const defaultAvatar = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="#475569"/>
      <text x="16" y="16" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#e2e8f0" text-anchor="middle" dominant-baseline="central">${getInitials(user?.name)}</text>
    </svg>
  `)}`;

  // Try to load the image, but fall back to initials if blocked by tracking prevention
  // This ensures consistent display: if Edge blocks it, both browsers show initials
  const imageSrc = user?.picture && !imageError ? user.picture : defaultAvatar;

  return (
    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 relative">
      <img
        src={imageSrc}
        alt={user?.name || "User"}
        className="w-full h-full object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // Fallback to initials avatar if image fails to load (e.g., Edge tracking prevention)
          if (target.src !== defaultAvatar) {
            setImageError(true);
            target.src = defaultAvatar;
          }
        }}
        // Add crossOrigin to help with CORS/tracking prevention issues
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function Navbar() {
  const { user, isLoading } = useUser();

  return (
    <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left side: Logo and Links */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <Code className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              <span className="text-lg font-semibold text-slate-200 group-hover:text-white transition-colors">
                ResumeDB
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link
                href="/problems"
                className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
              >
                Problems
              </Link>
              <Link
                href="/discuss"
                className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
              >
                Discuss
              </Link>
              <Link
                href="/interview"
                className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
              >
                Interview
              </Link>
            </div>
          </div>

          {/* Right side: Auth */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
            ) : user ? (
              <div className="flex items-center space-x-3">
                <Link
                  href="/dashboard"
                  className="text-slate-400 hover:text-slate-200 transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>
                <div className="flex items-center space-x-2">
                  <AvatarImage user={user} />
                  <LogoutButton />
                </div>
              </div>
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
