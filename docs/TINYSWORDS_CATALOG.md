# TINYSWORDS_CATALOG.md — Catálogo maestro de Tiny Swords (Pixel Frog)

> La **biblia de arte** de ÁMBAR. Es todo lo que el pack Tiny Swords ofrece de verdad,
> relevado sprite por sprite sobre los packs originales (no sobre lo que quedó en el repo).
> Sirve para: (a) decidir el roster del juego sobre el catálogo completo, y (b) saber qué
> assets limpios hace falta procesar.
>
> **Convenciones del pack:** grilla de terreno = **64px**. Unidades = frames de **192px**
> (el personaje ocupa el centro, hay padding transparente). Anclaje recomendado top-down:
> `origin (0.5, 1)` en la base, `depth = y` de la base para orden correcto.
>
> **Colores/facciones disponibles (LEER):** el roster COMPLETO de unidades
> (Guerrero/Arquero/Lancero/Pawn/Monje) y **los 8 edificios** existen solo en **AZUL y ROJO**.
> Los Guerreros además existen en **Violeta y Amarillo** (hojas combinadas). Todo lo demás es
> azul/rojo. → Decisión de diseño pendiente: **2 reinos (Azul vs Rojo)** con roster completo de
> ambos lados, o mantener 4 "gremios" sabiendo que solo el Guerrero tiene 4 colores y el resto
> se identifica por estandarte + color de unidad.

---

## 1. UNIDADES (frames de 192px salvo aviso)

Cada archivo es UNA animación (el nombre dice cuál); frames = ancho ÷ 192.

### 1.1 Guerrero — AZUL y ROJO (+ violeta/amarillo solo guerrero)
| Animación | Frames | Uso |
|---|---|---|
| Idle | 8 | quieto |
| Run | 6 | caminar/correr |
| Guard | 6 | en guardia (escudo arriba) — ideal "defendiendo" |
| Attack1 / Attack2 | 4 / 4 | dos golpes distintos |
| crusader (variante) | 8 | skin alternativa (idle) |
→ **Tropa melee** (defensa de parcela y ataque en fases futuras).

### 1.2 Arquero — AZUL y ROJO
| Animación | Frames | Uso |
|---|---|---|
| Idle | 6 | quieto |
| Run | 4 | mover |
| Shoot | 8 | disparo (+ `Arrow.png` 64px como proyectil) |
→ **Tropa a distancia** (torres/defensa).

### 1.3 Pawn (obrero) — AZUL y ROJO — **el motor de economía**
| Animación | Frames | Variantes de carga |
|---|---|---|
| Idle | 8 | base + **Oro, Madera, Carne, Hacha, Pico, Martillo, Cuchillo** |
| Run | 6 | base + Oro, Madera, Carne, Hacha, Pico, Cuchillo |
| Interact (trabajar) | Hacha 3, Martillo 3, Pico 6, Cuchillo 4 | **talar / construir / minar / faenar** |
→ **Recolector + constructor**. El martillo = animación de obra; pico = minería; hacha = tala.
Es literalmente el kit para el loop Clash (juntar → construir → mejorar).

### 1.4 Monje — AZUL y ROJO — **sanador/soporte**
| Animación | Frames | Uso |
|---|---|---|
| Idle | 6 | quieto |
| Run | 4 | mover |
| Heal | 11 | lanza curación |
| Heal_Effect | 11 | el efecto visible de la curación |
→ Unidad de soporte / edificio Monasterio (buff de curación). Candidato a **premium ($TOKEN)**.

### 1.5 Lancero — AZUL y ROJO — **avanzado (grilla 64px, 8 direcciones)**
Direcciones: Down, DownRight, Right, UpRight, Up (izquierdas por espejo). Por dirección:
Idle, Run, **Attack** (15f) y **Defence** (30f). Frame **64px** (distinto a los de 192).
→ Tropa rica y direccional, pero **más laburo de integrar** (otra grilla + 8 dir). Sugerencia:
dejarlo para después; con Guerrero + Arquero alcanza para el MVP.

### 1.6 Goblins — solo ROJO (hojas combinadas)
| Sprite | Grilla | Notas |
|---|---|---|
| Torch_Red | 7×10 (192) | antorcha — incendia (encaja con la mecánica de fuego) |
| TNT_Red | 7×8 (192) | dinamita — explota (incluye animación de explosión) |
→ **Enemigos PvE** de las oleadas/asedio. (Las filas idle/run/attack las verifico al procesarlos.)

---

## 2. EDIFICIOS (imágenes estáticas) — AZUL y ROJO

| Edificio | Tamaño | Huella aprox. | Pieza de juego |
|---|---|---|---|
| **Castle** | 320×256 | 5×2 tiles base | Ayuntamiento / **Castillo Real** central |
| **Monastery** | 192×320 | 3×2 (alto) | Premium: curación/buff — sink $TOKEN |
| **Barracks** | 192×256 | 3×2 | Entrena Guerreros |
| **Archery** | 192×256 | 3×2 | Entrena Arqueros |
| **Tower** | 128×256 | 2×2 | Defensa (ataca oleadas) |
| **House1 / House2 / House3** | 128×192 | 2×2 | Cupo de población (3 estilos) |
| Azul = skin base · Rojo = **skin premium** ($TOKEN) | | | |

