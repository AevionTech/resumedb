"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";

/**
 * Component that syncs the user with the backend on login.
 * This ensures the user exists in the backend database.
 * 
 * The sync happens automatically when:
 * 1. User logs in (user becomes available)
 * 2. User navigates to dashboard
 * 
 * The backend's get_current_user dependency will:
 * - Validate the JWT token
 * - Extract user info (sub, email, name, picture) from token
 * - Create user if doesn't exist, or update if exists
 */
export default function UserSync() {
  const { user, isLoading } = useUser();
  const hasSyncedRef = useRef(false);
  const hasAttemptedRef = useRef(false);

  useEffect(() => {
    const syncUser = async () => {
      // Don't sync if user is loading or not authenticated
      if (isLoading || !user) {
        return;
      }

      // Don't sync if already synced or already attempted
      if (hasSyncedRef.current || hasAttemptedRef.current) {
        return;
      }

      // Mark as attempted to prevent infinite loops
      hasAttemptedRef.current = true;

      try {
        // Use the new sync-user API route which handles everything server-side
        const response = await fetch("/api/sync-user", {
          cache: "no-store",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const syncData = await response.json();
        
        if (syncData.synced) {
          console.log("✅ User synced with backend:", syncData.user);
          hasSyncedRef.current = true;
        } else {
          console.warn("⚠️", syncData.message || "User sync will happen on first backend API call.");
        }
      } catch (err: any) {
        console.error("❌ Failed to sync user with backend:", err);
        // Don't retry - user will be synced on first actual API call to backend
      }
    };

    syncUser();
  }, [user, isLoading]);

  // This component doesn't render anything visible
  // It just handles the sync in the background
  return null;
}
