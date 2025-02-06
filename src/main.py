from fastapi import FastAPI, HTTPException, Depends, Request, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timedelta
import uvicorn
import logging

from . import models, database
from .routes import router

# Add debug logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Keep Clone API",
    description="A secure, scalable Google Keep clone API",
    version="1.0.0"
)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware setup with proper preflight handling
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost", "https://lockedin.bidseek.dev"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# OAuth2 scheme for JWT token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Add debug print before including router
logger.debug("Available routes in router:")
for route in router.routes:
    logger.debug(f"  {route.path} [{route.methods}]")

# Include the router
app.include_router(router)

# Add debug print after including router
logger.debug("All application routes:")
for route in app.routes:
    logger.debug(f"  {route.path} [{route.methods}]")

@app.get("/")
@limiter.limit("5/minute")
async def root(request: Request):
    return {"message": "Welcome to Keep Clone API", "status": "active"}

@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {"status": "healthy"}

@app.post("/api/test")
async def test_endpoint():
    return {"message": "test endpoint works"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 