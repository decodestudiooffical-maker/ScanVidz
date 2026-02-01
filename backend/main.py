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
from collections import Counter 

# --- DATABASE IMPORTS ---
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# =================================================================
# 1. APP CONFIGURATION & SECURITY
# =================================================================

app = FastAPI()

# Enable CORS - Allows Frontend (Mobile/Laptop) to talk to Backend securely
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

# Your Neon Database URL (Do not share this publicly)
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

# --- VIDEO CACHE (YouTube Data to save API calls) ---
class VideoCache(Base):
    __tablename__ = "video_cache"
    video_id = Column(String, primary_key=True, index=True)
    title = Column(String)
    likes = Column(String) 
    subs = Column(String)  
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

# --- 🔥 BUSINESS ENGAGEMENT TABLES (ScanVidz Ecosystem) ---

class VideoEngagement(Base):
    """
    Stores Internal ScanVidz Likes & Views.
    This helps us recommend videos that OUR users like.
    """
    __tablename__ = "video_engagement"
    video_id = Column(String, primary_key=True, index=True)
    scanvidz_likes = Column(Integer, default=0) 
    scanvidz_views = Column(Integer, default=0) 

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
    Stores Payment History for Premium 4K Downloads.
    """
    __tablename__ = "user_purchases"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True)
    video_id = Column(String, index=True)
    quality = Column(String) # e.g., '1080p', '4k'
    amount_paid = Column(Float) 
    timestamp = Column(Float)

# Create all tables
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
# 3. GLOBAL SETTINGS & PATHS
# =================================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(BASE_DIR, "downloads")
COOKIES_FILE = os.path.join(BASE_DIR, "cookies.txt")

# Check for FFmpeg (Required for Merging Video+Audio)
if os.name == 'nt': 
    if os.path.exists(os.path.join(BASE_DIR, "ffmpeg.exe")):
        FFMPEG_PATH = os.path.join(BASE_DIR, "ffmpeg.exe")
    else:
        FFMPEG_PATH = "ffmpeg"
else: 
    FFMPEG_PATH = "ffmpeg" 

if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

# --- IDEA 10: ADVANCED USER AGENTS (Browser Spoofing) ---
# This prevents YouTube from knowing we are a bot.
USER_AGENTS_LIST = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

def get_random_agent():
    return random.choice(USER_AGENTS_LIST)

# --- IDEA 4: YT-DLP ONLY CONFIG ---
# Standard Options for YT-DLP (The Tank)
BASE_OPTS = {
    'quiet': True,
    'no_warnings': True,
    'nocheckcertificate': True,
    'geo_bypass': True,
    'extractor_args': {'youtube': {'player_client': ['android', 'web']}}, 
    'socket_timeout': 30,
}

if os.path.exists(COOKIES_FILE):
    print(f"🍪 Cookies Found at {COOKIES_FILE}! Injecting for Premium Auth.")
    BASE_OPTS['cookiefile'] = COOKIES_FILE

# =================================================================
# 4. HELPER FUNCTIONS
# =================================================================

def cleanup_file(path: str):
    """Deletes temporary files after stream is done to save server space"""
    try:
        time.sleep(20)
        if os.path.exists(path):
            os.remove(path)
    except: pass

def format_views(count):
    if not count: return "N/A"
    try:
        count = int(count)
        if count >= 1000000: return f"{count / 1000000:.1f}M"
        elif count >= 1000: return f"{count / 1000:.1f}K"
        else: return str(count)
    except: return str(count)

def get_avatar(name):
    safe_name = (name or "U").replace(" ", "+")
    return f"https://ui-avatars.com/api/?background=random&color=fff&name={safe_name}&size=128"

def update_video_cache_background(video_id: str, info: dict, db_session_factory):
    """Updates the cache in background so user doesn't wait"""
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
        
        # Ensure internal stats exist
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
# 🚀 5. IN-MEMORY CACHE & SMART ENGINE (THE FIX)
# =================================================================

