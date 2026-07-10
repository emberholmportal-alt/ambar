"""Tablas: usuarios (billetera ↔ nombre único ↔ holder ↔ score ↔ XP), partidas y misiones diarias."""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, func
from db import Base

class User(Base):
    __tablename__ = 'users'
    id         = Column(Integer, primary_key=True)
    wallet     = Column(String(64), unique=True, nullable=False, index=True)   # pubkey de Solana
    username   = Column(String(16), nullable=False)                            # como lo eligió (visual)
    uname_key  = Column(String(16), unique=True, nullable=False, index=True)   # lower() → unicidad case-insensitive
    holder     = Column(Boolean, default=True)
    best_score = Column(Integer, default=0, index=True)
    xp         = Column(Integer, default=0, index=True)                        # XP de cuenta (recompensa de misiones diarias)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class DailyMission(Base):
    """Misión diaria por usuario: juntar madera/oro/comida. Una fila por (usuario, día UTC)."""
    __tablename__ = 'daily_missions'
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    day        = Column(String(10), nullable=False, index=True)                # 'YYYY-MM-DD' (UTC)
    goal_wood  = Column(Integer, default=0); goal_gold = Column(Integer, default=0); goal_food = Column(Integer, default=0)
    prog_wood  = Column(Integer, default=0); prog_gold = Column(Integer, default=0); prog_food = Column(Integer, default=0)
    claimed    = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    __table_args__ = (UniqueConstraint('user_id', 'day', name='uix_user_day'),)

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
