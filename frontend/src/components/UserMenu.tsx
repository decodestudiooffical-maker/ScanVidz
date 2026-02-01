'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 1. Check if User is Logged In
  useEffect(() => {
    const storedUser = localStorage.getItem('scanvidz_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("User data parse error", e);
      }
    }
  }, []);

  // 2. Click Outside to Close Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Logout Logic
  const handleLogout = () => {
    localStorage.removeItem('scanvidz_user'); // Delete Data
    setUser(null);
    router.push('/login'); // Send to Login
    window.location.reload(); // Refresh to update UI
  };

  // 4. Handle Click (Login or Toggle Menu)
  const handleClick = () => {
    if (!user) {
      router.push('/login');
    } else {
      setShowMenu(!showMenu);
    }
  };

  return (
    <div className="relative flex items-center gap-3" ref={menuRef}>
      
      {/* 🔥 NEW ADDITION: User Name & Status (Desktop Only) */}
      {/* Ye sirf tab dikhega jab user login hoga */}
      {user && (
        <div className="hidden md:block text-right cursor-pointer" onClick={() => setShowMenu(!showMenu)}>
            <p className="text-sm font-bold text-white leading-none">{user.name}</p>
            <p className="text-[10px] text-blue-400 font-medium">Premium Member</p>
        </div>
      )}

      {/* Avatar Button (Aapka Purana Code) */}
      <div 
        onClick={handleClick}
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base cursor-pointer transition select-none ring-2 ring-transparent hover:ring-white/20
          ${user ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-500/30 text-white' : 'bg-white text-black hover:bg-gray-200'}
        `}
      >
        {user ? (
            user.name.charAt(0).toUpperCase()
        ) : (
            // Agar login nahi hai to 'Sign In' icon
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
        )}
      </div>

      {/* Dropdown Menu (Aapka Purana Code - As it is) */}
      {showMenu && user && (
        <div className="absolute right-0 top-14 w-64 bg-[#1f1f1f]/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          {/* User Info Header */}
          <div className="p-4 border-b border-gray-700 bg-[#252525]/50">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-lg">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-white truncate text-sm">{user.name}</p>
                    <p className="text-xs text-blue-400 font-mono">PRO ACCOUNT</p>
                </div>
             </div>
             <p className="text-xs text-gray-400 truncate bg-black/20 p-1.5 rounded">{user.email_or_phone}</p>
          </div>

          {/* Menu Options */}
          <div className="py-2">
             <button 
                onClick={() => router.push('/settings')} 
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition flex items-center gap-3"
             >
                <span>⚙️</span> Profile Settings
             </button>

             <button 
                onClick={() => alert("Language Selection coming soon!")} 
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition flex items-center gap-3"
             >
                <span>🌐</span> Language: English
             </button>
             
             <button 
                onClick={() => router.push('/history')} 
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition flex items-center gap-3"
             >
                <span>📜</span> Watch History
             </button>

             <div className="h-px bg-gray-700 my-1 mx-4"></div>

             <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-3 font-bold"
             >
                <span>🚪</span> Logout
             </button>
          </div>
        </div>
      )}
    </div>
  );
}