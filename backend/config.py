"""Config del backend de Age of Ansem — todo por variables de entorno (Render)."""
import os

def _bool(v): return str(v).strip().lower() in ('1', 'true', 'yes', 'on')

# Base de datos: Render Postgres da 'postgres://...'; SQLAlchemy 2 quiere 'postgresql+psycopg2://'.
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./aoa.db').strip()
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql+psycopg2://', 1)
elif DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg2://', 1)

# Solana / token de pump.fun (definir TOKEN_MINT al lanzar la moneda; vacío = modo stub)
SOLANA_RPC_URL = os.getenv('SOLANA_RPC_URL', 'https://api.mainnet-beta.solana.com').strip()
TOKEN_MINT     = os.getenv('TOKEN_MINT', '').strip()
MIN_HOLD       = float(os.getenv('MIN_HOLD', '1') or 1)

# Acceso abierto: deja entrar a cualquiera aunque TOKEN_MINT esté seteado (útil pre-lanzamiento).
BETA_OPEN = _bool(os.getenv('BETA_OPEN', 'false'))

# Firma del nonce (prueba de titularidad de la billetera). Sin token conviene dejarlo en false.
REQUIRE_SIGNATURE = _bool(os.getenv('REQUIRE_SIGNATURE', 'false'))
# Secreto para firmar el session_token (CAMBIAR en producción, setear AOA_SECRET en Render).
SECRET = os.getenv('AOA_SECRET', 'dev-secret-cambiar-en-produccion')

# CORS: orígenes permitidos separados por coma (ej: "https://ageofansem.xyz,https://ambar.onrender.com"). '*' = todos.
CORS_ORIGINS = [o.strip() for o in os.getenv('CORS_ORIGINS', '*').split(',') if o.strip()] or ['*']

MODE = 'live' if TOKEN_MINT else 'stub'
