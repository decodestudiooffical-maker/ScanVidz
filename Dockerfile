# 1. Python ka chhota version use karein (Fast load hoga)
FROM python:3.9-slim

# 2. 🔥 YAHAN MAGIC HOGA: FFmpeg install karein
# Ye line server ko bolti hai ki video tools download kar lo
RUN apt-get update && \
    apt-get install -y ffmpeg git && \
    rm -rf /var/lib/apt/lists/*

# 3. Server par 'app' naam ka folder banayein
WORKDIR /app

# 4. Requirements copy karein aur install karein
# (Ensure karein ki requirements.txt aapke root folder mein ho)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Pura project copy karein
COPY . .

# 6. Server Start karein
# Backend folder ke andar main.py hai, isliye hum 'backend.main:app' likhenge
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]