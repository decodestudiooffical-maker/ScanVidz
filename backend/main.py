import uvicorn
from fastapi import FastAPI, Query, HTTPException, Response, BackgroundTasks, Body, Depends
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp
import requests
import json
import time
import os
import shutil
import uuid

# --- DATABASE IMPORTS ---
from sqlalchemy import create_engine, Column, String, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

app = FastAPI()

# --- 1. CORS CONFIGURATION ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# ⚙️ DATABASE SETUP (PostgreSQL)
# ---------------------------------------------------------

# 👇 APNA DATABASE URL YAHAN HAI 👇
SQLALCHEMY_DATABASE_URL = "postgresql://neondb_owner:npg_GP6XqUDHMZc5@ep-spring-surf-a1wl9hrh-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Engine Create
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    print("✅ Database Connected Successfully!")
except Exception as e:
    print("❌ Database Connection Failed:", e)
    Base = declarative_base() # Fallback

# --- USER MODEL (Table) ---
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    email_or_phone = Column(String, unique=True, index=True)
    password = Column(String)
    joined = Column(String)

# Create Tables
try:
    Base.metadata.create_all(bind=engine)
except:
    pass

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- SETUP PATHS (Universal Fix for Windows/Render) ---
current_dir = os.path.dirname(os.path.abspath(__file__))
DOWNLOAD_DIR = os.path.join(current_dir, "downloads")

# Fix: Check OS to select correct FFmpeg
if os.name == 'nt': # Windows
    FFMPEG_PATH = os.path.join(current_dir, "ffmpeg.exe")
else: # Linux / Render
    FFMPEG_PATH = "ffmpeg" # System Path se uthayega

# --- FIX: Create Downloads Folder Safely ---
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

# --- CLEANUP FUNCTION ---
def cleanup_file(path: str):
    """File bhejne ke baad delete kar dega"""
    try:
        time.sleep(5) 
        if os.path.exists(path):
            os.remove(path)
            print(f"🗑️ Deleted temp file: {path}")
    except Exception as e:
        print(f"⚠️ Error deleting file: {e}")

# --- HELPER FUNCTIONS ---
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

# -------------------------------------------------------------------------
# 🔥 USER AUTHENTICATION SYSTEM
# -------------------------------------------------------------------------

class UserSignup(BaseModel):
    name: str
    email_or_phone: str
    password: str

class UserLogin(BaseModel):
    email_or_phone: str
    password: str

@app.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email_or_phone == user.email_or_phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = User(
        id=str(uuid.uuid4()),
        name=user.name,
        email_or_phone=user.email_or_phone,
        password=user.password,
        joined=time.strftime("%Y-%m-%d")
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    print(f"✅ New User Registered: {user.name}")
    return {"status": "success", "message": "Account created successfully", "user": new_user}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(
        User.email_or_phone == user.email_or_phone, 
        User.password == user.password
    ).first()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    print(f"🔓 User Logged In: {db_user.name}")
    return {"status": "success", "message": "Login successful", "user": db_user}

@app.get("/me")
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "user": user}


# -------------------------------------------------------------------------
# 🔥 VIDEO APIS (UPDATED FOR AUDIO & DOWNLOAD FIX)
# -------------------------------------------------------------------------

@app.get("/")
def home():
    return {"message": "ScanVidz Backend is Running High Performance Mode 🚀"}

@app.get("/suggestions")
def get_suggestions(q: str = Query(None)):
    if not q: return []
    try:
        url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={q}"
        response = requests.get(url)
        data = json.loads(response.text)
        return data[1]
    except Exception as e:
        print(f"Suggestion Error: {e}")
        return []

@app.get("/search")
def search_videos(
    q: str = Query(None),
    query: str = Query(None),
    limit: int = 40,
    page: int = 1,
    filter: str = Query(None)
):
    search_term = q if q else query
    if not search_term: return {"status": "error", "message": "Query parameter is missing"}

    if filter:
        if filter == "4K Ultra HD": search_term += " 4k hdr"
        elif filter == "Live": search_term += " live stream"
        elif filter == "Music": search_term += " music video"
        elif filter == "Gaming": search_term += " gameplay"
        elif filter == "News": search_term += " news live"
        elif filter == "Learning": search_term += " tutorial"

    print(f"🔍 Searching: '{search_term}' | Page: {page} | Limit: {limit}")

    total_fetch = limit * page
    # --- FIX: Ensure Search Results are Valid ---
    ydl_opts = {
        'format': 'best',
        'quiet': True,
        'extract_flat': True,
        'noplaylist': True,
        'limit': total_fetch,
    }

    results = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch{total_fetch}:{search_term}", download=False)
            if 'entries' in info:
                all_entries = info['entries']
                start = (page - 1) * limit
                end = start + limit
                page_entries = all_entries[start:end]

                for vid in page_entries:
                    if vid:
                        results.append({
                            "title": vid.get('title'),
                            "link": vid.get('url') or f"https://www.youtube.com/watch?v={vid.get('id')}",
                            "id": vid.get('id'),
                            "thumbnail": vid.get('thumbnail') or f"https://i.ytimg.com/vi/{vid.get('id')}/hqdefault.jpg",
                            "duration": vid.get('duration_string') or "HD",
                            "views": format_views(vid.get('view_count')),
                            "channel_name": vid.get('uploader') or "ScanVidz Creator",
                            "channel_avatar": get_avatar(vid.get('uploader'))
                        })
    except Exception as e:
        print(f"Error in search: {e}")
        return {"status": "error", "message": str(e), "results": []}

    return {"status": "success", "results": results, "page": page, "next_page": page + 1}


