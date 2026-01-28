import uvicorn
from fastapi import FastAPI, Query, HTTPException, Response, BackgroundTasks, Body, Depends
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import requests
import json
import time
import os
import shutil
import uuid
import threading 
import subprocess 
import random 

# --- DATABASE IMPORTS ---
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# =================================================================
# 1. APP CONFIGURATION & SECURITY
# =================================================================

app = FastAPI()

# Enable CORS (Allows Frontend to talk to Backend securely)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =================================================================
# 2. DATABASE SETUP (BUSINESS MODEL INTEGRATED)
# =================================================================

# Your Neon Database URL
SQLALCHEMY_DATABASE_URL = "postgresql://neondb_owner:npg_GP6XqUDHMZc5@ep-spring-surf-a1wl9hrh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    print("✅ Database Connected Successfully! Business Engine Ready.")
except Exception as e:
    print("❌ Database Connection Failed:", e)
    Base = declarative_base() 

# --- CORE USER TABLE ---
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    email_or_phone = Column(String, unique=True, index=True)
    password = Column(String)
    joined = Column(String)

# --- VIDEO CACHE (YouTube Data) ---
class VideoCache(Base):
    __tablename__ = "video_cache"
    video_id = Column(String, primary_key=True, index=True)
    title = Column(String)
    likes = Column(String) # Legacy YouTube Likes
    subs = Column(String)  # Legacy YouTube Subs
    views = Column(String)
    updated_at = Column(Float)

# --- COMMENTS TABLE ---
class Comment(Base):
    __tablename__ = "comments"
    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, index=True)
    user_name = Column(String)
    user_avatar = Column(String)
    text = Column(String)
    timestamp = Column(String)

# --- 🔥 NEW: BUSINESS ENGAGEMENT TABLES (ScanVidz Ecosystem) ---

class VideoEngagement(Base):
    """
    Stores Internal ScanVidz Likes & Views.
    This data belongs to YOU, and creators will pay to sync this.
    """
    __tablename__ = "video_engagement"
    video_id = Column(String, primary_key=True, index=True)
    scanvidz_likes = Column(Integer, default=0) # Likes on YOUR platform
    scanvidz_views = Column(Integer, default=0) # Views on YOUR platform

class UserLike(Base):
    """
    Tracks unique likes to prevent spam.
    One User = One Like per Video.
    """
    __tablename__ = "user_likes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    video_id = Column(String, index=True)

class UserPurchase(Base):
    """
    Stores Payment History.
    If a user buys a 4K video, record it here so they can download it again later freely.
    """
    __tablename__ = "user_purchases"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    video_id = Column(String, index=True)
    quality = Column(String) # e.g., '1080p', '4k'
    amount_paid = Column(Float) # e.g., 5.0, 40.0
    timestamp = Column(Float)

# Create all tables in the database
try:
    Base.metadata.create_all(bind=engine)
except:
    pass

# Dependency to get DB Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =================================================================
# 3. GLOBAL SETTINGS & PATHS (UPDATED FOR DOCKER)
# =================================================================

# Use absolute paths for Docker stability
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
COOKIES_FILE = os.path.join(BASE_DIR, "cookies.txt")

# Robust Cookie Finding Logic
if os.path.exists("cookies.txt"):
    COOKIES_FILE = os.path.abspath("cookies.txt")
elif os.path.exists("/app/cookies.txt"):
    COOKIES_FILE = "/app/cookies.txt"

if os.name == 'nt': 
    if os.path.exists(os.path.join(BASE_DIR, "ffmpeg.exe")):
        FFMPEG_PATH = os.path.join(BASE_DIR, "ffmpeg.exe")
    else:
        FFMPEG_PATH = "ffmpeg"
else: 
    FFMPEG_PATH = "ffmpeg" 

if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

# 🔥 USER-AGENT ROTATION (Prevents 0 MB & Block Issues)
USER_AGENTS_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
]

def get_random_agent():
    return random.choice(USER_AGENTS_LIST)

# 🔥 CLIENT IMPERSONATION & ANTI-BLOCK (UPDATED)
BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'nocheckcertificate': True,
    'geo_bypass': True,
    'source_address': '0.0.0.0', # 🔥 FORCE IPv4: Fixes Render Blocking
    'cachedir': False, # 🔥 DISABLE CACHE: Fixes Docker Permission Errors
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}}, # Use Android Client to bypass throttling
    'socket_timeout': 30,
}

