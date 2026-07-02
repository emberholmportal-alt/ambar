# CLAUDE.md — contexto del proyecto para Claude Code

## Qué es
**ÁMBAR** es un stream 24/7 de una ciudad-isla medieval de fantasía renderizada con Phaser 3.
La ciudad se autogobierna: NPCs por facción caminan, ocurren eventos y se narran en vivo en una
crónica lateral, con cortes de cámara a la acción. Estética: broadcast / CRT medieval
(fondo obsidiana, latón envejecido, rojo brasa para el "EN VIVO", tipografía serif + monoespaciada).

## Stack y restricciones
- **Phaser 3** cargado desde CDN (`cdnjs.cloudflare.com`). No hay bundler ni build step.
- **JavaScript vanilla**, sin frameworks. Todo el juego vive en `src/game.js`.
- **Sin backend** por ahora (cliente puro). Si se agrega, el patrón del autor es **FastAPI +
  PostgreSQL**, deploy en **Render**.
- El autor **no usa terminal local**: trabaja por la web de GitHub + Render. Preferí cambios que
  se puedan revisar/deployar por ese flujo.

## Arquitectura
- `index.html` — markup del "chrome" del broadcast (topbar, retículo del Ojo, panel de crónica,
  leyenda de facciones) + todo el CSS. Carga Phaser (CDN) y después `src/game.js`.
- `src/game.js` — el motor:
  - Config de mundo: `T` (tile 64px), `COLS`/`ROWS`, límites de la isla (`IX0..IY1`).
  - `GUILDS` — las 4 facciones (id, nombre, textura de color, color hex, tile central del barrio).
  - `preload()` carga los PNGs desde `assets/img/` (ver constantes `A_*` arriba del archivo).
  - `create()` arma mar + isla, coloca edificios/estandartes/naturaleza, crea animaciones por
    color, spawnea NPCs, arma el overlay de día/noche y la cámara.
  - `update()` mueve NPCs (física arcade + colisión con edificios y bordes de la isla), corre el
    reloj, actualiza espectadores y dispara eventos.
  - **Motor narrativo**: `TPL[]` es la lista de plantillas de eventos. `fireEvent()` elige una,
    escribe en la crónica y, si es "major", corta la cámara y ejecuta la consecuencia.
  - **Consecuencias**: `ruinBuilding()` (incendio persistente), `killNpc()` (muerte + tumba),
    `defect()` (cambio de facción).
  - **Día/noche**: `timeTint(min)` devuelve color+alpha del overlay según la hora.

## Convenciones
- Comentarios y mensajes de commit **en español rioplatense**.
- El autor es **pixel artist** y quiere **assets reales**, no formas procedurales. Cualquier arte
  nuevo va como PNG en `assets/img/` (frames: guerreros 110×98, tiles 64×64).
- Feedback directo y sin vueltas; señalá trade-offs y problemas reales.

## Cómo probar
Servir estático (Phaser necesita HTTP, no `file://`):
```bash
python3 -m http.server 8000   # -> http://localhost:8000
```

## Tareas candidatas (roadmap)
1. Goblins invasores en las guerras (hay sprites `Torch_Red`/`TNT_Red` en el pack Tiny Swords).
2. Territorio de facción que se expande/achica según resultados.
3. Reemplazar `TPL[]` por un **narrador IA** vía API.
4. Votación de espectadores del próximo evento.
5. Backend FastAPI + PostgreSQL para estado persistente del stream.

## Licencia de assets (importante)
Los sprites son **Tiny Swords (Pixel Frog)**: uso libre en proyectos comerciales, pero **no se
puede redistribuir el pack suelto**. Si se necesita CC0 sin ataduras, se puede reemplazar por
assets de **Kenney** (Tiny Town / Tiny Dungeon). Ver `NOTICE.md`.
