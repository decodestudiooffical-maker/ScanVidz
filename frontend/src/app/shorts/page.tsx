'use client';

import React, { useState, useEffect, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { useRouter } from 'next/navigation';

// Global API Configuration
const API_BASE_URL = "https://scanvidz-backend.onrender.com";

export default function ShortsPage() {
  // --- STATE MANAGEMENT ---
  const [videos, setVideos] = useState<any[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 1. FETCH REAL SHORTS DATA FROM BACKEND ---
  useEffect(() => {
      const fetchShorts = async () => {
          try {
              // 'shorts' keyword se search karke vertical videos laayenge
              // Limit 15 to ensure smooth scrolling
              const res = await fetch(`${API_BASE_URL}/search?q=shorts&limit=15`);
              const data = await res.json();
              
              if (data.results && data.results.length > 0) {
                  setVideos(data.results);
                  
                  // Extract first video ID correctly to set as active initially
                  const firstVideo = data.results[0];
                  let firstId = firstVideo.id;
                  if (!firstId && firstVideo.link) {
                      firstId = firstVideo.link.split('v=')[1];
                  }
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

  // --- 2. SMART SCROLL OBSERVER (TikTok Style Auto-Play) ---
  // This Logic ensures only ONE video is active at a time based on visibility
  useEffect(() => {
      const observer = new IntersectionObserver(
          (entries) => {
              entries.forEach((entry) => {
                  if (entry.isIntersecting) {
                      const id = entry.target.getAttribute('data-id');
                      // Only update if ID exists and is different to prevent re-renders
                      if (id) {
                          console.log("Active Short ID:", id); // Debugging
                          setActiveVideoId(id);
                      }
                  }
              });
          },
          { 
            threshold: 0.7, // Increased threshold: Video must be 70% visible to trigger
            root: null,     // Viewport is root
          } 
      );

      // Delay observer attachment to allow DOM to render
      const timeoutId = setTimeout(() => {
          document.querySelectorAll('.short-container').forEach((el) => observer.observe(el));
      }, 500);

      return () => {
          observer.disconnect();
          clearTimeout(timeoutId);
      };
  }, [videos]);

  // Loading State UI
  if (loading) {
      return (
        <div className="h-screen w-full bg-black flex flex-col items-center justify-center text-white gap-4 z-50">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="animate-pulse font-bold text-lg tracking-widest">LOADING SHORTS...</p>
        </div>
      );
  }

  return (
    // Main Container: Handles Snap Scroll
    <div className="h-[calc(100vh-4rem)] md:h-screen w-full bg-black overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar touch-pan-y">
        {videos.map((video, index) => {
            // Robust ID Extraction
            let vidId = video.id;
            if(!vidId && video.link) {
                vidId = video.link.split('v=')[1];
            }
            // Skip invalid videos
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

// --- 3. CUSTOM PLAYER COMPONENT (The Magic Component) ---
function ShortsPlayer({ video, videoId, isActive }: { video: any, videoId: string, isActive: boolean }) {
    const router = useRouter();
    
    // Player State
    const [player, setPlayer] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Browsers usually force mute on autoplay
    
    // Interaction State
    const [isLiked, setIsLiked] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [likeCount, setLikeCount] = useState(Math.floor(Math.random() * 10000) + 500); // Mock data

    // --- AUDIO MIXING FIX: STRICT PLAY/PAUSE LOGIC ---
    useEffect(() => {
        if (player) {
            if (isActive) {
                // Video is in view -> PLAY
                player.playVideo();
                setIsPlaying(true);
            } else {
                // Video is NOT in view -> PAUSE IMMEDIATELY
                player.pauseVideo();
                setIsPlaying(false);
                // Optional: Reset to start so it replays from 0 next time
                // player.seekTo(0); 
            }
        }
    }, [isActive, player]);

    // --- HANDLERS ---
    
    // Toggle Play/Pause (Custom Shield Click)
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

    // Toggle Mute
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

    // 🔥 CUSTOM SHARE LOGIC (Generates ScanVidz Link, NOT YouTube)
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/watch?v=${videoId}`;
        
        // Copy to Clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
            // Check if Web Share API is available (Mobile Native Share)
            if (navigator.share) {
                navigator.share({
                    title: `Watch ${video.title} on ScanVidz`,
                    text: 'Check out this video on ScanVidz - No Ads!',
                    url: shareUrl,
                }).catch(console.error);
            } else {
                alert(`🔗 Link Copied!\n\n${shareUrl}`);
            }
        });
    };

    // Custom Like Logic (Mock + Potential Backend)
    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    };

    // Custom Subscribe Logic
    const handleSubscribe = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSubscribed(!isSubscribed);
        if(!isSubscribed) {
            // Show a nice toast or alert
            // In future: connect to backend /subscribe endpoint
        }
    };

    const handleComment = (e: React.MouseEvent) => {
        e.stopPropagation();
        alert("Comments are disabled for guest users. Please Login.");
    };

    // YouTube Player Options (STRICT RESTRICTIONS)
    const opts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,      // We handle autoplay manually via useEffect
            controls: 0,      // No Player Controls
            disablekb: 1,     // No Keyboard Shortcuts
            fs: 0,            // No Fullscreen Button
            modestbranding: 1,// Minimal YouTube Branding
            rel: 0,           // No Related Videos at end
            showinfo: 0,      // No Title Info
            iv_load_policy: 3,// No Annotations/Cards
            loop: 1,          // Loop Video
            playlist: videoId,// Required for looping single video
            playsinline: 1,   // Important for iOS Inline Playback
            origin: typeof window !== 'undefined' ? window.location.origin : 'https://scanvidz.vercel.app',
        },
    };

    return (
        <div 
            data-id={videoId}
            className="short-container w-full h-full snap-start snap-always relative flex items-center justify-center bg-[#121212] border-b border-gray-900 overflow-hidden"
        >
            {/* 🔥 VIDEO LAYER (Scaled Up & Locked) 
               - scale-[1.35]: Zooms in to hide YouTube watermarks/icons at edges
               - pointer-events-none: BLOCKS ALL INTERACTION with iframe
            */}
            <div className="absolute inset-0 z-0 pointer-events-none transform scale-[1.35] md:scale-100 origin-center flex items-center justify-center">
                 <YouTube 
                    videoId={videoId} 
                    opts={opts}
                    onReady={(e: any) => {
                        setPlayer(e.target);
                        // Only play if this specific video is active right now
                        // This prevents multiple videos from starting if loading is slow
                        if(isActive) {
                            e.target.playVideo();
                        } else {
                            e.target.pauseVideo();
                        }
                    }}
                    className="w-full h-full"
                    iframeClassName="w-full h-full object-cover"
                 />
            </div>

            {/* 🔥 INVISIBLE SHIELD LAYER 
               - This layer sits on top of the video.
               - Captures all clicks so YouTube doesn't get them.
               - Controls Play/Pause toggle.
            */}
            <div 
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={togglePlay}
                // Double tap could be implemented here for like
            >
                {/* Play/Pause Animation Overlay */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center animate-pulse border border-white/30 shadow-2xl">
                            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                )}
            </div>

            {/* 🔥 UI OVERLAY LAYER (Info & Actions)
               - pointer-events-none on container to let clicks pass through to Shield
               - pointer-events-auto on buttons to allow interaction
            */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 pb-24 md:pb-8 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none">
                
                <div className="flex items-end justify-between pointer-events-auto w-full max-w-4xl mx-auto">
                    
                    {/* --- LEFT SIDE: VIDEO INFO --- */}
                    <div className="flex-1 pr-8 pb-2">
                        {/* Channel Info */}
                        <div className="flex items-center gap-3 mb-4">
                            <div 
                                className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 p-[2px] cursor-pointer shadow-lg hover:scale-105 transition"
                                onClick={() => router.push(`/search?q=${video.channel_name || 'Creator'}`)}
                            >
                                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                                     {/* Fallback Avatar logic */}
                                     <span className="font-bold text-white text-xl">
                                        {video.channel_name ? video.channel_name.charAt(0).toUpperCase() : 'S'}
                                     </span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <span 
                                    className="font-bold text-white shadow-black drop-shadow-md text-sm truncate max-w-[150px] cursor-pointer hover:underline"
                                    onClick={() => router.push(`/search?q=${video.channel_name || 'Creator'}`)}
                                >
                                    {video.channel_name || 'ScanVidz Creator'}
                                </span>
                                <button 
                                    onClick={handleSubscribe}
                                    className={`mt-1 text-[10px] font-bold px-3 py-1 rounded-full uppercase transition-all shadow-lg w-fit ${isSubscribed ? 'bg-gray-700 text-gray-300 border border-gray-600' : 'bg-[#cc0000] text-white hover:bg-red-600'}`}
                                >
                                    {isSubscribed ? 'Subscribed' : 'Subscribe'}
                                </button>
                            </div>
                        </div>
                        
                        {/* Title & Tags */}
                        <div className="mb-2">
                            <p className="text-white text-sm md:text-base line-clamp-2 leading-snug drop-shadow-md font-medium">
                                {video.title}
                            </p>
                            <p className="text-gray-400 text-xs font-bold mt-1">#shorts #trending #viral</p>
                        </div>
                        
                        {/* Audio Track Info */}
                        <div className="flex items-center gap-2 text-xs text-white font-medium bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 animate-pulse-slow">
                            <span className="animate-spin-slow">🎵</span> 
                            <span className="truncate max-w-[200px]">Original Audio • {video.channel_name || 'ScanVidz'}</span>
                        </div>
                    </div>

                    {/* --- RIGHT SIDE: ACTION BUTTONS --- */}
                    <div className="flex flex-col items-center gap-6 pb-2 min-w-[60px]">
                        
                        {/* Like Button */}
                        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleLike}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 border border-white/10 ${isLiked ? 'bg-red-500/20 text-red-500' : 'bg-black/40 text-white hover:bg-black/60'}`}>
                                <svg className={`w-6 h-6 ${isLiked ? 'fill-current' : 'fill-white'}`} viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            </div>
                            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{likeCount}</span>
                        </div>

                        {/* Comment Button */}
                        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleComment}>
                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 hover:bg-black/60 border border-white/10">
                                <span className="text-xl">💬</span>
                            </div>
                            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Comment</span>
                        </div>

                        {/* Share Button (Custom) */}
                        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={handleShare}>
                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 hover:bg-black/60 border border-white/10">
                                <span className="text-xl transform -rotate-12">🚀</span>
                            </div>
                            <span className="text-xs font-bold text-white shadow-black drop-shadow-md">Share</span>
                        </div>

                        {/* More / Report Button */}
                         <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={(e) => { e.stopPropagation(); alert("Reported! Thanks for helping keep ScanVidz safe.") }}>
                            <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 hover:bg-black/60 border border-white/10">
                                <span className="text-xl">⋮</span>
                            </div>
                        </div>

                        {/* Mute Toggle (Floating) */}
                        <div onClick={toggleMute} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md mt-2 active:scale-90 border border-white/20 hover:bg-white/20 transition">
                             {isMuted ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                             ) : (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                             )}
                        </div>

                        {/* Rotating Album Art */}
                        <div className="w-10 h-10 rounded-full border-4 border-gray-900 overflow-hidden animate-spin-slow bg-black mt-2 shadow-lg">
                             <img 
                                src={video.thumbnail} 
                                className="w-full h-full object-cover opacity-70"
                                alt="Album Art"
                             />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}