import os
import time
import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from database import get_db
from models import User, VerificationCode
from auth_utils import hash_password, verify_password, create_access_token
from auth import get_current_user
from schemas import UserSignup, UserLogin, GoogleLoginRequest, AuthResponse, UserResponse, UserSettingsUpdate, SendCodeRequest
from security_logger import security_logger
import random
import string
from email_utils import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

# Security #12: Per-IP login rate limiter (5 attempts per 60 seconds)
_login_attempts: dict[str, list[float]] = {}
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 60

def _check_login_rate_limit(request: Request):
    """Raise 429 if this IP has exceeded login attempt limits."""
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = [t for t in _login_attempts.get(client_ip, []) if now - t < LOGIN_WINDOW_SECONDS]
    if len(attempts) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Please wait {LOGIN_WINDOW_SECONDS} seconds before trying again."
        )
    attempts.append(now)
    _login_attempts[client_ip] = attempts

@router.get("/config")
def get_auth_config():
    """Return public auth config like Google Client ID to frontend."""
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip("'\" ")
    return {
        "google_client_id": client_id
    }

@router.post("/google", response_model=AuthResponse)
def google_auth(google_req: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Validates Google ID token via Google's tokeninfo endpoint,
    creates or logs in the user, and returns Gravequit JWT.
    """
    credential = google_req.credential.strip()
    if not credential:
        raise HTTPException(status_code=400, detail="Google credential token is required.")

    # Verify ID Token using Google tokeninfo API
    try:
        resp = requests.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}",
            timeout=10
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token.")
        google_data = resp.json()
    except requests.RequestException:
        raise HTTPException(status_code=502, detail="Failed to communicate with Google authentication servers.")

    email = google_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account has no associated email.")

    email_clean = email.strip().lower()

    # Optional audience check if GOOGLE_CLIENT_ID is configured
    expected_client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip("'\" ")
    if expected_client_id and google_data.get("aud") != expected_client_id:
        # Check if audience is in aud list or matches
        aud = google_data.get("aud")
        if aud and expected_client_id not in aud:
            raise HTTPException(status_code=401, detail="Token audience mismatch.")

    # Find or create user
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        user = User(
            email=email_clean,
            hashed_password=None,
            email_opt_in=True,
            reminder_opt_in=False,
            created_at=datetime.now(timezone.utc)
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/send-verification-code")
def send_verification_code(req: SendCodeRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    
    # Check if user already exists
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    # Generate 6 digit code
    code = ''.join(random.choices(string.digits, k=6))
    
    # Store in DB, expiring in 10 minutes
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Remove any existing code for this email
    db.query(VerificationCode).filter(VerificationCode.email == email_clean).delete()
    
    new_code = VerificationCode(
        email=email_clean,
        code=code,
        expires_at=expires
    )
    db.add(new_code)
    db.commit()
    
    # Send email
    success = send_verification_email(email_clean, code)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again.")
        
    return {"message": "Verification code sent."}

@router.post("/signup", response_model=AuthResponse)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    email_clean = user_data.email.strip().lower()
        
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    # Verify the code
    code_record = db.query(VerificationCode).filter(
        VerificationCode.email == email_clean,
        VerificationCode.code == user_data.code
    ).first()
    
    if not code_record:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    if code_record.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
        
    # Code is valid, delete it
    db.delete(code_record)
        
    hashed = hash_password(user_data.password)
    new_user = User(
        email=email_clean,
        hashed_password=hashed,
        email_opt_in=True,
        reminder_opt_in=False,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({"sub": str(new_user.id), "email": new_user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=AuthResponse)
def login(request: Request, user_data: UserLogin, db: Session = Depends(get_db), _: None = Depends(_check_login_rate_limit)):
    email_clean = user_data.email.strip().lower()
    client_ip = request.client.host if request.client else "unknown"
    
    user = db.query(User).filter(User.email == email_clean).first()
    
    if not user:
        security_logger.warning(f"Failed login attempt (user not found) - Email: {email_clean}, IP: {client_ip}")
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
        
    # Check if account is locked
    if user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > datetime.now(timezone.utc):
        remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds() / 60)
        security_logger.warning(f"Failed login attempt (account locked) - Email: {email_clean}, IP: {client_ip}")
        raise HTTPException(status_code=403, detail=f"Account temporarily locked due to multiple failed login attempts. Try again in {remaining} minutes.")
        
    # If user was created prior without password (legacy mock user), set their password on first login
    if not user.hashed_password:
        user.hashed_password = hash_password(user_data.password)
        db.commit()
        db.refresh(user)
    elif not verify_password(user_data.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            security_logger.critical(f"Account locked due to brute force - Email: {email_clean}, IP: {client_ip}")
        else:
            security_logger.warning(f"Failed login attempt (invalid password) - Email: {email_clean}, IP: {client_ip}")
        db.commit()
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
        
    # Successful login: reset counters
    if user.failed_login_attempts > 0 or user.locked_until is not None:
        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()
        
    security_logger.info(f"User logged in successfully - Email: {email_clean}, IP: {client_ip}")
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/settings", response_model=UserResponse)
def update_settings(
    settings_in: UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if settings_in.email_opt_in is not None:
        current_user.email_opt_in = settings_in.email_opt_in
    if settings_in.reminder_opt_in is not None:
        current_user.reminder_opt_in = settings_in.reminder_opt_in
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/account", status_code=204)
def delete_account(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client_ip = request.client.host if request.client else "unknown"
    security_logger.info(f"User account deleted - ID: {current_user.id}, Email: {current_user.email}, IP: {client_ip}")
    db.delete(current_user)
    db.commit()
    return {"message": "Account and all associated reflections permanently deleted."}