---

## 3. RECURSOS

| Asset | Grilla | Pieza de juego |
|---|---|---|
| GoldMine_Inactive | 192×128 | Mina de **oro** (Pawn-pico) |
| Tree (192) | 4×3 anim | **Madera** (Pawn-hacha); animación de balanceo |
| Tree1 (Pack B) | 24×4 (64) | árboles variados/animados |
| Sheep_Idle / _Grass / _Move | 12/24/8 ×2 (64) | **Comida** (granja): quieta, pastando, moviéndose |
| G_Idle / W_Idle / W_small / M_Idle | 64 | **pilas** de Oro / Madera / Carne = depósitos + loot visual |

---

## 4. TERRENO

| Asset | Grilla | Uso |
|---|---|---|
| Tilemap_Flat | 10×4 (64) | pasto (lleno = tile r1,c1) + bordes/tierra |
| **Tilemap_Elevation** | 4×8 (64) | **acantilados/altura** → relieve, mesetas, plataformas |
| Bridge_All | 3×4 (64) | **puentes** sobre agua |
| Water | 64 | agua (tileable) |
| Foam (A) / Water Foam (B) | 8 / **16** frames (192) | **espuma de orilla** animada |
| Rocks_01/02/03 (A) / Water Rocks (B) | 15–16 frames (64) | rocas en el mar (animadas) |
| Rock1–4 (B) | 64 | rocas sólidas en tierra |
| **Clouds_02 / Clouds_07** | 9×4 (64) | **nubes animadas** (atmósfera/sombra) |
| Shadows / Shadow | 3×3 (64) | sombras bajo edificios/unidades (grounding) |
| Tilemap_color1 (B) | 3×2 (192) | tileset de terreno alternativo |

---

## 5. DECORACIÓN

| Asset | Notas |
|---|---|
| Deco 01–19 (A) | arbustos, hongos, piedras, troncos, tocones (64, algunos 64×128 / 192×192) |
| Bushe1–4 (B) | tiras de arbustos (16×2 c/u) — mucha variedad |
| Rock1–4 (B) | piedras sueltas |

---

## 6. KIT DE UI (todo en estilo Tiny Swords)

| Asset | Uso en el juego |
|---|---|
| SmallBlueSquareButton (reg/pressed) | **botones cuadrados** (acciones: construir, mejorar) |
| Button_Blue_3Slides (reg/pressed) | botones anchos 3-slice (etiquetas) |
| SmallBar9 / SmallBar_Fill | **barras** de vida / progreso de construcción |
| **Cursor_04** (2×2) | **cursor de colocación** (modo constructor) |
| **Avatars_01/03/04/06/08/09** (4×4 c/u) | **~96 caras de avatar** para perfiles de jugador |
| RegularPaperBack | fondo de **panel/diálogo** (menús) |
| BigRibbonBlack / Ribbon_Blue / Ribbon_Yellow | **cintas de título** (encabezados) |
| bg_price / bottom_price / bg-power-up | **etiquetas de precio** / costo de construcción |
| shield / attack / move / arrow / tnt | **íconos** de acción |
| Banner_Connection | conectores de UI |
| cut_layout (9 tiles) | marcos para "cortes"/cinemática |

---

## 7. EFECTOS

| Asset | Uso |
|---|---|
| Heal_Effect (11f) | curación del Monje |
| Foam / Water Foam | orilla viva |
| TNT (dentro de TNT_Red) | explosión goblin |
| Arrow | proyectil de arquero |

---

## 8. MAPA RÁPIDO: asset → pieza de juego (núcleo jugable)

- **Ayuntamiento / Castillo Real** ← Castle (azul; el central = compartido)
- **Producción**: Mina→oro, Árbol→madera, Ovejas→comida · pilas = depósitos
- **Obrero**: Pawn (pico=mina, hacha=tala, martillo=construir) 
- **Tropas**: Guerrero (melee), Arquero (rango), Monje (cura), [Lancero avanzado]
- **Defensa**: Torre + tropas · **Enemigos**: goblins Torch/TNT
- **Población**: Casas ×3 · **Premium ($TOKEN)**: edificios rojos + Monasterio
- **UI constructor**: botones + barras + cursor de colocación + paneles + avatares
- **Atmósfera del stream**: nubes, espuma, sombras, elevación, puentes, barcos*

*(\*naves/barcos y otros extras del "mundo vivo" existen en variantes del pack;
se suman al stream sin ser núcleo jugable.)*

---

## 9. HUECOS PROBABLES (a producir aparte, si el diseño los pide)
Sobre lo que el pack NO trae y habría que armar en estilo:
- Íconos de recurso "limpios" para el HUD (moneda de oro / tronco / carne como iconitos) —
  se pueden recortar de las pilas.
- Indicador de **nivel** de edificio (numerito/estrellas).
- **Grilla** de colocación (se dibuja por código, no es asset).
- Marco de **selección** de edificio.
- Barra de progreso sobre el edificio en obra (se compone con SmallBar).

> Nada de esto obliga a salir de Tiny Swords: se recorta/compone del propio pack o se dibuja
> por código respetando la paleta. **Cero Kenney en el render.**
