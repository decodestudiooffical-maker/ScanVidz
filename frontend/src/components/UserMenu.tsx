'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 1. Check if User is Logged In (and listen for changes)
  const checkUser = () => {
    const storedUser = localStorage.getItem('scanvidz_user') || sessionStorage.getItem('scanvidz_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("User data parse error", e);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    checkUser();
    // Listen for storage events (e.g. login from another tab or guest mode)
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
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
    localStorage.removeItem('scanvidz_user');
    sessionStorage.removeItem('scanvidz_user');
    setUser(null);
    setShowMenu(false);
    window.dispatchEvent(new Event('storage')); // Notify other components
    router.push('/'); 
    router.refresh(); // Force refresh to clear state
  };

  // 4. Handle Click
  const handleClick = () => {
    if (!user) {
      router.push('/login');
    } else {
      setShowMenu(!showMenu);
    }
  };

  // If not logged in, show a simple "Login" button instead of an icon
  if (!user) {
      return (
        <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-bold transition shadow-lg shadow-blue-900/20"
        >
            Login
        </button>
      );
  }

  return (
    <div className="relative flex items-center gap-3" ref={menuRef}>
      
      {/* Desktop User Info (Name + Badge) */}
      <div className="hidden md:block text-right cursor-pointer group" onClick={() => setShowMenu(!showMenu)}>
          <p className="text-sm font-bold text-white leading-none group-hover:text-blue-400 transition">{user.name}</p>
          <p className="text-[10px] text-gray-400 font-medium group-hover:text-white transition">Premium Member</p>
      </div>

      {/* Avatar Button */}
      <div 
        onClick={handleClick}
        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg cursor-pointer transition select-none ring-2 ring-transparent hover:ring-blue-500/50 relative overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg`}
      >
        {user.name.charAt(0).toUpperCase()}
      </div>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 top-14 w-72 bg-[#121212]/95 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 origin-top-right">
          
          {/* Header Section */}
          <div className="p-5 border-b border-gray-800 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
             <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-xl text-white shadow-inner">
                    {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="font-black text-white truncate text-lg">{user.name}</p>
                    <span className="inline-block bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold tracking-wider uppercase border border-blue-500/30">Pro Account</span>
                </div>
             </div>
             <p className="text-xs text-gray-400 truncate bg-black/40 p-2 rounded-lg border border-white/5 font-mono">{user.email_or_phone}</p>
          </div>

          {/* Menu Items */}
          <div className="p-2 space-y-1">
             <button 
                onClick={() => { setShowMenu(false); router.push('/profile'); }} 
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition flex items-center gap-4 group"
             >
                <span className="p-2 bg-gray-800 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition text-gray-400">👤</span> 
                <span className="font-medium">Profile Settings</span>
             </button>

             <button 
                onClick={() => alert("Language Settings coming soon!")} 
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition flex items-center gap-4 group"
             >
                <span className="p-2 bg-gray-800 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition text-gray-400">🌐</span> 
                <span className="font-medium">Language: English</span>
             </button>
             
             <button 
                onClick={() => { setShowMenu(false); router.push('/history'); }} 
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-xl transition flex items-center gap-4 group"
             >
                <span className="p-2 bg-gray-800 rounded-lg group-hover:bg-green-600 group-hover:text-white transition text-gray-400">📜</span> 
                <span className="font-medium">Watch History</span>
             </button>

             <div className="h-px bg-gray-800 my-2 mx-2"></div>

             <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition flex items-center gap-4 group"
             >
                <span className="p-2 bg-red-900/20 rounded-lg group-hover:bg-red-600 group-hover:text-white transition text-red-500">🚪</span> 
                <span className="font-bold">Sign Out</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
}