import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import "./globals.css";
import { QueryProvider } from "@/components/QueryProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ResumeDB",
  description: "Resume Database",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-slate-100">
        <Auth0Provider>
          <QueryProvider>
            <Navbar />
            {children}
          </QueryProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
