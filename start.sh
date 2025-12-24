#!/bin/bash
# Production startup script for AI Doctor Backend

# Set default port to 8000 if not provided
export PORT=${PORT:-8000}

echo "🚀 Starting AI Doctor Backend on port $PORT"

# Start with gunicorn for production
exec gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
