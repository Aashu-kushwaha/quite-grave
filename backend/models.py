from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    email_opt_in = Column(Boolean, default=True)
    reminder_opt_in = Column(Boolean, default=False)
    role = Column(String, default="student")
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    items = relationship("Item", backref="user", cascade="all, delete-orphan")
    pattern_summaries = relationship("PatternSummary", backref="user", cascade="all, delete-orphan")

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, default="Other")
    status = Column(String, default="active")  # active | quit | completed
    note = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ended_at = Column(DateTime, nullable=True)
    
    reason = relationship("QuitReason", uselist=False, back_populates="item", cascade="all, delete-orphan")

class QuitReason(Base):
    __tablename__ = "quit_reasons"
    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    reason_tag = Column(String, nullable=False)
    reason_text = Column(Text, nullable=True)
    voice_transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    item = relationship("Item", back_populates="reason")

class PatternSummary(Base):
    __tablename__ = "pattern_summaries"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    computed_stats = Column(JSON, nullable=False)
    ai_summary_text = Column(Text, nullable=False)
    total_quit_at_generation = Column(Integer, nullable=False)
    
    # LangGraph pipeline data
    clusters = Column(JSON, nullable=True)
    similar_entries = Column(JSON, nullable=True)
    risk_explanation = Column(Text, nullable=True)
    
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AIFeedback(Base):
    __tablename__ = "ai_feedback"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    summary_id = Column(Integer, ForeignKey("pattern_summaries.id"), nullable=True)
    rating = Column(Integer, nullable=False)  # 1 for thumbs up, -1 for thumbs down
    feedback_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class VerificationCode(Base):
    __tablename__ = "verification_codes"
    id = Column(Integer, primary_key=True)
    email = Column(String, index=True, nullable=False)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
