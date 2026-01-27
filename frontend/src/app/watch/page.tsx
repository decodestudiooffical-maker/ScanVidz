'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import YouTube from 'react-youtube'; 
import UserMenu from '@/components/UserMenu'; // 🔥 Import UserMenu

// --- COMPONENT START ---
function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ---------------------------------------------------------
  // 1. DATA EXTRACTION (URL PARAMS)
  // ---------------------------------------------------------
  const videoId = (searchParams.get('v') || '').split('v=')[1] || searchParams.get('v');
  const title = searchParams.get('title') || 'Video Player';
  const views = searchParams.get('views') || '0';
  const thumbnail = searchParams.get('thumbnail') || '';
  const duration = searchParams.get('duration') || '';
  
  // Channel Info Logic
  const rawChannel = searchParams.get('channel');
  const channelName = rawChannel && rawChannel !== 'undefined' ? rawChannel : 'ScanVidz Creator';
  const channelAvatar = searchParams.get('avatar') || `https://ui-avatars.com/api/?background=random&name=${channelName}`;

  // ---------------------------------------------------------
  // 2. STATE MANAGEMENT (Sare variables yahan hain)
  // ---------------------------------------------------------
  
  // Player States
  const [play, setPlay] = useState(false);
  const [playerState, setPlayerState] = useState<number>(-1); // -1:Unstarted, 1:Playing, 2:Paused, 0:Ended
  const [related, setRelated] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(5); // End screen timer
  
  // Download Logic States
  const [showDownload, setShowDownload] = useState(false);
  const [formats, setFormats] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Engagement States (Business Model Data)
  const [likes, setLikes] = useState(1540); 
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState("1.2M");
  
  // Comments Section States
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Search Bar State
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const playerRef = useRef<any>(null); // React-YouTube Player Reference

  // ---------------------------------------------------------
  // 3. KEYBOARD CONTROLS (Spacebar Logic Fixed)
  // ---------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Input box me type karte waqt space na roke
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault(); // Scroll block karo
        
        // React-YouTube Control
        if (playerRef.current) {
            const player = playerRef.current.internalPlayer;
            player.getPlayerState().then((state: number) => {
                if (state === 1) player.pauseVideo(); // Playing -> Pause
                else player.playVideo(); // Paused -> Play
            });
        } else {
            // Agar player load nahi hua to Play state toggle karo
            setPlay(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---------------------------------------------------------
  // 4. SMART UP NEXT ALGORITHM (15 Related + 10 Mix)
  // ---------------------------------------------------------
  useEffect(() => {
      if (title) {
        // Fake real-time sub count generation
        setSubCount(`${(Math.random() * 5 + 0.5).toFixed(1)}M`);

        const mainTag = title.split(' ').slice(0, 4).join(' ');
        const broadTag = title.split(' ').pop() || 'trending';

        // Parallel Fetching for Speed (Backend API)
        Promise.all([
            // Fetch 1: Strictly Related (15 Videos)
            fetch(`https://scanvidz-default.onrender.com/search?q=${encodeURIComponent(mainTag)}&limit=15`).then(res => res.json()),
            
            // Fetch 2: Mix/Broad Related (10 Videos)
            fetch(`https://scanvidz-default.onrender.com/search?q=${encodeURIComponent(broadTag + ' mix')}&limit=10`).then(res => res.json())
        ])
        .then(([strictData, mixData]) => {
            const strictVideos = strictData.results || strictData.videos || [];
            const mixVideos = mixData.results || mixData.videos || [];
            
            // Combine & Filter duplicates
            const combined = [...strictVideos, ...mixVideos].filter((v, i, a) => a.findIndex(t => t.link === v.link) === i);
            
            setRelated(combined.slice(0, 25)); // Total 25 Videos set karo
        })
        .catch(err => console.log("Related Error:", err));
      }
  }, [title]);

  // ---------------------------------------------------------
  // 5. AUTO PLAY NEXT LOGIC (Timer)
  // ---------------------------------------------------------
  useEffect(() => {
      let timer: any;
      // Agar video khatam (0) hai aur related videos hain
      if (playerState === 0 && related.length > 0) {
          timer = setInterval(() => {
              setCountdown((prev) => {
                  if (prev <= 1) {
                      clearInterval(timer);
                      playRelated(related[0]); // Time up -> Play Next
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          setCountdown(5); // Reset timer if not ended
      }
      return () => clearInterval(timer);
  }, [playerState, related]);

  // ---------------------------------------------------------
  // 6. DOWNLOAD HANDLERS (Backend Connection)
  // ---------------------------------------------------------
  const handleDownload = async () => {
      if (!videoId) return;
      setLoadingFormats(true);
      try {
        const res = await fetch(`https://scanvidz-default.onrender.com/formats?v=${videoId}`);
        const data = await res.json();
        if (data.status === 'success') {
           setFormats(data.formats);
           setShowDownload(true);
        } else {
           alert('Download links currently unavailable.'); 
        }
      } catch (e) {
        alert('Server busy. Please try again.');
      } finally {
        setLoadingFormats(false);
      }
  };

  const startDownload = (format: any) => {
      setShowDownload(false);

      // Check HQ Merge Logic
      if (format.needs_merge) {
          setToastMsg("⚡ Processing High Quality Video... Please wait (10-30s)");
          setTimeout(() => setToastMsg(null), 10000);
      } else {
          setToastMsg("Download started in background! 🚀");
          setTimeout(() => setToastMsg(null), 5000); 
      }

      // Trigger URL
      const isMerge = format.needs_merge ? "true" : "false";
      const url = `https://scanvidz-default.onrender.com/download?v=${videoId}&format_id=${format.format_id}&merge=${isMerge}`;
      window.open(url, '_blank'); 
  };

  // ---------------------------------------------------------
  // 7. ENGAGEMENT HANDLERS (Like/Dislike/Sub)
  // ---------------------------------------------------------
  const handleSubscribe = () => {
      setIsSubscribed(!isSubscribed);
      if(!isSubscribed) {
          setToastMsg("Subscribed Successfully! 🎉");
          setTimeout(() => setToastMsg(null), 3000);
      }
  };

  const handleLike = () => {
      if (isLiked) {
          setLikes(prev => prev - 1);
          setIsLiked(false);
      } else {
          setLikes(prev => prev + 1);
          setIsLiked(true);
          // Mutual Exclusion
          if (isDisliked) setIsDisliked(false);
      }
  };

  const handleDislike = () => {
      if (isDisliked) {
          setIsDisliked(false);
      } else {
          setIsDisliked(true);
          // Mutual Exclusion
          if (isLiked) {
              setLikes(prev => prev - 1);
              setIsLiked(false);
          }
      }
  };

  const handleComment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) return;
      
      const newCmt = {
          user: "You",
          text: newComment,
          avatar: "https://ui-avatars.com/api/?name=You&background=random",
          time: "Just now"
      };
      setComments([newCmt, ...comments]);
      setNewComment("");
  };

  const handleHeaderSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  // ---------------------------------------------------------
  // 8. NAVIGATION & PLAYER EVENTS
  // ---------------------------------------------------------
  const playRelated = (video: any) => {
      // Reset States
      setPlay(false);
      setPlayerState(-1);
      
      // Navigate
      router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name || '')}&avatar=${encodeURIComponent(video.channel_avatar || '')}`);
      
      // Scroll Top & Re-play
      window.scrollTo(0,0);
      setTimeout(() => setPlay(true), 100); 
  };

  // 🔥 UPDATED: SOUND FIX FUNCTIONS (JABARDASTI UNMUTE) 🔥
  const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      // Force Unmute immediately
      event.target.unMute();
      event.target.setVolume(100);
      event.target.playVideo(); // Try to auto-start since user already clicked thumbnail
  };

  const onPlayerStateChange = (event: any) => {
      setPlayerState(event.data);
      // Code 1 means "Playing"
      // Jaise hi video play ho, dobara unmute command bhejo (Safety ke liye)
      if (event.data === 1) {
         event.target.unMute();
         event.target.setVolume(100);
      }
  };

  // ---------------------------------------------------------
  // 9. UI RENDER START
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
       
       {/* --- HEADER SECTION (MOBILE FIX) --- */}
       <header className="sticky top-0 z-50 bg-[#0f0f0f]/95 backdrop-blur-md px-4 h-16 flex items-center justify-between border-b border-gray-800">
         <div className="flex items-center gap-2 md:gap-4">
            {/* Logo */}
            <h1 onClick={() => router.push('/')} className="text-xl md:text-2xl font-black tracking-tighter cursor-pointer bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                ScanVidz
            </h1>
         </div>
         
         {/* 🔥 FIXED: Removed 'hidden', added responsive widths */}
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

         {/* 🔥 REPLACED OLD 'U' BUTTON WITH UserMenu COMPONENT */}
         <UserMenu />
       </header>

       <div className="flex flex-col lg:flex-row max-w-[1800px] mx-auto w-full">
           
           {/* --- LEFT SIDE: PLAYER & INFO --- */}
           <div className="flex-1 p-4 lg:p-6 lg:pr-0 overflow-y-auto">
              
              {/* VIDEO PLAYER CONTAINER */}
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative group border border-gray-800">
                 {play && videoId ? (
                    <div className="w-full h-full relative group">
                       {/* REACT YOUTUBE PLAYER */}
                       <YouTube
                          videoId={videoId}
                          className="w-full h-full"
                          iframeClassName="w-full h-full"
                          onReady={onPlayerReady}
                          onStateChange={onPlayerStateChange}
                          opts={{
                              playerVars: {
                                  autoplay: 1,
                                  controls: 1,
                                  modestbranding: 1,
                                  rel: 0, 
                                  showinfo: 0,
                                  iv_load_policy: 3, 
                              }
                          }}
                       />
                       
                       {/* 🔥 NUCLEAR SHIELD 1: Bottom Right (Covers Logo) - BLOCKS TOUCH */}
                       <div 
                            className="absolute bottom-0 right-0 w-[150px] h-[90px] z-[9999]" 
                            style={{ 
                                pointerEvents: 'auto', 
                                background: 'rgba(255,0,0,0.01)' // Invisible but present hack
                            }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                       ></div>
                       
                       {/* 🔥 NUCLEAR SHIELD 2: Top Right (Covers Share/Watch Later) - BLOCKS TOUCH */}
                       <div 
                            className="absolute top-0 right-0 w-[200px] h-[80px] z-[9999]" 
                            style={{ 
                                pointerEvents: 'auto', 
                                background: 'rgba(255,0,0,0.01)' 
                            }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
                       ></div>

                       {/* PAUSE OVERLAY + MARQUEE */}
                       {playerState === 2 && (
                           <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-black via-black/95 to-transparent z-20 flex items-end pb-6 pointer-events-none">
                               <div className="w-full overflow-hidden whitespace-nowrap">
                                   <div className="inline-block animate-marquee pl-full">
                                       <span className="text-2xl font-bold text-white/90 mx-8 tracking-wide">ScanVidz - Premium Video Engine</span>
                                       <span className="text-2xl font-bold text-blue-400/90 mx-8 tracking-wide">No Ads & No Tracking</span>
                                       <span className="text-2xl font-bold text-red-500/90 mx-8 tracking-wide">High Speed 4K Download</span>
                                   </div>
                               </div>
                           </div>
                       )}

                       {/* END SCREEN OVERLAY */}
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
                    // THUMBNAIL (BEFORE PLAY)
                    <div className="absolute inset-0 flex items-center justify-center bg-cover bg-center cursor-pointer" style={{backgroundImage: `url(${thumbnail})`}} onClick={() => setPlay(true)}>
                       <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition"></div>
                       <div className="w-20 h-20 bg-red-600/90 hover:bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:scale-110 transition z-10 backdrop-blur-sm">
                          <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       </div>
                       <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 rounded text-sm font-bold">{duration}</div>
                    </div>
                 )}
              </div>

              {/* INFO & ACTIONS SECTION */}
              <div className="mt-4">
                 <h1 className="text-xl md:text-2xl font-bold line-clamp-2 leading-snug">{title}</h1>
                 
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
                       
                       <button 
                            onClick={handleSubscribe}
                            className={`px-5 py-2 rounded-full text-sm font-bold ml-4 transition ${isSubscribed ? 'bg-[#272727] text-gray-300' : 'bg-white text-black hover:bg-gray-200'}`}
                       >
                            {isSubscribed ? 'Subscribed 🔔' : 'Subscribe'}
                       </button>
                    </div>

                    <div className="flex items-center gap-2">
                       <div className="bg-[#272727] flex items-center rounded-full overflow-hidden border border-gray-700">
                          <button 
                            onClick={handleLike}
                            className={`px-4 py-2 flex items-center gap-2 text-sm font-medium border-r border-gray-600 transition ${isLiked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}
                          >
                              👍 {likes}
                          </button>
                          <button 
                            onClick={handleDislike}
                            className={`px-4 py-2 text-sm font-medium transition ${isDisliked ? 'text-blue-400' : 'hover:bg-[#3f3f3f]'}`}
                          >
                              👎
                          </button>
                       </div>
                       <button 
                          onClick={handleDownload}
                          disabled={loadingFormats}
                          className="bg-[#272727] hover:bg-[#3f3f3f] border border-gray-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition"
                       >
                          {loadingFormats ? <span className="animate-spin">⏳</span> : '⬇ Download'}
                       </button>
                    </div>
                 </div>
                 
                 <div className="mt-4 bg-[#272727]/50 border border-gray-800 p-3 rounded-xl text-sm text-gray-300 hover:bg-[#272727] transition cursor-pointer">
                    <p className="font-bold text-white mb-1">{views} views • Just now</p>
                    <p>Watching on ScanVidz Premium. No Ads. No Tracking.</p>
                 </div>

                 {/* COMMENTS SECTION */}
                 <div className="mt-8 mb-10">
                    <h3 className="text-xl font-bold mb-4">{comments.length} Comments</h3>
                    
                    <form onSubmit={handleComment} className="flex gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold flex-shrink-0">U</div>
                        <div className="flex-1">
                            <input 
                                type="text" 
                                className="w-full bg-transparent border-b border-gray-700 focus:border-white outline-none py-2 text-sm text-white placeholder-gray-500 transition"
                                placeholder="Add a comment..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                            />
                            <div className="flex justify-end mt-2">
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50" disabled={!newComment.trim()}>
                                    Comment
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="space-y-6">
                        {comments.map((c, i) => (
                            <div key={i} className="flex gap-4">
                                <img src={c.avatar} className="w-10 h-10 rounded-full" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm">{c.user}</span>
                                        <span className="text-xs text-gray-500">{c.time}</span>
                                    </div>
                                    <p className="text-sm mt-1 text-gray-200">{c.text}</p>
                                </div>
                            </div>
                        ))}
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

// --- SUSPENSE EXPORT (Prevents hydration errors) ---
export default function WatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Player...</div>}>
      <WatchContent />
    </Suspense>
  );
}