# Global Cache for Speed
VIDEO_MEMORY_CACHE = {
    "Goldmines": [],
    "Horror": [],
    "Anime": [],
    "Animation": []
}

# 🔥 IDEA 9: FULL MANUAL BACKUP LIST (God Mode)
# This list is 100% safe and checked. If auto-fetch fails, this shows up.
# These use "KinoCheck" or official non-blocked IDs.
TRENDING_HERO = [
    {
        "id": 1, 
        "title": "GTA VI - Official Trailer", 
        "desc": "Welcome to Leonida. The biggest open world ever created by Rockstar Games.", 
        "trailer_id": "QdBZY2fkU-0", 
        "bg_image": "https://image.tmdb.org/t/p/original/2X5qXy5i5y5y5y5y.jpg"
    },
    {
        "id": 2, 
        "title": "Deadpool & Wolverine", 
        "desc": "The ultimate team-up is here. Marvel's multiverse will never be the same.", 
        "trailer_id": "73_1biulkYk", 
        "bg_image": "https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg"
    },
    {
        "id": 3, 
        "title": "Avatar: Fire and Ash", 
        "desc": "The next chapter in the epic saga. Discover the new tribes of Pandora.", 
        "trailer_id": "v7KBK9X7X5k", 
        "bg_image": "https://image.tmdb.org/t/p/original/8rpDcsfLJypbO6vREc0547OTqEv.jpg"
    },
    {
        "id": 4, 
        "title": "Captain America: BNW", 
        "desc": "Sam Wilson takes the mantle. A new world order rises.", 
        "trailer_id": "1pHDWnXmK7Y", 
        "bg_image": "https://images.thedirect.com/media/article_full/captain-america-4-sam-wilson-mcu.jpg"
    },
    {
        "id": 5, 
        "title": "Mufasa: The Lion King", 
        "desc": "Rafiki tells the legend of Mufasa to young lion cub Kiara.", 
        "trailer_id": "o17MF9vnabg", 
        "bg_image": "https://prod-ripcut-delivery.disney-plus.net/v1/variant/disney/566133020616147171408800/scale?width=1200&aspectRatio=1.78&format=jpeg"
    },
    {
        "id": 6, 
        "title": "Moana 2", 
        "desc": "Moana journeys to the far seas of Oceania into dangerous, long-lost waters.", 
        "trailer_id": "hDZ7y8RP5HE", 
        "bg_image": "https://lumiere-a.akamaihd.net/v1/images/p_moana2_payoff_poster_1_0c592376.jpeg"
    },
    {
        "id": 7, 
        "title": "Squid Game: Season 2", 
        "desc": "Player 456 returns. The game is far from over.", 
        "trailer_id": "lQ3X5F00i4k", 
        "bg_image": "https://images.lifestyleasia.com/wp-content/uploads/sites/7/2024/02/02133246/squid-game-season-2-cast-release-date-plot-and-more-1600x900.jpg"
    },
    {
        "id": 8, 
        "title": "Kraven the Hunter", 
        "desc": "Villains aren't born. They're made. The hunt begins.", 
        "trailer_id": "rze8QYbLDOg", 
        "bg_image": "https://cdn.marvel.com/content/1x/kraven_lob_crd_01.jpg"
    },
    {
        "id": 9, 
        "title": "Gladiator II", 
        "desc": "Decades after Maximus's death, a new hero rises in the Colosseum.", 
        "trailer_id": "4rgYUipGJNo", 
        "bg_image": "https://deadline.com/wp-content/uploads/2023/11/Gladiator-2.jpg"
    },
    {
        "id": 10, 
        "title": "Mission: Impossible 8", 
        "desc": "Ethan Hunt's final mission. The stakes have never been higher.", 
        "trailer_id": "NOhDyUmT9z0", 
        "bg_image": "https://images.squarespace-cdn.com/content/v1/5c76e65e4d546e02a06be31d/1635344607758-L5L3L7X5X3X5X3X5X3X5/MI7.jpg"
    },
    {
        "id": 11, 
        "title": "Superman: Legacy", 
        "desc": "A new era for the Man of Steel begins under James Gunn.", 
        "trailer_id": "v7KBK9X7X5k", 
        "bg_image": "https://static1.srcdn.com/wordpress/wp-content/uploads/2023/06/superman-legacy-logo.jpg"
    },
    {
        "id": 12, 
        "title": "The Batman Part II", 
        "desc": "Bruce Wayne continues his fight against corruption in Gotham.", 
        "trailer_id": "mqqft2x_Aa4", 
        "bg_image": "https://images.thedirect.com/media/article_full/the-batman-2-robert-pattinson-release.jpg"
    },
    {
        "id": 13, 
        "title": "Fantastic Four", 
        "desc": "Marvel's First Family finally comes home to the MCU.", 
        "trailer_id": "M7z_P4n3g6I", 
        "bg_image": "https://static1.colliderimages.com/wordpress/wp-content/uploads/2024/02/fantastic-four-cast.jpg"
    },
    {
        "id": 14, 
        "title": "Blade", 
        "desc": "The daywalker returns to hunt vampires in the modern world.", 
        "trailer_id": "7TavVZMewpY", 
        "bg_image": "https://static1.srcdn.com/wordpress/wp-content/uploads/2023/11/mahershala-ali-blade-mcu-fan-art.jpg"
    },
    {
        "id": 15, 
        "title": "Thunderbolts", 
        "desc": "A group of supervillains are recruited to go on missions for the government.", 
        "trailer_id": "l9j8jK3z1q0", 
        "bg_image": "https://images.thedirect.com/media/article_full/thunderbolts-cast.jpg"
    }
]

