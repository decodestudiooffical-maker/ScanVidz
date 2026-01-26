'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto text-center md:text-left">
        <Link href="/" className="text-gray-400 hover:text-white transition mb-8 inline-block">← Back to Home</Link>
        
        <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                About ScanVidz
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl">
                Redefining how you watch videos. No distractions. No tracking. Just content.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-gray-300">
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">🎯 Our Mission</h2>
                <p>
                    The internet is broken. Ads are everywhere, and privacy is a myth. 
                    ScanVidz was built to give control back to the user. We want to create a clean, fast, and 
                    private video watching experience for everyone.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">🚀 The Technology</h2>
                <p>
                    Built with the latest tech stack (Next.js, Tailwind, Node.js), ScanVidz is designed for speed. 
                    Our smart algorithm filters out clickbait and brings you the highest quality 4K/8K content instantly.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">🤝 Community Driven</h2>
                <p>
                    We are open-source at heart. ScanVidz is built for the community, by the community. 
                    We don't sell your data, and we never will.
                </p>
            </section>
            
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">📞 Contact Us</h2>
                <p>Have suggestions or found a bug? We'd love to hear from you.</p>
                <Link href="mailto:support@scanvidz.com" className="text-blue-400 hover:underline mt-2 inline-block">
                    support@scanvidz.com
                </Link>
            </section>
        </div>
      </div>
    </div>
  );
}