'use client';

import React, { useState, useEffect } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { useRouter } from 'next/navigation';

const API_BASE_URL = "https://scanvidz-backend.onrender.com";

export default function ShortsPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH REAL SHORTS DATA ---
  useEffect(() => {
      const fetchShorts = async () => {
          try {
              // 'shorts' keyword se search karke vertical videos laayenge
              const res = await fetch(`${API_BASE_URL}/search?q=shorts&limit=15`);
              const data = await res.json();
              if (data.results && data.results.length > 0) {
                  setVideos(data.results);
                  // Link se ID nikal kar pehle video ko active set karo
                  const firstId = data.results[0].link.split('v=')[1];
                  setActiveVideoId(firstId);
              }
          } catch (e) {
              console.error("Shorts Fetch Error:", e);
          } finally {
              setLoading(false);
          }
      };
      fetchShorts();
  }, []);

  // --- 2. SMART SCROLL OBSERVER (Auto Play Logic) ---
  useEffect(() => {
      const observer = new IntersectionObserver(
          (entries) => {
              entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                      const id = entry.target.getAttribute('data-id');
                      if (id) setActiveVideoId(id);
                  }
              });
          },
          { threshold: 0.6 } // 60% visibility required
      );

      setTimeout(() => {
          document.querySelectorAll('.short-container').forEach((el) => observer.observe(el));
      }, 1000);

      return () => observer.disconnect();
  }, [videos]);

  if (loading) {
      return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse font-bold">Loading Shorts...</p>
        </div>
      );
  }

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar touch-pan-y">
        {videos.map((video, index) => {
            let vidId = video.id;
            if(!vidId && video.link) {
                vidId = video.link.split('v=')[1];
            }
            if(!vidId) return null;

            return (
                <ShortsPlayer 
                    key={index} 
                    video={video} 
                    videoId={vidId}
                    isActive={activeVideoId === vidId} 
                />
            );
        })}
    </div>
  );
}

