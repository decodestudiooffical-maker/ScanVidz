'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import YouTube from 'react-youtube'; 
import UserMenu from '@/components/UserMenu'; 

// --- COMPONENT START ---
function WatchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 1. DATA EXTRACTION
  const videoId = (searchParams.get('v') || '').split('v=')[1] || searchParams.get('v');
  const title = searchParams.get('title') || 'Video Player';
  const views = searchParams.get('views') || '0';
  const thumbnail = searchParams.get('thumbnail') || '';
  const duration = searchParams.get('duration') || '';
  
  // Channel Info
  const rawChannel = searchParams.get('channel');
  const channelName = rawChannel && rawChannel !== 'undefined' ? rawChannel : 'ScanVidz Creator';
  const channelAvatar = searchParams.get('avatar') || `https://ui-avatars.com/api/?background=random&name=${channelName}`;

  // 2. STATE MANAGEMENT
  const [play, setPlay] = useState(false); // Default false: User must click thumbnail first
  const [playerState, setPlayerState] = useState<number>(-1); 
  const [related, setRelated] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(5);
  
  // Downloads
  const [showDownload, setShowDownload] = useState(false);
  const [formats, setFormats] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Engagement
  const [likes, setLikes] = useState(1540); 
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subCount, setSubCount] = useState("1.2M");
  
  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const playerRef = useRef<any>(null); 

  // 3. KEYBOARD CONTROLS
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

  // 4. SMART UP NEXT ALGORITHM
  useEffect(() => {
      if (title) {
        setSubCount(`${(Math.random() * 5 + 0.5).toFixed(1)}M`);
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

  // 5. AUTO PLAY NEXT LOGIC
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

  // 6. DOWNLOAD HANDLERS
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
      if (format.needs_merge) {
          setToastMsg("⚡ Processing High Quality Video... Please wait (10-30s)");
          setTimeout(() => setToastMsg(null), 10000);
      } else {
          setToastMsg("Download started in background! 🚀");
          setTimeout(() => setToastMsg(null), 5000); 
      }
      const isMerge = format.needs_merge ? "true" : "false";
      const url = `https://scanvidz-default.onrender.com/download?v=${videoId}&format_id=${format.format_id}&merge=${isMerge}`;
      window.open(url, '_blank'); 
  };

  // 7. ENGAGEMENT HANDLERS
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
          if (isDisliked) setIsDisliked(false);
      }
  };

  const handleDislike = () => {
      if (isDisliked) {
          setIsDisliked(false);
      } else {
          setIsDisliked(true);
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

  // 8. NAVIGATION & PLAYER EVENTS
  const playRelated = (video: any) => {
      setPlay(false);
      setPlayerState(-1);
      router.push(`/watch?v=${encodeURIComponent(video.link)}&title=${encodeURIComponent(video.title)}&views=${encodeURIComponent(video.views)}&duration=${encodeURIComponent(video.duration)}&thumbnail=${encodeURIComponent(video.thumbnail)}&channel=${encodeURIComponent(video.channel_name || '')}&avatar=${encodeURIComponent(video.channel_avatar || '')}`);
      window.scrollTo(0,0);
  };

  // 🔥 IMPORTANT FIX: Do NOT call event.target.playVideo() here!
  const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      // Removed event.target.playVideo(); to allow manual start for sound
  };

  const onPlayerStateChange = (event: any) => {
      setPlayerState(event.data);
  };

  // 9. UI RENDER START
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col font-sans">
       
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
           
           <div className="flex-1 p-4 lg:p-6 lg:pr-0 overflow-y-auto">
              
              {/* VIDEO PLAYER CONTAINER */}
              <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative group border border-gray-800">
                 {/* Logic: Only show YouTube player if 'play' is true AND videoId exists */}
                 {play && videoId ? (
                    <div className="w-full h-full relative group">
                       <YouTube
                          videoId={videoId}
                          className="w-full h-full"
                          iframeClassName="w-full h-full"
                          onReady={onPlayerReady}
                          onStateChange={onPlayerStateChange}
                          opts={{
                              playerVars: {
                                  autoplay: 1,   // Allows autoplay ONLY if triggered by user click on thumbnail
                                  playsinline: 1, // 🔥 Fix for iOS: Prevents forcing fullscreen
                                  controls: 1,
                                  modestbranding: 1,
                                  rel: 0, 
                                  showinfo: 0,
                                  iv_load_policy: 3, 
                              }
                          }}
                       />
                       
                       {/* NUCLEAR SHIELDS (To block ads/links) */}
                       <div className="absolute bottom-0 right-0 w-[150px] h-[90px] z-[9999]" style={{ pointerEvents: 'auto', background: 'rgba(255,0,0,0.01)' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}></div>
                       <div className="absolute top-0 right-0 w-[200px] h-[80px] z-[9999]" style={{ pointerEvents: 'auto', background: 'rgba(255,0,0,0.01)' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}></div>

                       {/* END SCREEN */}
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
                    // 🔥 THUMBNAIL (MANUAL START) - This is the Key for Mobile Sound!
                    <div className="absolute inset-0 flex items-center justify-center bg-cover bg-center cursor-pointer" style={{backgroundImage: `url(${thumbnail})`}} onClick={() => setPlay(true)}>
                       <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition"></div>
                       <div className="w-20 h-20 bg-red-600/90 hover:bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] hover:scale-110 transition z-10 backdrop-blur-sm">
                          <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       </div>
                       <div className="absolute bottom-4 right-4 bg-black/80 px-2 py-1 rounded text-sm font-bold">{duration}</div>
                    </div>
                 )}
              </div>

              {/* INFO SECTION */}
              <div className="mt-4">
                 <h1 className="text-xl md:text-2xl font-bold line-clamp-2 leading-snug">{title}</h1>
                 
                 <div className="flex flex-wrap items-center justify-between mt-4 pb-4 border-b border-gray-800 gap-4">
                    <div className="flex items-center gap-3">
                       <img src={channelAvatar} className="w-10 h-10 rounded-full bg-gray-700 object-cover" onError={(e:any) => e.target.src=`https://ui-avatars.com/api/?background=random&name=${channelName}`} />
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
                       <button onClick={handleDownload} disabled={loadingFormats} className="bg-[#272727] hover:bg-[#3f3f3f] border border-gray-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition">
                          {loadingFormats ? <span className="animate-spin">⏳</span> : '⬇ Download'}
                       </button>
                    </div>
                 </div>
                 
                 <div className="mt-8 mb-10">
                    <h3 className="text-xl font-bold mb-4">{comments.length} Comments</h3>
                    <form onSubmit={handleComment} className="flex gap-4 mb-8">
                        <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold flex-shrink-0">U</div>
                        <div className="flex-1">
                            <input type="text" className="w-full bg-transparent border-b border-gray-700 focus:border-white outline-none py-2 text-sm text-white placeholder-gray-500 transition" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
                            <div className="flex justify-end mt-2">
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold disabled:opacity-50" disabled={!newComment.trim()}>Comment</button>
                            </div>
                        </div>
                    </form>
                    <div className="space-y-6">
                        {comments.map((c, i) => (
                            <div key={i} className="flex gap-4">
                                <img src={c.avatar} className="w-10 h-10 rounded-full" />
                                <div>
                                    <div className="flex items-center gap-2"><span className="font-bold text-sm">{c.user}</span><span className="text-xs text-gray-500">{c.time}</span></div>
                                    <p className="text-sm mt-1 text-gray-200">{c.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
           </div>

           <div className="w-full lg:w-[420px] p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Up Next</h3></div>
              <div className="flex flex-col gap-3">
                 {related.map((vid, idx) => (
                    <div key={idx} onClick={() => playRelated(vid)} className="flex gap-2 cursor-pointer group hover:bg-[#1f1f1f] p-1 rounded-lg transition">
                       <div className="relative w-[168px] h-[94px] bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-800 group-hover:border-gray-600">
                          <img src={vid.thumbnail} className="w-full h-full object-cover" onError={(e:any) => e.target.src='https://via.placeholder.com/168x94'}/>
                          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded font-medium">{vid.duration}</span>
                       </div>
                       <div className="flex flex-col flex-1 py-1">
                          <h4 className="text-sm font-semibold line-clamp-2 leading-tight text-gray-100 group-hover:text-blue-400 transition">{vid.title}</h4>
                          <div className="mt-auto"><p className="text-xs text-gray-400 hover:text-white transition">{vid.channel_name || 'ScanVidz'}</p><p className="text-xs text-gray-500">{vid.views} views</p></div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
       </div>

       {showDownload && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-[#1f1f1f] border border-gray-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
                <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl">Select Quality</h3><button onClick={() => setShowDownload(false)} className="text-gray-400 hover:text-white bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center">✕</button></div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                   {formats.length > 0 ? formats.map((fmt: any, i) => (
                      <button key={i} onClick={() => startDownload(fmt)} className="w-full flex justify-between items-center bg-[#272727] hover:bg-blue-600 hover:text-white p-4 rounded-xl transition group">
                          <div className="flex flex-col items-start"><span className="font-bold text-lg">{fmt.quality || 'MP4'}</span><span className="text-xs text-gray-400 group-hover:text-blue-200 uppercase">{fmt.ext}</span></div>
                          <span className="text-sm font-mono bg-black/30 px-2 py-1 rounded">{fmt.size}</span>
                      </button>
                   )) : (<div className="text-center text-gray-400 py-4">No MP4 formats found.</div>)}
                </div>
             </div>
          </div>
       )}

       {toastMsg && (
         <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-2xl z-[150] flex items-center gap-3 animate-bounce">
            <span className="text-xl">⬇</span><span className="font-bold text-sm md:text-base whitespace-nowrap">{toastMsg}</span>
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