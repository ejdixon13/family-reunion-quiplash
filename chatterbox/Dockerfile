FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including build tools
RUN apt-get update && apt-get install -y \
    git \
    libsndfile1 \
    ffmpeg \
    cmake \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Clone Chatterbox-TTS-Server
RUN git clone https://github.com/devnen/Chatterbox-TTS-Server.git .

# Install CPU-only requirements
# First install onnx binary wheel to avoid build issues
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir onnx>=1.14.0 && \
    pip install --no-cache-dir -r requirements.txt

# Create voices directory
RUN mkdir -p /app/voices

# Expose the API port
EXPOSE 8004

# Set environment variables for CPU-only mode
ENV CHATTERBOX_DEVICE=cpu
ENV HOST=0.0.0.0
ENV PORT=8004

# Run the server
CMD ["python", "main.py"]
