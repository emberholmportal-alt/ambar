# DESIGN.md — ÁMBAR: del livestream pasivo al reino jugable con $TOKEN

> Documento de diseño previo a implementación. **Acá no hay código**: es el plan.
> Contexto: pivoteamos de "stream 24/7 autónomo" a **juego tipo Clash of Clans**
> sobre un reino compartido, con utilidad real de token (Pump.fun / Solana).
> Estética canónica: **Tiny Swords**. Los assets limpios los provee el equipo.

---

## A. AUDITORÍA DE ASSETS

### A.1 Estado actual (qué hay y de dónde viene)

Hoy el juego mezcla **4 fuentes visuales**. Auditoría real del código (`src/game.js`,
`index.html`) y de `assets/`:

| Pack | En uso hoy | Huérfanos (en disco, sin uso) | Veredicto |
|---|---|---|---|
| **Tiny Swords** (`assets/img/ts/` + `ui/`) | ~150 archivos: terreno, foam, edificios ×4 colores, pawns, trabajadores, arqueros, monjes, goblins, fauna, efectos, avatares, cintas UI | `ui/banner.png`, `ui/ribbon_red.png` | ✅ **CANON** |
| **Tiny Swords recortado viejo** (raíz de `img/`) | `warrior_*.png` ×4 (110×98, recorte custom), `sheep.png` | `grass/water/house/tower/tree/goldmine/deco1-4.png` (10 archivos de la v1) | 🔁 Reemplazar por versión canónica del pack limpio del equipo |
| **Kenney Medieval RTS** (`kenney_*.png`) | Solo 4: `stall1/2`, `tent1/2` (puestos del mercado) | 27 archivos (casas, torres, terreno, árboles de la v2) | ❌ **PURGAR** |
| **Kenney Tiny Dungeon** (`td_*.png`) | 5: `chest`, `mimic`, `torch`, `bat`, `demon` (demon ya sin uso real) | 7 (skeleton, orc, ghost, slime, spider, wizard, potion) | ❌ **PURGAR** (ver A.3 reemplazos) |
| **Kenney Particle Pack** (`p_*.png`) | 4: flame, smoke, magic, star (efectos) | — | ❌ Purgar visual → reemplazar por `Particle FX` del Free Pack de Tiny Swords |
| **Kenney Audio** (`assets/sfx/*.ogg`) | 8 sonidos de eventos | — | ✅ **Se queda** (audio no rompe estética; CC0) |
| **`Tiny Swords.zip`** (8,5 MB en main) | — | — | ❌ **Borrar del repo** (la licencia prohíbe redistribuir el pack; además ya extrajimos lo útil) |

### A.2 Regla de canon

**Tiny Swords es la única fuente visual.** Nada que no sea Tiny Swords entra al
render del juego. Excepciones permitidas: audio (Kenney CC0) y tipografía/CSS del
chrome del broadcast.

**Lista de purga concreta** (cuando lleguen los assets limpios):
1. `assets/img/kenney_*.png` (31 archivos) — los 4 puestos del mercado se
   reemplazan por props de Tiny Swords (carpas/mesas del pack limpio, o
   `res_*` + decos mientras tanto).
2. `assets/img/td_*.png` (12) — cofre/mimic → cofre del pack limpio si viene;
   antorcha → brasero/fogata TS; murciélago (silueta del dragón) → efecto propio TS.
3. `assets/img/p_*.png` (4) → `Particle FX` del Free Pack TS.
4. Legacy raíz: `grass/water/house/tower/tree/goldmine/deco1-4.png` (10).
5. `warrior_*.png` recortados → Warrior canónico del pack limpio (frames 192).
6. `Tiny Swords.zip` fuera de main.

### A.3 Mapa: elemento Tiny Swords → pieza de juego

Con lo que el equipo confirma que provee (terreno, edificios **azul y rojo**,
Guerrero/Arquero/Pawn + variantes, goblins antorcha/TNT, recursos):

| Asset Tiny Swords | Pieza de juego |
|---|---|
| Pasto / agua / espuma / puentes | Terreno del reino y de las parcelas |
| **Castillo** | Ayuntamiento (nivel de base) · el del centro del reino = **Castillo Real** compartido |
| **Cuartel (Barracks)** | Entrena Guerreros |
| **Arquería** | Entrena Arqueros |
| **Monasterio** | Edificio premium (curación/buff) — candidato a sink de $TOKEN |
| **Torre** | Defensa de parcela (ataca oleadas) |
| **Casas ×3** | Cupo de población (limita pawns + tropas) |
| **Mina de oro** | Producción de **oro** (con Pawn-pico) |
| **Árbol** | Producción de **madera** (con Pawn-hacha) |
| **Oveja** | Producción de **comida** (granja) |
| Pilas oro/madera/carne | Depósitos/almacén (cap de recursos) y loot visual |
| **Pawn** (variantes oro/madera/carne/hacha/pico/martillo) | Unidad recolectora + **constructora** (martillo = animación de obra) |
| **Guerrero / Arquero** | Tropas de defensa (y ataque en fases futuras) |
| **Goblins antorcha/TNT** | PvE: oleadas que asedian parcelas y el Castillo Real |
| Edificios **azul** | Skin base (default) |
| Edificios **rojo** | **Skin premium** — sink natural de $TOKEN |

