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
      setUser(JSON.parse(storedUser));
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
    <div className="relative" ref={menuRef}>
      
      {/* Avatar Button */}
      <div 
        onClick={handleClick}
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm md:text-base cursor-pointer transition select-none
          ${user ? 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30' : 'bg-gray-700 hover:bg-gray-600'}
        `}
      >
        {user ? user.name.charAt(0).toUpperCase() : 'U'}
      </div>

      {/* Dropdown Menu (Only if User is Logged In) */}
      {showMenu && user && (
        <div className="absolute right-0 top-12 w-56 bg-[#1f1f1f] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          
          {/* User Info Header */}
          <div className="p-4 border-b border-gray-700 bg-[#252525]">
             <p className="font-bold text-white truncate">{user.name}</p>
             <p className="text-xs text-gray-400 truncate">{user.email_or_phone}</p>
          </div>

          {/* Menu Options */}
          <div className="py-2">
             <button 
                onClick={() => router.push('/settings')} 
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white transition flex items-center gap-3"
             >
                <span>⚙️</span> Profile Settings
             </button>

             <button 
                onClick={() => alert("Language Selection coming soon!")} 
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#333] hover:text-white transition flex items-center gap-3"
             >
                <span>🌐</span> Language: English
             </button>

             <div className="h-px bg-gray-700 my-1 mx-2"></div>

             <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-3"
             >
                <span>🚪</span> Logout
             </button>
          </div>
        </div>
      )}
    </div>
  );
}