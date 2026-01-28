'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import YouTube from 'react-youtube'; 
import UserMenu from '@/components/UserMenu'; 

// --- COMPONENT START ---
function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ---------------------------------------------------------
  // 1. DATA EXTRACTION (URL PARAMS)
  // ---------------------------------------------------------
  const videoId = (searchParams.get('v') || '').split('v=')[1] || searchParams.get('v');
  const title = searchParams.get('title') || 'Video Player';
  const thumbnail = searchParams.get('thumbnail') || '';
  const duration = searchParams.get('duration') || '';
  
  // Channel Info Logic
  const rawChannel = searchParams.get('channel');
  const channelName = rawChannel && rawChannel !== 'undefined' ? rawChannel : 'ScanVidz Creator';
  const channelAvatar = searchParams.get('avatar') || `https://ui-avatars.com/api/?background=random&name=${channelName}`;

  // ---------------------------------------------------------
  // 2. STATE MANAGEMENT
  // ---------------------------------------------------------
  
  // Player States
  const [play, setPlay] = useState(false);
  const [playerState, setPlayerState] = useState<number>(-1); 
  const [related, setRelated] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(5);
  
  // 🔥 FULLSCREEN STATE
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Download Logic States
  const [showDownload, setShowDownload] = useState(false);
  const [formats, setFormats] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Engagement States (Real Data)
  const [likes, setLikes] = useState<string | number>("Loading..."); 
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState("Loading...");
  const [views, setViews] = useState(searchParams.get('views') || 'Loading...');
  
  // 🔥 REAL COMMENTS STATE (Updated)
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<any>(null); // Logged in user info
  
  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const playerRef = useRef<any>(null); 
  const containerRef = useRef<HTMLDivElement>(null); 

  // ---------------------------------------------------------
  // 3. CHECK LOGIN STATUS & FETCH COMMENTS
  // ---------------------------------------------------------
  
  // Check if user is logged in
  useEffect(() => {
      const storedUser = localStorage.getItem('scanvidz_user');
      if (storedUser) {
          try {
              setUser(JSON.parse(storedUser));
          } catch(e) { console.log("User Parse Error"); }
      }
  }, []);

  // 🔥 Fetch Comments from Database when Video Loads
  useEffect(() => {
      if (videoId) {
          fetch(`https://scanvidz-default.onrender.com/comments?v=${videoId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    setComments(data.comments);
                }
            })
            .catch(err => console.log("Comments Fetch Error:", err));
      }
  }, [videoId]);

  // ---------------------------------------------------------
  // 4. KEYBOARD CONTROLS & LISTENERS
  // ---------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault(); 
        if (playerRef.current) {
            const player = playerRef.current.internalPlayer;
            player.getPlayerState().then((state: number) => {
                if (state === 1) player.pauseVideo(); 
                else player.playVideo(); 
            });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // FULLSCREEN LISTENER
  useEffect(() => {
      const handleFsChange = () => {
          if (document.fullscreenElement) {
              setIsFullscreenMode(true);
          } else {
              setIsFullscreenMode(false);
          }
      };
      document.addEventListener('fullscreenchange', handleFsChange);
      document.addEventListener('webkitfullscreenchange', handleFsChange); 
      return () => {
          document.removeEventListener('fullscreenchange', handleFsChange);
          document.removeEventListener('webkitfullscreenchange', handleFsChange);
      }
  }, []);

  // ---------------------------------------------------------
  // 5. FETCH REAL METADATA & FORMATS
  // ---------------------------------------------------------
  useEffect(() => {
      if (videoId) {
          setLoadingFormats(true);
          fetch(`https://scanvidz-default.onrender.com/formats?v=${videoId}`)
            .then(res => res.json())
            .then(data => {
                if(data.status === 'success') {
                    setFormats(data.formats);
                    // Update Real Stats
                    if(data.meta) {
                        setLikes(data.meta.likes);
                        setSubCount(data.meta.subs);
                        setViews(data.meta.views);
                    }
                }
            })
            .catch(err => console.log("Meta Error:", err))
            .finally(() => setLoadingFormats(false));
      }
  }, [videoId]);

  // ---------------------------------------------------------
  // 6. SMART UP NEXT ALGORITHM
  // ---------------------------------------------------------
  useEffect(() => {
      if (title) {
        const mainTag = title.split(' ').slice(0, 4).join(' ');
        const broadTag = title.split(' ').pop() || 'trending';

        Promise.all([
            fetch(`https://scanvidz-default.onrender.com/search?q=${encodeURIComponent(mainTag)}&limit=15`).then(res => res.json()),
            fetch(`https://scanvidz-default.onrender.com/search?q=${encodeURIComponent(broadTag + ' mix')}&limit=10`).then(res => res.json())
        ])
        .then(([strictData, mixData]) => {
            const strictVideos = strictData.results || strictData.videos || [];
            const mixVideos = mixData.results || mixData.videos || [];
            const combined = [...strictVideos, ...mixVideos].filter((v, i, a) => a.findIndex(t => t.link === v.link) === i);
            setRelated(combined.slice(0, 25)); 
        })
        .catch(err => console.log("Related Error:", err));
      }
  }, [title]);

  // ---------------------------------------------------------
  // 7. AUTO PLAY NEXT LOGIC
  // ---------------------------------------------------------
  useEffect(() => {
      let timer: any;
      if (playerState === 0 && related.length > 0) {
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
  }, [playerState, related]);

  // ---------------------------------------------------------
  // 8. HANDLERS (Download, Subscribe, Like)
  // ---------------------------------------------------------
  const handleDownloadClick = () => {
      if(formats.length > 0) {
          setShowDownload(true);
      } else {
          alert("Loading formats... please wait.");
      }
  };

  const startDownload = (format: any) => {
      setShowDownload(false);
      setToastMsg("Download started! 🚀");
      setTimeout(() => setToastMsg(null), 5000); 
      
      const isMerge = format.needs_merge ? "true" : "false";
      // Direct link to backend download
      const url = `https://scanvidz-default.onrender.com/download?v=${videoId}&format_id=${format.format_id}&merge=${isMerge}`;
      window.open(url, '_blank'); 
  };

  const handleSubscribe = () => {
      setIsSubscribed(!isSubscribed);
      if(!isSubscribed) {
          setToastMsg("Subscribed Successfully! 🎉");
          setTimeout(() => setToastMsg(null), 3000);
      }
  };

  const handleLike = () => {
      if (isLiked) {
          setLikes(prev => (typeof prev === 'number' ? prev - 1 : prev));
          setIsLiked(false);
      } else {
          setLikes(prev => (typeof prev === 'number' ? prev + 1 : prev));
          setIsLiked(true);
          if (isDisliked) setIsDisliked(false);
      }
  };

  const handleDislike = () => {
      if (isDisliked) {
          setIsDisliked(false);
      } else {
          setIsDisliked(true);
          if (isLiked) {
              setLikes(prev => (typeof prev === 'number' ? prev - 1 : prev));
              setIsLiked(false);
          }
      }
  };

  // 🔥 UPDATED: REAL COMMENT HANDLER (Connects to DB)
  const handleComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      
      // Check Login
      if (!user) {
          alert("Please Login to comment! (Click 'U' icon at top)");
          return;
      }

      const commentData = {
          video_id: videoId,
          user_name: user.name,
          user_avatar: `https://ui-avatars.com/api/?name=${user.name}&background=random`,
          text: newComment
      };

      // 1. Optimistic Update (Show instantly in UI)
      setComments([commentData, ...comments]);
      setNewComment("");

      // 2. Send to Backend Database
      try {
          await fetch('https://scanvidz-default.onrender.com/comments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(commentData)
          });
      } catch (err) {
          console.log("Failed to save comment", err);
      }
  };

  const handleHeaderSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // ---------------------------------------------------------
  // 9. NAVIGATION & PLAYER EVENTS
  // ---------------------------------------------------------
  const playRelated = (video: any) => {
      setPlay(false);
      setPlayerState(-1);
      
      router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name || '')}&avatar=${encodeURIComponent(video.channel_avatar || '')}`);
      window.scrollTo(0,0);
      setTimeout(() => setPlay(true), 100); 
  };

  // CUSTOM FULLSCREEN FUNCTION
  const toggleFullscreen = () => {
      if (containerRef.current) {
          if (!document.fullscreenElement) {
              if (containerRef.current.requestFullscreen) {
                  containerRef.current.requestFullscreen();
              } else if ((containerRef.current as any).webkitRequestFullscreen) {
                  (containerRef.current as any).webkitRequestFullscreen();
              }
          } else {
              if (document.exitFullscreen) {
                  document.exitFullscreen();
              } else if ((document as any).webkitExitFullscreen) {
                  (document as any).webkitExitFullscreen();
              }
          }
      }
  };

  // PLAYER LOGIC
  const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      
      // Auto-play Muted
      event.target.mute();
      event.target.playVideo();
      
      // Auto-Unmute Attempt
      setTimeout(() => {
          event.target.unMute(); 
      }, 1000);
  };

  const onPlayerStateChange = (event: any) => {
      setPlayerState(event.data);
      
      if (event.data === 1) { 
         const player = event.target;
         player.isMuted().then((muted: boolean) => {
             if(muted) {
                 player.unMute();
             }
         });
      }
  };

  // ---------------------------------------------------------
  // 10. UI RENDER START
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
       
       {/* --- HEADER SECTION --- */}
       <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-2 md:gap-4">
            <h1 onClick={() => router.push('/')} className="text-xl md:text-2xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                ScanVidz
            </h1>
         </div>
         
         <form onSubmit={handleHeaderSearch} className="flex flex-1 max-w-xl mx-auto items-center bg-[#121212] border border-gray-700 rounded-full px-3 py-1.5 ml-2 md:ml-4">
            <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent flex-1 outline-none text-white placeholder-gray-500 text-sm md:text-base w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="text-gray-400 hover:text-white px-2">🔍</button>
         </form>

         <UserMenu />
       </header>

       <div className="flex flex-col lg:flex-row max-w-[1800px] mx-auto w-full">
           
           {/* --- LEFT SIDE: PLAYER & INFO --- */}
           <div className="flex-1 p-4 lg:p-6 lg:pr-0 overflow-y-auto">
              
              {/* VIDEO PLAYER CONTAINER */}
              <div 
                ref={containerRef} 
                className={`w-full bg-black relative group border-gray-800 overflow-hidden ${isFullscreenMode ? 'fixed inset-0 z-[100] h-screen w-screen border-none rounded-none' : 'aspect-video rounded-xl border shadow-2xl'}`}
              >
                 {play && videoId ? (
                    <div className="w-full h-full relative group">
                       <YouTube
                          videoId={videoId}
                          style={{ width: '100%', height: '100%' }}
                          className="w-full h-full"
                          iframeClassName="w-full h-full"
                          onReady={onPlayerReady}
                          onStateChange={onPlayerStateChange}
                          opts={{
                              height: '100%',
                              width: '100%',
                              playerVars: {
                                  autoplay: 1,
                                  mute: 1,
                                  playsinline: 1, 
                                  controls: 1, 
                                  modestbranding: 1,
                                  rel: 0, 
                                  showinfo: 0,
                                  iv_load_policy: 3, 
                                  fs: 0, 
                                  origin: typeof window !== 'undefined' ? window.location.origin : 'https://scanvidz.vercel.app'
                              }
                          }}
                       />
                       
                       {/* Smart Shields */}
                       <div className="absolute top-0 right-0 z-[60]" style={{ width: '25%', maxWidth: '160px', height: '20%', maxHeight: '80px', pointerEvents: 'auto', background: 'transparent' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}></div>
                       <div className="absolute bottom-0 right-0 z-[60]" style={{ width: '20%', maxWidth: '130px', height: '20%', maxHeight: '60px', pointerEvents: 'auto', background: 'transparent' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}></div>
                       <div className="absolute top-0 left-0 z-[60]" style={{ width: '40%', height: '20%', maxHeight: '70px', pointerEvents: 'auto', background: 'transparent' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}></div>

                       {/* Pause Overlay */}
                       {playerState === 2 && (
                           <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/90 to-transparent z-50 flex items-center justify-center pb-4 pointer-events-none">
                               <div className="flex flex-col items-center">
                                   <span className="text-xl font-black text-white tracking-widest uppercase mb-1">ScanVidz Premium</span>
                                   <div className="flex gap-4 text-xs font-bold text-gray-400">
                                       <span className="text-blue-400">NO ADS</span> • <span>NO TRACKING</span> • <span className="text-red-400">4K DL</span>
                                   </div>
                               </div>
                           </div>
                       )}

                       {/* End Screen */}
                       {playerState === 0 && related.length > 0 && (
                           <div className="absolute inset-0 bg-black/95 z-30 flex flex-col items-center justify-center text-center p-6">
                               <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-2">Up Next in {countdown}s</h3>
                               <div className="relative group cursor-pointer w-full max-w-sm" onClick={() => playRelated(related[0])}>
                                   <img src={related[0].thumbnail} className="w-full aspect-video object-cover rounded-lg border-2 border-transparent group-hover:border-blue-500 transition"/>
                                   <div className="absolute inset-0 flex items-center justify-center">
                                       <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                       </div>
                                   </div>
                               </div>
                               <h2 className="text-xl font-bold mt-4 line-clamp-1">{related[0].title}</h2>
                               <button onClick={() => { setPlay(false); setPlayerState(-1); }} className="mt-6 text-gray-400 hover:text-white underline text-sm">Cancel</button>
                           </div>
                       )}
                    </div>
                 ) : (
                    // Thumbnail
                    <div className="absolute inset-0 flex items-center justify-center bg-cover bg-center cursor-pointer" style={{backgroundImage: `url(${thumbnail})`}} onClick={() => setPlay(true)}>
                       <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition"></div>
                       <div className="w-20 h-20 bg-red-600/90 hover:bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:scale-110 transition z-10 backdrop-blur-sm">
                          <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       </div>
                       <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 rounded text-sm font-bold">{duration}</div>
                    </div>
                 )}
              </div>

              {/* INFO & ACTIONS */}
              <div className="mt-4">
                 <div className="flex justify-between items-start gap-4">
                     <h1 className="text-xl md:text-2xl font-bold line-clamp-2 leading-snug flex-1">{title}</h1>
                     
                     <button 
                        onClick={toggleFullscreen}
                        className="p-2.5 bg-[#272727] hover:bg-[#3f3f3f] rounded-full border border-gray-700 transition flex-shrink-0"
                        title={isFullscreenMode ? "Exit Fullscreen" : "Fullscreen"}
                     >
                        {isFullscreenMode ? (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        ) : (
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                        )}
                     </button>
                 </div>
                 
                 <div className="flex flex-wrap items-center justify-between mt-4 pb-4 border-b border-gray-800 gap-4">
                    <div className="flex items-center gap-3">
                       <img 
                            src={channelAvatar} 
                            className="w-10 h-10 rounded-full bg-gray-700 object-cover"
                            onError={(e:any) => e.target.src=`https://ui-avatars.com/api/?background=random&name=${channelName}`}
                       />
                       <div>
                          <h3 className="font-bold text-sm text-gray-100">{channelName}</h3>
                          <p className="text-xs text-gray-400">{subCount} subscribers</p>
                       </div>
                       
                       <button onClick={handleSubscribe} className={`px-5 py-2 rounded-full text-sm font-bold ml-4 transition ${isSubscribed ? 'bg-[#272727] text-gray-300' : 'bg-white text-black hover:bg-gray-200'}`}>
                            {isSubscribed ? 'Subscribed 🔔' : 'Subscribe'}
                       </button>
                    </div>

                    <div className="flex items-center gap-2">
                       <div className="bg-[#272727] flex items-center rounded-full overflow-hidden border border-gray-700">
                          <button onClick={handleLike} className={`px-4 py-2 flex items-center gap-2 text-sm font-medium border-r border-gray-600 transition ${isLiked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}>👍 {likes}</button>
                          <button onClick={handleDislike} className={`px-4 py-2 text-sm font-medium transition ${isDisliked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}>👎</button>
                       </div>
                       <button onClick={handleDownloadClick} disabled={loadingFormats} className="bg-[#272727] hover:bg-[#3f3f3f] border border-gray-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition">{loadingFormats ? <span className="animate-spin">⏳</span> : '⬇ Download'}</button>
                    </div>
                 </div>
                 
                 <div className="mt-4 bg-[#272727]/50 border border-gray-800 p-3 rounded-xl text-sm text-gray-300 hover:bg-[#272727] transition cursor-pointer">
                    <p className="font-bold text-white mb-1">{views} views • Just now</p>
                    <p>Watching on ScanVidz Premium. No Ads. No Tracking.</p>
                 </div>
                 
                 {/* 🔥 REAL COMMENTS SECTION (Database Connected) */}
                 <div className="mt-8 mb-10">
                    <h3 className="text-xl font-bold mb-4">{comments.length} Comments</h3>
                    
                    <form onSubmit={handleComment} className="flex gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold flex-shrink-0 text-white">
                            {user ? user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="flex-1">
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b border-gray-700 focus:border-white outline-none py-2 text-sm text-white placeholder-gray-500 transition"
                                placeholder={user ? "Add a comment..." : "Please login to comment"}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                disabled={!user}
                            />
                            <div className="flex justify-end mt-2">
                                <button 
                                    type="submit" 
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50 transition" 
                                    disabled={!newComment.trim() || !user}
                                >
                                    Comment
                                </button>
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
                            <div className="text-center text-gray-500 text-sm py-6">
                                No comments yet. Be the first to share your thoughts! 🚀
                            </div>
                        )}
                    </div>
                 </div>
              </div>
           </div>

           {/* --- RIGHT SIDE: UP NEXT --- */}
           <div className="w-full lg:w-[420px] p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Up Next</h3>
                <span className="text-xs text-gray-400">Autoplay On</span>
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
                 
                 {related.length === 0 && (
                    [1,2,3,4,5].map(i => (
                        <div key={i} className="flex gap-2 animate-pulse">
                            <div className="w-[168px] h-[94px] bg-gray-800 rounded-lg"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))
                 )}
              </div>
           </div>
       </div>

       {/* --- DOWNLOAD MODAL --- */}
       {showDownload && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-[#1f1f1f] border border-gray-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="font-bold text-xl">Select Quality</h3>
                   <button onClick={() => setShowDownload(false)} className="text-gray-400 hover:text-white bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                   {formats.length > 0 ? formats.map((fmt: any, i) => (
                      <button key={i} onClick={() => startDownload(fmt)} className="w-full flex justify-between items-center bg-[#272727] hover:bg-blue-600 hover:text-white p-4 rounded-xl transition group">
                          <div className="flex flex-col items-start">
                             <span className="font-bold text-lg">{fmt.quality || 'MP4'}</span>
                             <span className="text-xs text-gray-400 group-hover:text-blue-200 uppercase">{fmt.ext}</span>
                          </div>
                          <span className="text-sm font-mono bg-black/30 px-2 py-1 rounded">{fmt.size}</span>
                      </button>
                   )) : (
                      <div className="text-center text-gray-400 py-4">No MP4 formats found.</div>
                   )}
                </div>
             </div>
          </div>
       )}

       {/* --- TOAST NOTIFICATION --- */}
       {toastMsg && (
         <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[150] flex items-center gap-3 animate-bounce">
            <span className="text-xl">⬇</span>
            <span className="font-bold text-sm md:text-base whitespace-nowrap">{toastMsg}</span>
         </div>
       )}

    </div>
  );
}

// --- SUSPENSE EXPORT ---
export default function WatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Player...</div>}>
      <WatchContent />
    </Suspense>
  );
}