> Nota: el pack completo que ya tenemos en el repo suma extras (foam, cueva,
> minotauro, barcos, avatares, cerdos) que quedan para el "mundo vivo" del
> stream; la tabla de arriba es el **núcleo jugable**.

---

## B. DISEÑO DEL JUEGO (el pivote)

### B.1 Concepto

**Un reino, muchas bases.** El Reino de Ámbar es un mapa medieval persistente con
el **Castillo Real** en el centro (lo que se ve en el livestream 24/7). Alrededor,
**parcelas** donde cada jugador construye su base estilo Clash of Clans: produce
recursos con sus Pawns, construye y mejora edificios, entrena tropas y defiende
contra goblins. Todos aportan al Castillo Real, que la comunidad defiende de
asedios recurrentes.

### B.2 DECISIÓN CLAVE: async-instanciado vs tiempo real compartido

**Recomendación: ASYNC-INSTANCIADO.** Sin dudarlo.

**Cómo funciona:** cada base es un estado persistente en la DB (un JSON de layout
+ timestamps de producción). Tu base "vive" aunque no estés: los Pawns producen
por fórmula de tiempo, no por simulación continua. A las bases ajenas las
**visitás por snapshot** (se renderiza su estado actual, no hay dos jugadores
moviéndose en la misma pantalla). El "mundo compartido" es: (a) el directorio/mapa
de parcelas alrededor del castillo, (b) el Castillo Real con su progreso y asedios
comunitarios, y (c) el **livestream**, que es la vista global curada de todo.

**Por qué NO tiempo-real compartido:**
- Realtime = WebSockets con autoridad de servidor, reconciliación, interpolación,
  anti-cheat de movimiento, sharding cuando crezca. Son **meses** de trabajo y
  costos de infra que Render chico no banca.
- Para una memecoin el timing lo es todo: hay que lanzar en **días/semanas**.
- Clash of Clans — el juego que citamos como modelo — es exactamente
  async-instanciado, y facturó miles de millones. El modelo está validado.
- El async no pierde la sensación de "mundo único": el livestream + el castillo
  común + la crónica (que narra lo que hacen TODOS) dan la convivencia visible.
  El realtime queda como evolución posible (Fase 5+), no como requisito.

### B.3 Loop central del jugador

```
conectar wallet → reclamar parcela → construir (Pawn martillo)
   ↓
producir: mina(oro) + árboles(madera) + ovejas(comida)  [offline, por tiempo]
   ↓
cosechar → mejorar edificios / entrenar Guerreros y Arqueros
   ↓
defender oleadas goblin (PvE) → ganar loot
   ↓
aportar al Castillo Real (recursos o $TOKEN) → progreso comunitario + recompensas
   ↺
```

Sesión típica: 3-10 minutos, varias veces al día (cosechar, lanzar mejora, ver el
asedio). Entre sesiones, el stream y la crónica mantienen el enganche.

### B.4 Economía y progresión (números de arranque, a balancear)

**Recursos:** ORO (mina), MADERA (árboles), COMIDA (ovejas). La comida mantiene
tropas y pawns (upkeep suave: sin comida, producción al 50%, tropas no desertan
— evitamos frustración).

**Producción base:** cada sitio de recurso con 1 Pawn asignado produce
~60 unidades/hora nivel 1 (+40% por nivel). Depósito lleno = producción parada
(incentivo a volver).

**Costos de construcción (nivel 1 → construir / nivel 2 → mejorar):**

| Edificio | Costo N1 | Tiempo N1 | Mejora N2 | Prerequisito |
|---|---|---|---|---|
| Ayuntamiento (Castillo) | — (viene con la parcela) | — | 500 oro + 500 madera / 4 h | — |
| Casa | 100 madera | 5 min | 200 madera / 30 min | — |
| Mina | 150 madera | 10 min | 300 oro / 1 h | — |
| Leñador (árboles) | 100 oro | 10 min | 300 oro / 1 h | — |
| Granja (ovejas) | 120 madera | 10 min | 250 oro / 1 h | — |
| Torre | 200 oro + 200 madera | 30 min | 500 oro / 2 h | Ayunt. N2 |
| Cuartel | 300 madera | 1 h | 600 oro / 3 h | Ayunt. N2 |
| Arquería | 300 oro | 1 h | 600 madera / 3 h | Cuartel |
| Monasterio | **premium** ($TOKEN) | 1 h | $TOKEN | Ayunt. N3 |