// --- 3. CUSTOM PLAYER (The Magic Component) ---
function ShortsPlayer({ video, videoId, isActive }: { video: any, videoId: string, isActive: boolean }) {
    const router = useRouter();
    const [player, setPlayer] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Browsers force mute on autoplay usually
    const [isLiked, setIsLiked] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 10000) + 500); // Mock data for now

    // Play/Pause Logic
    useEffect(() => {
        if (player) {
            if (isActive) {
                player.playVideo();
                setIsPlaying(true);
            } else {
                player.pauseVideo();
                setIsPlaying(false);
                player.seekTo(0); 
            }
        }
    }, [isActive, player]);

    // Handlers
    const togglePlay = () => {
        if (!player) return;
        if (isPlaying) {
            player.pauseVideo();
            setIsPlaying(false);
        } else {
            player.playVideo();
            setIsPlaying(true);
        }
    };

    const toggleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!player) return;
        if (isMuted) {
            player.unMute();
            setIsMuted(false);
        } else {
            player.mute();
            setIsMuted(true);
        }
    };

    // 🔥 CUSTOM SHARE LOGIC (ScanVidz Link)
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Hamare Platform ka link generate karo
        const shareUrl = `${window.location.origin}/watch?v=${videoId}`;
        
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert(`🔗 Link Copied to Clipboard!\n\n${shareUrl}\n\nShare this ScanVidz link with friends!`);
        });
    };

    // Custom Like Logic
    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
        // Yahan Backend API call kar sakte hain: fetch('/api/like', ...)
    };

    // Custom Subscribe Logic
    const handleSubscribe = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSubscribed(!isSubscribed);
        // Alert for feedback
        if(!isSubscribed) alert(`Subscribed to ${video.channel_name || 'Creator'} 🎉`);
    };

    const handleComment = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert("Comments section opening soon! 💬");
    };

    // YouTube Options (Hide Everything & Loop)
    const opts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            controls: 0,      // No Controls
            disablekb: 1,     // No Keyboard
            fs: 0,            // No Fullscreen
            modestbranding: 1,
            rel: 0,           // No Related Videos
            showinfo: 0,      // No Title
            iv_load_policy: 3,// No Annotations
            loop: 1,          // Auto Loop
            playlist: videoId,// Required for looping single video
            playsinline: 1,   // Mobile Fix
        },
    };

    return (
        <div 
            data-id={videoId}
            className="short-container w-full h-full snap-start snap-always relative flex items-center justify-center bg-[#121212] border-b border-gray-900 overflow-hidden"
        >
            {/* 🔥 VIDEO LAYER (Scaled Up & Locked) 
               - scale-[1.35]: YouTube ke icons ko screen se bahar dhakel deta hai.
               - pointer-events-none: Isse YouTube par click karna namumkin hai.
            */}
            <div className="absolute inset-0 z-0 pointer-events-none transform scale-[1.35] md:scale-100 origin-center flex items-center justify-center">
                 <YouTube 
                    videoId={videoId} 
                    opts={opts}
                    onReady={(e: any) => {
                        setPlayer(e.target);
                        if(isActive) e.target.playVideo();
                    }}
                    className="w-full h-full"
                    iframeClassName="w-full h-full object-cover"
                 />
            </div>

            {/* 🔥 SHIELD LAYER (Controls Play/Pause) */}
            <div 
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={togglePlay}
            >
                {/* Play/Pause Animation Overlay */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center animate-pulse">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                )}
            </div>

            {/* 🔥 UI OVERLAY (Right Side Actions & Info) */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 pb-24 md:pb-8 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none">
                
                <div className="flex items-end justify-between pointer-events-auto">
                    
                    {/* Left Side: Info */}
                    <div className="flex-1 pr-12 pb-2">
                        <div className="flex items-center gap-3 mb-3">
                            <div 
                                className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-lg shadow-lg cursor-pointer"
                                onClick={() => router.push(`/search?q=${video.channel_name || 'Creator'}`)}
                            >
                                {video.channel_name ? video.channel_name.charAt(0) : 'S'}
                            </div>
                            <span className="font-bold text-white shadow-black drop-shadow-md text-sm truncate max-w-[150px]">
                                {video.channel_name || 'ScanVidz Creator'}
                            </span>
                            <button 
                                onClick={handleSubscribe}
                                className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase transition shadow-lg ${isSubscribed ? 'bg-gray-700 text-gray-300' : 'bg-red-600 text-white hover:bg-red-500'}`}
                            >
                                {isSubscribed ? 'Subscribed' : 'Subscribe'}
                            </button>
                        </div>
                        
                        <p className="text-white text-sm line-clamp-2 leading-snug drop-shadow-md font-medium mb-2">
                            {video.title} <span className="text-gray-400">#shorts #trending</span>
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-300 bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                            <span>🎵 Original Audio • ScanVidz</span>
                        </div>
                    </div>

                    {/* Right Side: Custom Actions (ScanVidz Logic) */}
                    <div className="flex flex-col items-center gap-6 pb-2">
                        
                        {/* Like Button */}
                        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleLike}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 ${isLiked ? 'bg-red-500/20 text-red-500' : 'bg-black/40 text-white hover:bg-black/60'}`}>
                                <svg className={`w-7 h-7 ${isLiked ? 'fill-current' : 'fill-white'}`} viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </div>
                            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{likeCount}</span>
                        </div>

                        {/* Comment Button */}
                        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleComment}>
                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 hover:bg-black/60">
                                <span className="text-2xl">💬</span>
                            </div>
                            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Comment</span>
                        </div>

                        {/* Share Button (Custom Link) */}
                        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleShare}>
                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 hover:bg-black/60">
                                <span className="text-2xl transform -rotate-12">🚀</span>
                            </div>
                            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Share</span>
                        </div>

                        {/* Mute Toggle */}
                        <div onClick={toggleMute} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md mt-2 active:scale-90">
                             {isMuted ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                             ) : (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                             )}
                        </div>

                        {/* Vinyl Animation */}
                        <div className="w-10 h-10 rounded-full border-2 border-gray-800 overflow-hidden animate-spin-slow bg-black mt-2">
                             <div className="w-3 h-3 bg-red-600 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}