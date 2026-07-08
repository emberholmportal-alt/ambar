"""Moderación de nombres de usuario (stream público 24/7).
   Denylist básica + reservados. No es exhaustiva; ampliar según haga falta."""
import re
import unicodedata

# términos reservados (marca / roles) — no se permiten como nombre de usuario
RESERVED = {
    'admin', 'administrator', 'administrador', 'mod', 'moderator', 'moderador',
    'dev', 'developer', 'staff', 'official', 'oficial', 'support', 'soporte',
    'system', 'sistema', 'root', 'null', 'undefined', 'anonymous', 'anon',
    'ageofansem', 'aoa', 'theblackbull', 'blackbull', 'watcher', 'ojodelvigia',
}

# subcadenas prohibidas (insultos/slurs comunes ES/EN). Se compara sobre el nombre "compacto".
BANNED = {
    'nigger', 'nigga', 'faggot', 'fag', 'retard', 'chink', 'spic', 'kike', 'coon',
    'rape', 'rapist', 'pedo', 'pedophile', 'nazi', 'hitler', 'kkk',
    'cunt', 'whore', 'slut', 'bitch', 'fuck', 'shit', 'dick', 'cock', 'pussy',
    'puto', 'puta', 'putos', 'putas', 'concha', 'conchatumadre', 'ctm',
    'mierda', 'pija', 'verga', 'polla', 'coño', 'joto', 'maricon', 'trolo',
    'violador', 'pedofilo', 'negrodemierda',
}

def _compact(s: str) -> str:
    """Minúsculas, sin acentos y sólo letras/números (para saltear separadores)."""
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]', '', s.lower())

def name_ok(name: str) -> bool:
    n = (name or '').strip().lower()
    compact = _compact(name)
    if not compact:
        return False
    if n in RESERVED or compact in RESERVED:
        return False
    for bad in BANNED:
        if bad in compact:
            return False
    return True
