'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar({ isOpen = true }: { isOpen?: boolean }) {
  const router = useRouter();
  const pathname = usePathname(); // Pata karega ki abhi kaun se page par ho

  const menuItems = [
    { label: 'Home', icon: '🏠', path: '/' },
    { label: 'Discover', icon: '🧭', path: '/discover' },
    { label: 'Best Content', icon: '💎', path: '/best-content' },
    { label: 'History', icon: '📜', path: '/history' },
  ];

  return (
    <aside className={`${isOpen ? 'w-64' : 'hidden'} lg:flex flex-col fixed left-0 top-16 bottom-0 bg-[#050505] border-r border-gray-800 p-4 overflow-y-auto z-40 custom-scrollbar transition-all duration-300`}>
       <div className="space-y-1 mb-8">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <button 
                key={item.label}
                onClick={() => router.push(item.path)} 
                className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition font-medium ${isActive ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="text-xl">{item.icon}</span> 
                {item.label}
              </button>
            );
          })}
       </div>
       
       {/* Extra Info Area */}
       <div className="border-t border-gray-800 pt-6 mt-auto">
          <p className="text-xs text-gray-600 px-4 text-center">ScanVidz v2.0 <br/> No Ads. No Tracking.</p>
       </div>
    </aside>
  );
}