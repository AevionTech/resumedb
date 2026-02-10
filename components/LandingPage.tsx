"use client";

import Link from "next/link";
import { ArrowRight, Code, FileText, Zap, Shield } from "lucide-react";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function LandingPage() {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center">
            {/* Main Heading */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Master Your Resume
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Database
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto">
              Upload, process, and manage resumes with AI-powered insights.
              Built for recruiters and hiring managers.
            </p>

            {/* CTA Button */}
            <div className="flex items-center justify-center space-x-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/50"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              ) : (
                <Link
                  href="/auth/login?returnTo=/dashboard"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/50"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              )}
              <Link
                href="/problems"
                className="inline-flex items-center px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors border border-slate-700"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                PDF Processing
              </h3>
              <p className="text-slate-400">
                Upload and process multiple PDF resumes with automatic parsing
                and extraction.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                AI-Powered
              </h3>
              <p className="text-slate-400">
                Leverage AI to extract insights, match candidates, and analyze
                resumes at scale.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Secure & Private
              </h3>
              <p className="text-slate-400">
                Enterprise-grade security with Auth0 authentication and encrypted
                storage.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
