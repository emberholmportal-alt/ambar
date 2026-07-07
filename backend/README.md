# Backend de Age of Ansem (FastAPI + PostgreSQL)

API para el registro por billetera (Solana/Phantom), el ranking por usuario y el
roster de nombres que el live usa para etiquetar unidades.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET  | `/api/health` | estado y modo (`stub` mientras no haya token) |
| GET  | `/api/holder/{pubkey}` | verifica holder server-side (`{holder, amount, stub}`) |
| POST | `/api/register` | `{pubkey, username, proof?}` → registra/renombra (nombre único). Devuelve `session_token` |
| POST | `/api/score` | `{pubkey, session_token, score, wave, survived, resources, kills}` → guarda la partida |
| GET  | `/api/leaderboard?limit=10` | mejores usuarios |
| GET  | `/api/roster?limit=40` | nombres para las etiquetas del live |

El `session_token` = HMAC(billetera) se emite al registrar (tras verificar holder y,
si `REQUIRE_SIGNATURE=true`, la firma del nonce) y se manda en cada score para
atribuirlo a la billetera verificada.

## Correr local

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload           # usa SQLite (aoa.db) por defecto
python test_smoke.py                # smoke test con SQLite en memoria (sin Postgres)
```

## Desplegar en Render

El front (static site) ya está desplegado aparte. El backend es un **servicio nuevo**.

**1) Base de datos PostgreSQL**
- Dashboard → **New → PostgreSQL**. Nombre `ambar-db`, misma región que vayas a usar, plan Free/Starter.
- Copiá el **Internal Database URL**.

**2) Web Service (la API)**
- **New → Web Service** → conectá el repo `emberholmportal-alt/ambar`.
- **Root Directory:** `backend`
- **Runtime:** Python 3
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Misma región que la DB.

**3) Environment variables del Web Service**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | el *Internal Database URL* de la Postgres (o linkeá la DB desde “Environment”) |
| `AOA_SECRET` | una cadena random larga (firma los session_token) |
| `CORS_ORIGINS` | `https://ageofansem.xyz,https://<tu-static>.onrender.com` |
| `SOLANA_RPC_URL` | *(opcional)* un RPC propio (Helius/QuickNode); si no, usa el público |
| `TOKEN_MINT` | *(vacío por ahora)* el mint del token de pump.fun cuando lo lances |
| `MIN_HOLD` | *(opcional)* mínimo de tokens para ser holder (default `1`) |
| `REQUIRE_SIGNATURE` | *(opcional)* `true` para exigir la firma del nonce (default `false`) |

**4) Deploy y prueba**
```bash
curl https://<servicio>.onrender.com/api/health      # -> {"ok":true,"mode":"stub"}
```
Las tablas se crean solas al arrancar (no hace falta migración).

**5) Conectar el front**
- En `src/config.js` poné:
  ```js
  window.AOA_API = 'https://<servicio>.onrender.com';
  ```
- Redeployá el static. Desde ahí: la landing registra en el backend, la beta sube
  los scores y el live muestra el ranking real (reemplaza la lista semilla).

## Cuando se lance el token (pump.fun)
- Seteá `TOKEN_MINT` (y opcional `REQUIRE_SIGNATURE=true`) en el Web Service → pasa de
  `stub` a `live` y empieza a verificar el saldo SPL de verdad. También poné el mint en
  `src/auth.js` (`TOKEN_MINT`) para que el chequeo del cliente coincida.

## Notas
- El Free tier de Render **duerme** el servicio: la primera request tras inactividad tarda unos segundos.
- Pendiente para producción: **denylist/sanitización** de nombres de usuario (stream público 24/7).