@app.get("/formats")
def get_formats(v: str):
    if not v: return {"status": "error", "message": "Video ID missing"}

    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    print(f"📥 Fetching formats for: {video_id}")

    ydl_opts = {'quiet': True}
    formats_list = []

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            
            for f in info.get('formats', []):
                if f.get('ext') in ['mp4', 'webm'] and f.get('protocol') in ['https', 'http']:
                    
                    height = f.get('height') or 0
                    has_audio = f.get('acodec') != 'none'
                    size_mb = f.get('filesize', 0) / (1024 * 1024) if f.get('filesize') else 0
                    
                    quality_label = f"{height}p"
                    needs_merge = False
                    
                    if height >= 1080:
                        quality_label += " (HQ + Audio 🔊)" 
                        needs_merge = True
                        size_mb = 0 
                    elif has_audio:
                        if f.get('ext') == 'webm': continue 
                        quality_label += " (Direct)"
                        needs_merge = False
                    else:
                        continue 

                    formats_list.append({
                        "format_id": f['format_id'],
                        "quality": quality_label,
                        "ext": "mp4",
                        "size": f"{size_mb:.1f} MB" if size_mb > 0 else "High Quality",
                        "height": height,
                        "needs_merge": needs_merge
                    })
            
            formats_list.sort(key=lambda x: x['height'], reverse=True)
            unique_formats = []
            seen_heights = set()
            for f in formats_list:
                if f['height'] not in seen_heights:
                    unique_formats.append(f)
                    seen_heights.add(f['height'])

    except Exception as e:
        return {"status": "error", "message": str(e)}

    return {"status": "success", "formats": unique_formats, "title": info.get('title')}


# --- 5. DOWNLOAD ENDPOINT (FINAL FIX: AUDIO + RENDER COMPATIBILITY) ---
@app.get("/download")
def download_video(v: str, format_id: str, background_tasks: BackgroundTasks, merge: str = "false"):
    video_id = v.split("v=")[1].split("&")[0] if "v=" in v else v
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    # Check Folder
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    # CASE 1: STREAM / DIRECT LINK (Used for Playing)
    if merge != "true":
        # 🔥 FIX: Force 'best' with MP4 extension. This guarantees Audio + Video compatibility in browsers.
        ydl_opts = {
            'format': 'best[ext=mp4]/best', # <-- YE LINE MAGIC KAREGI (AUDIO FIX)
            'quiet': True,
            'noplaylist': True
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                return Response(status_code=302, headers={"Location": info.get('url')})
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # CASE 2: FILE DOWNLOAD (High Quality / Merge)
    else:
        print(f"⚙️ Downloading: {video_id}...")
        filename = f"ScanVidz_{video_id}_{format_id}.mp4"
        filepath = os.path.join(DOWNLOAD_DIR, filename)
        
        if os.path.exists(filepath):
             background_tasks.add_task(cleanup_file, filepath)
             return FileResponse(filepath, media_type='application/octet-stream', filename=filename, headers={"Content-Disposition": f"attachment; filename={filename}"})

        # --- TRY HIGH QUALITY MERGE (Best case) ---
        try:
            ydl_opts = {
                'format': f"{format_id}+bestaudio[ext=m4a]/bestaudio",
                'outtmpl': filepath,
                'merge_output_format': 'mp4',
                'quiet': True,
                'ffmpeg_location': FFMPEG_PATH, # Uses 'ffmpeg' on Linux/Render
                'postprocessor_args': [
                    '-c:v', 'copy', 
                    '-c:a', 'aac',  
                    '-strict', 'experimental'
                ],
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_url])
                
            print(f"✅ Download Ready (HQ): {filepath}")

        # --- FALLBACK: AGAR MERGE FAIL HUA TO DIRECT DOWNLOAD ---
        except Exception as e:
            print(f"⚠️ Merge failed ({e}), switching to Fallback Mode...")
            try:
                # Agar FFmpeg nahi mila, to simple 'best' video download karo jo bina merge ke chalta hai
                ydl_opts = {
                    'format': 'best[ext=mp4]/best',
                    'outtmpl': filepath,
                    'quiet': True
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([video_url])
                print(f"✅ Download Ready (Fallback): {filepath}")
            except Exception as final_error:
                return {"status": "error", "message": f"Download failed completely: {str(final_error)}"}

        background_tasks.add_task(cleanup_file, filepath)
        return FileResponse(
            filepath, 
            media_type='application/octet-stream', 
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )


@app.get("/trending")
def get_trending():
    print("🔥 Fetching Real YouTube Trending...")
    ydl_opts = {'extract_flat': True, 'quiet': True, 'limit': 20}
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
                            "duration": vid.get('duration_string') or "Hot",
                            "views": format_views(vid.get('view_count')),
                            "channel_name": vid.get('uploader') or "Trending",
                            "channel_avatar": get_avatar(vid.get('uploader'))
                        })
    except Exception as e:
        print(f"Trending Error: {e}")
        return search_videos(q="viral trending now", limit=20, page=1)

    return {"status": "success", "videos": results}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)