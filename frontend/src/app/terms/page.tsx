'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-gray-400 hover:text-white transition mb-8 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-purple-500">Terms of Service</h1>
        
        <div className="space-y-8 text-gray-300 leading-relaxed">
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                <p>
                    By accessing and using ScanVidz, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">2. User Conduct</h2>
                <p>You agree NOT to use the service to:</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>Upload or share illegal, harmful, or offensive content.</li>
                    <li>Attempt to hack, reverse engineer, or disrupt our servers.</li>
                    <li>Spam comments or harass other users.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">3. Content Ownership</h2>
                <p>
                    ScanVidz respects the intellectual property rights of others. We function as a search engine and video player; 
                    original content rights remain with their respective creators (e.g., YouTube creators).
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">4. Termination</h2>
                <p>
                    We reserve the right to terminate or suspend your account immediately, without prior notice, 
                    if you breach these Terms.
                </p>
            </section>

            <div className="pt-8 border-t border-gray-800 text-sm text-gray-500">
                Last Updated: January 2026
            </div>
        </div>
      </div>
    </div>
  );
}