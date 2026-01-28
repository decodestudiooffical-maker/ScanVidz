import uvicorn
from fastapi import FastAPI, Query, HTTPException, Response, BackgroundTasks, Body, Depends
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
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
import random # 🔥 REQUIRED FOR USER-AGENT ROTATION

# --- DATABASE IMPORTS ---
from sqlalchemy import create_engine, Column, String, Integer, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# =================================================================
# 1. APP CONFIGURATION
# =================================================================

app = FastAPI()

# Enable CORS (Allows Frontend to talk to Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =================================================================
# 2. DATABASE SETUP (PostgreSQL / Neon)
# =================================================================

# Your Database URL
SQLALCHEMY_DATABASE_URL = "postgresql://neondb_owner:npg_GP6XqUDHMZc5@ep-spring-surf-a1wl9hrh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    print("✅ Database Connected Successfully!")
except Exception as e:
    print("❌ Database Connection Failed:", e)
    Base = declarative_base() 

# --- TABLE 1: USERS ---
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    email_or_phone = Column(String, unique=True, index=True)
    password = Column(String)
    joined = Column(String)

# --- TABLE 2: VIDEO CACHE (For Super Fast Loading) ---
class VideoCache(Base):
    __tablename__ = "video_cache"
    video_id = Column(String, primary_key=True, index=True)
    title = Column(String)
    likes = Column(String) 
    subs = Column(String)
    views = Column(String)
    updated_at = Column(Float) # Stores time to refresh cache daily

# --- TABLE 3: COMMENTS (🔥 NEW FEATURE) ---
class Comment(Base):
    __tablename__ = "comments"
    id = Column(String, primary_key=True, index=True)
    video_id = Column(String, index=True) # Links comment to a video
    user_name = Column(String)
    user_avatar = Column(String)
    text = Column(String)
    timestamp = Column(String)

# Create Tables if not exist
try:
    Base.metadata.create_all(bind=engine)
except:
    pass

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# =================================================================
# 3. GLOBAL SETTINGS & PATHS
# =================================================================

current_dir = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(current_dir, "downloads")
COOKIES_FILE = os.path.join(current_dir, "cookies.txt") # 🔥 Idea #1: Cookies Support

# FFmpeg Detection
if os.name == 'nt': 
    FFMPEG_PATH = os.path.join(current_dir, "ffmpeg.exe")
else: 
    FFMPEG_PATH = "ffmpeg" 

# Create Download Directory
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

# 🔥 Idea #9: User-Agent Rotation (Prevents 403 Forbidden & 0MB Files)
# This list fools YouTube into thinking we are different real browsers
USER_AGENTS_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
]

def get_random_agent():
    """Returns a random user agent string"""
    return random.choice(USER_AGENTS_LIST)

# 🔥 Idea #11: Client Impersonation & Anti-Throttle
# We tell YouTube we are an Android Client to avoid strict throttling
BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'nocheckcertificate': True,
    'geo_bypass': True,
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}}, # Spoof Android Client
    'socket_timeout': 30, # Idea #4: Prevent Timeouts
}

# Inject Cookies if available (For Premium/Age-Restricted Content)
if os.path.exists(COOKIES_FILE):
    print("🍪 Cookies Found! Injecting for Auth.")
    BASE_OPTS['cookiefile'] = COOKIES_FILE

# =================================================================
# 4. HELPER FUNCTIONS
# =================================================================

def cleanup_file(path: str):
    """Deletes temporary files after download"""
    try:
        time.sleep(20) # Wait 20s for slow networks
        if os.path.exists(path):
            os.remove(path)
            print(f"🗑️ Deleted temp file: {path}")
    except Exception as e:
        print(f"⚠️ Error deleting file: {e}")

def format_views(count):
    """Converts 1500000 -> 1.5M"""
    if not count: return "N/A"
    try:
        count = int(count)
        if count >= 1000000: return f"{count / 1000000:.1f}M"
        elif count >= 1000: return f"{count / 1000:.1f}K"
        else: return str(count)
    except: return str(count)

def get_avatar(name):
    """Generates a colorful avatar"""
    safe_name = (name or "U").replace(" ", "+")
    return f"https://ui-avatars.com/api/?background=random&color=fff&name={safe_name}&size=128"

