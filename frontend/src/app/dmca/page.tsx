'use client';

import React from 'react';
import Link from 'next/link';

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-gray-400 hover:text-white transition mb-8 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl md:text-5xl font-black mb-8 text-red-500">DMCA Policy</h1>
        
        <div className="space-y-8 text-gray-300 leading-relaxed">
            <section>
                <h2 className="text-2xl font-bold text-white mb-4">Content Disclaimer</h2>
                <p>
                    ScanVidz is a video search engine and playback tool. We do <span className="text-white font-bold">NOT</span> host, upload, or store any video files on our servers. 
                    All content is provided by third-party services (like YouTube) and is accessed via their public APIs.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">Copyright Infringement</h2>
                <p>
                    If you believe your copyrighted work has been posted on ScanVidz without authorization, please understand that we cannot remove the video from the internet 
                    because we do not host it.
                </p>
                <p className="mt-4">
                    To remove content permanently, you must contact the original hosting platform (e.g., YouTube). Once removed from there, it will automatically disappear from ScanVidz.
                </p>
            </section>

            <section>
                <h2 className="text-2xl font-bold text-white mb-4">Takedown Requests</h2>
                <p>
                    However, if you want us to block specific search results on our platform, please send a written request to:
                </p>
                <div className="bg-[#1f1f1f] p-4 rounded-lg mt-4 border border-gray-700">
                    <p className="font-mono text-blue-400">legal@scanvidz.com</p>
                </div>
                <p className="mt-2 text-sm text-gray-500">Please allow 1-3 business days for a response.</p>
            </section>
        </div>
      </div>
    </div>
  );
}