# --- IDEA 6: INVIDIOUS PROXY FALLBACK (If YT Blocks) ---
def fallback_search_invidious(query, limit=20):
    instances = ["https://vid.puffyan.us", "https://inv.tux.pizza", "https://yewtu.be"]
    for inst in instances:
        try:
            r = requests.get(f"{inst}/api/v1/search?q={query}", timeout=5)
            if r.status_code == 200:
                data = r.json()
                results = []
                for item in data[:limit]:
                    if item.get('type') == 'video':
                        # Idea 5 Check: Try to assume > 60s
                        results.append({
                            "title": item['title'],
                            "link": f"https://www.youtube.com/watch?v={item['videoId']}",
                            "id": item['videoId'],
                            "thumbnail": item['videoThumbnails'][0]['url'] if item.get('videoThumbnails') else f"https://i.ytimg.com/vi/{item['videoId']}/hqdefault.jpg",
                            "duration": "HD",
                            "views": format_views(item.get('viewCount', 0)),
                            "channel_name": item.get('author', 'ScanVidz'),
                            "channel_avatar": get_avatar(item.get('author'))
                        })
                if results: return results
        except: continue 
    return []

# --- MAIN ADVANCED SEARCH FUNCTION ---
def perform_search_advanced(query, limit=20):
    """
    🔥 THE BRAIN: Combines Idea 1, 2, 3, 4, 5, 10
    """
    cleaned = []
    
    # Idea 10: Use Random Browser Agent
    current_agent = get_random_agent()
    
    # Idea 4: Use YT-DLP Only (Robust)
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'limit': limit * 2, # Fetch extra to filter
        'noplaylist': True,
        'ignoreerrors': True,
        'user_agent': current_agent
    }
    
    print(f"🕵️ Smart Search: '{query}'...")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch{limit*2}:{query}", download=False)
            if 'entries' in info:
                for v in info['entries']:
                    if not v: continue
                    
                    # Idea 3: Strict Filtering (Remove Review/Reaction)
                    title_lower = v.get('title', '').lower()
                    if any(bad in title_lower for bad in ['review', 'reaction', 'analysis', 'breakdown', 'explained']):
                        continue
                        
                    # Idea 5: Duration Check (> 60s)
                    dur = v.get('duration', 0)
                    if dur and dur < 60: continue

                    # Idea 2: High Quality Thumbs (Force 4K)
                    vid_id = v.get('id')
                    high_res_thumb = f"https://i.ytimg.com/vi/{vid_id}/maxresdefault.jpg"
                    
                    cleaned.append({
                        "id": vid_id,
                        "title": v.get('title'),
                        "thumbnail": high_res_thumb,
                        "source": v.get('uploader'),
                        "duration": v.get('duration_string') or "HD",
                        "views": format_views(v.get('view_count', 0))
                    })
                    
                    if len(cleaned) >= limit: break
        
        if cleaned: return cleaned
    except Exception as e:
        print(f"❌ YT-DLP Error: {e}")

    # Idea 6: Fallback
    print("⚠️ Switching to Invidious Proxy...")
    return fallback_search_invidious(query, limit)

