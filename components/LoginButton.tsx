"use client";

export default function LoginButton() {
  return (
    <a
      href="/auth/login?returnTo=/dashboard"
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      Log In
    </a>
  );
}
