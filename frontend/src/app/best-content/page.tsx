'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu'; 

// 🔥 UPDATED BACKEND URL
const API_BASE_URL = "https://scanvidz-backend.onrender.com";

// --- 🌟 THE MEGA CURATED POOL (Merging 5 Best Ideas) ---
const MEGA_POOL = [
  // 💎 Visual Masterpieces (Premium)
  "Oppenheimer 4K Trailer", "Avatar Way of Water 4K HDR", "Interstellar IMAX 4K",
  "Cyberpunk 2077 Phantom Liberty 4K", "8K Nature Drone Footage", "Costa Rica 4K Animals",
  "Formula 1 Highlights 4K", "Hans Zimmer Live Concert 4K", "Batman The Dark Knight 4K Scenes",
  
  // 🇮🇳 Region Top (Local Flavors)
  "Trending in India", "Best Coke Studio Songs", "Viral Indian Memes Compilation",
  "Best Bollywood Lo-fi", "Indian Street Food 4K", "Travel India 4K",
  
  // 🕵️ Underrated Gems (Hidden Talent)
  "Award winning short film", "Best underrated movie scenes", "Staff pick vimeo",
  "Hidden gem indie songs", "Beautiful cinematography no words", "Deep sea discovery 4K",
  
  // ⏳ Time Capsule (Nostalgia)
  "Best songs of 2010", "90s Cartoon Intro Nostalgia", "Classic Rock Hits 80s",
  "Old Delhi 90s footage", "Best Cricket Moments 2011 World Cup", "Retro Tech Reviews",
  
  // 🏆 Critic's Choice (High Quality)
  "Oscar winning visual effects breakdown", "IMDb top rated movie clips",
  "Ted Talk Best Inspiring", "Masterclass Acting Lessons", "Best Documentaries 2025"
];

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