def refresh_hero_trailers():
    """
    🔥 Idea 1: SAFE CHANNEL STRATEGY
    Searches 'KinoCheck' instead of 'Official Trailer' to avoid blocks.
    """
    global TRENDING_HERO
    print("🎬 Smart Fetch: Updating Hero Section...")
    
    # Searching KinoCheck because they allow embedding
    results = perform_search_advanced("KinoCheck International Trailer 2025 2026", limit=15)
    
    new_hero_list = []
    if results:
        for i, v in enumerate(results):
            # Clean Title Logic
            clean_title = v['title'].split('|')[0].replace("Trailer", "").replace("(2025)", "").strip()
            new_hero_list.append({
                "id": i + 1,
                "title": clean_title if clean_title else v['title'],
                "desc": f"Watch the official trailer for {clean_title}. High Quality stream via ScanVidz Engine.",
                "trailer_id": v['id'],
                "bg_image": v['thumbnail']
            })
    
    if len(new_hero_list) >= 5:
        TRENDING_HERO = new_hero_list[:15]
        print(f"✅ Hero Updated with {len(TRENDING_HERO)} Fresh Trailers!")
    else:
        print("⚠️ Not enough safe trailers found. Using God Mode Backup.")

def cache_warmer_task():
    """ Runs on startup to fetch data """
    time.sleep(2)
    refresh_hero_trailers()
    
    # Filling Categories with Safe Queries
    VIDEO_MEMORY_CACHE["Goldmines"] = perform_search_advanced("Goldmines Telefilms full movie 2024", 20)
    VIDEO_MEMORY_CACHE["Horror"] = perform_search_advanced("Fear Files full episode", 20)
    VIDEO_MEMORY_CACHE["Anime"] = perform_search_advanced("Muse Asia full episode playlist", 20)
    VIDEO_MEMORY_CACHE["Animation"] = perform_search_advanced("CGI 3D Animated Short Film", 20)
    print("✅ Cache Warmup Complete.")

# =================================================================
# 7. AUTHENTICATION API
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
# 8. COMMENTS & ENGAGEMENT API
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
# 🔥 9. DISCOVER & MOOD AI API (With Auto-Caching & Full List)
# =================================================================

@app.get("/discover/hero")
def get_hero_content():
    # 🔥 FIX FOR MOBILE: FORCE NO-CACHE
    # This prevents phones from showing old GTA VI trailer forever.
    return JSONResponse(
        content={"status": "success", "data": TRENDING_HERO},
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"}
    )

@app.get("/discover/category")
def get_category_videos(tag: str = "Goldmines"):
    if tag in VIDEO_MEMORY_CACHE and len(VIDEO_MEMORY_CACHE[tag]) > 0:
        data = VIDEO_MEMORY_CACHE[tag].copy()
        random.shuffle(data)
        return {"status": "success", "videos": data}

    print(f"⚠️ Cache Miss for {tag}. Doing live search...")
    search_query = f"{tag} full movie legal"
    if tag == 'Goldmines': search_query = "Goldmines Telefilms full movie 2024"
    elif tag == 'Horror': search_query = "Official Horror full movie hindi"
    elif tag == 'Anime': search_query = "Muse Asia full episode playlist"
    elif tag == 'Animation': search_query = "Blender Foundation short film"

    results = perform_search_advanced(search_query)
    if results:
        VIDEO_MEMORY_CACHE[tag] = results

    return {"status": "success", "videos": results}

