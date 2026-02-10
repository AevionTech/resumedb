"use client";

export default function LogoutButton() {
  return (
    <a
      href="/auth/logout"
      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg transition-colors border border-slate-700"
    >
      Log Out
    </a>
  );
}
