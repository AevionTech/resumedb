import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import ResumeUploader from "@/components/ResumeUploader";
import UserSync from "@/components/UserSync";

export default async function DashboardPage() {
  let session = null;
  let user = null;

  try {
    session = await auth0.getSession();
    user = session?.user;
  } catch (error: any) {
    // Handle JWEInvalid errors
    if (error?.name === 'JWEInvalid' || error?.code === 'ERR_JWE_INVALID') {
      // Silently handle - will redirect below
    } else {
      throw error;
    }
  }

  // Redirect to home if not authenticated
  if (!user) {
    redirect("/");
  }

  // Sync user with backend server-side
  // This ensures the user exists in the database
  try {
    const syncResponse = await fetch(`${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/sync-user`, {
      cache: "no-store",
    });
    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      if (syncData.synced) {
        console.log("✅ User synced with backend:", syncData.user);
      } else {
        console.log("ℹ️ User sync will happen on first backend API call");
      }
    }
  } catch (error) {
    // Silently fail - user will be synced on first actual API call
    console.log("Server-side sync skipped (will happen on first API call)");
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* User Sync Component - syncs user with backend on login (client-side fallback) */}
      <UserSync />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">
            Upload and process multiple PDF resumes
          </p>
        </div>

        {/* Resume Uploader */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <ResumeUploader />
        </div>
      </div>
    </div>
  );
}
