'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import YouTube from 'react-youtube'; 
import UserMenu from '@/components/UserMenu'; 

// Port Check: Ensure Backend is running on 8000
const API_BASE_URL = "http://127.0.0.1:8000"; 

// --- FALLBACK DATA (Agar Backend band ho to ye dikhega) ---
const FALLBACK_HERO = [
  { 
    id: 1, 
    title: "Avatar: Fire and Ash", 
    desc: "The next chapter in the epic saga. Discover the new tribes of Pandora.", 
    trailer_id: "v7KBK9X7X5k", 
    bg_image: "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547OTqEv.jpg" 
  },
  { 
    id: 2, 
    title: "GTA VI", 
    desc: "Welcome to Leonida. The biggest open world ever created.", 
    trailer_id: "QdBZY2fkU-0", 
    bg_image: "https://image.tmdb.org/t/p/original/2X5qXy5i5y5y5y5y.jpg" 
  }
];

const CATEGORIES = [
  { id: 'goldmines', label: 'Goldmines Hits', sourceTag: 'Goldmines', thumbnail: "https://img.youtube.com/vi/TIQ5hrfermg/maxresdefault.jpg", desc: "Classic Hindi Cinema" },
  { id: 'horror', label: 'Horror Nights', sourceTag: 'Horror', thumbnail: "https://img.youtube.com/vi/tsPe5j52dIA/maxresdefault.jpg", desc: "Spooky Legal Content" },
  { id: 'anime', label: 'Anime Hub', sourceTag: 'Anime', thumbnail: "https://img.youtube.com/vi/atxYe-nOa9w/maxresdefault.jpg", desc: "Muse Asia Official" },
  { id: 'animation', label: 'Open Cinema', sourceTag: 'Animation', thumbnail: "https://img.youtube.com/vi/0cxzlMTMCQQ/maxresdefault.jpg", desc: "Indie Gems" },
];

