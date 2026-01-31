'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu'; 

// --- TYPES ---
interface Video {
  link: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  channel_name: string; 
  channel_avatar: string;
  timestamp: string; // ISO String
}

export default function HistoryPage() {
  const router = useRouter();
  
  // --- STATES ---
  const [history, setHistory] = useState<Video[]>([]);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Idea 9: Infinite Scroll (Load in chunks)
  const [visibleCount, setVisibleCount] = useState(15); 

  // Idea 3: Pause History Logic
  const [isPaused, setIsPaused] = useState(false);

  // Idea 5: Batch Delete / Selection Mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Idea 2: Search History
  const [searchQuery, setSearchQuery] = useState("");

  // --- INITIAL LOAD ---
  useEffect(() => {
      // Load History
      const storedHistory = JSON.parse(localStorage.getItem('scanvidz_history') || '[]');
      setHistory(storedHistory);
      
      // Load Paused State
      const pausedState = localStorage.getItem('scanvidz_history_paused') === 'true';
      setIsPaused(pausedState);

      setLoading(false);

      // Responsive Sidebar
      const handleResize = () => {
          if (window.innerWidth < 768) setSidebarOpen(false);
          else setSidebarOpen(true);
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- ACTIONS ---

  const togglePause = () => {
      const newState = !isPaused;
      setIsPaused(newState);
      localStorage.setItem('scanvidz_history_paused', newState.toString());
  };

  const clearAllHistory = () => {
      if (confirm("Are you sure you want to clear your entire watch history?")) {
          setHistory([]);
          localStorage.removeItem('scanvidz_history');
      }
  };

  const deleteSelected = () => {
      if (confirm(`Delete ${selectedItems.size} videos?`)) {
          const newHistory = history.filter(v => !selectedItems.has(v.link));
          setHistory(newHistory);
          localStorage.setItem('scanvidz_history', JSON.stringify(newHistory));
          setSelectionMode(false);
          setSelectedItems(new Set());
      }
  };

  const toggleSelection = (link: string) => {
      const newSet = new Set(selectedItems);
      if (newSet.has(link)) newSet.delete(link);
      else newSet.add(link);
      setSelectedItems(newSet);
  };

  const removeItem = (link: string) => {
      const newHistory = history.filter(v => v.link !== link);
      setHistory(newHistory);
      localStorage.setItem('scanvidz_history', JSON.stringify(newHistory));
  };

  // --- 🧠 LOGIC: Idea 8 - WATCH STATS ---
  const stats = useMemo(() => {
      if (history.length === 0) return null;
      
      // Calculate top channel
      const channels = history.map(v => v.channel_name);
      const frequency: any = {};
      let maxFreq = 0;
      let topChannel = "";
      
      channels.forEach(c => {
          frequency[c] = (frequency[c] || 0) + 1;
          if (frequency[c] > maxFreq) {
              maxFreq = frequency[c];
              topChannel = c;
          }
      });

      return {
          totalVideos: history.length,
          topChannel: topChannel || "N/A"
      };
  }, [history]);

  // --- 🧠 LOGIC: Idea 1 - DATE GROUPING ---
  const groupedHistory = useMemo(() => {
      const groups: { [key: string]: Video[] } = {
          "Today": [],
          "Yesterday": [],
          "This Week": [],
          "Older": []
      };

      const filteredHistory = history.filter(v => 
          v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          v.channel_name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      filteredHistory.forEach(video => {
          const date = new Date(video.timestamp);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - date.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

          if (diffDays <= 1) groups["Today"].push(video);
          else if (diffDays <= 2) groups["Yesterday"].push(video);
          else if (diffDays <= 7) groups["This Week"].push(video);
          else groups["Older"].push(video);
      });

      return groups;
  }, [history, searchQuery]);

  // Flatten for infinite scroll display limit
  const visibleGroups = Object.entries(groupedHistory).reduce((acc: any, [key, vids]) => {
      if (vids.length > 0) acc.push({ title: key, videos: vids });
      return acc;
  }, []);


  const playVideo = (video: Video) => {
      if (selectionMode) {
          toggleSelection(video.link);
          return;
      }
      router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name)}&avatar=${encodeURIComponent(video.channel_avatar)}`);
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
         
         {/* SIDEBAR */}
         <aside className={`${isSidebarOpen ? 'w-60' : 'w-[72px]'} bg-[#0f0f0f] hidden md:flex flex-col transition-all duration-300 border-r border-gray-800/50`}>
            <div className="p-3 space-y-1">
               <SidebarItem icon="🏠" text="Home" onClick={() => router.push('/')} isOpen={isSidebarOpen} />
               <SidebarItem icon="💎" text="Best Content" onClick={() => router.push('/best-content')} isOpen={isSidebarOpen} />
               <SidebarItem icon="🕒" text="History" active onClick={() => router.push('/history')} isOpen={isSidebarOpen} />
            </div>
         </aside>

         {/* MAIN CONTENT */}
         <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar w-full relative">
            
            {/* TITLE & CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h2 className="text-3xl font-bold">Watch History</h2>
                
                {/* Idea 3 & 5: Controls */}
                <div className="flex items-center gap-3">
                    {/* Pause Toggle */}
                    <button onClick={togglePause} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition ${isPaused ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-[#272727] border-gray-700'}`}>
                        {isPaused ? '⏸ Paused' : '▶ History On'}
                    </button>

                    {/* Manage History */}
                    {selectionMode ? (
                        <div className="flex gap-2">
                            <button onClick={deleteSelected} disabled={selectedItems.size === 0} className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50">
                                Delete ({selectedItems.size})
                            </button>
                            <button onClick={() => setSelectionMode(false)} className="text-gray-400 hover:text-white px-3">Cancel</button>
                        </div>
                    ) : (
                        <>
                        {history.length > 0 && (
                            <button onClick={() => setSelectionMode(true)} className="bg-[#272727] hover:bg-[#3f3f3f] px-4 py-2 rounded-full text-sm border border-gray-700">
                                Select
                            </button>
                        )}
                        {history.length > 0 && (
                            <button onClick={clearAllHistory} className="text-gray-400 hover:text-red-400 text-sm font-medium px-2">
                                Clear All
                            </button>
                        )}
                        </>
                    )}
                </div>
            </div>

            {/* Idea 8: WATCH STATS (Gamification) */}
            {history.length > 0 && !selectionMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/30 p-4 rounded-2xl">
                        <div className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">Total Watched</div>
                        <div className="text-2xl font-black">{stats?.totalVideos} <span className="text-base font-normal text-gray-400">Videos</span></div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/30 p-4 rounded-2xl">
                        <div className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">Top Channel</div>
                        <div className="text-xl font-bold truncate">{stats?.topChannel}</div>
                    </div>
                    <div className="bg-[#1f1f1f] border border-gray-700 p-4 rounded-2xl flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">🔍</div>
                        <input 
                            type="text" 
                            placeholder="Search history..." 
                            className="bg-transparent outline-none w-full text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Idea 10: EMPTY STATE */}
            {history.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 bg-[#1f1f1f] rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">🕒</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-2">No watch history yet</h3>
                    <p className="text-gray-400 mb-8 max-w-md">Videos you watch will appear here. {isPaused && <span className="text-yellow-500 block mt-2">(History is currently paused)</span>}</p>
                    <button onClick={() => router.push('/')} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition">
                        Start Watching
                    </button>
                </div>
            )}

            {/* LIST OF VIDEOS (Grouped by Date) */}
            <div className="space-y-8 pb-20">
                {visibleGroups.map((group: any, groupIndex: number) => (
                    <div key={groupIndex}>
                        <h3 className="text-lg font-bold text-gray-300 mb-4 sticky top-0 bg-[#0f0f0f]/95 py-2 backdrop-blur-sm z-10">{group.title}</h3>
                        <div className="space-y-4">
                            {group.videos.slice(0, visibleCount).map((video: Video, i: number) => (
                                <div key={i} className={`flex gap-3 md:gap-4 p-2 rounded-xl transition group ${selectionMode ? 'hover:bg-[#1f1f1f] cursor-pointer' : 'hover:bg-[#1f1f1f]'}`} onClick={() => selectionMode && toggleSelection(video.link)}>
                                    
                                    {/* Checkbox for Selection Mode */}
                                    {selectionMode && (
                                        <div className="flex items-center pl-2">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedItems.has(video.link) ? 'bg-blue-600 border-blue-600' : 'border-gray-500'}`}>
                                                {selectedItems.has(video.link) && <span className="text-white text-xs">✓</span>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Thumbnail with Progress Bar (Idea 4) */}
                                    <div className="relative w-40 md:w-64 aspect-video bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => !selectionMode && playVideo(video)}>
                                        <img src={video.thumbnail} className="w-full h-full object-cover" />
                                        <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">{video.duration}</span>
                                        {/* Idea 4: Fake Progress Bar (Random length for UI demo) */}
                                        <div className="absolute bottom-0 left-0 h-1 bg-gray-600 w-full">
                                            <div className="h-full bg-red-600" style={{ width: `${Math.floor(Math.random() * 60) + 20}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 py-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm md:text-lg font-bold line-clamp-2 leading-tight cursor-pointer hover:text-blue-400" onClick={() => !selectionMode && playVideo(video)}>{video.title}</h4>
                                                
                                                {/* Idea 6: Quick Action Menu (Remove Button) */}
                                                {!selectionMode && (
                                                    <button onClick={(e) => { e.stopPropagation(); removeItem(video.link); }} className="text-gray-500 hover:text-white p-1" title="Remove from history">
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                            <div className="mt-1 md:mt-2 flex items-center gap-2 text-xs md:text-sm text-gray-400">
                                                <span className="hover:text-white cursor-pointer">{video.channel_name}</span>
                                                <span>•</span>
                                                <span>{video.views} views</span>
                                            </div>
                                        </div>
                                        
                                        <div className="hidden md:block text-xs text-gray-500 mt-2 line-clamp-1">
                                            {/* Description snippet could go here */}
                                            Watched {new Date(video.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Idea 9: Infinite Scroll (Load More) */}
                {history.length > visibleCount && (
                    <div className="flex justify-center pt-8">
                        <button onClick={() => setVisibleCount(prev => prev + 20)} className="text-blue-400 hover:text-blue-300 font-bold text-sm">
                            Show more items
                        </button>
                    </div>
                )}
            </div>

         </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, text, active, onClick, isOpen }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-5 px-3 py-2.5 rounded-lg w-full transition-colors ${active ? 'bg-[#272727] text-white border-l-4 border-white' : 'text-gray-400 hover:bg-[#272727] hover:text-white'} ${!isOpen ? 'justify-center' : ''}`}>
            <span className="text-xl">{icon}</span>
            {isOpen && <span className="text-sm font-medium truncate">{text}</span>}
        </button>
    );
}