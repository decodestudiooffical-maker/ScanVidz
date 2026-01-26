'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu'; // 🔥 Import UserMenu

// --- TYPES ---
interface Video {
  title: string;
  link: string;
  thumbnail: string;
  duration: string;
  views: string;
  channel_name?: string;
  channel_avatar?: string;
  timestamp?: string; 
}

function HistoryContent() {
  const router = useRouter();
  const [history, setHistory] = useState<Video[]>([]);
  // Sidebar State: Desktop starts open, Mobile starts closed
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // --- RESPONSIVE SIDEBAR LOGIC ---
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth < 768) setSidebarOpen(false);
          else setSidebarOpen(true);
      };
      // Set initial state
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- LOAD HISTORY ---
  useEffect(() => {
    const stored = localStorage.getItem('scanvidz_history');
    if (stored) {
        try {
            setHistory(JSON.parse(stored));
        } catch (e) {
            console.error("History Parse Error", e);
        }
    }
  }, []);

  // --- CLEAR HISTORY ---
  const clearHistory = () => {
      if (confirm("Are you sure you want to clear your watch history?")) {
          localStorage.removeItem('scanvidz_history');
          setHistory([]);
      }
  };

  // --- PLAY VIDEO ---
  const playVideo = (video: Video) => {
    router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}`);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-4">
            {/* 🔥 HAMBURGER BUTTON (Visible on Mobile now) */}
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-800 rounded-full text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1 onClick={() => router.push('/')} className="text-xl md:text-2xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                ScanVidz
            </h1>
         </div>
         
         {/* 🔥 UPDATED: UserMenu Component */}
         <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden relative">
         
         {/* 🔥 MOBILE SIDEBAR DRAWER (Fixed Overlay) */}
         <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f0f0f] border-r border-gray-800 transform transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-20`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" onClick={() => router.push('/')} isOpen={true} />
               <SidebarItem icon="💎" text="Best Content" onClick={() => router.push('/best-content')} isOpen={true} />
               <SidebarItem icon="🕒" text="History" active onClick={() => router.push('/history')} isOpen={true} />
            </div>
         </div>
         
         {/* 🔥 DESKTOP SIDEBAR (Static) */}
         <aside className={`${isSidebarOpen ? 'w-60' : 'w-[72px]'} bg-[#0f0f0f] hidden md:flex flex-col transition-all duration-300 border-r border-gray-800/50`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" onClick={() => router.push('/')} isOpen={isSidebarOpen} />
               <SidebarItem icon="💎" text="Best Content" onClick={() => router.push('/best-content')} isOpen={isSidebarOpen} />
               <SidebarItem icon="🕒" text="History" active onClick={() => router.push('/history')} isOpen={isSidebarOpen} />
            </div>
         </aside>

         {/* MAIN CONTENT */}
         <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar w-full">
            
            {/* Overlay to close sidebar on mobile when clicking outside */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>
            )}

            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">Watch History</h2>
                {history.length > 0 && (
                    <button 
                        onClick={clearHistory}
                        className="text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/20 px-4 py-2 rounded-full transition"
                    >
                        🗑️ Clear all watch history
                    </button>
                )}
            </div>

            {history.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <span className="text-6xl mb-4">📜</span>
                  <h3 className="text-xl font-bold text-gray-300">History is empty</h3>
                  <p>Videos you watch will appear here.</p>
                  <button onClick={() => router.push('/')} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition">
                      Start Watching
                  </button>
               </div>
            ) : (
               <div className="flex flex-col gap-4 max-w-4xl">
                  {history.map((video, idx) => (
                     <div key={idx} onClick={() => playVideo(video)} className="flex gap-4 p-2 rounded-xl hover:bg-[#1f1f1f] cursor-pointer group transition">
                        {/* Thumbnail */}
                        <div className="relative w-40 h-24 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden border border-gray-800 group-hover:border-gray-600">
                           <img src={video.thumbnail} className="w-full h-full object-cover" />
                           <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">{video.duration}</span>
                        </div>
                        {/* Info */}
                        <div className="flex flex-col py-1">
                           <h3 className="text-white font-semibold line-clamp-2 leading-tight group-hover:text-blue-400 text-lg">{video.title}</h3>
                           <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                                <span className="hover:text-white transition">{video.channel_name || 'ScanVidz'}</span>
                                <span>•</span>
                                <span>{video.views} views</span>
                           </div>
                           <p className="text-xs text-gray-500 mt-2">
                               Watched on {video.timestamp ? new Date(video.timestamp).toLocaleDateString() : 'Recently'}
                           </p>
                        </div>
                        {/* Remove Button */}
                        <button className="ml-auto self-start p-2 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition">
                           ✕
                        </button>
                     </div>
                  ))}
               </div>
            )}
         </main>
      </div>
    </div>
  );
}

// Sidebar Helper
function SidebarItem({ icon, text, active, onClick, isOpen }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-5 px-3 py-2.5 rounded-lg w-full transition-colors ${active ? 'bg-[#272727] text-white border-l-4 border-blue-500' : 'text-gray-400 hover:bg-[#272727] hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}>
            <span className="text-xl">{icon}</span>
            {isOpen && <span className="text-sm font-medium truncate">{text}</span>}
        </button>
    );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Loading History...</div>}>
      <HistoryContent />
    </Suspense>
  );
}