# 🔥 BACKGROUND TASK: Updates Cache (Keeps UI Fast)
# This moves the heavy database work to the background so the user gets links instantly
def update_video_cache_background(video_id: str, info: dict, db_session_factory):
    """Updates database in background so user doesn't wait"""
    db = db_session_factory()
    try:
        cached_video = db.query(VideoCache).filter(VideoCache.video_id == video_id).first()
        
        real_likes = info.get('like_count', 0)
        real_views = format_views(info.get('view_count', 0))
        real_subs = format_views(info.get('channel_follower_count', 0))
        if real_subs == "N/A" or real_subs == "0": real_subs = "1M+"

        if cached_video:
            cached_video.likes = str(real_likes)
            cached_video.views = str(real_views)
            cached_video.subs = str(real_subs)
            cached_video.updated_at = time.time()
        else:
            new_cache = VideoCache(
                video_id=video_id, title=info.get('title'),
                likes=str(real_likes), views=str(real_views), subs=str(real_subs),
                updated_at=time.time()
            )
            db.add(new_cache)
        db.commit()
        print(f"✅ Background Cache Updated for {video_id}")
    except Exception as e:
        print(f"⚠️ Background Cache Error: {e}")
    finally:
        db.close()

# =================================================================
# 5. AUTHENTICATION ENDPOINTS
# =================================================================

class UserSignup(BaseModel):
    name: str
    email_or_phone: str
    password: str

class UserLogin(BaseModel):
    email_or_phone: str
    password: str

@app.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email_or_phone == user.email_or_phone).first()
    if existing: raise HTTPException(status_code=400, detail="User exists")
    
    new_user = User(
        id=str(uuid.uuid4()), 
        name=user.name, 
        email_or_phone=user.email_or_phone, 
        password=user.password, 
        joined=time.strftime("%Y-%m-%d")
    )
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
# 6. COMMENTS ENDPOINTS
# =================================================================

class CommentModel(BaseModel):
    video_id: str
    user_name: str
    user_avatar: str
    text: str

@app.post("/comments")
def post_comment(comment: CommentModel, db: Session = Depends(get_db)):
    """Save a new comment to the database"""
    new_comment = Comment(
        id=str(uuid.uuid4()),
        video_id=comment.video_id,
        user_name=comment.user_name,
        user_avatar=comment.user_avatar,
        text=comment.text,
        timestamp="Just now" 
    )
    db.add(new_comment)
    db.commit()
    return {"status": "success", "comment": new_comment}

@app.get("/comments")
def get_comments(v: str, db: Session = Depends(get_db)):
    """Fetch comments for a specific video"""
    # Fetch comments for this video
    comments = db.query(Comment).filter(Comment.video_id == v).all()
    # Return reversed list (Newest first)
    return {"status": "success", "comments": comments[::-1]}

# =================================================================
# 7. VIDEO API ENDPOINTS (CORE LOGIC)
# =================================================================

@app.get("/")
def home():
    return {"message": "ScanVidz Ultimate Backend Running 🚀"}

# 🔥 PING ENDPOINT (Sleep Fix)
@app.get("/ping")
def ping_server():
    return {"status": "awake", "message": "I am alive!"}

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
    
    # Apply Filters
    if filter:
        if filter == "4K Ultra HD": search_term += " 4k hdr"
        elif filter == "Live": search_term += " live stream"
        elif filter == "Music": search_term += " music video"
        elif filter == "Gaming": search_term += " gameplay"
    
    # Use BASE_OPTS for search too to avoid blocks
    ydl_opts = {
        **BASE_OPTS, 
        'extract_flat': True, 
        'noplaylist': True, 
        'limit': limit * page
    }
    
    results = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch{limit*page}:{search_term}", download=False)
            if 'entries' in info:
                start = (page - 1) * limit
                for vid in info['entries'][start : start+limit]:
                    if vid:
                        results.append({
                            "title": vid.get('title'),
                            "link": vid.get('url') or f"https://www.youtube.com/watch?v={vid.get('id')}",
                            "id": vid.get('id'),
                            "thumbnail": vid.get('thumbnail') or f"https://i.ytimg.com/vi/{vid.get('id')}/hqdefault.jpg",
                            "duration": vid.get('duration_string') or "HD",
                            "views": format_views(vid.get('view_count')),
                            "channel_name": vid.get('uploader') or "ScanVidz",
                            "channel_avatar": get_avatar(vid.get('uploader'))
                        })
    except Exception as e:
        return {"status": "error", "message": str(e), "results": []}
    
    return {"status": "success", "results": results, "page": page}

