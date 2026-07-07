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

print("\nTODO OK")
