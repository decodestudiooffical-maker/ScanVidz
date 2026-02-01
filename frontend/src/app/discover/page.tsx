'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// --- SAFE DATA (WHITELISTED CHANNELS ONLY) ---
// Yahi wo logic hai jo copyright se bachayega. Hum sirf inkaw content dikhayenge.
const LEGAL_SOURCES = [
  { id: 1, title: "Hera Pheri", thumbnail: "https://img.youtube.com/vi/TIQ5hrfermg/maxresdefault.jpg", link: "TIQ5hrfermg", source: "Goldmines (Official)", type: "Comedy" },
  { id: 2, title: "Train to Busan (Hindi)", thumbnail: "https://img.youtube.com/vi/tsPe5j52dIA/maxresdefault.jpg", link: "tsPe5j52dIA", source: "Official Horror", type: "Horror" },
  { id: 3, title: "Sintel (Open Source)", thumbnail: "https://img.youtube.com/vi/0cxzlMTMCQQ/maxresdefault.jpg", link: "0cxzlMTMCQQ", source: "Blender Foundation", type: "Indie/Short" },
  { id: 4, title: "One Punch Man (Ep 1)", thumbnail: "https://img.youtube.com/vi/atxYe-nOa9w/maxresdefault.jpg", link: "atxYe-nOa9w", source: "Muse Asia (Legal Anime)", type: "Anime" },
];

export default function DiscoverPage() {
  const router = useRouter();
  const [mood, setMood] = useState('');
  
  // --- HANDLERS ---
  const handlePlay = (videoId: string) => {
    // Ye hamare safe player pe le jayega
    router.push(`/watch?v=https://www.youtube.com/watch?v=${videoId}`);
  };

  const handleMoodSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`AI is finding best movies for mood: "${mood}"... (Coming Soon)`);
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white font-sans pb-20">
      
      {/* 1. HERO SECTION (Trailers & Countdown) */}
      <div className="relative w-full h-[60vh] flex items-end p-8 bg-gradient-to-t from-[#0f0f0f] via-transparent to-black/50" 
           style={{backgroundImage: 'url("https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547OTqEv.jpg")', backgroundSize: 'cover', backgroundPosition: 'center'}}>
        <div className="max-w-4xl z-10">
          <span className="bg-red-600 text-xs font-bold px-2 py-1 rounded">COMING SOON</span>
          <h1 className="text-5xl font-black mt-2 mb-4">Avatar: Fire and Ash</h1>
          <p className="text-gray-300 text-lg mb-6 line-clamp-2">The next chapter in the epic saga. Discover the new tribes of Pandora.</p>
          <div className="flex gap-4">
             <button className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition">Watch Trailer ▷</button>
             <div className="bg-black/60 border border-gray-600 px-6 py-3 rounded-full font-mono text-blue-400">
               Releases in: <span className="text-white font-bold">294 Days</span>
             </div>
          </div>
        </div>
      </div>

      {/* 2. MOOD AI SECTION */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
           <div>
             <h2 className="text-2xl font-bold mb-2">🎬 Mood Recommender AI</h2>
             <p className="text-gray-400">Don't know what to watch? Tell us how you feel.</p>
           </div>
           <form onSubmit={handleMoodSearch} className="flex-1 w-full flex gap-2">
             <input 
               type="text" 
               placeholder="e.g. I want something motivational..." 
               className="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-3 focus:border-blue-500 outline-none text-white"
               value={mood}
               onChange={(e) => setMood(e.target.value)}
             />
             <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 rounded-xl font-bold">✨ Ask AI</button>
           </form>
        </div>
      </div>

      {/* 3. LEGAL MOVIES & INDIE FILMS */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="text-green-400">✔</span> Free & Legal Full Movies
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {LEGAL_SOURCES.map((movie) => (
            <div key={movie.id} onClick={() => handlePlay(movie.link)} className="group cursor-pointer">
              <div className="relative aspect-video rounded-xl overflow-hidden mb-3 border border-gray-800 group-hover:border-gray-500 transition">
                <img src={movie.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                <span className="absolute top-2 right-2 bg-black/80 text-[10px] font-bold px-2 py-1 rounded text-gray-300">{movie.source}</span>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black">▶</div>
                </div>
              </div>
              <h3 className="font-bold text-gray-100 group-hover:text-blue-400 transition truncate">{movie.title}</h3>
              <p className="text-xs text-gray-500">{movie.type} • Full Movie</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}