if os.path.exists(COOKIES_FILE):
    print(f"🍪 Cookies Found at {COOKIES_FILE}! Injecting for Premium Auth.")
    BASE_OPTS['cookiefile'] = COOKIES_FILE
else:
    print("⚠️ Cookies file not found. Search functionality might be limited.")

# =================================================================
# 4. HELPER FUNCTIONS
# =================================================================

def cleanup_file(path: str):
    """Deletes temporary files after stream is done to save server space"""
    try:
        time.sleep(20)
        if os.path.exists(path):
            os.remove(path)
            print(f"🗑️ Deleted temp file: {path}")
    except Exception as e:
        print(f"⚠️ Error deleting file: {e}")

def format_views(count):
    if not count: return "0"
    try:
        count = int(count)
        if count >= 1000000: return f"{count / 1000000:.1f}M"
        elif count >= 1000: return f"{count / 1000:.1f}K"
        else: return str(count)
    except: return str(count)

def get_avatar(name):
    safe_name = (name or "U").replace(" ", "+")
    return f"https://ui-avatars.com/api/?background=random&color=fff&name={safe_name}&size=128"

# 🔥 BACKGROUND CACHE UPDATER
def update_video_cache_background(video_id: str, info: dict, db_session_factory):
    db = db_session_factory()
    try:
        cached_video = db.query(VideoCache).filter(VideoCache.video_id == video_id).first()
        real_likes = info.get('like_count', 0)
        real_views = format_views(info.get('view_count', 0))
        real_subs = format_views(info.get('channel_follower_count', 0))
        if real_subs == "N/A" or real_subs == "0": real_subs = "1M+"

        if cached_video:
            cached_video.likes = str(real_likes)
            cached_video.subs = str(real_subs)
            cached_video.updated_at = time.time()
        else:
            new_cache = VideoCache(
                video_id=video_id, title=info.get('title'),
                likes=str(real_likes), views=str(real_views), subs=str(real_subs),
                updated_at=time.time()
            )
            db.add(new_cache)
        
        internal_stats = db.query(VideoEngagement).filter(VideoEngagement.video_id == video_id).first()
        if not internal_stats:
            new_stats = VideoEngagement(video_id=video_id, scanvidz_likes=0, scanvidz_views=0)
            db.add(new_stats)
            
        db.commit()
    except Exception as e:
        print(f"⚠️ Background Cache Error: {e}")
    finally:
        db.close()

# =================================================================
# 🔥 5. SMART FALLBACK ENGINE (Invidious API)
# =================================================================

def fallback_search_invidious(query, limit=20):
    """
    Plan B: If YouTube blocks IP, fetch data from Public Invidious Mirrors.
    This guarantees results even if Render IP is banned.
    """
    print(f"⚠️ Activating Fallback for: {query}")
    instances = [
        "https://vid.puffyan.us", 
        "https://inv.tux.pizza", 
        "https://yewtu.be"
    ]
    
    for inst in instances:
        try:
            # Try to fetch search results
            r = requests.get(f"{inst}/api/v1/search?q={query}", timeout=5)
            if r.status_code == 200:
                data = r.json()
                results = []
                for item in data[:limit]:
                    if item.get('type') == 'video':
                        # Convert Invidious format to ScanVidz format
                        results.append({
                            "title": item['title'],
                            "link": f"https://www.youtube.com/watch?v={item['videoId']}",
                            "id": item['videoId'],
                            "thumbnail": item['videoThumbnails'][0]['url'] if item.get('videoThumbnails') else f"https://i.ytimg.com/vi/{item['videoId']}/hqdefault.jpg",
                            "duration": "HD", # Invidious formats duration differently, using generic
                            "views": format_views(item.get('viewCount', 0)),
                            "channel_name": item.get('author', 'ScanVidz'),
                            "channel_avatar": get_avatar(item.get('author'))
                        })
                if results:
                    print(f"✅ Fallback Successful via {inst}")
                    return results
        except:
            continue # Try next instance if one fails
    
    print("❌ All Fallbacks Failed.")
    return []

# =================================================================
# 6. AUTHENTICATION API
# =================================================================

class UserSignup(BaseModel):
    name: str; email_or_phone: str; password: str

class UserLogin(BaseModel):
    email_or_phone: str; password: str

