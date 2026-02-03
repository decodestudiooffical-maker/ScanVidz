'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Helper to check active state
  const isActive = (path: string) => pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-md border-t border-gray-800 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        
        {/* 1. Home */}
        <Link href="/" className={`flex flex-col items-center gap-1 w-full h-full justify-center ${isActive('/') ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          <svg className="w-6 h-6" fill={isActive('/') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        {/* 2. Shorts (New Feature) */}
        <Link href="/shorts" className={`flex flex-col items-center gap-1 w-full h-full justify-center ${isActive('/shorts') ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          <svg className="w-6 h-6" fill={isActive('/shorts') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <span className="text-[10px] font-medium">Shorts</span>
        </Link>

        {/* 3. Discover */}
        <Link href="/discover" className={`flex flex-col items-center gap-1 w-full h-full justify-center ${isActive('/discover') ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          <svg className="w-6 h-6" fill={isActive('/discover') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="text-[10px] font-medium">Discover</span>
        </Link>

        {/* 4. History / Library */}
        <Link href="/history" className={`flex flex-col items-center gap-1 w-full h-full justify-center ${isActive('/history') ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}>
          <svg className="w-6 h-6" fill={isActive('/history') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[10px] font-medium">History</span>
        </Link>

      </div>
    </div>
  );
}