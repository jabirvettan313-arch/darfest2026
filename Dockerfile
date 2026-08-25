FROM python:3.10-slim

WORKDIR /app

# Copy application files
COPY . /app

# Environment defaults
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["python3", "backend/server.py"]