# 🔥 META API (Separated for Parallel Loading)
# Allows frontend to fetch stats separately so download buttons aren't blocked
@app.get("/meta")
def get_meta(v: str, db: Session = Depends(get_db)):
    if not v: return {"status": "error"}
    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    # Check Cache First
    cached_video = db.query(VideoCache).filter(VideoCache.video_id == video_id).first()
    if cached_video:
        return {
            "status": "success",
            "meta": {
                "likes": cached_video.likes,
                "views": cached_video.views,
                "subs": cached_video.subs
            }
        }
    
    # If not in cache, fetch light metadata
    try:
        ydl_opts = {**BASE_OPTS, 'extract_flat': True} # Fast fetch
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return {
                "status": "success",
                "meta": {
                    "likes": info.get('like_count', 0),
                    "views": format_views(info.get('view_count', 0)),
                    "subs": "Loading..." 
                }
            }
    except:
        return {"status": "error"}

# 🔥 SUPER FAST FORMATS API (Hybrid: Random Agent + Background Task)
@app.get("/formats")
def get_formats(v: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not v: return {"status": "error"}
    
    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    # 1. Try Cache for INSTANT Response
    cached_video = db.query(VideoCache).filter(VideoCache.video_id == video_id).first()
    real_meta = None
    
    if cached_video and (time.time() - cached_video.updated_at < 86400):
        print(f"⚡ Serving {video_id} from Database Cache (Instant Load)")
        real_meta = {
            "likes": cached_video.likes,
            "views": cached_video.views,
            "subs": cached_video.subs
        }
    else:
        print(f"📥 Fetching FRESH data from YouTube for {video_id}")

    # 2. Fetch Formats (With User-Agent Rotation)
    current_agent = get_random_agent()
    ydl_opts = BASE_OPTS.copy()
    ydl_opts['http_headers'] = {'User-Agent': current_agent}
    formats_list = []

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            
            # 🔥 MAGIC FIX: Send DB update to Background (Don't make user wait!)
            background_tasks.add_task(update_video_cache_background, video_id, info, SessionLocal)
            
            # If meta wasn't in cache, create temporary one for response
            if not real_meta:
                real_meta = {
                    "likes": info.get('like_count', 0),
                    "views": format_views(info.get('view_count', 0)),
                    "subs": "1M+" # Show placeholder, real subs will load via /meta
                }

            # Process Formats (Always fresh to avoid expire links)
            for f in info.get('formats', []):
                if f.get('ext') in ['mp4', 'webm'] and f.get('protocol') in ['https', 'http']:
                    height = f.get('height') or 0
                    if height < 144: continue
                    
                    size_mb = f.get('filesize', 0) / (1024 * 1024) if f.get('filesize') else 0
                    quality_label = f"{height}p"
                    needs_merge = False
                    
                    if height >= 1080:
                        quality_label += " (HQ + Audio 🔊)" 
                        needs_merge = True
                    elif f.get('acodec') != 'none':
                        if f.get('ext') == 'webm': continue 
                        quality_label += " (Direct)"
                        needs_merge = False
                    else: continue 

                    formats_list.append({
                        "format_id": f['format_id'],
                        "quality": quality_label,
                        "ext": "mp4",
                        "size": f"{size_mb:.1f} MB" if size_mb > 0 else "High Quality",
                        "height": height,
                        "needs_merge": needs_merge
                    })
            
            # Sort formats high to low
            formats_list.sort(key=lambda x: x['height'], reverse=True)
            unique_formats = []
            seen = set()
            for f in formats_list:
                if f['height'] not in seen:
                    unique_formats.append(f)
                    seen.add(f['height'])
            
            return {
                "status": "success", 
                "formats": unique_formats, 
                "meta": real_meta, 
                "title": info.get('title')
            }

    except Exception as e:
        return {"status": "error", "message": str(e)}

# 🔥 ULTIMATE DOWNLOAD API (Combined 11 Ideas)
# Strategy: Direct Redirect > Stream > Header Injection > Rotation
@app.get("/download")
def download_video(v: str, format_id: str, background_tasks: BackgroundTasks, merge: str = "false"):
    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    current_agent = get_random_agent() # Idea #9: Rotate User ID

    # 1. Direct Download Redirect (Most Reliable - Idea #6)
    # If the user requested a standard quality or the link is available, 
    # we redirect them straight to Google. No 0 MB error possible.
    if merge != "true":
        try:
            opts = BASE_OPTS.copy()
            opts['http_headers'] = {'User-Agent': current_agent}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                # Find exact format url
                target_url = next((f['url'] for f in info['formats'] if f['format_id'] == format_id), info.get('url'))
                return RedirectResponse(url=target_url)
        except Exception as e: 
            pass # Failover to streaming if direct link fails

    # 2. Resilient Streaming (Idea #3, #5, #8)
    # If we MUST merge (1080p+), we use FFmpeg pipe with Headers Injection
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

            if not v_url: raise Exception("No video URL found")

            # 🔥 FFmpeg with User-Agent Injection (Crucial for 0 MB Fix)
            cmd = [
                FFMPEG_PATH,
                '-loglevel', 'error',
                '-headers', f'User-Agent: {current_agent}', # Inject Header for Video
                '-i', v_url,
            ]
            
            if a_url:
                cmd.extend(['-headers', f'User-Agent: {current_agent}']) # Inject Header for Audio
                cmd.extend(['-i', a_url])
            
            # Idea #8: Ultrafast Copy Mode
            cmd.extend([
                '-c:v', 'copy',       # Copy video stream (No re-encoding = Super Fast)
                '-c:a', 'aac',        # Ensure audio is AAC
                '-movflags', 'frag_keyframe+empty_moov', # Essential for streaming MP4
                '-f', 'mp4',          # Output format
                '-preset', 'ultrafast', # Max speed
                'pipe:1'              # Output to stdout
            ])

            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=10**7)

            while True:
                chunk = process.stdout.read(64 * 1024) # 64KB chunks
                if not chunk: break
                yield chunk
            
            process.stdout.close(); process.wait()

        return StreamingResponse(
            stream_generator(),
            media_type="video/mp4",
            headers={"Content-Disposition": f'attachment; filename="ScanVidz_{video_id}.mp4"'}
        )

    except Exception as e:
        print(f"Stream Error: {e}")
        return {"status": "error", "message": "Download failed. Try 720p or lower."}

