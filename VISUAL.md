# VISUAL.md — Biblia de arte de ÁMBAR (canon: Tiny Swords)

> Rama `visual/canon-tiny-swords`. Solo capa visual: sin backend, sin mecánicas.
> Todas las dimensiones de este documento están **medidas sobre los archivos reales**
> (script con PIL), no estimadas. Donde la semántica de una animación no está
> verificada frame a frame, dice **"a verificar"** — no se inventa.
> Complementa a `DESIGN.md` (el plan del pivote); acá vive la verdad del arte.

---

## 1. INVENTARIO (verdad de campo)

**Estado post-purga: 201 PNGs, 100% Tiny Swords** (+ 8 `.ogg` de Kenney, solo audio).
La verificación en vivo (Chromium headless sobre `python3 -m http.server`) carga
**sin errores de consola ni requests fallidas** — 203 referencias chequeadas.

### 1.1 Lo que se PURGÓ (registro de lo que había)

| Grupo | Archivos | Estilo | Estaba en uso | Resolución |
|---|---|---|---|---|
| `kenney_*.png` | 31 | Kenney Medieval RTS (vector plano) | Solo 4 (puestos del mercado) | Borrados; mercado rehecho con props TS |
| `td_*.png` | 12 | Kenney Tiny Dungeon (pixel 16px) | 5 (antorcha, cofre, mimic, murciélago, demonio) | Borrados; reemplazos TS (ver commit de purga) |
| `p_*.png` | 4 | Kenney Particle Pack (fotográfico 512px) | 4 | Borrados; humo → `Dust` de TS, resto → bursts vectoriales |
| Legacy v1 raíz | 10 (`grass/water/house/tower/tree/goldmine/deco1-4`) | Recortes TS viejos | No | Borrados |
| `Tiny Swords.zip` | 1 (8,5 MB) | — | No | Borrado (la licencia prohíbe redistribuir el pack) |

**Se quedan fuera de canon visual pero legítimos:** `assets/sfx/*.ogg` (8, Kenney CC0 — audio).

**Caso especial:** `warrior_*.png` (660×392, recorte custom 110×98 de una versión
vieja del pack) y `sheep.png` (128×64). SON arte Tiny Swords y están en uso, pero
son recortes no-estándar → **reemplazar por los sheets canónicos cuando el equipo
entregue el pack limpio** (el Warrior canónico viene en frames de 192, como el Pawn).

### 1.2 Inventario canónico completo (`assets/img/`)

Grupos con dimensiones idénticas verificadas por script (assert de uniformidad):