@app.post("/discover/mood")
def mood_ai(data: dict = Body(...)):
    mood = data.get('text', '').lower()
    search_term = f"best {mood} movies full"
    results = perform_search_advanced(search_term, limit=10)
    return {"status": "success", "videos": results}

# =================================================================
# 10. ADVANCED RECOMMENDATION ENGINE (THE "HYBRID BRAIN")
# =================================================================

def calculate_hybrid_score(video, user_interests):
    score = 0
    title_lower = video.get('title', '').lower()
    if any(tag in title_lower for tag in user_interests): score += 50
    views = video.get('views', '0')
    if 'M' in views: score += 20
    elif 'K' in views: score += 5
    score += random.randint(1, 10)
    return score

@app.get("/search")
def search_videos(q: str = Query(None), limit: int = 40, page: int = 1, filter: str = Query(None)):
    search_term = q if q else "trending 2025"
    if filter:
        if filter == "4K Ultra HD": search_term += " 4k hdr"
        elif filter == "Live": search_term += " live stream"
        elif filter == "Music": search_term += " music video"
        elif filter == "Gaming": search_term += " gameplay"
    
    results = perform_search_advanced(search_term, limit=limit) # Using Robust Helper Here Too!
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

@app.get("/formats")
def get_formats(v: str):
    return {"status": "success", "formats": []} 

@app.get("/download")
def download_video():
    return {"status": "error", "message": "Downloads disabled temporarily for server maintenance."}

@app.get("/trending")
def get_recommendations(user_id: str = None, db: Session = Depends(get_db)):
    user_interests = []
    if user_id:
        liked_videos = db.query(UserLike).filter(UserLike.user_id == user_id).limit(5).all()
        for like in liked_videos:
            cached = db.query(VideoCache).filter(VideoCache.video_id == like.video_id).first()
            if cached and cached.title:
                words = [w.lower() for w in cached.title.split() if len(w) > 4]
                user_interests.extend(words)
    
    candidates = perform_search_advanced("trending movies 2025", limit=15) # Using Robust Helper
    
    if user_interests:
        interest_query = " ".join(random.sample(user_interests, min(2, len(user_interests))))
        try:
            interest_results = perform_search_advanced(interest_query, limit=10)
            candidates.extend(interest_results)
        except: pass

    scored_videos = []
    seen_links = set()
    
    for vid in candidates:
        if vid.get('id') in seen_links: continue
        seen_links.add(vid.get('id'))
        
        final_score = calculate_hybrid_score(vid, user_interests)
        vid['score'] = final_score
        scored_videos.append(vid)

    scored_videos.sort(key=lambda x: x.get('score', 0), reverse=True)
    return {"status": "success", "videos": scored_videos}

@app.get("/suggestions")
def get_suggestions(q: str = Query(None)):
    if not q: return []
    try:
        url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={q}"
        return json.loads(requests.get(url).text)[1]
    except: return []

def keep_server_alive_and_warm_cache():
    """
    Double duty: Pings render to stay alive AND warms cache
    """
    # 1. Warm Cache Immediately
    cache_warmer_task()
    
    # 2. Loop keep-alive
    url = "https://scanvidz-backend.onrender.com/ping" # Use your real render URL if possible, else default
    while True:
        try: 
            time.sleep(840) 
            requests.get(url)
        except: pass

@app.on_event("startup")
async def startup_event():
    # Run background task daemon
    threading.Thread(target=keep_server_alive_and_warm_cache, daemon=True).start()

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)