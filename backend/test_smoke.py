"""Smoke test del backend con SQLite en memoria (sin Postgres ni red)."""
import os, tempfile
os.environ['DATABASE_URL'] = 'sqlite:///' + tempfile.mktemp(suffix='.db')
os.environ['AOA_SECRET'] = 'test-secret'
os.environ.pop('TOKEN_MINT', None)   # modo stub

from fastapi.testclient import TestClient
import main
c = TestClient(main.app)

def ok(cond, msg): print(("PASS" if cond else "FAIL"), msg); assert cond, msg

# health / holder (stub)
h = c.get('/api/health').json(); ok(h['ok'] and h['mode'] == 'stub', "health stub")
hd = c.get('/api/holder/WalletAAA111').json(); ok(hd['holder'] and hd['stub'], "holder stub = true")

# registro
r = c.post('/api/register', json={"pubkey": "WalletAAA111", "username": "Rocky"}).json()
ok(r['ok'] and r['username'] == 'Rocky' and r['session_token'], "registro Rocky")
tok = r['session_token']

# nombre en uso (otra billetera, mismo nombre, case-insensitive)
r2 = c.post('/api/register', json={"pubkey": "WalletBBB222", "username": "rocky"})
ok(r2.status_code == 409, "nombre en uso -> 409")

# nombre inválido
r3 = c.post('/api/register', json={"pubkey": "WalletCCC333", "username": "x"})
ok(r3.status_code == 400, "nombre corto -> 400")

# misma billetera puede renombrarse
r4 = c.post('/api/register', json={"pubkey": "WalletAAA111", "username": "RockyII"})
ok(r4.status_code == 200 and r4.json()['username'] == 'RockyII', "rename misma billetera")
tok = r4.json()['session_token']

# score con token correcto
s = c.post('/api/score', json={"pubkey": "WalletAAA111", "session_token": tok, "score": 1500, "wave": 7, "kills": 30})
ok(s.status_code == 200 and s.json()['best'] == 1500, "score ok, best=1500")
# score menor no baja el best
c.post('/api/score', json={"pubkey": "WalletAAA111", "session_token": tok, "score": 200})
# score con token inválido
sbad = c.post('/api/score', json={"pubkey": "WalletAAA111", "session_token": "trucho", "score": 99999})
ok(sbad.status_code == 401, "score token inválido -> 401")
# score de usuario no registrado
snone = c.post('/api/score', json={"pubkey": "WalletZZZ999", "session_token": main.session_token("WalletZZZ999"), "score": 5})
ok(snone.status_code == 404, "score sin usuario -> 404")

# otro usuario para el ranking
c.post('/api/register', json={"pubkey": "WalletBBB222", "username": "BlackDuval"})
c.post('/api/score', json={"pubkey": "WalletBBB222", "session_token": main.session_token("WalletBBB222"), "score": 800})

lb = c.get('/api/leaderboard').json()
ok(lb[0]['username'] == 'RockyII' and lb[0]['score'] == 1500 and lb[0]['rank'] == 1, "leaderboard ordena por best")
ok('…' in lb[0]['wallet'], "wallet abreviada")

ro = c.get('/api/roster?limit=10').json()
names = [e['name'] for e in ro]
ok('RockyII' in names and 'BlackDuval' in names, "roster con nombres")

# moderación: nombres prohibidos/reservados -> 400
for bad in ['admin', 'AgeOfAnsem', 'p u t o', 'FuckThis']:
    rr = c.post('/api/register', json={"pubkey": "WalletMOD", "username": bad})
    ok(rr.status_code == 400, f"nombre bloqueado: {bad!r} -> 400")

# admin: borrar usuario (con y sin secreto)
import main as _m
ok(c.request('DELETE', '/api/admin/user/BlackDuval', headers={'X-Admin-Secret': 'malo'}).status_code == 401, "admin sin secreto -> 401")
dd = c.request('DELETE', '/api/admin/user/BlackDuval', headers={'X-Admin-Secret': 'test-secret'})
ok(dd.status_code == 200, "admin borra usuario -> 200")
ok('BlackDuval' not in [e['name'] for e in c.get('/api/roster').json()], "usuario borrado ya no aparece")

# health expone 'open'
ok('open' in c.get('/api/health').json(), "health expone flag open")

# config pública: sin token -> pump.fun genérico
cfg = c.get('/api/config').json()
ok(cfg['mode'] == 'stub' and cfg['token_set'] is False and cfg['pump_url'] == 'https://pump.fun', "config sin token")

# presencia del live: 2 cids distintos -> 2 viewers
ok(c.post('/api/live/ping', json={"cid": "a1"}).json()['viewers'] == 1, "ping cid a1 -> 1 viewer")
ok(c.post('/api/live/ping', json={"cid": "b2"}).json()['viewers'] == 2, "ping cid b2 -> 2 viewers")
ok(c.post('/api/live/ping', json={"cid": "a1"}).json()['viewers'] == 2, "re-ping a1 no duplica -> 2")
ok(c.get('/api/live/viewers').json()['viewers'] == 2, "GET viewers -> 2")

# ---- misiones diarias ----
DK = {"pubkey": "WalletAAA111", "session_token": tok}
dm = c.post('/api/daily', json=DK).json()
ok(set(dm['goals']) == {'wood', 'gold', 'food'} and all(v >= 3 for v in dm['goals'].values()), "misión diaria: 3 objetivos")
ok(dm['progress'] == {'wood': 0, 'gold': 0, 'food': 0} and not dm['complete'] and not dm['claimed'], "misión arranca en 0")
ok(dm['level'] == 1 and dm['xp'] == 0, "nivel 1, xp 0 al inicio")

# misión determinista: pedirla de nuevo da los mismos objetivos
dm2 = c.post('/api/daily', json=DK).json()
ok(dm2['goals'] == dm['goals'], "misión estable en el día")

# token inválido -> 401
ok(c.post('/api/daily', json={"pubkey": "WalletAAA111", "session_token": "trucho"}).status_code == 401, "daily token inválido -> 401")
# recurso inválido -> 400
ok(c.post('/api/daily/deposit', json={**DK, "kind": "diamante"}).status_code == 400, "recurso inválido -> 400")

# reclamar sin completar -> 400
ok(c.post('/api/daily/claim', json=DK).status_code == 400, "claim incompleto -> 400")

# depositar hasta cumplir cada objetivo
for r in ('wood', 'gold', 'food'):
    need = dm['goals'][r]
    for _ in range(need):
        last = c.post('/api/daily/deposit', json={**DK, "kind": r, "amount": 1}).json()
    ok(last['progress'][r] == need, f"progreso {r} llega al objetivo {need}")
# el depósito NO pasa del objetivo
overflow = c.post('/api/daily/deposit', json={**DK, "kind": "wood", "amount": 5}).json()
ok(overflow['progress']['wood'] == dm['goals']['wood'], "depósito capado al objetivo")
ok(overflow['complete'], "misión completa")

# reclamar da XP y sube (o mantiene) nivel
cl = c.post('/api/daily/claim', json=DK).json()
ok(cl['ok'] and cl['reward_xp'] >= 60 and cl['xp'] == cl['reward_xp'], "claim da XP")
# no se puede reclamar dos veces
ok(c.post('/api/daily/claim', json=DK).status_code == 409, "doble claim -> 409")
# el XP quedó guardado en el usuario
after = c.post('/api/daily', json=DK).json()
ok(after['xp'] == cl['xp'] and after['claimed'], "xp persistido + misión reclamada")

print("\nTODO OK")
