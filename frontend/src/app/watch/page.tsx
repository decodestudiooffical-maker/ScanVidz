'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import YouTube from 'react-youtube'; 
import UserMenu from '@/components/UserMenu'; 

// =========================================================
// 🔥 GLOBAL CONFIGURATION
// =========================================================

const API_BASE_URL = "https://scanvidz-backend.onrender.com";

// =========================================================
// 🛠️ HELPER FUNCTIONS
// =========================================================

// 1. Format Seconds to MM:SS or HH:MM:SS
const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, "0");
    
    if (hh) {
        return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
    }
    return `${mm}:${ss}`;
};

// 2. Map YouTube Quality Tags to Readable Text
const getQualityLabel = (q: string) => {
    switch(q) {
        case 'highres': return '4K+ (Original)';
        case 'hd2160': return '4K (2160p)';
        case 'hd1440': return '2K (1440p)';
        case 'hd1080': return '1080p HD';
        case 'hd720': return '720p HD';
        case 'large': return '480p';
        case 'medium': return '360p';
        case 'small': return '240p';
        case 'tiny': return '144p (Low)';
        case 'auto': return 'Auto';
        default: return q;
    }
};

// =========================================================
// 🎬 MAIN WATCH COMPONENT
// =========================================================

function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // -------------------------------------------------------
  // 1. DATA EXTRACTION FROM URL
  // -------------------------------------------------------
  const videoId = (searchParams.get('v') || '').split('v=')[1] || searchParams.get('v');
  const title = searchParams.get('title') || 'Video Player';
  const thumbnail = searchParams.get('thumbnail') || '';
  const durationParam = searchParams.get('duration') || '';
  
  // Channel Handling
  const rawChannel = searchParams.get('channel');
  const channelName = rawChannel && rawChannel !== 'undefined' ? rawChannel : 'ScanVidz Creator';
  const channelAvatar = searchParams.get('avatar') || `https://ui-avatars.com/api/?background=random&name=${channelName}`;

  // -------------------------------------------------------
  // 2. STATE MANAGEMENT
  // -------------------------------------------------------
  
  // --- Core Player Instance ---
  const [player, setPlayer] = useState<any>(null);

  // --- Custom Player UI States ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // --- Real Quality Management (Pre-populated) ---
  // 🔥 FIX: Added full list so menu is never empty
  const [availableQualities, setAvailableQualities] = useState<string[]>([
      'highres', 'hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'auto'
  ]);
  const [currentQuality, setCurrentQuality] = useState('auto');
  
  // --- Data & Recommendation States ---
  const [playerState, setPlayerState] = useState<number>(-1); 
  const [related, setRelated] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(5);
  
  // 🔥 FIX: Autoplay Toggle State
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);

  // --- Download & Payment Logic (Backend Ready) ---
  const [showDownload, setShowDownload] = useState(false);
  const [formats, setFormats] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPremiumFormat, setSelectedPremiumFormat] = useState<any>(null);

  // --- Engagement (Likes, Subs, Views) ---
  const [likes, setLikes] = useState<number>(0); 
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false); 
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState("0"); 
  const [views, setViews] = useState<string | number>(searchParams.get('views') || '0'); 
  const [viewCounted, setViewCounted] = useState(false);

  // --- Comments & User ---
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- References ---
  const playerRef = useRef<any>(null); 
  const containerRef = useRef<HTMLDivElement>(null); 
  const controlsTimeoutRef = useRef<any>(null);

  // -------------------------------------------------------
  // 3. CUSTOM PLAYER LOGIC (The Brain)
  // -------------------------------------------------------

  // A. Handle Mouse Move (Auto-Hide Controls)
  const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
      }
      // Hide after 3 seconds of inactivity
      controlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying) {
              setShowControls(false);
          }
      }, 3000);
  };

  // B. Progress Bar Loop (Updates every 500ms)
  useEffect(() => {
      let interval: any;
      if (player && isPlaying) {
          interval = setInterval(() => {
              setCurrentTime(player.getCurrentTime());
          }, 500);
      }
      return () => clearInterval(interval);
  }, [player, isPlaying]);

  // C. Toggle Play/Pause
  const togglePlay = () => {
      if (!player) return;
      if (isPlaying) {
          player.pauseVideo();
      } else {
          player.playVideo();
      }
      setIsPlaying(!isPlaying);
  };

  // D. Seek Handling
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      player.seekTo(time);
  };

  // E. Volume Control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseInt(e.target.value);
      setVolume(vol);
      player.setVolume(vol);
      setIsMuted(vol === 0);
  };

  const toggleMute = () => {
      if (isMuted) {
          player.unMute();
          player.setVolume(volume);
          setIsMuted(false);
      } else {
          player.mute();
          setIsMuted(true);
      }
  };

  // F. Fullscreen Toggle
  const toggleFullscreen = () => {
      if (containerRef.current) {
          if (!document.fullscreenElement) {
              containerRef.current.requestFullscreen();
              setIsFullscreenMode(true);
          } else {
              document.exitFullscreen();
              setIsFullscreenMode(false);
          }
      }
  };

  // G. Settings: Speed
  const changeSpeed = (rate: number) => {
      if (player) {
          player.setPlaybackRate(rate);
          setPlaybackSpeed(rate);
          setShowSettings(false);
      }
  };

  // 🔥 H. Settings: Quality (FORCE RELOAD LOGIC - Laptop Fix)
  const changeQuality = (qual: string) => {
      if (player) {
          const currentTime = player.getCurrentTime();
          
          setCurrentQuality(qual);
          
          // 🔥 HARD FORCE: Reload video at current time with explicit quality
          if (qual !== 'auto') {
              player.loadVideoById({
                  videoId: videoId,
                  startSeconds: currentTime,
                  suggestedQuality: qual
              });
          } else {
              player.setPlaybackQuality('auto');
          }

          setShowSettings(false);
          
          // Feedback Toast
          setToastMsg(`Quality: ${getQualityLabel(qual)}`);
          setTimeout(() => setToastMsg(null), 2000);
      }
  };

  // I. Double Tap Feature (10s Skip)
  const handleDoubleTap = (e: React.MouseEvent) => {
      if (!player) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      if (x < width / 3) {
          // Left Side -> Rewind 10s
          const newTime = Math.max(0, player.getCurrentTime() - 10);
          player.seekTo(newTime);
          setCurrentTime(newTime);
          setToastMsg("⏪ 10s");
      } else if (x > (width * 2) / 3) {
          // Right Side -> Skip 10s
          const newTime = Math.min(duration, player.getCurrentTime() + 10);
          player.seekTo(newTime);
          setCurrentTime(newTime);
          setToastMsg("⏩ 10s");
      } else {
          // Center -> Toggle Play
          togglePlay();
      }
      
      // Clear Toast
      setTimeout(() => setToastMsg(null), 1000);
  };

  // -------------------------------------------------------
  // 4. YOUTUBE API INTEGRATION
  // -------------------------------------------------------

  // Custom Options to HIDE everything
  const opts = {
      height: '100%',
      width: '100%',
      playerVars: {
          autoplay: 1,
          controls: 0, // 🔴 Hides Default Controls
          disablekb: 1, // 🔴 Disables Default Keyboard
          fs: 0, // 🔴 Hides Fullscreen Button
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1
      },
  };

  const onPlayerReady = (event: any) => {
      setPlayer(event.target);
      playerRef.current = event.target;
      setDuration(event.target.getDuration());
      event.target.playVideo();
      setIsPlaying(true);
      
      // 🔥 FETCH REAL QUALITIES (Merge with presets to avoid duplicates)
      const levels = event.target.getAvailableQualityLevels();
      if(levels && levels.length > 0) {
          const uniqueLevels = Array.from(new Set([...levels, ...availableQualities]));
          setAvailableQualities(uniqueLevels);
      }

      // Fix Browser Autoplay Policy
      setTimeout(() => { 
          event.target.unMute(); 
          setVolume(event.target.getVolume());
      }, 1000);
  };

  const onPlayerStateChange = (event: any) => {
      setPlayerState(event.data);
      if (event.data === 1) setIsPlaying(true);
      if (event.data === 2) setIsPlaying(false);
      
      // View Count Logic (Triggered on End)
      if (event.data === 0 && !viewCounted) { 
         setIsPlaying(false);
         fetch(`${API_BASE_URL}/increment_view`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ video_id: videoId })
         })
         .then(res => res.json())
         .then(data => {
             if(data.status === 'success') {
                 setViews(data.total_views);
                 setViewCounted(true);
             }
         })
         .catch(err => console.log("View Error:", err));
      }
  };

  // -------------------------------------------------------
  // 5. EFFECTS & DATA LOADING
  // -------------------------------------------------------

  // Load User from LocalStorage
  useEffect(() => {
      const storedUser = localStorage.getItem('scanvidz_user');
      if (storedUser) {
          try { setUser(JSON.parse(storedUser)); } catch(e) {}
      }
  }, []);

  // Keyboard Shortcuts (Spacebar)
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
          
          if (e.code === 'Space') {
              e.preventDefault();
              togglePlay();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, player]); 

  // Fetch Video Metadata & Formats
  useEffect(() => {
      if (videoId) {
          setViewCounted(false);

          // Get Formats (for background logic)
          fetch(`${API_BASE_URL}/formats?v=${videoId}`)
            .then(res => res.json())
            .then(data => { if(data.status === 'success') setFormats(data.formats); })
            .finally(() => setLoadingFormats(false));

          // Get Metadata (Likes/Views)
          const userIdParam = user ? `&user_id=${user.id}` : '';
          fetch(`${API_BASE_URL}/meta?v=${videoId}${userIdParam}`)
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    setLikes(data.meta.likes || 0); 
                    setIsLiked(data.meta.is_liked); 
                    setSubCount(data.meta.subs || "0");
                    setViews(data.meta.views || "0");
                }
            });

          // Get Comments
          fetch(`${API_BASE_URL}/comments?v=${videoId}`)
            .then(res => res.json())
            .then(data => { if (data.status === 'success') setComments(data.comments); });
      }
  }, [videoId, user]);

  // Recommendation Engine
  useEffect(() => {
      if (title) {
        const mainTag = title.split(' ').slice(0, 4).join(' ');
        fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(mainTag)}&limit=15`)
            .then(res => res.json())
            .then(data => setRelated(data.results || []))
            .catch(() => {});
      }
  }, [title]);

  // 🔥 FIX: Autoplay Countdown Logic (Checks Toggle State)
  useEffect(() => {
      let timer: any;
      if (playerState === 0 && related.length > 0 && isAutoplayEnabled) {
          timer = setInterval(() => {
              setCountdown((prev) => {
                  if (prev <= 1) {
                      clearInterval(timer);
                      playRelated(related[0]); 
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          setCountdown(5);
      }
      return () => clearInterval(timer);
  }, [playerState, related, isAutoplayEnabled]); // Added isAutoplayEnabled dependency

  // -------------------------------------------------------
  // 6. ACTION HANDLERS
  // -------------------------------------------------------

  const handlePaymentSuccess = async () => {
      if (!selectedPremiumFormat || !user) return;
      setToastMsg("Processing Payment... 💸");
      
      try {
          const res = await fetch(`${API_BASE_URL}/buy_video`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  user_id: user.id,
                  video_id: videoId,
                  quality: selectedPremiumFormat.quality,
                  amount: selectedPremiumFormat.price
              })
          });
          const data = await res.json();
          
          if (data.status === 'success') {
              setShowPayment(false);
              alert("Payment Successful! ✅ Download starting...");
              triggerDownload(selectedPremiumFormat);
          } else {
              alert("Payment Failed: " + data.message);
          }
      } catch (err) { alert("Network Error"); }
  };

  // Internal Download Logic (Hidden from UI but present)
  const triggerDownload = (format: any) => {
      setToastMsg("Generating Download Link... 🚀");
      const isMerge = format.needs_merge ? "true" : "false";
      const userIdParam = user ? `&user_id=${user.id}` : '';
      const downloadUrl = `${API_BASE_URL}/download?v=${videoId}&format_id=${format.format_id}&merge=${isMerge}${userIdParam}`;
      
      setTimeout(() => {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', `ScanVidz_${videoId}.mp4`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setToastMsg("Download Started! 📂");
          setTimeout(() => setToastMsg(null), 4000);
      }, 500); 
  };

  // Download Handler (kept for future reference)
  const initiateDownload = (format: any) => {
      if (format.price > 0) {
          if (!user) { alert("Please Login to purchase Premium downloads!"); return; }
          setSelectedPremiumFormat(format);
          setShowPayment(true);
          setShowDownload(false);
      } else {
          triggerDownload(format);
      }
  };

  const handleSubscribe = () => {
      const newStatus = !isSubscribed;
      setIsSubscribed(newStatus);
      if(newStatus) {
          setToastMsg("Subscribed Successfully! 🎉");
          const num = parseInt(subCount.replace(/,/g, '')); 
          if(!isNaN(num)) setSubCount((num + 1).toString());
      } else {
          const num = parseInt(subCount.replace(/,/g, ''));
          if(!isNaN(num) && num > 0) setSubCount((num - 1).toString());
      }
      setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLike = async () => {
      if (!user) { alert("Please Login to Like!"); return; }
      const newStatus = !isLiked;
      setIsLiked(newStatus);
      setLikes(prev => newStatus ? prev + 1 : prev - 1);
      try {
          await fetch(`${API_BASE_URL}/toggle_like`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, video_id: videoId })
          });
      } catch (err) {}
  };

  const handleDislike = () => {
      if (isDisliked) setIsDisliked(false);
      else {
          setIsDisliked(true);
          if (isLiked) {
              setLikes(prev => prev - 1);
              setIsLiked(false);
              if(user) {
                  fetch(`${API_BASE_URL}/toggle_like`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_id: user.id, video_id: videoId })
                  });
              }
          }
      }
  };

  const handleComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      if (!user) { alert("Please Login to comment!"); return; }
      const commentData = {
          video_id: videoId,
          user_name: user.name,
          user_avatar: `https://ui-avatars.com/api/?name=${user.name}&background=random`,
          text: newComment
      };
      setComments([commentData, ...comments]);
      setNewComment("");
      try {
          await fetch(`${API_BASE_URL}/comments`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(commentData)
          });
      } catch (err) {}
  };

  const playRelated = (video: any) => {
      setIsPlaying(false);
      setPlayerState(-1);
      router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name || '')}&avatar=${encodeURIComponent(video.channel_avatar || '')}`);
      window.scrollTo(0,0);
  };

  const handleHeaderSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // -------------------------------------------------------
  // 7. MAIN RENDER
  // -------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
       
       {/* HEADER */}
       <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2 md:gap-4">
             <h1 onClick={() => router.push('/')} className="text-xl md:text-2xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">ScanVidz</h1>
          </div>
          <form onSubmit={handleHeaderSearch} className="flex flex-1 max-w-xl mx-auto items-center bg-[#121212] border border-gray-700 rounded-full px-3 py-1.5 ml-2 md:ml-4">
             <input type="text" placeholder="Search..." className="bg-transparent flex-1 outline-none text-white placeholder-gray-500 text-sm md:text-base w-full" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             <button type="submit" className="text-gray-400 hover:text-white px-2">🔍</button>
          </form>
          <UserMenu />
       </header>

       <div className="flex flex-col lg:flex-row max-w-[1800px] mx-auto w-full">
           
           {/* LEFT COLUMN: PLAYER & INFO */}
           <div className="flex-1 p-4 lg:p-6 lg:pr-0 overflow-y-auto">
              
              {/* 🔥 CUSTOM PLAYER CONTAINER */}
              <div 
                 ref={containerRef} 
                 className={`relative w-full aspect-video bg-black group rounded-xl overflow-hidden shadow-2xl ${isFullscreenMode ? 'fixed inset-0 z-[100] rounded-none h-screen w-screen' : ''}`}
                 onMouseMove={handleMouseMove}
                 onMouseLeave={() => isPlaying && setShowControls(false)}
              >
                 {/* A. YouTube Iframe (Hidden Controls) */}
                 <YouTube 
                    videoId={videoId} 
                    opts={opts} 
                    onReady={onPlayerReady} 
                    onStateChange={onPlayerStateChange}
                    className="w-full h-full pointer-events-none" // 🔴 No direct interaction
                    iframeClassName="w-full h-full"
                 />

                 {/* B. INVISIBLE SHIELD (Handles Clicks) */}
                 <div 
                    className="absolute inset-0 z-10 cursor-pointer" 
                    onClick={togglePlay} 
                    onDoubleClick={handleDoubleTap}
                 ></div>

                 {/* C. CENTER PLAY BUTTON */}
                 {!isPlaying && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 animate-pulse">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                 )}

                 {/* D. CUSTOM CONTROLS OVERLAY */}
                 <div className={`absolute bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    
                    {/* Progress Bar (Red Line) */}
                    <div className="group/seek relative w-full h-1 bg-gray-600 rounded-full cursor-pointer mb-4 hover:h-1.5 transition-all">
                        <div className="absolute h-full bg-red-600 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                        <input 
                            type="range" 
                            min={0} max={duration} step={0.1} 
                            value={currentTime} 
                            onChange={handleSeek} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40" 
                        />
                    </div>

                    {/* Bottom Controls Row */}
                    <div className="flex items-center justify-between">
                        
                        {/* Left Side: Play, Volume, Time */}
                        <div className="flex items-center gap-4">
                            <button onClick={togglePlay} className="text-white hover:text-blue-400">
                                {isPlaying ? (
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                )}
                            </button>
                            
                            <div className="flex items-center gap-2 group/vol">
                                <button onClick={toggleMute} className="text-white">
                                    {isMuted || volume === 0 ? (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                    )}
                                </button>
                                <input type="range" min={0} max={100} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover/vol:w-20 transition-all h-1 bg-white rounded-full accent-blue-500 cursor-pointer" />
                            </div>

                            <span className="text-xs font-mono text-gray-300">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        {/* Right Side: Settings, Fullscreen */}
                        <div className="flex items-center gap-4 relative">
                            {/* Settings Icon */}
                            <button onClick={() => setShowSettings(!showSettings)} className={`text-white transition transform ${showSettings ? 'rotate-90' : ''}`}>
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </button>
                            
                            {/* Settings Menu Popup (With PRESET Qualities) */}
                            {showSettings && (
                                <div className="absolute bottom-10 right-0 bg-[#1f1f1f]/95 border border-gray-700 rounded-xl p-3 w-56 shadow-2xl z-50 backdrop-blur-md max-h-80 overflow-y-auto custom-scrollbar">
                                    <div className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">Speed</div>
                                    <div className="flex gap-1 mb-3">
                                        {[0.5, 1, 1.5, 2].map(s => (
                                            <button key={s} onClick={() => changeSpeed(s)} className={`flex-1 text-xs py-1.5 rounded-lg border border-gray-600 transition ${playbackSpeed === s ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-gray-700'}`}>{s}x</button>
                                        ))}
                                    </div>
                                    <div className="border-t border-gray-700 my-2"></div>
                                    <div className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">Quality</div>
                                    <div className="flex flex-col gap-1">
                                        {availableQualities.map((qual, i) => (
                                            <button key={i} onClick={() => changeQuality(qual)} className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex justify-between items-center ${currentQuality === qual ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'hover:bg-gray-700 text-gray-200'}`}>
                                                <span>{getQualityLabel(qual)}</span>
                                                {currentQuality === qual && <span>✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 🔥 FIXED: Fullscreen Button (Standard Icon) */}
                            <button onClick={toggleFullscreen} className="text-white hover:scale-110 transition">
                                {isFullscreenMode ? (
                                    // Minimize Icon (Arrows pointing IN)
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> 
                                ) : (
                                    // Maximize Icon (Standard Box Corners)
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                )}
                            </button>
                        </div>
                    </div>
                 </div>

                 {/* Up Next Overlay (Shows when video ends) */}
                 {playerState === 0 && related.length > 0 && isAutoplayEnabled && (
                     <div className="absolute inset-0 bg-black/95 z-40 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                         <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-4">Up Next in {countdown}s</h3>
                         <div className="group relative cursor-pointer" onClick={() => playRelated(related[0])}>
                             <img src={related[0].thumbnail} className="w-64 aspect-video object-cover rounded-xl border-2 border-transparent group-hover:border-blue-500 transition shadow-2xl"/>
                             <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg"><svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
                         </div>
                         <h2 className="text-xl font-bold mt-4 max-w-md line-clamp-1">{related[0].title}</h2>
                         <button onClick={() => { setIsPlaying(false); setPlayerState(-1); }} className="mt-6 text-gray-500 hover:text-white underline">Cancel Autoplay</button>
                     </div>
                 )}
              </div>

              {/* VIDEO INFO SECTION */}
              <div className="mt-4">
                 <div className="flex justify-between items-start gap-4">
                     <h1 className="text-xl md:text-2xl font-bold line-clamp-2 leading-snug flex-1">{title}</h1>
                 </div>
                 
                 <div className="flex flex-wrap items-center justify-between mt-4 pb-4 border-b border-gray-800 gap-4">
                    <div className="flex items-center gap-3">
                       <img src={channelAvatar} className="w-10 h-10 rounded-full bg-gray-700 object-cover" onError={(e:any) => e.target.src=`https://ui-avatars.com/api/?background=random&name=${channelName}`} />
                       <div>
                           <h3 className="font-bold text-sm text-gray-100">{channelName}</h3>
                           <p className="text-xs text-gray-400">{subCount} subscribers</p>
                       </div>
                       <button onClick={handleSubscribe} className={`px-5 py-2 rounded-full text-sm font-bold ml-4 transition ${isSubscribed ? 'bg-[#272727] text-gray-300' : 'bg-white text-black hover:bg-gray-200'}`}>{isSubscribed ? 'Subscribed 🔔' : 'Subscribe'}</button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <div className="bg-[#272727] flex items-center rounded-full overflow-hidden border border-gray-700">
                          <button onClick={handleLike} className={`px-4 py-2 flex items-center gap-2 text-sm font-medium border-r border-gray-600 transition ${isLiked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}>👍 {likes}</button>
                          <button onClick={handleDislike} className={`px-4 py-2 text-sm font-medium transition ${isDisliked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}>👎</button>
                       </div>
                       {/* 🔥 REMOVED DOWNLOAD BUTTON AS REQUESTED */}
                    </div>
                 </div>
                 
                 <div className="mt-4 bg-[#272727]/50 border border-gray-800 p-3 rounded-xl text-sm text-gray-300 hover:bg-[#272727] transition cursor-pointer">
                    <p className="font-bold text-white mb-1">{views} views • Just now</p>
                    <p>Watching on ScanVidz Pro. No Ads. No Tracking. Experience premium quality.</p>
                 </div>
                 
                 {/* COMMENTS SECTION */}
                 <div className="mt-8 mb-10">
                    <h3 className="text-xl font-bold mb-4">{comments.length} Comments</h3>
                    <form onSubmit={handleComment} className="flex gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold flex-shrink-0 text-white">{user ? user.name.charAt(0).toUpperCase() : "U"}</div>
                        <div className="flex-1">
                            <input type="text" className="w-full bg-transparent border-b border-gray-700 focus:border-white outline-none py-2 text-sm text-white placeholder-gray-500 transition" placeholder={user ? "Add a comment..." : "Please login to comment"} value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={!user} />
                            <div className="flex justify-end mt-2">
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50 transition" disabled={!newComment.trim() || !user}>Comment</button>
                            </div>
                        </div>
                    </form>
                    <div className="space-y-6">
                        {comments.length > 0 ? comments.map((c, i) => (
                            <div key={i} className="flex gap-4">
                                <img src={c.user_avatar || `https://ui-avatars.com/api/?name=${c.user_name}&background=random`} className="w-10 h-10 rounded-full" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{c.user_name}</span>
                                        <span className="text-xs text-gray-500">{c.timestamp || "Just now"}</span>
                                    </div>
                                    <p className="text-sm mt-1 text-gray-200">{c.text}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center text-gray-500 text-sm py-6">No comments yet. Be the first to share your thoughts! 🚀</div>
                        )}
                    </div>
                 </div>
              </div>
           </div>

           {/* RIGHT SIDE: RELATED VIDEOS */}
           <div className="w-full lg:w-[420px] p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Up Next</h3>
                  
                  {/* 🔥 FIXED: AUTOPLAY TOGGLE */}
                  <div 
                    onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)} 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                      <span className="text-xs text-gray-400 uppercase font-bold">Autoplay</span>
                      <div className={`w-8 h-4 rounded-full flex items-center transition-colors ${isAutoplayEnabled ? 'bg-blue-600 justify-end' : 'bg-gray-600 justify-start'}`}>
                          <div className="w-3 h-3 bg-white rounded-full mx-0.5 shadow-sm"></div>
                      </div>
                  </div>
              </div>
              
              <div className="flex flex-col gap-3">
                  {related.map((vid, idx) => (
                      <div key={idx} onClick={() => playRelated(vid)} className="flex gap-2 cursor-pointer group hover:bg-[#1f1f1f] p-1 rounded-lg transition">
                          <div className="relative w-[168px] h-[94px] bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-800 group-hover:border-gray-600">
                              <img src={vid.thumbnail} className="w-full h-full object-cover" onError={(e:any) => e.target.src='https://via.placeholder.com/168x94'}/>
                              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded font-medium">{vid.duration}</span>
                          </div>
                          <div className="flex flex-col flex-1 py-1">
                              <h4 className="text-sm font-semibold line-clamp-2 leading-tight text-gray-100 group-hover:text-blue-400 transition">{vid.title}</h4>
                              <div className="mt-auto">
                                  <p className="text-xs text-gray-400 hover:text-white transition">{vid.channel_name || 'ScanVidz'}</p>
                                  <p className="text-xs text-gray-500">{vid.views} views</p>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
           </div>
       </div>

       {/* PAYMENT MODAL (Hidden by default, used for future features) */}
       {showPayment && selectedPremiumFormat && (
           <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
               <div className="bg-[#181818] border border-yellow-600/50 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_rgba(234,179,8,0.2)] text-center relative">
                   <button onClick={() => setShowPayment(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
                   <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-3xl">💎</span></div>
                   <h2 className="text-2xl font-bold text-white mb-2">Premium Download</h2>
                   <p className="text-gray-400 text-sm mb-6">Unlock <span className="text-yellow-400 font-bold">{selectedPremiumFormat.quality.split(' ')[0]}</span> Ultra HD quality.</p>
                   <div className="bg-black/40 p-4 rounded-xl border border-gray-800 mb-6">
                       <div className="flex justify-between items-center mb-2"><span className="text-gray-400">Video Quality</span><span className="font-bold">{selectedPremiumFormat.quality.split(' ')[0]}</span></div>
                       <div className="flex justify-between items-center text-xl font-bold text-green-400 border-t border-gray-700 pt-2 mt-2"><span>Total Amount</span><span>₹{selectedPremiumFormat.price}</span></div>
                   </div>
                   <button onClick={handlePaymentSuccess} className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3.5 rounded-xl text-lg shadow-lg transform hover:scale-[1.02] transition-all">Pay ₹{selectedPremiumFormat.price} & Download</button>
               </div>
           </div>
       )}

       {/* TOAST MESSAGE (For Feedback) */}
       {toastMsg && (
         <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[150] flex items-center gap-3 animate-bounce">
            <span className="text-xl">ℹ</span>
            <span className="font-bold text-sm md:text-base whitespace-nowrap">{toastMsg}</span>
         </div>
       )}

    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Player...</div>}>
      <WatchContent />
    </Suspense>
  );
}