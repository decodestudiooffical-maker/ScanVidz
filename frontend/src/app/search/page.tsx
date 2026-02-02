'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu'; 
import { API_BASE_URL } from '@/utils/api'; // Centralized API URL

// --- TYPES ---
interface Video {
  id?: string; // Added ID for smarter linking
  title: string;
  link: string;
  thumbnail: string;
  duration: string;
  views: string;
  channel_name?: string; 
  channel_avatar?: string; 
  source?: string; // Fallback for channel name
}

// --- BACKUP DATA ---
const BACKUP_VIDEOS: Video[] = [
  {
    id: "ysz5S6P_288",
    title: "Nature in 8K Ultra HD - Relaxing River Sounds",
    link: "https://www.youtube.com/watch?v=ysz5S6P_288",
    thumbnail: "https://i.ytimg.com/vi/ysz5S6P_288/maxresdefault.jpg",
    duration: "10:00",
    views: "55M",
    channel_name: "Nature Relaxation Films",
    channel_avatar: "https://ui-avatars.com/api/?background=random&name=Nature"
  },
];

// --- ICONS ---
const HistoryIcon = () => <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const FireIcon = () => <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>;

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
  const [hasMore, setHasMore] = useState(true); // Idea 14: Infinite Scroll Check
  
  // 🔥 SUGGESTIONS, HISTORY & FILTERS
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]); // Idea 11
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const searchContainerRef = useRef<HTMLFormElement>(null);

  const filters = ["All", "4K Ultra HD", "Live", "Music", "Gaming", "News", "Sports", "Learning"];
  const trendingTags = ["GTA VI", "Marvel", "Horror", "4K HDR", "Anime", "Comedy"]; // Idea 12

  // --- 1. HISTORY MANAGER (Idea 11) ---
  useEffect(() => {
    const saved = localStorage.getItem('scanvidz_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const addToHistory = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...history.filter(h => h !== term)].slice(0, 6);
    setHistory(newHistory);
    localStorage.setItem('scanvidz_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('scanvidz_history');
  };

  // --- 2. LIVE SUGGESTION LOGIC (Idea 8) ---
  useEffect(() => {
    const timer = setTimeout(() => {
        if (query.length > 1 && showSuggestions) {
            fetch(`${API_BASE_URL}/suggestions?q=${encodeURIComponent(query)}`)
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


  // --- 3. MAIN FETCH FUNCTION (Handles Filters too) ---
  const fetchVideos = useCallback(async (searchQuery: string, pageNum: number, isLoadMore: boolean, currentFilter: string) => {
    if (!searchQuery) {
        if (!isLoadMore) setVideos([]); // Clear if empty query
        return;
    }
    
    if (isLoadMore) setLoadingMore(true); else setLoadingInitial(true);

    const limit = 20; 
    let apiUrl = `${API_BASE_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}&page=${pageNum}`;
    
    if (currentFilter && currentFilter !== "All") {
        apiUrl += `&filter=${encodeURIComponent(currentFilter)}`;
    }

    try {
        const res = await fetch(apiUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error("Backend Connection Failed");
        const data = await res.json();
        const results = data.results || data.videos || [];
        
        if (results.length > 0) {
            setHasMore(true);
            if (isLoadMore) {
                setVideos(prev => [...prev, ...results]);
            } else {
                setVideos(results);
            }
        } else {
             setHasMore(false);
             if (!isLoadMore) setVideos([]);
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
    if(initialQuery) {
        setQuery(initialQuery);
        setPage(1);
        fetchVideos(initialQuery, 1, false, "All");
    }
  }, [initialQuery, fetchVideos]);


  // --- HANDLERS ---
  
  // 1. Load More / Infinite Scroll Handler
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
      addToHistory(query); // Save to History
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  // 3. Suggestion/History/Tag Click
  const handleSuggestionClick = (s: string) => {
      setQuery(s);
      setShowSuggestions(false);
      addToHistory(s);
      router.push(`/search?q=${encodeURIComponent(s)}`);
  };

  // 4. Filter Click
  const handleFilterClick = (f: string) => {
      setActiveFilter(f);
      setPage(1); 
      setLoadingInitial(true);
      fetchVideos(query, 1, false, f); 
  };

  // Play Video Logic (Idea 3: Hover Card Click)
  const playVideo = (video: Video) => {
    // Smart ID Extraction
    let videoId = video.id;
    if (!videoId && video.link) {
        if (video.link.includes('v=')) videoId = video.link.split('v=')[1];
        else if (video.link.includes('youtu.be/')) videoId = video.link.split('youtu.be/')[1];
    }

    if (videoId) {
        router.push(`/watch?v=${videoId}&title=${encodeURIComponent(video.title)}&channel=${encodeURIComponent(video.channel_name || video.source || 'ScanVidz')}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-2 md:px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-800 rounded-full hidden md:block text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1 onClick={() => router.push('/')} className="text-xl md:text-2xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">ScanVidz</h1>
         </div>

         {/* SEARCH BAR (Idea 8: Live Search) */}
         <form ref={searchContainerRef} onSubmit={handleSearch} className="flex-1 max-w-2xl mx-2 md:mx-4 relative">
            <div className="flex relative z-50">
                <input 
                    type="text" 
                    className="w-full bg-[#121212] border border-gray-700 rounded-l-full px-3 py-2 md:px-5 md:py-2.5 focus:outline-none focus:border-blue-600 placeholder-gray-500 text-white text-sm md:text-base transition-all focus:bg-[#1a1a1a]" 
                    placeholder="Search movies, trailers..." 
                    value={query} 
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                />
                <button type="submit" className="bg-[#222] border border-l-0 border-gray-700 rounded-r-full px-3 md:px-6 hover:bg-[#333]">🔍</button>
            </div>

            {/* SUGGESTIONS DROPDOWN */}
            {showSuggestions && (suggestions.length > 0 || history.length > 0) && (
                <div className="absolute top-full left-0 w-full bg-[#1f1f1f] border border-gray-700 rounded-xl mt-2 py-2 shadow-2xl z-40 max-h-80 overflow-y-auto">
                    {/* History Items */}
                    {history.length > 0 && !query && (
                        <div className="mb-2">
                            <div className="px-4 py-1 text-xs text-gray-500 font-bold uppercase flex justify-between">
                                <span>Recent</span>
                                <span onClick={clearHistory} className="cursor-pointer hover:text-white">Clear</span>
                            </div>
                            {history.map((h, i) => (
                                <li key={`h-${i}`} onClick={() => handleSuggestionClick(h)} className="px-5 py-2 hover:bg-[#333] cursor-pointer text-gray-300 flex items-center gap-3">
                                    <HistoryIcon /> {h}
                                </li>
                            ))}
                        </div>
                    )}
                    {/* Live Suggestions */}
                    {suggestions.map((s, i) => (
                        <li key={i} onClick={() => handleSuggestionClick(s)} className="px-5 py-2 hover:bg-[#333] cursor-pointer text-white font-medium flex items-center gap-3">
                            <span className="text-gray-500">🔍</span> {s}
                        </li>
                    ))}
                </div>
            )}
         </form>
         <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden">
         {/* SIDEBAR */}
         <aside className={`${isSidebarOpen ? 'w-60' : 'w-[72px]'} bg-[#0f0f0f] hidden md:flex flex-col transition-all duration-300 border-r border-gray-800/50`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" active onClick={() => router.push('/')} isOpen={isSidebarOpen} />
               <SidebarItem icon="💎" text="Best Content" onClick={() => router.push('/best-content')} isOpen={isSidebarOpen} />
               <SidebarItem icon="🕒" text="History" onClick={() => router.push('/history')} isOpen={isSidebarOpen} />
            </div>
         </aside>

         {/* MAIN CONTENT */}
         <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative">
            
            {/* NO SEARCH STATE: Show Trending (Idea 12) */}
            {!query && videos.length === 0 && !loadingInitial && (
                <div className="max-w-4xl mx-auto mt-10">
                    <div className="flex items-center gap-2 mb-4">
                        <FireIcon />
                        <h2 className="text-lg font-bold text-white">Trending Now</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {trendingTags.map(tag => (
                            <button key={tag} onClick={() => handleSuggestionClick(tag)} className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-gray-700 rounded-full text-sm font-medium transition text-gray-300 hover:text-white hover:border-blue-500">
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* FILTERS & RESULTS */}
            {(query || videos.length > 0) && (
                <>
                    {/* Filters (Idea 13) */}
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

                    {/* SKELETON LOADING (Idea 4) */}
                    {loadingInitial ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse pb-20">
                          {[...Array(8)].map((_, i) => (
                             <div key={i} className="space-y-3">
                                <div className="bg-gray-800 aspect-video rounded-xl"></div>
                                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-900 rounded w-1/2"></div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <>
                       {/* VIDEO GRID (Idea 3: Hover Cards) */}
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                          {videos.map((video, idx) => (
                             <div key={idx} onClick={() => playVideo(video)} className="cursor-pointer group flex flex-col">
                                <div className="relative aspect-video rounded-xl overflow-hidden mb-3 border border-gray-800 group-hover:border-blue-500/50 transition-all bg-gray-900 shadow-lg group-hover:shadow-blue-900/20">
                                   <img 
                                        src={video.thumbnail} 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                        onError={(e:any) => e.target.src=`https://i.ytimg.com/vi/${video.id || 'error'}/hqdefault.jpg`}
                                   />
                                   {/* Idea 5: Duration Badge */}
                                   <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded border border-white/10">
                                        {video.duration || 'HD'}
                                   </span>
                                   {/* Play Icon on Hover */}
                                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
                                            <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                        </div>
                                   </div>
                                </div>
                                
                                <div className="flex gap-3 px-1">
                                   <img 
                                        src={video.channel_avatar || `https://ui-avatars.com/api/?background=random&name=${video.channel_name || 'U'}`} 
                                        alt="Channel"
                                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 bg-gray-700 border border-gray-800"
                                   />
                                   <div className="flex-1 min-w-0">
                                      <h3 className="text-white text-sm font-bold line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">{video.title}</h3>
                                      <div className="text-gray-400 text-xs mt-1 flex flex-col">
                                         <p className="hover:text-white transition font-medium truncate">{video.channel_name || 'Unknown Channel'}</p>
                                         <p>{video.views} views</p>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>

                       {/* LOAD MORE BUTTON (Idea 14) */}
                       {videos.length > 0 && hasMore && (
                          <div className="flex justify-center py-8 mt-4">
                              <button 
                                  onClick={handleLoadMore} 
                                  disabled={loadingMore}
                                  className="bg-[#272727] hover:bg-[#3f3f3f] text-white px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 flex items-center gap-2 border border-gray-700 hover:border-white/50"
                              >
                                  {loadingMore ? (
                                      <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Loading...
                                      </>
                                  ) : "Load More Videos"}
                              </button>
                          </div>
                       )}
                       </>
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