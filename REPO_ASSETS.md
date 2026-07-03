# REPO_ASSETS.md — Inventario del repo vs catálogo maestro

> Rama `visual/canon-tiny-swords`. Complementa a `docs/TINYSWORDS_CATALOG.md`
> (catálogo maestro del pack, producido por el equipo — referencia canónica) y a
> `VISUAL.md` (reglas de uso: anclajes, escalas, semántica de animaciones).
> Este documento responde dos preguntas: **qué hay hoy en el repo** (medido, no
> estimado) y **qué del catálogo falta**.

---

## 0. Estado y verificación

- **Purga a canon: APLICADA** (commit `b0931b6 chore: purga de assets no-canon`,
  ya mergeada a main vía PR #5). Salieron del repo: 31 PNGs Kenney Medieval, 12
  Tiny Dungeon, 4 partículas Kenney, 10 recortes legacy v1 y `Tiny Swords.zip`.
  Los que estaban en uso se reemplazaron por equivalentes TS ya presentes
  (brasero=fire.png, tesoro=res_gold, humo=dust1/2, mercado=props TS) — sin
  referencias rotas y sin generar arte nuevo.
- **Contenido actual**: **201 PNGs (100% Tiny Swords)** + **8 .ogg** (Kenney CC0,
  solo audio — se queda por regla).
- **Verificación en vivo** (esta rama, post-merge): `python3 -m http.server` +
  Chromium headless → **0 errores de consola, 0 requests fallidas, 0 404**.
  Además, script de referencias cruzadas código↔disco: 203 referencias, ninguna rota.

---

## 1. Inventario del repo (medido con PIL, agrupado)

Todo lo listado es **Tiny Swords** salvo la sección 1.5. Grupos con dimensiones
idénticas verificadas por assert. "Uso" = referenciado por `src/game.js`/`index.html` hoy.

### 1.1 Terreno y ambiente (`assets/img/ts/`)

| Archivo(s) | Dims | Grilla · frame | Uso |
|---|---|---|---|
| `ground.png` (Tilemap_Flat) | 640×256 | 10×4 · 64 (pasto cols 0-3, arena 5-8; centro pasto = idx 11) | ✅ |
| `water.png` | 64×64 | tile | ✅ |
| `foam.png` (Foam A) | 1536×192 | 8×1 · 192 | ✅ |
| `tree_anim.png` (Tree) | 768×576 | 4×3 · 192 (fila 0 = idle) | ✅ |
| `bush{1-4}.png` | 1024×128 | 8×1 · 128 | ✅ |
| `rock{1-4}.png` | 64×64 | estático | ✅ |
| `wrock{1-4}.png` | 1024×128 | 8×1 · 128 | ✅ |
| `cloud{1-4}.png` | 576×256 | estático | ✅ |
| `deco01-15.png` | 64×64 | estático | ✅ |
| `deco16/17.png` | 64×128 | estático | ✅ |
| `deco18.png` | 192×192 | estático | ✅ |
| `fence.png` | 256×192 | 4×3 · 64 (autotile de cerco) | ✅ |
| `cave.png` | 1536×192 | 8×1 · 192 | ✅ |
| `dust1/dust2.png` (Particle FX) | 512×64 / 640×64 | 8×1 / 10×1 · 64 | ✅ |
| `fire.png` | 896×128 | 7×1 · 128 | ✅ |
| `explosion.png` | 1728×192 | 9×1 · 192 | ✅ |

### 1.2 Edificios y recursos

| Archivo(s) | Dims | Uso |
|---|---|---|
| `castle_black.png` | 320×256 | ✅ (Castillo Real) |
| `{house1,house2,house3}_{blue,red,purple,yellow}.png` (12) | 128×192 | ✅ |
| `tower_{4c}.png` (4) | 128×256 | ✅ |
| `barracks_{4c}.png` / `archery_{4c}.png` (8) | 192×256 | ✅ |
| `monastery_{4c}.png` (4) | 192×320 | ✅ |
| `goblin_house.png` | 128×192 | ✅ |
| `goldmine.png` (Active) | 192×128 | ✅ |
| `res_{gold,meat,wood}.png` (3) | 128×128 | ✅ |

### 1.3 Unidades (todas frame 192 salvo aviso)

| Archivo(s) | Dims | Grilla | Uso |
|---|---|---|---|
| `pawn_{4c}.png` | 1152×1152 | 6×6 (f0 idle, f1 run; f2-5 trabajo/carry a verificar) | ✅ |
| `{waxe,wpick,wgold}_{4c}_i.png` (12) | 1536×192 | 8×1 | ✅ |
| `{waxe,wpick,wgold}_{4c}_r.png` (12) | 1152×192 | 6×1 | ✅ |
| `archer_{4c}_i/_r.png` (8) | 1152×192 / 768×192 | 6×1 / 4×1 | ✅ |
| `monk_{4c}_i/_r.png` (8) | 1152×192 / 768×192 | 6×1 / 4×1 | ✅ |
| `dead.png` | 896×256 | 7×1 · **128×256** | ✅ |
| `goblin_torch.png` | 1344×960 | **7×5** (f0 idle 7f, f1 run 6f) | ✅ |
| `goblin_tnt.png` | 1344×576 | **7×3** (f0 idle, f1 run) | ✅ |
| `spear_idle/_run.png` | 2048×256 / 1536×256 | 8×1 / 6×1 · 256 | ✅ |
| `shaman_idle/_run.png` | 1536×192 / 768×192 | 8×1 / 4×1 | ✅ |
| `gnoll_idle/_walk.png` | 1152×192 / 1536×192 | 6×1 / 8×1 | ✅ |
| `bear_idle/_run.png` | 2048×256 / 1280×256 | 8×1 / 5×1 · 256 | ✅ |
| `minotaur_walk.png` / `minotaur_idle.png` | 2560×320 / 5120×320 | 8×1 / 16×1 · 320 | ✅ / huérfano |
| `thief_idle/_run.png` | 1152×192 c/u | 6×1 | ✅ |
| `snake_idle/_run.png` | 1536×192 c/u | 8×1 | ✅ |
| `spider_idle/_run.png` | 1536×192 / 960×192 | 8×1 / 5×1 | ✅ |
| `pigrider_idle/_run.png` | 2048×256 / 1024×256 | 8×1 / 4×1 · 256 | ✅ |
| `pig_idle/_run.png` | 1920×192 / 768×192 | 10×1 / 4×1 | ✅ |
| `boat.png` / `sboat.png` / `shark.png` | 2048×256 / 1536×192 / 1344×192 | 8/8/7 ×1 | ✅ |
| `duck.png` | 96×32 | 3×1 · 32 | ✅ |

### 1.4 UI y retratos

| Archivo(s) | Dims | Uso |
|---|---|---|
| `av/h{01-25}.png` (25 retratos humanos) | 256×256 | ✅ (crónica) |
| `av/e{01-18}.png` (18 retratos enemigos) | 256×256 | ✅ (crónica) |
| `ui/ribbon_{yellow,blue}.png` | 192×64 | ✅ (chrome) |
| `ui/ribbon_red.png` / `ui/banner.png` | 192×64 / 448×448 | huérfanos (reserva TS) |

### 1.5 Lo que NO es arte Tiny Swords (permitido por regla)

| Qué | Detalle | Estado |
|---|---|---|
| `assets/sfx/*.ogg` (8) | Audio Kenney CC0 (eventos) | ✅ Se queda (no toca el render) |
| `warrior_{4c}.png` (660×392, 6×4 · 110×98) + `sheep.png` (128×64, 2f) | **SÍ son arte TS** pero recortes custom de una versión vieja del pack | ✅ En uso — **reemplazar por hojas canónicas** (ver §2) |
| Vectores por código | bursts `dot`, tumba, estandarte, glow, sombra del dragón, grilla | Documentados en VISUAL.md §9 — lenguaje de efectos, sin PNG |

---

## 2. CRUCE: catálogo maestro ↔ repo

### 2.1 Del catálogo, YA está en el repo ✔️

- **Terreno**: Tilemap_Flat, Water, Foam (variante A de 8f), rocas de agua y de
  tierra, Deco 01–18, Bushe1–4, Tree (4×3).
- **Edificios**: los 8 del catálogo (Castle/Monastery/Barracks/Archery/Tower/House1-3)
  — y además en **4 colores** (ver discrepancia D3).
- **Unidades**: Pawn base + variantes hacha/pico/oro (idle+run), Arquero (idle+run),
  Monje (idle+run), goblins Torch/TNT (idle+run).
- **Recursos**: GoldMine (Active), pilas G/W/M, Tree.
- **UI**: 3 cintas (yellow/blue/red) + 1 banner.
- **Extras "mundo vivo"** que el catálogo menciona al pasar: cueva, oso, gnoll,
  minotauro, ladrón, serpiente, araña, cerdo, jinete, barcos, tiburón, patito,
  chamán, lancero-goblin, 43 retratos, dust — todos TS (Enemy Pack / Free Pack).

### 2.2 Del catálogo, FALTA en el repo ❌ (pedir al equipo procesado limpio)

| Ítem del catálogo | Para qué | Prioridad |
|---|---|---|
| **Guerrero canónico** (Idle 8f / Run 6f / **Guard 6f** / Attack1-2 4+4f / crusader) | Reemplaza el recorte legacy; Guard y Attack son clave para defensa | 🔴 Alta |
| **Archer_Shoot (8f) + Arrow.png** | Torres/defensa a distancia | 🔴 Alta |
| **Pawn Interact** (hacha 3f / martillo 3f / pico 6f / cuchillo 4f) + variantes carne/martillo/cuchillo | Animación de **obra/tala/minado real** (loop Clash) | 🔴 Alta |
| **Monk Heal (11f) + Heal_Effect (11f)** | Monasterio premium | 🟡 Media |
| **Sheep canónica** (Idle 12f / Grass 24f / Move 8f, ×2 filas @64) | Reemplaza recorte 2f; granja viva | 🟡 Media |
| **Tilemap_Elevation** (4×8 · 64) | Acantilados/relieve del reino | 🟡 Media |
| **Bridge_All** (3×4 · 64) | Puentes | 🟡 Media |
| **Shadows/Shadow** (3×3 · 64) | Grounding de edificios/unidades | 🟡 Media |
| **KIT DE UI completo** (§6 del catálogo): botones cuadrados y 3-slice, SmallBar9/Fill, **Cursor_04**, ~96 avatares 4×4, RegularPaperBack, etiquetas de precio, íconos shield/attack/move/arrow/tnt, cut_layout | **Modo constructor** entero (F1 del DESIGN) | 🔴 Alta para F1 |
| Water Foam B (16f), Clouds_02/07 animadas (9×4), Tilemap_color1, Tree1 (24×4), W_small, Rocks 15-16f | Variantes superiores de ambiente | 🟢 Baja |
| **Lancero** (grilla 64, 8 direcciones, Attack 15f / Defence 30f) | Tropa avanzada — el catálogo mismo sugiere post-MVP | 🟢 Baja |

### 2.3 DISCREPANCIAS repo vs catálogo (a resolver con el equipo)

- **D1 · Goblins con menos filas**: el catálogo dice `Torch_Red` **7×10** y
  `TNT_Red` **7×8**; los archivos del repo miden 1344×960 (**7×5**) y 1344×576
  (**7×3**). Los del repo vienen de una versión vieja del pack (solo idle/run/
  ataques parciales). → Pedir las hojas completas: traen los ataques que faltan.
- **D2 · Huella del Castle**: catálogo dice **5×2**; el código usa **4×2**
  (320px ÷ 64 = 5 de ancho visual — el catálogo tiene razón). → Ajustar cuando
  se implemente la parcela; anotado también en VISUAL.md.
- **D3 · Edificios violeta/amarillo**: el catálogo es claro — edificios solo en
  **azul y rojo**. El repo tiene además violeta/amarillo (venían en el Free Pack
  que procesamos). No es un error de arte (son oficiales) pero **no son parte del
  canon del catálogo** → decisión pendiente del equipo (2 reinos vs 4 gremios,
  planteada en el header del catálogo). Mientras tanto quedan en el repo, en uso
  por los barrios NPC del reino.
- **D4 · Deco 01–19**: el catálogo lista 19; el repo tiene 18. → Verificar si
  existe `deco19` en el pack limpio.
- **D5 · Warrior 4 colores**: el catálogo confirma violeta/amarillo solo para
  Guerrero — consistente con el repo (los 4 warriors legacy). El reemplazo
  canónico debe venir en los 4 colores si se mantienen 4 gremios en el reino.
- **D6 · Nubes**: el repo tiene 4 nubes estáticas (576×256, Free Pack); el
  catálogo apunta a `Clouds_02/07` animadas (9×4 · 64). Conviven bien; las
  animadas son upgrade.
- **D7 · GoldMine**: repo = `GoldMine_Active`; catálogo lista `_Inactive`. Ambas
  existen en el pack (Active/Inactive/Destroyed) — para la parcela van a hacer
  falta los 3 estados.

---

## 3. Registro de la purga (qué salió y con qué se reemplazó)

| Salió (no-canon) | Estaba en uso | Reemplazo aplicado |
|---|---|---|
| 31 × `kenney_*.png` (Medieval RTS) | 4 (puestos del mercado) | Props TS: pilas de recursos + zapallos + cartel |
| 12 × `td_*.png` (Tiny Dungeon 16px) | 5 | Brasero = `fire.png` mini + glow · tesoro = `res_gold` · murciélagos eliminados · dragón = sombra vectorial |
| 4 × `p_*.png` (Particle Pack fotográfico) | 4 | Humo = `dust1/2` (Particle FX TS) · magia/chispas = bursts vectoriales |
| 10 recortes legacy v1 (grass/water/house/tower/tree/goldmine/deco1-4) | No | Borrados |
| `Tiny Swords.zip` (8,5 MB) | No | Borrado (licencia: no redistribuir el pack) |

**Regla de oro vigente:** ningún PNG entra a `assets/img/` si no es Tiny Swords.
Los huecos los cubre el equipo en estilo TS — acá no se genera arte.

---

## 4. Resultado de verificación (anotado como pide el proceso)

```
$ python3 -m http.server 8137        # + Chromium headless (Playwright)
→ index.html carga completa (preload + create + 8 s de update)
→ Errores de consola: 0 · pageerrors: 0 · requests fallidas/404: 0
→ Referencias código↔disco: 203 verificadas, 0 rotas
```