export default function DiscoverPage() {
  const router = useRouter();
  
  // --- STATES ---
  const [heroList, setHeroList] = useState<any[]>(FALLBACK_HERO); // List for Slider
  const [currentSlide, setCurrentSlide] = useState(0); // Current Index
  const [activeCategory, setActiveCategory] = useState<any | null>(null);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isPlayingHero, setIsPlayingHero] = useState(true); 
  const [player, setPlayer] = useState<any>(null); // Player Reference for Volume Control

  // --- 1. LOAD HERO DATA ---
  useEffect(() => {
    fetch(`${API_BASE_URL}/discover/hero`)
      .then(res => res.json())
      .then(data => {
         if(data.status === 'success' && Array.isArray(data.data)) {
             setHeroList(data.data);
         }
      })
      .catch(err => {
          console.log("Backend Offline - Using Fallback");
          // Fallback already set in initial state
      });
  }, []);

  // --- 2. 30 SECOND TIMER LOGIC (Auto Slide) ---
  useEffect(() => {
    if (heroList.length <= 1) return; // Don't slide if only 1 item
    
    // Change slide every 30 seconds (matches video end time)
    const interval = setInterval(() => {
        nextSlide();
    }, 30000); 

    return () => clearInterval(interval);
  }, [heroList, currentSlide]); // Reset timer on slide change

  // --- SLIDER CONTROLS ---
  const nextSlide = () => {
      setCurrentSlide((prev) => (prev + 1) % heroList.length);
      setIsPlayingHero(true);
  };

  const prevSlide = () => {
      setCurrentSlide((prev) => (prev === 0 ? heroList.length - 1 : prev - 1));
      setIsPlayingHero(true);
  };

  // --- HANDLERS ---
  const handleCategoryClick = async (cat: any) => {
    setActiveCategory(cat);
    setIsLoading(true);
    setMoviesList([]); 
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
        const res = await fetch(`${API_BASE_URL}/discover/category?tag=${cat.sourceTag}`);
        const data = await res.json();
        if(data.status === 'success') {
            setMoviesList(data.videos);
        } else {
            setMoviesList([]); 
        }
    } catch (e) { 
        console.error("API Error:", e);
    }
    setIsLoading(false);
  };

  const handleBackToHome = () => {
    setActiveCategory(null);
  };

  const handleMoodSubmit = async () => {
      if(!mood.trim()) return;
      setIsLoading(true);
      setActiveCategory({ label: `AI Picks: ${mood}`, sourceTag: 'AI' }); 
      
      try {
          const res = await fetch(`${API_BASE_URL}/discover/mood`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ text: mood })
          });
          const data = await res.json();
          if(data.status === 'success') {
              const aiMovies = data.videos.map((v:any) => ({
                  id: v.id,
                  title: v.title,
                  thumbnail: v.thumbnails && v.thumbnails[0] ? v.thumbnails[0].url : "",
                  source: v.channel ? v.channel.name : "YouTube",
                  views: v.viewCount ? v.viewCount.short : "N/A"
              }));
              setMoviesList(aiMovies);
          }
      } catch(e) {
        console.log("AI Error", e);
      }
      setIsLoading(false);
  };

  const handlePlay = (videoId: string) => {
    router.push(`/watch?v=https://www.youtube.com/watch?v=${videoId}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if(searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // --- SMART PLAYER EVENTS ---
  
  // 1. Set Volume & Unmute when Ready
  const onPlayerReady = (event: any) => {
      setPlayer(event.target);
      // Attempt to set volume to 50% and unmute
      // Note: Browsers block unmuted autoplay if user hasn't interacted with page
      try {
          event.target.setVolume(50);
          event.target.unMute();
          event.target.playVideo();
      } catch(e) {}
  };

  // 2. Skip to next video if error (Unavailable)
  const onPlayerError = (event: any) => {
      console.log("Video Error (Skipping):", event.data);
      nextSlide();
  };

  // 3. Skip to next video when ended (30s reached)
  const onPlayerEnd = (event: any) => {
      nextSlide();
  };

  // YouTube Options
  const heroOpts = {
      height: '100%',
      width: '100%',
      playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          showinfo: 0,
          mute: 0,   // Try to play with sound
          start: 0,
          end: 30,   // Force cut after 30 seconds
          modestbranding: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined
      },
  };

  const currentHero = heroList[currentSlide];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col pb-20 lg:pb-0">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-md border-b border-gray-800 h-16 flex items-center justify-between px-4 lg:px-6 shadow-md">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
             <h1 className="text-xl md:text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">ScanVidz</h1>
          </div>

          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-auto items-center bg-[#121212] border border-gray-700 rounded-full px-4 py-2 focus-within:border-blue-500 transition-colors">
             <input 
               type="text" 
               placeholder="Search movies, anime..." 
               className="bg-transparent flex-1 outline-none text-white placeholder-gray-500 text-sm" 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
             <button type="submit" className="text-gray-400 hover:text-white">🔍</button>
          </form>

          <div className="flex items-center gap-3">
             <button className="md:hidden text-white text-xl" onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}>🔍</button>
             <UserMenu />
          </div>
      </header>

      {/* Mobile Search Bar */}
      {isMobileSearchOpen && (
          <div className="md:hidden bg-[#111] p-3 border-b border-gray-800 animate-in slide-in-from-top-2">
             <form onSubmit={handleSearch} className="flex items-center bg-[#222] rounded-lg px-3 py-2">
                 <input 
                   type="text" 
                   placeholder="Search..." 
                   className="flex-1 bg-transparent outline-none text-white text-sm"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   autoFocus
                 />
                 <button type="submit">🔍</button>
             </form>
          </div>
      )}

      <div className="flex flex-1">
        
        {/* SIDEBAR */}
        <aside className="hidden lg:flex w-64 flex-col fixed left-0 top-16 bottom-0 bg-[#050505] border-r border-gray-800 p-4 overflow-y-auto z-40 custom-scrollbar">
           <div className="space-y-1 mb-8">
              <button onClick={() => router.push('/')} className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition font-medium"><span>🏠</span> Home</button>
              <button onClick={() => setActiveCategory(null)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition font-medium ${!activeCategory ? 'bg-blue-600/10 text-blue-500' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><span>🧭</span> Discover</button>
              <button onClick={() => router.push('/best-content')} className="w-full flex items-center gap-4 px-4 py-3 text-gray-400 hover:bg-white/5 hover:text-white rounded-xl transition font-medium"><span>💎</span> Best Content</button>
           </div>
           
           <div className="border-t border-gray-800 pt-6">
              <h3 className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Collections</h3>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => handleCategoryClick(cat)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:translate-x-1 transition text-left">
                    <span className="w-1.5 h-1.5 bg-gray-600 rounded-full group-hover:bg-blue-500 shrink-0"></span> {cat.label}
                </button>
              ))}
           </div>
        </aside>

        {/* BOTTOM NAV */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#050505]/95 backdrop-blur-lg border-t border-gray-800 flex justify-around items-center p-2 z-[60] pb-safe-area">
            <button onClick={() => router.push('/')} className="flex flex-col items-center p-2 text-gray-400 hover:text-white">
                <span className="text-xl">🏠</span>
                <span className="text-[10px] mt-1">Home</span>
            </button>
            <button onClick={() => setActiveCategory(null)} className={`flex flex-col items-center p-2 ${!activeCategory ? 'text-blue-500' : 'text-gray-400'}`}>
                <span className="text-xl">🧭</span>
                <span className="text-[10px] mt-1">Discover</span>
            </button>
            <button onClick={() => router.push('/best-content')} className="flex flex-col items-center p-2 text-gray-400 hover:text-white">
                <span className="text-xl">💎</span>
                <span className="text-[10px] mt-1">Best</span>
            </button>
            <button onClick={() => router.push('/history')} className="flex flex-col items-center p-2 text-gray-400 hover:text-white">
                <span className="text-xl">📜</span>
                <span className="text-[10px] mt-1">History</span>
            </button>
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 lg:ml-64 p-4 md:p-8 min-h-screen w-full">
            
            {!activeCategory && currentHero && (
              <div className="animate-fade-in-up w-full max-w-[1600px] mx-auto">
                  
                  {/* HERO CAROUSEL SECTION */}
                  <div className="relative w-full h-[55vh] md:h-[70vh] rounded-2xl md:rounded-3xl overflow-hidden mb-8 md:mb-12 group border border-white/5 shadow-2xl">
                      
                      {/* Background: Video Only Plays if Active */}
                      <div className="absolute inset-0 bg-black">
                         {heroList.map((item, index) => (
                             <div 
                                key={item.id} 
                                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                             >
                                 {/* Only Render YouTube for the active slide to save memory */}
                                 {index === currentSlide && isPlayingHero ? (
                                      <div className="w-full h-full scale-[1.35]">
                                          <YouTube 
                                            videoId={item.trailer_id} 
                                            opts={heroOpts} 
                                            className="w-full h-full"
                                            onReady={onPlayerReady}
                                            onError={onPlayerError}
                                            onEnd={onPlayerEnd}
                                          />
                                      </div>
                                 ) : (
                                      <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: `url(${item.bg_image})`}}></div>
                                 )}
                                 
                                 <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
                                 <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-transparent"></div>
                             </div>
                         ))}
                      </div>

                      {/* Content Overlay */}
                      <div className="absolute bottom-0 left-0 p-6 md:p-12 w-full md:max-w-3xl z-30 pointer-events-none">
                          {/* Animate text when slide changes */}
                          <div key={currentSlide} className="animate-in slide-in-from-left-5 duration-700 pointer-events-auto">
                              <span className="bg-red-600 text-[10px] md:text-xs font-bold px-2 py-1 md:px-3 rounded uppercase tracking-widest mb-2 md:mb-4 inline-block shadow-lg">
                                  #{currentSlide + 1} Trending Now
                              </span>
                              <h1 className="text-3xl md:text-6xl font-black mb-2 md:mb-4 drop-shadow-2xl leading-tight tracking-tight">
                                  {currentHero.title}
                              </h1>
                              <p className="text-gray-200 text-sm md:text-lg mb-6 line-clamp-2 md:line-clamp-3 drop-shadow-lg font-light">
                                  {currentHero.desc}
                              </p>
                              <div className="flex gap-4">
                                  <button onClick={() => handlePlay(currentHero.trailer_id)} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:scale-105 transition flex items-center gap-2 text-sm md:text-base shadow-lg hover:shadow-white/20">
                                     <span>▷</span> Watch Trailer
                                  </button>
                                  <button onClick={() => alert("Added to Watchlist")} className="bg-white/10 backdrop-blur border border-white/20 text-white px-4 py-3 rounded-full font-bold hover:bg-white/20 transition text-sm">
                                     + Watchlist
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* Carousel Controls (Next/Prev) */}
                      <button 
                        onClick={prevSlide} 
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-40 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur border border-white/10 transition hover:scale-110 hidden md:block"
                      >
                          ❮
                      </button>
                      <button 
                        onClick={nextSlide} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-40 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur border border-white/10 transition hover:scale-110 hidden md:block"
                      >
                          ❯
                      </button>

                      {/* Carousel Indicators (Dots) */}
                      <div className="absolute bottom-6 right-6 z-40 flex gap-2">
                          {heroList.map((_, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => { setCurrentSlide(idx); setIsPlayingHero(true); }}
                                className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-blue-500' : 'w-2 bg-gray-600 hover:bg-gray-400'}`}
                              ></div>
                          ))}
                      </div>
                  </div>

                  {/* Mood AI */}
                  <div className="mb-8 md:mb-12 bg-[#111] border border-white/10 rounded-2xl p-5 md:p-8 flex flex-col md:flex-row items-center gap-4 md:gap-6">
                      <div className="text-center md:text-left w-full md:w-auto">
                          <h2 className="text-xl md:text-2xl font-bold mb-1">🤖 AI Stylist</h2>
                          <p className="text-gray-400 text-xs md:text-sm">Feeling Sad? Happy? Adventurous?</p>
                      </div>
                      <div className="flex-1 w-full flex gap-2">
                          <input type="text" placeholder="e.g. I want to cry..." className="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition text-white text-sm" value={mood} onChange={(e) => setMood(e.target.value)} />
                          <button onClick={handleMoodSubmit} className="bg-blue-600 hover:bg-blue-500 px-4 md:px-6 rounded-xl font-bold whitespace-nowrap text-sm">
                              {isLoading ? "Thinking..." : "Ask AI"}
                          </button>
                      </div>
                  </div>

                  {/* Categories */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {CATEGORIES.map((cat) => (
                          <div key={cat.id} onClick={() => handleCategoryClick(cat)} className="group cursor-pointer bg-[#111] rounded-xl md:rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/50 hover:shadow-lg transition-all duration-300 flex sm:block items-center sm:items-start">
                              <div className="relative w-24 sm:w-full aspect-video overflow-hidden shrink-0">
                                  <img src={cat.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition"></div>
                              </div>
                              <div className="p-3 md:p-4 flex-1">
                                  <h3 className="font-bold text-base md:text-lg group-hover:text-blue-400 transition">{cat.label}</h3>
                                  <p className="text-[10px] md:text-xs text-gray-500 mt-1 line-clamp-1">{cat.desc}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
            )}

            {activeCategory && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1800px] mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 md:mb-8">
                      <button onClick={handleBackToHome} className="self-start bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition text-sm font-bold">⬅ Back</button>
                      <div>
                          <h1 className="text-2xl md:text-4xl font-black">{activeCategory.label}</h1>
                          <p className="text-gray-400 text-xs md:text-sm">Real-time results from ScanVidz Engine</p>
                      </div>
                  </div>

                  {isLoading ? (
                      <div className="text-center py-20 text-gray-500 animate-pulse">Fetching best content for you...</div>
                  ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                          {moviesList.length > 0 ? moviesList.map((movie:any, idx) => (
                              <div key={idx} onClick={() => handlePlay(movie.id)} className="group cursor-pointer relative bg-[#111] rounded-lg md:rounded-xl overflow-hidden border border-white/5 hover:border-gray-500 transition-all hover:-translate-y-1 hover:shadow-xl">
                                  <div className="relative aspect-[16/9]">
                                      <img src={movie.thumbnail || "https://via.placeholder.com/320x180"} className="w-full h-full object-cover" loading="lazy" />
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">▶</div>
                                      </div>
                                  </div>
                                  <div className="p-2 md:p-3">
                                      <h3 className="font-bold text-xs md:text-sm text-gray-200 line-clamp-2 group-hover:text-white">{movie.title}</h3>
                                      <p className="text-[10px] text-gray-500 mt-1">{movie.source}</p>
                                  </div>
                              </div>
                          )) : (
                            <div className="col-span-full text-center text-gray-500">No videos found. Backend might be searching...</div>
                          )}
                      </div>
                  )}
              </div>
            )}
        </main>
      </div>
    </div>
  );
}