**Progresión:** nivel de Ayuntamiento (1–5 en MVP) gatea todo lo demás, como CoC.
Cada nivel desbloquea slots de construcción y +cap de depósito. Tropas: Guerrero
(barato, melee), Arquero (caro, rango). Población limitada por Casas.

### B.5 Evento cooperativo permanente: el Asedio del Castillo Real

- El Castillo Real tiene **HP público** y un medidor de defensa comunitaria.
- Cada X días (arranque: semanal) llega una **horda goblin** (antorcha quema,
  TNT explota; escalada con minotauro/dragón en temporadas).
- La comunidad lo **financia y defiende**: aportás recursos (refuerzan muros) o
  $TOKEN (contrata mercenarios/repara), y tus tropas "destacadas" al castillo
  pelean en la defensa (async: es un cálculo, el stream lo muestra como batalla).
- **Objetivo compartido:** si el castillo aguanta, todos los que aportaron
  cobran del pozo de recompensas (recursos + $TOKEN del pool del evento +
  cosméticos de temporada). Si cae, el reino entra en "ruinas" por 24 h
  (producción -20%) y la reconstrucción es el siguiente objetivo comunitario.
- Es el "raid boss" permanente que le da al stream su drama y al token su sink.

---

## C. UTILIDAD DEL $TOKEN (Pump.fun / Solana) — real, no humo

Principio: **el token compra identidad, estatus y aceleración acotada. Nunca
poder que rompa el juego.** Todo sink es transparente: mitad **burn** on-chain,
mitad **tesorería pública** (wallet publicada, dashboard de movimientos).

### C.1 Acceso y parcelas (gating por holdings)
- Conectás wallet (Phantom). El backend lee tu balance de $TOKEN por RPC.
- **Tiers de parcela** (números ilustrativos, se calibran con el supply):
  - Tier 0 — sin tokens: parcela **S** (visitante-constructor básico).
  - Tier 1 — holdings chicos: parcela **M** + 2 slots extra de construcción.
  - Tier 2 — holdings medios: parcela **L** + skin de banner + prioridad en el stream.
  - Tier 3 — holdings grandes: parcela **XL** + edificios rojos desbloqueados + voz en decisiones de temporada.
- El gating es por **tenencia** (no gasto): holdear tiene utilidad → presión de compra sana.

### C.2 Sinks reales (gasto en $TOKEN)
1. **Skin roja** de edificios (el pack ya la trae — costo cero de arte).
2. **Monasterio** y edificios premium (cosmético + buff suave con cap).
3. **Estandartes/banderas de facción** personalizadas sobre tu base (visibles en el stream).
4. **Aportes al Asedio** (C.3) — el sink narrativo principal.
5. **Nombre/lema en la crónica**: tu evento aparece narrado con tu nombre.
6. Aceleradores de construcción **con límite diario** (anti pay-to-win).

### C.3 El Asedio financiado por token
- Pool del evento: X% de cada sink va al pozo de recompensas de la temporada.
- Aportar $TOKEN al castillo = mercenarios/reparaciones visibles en el stream
  ("**Wallet 7xF...k2 contrató 20 lanceros para la defensa**" en la crónica).
- Victoria comunitaria → reparto proporcional del pool a los aportantes + drop cosmético.

### C.4 El livestream de Pump.fun ES el producto
- El stream 24/7 muestra el Reino: castillo, asedios, bases destacadas en rotación,
  y la **crónica narra la actividad on-chain en vivo** (compras, aportes, nuevos
  pobladores). El juego es la vidriera de la moneda y la moneda es el pase al juego.
- Cero promesas financieras. Utilidad = juego + identidad. Disclaimer visible:
  es un token de comunidad/utilidad de juego, no una inversión. (No somos
  abogados: revisar con uno antes del lanzamiento.)

---

## D. REALIDAD DE ARQUITECTURA

### D.1 Qué hace falta (y qué no)

```
[Cliente Phaser]  ←→  [FastAPI en Render]  ←→  [PostgreSQL]
   visor + constructor      API REST + auth          estado del reino
        ↑                        ↑
[Stream 24/7]              [Solana RPC]
 visor en modo director     balances $TOKEN + verificación de transferencias SPL
 (headless/OBS → Pump.fun)
```

