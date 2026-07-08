"""API de Age of Ansem (FastAPI).
   Registro por billetera + holder, ranking por usuario y roster para el live.
   Endpoints bajo /api. Ver README.md para desplegar en Render."""
import hmac
import hashlib
import json
import re
import secrets
import time
import threading
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

import config
from db import Base, engine, get_db
from models import User, Score
import sol
import moderation

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Age of Ansem API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

NAME_RE = re.compile(r'^[\w .\-]{2,16}$', re.UNICODE)


def session_token(wallet: str) -> str:
    """Token de sesión = HMAC(billetera). El score se envía con él para atribuirlo a la billetera verificada."""
    return hmac.new(config.SECRET.encode(), wallet.encode(), hashlib.sha256).hexdigest()


def abbr(w: str) -> str:
    return w if len(w) <= 9 else w[:4] + '…' + w[-4:]


# ---- schemas ----
class RegisterIn(BaseModel):
    pubkey: str
    username: str
    proof: Optional[dict] = None

class ScoreIn(BaseModel):
    pubkey: str
    session_token: str
    score: int = 0
    wave: int = 0
    survived: int = 0
    resources: int = 0
    kills: int = 0

class PingIn(BaseModel):
    cid: str

# presencia del live (en memoria): cid -> último visto. Ventana de 25s = espectador "activo".
_presence: dict = {}
_plock = threading.Lock()
VIEWER_WINDOW = 25.0


# ---- endpoints ----
@app.get('/api/health')
def health():
    return {"ok": True, "mode": config.MODE, "open": config.BETA_OPEN}

@app.get('/api/config')
def public_config():
    """Config pública para el front: modo y link de compra del token (se arma con el mint)."""
    pump = config.PUMP_URL or (f"https://pump.fun/coin/{config.TOKEN_MINT}" if config.TOKEN_MINT else "https://pump.fun")
    return {"mode": config.MODE, "open": config.BETA_OPEN, "token_set": bool(config.TOKEN_MINT),
            "min_hold": config.MIN_HOLD, "pump_url": pump}

@app.delete('/api/admin/user/{username}')
def admin_delete_user(username: str, x_admin_secret: str = Header(None), db: Session = Depends(get_db)):
    """Borra un usuario y sus scores. Requiere el header X-Admin-Secret == AOA_SECRET."""
    if not hmac.compare_digest(x_admin_secret or '', config.SECRET):
        raise HTTPException(401, "no autorizado")
    u = db.query(User).filter(User.uname_key == username.strip().lower()).first()
    if not u:
        raise HTTPException(404, "usuario no existe")
    db.query(Score).filter(Score.user_id == u.id).delete()
    db.delete(u); db.commit()
    return {"ok": True, "deleted": username}

@app.get('/api/holder/{pubkey}')
def holder(pubkey: str):
    ok, amount, stub = sol.check_holder(pubkey)
    return {"holder": ok, "amount": amount, "stub": stub}

@app.post('/api/live/ping')
def live_ping(inp: PingIn):
    """Heartbeat de un espectador del live. Devuelve los espectadores activos (reales)."""
    now = time.time()
    cutoff = now - VIEWER_WINDOW
    with _plock:
        _presence[inp.cid] = now
        for k in [k for k, v in _presence.items() if v < cutoff]:
            del _presence[k]
        count = len(_presence)
    return {"viewers": count}

@app.get('/api/live/viewers')
def live_viewers():
    now = time.time(); cutoff = now - VIEWER_WINDOW
    with _plock:
        count = sum(1 for v in _presence.values() if v >= cutoff)
    return {"viewers": count}

@app.post('/api/register')
def register(inp: RegisterIn, db: Session = Depends(get_db)):
    name = (inp.username or '').strip()
    if not NAME_RE.match(name):
        raise HTTPException(400, "nombre inválido")
    if not moderation.name_ok(name):
        raise HTTPException(400, "nombre no permitido")
    ok, amount, stub = sol.check_holder(inp.pubkey)
    if not ok:
        raise HTTPException(403, "la billetera no holdea el token")
    if config.REQUIRE_SIGNATURE:
        p = inp.proof or {}
        if not sol.verify_signature(inp.pubkey, p.get('nonce', ''), p.get('sig', '')):
            raise HTTPException(401, "firma inválida")

    key = name.lower()
    me = db.query(User).filter(User.wallet == inp.pubkey).first()
    taken = db.query(User).filter(User.uname_key == key).first()
    if taken and (me is None or taken.id != me.id):
        raise HTTPException(409, "nombre en uso")

    if me:
        me.username, me.uname_key, me.holder = name, key, ok
    else:
        me = User(wallet=inp.pubkey, username=name, uname_key=key, holder=ok)
        db.add(me)
    db.commit(); db.refresh(me)
    return {"ok": True, "username": me.username, "session_token": session_token(inp.pubkey), "stub": stub}