| Archivo(s) | Cant. | Dims | Grilla (cols×filas · frame) | En uso |
|---|---|---|---|---|
| `warrior_{blue,red,purple,yellow}.png` | 4 | 660×392 | 6×4 · 110×98 | ✅ |
| `sheep.png` | 1 | 128×64 | 2×1 · 64×64 | ✅ |
| `ts/ground.png` | 1 | 640×256 | 10×4 · 64×64 (tileset, ver §4) | ✅ |
| `ts/water.png` | 1 | 64×64 | estático (tile) | ✅ |
| `ts/foam.png` | 1 | 1536×192 | 8×1 · 192×192 | ✅ |
| `ts/tree_anim.png` | 1 | 768×576 | 4×3 · 192×192 | ✅ (solo fila 0) |
| `ts/bush{1-4}.png` | 4 | 1024×128 | 8×1 · 128×128 | ✅ |
| `ts/rock{1-4}.png` | 4 | 64×64 | estático | ✅ |
| `ts/wrock{1-4}.png` (rocas en agua) | 4 | 1024×128 | 8×1 · 128×128 | ✅ |
| `ts/cloud{1-4}.png` | 4 | 576×256 | estático (imagen) | ✅ |
| `ts/deco01-15.png` | 15 | 64×64 | estático | ✅ (1-15 random) |
| `ts/deco16.png` (espantapájaros), `deco17.png` (cartel) | 2 | 64×128 | estático | ✅ |
| `ts/deco18.png` (tótem) | 1 | 192×192 | estático | ✅ |
| `ts/fence.png` | 1 | 256×192 | 4×3 · 64×64 (autotile de cerco, ver §4.3) | ✅ |
| `ts/castle_black.png` | 1 | 320×256 | estático | ✅ |
| `ts/{house1,house2,house3}_{4 colores}.png` | 12 | 128×192 | estático | ✅ |
| `ts/tower_{4c}.png` | 4 | 128×256 | estático | ✅ |
| `ts/barracks_{4c}.png` | 4 | 192×256 | estático | ✅ |
| `ts/archery_{4c}.png` | 4 | 192×256 | estático | ✅ |
| `ts/monastery_{4c}.png` | 4 | 192×320 | estático | ✅ |
| `ts/goblin_house.png` | 1 | 128×192 | estático | ✅ |
| `ts/goldmine.png` | 1 | 192×128 | estático | ✅ |
| `ts/res_{gold,meat,wood}.png` | 3 | 128×128 | estático | ✅ |
| `ts/pawn_{4c}.png` | 4 | 1152×1152 | 6×6 · 192×192 | ✅ (filas 0-1) |
| `ts/{waxe,wpick,wgold}_{4c}_i.png` | 12 | 1536×192 | 8×1 · 192×192 | ✅ |
| `ts/{waxe,wpick,wgold}_{4c}_r.png` | 12 | 1152×192 | 6×1 · 192×192 | ✅ |
| `ts/archer_{4c}_i.png` / `_r.png` | 4+4 | 1152×192 / 768×192 | 6×1 / 4×1 · 192 | ✅ |
| `ts/monk_{4c}_i.png` / `_r.png` | 4+4 | 1152×192 / 768×192 | 6×1 / 4×1 · 192 | ✅ |
| `ts/dead.png` | 1 | 896×256 | **7×1 · 128×256** | ✅ (frame corregido en esta rama: antes se cortaba a 256 y la anim quedaba corrida) |
| `ts/goblin_torch.png` | 1 | 1344×960 | 7×5 · 192×192 | ✅ (filas 0-1) |
| `ts/goblin_tnt.png` | 1 | 1344×576 | 7×3 · 192×192 | ✅ (filas 0-1) |
| `ts/spear_idle.png` / `spear_run.png` | 2 | 2048×256 / 1536×256 | 8×1 / 6×1 · 256 | ✅ |
| `ts/shaman_idle.png` / `_run.png` | 2 | 1536×192 / 768×192 | 8×1 / 4×1 · 192 | ✅ |
| `ts/gnoll_idle.png` / `gnoll_walk.png` | 2 | 1152×192 / 1536×192 | 6×1 / 8×1 · 192 | ✅ |
| `ts/bear_idle.png` / `bear_run.png` | 2 | 2048×256 / 1280×256 | 8×1 / 5×1 · 256 | ✅ |
| `ts/minotaur_walk.png` | 1 | 2560×320 | 8×1 · 320×320 | ✅ (evento BESTIA) |
| `ts/minotaur_idle.png` | 1 | 5120×320 | 16×1 · 320×320 | huérfano (reserva) |
| `ts/thief_idle.png` / `_run.png` | 2 | 1152×192 c/u | 6×1 · 192 | ✅ |
| `ts/snake_idle.png` / `_run.png` | 2 | 1536×192 c/u | 8×1 · 192 | ✅ |
| `ts/spider_idle.png` / `_run.png` | 2 | 1536×192 / 960×192 | 8×1 / 5×1 · 192 | ✅ |
| `ts/pigrider_idle.png` / `_run.png` | 2 | 2048×256 / 1024×256 | 8×1 / 4×1 · 256 | ✅ |
| `ts/pig_idle.png` / `pig_run.png` | 2 | 1920×192 / 768×192 | 10×1 / 4×1 · 192 | ✅ |
| `ts/cave.png` | 1 | 1536×192 | 8×1 · 192×192 | ✅ |
| `ts/boat.png` | 1 | 2048×256 | 8×1 · 256×256 | ✅ |
| `ts/sboat.png` | 1 | 1536×192 | 8×1 · 192×192 | ✅ |
| `ts/shark.png` | 1 | 1344×192 | 7×1 · 192×192 | ✅ |
| `ts/duck.png` | 1 | 96×32 | 3×1 · 32×32 | ✅ |
| `ts/fire.png` | 1 | 896×128 | 7×1 · 128×128 | ✅ |
| `ts/explosion.png` | 1 | 1728×192 | 9×1 · 192×192 | ✅ |
| `ts/dust1.png` / `dust2.png` | 2 | 512×64 / 640×64 | 8×1 / 10×1 · 64×64 | ✅ (nuevos, Particle FX del Free Pack) |
| `ts/av/h{01-25}.png` (retratos humanos) | 25 | 256×256 | estático | ✅ (crónica) |
| `ts/av/e{01-18}.png` (retratos enemigos) | 18 | 256×256 | estático | ✅ (crónica) |
| `ui/ribbon_{yellow,blue,red}.png` | 3 | 192×64 | estático (9-slice manual vía CSS) | ✅ (amarillo+azul; rojo reserva) |
| `ui/banner.png` | 1 | 448×448 | estático | reserva |

