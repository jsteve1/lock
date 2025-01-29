#!/bin/bash
set -e

if [ "$1" = "fastapi" ]; then
    exec uvicorn src.main:app --host 0.0.0.0 --port 8000
elif [ "$1" = "celery" ]; then
    exec celery -A src.tasks worker --loglevel=info
else
    exec "$@"
fi 