'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-gray-400 hover:text-white transition mb-8 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-blue-500">Privacy Policy</h1>
        
        <div className="space-y-8 text-gray-300 leading-relaxed">
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">1. No Tracking Policy</h2>
                <p>
                    At ScanVidz, we believe privacy is a fundamental human right. Unlike other video platforms, 
                    we do <span className="text-white font-bold">NOT</span> track your watch history, search behavior, or clicks for advertising purposes. 
                    Your data stays on your device.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">2. Data Collection</h2>
                <p>We only collect the absolute minimum data required to function:</p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li>Account details (Name, Email) for login.</li>
                    <li>Liked videos and Subscriptions (stored securely to personalize your experience).</li>
                </ul>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">3. Third-Party Sharing</h2>
                <p>
                    We do not sell, trade, or transfer your personally identifiable information to outside parties. 
                    Zero ads means zero data sharing with advertisers.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">4. Security</h2>
                <p>
                    We implement a variety of security measures (End-to-End Encryption) to maintain the safety of your personal information.
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