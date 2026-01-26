from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- IMPORTANT: Apna Password Yahan Check Karo ---
# Format: postgresql://username:password@localhost/databasename
# Agar tumhara password 'sabarna23!' nahi hai, to use yahan badal dena.
# Humne '_final' add kar diya taaki ekdum naya database bane
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:sabarna23!@localhost/scanvidz_db_final"

# Engine start karna (Connection banana)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Session banana (Database se baat karne ke liye)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base Model (Table banane ka sancha)
Base = declarative_base()

# --- Table Design (Schema) ---
class VideoDB(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(String, unique=True, index=True) # YouTube Video ID
    title = Column(String)
    thumbnail = Column(String)
    source = Column(String)
    views = Column(String)
    duration = Column(String)
    link = Column(String)

# Database me Table Create kar do (Agar nahi hai to)
Base.metadata.create_all(bind=engine)