---

## 2. PURGA A CANON — aplicada ✅

Commit `chore: purga de assets no-canon`. Reemplazos hechos (sin referencias rotas):

| Uso que tenía un asset no-canon | Reemplazo Tiny Swords |
|---|---|
| Antorcha Tiny Dungeon (plaza/barrios) | **Brasero**: llama `fire.png` animada a escala 0,34 + glow vectorial |
| Cofre/Mimic del HALLAZGO | **Pila de oro** (`res_gold`) que brota con tween |
| Puestos Kenney del mercado | Pilas de recursos + zapallos + cartel (`deco12/13/17/6`) |
| Humo Kenney (incendios y FX) | **Dust** animado del Particle FX de TS (`dust1/2`) |
| Magia/chispas/confetti Kenney | Bursts vectoriales (`dot` procedural) — ver §8 huecos |
| Murciélagos (cueva) | Eliminados — "criatura voladora" queda en §8 |
| Silueta del dragón | Sombra elíptica vectorial que barre el suelo — sprite real en §8 |

Verificación: `node --check` + Chromium headless → **0 errores, 0 requests fallidas**.

---

## 3. CATÁLOGO CANÓNICO (reglas de uso por asset)

**Convenciones globales** (valen para todo el catálogo):
- **Anclaje edificios/decos/unidades**: `origin(0.5, 1)` en la **base** del sprite
  (los frames 192/256 de unidades traen aire abajo: hoy se usa `origin(0.5, 0.72)`
  porque los pies están a ~72% del frame — regla vigente y probada en vivo).
