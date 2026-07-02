# ÁMBAR — La Última Ciudad Libre

Un **stream perpetuo** de una ciudad-isla medieval de fantasía. La ciudad vive sola: cuatro
facciones patrullan sus barrios, pasan cosas (guerras, duelos, dragones, traiciones, festines)
y todo se **narra en vivo** en una crónica lateral, con la cámara ("el Ojo del Vigía") cortando
a la acción como si fuera un Gran Hermano medieval.

Hecho con **Phaser 3** (desde CDN), JavaScript vanilla y assets pixel art. Un solo cliente,
sin backend (por ahora).

## Qué hay adentro

- **4 facciones** con caballeros animados de su color: Guardia de Hierro (azul), Orden del
  Yunque (rojo), Los Sin Nombre (violeta) y Casa del Sol (amarillo). Cada una con su barrio,
  torres y estandarte.
- **Consecuencias visuales persistentes**:
  - Guerra / Dragón → un edificio se incendia y queda **arruinado** para siempre (chamuscado + humo).
  - Duelo / Magnicidio → el caído **desaparece** y deja una **tumba** en el pasto.
  - Traición → el traidor **cambia de facción** (se le swapea el color en vivo).
- **Ciclo día/noche** con amanecer, día, atardecer y noche.
- Ovejas, árboles, mina de oro y decoración para dar vida.
- Motor de eventos por plantillas (`TPL[]` en `src/game.js`), fácil de ampliar.

## Estructura

```
ambar/
├── index.html          # shell + estilos del broadcast (chrome, retículo, crónica)
├── src/
│   └── game.js         # motor del stream: mundo, facciones, eventos, consecuencias
└── assets/
    └── img/            # PNGs (personajes por facción, edificios, terreno, deco)
```

Los assets son **archivos intercambiables**: podés dibujar tu propia versión en Pyxel Edit
y reemplazarlos sin tocar la lógica (respetá los tamaños de frame: guerreros 110×98, tiles 64×64).

## Cómo correrlo local

Phaser carga las texturas por HTTP, así que **no lo abras con doble clic** (file://) porque el
canvas puede quedar en negro. Servilo con cualquier server estático:

```bash
# opción 1: python
python3 -m http.server 8000
# opción 2: node
npx serve .
```

Y entrá a `http://localhost:8000`.

## Deploy en Render (Static Site)

1. Subí este repo a GitHub.
2. En Render: **New → Static Site → conectá el repo**.
3. Configurá:
   - **Build Command**: (vacío)
   - **Publish Directory**: `.`
4. Deploy. Listo.

(También está el `render.yaml` por si querés blueprint automático.)

## Roadmap

- [ ] Goblins invasores que aparecen en las guerras (sprites ya disponibles en el pack).
- [ ] Territorio que se expande/achica según qué facción gana o pierde.
- [ ] Narrador IA real vía API (reemplazar las plantillas de `TPL[]`).
- [ ] Votación de espectadores para el próximo evento (atado a lógica de token).
- [ ] Backend FastAPI + PostgreSQL para persistir estado del stream 24/7.

## Créditos y licencias

Ver [`NOTICE.md`](./NOTICE.md). Resumen: Phaser es MIT; los assets son **Tiny Swords de
Pixel Frog** (uso libre en proyectos, no redistribuir el pack suelto).
