import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
from routers import patterns, items, admin, metrics, auth, digest
from security_logger import security_logger

from sqlalchemy import text

# Create DB tables
Base.metadata.create_all(bind=engine)

# Ensure columns added to models exist in DB
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password VARCHAR;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT TRUE;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;"))
        conn.execute(text("ALTER TABLE items ADD COLUMN IF NOT EXISTS note TEXT;"))
        conn.execute(text("ALTER TABLE pattern_summaries ADD COLUMN IF NOT EXISTS clusters JSON;"))
        conn.execute(text("ALTER TABLE pattern_summaries ADD COLUMN IF NOT EXISTS similar_entries JSON;"))
        conn.execute(text("ALTER TABLE pattern_summaries ADD COLUMN IF NOT EXISTS risk_explanation TEXT;"))
        conn.execute(text("ALTER TABLE verification_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;"))
        conn.commit()
except Exception as e:
    print(f"[Startup Warning] Schema column sync notice: {e}")

app = FastAPI(
    title="Gravequit API",
    description="A digital sanctuary for students to observe and retire commitments with clarity and zero guilt.",
    version="1.0.0"
)

# CORS configuration: Allow localhost, Vercel deployments, and custom ALLOWED_ORIGINS
_default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://quite-grave.vercel.app"
]

env_origins = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip() and o.strip() != "*"
]

ALLOWED_ORIGINS = list(set(_default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory rate limiting map
client_request_history = {}
last_cleanup_time = time.time()

@app.middleware("http")
async def rate_limit_and_options_middleware(request: Request, call_next):
    global last_cleanup_time
    
    # Always let CORS preflight OPTIONS pass through immediately
    if request.method == "OPTIONS":
        return await call_next(request)
        
    # Allow health checks and docs without rate limit
    if request.url.path in ["/", "/docs", "/openapi.json", "/redoc"]:
        return await call_next(request)
        
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    # Periodically clean up entirely dead IP keys to prevent memory leaks (every 5 minutes)
    if now - last_cleanup_time > 300:
        keys_to_delete = [ip for ip, ts in client_request_history.items() if not ts or (now - ts[-1] > 60)]
        for ip in keys_to_delete:
            del client_request_history[ip]
        last_cleanup_time = now
    
    # Clean up timestamps older than 60 seconds for the current user
    timestamps = client_request_history.get(client_ip, [])
    timestamps = [t for t in timestamps if now - t < 60]
    
    if len(timestamps) >= 120:
        security_logger.warning(f"Global rate limit exceeded (120 req/min) - IP: {client_ip}")
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down and try again shortly."}
        )
        
    timestamps.append(now)
    client_request_history[client_ip] = timestamps
    
    return await call_next(request)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Include all Routers
app.include_router(auth.router)
app.include_router(items.router)
app.include_router(patterns.router)
app.include_router(metrics.router)
app.include_router(admin.router)
app.include_router(digest.router)

@app.get("/")
def root():
    return {
        "name": "Gravequit API",
        "status": "operational",
        "version": "1.0.0",
        "sanctuary_mode": "active"
    }