@app.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email_or_phone == user.email_or_phone).first()
    if existing: raise HTTPException(status_code=400, detail="User exists")
    new_user = User(id=str(uuid.uuid4()), name=user.name, email_or_phone=user.email_or_phone, password=user.password, joined=time.strftime("%Y-%m-%d"))
    db.add(new_user); db.commit()
    return {"status": "success", "user": new_user}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email_or_phone == user.email_or_phone, User.password == user.password).first()
    if not db_user: raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"status": "success", "user": db_user}

@app.get("/me")
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(status_code=404, detail="Not found")
    return {"status": "success", "user": user}

# =================================================================
# 7. COMMENTS API
# =================================================================

class CommentModel(BaseModel):
    video_id: str; user_name: str; user_avatar: str; text: str

@app.post("/comments")
def post_comment(comment: CommentModel, db: Session = Depends(get_db)):
    new_comment = Comment(id=str(uuid.uuid4()), video_id=comment.video_id, user_name=comment.user_name, user_avatar=comment.user_avatar, text=comment.text, timestamp="Just now")
    db.add(new_comment); db.commit()
    return {"status": "success", "comment": new_comment}

@app.get("/comments")
def get_comments(v: str, db: Session = Depends(get_db)):
    comments = db.query(Comment).filter(Comment.video_id == v).all()
    return {"status": "success", "comments": comments[::-1]}

# =================================================================
# 🔥 8. BUSINESS LOGIC (ALGORITHMS FOR CREATOR ECONOMY)
# =================================================================

class LikeRequest(BaseModel):
    user_id: str; video_id: str

@app.post("/toggle_like")
def toggle_like(req: LikeRequest, db: Session = Depends(get_db)):
    existing_like = db.query(UserLike).filter(UserLike.user_id == req.user_id, UserLike.video_id == req.video_id).first()
    video_stats = db.query(VideoEngagement).filter(VideoEngagement.video_id == req.video_id).first()
    
    if not video_stats:
        video_stats = VideoEngagement(video_id=req.video_id, scanvidz_likes=0, scanvidz_views=0)
        db.add(video_stats)

    liked = False
    if existing_like:
        db.delete(existing_like)
        video_stats.scanvidz_likes = max(0, video_stats.scanvidz_likes - 1)
        liked = False
    else:
        new_like = UserLike(user_id=req.user_id, video_id=req.video_id)
        db.add(new_like)
        video_stats.scanvidz_likes += 1
        liked = True
    
    db.commit()
    return {"status": "success", "liked": liked, "total_likes": video_stats.scanvidz_likes}

class ViewRequest(BaseModel):
    video_id: str

@app.post("/increment_view")
def increment_view(req: ViewRequest, db: Session = Depends(get_db)):
    video_stats = db.query(VideoEngagement).filter(VideoEngagement.video_id == req.video_id).first()
    if not video_stats:
        video_stats = VideoEngagement(video_id=req.video_id, scanvidz_likes=0, scanvidz_views=1)
        db.add(video_stats)
    else:
        video_stats.scanvidz_views += 1
    db.commit()
    return {"status": "success", "total_views": video_stats.scanvidz_views}

class PurchaseRequest(BaseModel):
    user_id: str; video_id: str; quality: str; amount: float

@app.post("/buy_video")
def buy_video(req: PurchaseRequest, db: Session = Depends(get_db)):
    new_purchase = UserPurchase(user_id=req.user_id, video_id=req.video_id, quality=req.quality, amount_paid=req.amount, timestamp=time.time())
    db.add(new_purchase); db.commit()
    return {"status": "success", "message": "Payment Successful! Download unlocked."}

# =================================================================
# 9. VIDEO DATA API (SEARCH & TRENDING with FALLBACK)
# =================================================================

@app.get("/")
def home(): return {"message": "ScanVidz Business Engine Running 🚀"}

@app.get("/ping")
def ping_server(): return {"status": "awake"}

@app.get("/suggestions")
def get_suggestions(q: str = Query(None)):
    if not q: return []
    try:
        url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={q}"
        return json.loads(requests.get(url).text)[1]
    except: return []