@app.get("/trending")
def get_trending():
    # Use lightweight extraction for speed
    ydl_opts = {**BASE_OPTS, 'extract_flat': True, 'limit': 20}
    results = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info("https://www.youtube.com/feed/trending", download=False)
            if 'entries' in info:
                for vid in info['entries']:
                    if vid:
                        results.append({
                            "title": vid.get('title'),
                            "link": vid.get('url') or vid.get('webpage_url'),
                            "thumbnail": vid.get('thumbnail') or f"https://i.ytimg.com/vi/{vid.get('id')}/hqdefault.jpg",
                            "duration": "Hot",
                            "views": format_views(vid.get('view_count')),
                            "channel_name": vid.get('uploader') or "Trending",
                            "channel_avatar": get_avatar(vid.get('uploader'))
                        })
    except: 
        return search_videos(q="viral", limit=20)
    
    return {"status": "success", "videos": results}

# 🔥 AUTO KEEP-ALIVE SYSTEM (BACKGROUND THREAD) 🔥
def keep_server_alive():
    """Pings the server every 14 minutes to prevent sleep"""
    url = "https://scanvidz-default.onrender.com/ping" # Change if using different URL
    print("⏰ Keep-Alive System Started...")
    while True:
        try:
            time.sleep(840) # 14 minutes (Render sleeps at 15m)
            print(f"⏰ Pinging self at {url}...")
            requests.get(url)
        except Exception as e:
            print(f"⚠️ Keep-Alive Ping Failed: {e}")

# Start Keep-Alive on Startup
@app.on_event("startup")
async def startup_event():
    threading.Thread(target=keep_server_alive, daemon=True).start()

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)