- **Depth = y de la base** (orden painter's de arriba hacia abajo). El suelo va a
  RenderTexture con depth -20, foam -25, agua -30, cosas del mar -23/-24.
- Escalas actuales probadas: guerrero legacy 0,72 · unidades 192 → 0,62 ·
  unidades 256 → 0,52-0,55 · minotauro 0,75 · edificios 0,72-0,9 · castillo 0,9.

### 3.1 Semántica de animaciones (qué es cada fila/tira)

| Sheet | Fila/tira | Contenido | Estado |
|---|---|---|---|
| `warrior_*` (6×4) | f0 / f1 / f2 / f3 | idle-frente / idle-espalda / run-frente / run-espalda | **Verificado en vivo** |
| `pawn_*` (6×6) | f0 / f1 | idle / run | **Verificado** (contact sheet + vivo) |
| `pawn_*` | f2-f3 | trabajo con herramienta (martillo/talado) | **A verificar** cuál es cuál |
| `pawn_*` | f4-f5 | carry (idle y run con carga) | **A verificar** orden exacto |
| `goblin_torch` (7×5) | f0 (7 fr) / f1 (6 fr) | idle / run | **Verificado** |
| `goblin_torch` | f2-f4 | ataques con antorcha | **A verificar** |
| `goblin_tnt` (7×3) | f0 (7 fr) / f1 (6 fr) | idle / run | En uso sin glitch |
| `goblin_tnt` | f2 | lanzar TNT | **A verificar** |
| `tree_anim` (4×3) | f0 (4 fr) | idle (copa moviéndose) | **Verificado** |
| `tree_anim` | f1-f2 | golpe de hacha / caída (probable) | **A verificar** |
| Tiras separadas `_idle/_run` (workers, archer, monk, spear, shaman, gnoll, bear, thief, snake, spider, pigrider, pig) | única | lo que dice el nombre del archivo | Semántica clara por archivo |
| `dead` (7×1 · 128×256) | única | caballero cayendo → quieto | Frame corregido en esta rama; **revisar en vivo** |
| `fire` 7f / `explosion` 9f / `cave` 8f / `foam` 8f / `bush` 8f / `wrock` 8f / `duck` 3f / `dust1` 8f / `dust2` 10f | única | loop (fire/cave/foam/bush/wrock/duck) · one-shot (explosion/dust) | En uso ✅ |

### 3.2 Mapeo a piezas de juego (tabla A.3 del DESIGN.md)

Ver DESIGN.md §A.3 — resumen operativo: castillo=Ayuntamiento/Castillo Real ·
casas=población · torre=defensa · cuartel/arquería=entrenamiento · monasterio=premium ·
mina+árbol+oveja=producción (con pawns waxe/wpick/wgold) · pilas=depósitos ·
goblins antorcha/TNT=PvE · guerrero/arquero=tropas · edificio rojo=skin premium.

---

## 4. TERRENO Y GRILLA

### 4.1 Tile y tileset de suelo (`ts/ground.png`, 640×256 = 10×4 tiles de 64)

Índice = `fila×10 + columna`. **Mapeado por coordenada y verificado en vivo:**

```
PASTO (cols 0-3)                    ARENA (cols 5-8)
 0  1  2 │ 3          4              5  6  7 │ 8         9
10 11 12 │13     (matitas          15 16 17 │18    (montoncitos
20 21 22 │23      sueltas)         25 26 27 │28     de arena)
─────────┘                         ─────────┘
30 31 32   33                      35 36 37   38

0/2/20/22 = esquinas · 1/21 = borde N/S · 10/12 = borde O/E · 11 = CENTRO pleno
col 3 (3/13/23) = tira vertical aislada · fila 3 (30/31/32) = tira horizontal aislada
33 = tile suelto · idem arena desplazado +5 (centro pleno = 16)
```

- **Agua**: `water.png` 64×64, se tilea como fondo (tileSprite).
- **Espuma**: `foam.png` 8f de 192 — se apoya centrada bajo cada tile de costa
  (cubre 3×3, tapa las costuras del borde).
- **Elevación y puentes**: existen en el pack (`Tilemap_Elevation.png` 256×512,
  `Bridge_All.png` 192×256) pero **no están importados** — quedan para cuando el
  mapa del reino pida acantilados/ríos. Anotado en §8.

### 4.2 Estructura visual del REINO compartido (mapa actual)

- Grilla de **48×30 tiles** (3072×1920 px). Isla orgánica por máscara de ruido +
  suavizado; autotile 3×3 + espuma en toda la costa.
- Plaza de arena (autotile arena) con el Castillo Real; **calles de arena** de 1-2
  tiles desde cada barrio a la plaza; barrios amurallados con `fence` (autotile §4.3).
- Zonas: barrios (×4) · plaza/mercado · granja · mina · bosque goblin · zona
  salvaje (cueva) · mar con fauna propia. Regla: **cada bioma tiene sus criaturas
  y no se mezclan solas** (home range).

### 4.3 Cerco (`fence.png` 4×3 de 64) — autotile de rectángulo

```
0  1  2  3        0/3/8/11 = esquinas TL/TR/BL/BR
4  ·  ·  7        1-2 / 9-10 = tramos horizontales N/S
8  9 10 11        4 / 7 = tramos verticales O/E   (5/6 vacíos)
```

### 4.4 Estructura visual de una PARCELA (propuesta, sin implementar)

- Grilla de **20×14 tiles** (1280×896 px): entra cómoda en pantalla con zoom 1.
- Marco: agua + espuma en el perímetro (cada parcela es "su islita" — mismo
  lenguaje visual del reino) o cerco `fence` según tier.
- Interior: pasto pleno (idx 11) + camino de arena de la puerta al Ayuntamiento.
- Overlay de construcción: grilla de 64px semitransparente + resaltado de huella
  (verde=válida / rojo=inválida) — a producir (§8).

---

## 5. EDIFICIOS + HUELLAS

Colores: el pack limpio del equipo trae **solo azul y rojo**. El repo hoy tiene
además violeta/amarillo (del pack completo). **Regla del pivote:** azul = skin
base de toda parcela · **rojo = skin premium** (sink de $TOKEN) · la identidad de
facción NO va por color de edificio sino por **estandarte** (banner vectorial hoy;
del pack UI cuando se produzca) **+ color de unidad** (los warriors/pawns sí
existen en 4 colores). Violeta/amarillo quedan como reserva para el reino
compartido (barrios NPC), no para parcelas.

| Edificio | Dims | Huella (tiles) | Regla de colocación |
|---|---|---|---|
| Castillo (`castle_black`, y `castle` azul/rojo del pack limpio) | 320×256 | **4×2** | Solo 1 por parcela (Ayuntamiento); en el reino, el Real en la plaza |
| Torre (`tower_*`) | 128×256 | **1×1** | Borde de parcela / esquinas de muralla |
| Cuartel (`barracks_*`) | 192×256 | **2×1** | Interior |
| Arquería (`archery_*`) | 192×256 | **2×1** | Interior |
| Monasterio (`monastery_*`) | 192×320 | **2×1** | Interior (premium) |
| Casa 1/2/3 (`house{1,2,3}_*`) | 128×192 | **1×1** | Interior, deja pasillos de 1 tile |
| Choza goblin (`goblin_house`) | 128×192 | 1×1 | Solo PvE (campamentos) |
| Mina (`goldmine`) | 192×128 | **2×1** | Sobre "veta" (zona minera) |

Física actual: pie de colisión = rectángulo de `ancho_visual×0,5 × 22px` en la
base + huella lógica en la grilla `blocked` (la que respeta el pathfinding BFS).

---

## 6. UNIDADES (grillas medidas + semántica)

| Unidad | Sheets | Grilla · frame | idle | run | Otras tiras |
|---|---|---|---|---|---|
| **Guerrero** (legacy) | `warrior_{4c}` | 6×4 · 110×98 | f0 (frente), f1 (espalda) | f2, f3 | — (attack no está en este recorte; el canónico del equipo lo traerá) |
| **Pawn** | `pawn_{4c}` | 6×6 · 192 | f0 (6 fr) | f1 (6 fr) | f2-3 trabajo, f4-5 carry — **a verificar** |
| **Pawn-hacha** (leñador) | `waxe_{4c}_i/_r` | 8×1 / 6×1 · 192 | tira `_i` | tira `_r` | attack/chop del pack **no importado** |
| **Pawn-pico** (minero) | `wpick_{4c}_i/_r` | 8×1 / 6×1 · 192 | `_i` | `_r` | ídem |
| **Pawn-oro** (cargador) | `wgold_{4c}_i/_r` | 8×1 / 6×1 · 192 | `_i` | `_r` | variantes madera/carne/martillo/cuchillo existen en el pack — no importadas |
| **Arquero** | `archer_{4c}_i/_r` | 6×1 / 4×1 · 192 | `_i` | `_r` | `Archer_Shoot` (8f) en el pack — no importado |
| **Monje** | `monk_{4c}_i/_r` | 6×1 / 4×1 · 192 | `_i` | `_r` | `Heal` + `Heal_Effect` (11f) en el pack — no importados |
| **Goblin antorcha** | `goblin_torch` | 7×5 · 192 | f0 (7) | f1 (6) | f2-4 ataques — a verificar |
| **Goblin TNT** | `goblin_tnt` | 7×3 · 192 | f0 (7) | f1 (6) | f2 lanzar — a verificar |
| Lancero goblin | `spear_idle/_run` | 8×1 / 6×1 · 256 | ✓ | ✓ | attacks en pack, no importados |
| Chamán | `shaman_idle/_run` | 8×1 / 4×1 · 192 | ✓ | ✓ | hechizos en pack, no importados |
| Fauna (oso/serpiente/araña/gnoll/ladrón/cerdo/jinete) | `_idle/_run` | ver §1.2 | ✓ | ✓ | attacks en pack |
| **Minotauro** (jefe) | `minotaur_walk` (+`_idle` 16f reserva) | 8×1 · 320 | (idle importado, sin uso) | ✓ | attack/guard en pack |

Cuerpos física (probados): frame 192 → `setSize(30,20).setOffset(81,118)` ·
frame 256 → `setSize(36,22)` centrado · guerrero legacy → `setSize(26,20).setOffset(42,68)`.

---

## 7. IDENTIDAD VISUAL

### 7.1 Paleta y facciones
- **Chrome broadcast** (CSS vars): fondo obsidiana `#16110c/#1f1811/#120d09`,
  tinta `#ece3d0`, latón `#c9a227`, brasa `#e5533a`, y los 4 colores de facción
  `#4a90c2 / #d64545 / #9b6fce / #d8b53a`.
- **Facciones en el mundo**: color de unidad (4 colores completos) + estandarte
  vectorial + edificios del color (hoy; a futuro: solo unidad+estandarte, §5).
- **Día/noche**: overlay fijo a cámara — día alpha 0 · amanecer naranja `#e08a3c`
  · atardecer `#e0662c` · noche azul `#0a1436` alpha 0,52. Los braseros (llama
  TS + glow) son el punto de luz nocturno.

### 7.2 Chrome actual (documentado)
- **Topbar**: EN VIVO pulsante · título · espectadores · director de eventos
  (select + LANZAR) · SONIDO/PAUSA/velocidad — botones con `ribbon_blue` TS.
- **Panel lateral**: "La Crónica" (header con `ribbon_yellow` TS) — feed con
  retratos 256px del pack, hora y tag coloreado; leyenda de facciones; crédito.
- **Viewport**: retículo de esquinas + cruz + iris ("Ojo del Vigía"), grano CRT,
  banda inferior "AHORA OBSERVANDO". Lupa: rueda/arrastre/doble-click.

### 7.3 Evolución propuesta para 3 modos (por escrito, sin implementar)

| Elemento | 🎥 Director/stream | 🏗️ Mi base (constructor) | 👀 Visita |
|---|---|---|---|
| Retículo/grano CRT | ✅ (identidad del stream) | ❌ (molesta para construir) | Opcional sutil |
| Crónica lateral | ✅ completa | Colapsada a toasts (avisos de obra/producción) | Visible: "historial de esta base" |
| Topbar | EN VIVO + espectadores + director | Recursos (oro/madera/comida con íconos TS) + botón CONSTRUIR | Nombre del dueño + tier + botón "volver al reino" |
| Cámara | Cortes automáticos + lupa | Libre (pan/zoom), sin cortes | Libre limitada a la parcela |
| Paleta | Obsidiana/latón actual | Igual + acentos verde/rojo de validación de huella | Igual + marco con el estandarte del dueño |
| UI de acciones | Select de eventos (LANZAR) | Panel de edificios (cards con retrato del edificio, costo, nivel) — **a producir** | Solo lectura |

### 7.4 Coherencia de peso visual entre modos
El reino usa la misma grilla, tileset y unidades que las parcelas: **una parcela
es visualmente un pedacito del reino**. Esa es la regla que mantiene todo cosido.

---

## 8. HUECOS (lo que falta producir — lista para el equipo de arte)

Comparando DESIGN.md §A.3 con lo que existe:

1. **UI de construcción**: panel/cards de edificios, botones de acción, cursor de
   colocación, **grilla overlay 64px** y resaltado de huella válida/inválida.
   (El pack trae `UI Buttons/Ribbons/Banners` — importados solo 3 ribbons.)
2. **Íconos de recurso para HUD** (oro/madera/comida chicos, ~24-32px): las pilas
   `res_*` son sprites de mundo, no íconos. El pack trae `UI/Icons` (no importado).
3. **Indicador de nivel de edificio** (badge 1-5) y **barra de progreso de obra**
   (el pack trae `UI Elements/Bars` — no importado).
4. **Barra de vida del Castillo Real** (asedio) — mismo origen `Bars`.
5. **Cursor/pointers**: el pack trae `UI/Pointers` (6) — no importados.
6. **Criatura voladora** (dragón/murciélagos): NO existe en Tiny Swords. Hoy el
   dragón es una sombra vectorial. Producir sprite o aceptar la sombra como
   lenguaje (la crónica ya dice "sombra alada").
7. **Estandartes de facción como asset** (hoy son vectores): el pack trae
   `UI Banners` — decidir arte definitivo con el equipo.
8. **Partícula de magia/chispa TS** (para HALLAZGO/FIESTA): el Particle FX del
   Free Pack solo trae Dust/Fire/Explosion/Water Splash — hoy se usan bursts
   vectoriales. Producir o aceptar.
9. **Attack/Shoot/Heal/Chop**: las tiras existen en el pack pero no están
   importadas (se van a necesitar para defensa de parcela en F3).
10. **Elevación + puentes** (`Tilemap_Elevation`, `Bridge_All`): en el pack, sin
    importar — para cuando el mapa del reino gane geografía.
11. **Warrior/sheep canónicos** en frames 192 (reemplazo de los recortes legacy).
12. **Marco/placa de parcela** (nombre del dueño + tier) para modo visita.

---

## 9. COHERENCIA (qué estaba roto y cómo quedó)

| Inconsistencia que había | Estado tras la purga |
|---|---|
| Terreno/edificios Kenney (vector plano, sin outline) bajo unidades TS (pixel-art con outline grueso) | ✅ Resuelto en v3 (terreno TS) y ahora sin restos Kenney |
| Monstruos Tiny Dungeon de 16px (grilla pixel visible) junto a criaturas TS de 192px | ✅ Purgados; el bestiario es 100% TS |
| Partículas fotográficas 512px (Kenney) sobre pixel-art | ✅ Dust TS + bursts vectoriales |
| Antorcha/cofre 16px escalados ×2,4 (pixel doble) en la plaza | ✅ Brasero con llama TS / pila de oro TS |
| Puestos de mercado de otra grilla (Kenney 64 plano) | ✅ Props TS |
| `dead.png` cortado a 256 (anim de muerte corrida desde F. v3) | ✅ Frame corregido a 128×256 |
| Crédito del footer citaba a Kenney como arte principal | ✅ Actualizado (arte: TS; sonido: Kenney) |
| Restos vectoriales: `dot` (bursts), tumba, estandarte, glow, sombra del dragón | ⚠️ Se quedan **a conciencia** como "lenguaje de efectos" — documentados acá y en §8 para reemplazo futuro |

**Regla de oro en adelante:** ningún PNG entra a `assets/img/` si no es Tiny
Swords. Lo no-TS permitido: audio (`sfx/`), CSS del chrome y vectores de efectos
listados arriba.