@app.post('/api/score')
def submit_score(inp: ScoreIn, db: Session = Depends(get_db)):
    if not hmac.compare_digest(inp.session_token or '', session_token(inp.pubkey)):
        raise HTTPException(401, "sesión inválida")
    me = db.query(User).filter(User.wallet == inp.pubkey).first()
    if not me:
        raise HTTPException(404, "usuario no registrado")
    sc = max(0, int(inp.score))
    db.add(Score(user_id=me.id, score=sc, wave=max(0, inp.wave),
                 survived=max(0, inp.survived), resources=max(0, inp.resources), kills=max(0, inp.kills)))
    if sc > (me.best_score or 0):
        me.best_score = sc
    db.commit()
    return {"ok": True, "best": me.best_score}

@app.get('/api/leaderboard')
def leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    limit = max(1, min(100, limit))
    us = db.query(User).order_by(User.best_score.desc(), User.updated_at.desc()).limit(limit).all()
    return [{"rank": i + 1, "username": u.username, "wallet": abbr(u.wallet),
             "score": u.best_score, "holder": u.holder} for i, u in enumerate(us)]

@app.get('/api/roster')
def roster(limit: int = 40, db: Session = Depends(get_db)):
    """Nombres para las etiquetas del live (los mejores + más recientes)."""
    limit = max(1, min(200, limit))
    us = db.query(User).order_by(User.best_score.desc(), User.updated_at.desc()).limit(limit).all()
    return [{"name": u.username, "rank": i + 1, "holder": u.holder} for i, u in enumerate(us)]


# ---- Reino (/kingdom): presencia en tiempo real por WebSocket ----
# En memoria (una sola instancia): cada visitante ve a los demás caminar, sus mensajes y la
# cercanía para habilitar chat/PvP. Sin NPCs: sólo usuarios reales conectados.
kingdom_conns: dict = {}   # cid -> {ws, joined, name, unit, x, y, f, m}
KMAX = 60                  # límite de caracteres del mensaje

async def _kbroadcast(msg: str, exclude: str = None):
    dead = []
    for cid, c in list(kingdom_conns.items()):
        if cid == exclude:
            continue
        try:
            await c["ws"].send_text(msg)
        except Exception:
            dead.append(cid)
    for cid in dead:
        kingdom_conns.pop(cid, None)

@app.websocket('/ws/kingdom')
async def ws_kingdom(ws: WebSocket):
    await ws.accept()
    cid = secrets.token_hex(4)
    kingdom_conns[cid] = {"ws": ws, "joined": False, "name": "?", "unit": "pawn_blue", "x": 0.0, "y": 0.0, "f": False, "m": False}
    try:
        while True:
            raw = await ws.receive_text()
            try:
                d = json.loads(raw)
            except Exception:
                continue
            c = kingdom_conns.get(cid)
            if not c:
                break
            t = d.get("t")
            if t == "join":
                c["name"] = (str(d.get("name", "?")) or "?")[:16]
                c["unit"] = (str(d.get("unit", "pawn_blue")) or "pawn_blue")[:24]
                c["x"] = float(d.get("x", 0) or 0); c["y"] = float(d.get("y", 0) or 0)
                c["joined"] = True
                others = [{"id": k, "name": v["name"], "unit": v["unit"], "x": v["x"], "y": v["y"]}
                          for k, v in kingdom_conns.items() if k != cid and v.get("joined")]
                await ws.send_text(json.dumps({"t": "welcome", "id": cid, "players": others}))
                await _kbroadcast(json.dumps({"t": "join", "id": cid, "name": c["name"], "unit": c["unit"], "x": c["x"], "y": c["y"]}), exclude=cid)
            elif t == "pos" and c["joined"]:
                c["x"] = float(d.get("x", 0) or 0); c["y"] = float(d.get("y", 0) or 0)
                c["f"] = bool(d.get("f")); c["m"] = bool(d.get("m"))
                await _kbroadcast(json.dumps({"t": "pos", "id": cid, "x": c["x"], "y": c["y"], "f": c["f"], "m": c["m"]}), exclude=cid)
            elif t == "say" and c["joined"]:
                msg = (str(d.get("msg", "")) or "").strip()[:KMAX]
                if msg:
                    await _kbroadcast(json.dumps({"t": "say", "id": cid, "msg": msg}), exclude=cid)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        kingdom_conns.pop(cid, None)
        await _kbroadcast(json.dumps({"t": "leave", "id": cid}))