function BestContent() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  // Track used topics to avoid repetition in one session
  const [usedTopics, setUsedTopics] = useState<string[]>([]);

  // --- RESPONSIVE SIDEBAR LOGIC ---
  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth < 768) setSidebarOpen(false);
          else setSidebarOpen(true);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 🔥 FETCH FUNCTION (HANDLES LOAD MORE) ---
  const fetchBestContent = useCallback(async (isLoadMore = false) => {
      if (isLoadMore) setLoadingMore(true); else setLoading(true);

      // 1. Filter out topics we already showed
      const availableTopics = MEGA_POOL.filter(t => !usedTopics.includes(t));
      
      // If we ran out of topics, reset the pool (Infinite Loop Logic)
      const poolToUse = availableTopics.length < 8 ? MEGA_POOL : availableTopics;
      
      // 2. Pick 8 Random Topics
      const shuffled = [...poolToUse].sort(() => 0.5 - Math.random());
      const selectedTopics = shuffled.slice(0, 8);

      // 3. Update used topics
      if (availableTopics.length < 8) setUsedTopics(selectedTopics); 
      else setUsedTopics(prev => [...prev, ...selectedTopics]);

      // 4. Fetch Videos in Parallel
      const promises = selectedTopics.map(query => 
          fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}&limit=1`)
          .then(res => res.json())
          .then(data => data.results?.[0] || null)
          .catch(() => null)
      );

      const results = await Promise.all(promises);
      const validVideos = results.filter(v => v !== null);

      if (isLoadMore) {
          // Filter duplicates before adding
          setVideos(prev => {
              const newVids = validVideos.filter(nv => !prev.some(pv => pv.link === nv.link));
              return [...prev, ...newVids];
          });
      } else {
          setVideos(validVideos);
      }
      
      setLoading(false);
      setLoadingMore(false);
  }, [usedTopics]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    // Only fetch if empty
    if (videos.length === 0) {
        fetchBestContent(false);
    }
  }, []);

  const handleLoadMore = () => {
      fetchBestContent(true);
  };

  const playVideo = (video: Video) => {
    try {
        const historyItem = { ...video, timestamp: new Date().toISOString() };
        const oldHistory = JSON.parse(localStorage.getItem('scanvidz_history') || '[]');
        const newHistory = [historyItem, ...oldHistory.filter((v: any) => v.link !== video.link)].slice(0, 50);
        localStorage.setItem('scanvidz_history', JSON.stringify(newHistory));
    } catch(e) {}

    router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name || '')}&avatar=${encodeURIComponent(video.channel_avatar || '')}`);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-800 rounded-full text-white">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h1 onClick={() => router.push('/')} className="text-xl md:text-2xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                ScanVidz
            </h1>
         </div>
         <UserMenu />
      </header>

      <div className="flex flex-1 overflow-hidden relative">
         
         {/* MOBILE DRAWER */}
         <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f0f0f] border-r border-gray-800 transform transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-20`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" onClick={() => router.push('/')} isOpen={true} />
               <SidebarItem icon="💎" text="Best Content" active onClick={() => router.push('/best-content')} isOpen={true} />
               <SidebarItem icon="🕒" text="History" onClick={() => router.push('/history')} isOpen={true} />
            </div>
         </div>
         
         {/* DESKTOP SIDEBAR */}
         <aside className={`${isSidebarOpen ? 'w-60' : 'w-[72px]'} bg-[#0f0f0f] hidden md:flex flex-col transition-all duration-300 border-r border-gray-800/50`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" onClick={() => router.push('/')} isOpen={isSidebarOpen} />
               <SidebarItem icon="💎" text="Best Content" active onClick={() => router.push('/best-content')} isOpen={isSidebarOpen} />
               <SidebarItem icon="🕒" text="History" onClick={() => router.push('/history')} isOpen={isSidebarOpen} />
            </div>
         </aside>

         {/* MAIN CONTENT */}
         <main className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar w-full">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8 pl-2 border-l-4 border-purple-500">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Curated Collections 💎</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Underrated gems, visual masterpieces, and nostalgia. <span className="text-purple-400 font-bold">Refreshes every click.</span>
                    </p>
                </div>
            </div>

            {loading ? (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
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
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {videos.map((video, idx) => (
                     <div key={idx} onClick={() => playVideo(video)} className="bg-[#121212] rounded-xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-transform duration-300 border border-transparent hover:border-purple-500/50">
                        <div className="relative aspect-video">
                           <img src={video.thumbnail} className="w-full h-full object-cover" onError={(e:any) => e.target.src='https://via.placeholder.com/640x360'}/>
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
                           <span className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded font-bold shadow-lg">HD</span>
                        </div>
                        <div className="p-4">
                           <h3 className="font-bold text-gray-100 line-clamp-2 leading-snug group-hover:text-purple-400 transition text-sm">{video.title}</h3>
                           <div className="flex justify-between items-center mt-3">
                                <div className="flex items-center gap-2">
                                    <img src={video.channel_avatar || `https://ui-avatars.com/api/?background=random&name=${video.channel_name}`} className="w-6 h-6 rounded-full" />
                                    <span className="text-xs text-gray-400 line-clamp-1">{video.channel_name}</span>
                                </div>
                                <span className="text-xs text-gray-500 whitespace-nowrap">{video.views}</span>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
               
               {/* 🔥 LOAD MORE BUTTON (Infinite Discovery) */}
               <div className="flex justify-center mt-12 pb-20">
                    <button 
                        onClick={handleLoadMore} 
                        disabled={loadingMore}
                        className="bg-[#1f1f1f] hover:bg-[#333] text-white px-8 py-3 rounded-full font-bold border border-gray-700 transition-all hover:scale-105 flex items-center gap-2 shadow-lg"
                    >
                        {loadingMore ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Discovering Gems...
                            </>
                        ) : "Load More Collections 🎲"}
                    </button>
               </div>
               </>
            )}
         </main>
         
         {isSidebarOpen && (
            <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>
         )}
      </div>
    </div>
  );
}

function SidebarItem({ icon, text, active, onClick, isOpen }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-5 px-3 py-2.5 rounded-lg w-full transition-colors ${active ? 'bg-[#272727] text-white border-l-4 border-purple-500' : 'text-gray-400 hover:bg-[#272727] hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}>
            <span className="text-xl">{icon}</span>
            {isOpen && <span className="text-sm font-medium truncate">{text}</span>}
        </button>
    );
}

export default function BestContentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-white">Loading...</div>}>
      <BestContent />
    </Suspense>
  );
}