@app.get("/search")
def search_videos(q: str = Query(None), limit: int = 40, page: int = 1, filter: str = Query(None)):
    search_term = q if q else "trending"
    if filter:
        if filter == "4K Ultra HD": search_term += " 4k hdr"
        elif filter == "Live": search_term += " live stream"
        elif filter == "Music": search_term += " music video"
        elif filter == "Gaming": search_term += " gameplay"
    
    # PLAN A: Try YT-DLP First
    ydl_opts = {
        **BASE_OPTS, 
        'extract_flat': True, 
        'noplaylist': True, 
        'limit': limit * page,
        'ignoreerrors': True 
    }
    
    results = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch{limit*page}:{search_term}", download=False)
            if 'entries' in info and len(info['entries']) > 0:
                start = (page - 1) * limit
                for vid in info['entries'][start : start+limit]:
                    if vid:
                        results.append({"title": vid.get('title'), "link": vid.get('url') or f"https://www.youtube.com/watch?v={vid.get('id')}", "id": vid.get('id'), "thumbnail": vid.get('thumbnail') or f"https://i.ytimg.com/vi/{vid.get('id')}/hqdefault.jpg", "duration": vid.get('duration_string') or "HD", "views": format_views(vid.get('view_count')), "channel_name": vid.get('uploader') or "ScanVidz", "channel_avatar": get_avatar(vid.get('uploader'))})
                
                # If Plan A works, return results
                if len(results) > 0:
                    return {"status": "success", "results": results, "page": page}
    except Exception as e:
        print(f"Plan A (YT-DLP) Failed: {e}")

    # PLAN B: Fallback to Invidious if Plan A failed or returned 0 results
    if not results:
        results = fallback_search_invidious(search_term, limit)
    
    return {"status": "success", "results": results, "page": page}

@app.get("/meta")
def get_meta(v: str, user_id: str = None, db: Session = Depends(get_db)):
    if not v: return {"status": "error"}
    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    
    stats = db.query(VideoEngagement).filter(VideoEngagement.video_id == video_id).first()
    total_likes = stats.scanvidz_likes if stats else 0
    total_views = stats.scanvidz_views if stats else 0
    
    is_liked = False
    if user_id:
        user_like = db.query(UserLike).filter(UserLike.user_id == user_id, UserLike.video_id == video_id).first()
        is_liked = True if user_like else False

    cached_video = db.query(VideoCache).filter(VideoCache.video_id == video_id).first()
    subs = cached_video.subs if cached_video and cached_video.subs != "Loading..." else "0"

    return {
        "status": "success",
        "meta": {
            "likes": total_likes, 
            "views": total_views, 
            "subs": subs,
            "is_liked": is_liked
        }
    }

