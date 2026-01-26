'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-gray-900 text-gray-400 pt-16 pb-8 font-sans">
      <div className="max-w-[1600px] mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
              <span className="text-3xl">🛡️</span> ScanVidz
            </h2>
            <p className="text-sm leading-relaxed max-w-xs">
              The world's first open-source, privacy-focused video engine. 
              <br />
              <span className="text-blue-500 font-bold">Zero Ads. Zero Tracking.</span>
            </p>
          </div>

          {/* Links Column 1 */}
          <div>
            <h3 className="text-white font-bold mb-4">Discover</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-blue-500 transition">Trending Now</Link></li>
              <li><Link href="/best-content" className="hover:text-blue-500 transition">Best Content 💎</Link></li>
              <li><Link href="/search?q=music" className="hover:text-blue-500 transition">Music</Link></li>
              <li><Link href="/search?q=gaming" className="hover:text-blue-500 transition">Gaming</Link></li>
            </ul>
          </div>

          {/* Links Column 2 (Updated Links) */}
          <div>
            <h3 className="text-white font-bold mb-4">Legal & Info</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-blue-500 transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-blue-500 transition">Terms of Service</Link></li>
              <li><Link href="/dmca" className="hover:text-blue-500 transition">DMCA</Link></li>
              <li><Link href="/about" className="hover:text-blue-500 transition">About Us</Link></li>
            </ul>
          </div>

          {/* Social / Contact */}
          <div>
            <h3 className="text-white font-bold mb-4">Connect</h3>
            <div className="flex gap-4">
              {['Twitter', 'GitHub', 'Discord'].map((social) => (
                <button key={social} className="bg-[#1f1f1f] hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition">
                  {social}
                </button>
              ))}
            </div>
            <p className="mt-6 text-xs text-gray-600">
              Built for the community, by the community.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600">
          <p>© 2026 ScanVidz Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Made with ❤️ in India</span>
            <span>Server Status: <span className="text-green-500">● Online</span></span>
          </div>
        </div>

      </div>
    </footer>
  );
}