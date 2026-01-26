import yt_dlp
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from database import VideoDB, Base 

# Database Connection (Check kar lo naam sahi hai na)
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin123@localhost/scanvidz_db_final"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Trending Topics
topics = [
    "Latest Hindi Songs 2025",
    "Cricket Highlights 2026",
    "Tech News Hindi",
    "New Vlogs India",
    "South Indian Movies Dubbed",
    "Funny Videos",
    "Gaming Highlights"
]

def format_views(views):
    try:
        if not views: return "N/A"
        num = float(views)
        if num >= 1000000: return f"{round(num/1000000, 1)}M"
        elif num >= 1000: return f"{round(num/1000, 1)}K"
        return str(int(num))
    except: return "N/A"

def parse_duration(duration):
    try:
        if not duration: return "N/A"
        total_seconds = int(float(duration))
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes}:{seconds:02d}"
    except: return "N/A"

print("🚀 Starting Database Seeding...")

ydl_opts = {
    'quiet': True,
    'extract_flat': True,
    'skip_download': True,
}

for topic in topics:
    print(f"📥 Fetching: {topic}...")
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"ytsearch10:{topic}", download=False)
            results = info.get('entries', [])
            
            for video in results:
                try:
                    vid_id = video.get('id')
                    title = video.get('title')
                    if not vid_id: continue

                    # Duplicate check
                    exists = db.query(VideoDB).filter(VideoDB.video_id == vid_id).first()
                    if exists: continue

                    new_video = VideoDB(
                        video_id=vid_id,
                        title=title,
                        thumbnail=f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg",
                        source="Trending",
                        views=format_views(video.get('view_count')),
                        duration=parse_duration(video.get('duration')),
                        link=f"https://www.youtube.com/watch?v={vid_id}"
                    )
                    db.add(new_video)
                except: continue
            db.commit()
    except Exception as e:
        print(f"Error skipping {topic}: {e}")

print("✅ SUCCESS! Database bhara gaya.")
db.close()