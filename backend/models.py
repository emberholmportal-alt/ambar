"""Tablas: usuarios (billetera ↔ nombre único ↔ holder ↔ mejor score) y partidas."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from db import Base

class User(Base):
    __tablename__ = 'users'
    id         = Column(Integer, primary_key=True)
    wallet     = Column(String(64), unique=True, nullable=False, index=True)   # pubkey de Solana
    username   = Column(String(16), nullable=False)                            # como lo eligió (visual)
    uname_key  = Column(String(16), unique=True, nullable=False, index=True)   # lower() → unicidad case-insensitive
    holder     = Column(Boolean, default=True)
    best_score = Column(Integer, default=0, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Score(Base):
    __tablename__ = 'scores'
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    score      = Column(Integer, default=0)
    wave       = Column(Integer, default=0)
    survived   = Column(Integer, default=0)   # segundos
    resources  = Column(Integer, default=0)
    kills      = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