# 🔥 FORMATS API
@app.get("/formats")
def get_formats(v: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not v: return {"status": "error"}
    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    current_agent = get_random_agent()
    ydl_opts = BASE_OPTS.copy()
    ydl_opts['http_headers'] = {'User-Agent': current_agent}
    formats_list = []

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            background_tasks.add_task(update_video_cache_background, video_id, info, SessionLocal)
            
            for f in info.get('formats', []):
                if f.get('ext') in ['mp4', 'webm'] and f.get('protocol') in ['https', 'http']:
                    height = f.get('height') or 0
                    if height < 144: continue
                    size_mb = f.get('filesize', 0) / (1024 * 1024) if f.get('filesize') else 0
                    
                    price = 0
                    if height == 1080: price = 5
                    elif height == 1440: price = 15 
                    elif height == 2160: price = 40 
                    elif height == 4320: price = 100 
                    
                    quality_label = f"{height}p"
                    if price > 0: quality_label += f" (Premium ₹{price})"
                    else: quality_label += " (Free)"

                    needs_merge = height >= 1080
                    formats_list.append({"format_id": f['format_id'], "quality": quality_label, "ext": "mp4", "size": f"{size_mb:.1f} MB" if size_mb > 0 else "High Quality", "height": height, "needs_merge": needs_merge, "price": price})
            
            formats_list.sort(key=lambda x: x['height'], reverse=True)
            unique_formats = []
            seen = set()
            for f in formats_list:
                if f['height'] not in seen: unique_formats.append(f); seen.add(f['height'])
            
            return {"status": "success", "formats": unique_formats, "title": info.get('title')}
    except Exception as e: return {"status": "error", "message": str(e)}

# =================================================================
# 🔥 10. DOWNLOAD API (11-in-1 Engine + PAYMENT WALL)
# =================================================================

@app.get("/download")
def download_video(v: str, format_id: str, user_id: str = None, background_tasks: BackgroundTasks = None, merge: str = "false", db: Session = Depends(get_db)):
    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    current_agent = get_random_agent()

    # 🚀 SECURITY: CHECK PAYMENT STATUS
    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(video_url, download=False)
            target_format = next((f for f in info['formats'] if f['format_id'] == format_id), None)
            
            if target_format:
                height = target_format.get('height', 0)
                if height > 720: 
                    if not user_id:
                        return JSONResponse(status_code=401, content={"status": "error", "message": "Login Required for Premium Download"})
                    
                    purchase = db.query(UserPurchase).filter(UserPurchase.user_id == user_id, UserPurchase.video_id == video_id, UserPurchase.quality == f"{height}p").first()
                    if not purchase:
                        purchase = db.query(UserPurchase).filter(UserPurchase.user_id == user_id, UserPurchase.video_id == video_id).first()

                    if not purchase:
                        return JSONResponse(status_code=402, content={"status": "error", "message": f"Payment Required for {height}p. Please buy this video to support the platform."})
    except Exception as e:
        print(f"Payment Check Warning: {e}") 

    # 🚀 STRATEGY 1: DIRECT REDIRECT (Fastest)
    if merge != "true":
        try:
            opts = BASE_OPTS.copy()
            opts['http_headers'] = {'User-Agent': current_agent}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                target_url = next((f['url'] for f in info['formats'] if f['format_id'] == format_id), info.get('url'))
                return RedirectResponse(url=target_url)
        except: pass

    # 🚀 STRATEGY 2: RESILIENT STREAMING (Secure Pipe)
    try:
        def stream_generator():
            opts = BASE_OPTS.copy()
            opts['format'] = f"{format_id}+bestaudio[ext=m4a]/bestaudio/best"
            opts['http_headers'] = {'User-Agent': current_agent}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                formats = info.get('formats', [])
                video_fmt = next((f for f in formats if f['format_id'] == format_id), None)
                audio_fmt = next((f for f in formats if f.get('acodec') != 'none' and f.get('vcodec') == 'none'), None)
                if not video_fmt: video_fmt = next((f for f in formats if f['ext'] == 'mp4'), None)
                v_url = video_fmt['url'] if video_fmt else None
                a_url = audio_fmt['url'] if audio_fmt else None

            if not v_url: raise Exception("No URL")

            cmd = [FFMPEG_PATH, '-loglevel', 'error', '-headers', f'User-Agent: {current_agent}', '-i', v_url]
            if a_url: cmd.extend(['-headers', f'User-Agent: {current_agent}']); cmd.extend(['-i', a_url])
            cmd.extend(['-c:v', 'copy', '-c:a', 'aac', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', '-preset', 'ultrafast', 'pipe:1'])

            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=10**7)
            while True:
                chunk = process.stdout.read(64 * 1024)
                if not chunk: break
                yield chunk
            process.stdout.close(); process.wait()

        return StreamingResponse(stream_generator(), media_type="video/mp4", headers={"Content-Disposition": f'attachment; filename="ScanVidz_{video_id}.mp4"'})
    except Exception as e:
        return {"status": "error", "message": "Download failed."}

@app.get("/trending")
def get_trending():
    # Attempt Plan A
    ydl_opts = {**BASE_OPTS, 'extract_flat': True, 'limit': 20}
    results = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info("https://www.youtube.com/feed/trending", download=False)
            if 'entries' in info:
                for vid in info['entries']:
                    if vid:
                        results.append({"title": vid.get('title'), "link": vid.get('url'), "thumbnail": vid.get('thumbnail'), "duration": "Hot", "views": format_views(vid.get('view_count')), "channel_name": vid.get('uploader'), "channel_avatar": get_avatar(vid.get('uploader'))})
                if results: return {"status": "success", "videos": results}
    except: pass
    
    # 🔥 PLAN B: Fallback to Invidious
    return {"status": "success", "videos": fallback_search_invidious("trending", limit=20)}

# 🔥 AUTO KEEP-ALIVE SYSTEM
def keep_server_alive():
    url = "https://scanvidz-docker.onrender.com/ping" # Changed to Docker URL
    while True:
        try:
            time.sleep(840)
            requests.get(url)
        except: pass

@app.on_event("startup")
async def startup_event():
    threading.Thread(target=keep_server_alive, daemon=True).start()

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)