- **Auth de wallet**: nonce + firma con Phantom, verificación ed25519 en el
  backend. Sin custodia, sin claves, sin gas para loguearse.
- **Persistencia**: tablas `users(wallet, tier)`, `bases(layout JSON, timestamps)`,
  `resources`, `contributions`, `siege_state`, `chronicle_events`.
- **Producción offline por fórmula** (no simulación): al abrir tu base, el server
  calcula `producido = rate × Δt` y listo. Barato y anti-cheat por diseño
  (el cliente NUNCA dice cuánto produjo; solo pide acciones y el server valida).
- **Pagos**: transferencia SPL a la tesorería + el backend verifica la tx por RPC.
  **Sin smart contracts custom en el MVP** (velocidad y menos superficie de riesgo).
- **El Phaser actual** pasa a ser el **visor**: hoy ya renderiza el reino; se le
  agregan modo "mi base" (grilla de construcción) y modo "visita" (snapshot).
  El motor narrativo existente se conecta a eventos reales de la DB/chain.

### D.2 Fases, esfuerzo honesto y qué se lanza en cada una

**F0 — LANZAMIENTO con la moneda (lo mínimo digno) · 3-5 días de trabajo**
- El reino actual con **arte 100% Tiny Swords limpio** (purga de A.2 + assets del equipo).
- Branding $TOKEN en el chrome + crónica conectada a actividad on-chain básica
  (compras grandes narradas — un worker que lee el RPC).
- Página/overlay de **wallet connect** que registra tu wallet y te **reserva
  parcela** según tier (todavía no se construye: es whitelist con utilidad
  inmediata de holdear).
- Stream 24/7 en Pump.fun (visor en modo director).
- *Riesgo bajo: el 80% ya existe hoy. Lo nuevo real: backend mínimo (users +
  balances) y el worker on-chain.*

**F1 — Parcelas y construcción · 2-3 semanas**
- Modo "mi base": grilla, colocar/mover edificios, Pawn constructor con martillo.
- Persistencia de layout, costos y tiempos reales (tabla B.4).
- Directorio de bases + modo visita por snapshot. El stream empieza a rotar bases.

**F2 — Economía viva · +2-3 semanas**
- Producción offline (mina/leñador/granja + pawns asignables), depósitos, mejoras
  con niveles, población por casas, entrenar Guerrero/Arquero.

**F3 — Asedio cooperativo · +2-4 semanas**
- Oleadas PvE contra parcelas (defensa con torres/tropas, resolución server-side
  mostrada como replay) + el **Asedio del Castillo Real** con pool de recompensas.

**F4 — On-chain profundo · abierto**
- Sinks automatizados con verificación robusta, dashboard de tesorería/burn,
  cosméticos coleccionables, temporadas.

**F5 (visión) — Tiempo real selectivo**
- Solo si el proyecto lo justifica: presencia realtime en la plaza del castillo
  (chat/emotes), nunca simulación completa compartida.

### D.3 Trade-off central (dicho sin vueltas)

La velocidad de memecoin pide F0 YA; el juego real pide F1–F3. El plan resuelve
la tensión así: **F0 lanza la vidriera + la utilidad de holdear (tiers de
parcela reservada)** — compromiso creíble sin vaporware — y cada fase siguiente
entrega una promesa concreta y acotada. Lo que NO hay que hacer: prometer PvP
realtime, marketplace NFT o mecánicas que requieran meses, antes de tener F1 corriendo.

---

## E. ROADMAP RESUMEN

| Fase | Qué sale | Esfuerzo | Depende de |
|---|---|---|---|
| **F0** | Reino TS limpio + stream Pump.fun + wallet connect + reserva de parcela por tier + crónica on-chain | **3-5 días** | Assets limpios del equipo · token creado |
| F1 | Construcción de bases + directorio + visitas | 2-3 semanas | F0 |
| F2 | Economía (producción/mejoras/tropas) | 2-3 semanas | F1 |
| F3 | Asedios PvE + evento del Castillo Real con pool | 2-4 semanas | F2 |
| F4 | Profundización on-chain + temporadas | abierto | F3 |

**Lo más chico que puede salir el día del lanzamiento (D0):** el reino que ya
existe, re-skineado 100% Tiny Swords, transmitiendo 24/7 en Pump.fun, con wallet
connect que te da tu tier y te muestra **tu parcela reservada con tu estandarte
en el mapa del reino** — tu nombre ya vive en el mundo desde el día 1, aunque
la construcción llegue en F1.

---

*Convenciones: español rioplatense, sin promesas financieras, tesorería y burns
públicos. Próximo paso al aprobar este documento: purga de assets (A.2) +
esqueleto del backend (D.1) en una branch nueva.*
