#!/usr/bin/env python3
"""Escanea el pack de Tiny Swords, detecta animaciones (tiras horizontales de frames
cuadrados), categoriza por carpeta y copia los PNGs placeables al repo con un manifest
JSON para el editor de escenarios (sandbox). Ejecutar una vez; el manifest queda versionado."""
import os, re, json, shutil
from PIL import Image

PACK = os.environ.get('TS_PACK', '/tmp/claude-0/-home-user-ambar/a9b92805-f364-592f-bf15-b2eeae5dff9c/scratchpad/ts/Tiny Swords')
OUT_IMG = 'assets/img/pack'
OUT_MANIFEST = 'assets/editor/manifest.json'
os.makedirs(OUT_IMG, exist_ok=True)
os.makedirs(os.path.dirname(OUT_MANIFEST), exist_ok=True)

FRAME_SIZES = [320, 192, 128, 96, 64]   # tamaños de frame típicos del pack (probamos de mayor a menor)

def anim_of(w, h):
    """Devuelve (fw, fh, frames). Tira horizontal de frames cuadrados => animado."""
    for fs in FRAME_SIZES:
        if h == fs and w % fs == 0 and 2 <= w // fs <= 40:
            return fs, fs, w // fs
    return w, h, 1

def categorize(path):
    p = path.lower()
    if 'particle fx' in p or '/effects' in p or 'explosion' in p or 'fire' in p: return 'efectos'
    if 'bridge' in p: return 'puentes'
    if 'foam' in p or 'water background' in p or '/water/' in p or 'rocks in the water' in p or 'water rocks' in p or 'rubber duck' in p: return 'agua'
    if 'tileset' in p or 'tilemap' in p or '/ground/' in p: return 'terreno'
    if 'bushes' in p or '/trees' in p or 'tree' in p: return 'naturaleza'
    if 'clouds' in p: return 'cielo'
    if 'rock' in p: return 'rocas'
    if 'resource' in p or 'gold' in p or 'meat' in p or 'sheep' in p or 'wood' in p or 'stones' in p: return 'recursos'
    if 'building' in p or 'house' in p or 'castle' in p or 'tower' in p or 'goldmine' in p: return 'edificios'
    if 'decorations' in p or '/deco' in p: return 'decoracion'
    if 'enemies' in p or 'enemy' in p or 'goblin' in p: return 'enemigos'
    if '/units' in p or 'pawn' in p or 'warrior' in p or 'archer' in p: return 'unidades'
    return 'otros'

# carpetas / archivos a saltar (UI pura, fuentes de trabajo)
SKIP = re.compile(r'__macosx|\.aseprite|ui elements|ui banners|avatars|/icons|/cursors|/papers|/buttons|/bars|/banner|/ribbons|/swords|/slots', re.I)

items, seen_names = [], set()
def flat_name(path):
    rel = path.split('Tiny Swords/')[-1]
    base = re.sub(r'[^a-z0-9]+', '_', rel.lower()).strip('_')
    base = re.sub(r'_png$', '', base)
    # acortar: quedarnos con las últimas 3 palabras significativas
    parts = [x for x in base.split('_') if x not in ('tiny','swords','free','pack','enemy','update','010','terrain','decorations','color')]
    name = '_'.join(parts[-4:]) or base
    n, i = name, 2
    while n in seen_names: n = f'{name}{i}'; i += 1
    seen_names.add(n); return n

for root, _, files in os.walk(PACK):
    for f in sorted(files):
        if not f.lower().endswith('.png'): continue
        full = os.path.join(root, f)
        if SKIP.search(full): continue
        try:
            im = Image.open(full); w, h = im.size
        except Exception:
            continue
        if w < 16 or h < 16 or w > 5000 or h > 5000: continue
        fw, fh, frames = anim_of(w, h)
        # saltar los tilesets gigantes de autotile (se manejan aparte); dejamos pasar sprites normales
        if frames == 1 and (w > 640 or h > 640): continue
        cat = categorize(full)
        name = flat_name(full)
        shutil.copy(full, os.path.join(OUT_IMG, name + '.png'))
        items.append({'id': name, 'cat': cat, 'file': f'assets/img/pack/{name}.png',
                      'fw': fw, 'fh': fh, 'frames': frames, 'fps': 8 if frames > 1 else 0})

# orden por categoría y nombre
order = ['terreno','naturaleza','rocas','agua','decoracion','recursos','edificios','puentes','efectos','unidades','enemigos','cielo','otros']
items.sort(key=lambda it: (order.index(it['cat']) if it['cat'] in order else 99, it['id']))
cats = {}
for it in items: cats[it['cat']] = cats.get(it['cat'], 0) + 1
json.dump({'count': len(items), 'cats': cats, 'items': items}, open(OUT_MANIFEST, 'w'), indent=0)
print('total assets:', len(items))
for c in order:
    if c in cats: print(f'  {c:12s} {cats[c]}')
