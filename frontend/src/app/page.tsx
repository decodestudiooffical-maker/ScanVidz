'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu'; 

// 🔥 UPDATED BACKEND URL
const API_BASE_URL = "https://scanvidz-backend.onrender.com";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🔥 UPDATED STATE: Stores mixed videos
  const [trending, setTrending] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // 🔥 NEW: Pagination State for Infinite Scroll
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const router = useRouter();
  const searchContainerRef = useRef<HTMLFormElement>(null);

  // --- 1. RESPONSIVE SIDEBAR LOGIC ---
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth < 768) setSidebarOpen(false);
          else setSidebarOpen(true);
      };
      handleResize(); 
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 2. FETCH SMART RANDOM VIDEOS (Initial Load) ---
  useEffect(() => {
    fetchVideos(1, true); // Load Page 1 randomly
  }, []);

  // 🔥 SMART FETCH FUNCTION (Mixes Topics)
  const fetchVideos = async (pageNum: number, reset = false) => {
      if(loadingMore) return;
      setLoadingMore(true);

      // Topics pool to randomize content
      const topics = ["trending", "music hits", "gaming live", "tech reviews", "movie trailers", "coding tutorials", "vlogs"];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)]; 
      
      try {
          const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(randomTopic)}&limit=12&page=${pageNum}`);
          const data = await res.json();
          
          const newVideos = data.results || data.videos || [];
          
          if (reset) {
              setTrending(newVideos); // Fresh Load
          } else {
              // Append new videos (Filter duplicates)
              setTrending(prev => {
                  const combined = [...prev, ...newVideos];
                  return combined.filter((v, i, a) => a.findIndex(t => t.link === v.link) === i);
              });
          }
      } catch (err) {
          console.log("Fetch Error:", err);
      } finally {
          setLoadingMore(false);
      }
  };

  // --- 3. LIVE SUGGESTIONS LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => {
        if (searchQuery.length > 1 && showSuggestions) {
            fetch(`${API_BASE_URL}/suggestions?q=${encodeURIComponent(searchQuery)}`)
                .then(res => res.json())
                .then(data => setSuggestions(data))
                .catch(err => console.error(err));
        } else {
            setSuggestions([]);
        }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, showSuggestions]);

  // Click Outside to Close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleSuggestionClick = (s: string) => {
      setSearchQuery(s);
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(s)}`);
  };

  const playVideo = (video: any) => {
    try {
        const historyItem = { ...video, timestamp: new Date().toISOString() };
        const oldHistory = JSON.parse(localStorage.getItem('scanvidz_history') || '[]');
        const newHistory = [historyItem, ...oldHistory.filter((v: any) => v.link !== video.link)].slice(0, 50);
        localStorage.setItem('scanvidz_history', JSON.stringify(newHistory));
    } catch(e) {}
    
    router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name)}&avatar=${encodeURIComponent(video.channel_avatar)}`);
  };

  const handleLoadMore = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideos(nextPage, false); 
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500 selection:text-white flex flex-col font-sans">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-800 rounded-full text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1 onClick={() => router.push('/')} className="text-xl font-bold cursor-pointer hidden md:block">ScanVidz</h1>
         </div>
         
         {/* 🔥 User Menu Integrated Here */}
         <div className="flex items-center gap-3">
             <UserMenu /> 
         </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
         
         {/* --- SIDEBAR (Mobile) --- */}
         <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f0f0f] border-r border-gray-800 transform transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-20`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" active onClick={() => router.push('/')} isOpen={true} />
               <SidebarItem icon="🧭" text="Discover" onClick={() => router.push('/discover')} isOpen={true} />
               <SidebarItem icon="💎" text="Best Content" onClick={() => router.push('/best-content')} isOpen={true} />
               <SidebarItem icon="🕒" text="History" onClick={() => router.push('/history')} isOpen={true} />
            </div>
         </div>

         {/* --- SIDEBAR (Desktop) --- */}
         <aside className={`${isSidebarOpen ? 'w-60' : 'w-[0px]'} bg-[#0f0f0f] hidden md:flex flex-col transition-all duration-300 border-r border-gray-800/50 overflow-hidden`}>
            <div className="p-3 space-y-1 w-60">
               <SidebarItem icon="🏠" text="Home" active onClick={() => router.push('/')} isOpen={isSidebarOpen} />
               {/* 🔥 ADDED DISCOVER LINK HERE */}
               <SidebarItem icon="🧭" text="Discover" onClick={() => router.push('/discover')} isOpen={isSidebarOpen} />
               <SidebarItem icon="💎" text="Best Content" onClick={() => router.push('/best-content')} isOpen={isSidebarOpen} />
               <SidebarItem icon="🕒" text="History" onClick={() => router.push('/history')} isOpen={isSidebarOpen} />
            </div>
         </aside>

         {/* --- MAIN CONTENT --- */}
         <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full flex flex-col items-center">
            
            {/* Background Glows */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Hero Section */}
            <div className="z-10 flex flex-col items-center justify-center w-full max-w-4xl px-4 mt-16 md:mt-32 text-center">
                <div className="flex flex-col items-center mb-6 md:mb-8">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 drop-shadow-2xl">
                    ScanVidz
                    </h1>
                </div>
                
                <p className="text-gray-400 text-sm md:text-lg mb-8 max-w-2xl font-light">
                The Open Source Video Search Engine. <span className="text-blue-400 font-medium">No Ads. No Tracking.</span>
                </p>

                {/* SEARCH BAR */}
                <form ref={searchContainerRef} onSubmit={handleSearch} className="w-full relative group max-w-2xl z-50">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <div className="relative flex items-center bg-[#121212] border border-gray-700 rounded-2xl p-1.5 md:p-2 shadow-2xl">
                    <span className="pl-3 md:pl-4 text-gray-400 text-lg md:text-xl shrink-0">🔍</span>
                    <input 
                    type="text" 
                    className="w-full bg-transparent text-white px-2 py-2 md:px-4 md:py-3 text-sm md:text-lg focus:outline-none placeholder-gray-600 min-w-0"
                    placeholder="Search movies, music..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 md:px-8 md:py-3 rounded-xl font-bold text-sm md:text-base transition-transform active:scale-95 shadow-lg shadow-blue-900/50 shrink-0">
                    Search
                    </button>
                </div>
                {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute top-full left-0 w-full bg-[#1f1f1f] border border-gray-700 rounded-xl mt-2 py-2 shadow-2xl z-[100] overflow-hidden text-left">
                            {suggestions.slice(0, 4).map((s, i) => (
                                <li key={i} onClick={() => handleSuggestionClick(s)} className="px-5 py-3 hover:bg-[#333] cursor-pointer text-gray-200 font-medium flex items-center gap-3 border-b border-gray-800 last:border-0">
                                    <span className="text-gray-500">🔍</span> {s}
                                </li>
                            ))}
                        </ul>
                )}
                </form>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-2 mt-6 md:mt-8 z-10 w-full">
                {['🚫 Ad-Free', '🔒 Encrypted', '💾 8K Saver'].map((tag) => (
                    <div key={tag} className="bg-[#1f1f1f] px-2 py-1.5 md:px-4 md:py-2 rounded-full text-[11px] md:text-sm text-gray-300 border border-gray-800 hover:border-gray-600 transition cursor-default whitespace-nowrap">
                    {tag}
                    </div>
                ))}
                </div>
            </div>

            {/* Trending Grid */}
            <section className="z-0 w-full max-w-[1600px] px-4 md:px-6 mt-16 md:mt-24 mb-20">
                <div className="flex items-center gap-4 mb-8 pl-2 border-l-4 border-blue-600">
                    <h2 className="text-2xl md:text-3xl font-bold">Recommended For You</h2>
                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded animate-pulse">LIVE</span>
                </div>
                
                {trending.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-video bg-gray-900 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trending.map((video, idx) => (
                        <div key={idx} onClick={() => playVideo(video)} className="bg-[#121212] rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform duration-300 border border-transparent hover:border-gray-700">
                        <div className="relative aspect-video">
                            <img src={video.thumbnail} className="w-full h-full object-cover" onError={(e:any) => e.target.src='https://via.placeholder.com/640x360'}/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"></div>
                            <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-bold">{video.duration || 'Hot'}</span>
                        </div>
                        <div className="p-4">
                            <div className="flex gap-3">
                                <img src={video.channel_avatar || `https://ui-avatars.com/api/?background=random&name=${video.title.charAt(0)}`} className="w-9 h-9 rounded-full bg-gray-800" />
                                <div>
                                    <h3 className="font-bold text-gray-100 line-clamp-2 leading-snug group-hover:text-blue-400 transition text-sm">{video.title}</h3>
                                    <div className="flex flex-col mt-1 text-xs text-gray-400">
                                        <span>{video.channel_name || 'ScanVidz'}</span>
                                        <span>{video.views} views • Trending</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                    
                    {/* 🔥 LOAD MORE BUTTON */}
                    <div className="flex justify-center mt-12 pb-20">
                        <button 
                            onClick={handleLoadMore} 
                            disabled={loadingMore}
                            className="bg-[#1f1f1f] hover:bg-[#333] text-white px-8 py-3 rounded-full font-bold border border-gray-700 transition-all hover:scale-105 flex items-center gap-2"
                        >
                            {loadingMore ? 'Loading...' : 'Load More Videos'}
                        </button>
                    </div>
                    </>
                )}
            </section>
         </main>

         {/* Overlay */}
         {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>
         )}
      </div>
    </div>
  );
}

// Sidebar Helper
function SidebarItem({ icon, text, active, onClick, isOpen }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-5 px-3 py-2.5 rounded-lg w-full transition-colors ${active ? 'bg-[#272727] text-white border-l-4 border-white' : 'text-gray-400 hover:bg-[#272727] hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}>
            <span className="text-xl">{icon}</span>
            {isOpen && <span className="text-sm font-medium truncate">{text}</span>}
        </button>
    );
}