'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
}

// --- BACKUP DATA ---
const BACKUP_VIDEOS: Video[] = [
  {
    title: "Nature in 8K Ultra HD - Relaxing River Sounds",
    link: "https://www.youtube.com/watch?v=ysz5S6P_288",
    thumbnail: "https://i.ytimg.com/vi/ysz5S6P_288/maxresdefault.jpg",
    duration: "10:00",
    views: "55M",
    channel_name: "Nature Relaxation Films",
    channel_avatar: "https://ui-avatars.com/api/?background=random&name=Nature"
  },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || ''; 
  const router = useRouter();

  // --- STATES ---
  const [query, setQuery] = useState(initialQuery);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState(1);
  
  // 🔥 SUGGESTIONS & FILTERS
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const searchContainerRef = useRef<HTMLFormElement>(null);

  const filters = ["All", "4K Ultra HD", "Live", "Music", "Gaming", "News", "Sports", "Learning"];

  // --- LIVE SUGGESTION LOGIC ---
  useEffect(() => {
    // Debounce: User ke rukne ke 300ms baad API call hogi
    const timer = setTimeout(() => {
        if (query.length > 1 && showSuggestions) {
            // 🔥 UPDATE: Naya Link Yahan Hai
            fetch(`https://https://scanvidz-backend.onrender.com/suggestions?q=${encodeURIComponent(query)}`)
                .then(res => res.json())
                .then(data => setSuggestions(data))
                .catch(err => console.error(err));
        } else {
            setSuggestions([]);
        }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, showSuggestions]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  // --- MAIN FETCH FUNCTION (Handles Filters too) ---
  const fetchVideos = useCallback(async (searchQuery: string, pageNum: number, isLoadMore: boolean, currentFilter: string) => {
    if (!searchQuery) {
        setVideos(BACKUP_VIDEOS);
        return;
    }
    
    if (isLoadMore) setLoadingMore(true); else setLoadingInitial(true);

    const limit = 40; 
    // 🔥 UPDATE: Naya Link Yahan Bhi Hai
    let apiUrl = `https://https://scanvidz-backend.onrender.com/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${pageNum}`;
    
    if (currentFilter && currentFilter !== "All") {
        apiUrl += `&filter=${encodeURIComponent(currentFilter)}`;
    }

    try {
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error("Backend Connection Failed");
        const data = await res.json();
        const results = data.results || data.videos || [];
        
        if (results.length > 0) {
            if (isLoadMore) {
                setVideos(prev => [...prev, ...results]);
            } else {
                setVideos(results);
            }
        } else if (!isLoadMore) {
             console.warn("0 results. Showing backup.");
             setVideos(BACKUP_VIDEOS);
        }
    } catch (err) {
        console.error("Search API Error:", err);
        if (!isLoadMore) setVideos(BACKUP_VIDEOS);
    } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
    }
  }, []);

  // --- INITIAL LOAD ---
  useEffect(() => {
    setQuery(initialQuery);
    setPage(1);
    fetchVideos(initialQuery, 1, false, "All");
  }, [initialQuery, fetchVideos]);


  // --- HANDLERS ---
  
  // 1. Load More
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(query, nextPage, true, activeFilter);
  };

  // 2. Search Submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  // 3. Suggestion Click
  const handleSuggestionClick = (s: string) => {
      setQuery(s);
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(s)}`);
  };

  // 4. Filter Click
  const handleFilterClick = (f: string) => {
      setActiveFilter(f);
      setPage(1); // Reset page
      setLoadingInitial(true);
      fetchVideos(query, 1, false, f); // Fetch with new filter
  };

  // Play Video Logic
  const playVideo = (video: Video) => {
    try {
        const historyItem = { ...video, timestamp: new Date().toISOString() };
        const oldHistory = JSON.parse(localStorage.getItem('scanvidz_history') || '[]');
        const newHistory = [historyItem, ...oldHistory.filter((v: any) => v.link !== video.link)].slice(0, 50);
        localStorage.setItem('scanvidz_history', JSON.stringify(newHistory));
    } catch(e) { console.log("History Error", e); }
    router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name || '')}&avatar=${encodeURIComponent(video.channel_avatar || '')}`);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      
      {/* HEADER (MOBILE RESPONSIVE FIX) */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-2 md:px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-800 rounded-full hidden md:block text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            
            {/* 🔥 UPDATED LOGO (Gradient Text) */}
            <h1 onClick={() => router.push('/')} className="text-xl md:text-2xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                ScanVidz
            </h1>
         </div>

         {/* SEARCH BAR WITH SUGGESTIONS (Fixed for Mobile) */}
         <form ref={searchContainerRef} onSubmit={handleSearch} className="flex-1 max-w-2xl mx-2 md:mx-4 relative">
            <div className="flex relative z-50">
                <input 
                    type="text" 
                    className="w-full bg-[#121212] border border-gray-700 rounded-l-full px-3 py-2 md:px-5 md:py-2.5 focus:outline-none focus:border-blue-600 placeholder-gray-500 text-white text-sm md:text-base" 
                    placeholder="Search videos..." 
                    value={query} 
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                />
                <button type="submit" className="bg-[#222] border border-l-0 border-gray-700 rounded-r-full px-3 md:px-6 hover:bg-[#333]">🔍</button>
            </div>

            {/* 🔥 SUGGESTION DROPDOWN */}
            {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute top-full left-0 w-full bg-[#1f1f1f] border border-gray-700 rounded-xl mt-2 py-2 shadow-2xl z-40 max-h-80 overflow-y-auto">
                    {suggestions.map((s, i) => (
                        <li 
                            key={i} 
                            onClick={() => handleSuggestionClick(s)}
                            className="px-5 py-2 hover:bg-[#333] cursor-pointer text-gray-200 font-medium flex items-center gap-3"
                        >
                            <span className="text-gray-500">🔍</span> {s}
                        </li>
                    ))}
                </ul>
            )}
         </form>

         {/* 🔥 REPLACED OLD 'U' BUTTON WITH UserMenu COMPONENT */}
         <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden">
         {/* SIDEBAR */}
         <aside className={`${isSidebarOpen ? 'w-60' : 'w-[72px]'} bg-[#0f0f0f] hidden md:flex flex-col transition-all duration-300 border-r border-gray-800/50`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" active onClick={() => router.push('/')} isOpen={isSidebarOpen} />
               {/* 🔥 FIXED: Best Content */}
               <SidebarItem icon="💎" text="Best Content" onClick={() => router.push('/best-content')} isOpen={isSidebarOpen} />
               <SidebarItem icon="🕒" text="History" onClick={() => router.push('/history')} isOpen={isSidebarOpen} />
            </div>
         </aside>

         {/* MAIN CONTENT */}
         <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
            
            {/* 🔥 WORKING FILTERS */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
               {filters.map((f, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleFilterClick(f)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border border-gray-700 whitespace-nowrap
                        ${activeFilter === f ? 'bg-white text-black font-bold' : 'bg-[#272727] hover:bg-white hover:text-black text-gray-200'}
                    `}
                  >
                    {f}
                  </button>
               ))}
            </div>

            {/* Video Grid or Loading */}
            {loadingInitial ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse pb-20">
                  {[...Array(12)].map((_, i) => (
                     <div key={i} className="space-y-3">
                        <div className="bg-gray-800 aspect-video rounded-xl"></div>
                        <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-900 rounded w-1/2"></div>
                     </div>
                  ))}
               </div>
            ) : (
               <>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                  {videos.map((video, idx) => (
                     <div key={idx} onClick={() => playVideo(video)} className="cursor-pointer group flex flex-col">
                        <div className="relative aspect-video rounded-xl overflow-hidden mb-3 border border-gray-800 group-hover:border-gray-500 transition-all bg-gray-900">
                           <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={(e:any) => e.target.src='https://via.placeholder.com/640x360'}/>
                           <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">{video.duration || 'HD'}</span>
                        </div>
                        
                        <div className="flex gap-3 px-1">
                           <img 
                                src={video.channel_avatar || 'https://via.placeholder.com/40?text=' + (video.title?.charAt(0) || 'S')} 
                                alt="Channel"
                                className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-gray-700"
                                onError={(e:any) => e.target.src='https://via.placeholder.com/40?text=U'}
                           />
                           <div>
                              <h3 className="text-white text-sm font-bold line-clamp-2 leading-tight group-hover:text-blue-400">{video.title}</h3>
                              <div className="text-gray-400 text-xs mt-1 flex flex-col">
                                 <p className="hover:text-white transition font-medium">{video.channel_name || 'Unknown Channel'}</p>
                                 <p>{video.views} views</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>

               {/* LOAD MORE */}
               {videos.length > 0 && !loadingInitial && (
                  <div className="flex justify-center py-8 mt-4">
                      <button 
                          onClick={handleLoadMore} 
                          disabled={loadingMore}
                          className="bg-[#272727] hover:bg-[#3f3f3f] text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center gap-2 border border-gray-700"
                      >
                          {loadingMore ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Loading more...
                              </>
                          ) : "Load More Videos"}
                      </button>
                  </div>
               )}
               </>
            )}
         </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, text, active, onClick, isOpen }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-5 px-3 py-2.5 rounded-lg w-full transition-colors ${active ? 'bg-[#272727] text-white' : 'text-gray-400 hover:bg-[#272727] hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}>
            <span className="text-xl">{icon}</span>
            {isOpen && <span className="text-sm font-medium truncate">{text}</span>}
        </button>
    );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}