'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import YouTube, { YouTubeProps } from 'react-youtube'; 
import UserMenu from '@/components/UserMenu'; 

// =========================================================
// 🔥 GLOBAL CONFIGURATION & API CONSTANTS
// =========================================================

const API_BASE_URL = "https://scanvidz-backend.onrender.com";
const FALLBACK_VIDEO_ID = "QdBZY2fkU-0"; // Safe Backup

// =========================================================
// 🛠️ TYPES & INTERFACES (For TypeScript Safety)
// =========================================================

interface VideoMeta {
  likes: number;
  views: string | number;
  subs: string;
  is_liked: boolean;
}

interface CommentData {
  user_name: string;
  user_avatar: string;
  text: string;
  timestamp: string;
}

interface RelatedVideo {
  id?: string;
  link?: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  channel_name?: string;
  channel_avatar?: string;
}

interface UserData {
  id: string;
  name: string;
  email_or_phone: string;
}

// =========================================================
// 🛠️ HELPER FUNCTIONS
// =========================================================

const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "00:00";
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, "0");
    if (hh) return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
    return `${mm}:${ss}`;
};

// =========================================================
// 🎬 MAIN WATCH COMPONENT
// =========================================================

function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. DATA EXTRACTION
  const rawV = searchParams.get('v');
  const title = searchParams.get('title') || 'Video Player';
  const rawChannel = searchParams.get('channel');
  const channelName = rawChannel && rawChannel !== 'undefined' ? rawChannel : 'ScanVidz Creator';
  const channelAvatar = searchParams.get('avatar') || `https://ui-avatars.com/api/?background=random&name=${channelName}`;

  // 2. STATE MANAGEMENT
  const [videoId, setVideoId] = useState<string>(""); 
  const [player, setPlayer] = useState<any>(null);

  // UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false); 
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Data States
  const [meta, setMeta] = useState<VideoMeta>({ likes: 0, views: "0", subs: "0", is_liked: false });
  const [comments, setComments] = useState<CommentData[]>([]);
  const [related, setRelated] = useState<RelatedVideo[]>([]);
  const [playerState, setPlayerState] = useState<number>(-1); 
  
  // Feature States
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(true);
  const [isVideoError, setIsVideoError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // User & Interaction
  const [user, setUser] = useState<UserData | null>(null);
  const [newComment, setNewComment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

  // Refs
  const playerRef = useRef<any>(null); 
  const containerRef = useRef<HTMLDivElement>(null); 
  const controlsTimeoutRef = useRef<any>(null);

  // 3. ID PARSING LOGIC
  useEffect(() => {
      let extractedId = "";
      if (rawV && rawV !== 'undefined' && rawV !== 'null') {
          if (rawV.includes('v=')) {
              extractedId = rawV.split('v=')[1].split('&')[0];
          } else if (rawV.includes('youtu.be/')) {
              extractedId = rawV.split('youtu.be/')[1].split('?')[0];
          } else {
              extractedId = rawV;
          }
          setVideoId(extractedId);
          setIsVideoError(false);
      } else {
          setVideoId("");
          setIsVideoError(true);
          setErrorMessage("Video Link Broken or Missing ID.");
      }
  }, [rawV]);

  // 4. CUSTOM PLAYER LOGIC
  const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying) setShowControls(false);
      }, 3000);
  };

  useEffect(() => {
      let interval: any;
      if (player && isPlaying) {
          interval = setInterval(() => {
              if(player.getCurrentTime) setCurrentTime(player.getCurrentTime());
          }, 500);
      }
      return () => clearInterval(interval);
  }, [player, isPlaying]);

  const togglePlay = () => {
      if (!player) return;
      isPlaying ? player.pauseVideo() : player.playVideo();
      setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value);
      setCurrentTime(time);
      player.seekTo(time);
  };

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

  const changeSpeed = (rate: number) => {
      if (player) {
          player.setPlaybackRate(rate);
          setPlaybackSpeed(rate);
          setShowSettings(false);
      }
  };

  const enforceHighQuality = (targetPlayer: any) => {
      if (!targetPlayer || !targetPlayer.getAvailableQualityLevels) return;
      const levels = targetPlayer.getAvailableQualityLevels();
      if (levels && levels.length > 0) {
          let bestQuality = levels.find((q: string) => q === 'highres' || q === 'hd2160' || q === 'hd1440' || q === 'hd1080');
          if (!bestQuality) bestQuality = levels[0];
          const currentQ = targetPlayer.getPlaybackQuality();
          if (currentQ !== bestQuality) targetPlayer.setPlaybackQuality(bestQuality);
      }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
      if (!player) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      if (x < width / 3) {
          const newTime = Math.max(0, player.getCurrentTime() - 10);
          player.seekTo(newTime);
          setCurrentTime(newTime);
          setToastMsg("⏪ 10s");
      } else if (x > (width * 2) / 3) {
          const newTime = Math.min(duration, player.getCurrentTime() + 10);
          player.seekTo(newTime);
          setCurrentTime(newTime);
          setToastMsg("⏩ 10s");
      } else {
          togglePlay();
      }
      setTimeout(() => setToastMsg(null), 1000);
  };

  // 5. YOUTUBE API INTEGRATION
  const opts: YouTubeProps['opts'] = {
      height: '1080',
      width: '1920',
      playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : 'https://scanvidz.vercel.app',
      },
  };

  const onPlayerReady = (event: any) => {
      setPlayer(event.target);
      playerRef.current = event.target;
      setDuration(event.target.getDuration());
      event.target.playVideo();
      setIsPlaying(true);
      enforceHighQuality(event.target);
  };

  const onPlayerStateChange = (event: any) => {
      setPlayerState(event.data);
      if (event.data === 1) { 
          setIsPlaying(true); 
          setIsVideoError(false);
          enforceHighQuality(event.target);
      }
      if (event.data === 2) setIsPlaying(false);
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
                 setMeta(prev => ({ ...prev, views: data.total_views }));
                 setViewCounted(true);
             }
         })
         .catch(err => console.log("View Error:", err));
      }
  };

  const onPlayerError = (event: any) => {
      if ([100, 101, 150].includes(event.data)) {
          setIsVideoError(true);
          setErrorMessage("Video Restricted by Owner (Try another source).");
      }
  };

  // 6. EFFECTS & DATA LOADING
  useEffect(() => {
      const storedUser = localStorage.getItem('scanvidz_user');
      if (storedUser) try { setUser(JSON.parse(storedUser)); } catch(e) {}
  }, []);

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

  useEffect(() => {
      if (videoId) {
          setIsVideoError(false);
          setViewCounted(false);
          const userIdParam = user ? `&user_id=${user.id}` : '';
          fetch(`${API_BASE_URL}/meta?v=${videoId}${userIdParam}`)
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    setMeta({
                        likes: data.meta.likes || 0,
                        views: data.meta.views || "0",
                        subs: data.meta.subs || "0",
                        is_liked: data.meta.is_liked
                    });
                }
            });
          fetch(`${API_BASE_URL}/comments?v=${videoId}`)
            .then(res => res.json())
            .then(data => { if (data.status === 'success') setComments(data.comments); });
      }
  }, [videoId, user]);

  // 🔥 FINAL FIX: GUARANTEED RECOMMENDATIONS
  useEffect(() => {
      // Logic: If title exists, search for it. If result is empty or error, fallback to Trending.
      const fetchUpNext = async () => {
          let foundVideos = [];
          
          if (title && title !== 'Video Player') {
              try {
                  // Try to find specific related videos
                  const cleanTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").split(' ').slice(0, 3).join(' '); // Search first 3 words
                  const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(cleanTitle)}&limit=15`);
                  const data = await res.json();
                  if (data.results && data.results.length > 0) {
                      foundVideos = data.results;
                  }
              } catch (e) { console.error(e); }
          }

          // 🔥 FALLBACK: If specific search failed or returned 0 results -> Show Trending
          if (foundVideos.length === 0) {
              try {
                  const res = await fetch(`${API_BASE_URL}/trending`);
                  const data = await res.json();
                  if (data.videos && data.videos.length > 0) {
                      foundVideos = data.videos;
                  }
              } catch (e) { console.error("Trending fallback failed:", e); }
          }

          // 🔥 SAFETY NET: If everything fails, show something static or keep previous state
          if (foundVideos.length > 0) {
              setRelated(foundVideos);
          }
      };

      fetchUpNext();
  }, [title]);

  useEffect(() => {
      let timer: any;
      if (playerState === 0 && related.length > 0 && isAutoplayEnabled) {
          timer = setInterval(() => {
              setCountdown((prev) => {
                  if (prev <= 1) {
                      clearInterval(timer);
                      if (related[0]) playRelated(related[0]); 
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          setCountdown(5);
      }
      return () => clearInterval(timer);
  }, [playerState, related, isAutoplayEnabled]);

  // 7. ACTION HANDLERS
  const handleSubscribe = () => {
      const newStatus = !isSubscribed;
      setIsSubscribed(newStatus);
      if(newStatus) {
          setToastMsg("Subscribed Successfully! 🎉");
          const num = parseInt(meta.subs.replace(/,/g, '')); 
          if(!isNaN(num)) setMeta(prev => ({...prev, subs: (num + 1).toString()}));
      } else {
          const num = parseInt(meta.subs.replace(/,/g, ''));
          if(!isNaN(num) && num > 0) setMeta(prev => ({...prev, subs: (num - 1).toString()}));
      }
      setTimeout(() => setToastMsg(null), 3000);
  };

  const handleLike = async () => {
      if (!user) { alert("Please Login to Like!"); return; }
      const newStatus = !meta.is_liked;
      setMeta(prev => ({
          ...prev,
          is_liked: newStatus,
          likes: newStatus ? prev.likes + 1 : prev.likes - 1
      }));
      if (newStatus) setIsDisliked(false);

      try {
          await fetch(`${API_BASE_URL}/toggle_like`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, video_id: videoId })
          });
      } catch (err) {}
  };

  const handleDislike = () => {
      const newDislikeStatus = !isDisliked;
      setIsDisliked(newDislikeStatus);
      
      if (newDislikeStatus) {
          setToastMsg("Disliked 👎");
          if (meta.is_liked) {
              setMeta(prev => ({ ...prev, is_liked: false, likes: prev.likes - 1 }));
              if(user) {
                  fetch(`${API_BASE_URL}/toggle_like`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ user_id: user.id, video_id: videoId })
                  });
              }
          }
      }
      setTimeout(() => setToastMsg(null), 2000);
  };

  const handleComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      if (!user) { alert("Please Login to comment!"); return; }
      const commentData = {
          video_id: videoId,
          user_name: user.name,
          user_avatar: `https://ui-avatars.com/api/?name=${user.name}&background=random`,
          text: newComment,
          timestamp: "Just now"
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

  const playRelated = (video: RelatedVideo) => {
      setIsPlaying(false);
      setPlayerState(-1);
      let nextId = video.id;
      if (!nextId && video.link) {
          const parts = video.link.split('v=');
          if (parts.length > 1) nextId = parts[1];
      }
      if(nextId) {
          router.push(`/watch?v=${nextId}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name || '')}&avatar=${encodeURIComponent(video.channel_avatar || '')}`);
          window.scrollTo(0,0);
      }
  };

  const handleHeaderSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // 8. MAIN RENDER
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
       
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
           
           <div className="flex-1 p-4 lg:p-6 lg:pr-0 overflow-y-auto">
              <div 
                  ref={containerRef} 
                  className={`relative w-full aspect-video bg-black group rounded-xl overflow-hidden shadow-2xl ${isFullscreenMode ? 'fixed inset-0 z-[100] rounded-none h-screen w-screen' : ''}`}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => isPlaying && setShowControls(false)}
              >
                  {isVideoError || !videoId ? (
                      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-8 text-center z-50">
                          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 text-yellow-500">
                              <span className="text-4xl">⚠️</span>
                          </div>
                          <h2 className="text-2xl font-bold mb-2 text-white">
                              {errorMessage || "Video Unavailable"}
                          </h2>
                          <p className="text-gray-400 mb-6 max-w-md">
                              We could not load this specific video ID. It might be deleted or restricted.
                          </p>
                          <button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-bold transition flex items-center gap-2 transform hover:scale-105">
                              <span>Go Back Home</span>
                          </button>
                      </div>
                  ) : (
                      <YouTube 
                          videoId={videoId} 
                          opts={opts} 
                          onReady={onPlayerReady} 
                          onStateChange={onPlayerStateChange}
                          onError={onPlayerError}
                          className="w-full h-full pointer-events-none"
                          iframeClassName="w-full h-full"
                      />
                  )}

                  {!isVideoError && videoId && (
                      <div 
                          className="absolute inset-0 z-10 cursor-pointer" 
                          onClick={togglePlay} 
                          onDoubleClick={handleDoubleTap}
                      ></div>
                  )}

                  {!isPlaying && !isVideoError && videoId && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                          <div className="w-16 h-16 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 animate-pulse">
                              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          </div>
                      </div>
                  )}

                  {!isVideoError && videoId && (
                      <div className={`absolute bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-12 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                          <div className="group/seek relative w-full h-1 bg-gray-600 rounded-full cursor-pointer mb-4 hover:h-1.5 transition-all">
                              <div className="absolute h-full bg-red-600 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                              <input type="range" min={0} max={duration} step={0.1} value={currentTime} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40" />
                          </div>
                          <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                  <button onClick={togglePlay} className="text-white hover:text-blue-400">
                                      {isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                                  </button>
                                  <div className="flex items-center gap-2 group/vol">
                                      <button onClick={toggleMute} className="text-white">
                                          {isMuted || volume === 0 ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>}
                                      </button>
                                      <input type="range" min={0} max={100} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover/vol:w-20 transition-all h-1 bg-white rounded-full accent-blue-500 cursor-pointer" />
                                  </div>
                                  <span className="text-xs font-mono text-gray-300">{formatTime(currentTime)} / {formatTime(duration)}</span>
                              </div>
                              <div className="flex items-center gap-4 relative">
                                  <button onClick={() => setShowSettings(!showSettings)} className={`text-white transition transform ${showSettings ? 'rotate-90' : ''}`}>
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  </button>
                                  {showSettings && (
                                      <div className="absolute bottom-10 right-0 bg-[#1f1f1f]/95 border border-gray-700 rounded-xl p-3 w-48 shadow-2xl z-50 backdrop-blur-md">
                                          <div className="text-xs text-gray-400 mb-2 font-bold uppercase tracking-wider">Speed</div>
                                          <div className="flex gap-1 mb-1">
                                              {[0.5, 1, 1.5, 2].map(s => (
                                                  <button key={s} onClick={() => changeSpeed(s)} className={`flex-1 text-xs py-1.5 rounded-lg border border-gray-600 transition ${playbackSpeed === s ? 'bg-blue-600 border-blue-600 text-white' : 'hover:bg-gray-700'}`}>{s}x</button>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                                  <button onClick={toggleFullscreen} className="text-white hover:scale-110 transition">
                                      {isFullscreenMode ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

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

              <div className="mt-4">
                  <div className="flex justify-between items-start gap-4">
                      <h1 className="text-xl md:text-2xl font-bold line-clamp-2 leading-snug flex-1">{title}</h1>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-between mt-4 pb-4 border-b border-gray-800 gap-4">
                     <div className="flex items-center gap-3">
                        <img src={channelAvatar} className="w-10 h-10 rounded-full bg-gray-700 object-cover" onError={(e:any) => e.target.src=`https://ui-avatars.com/api/?background=random&name=${channelName}`} />
                        <div>
                           <h3 className="font-bold text-sm text-gray-100">{channelName}</h3>
                           <p className="text-xs text-gray-400">{meta.subs} subscribers</p>
                        </div>
                        <button onClick={handleSubscribe} className={`px-5 py-2 rounded-full text-sm font-bold ml-4 transition ${isSubscribed ? 'bg-[#272727] text-gray-300' : 'bg-white text-black hover:bg-gray-200'}`}>{isSubscribed ? 'Subscribed 🔔' : 'Subscribe'}</button>
                     </div>
                     
                     <div className="flex items-center gap-2">
                        <div className="bg-[#272727] flex items-center rounded-full overflow-hidden border border-gray-700">
                           <button onClick={handleLike} className={`px-4 py-2 flex items-center gap-2 text-sm font-medium border-r border-gray-600 transition ${meta.is_liked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}>👍 {meta.likes}</button>
                           <button onClick={handleDislike} className={`px-4 py-2 text-sm font-medium transition ${isDisliked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}>👎</button>
                        </div>
                     </div>
                  </div>
                  
                  <div className="mt-4 bg-[#272727]/50 border border-gray-800 p-3 rounded-xl text-sm text-gray-300 hover:bg-[#272727] transition cursor-pointer">
                     <p className="font-bold text-white mb-1">{meta.views} views • Just now</p>
                     <p>Watching on ScanVidz Pro. No Ads. No Tracking.</p>
                  </div>
                  
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

           <div className="w-full lg:w-[420px] p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Up Next</h3>
                  <div onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)} className="flex items-center gap-2 cursor-pointer">
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