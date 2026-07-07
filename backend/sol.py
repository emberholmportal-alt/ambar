"""Verificación de holder (RPC de Solana) y de firma del nonce (ed25519).
   Con TOKEN_MINT vacío corre en modo stub (deja pasar), igual que el front."""
import base64
import httpx
import base58
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
import config


def check_holder(pubkey: str):
    """Devuelve (holder: bool, amount: float|None, stub: bool)."""
    if not config.TOKEN_MINT:
        return True, None, True                       # todavía no hay token: acceso abierto para probar el flujo
    body = {
        "jsonrpc": "2.0", "id": 1, "method": "getParsedTokenAccountsByOwner",
        "params": [pubkey, {"mint": config.TOKEN_MINT}, {"encoding": "jsonParsed"}],
    }
    try:
        r = httpx.post(config.SOLANA_RPC_URL, json=body, timeout=10.0)
        j = r.json()
        total = 0.0
        for acc in (j.get('result') or {}).get('value', []) or []:
            amt = acc['account']['data']['parsed']['info']['tokenAmount']
            total += float(amt.get('uiAmount') or 0)
        return total >= config.MIN_HOLD, total, False
    except Exception:
        return False, None, False


def verify_signature(pubkey: str, nonce: str, sig_b64: str) -> bool:
    """Valida que `sig_b64` sea la firma ed25519 de `nonce` hecha por `pubkey` (base58)."""
    try:
        vk = VerifyKey(base58.b58decode(pubkey))
        vk.verify(nonce.encode('utf-8'), base64.b64decode(sig_b64))
        return True
    except (BadSignatureError, ValueError, Exception):
        return False
