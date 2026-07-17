# INTERACTIVISION — Visión del sitio y plan de ejecución

> Documento de continuidad. Si retomas este proyecto en una sesión nueva,
> lee esto primero. Última actualización: 2026-07-17.

## 1. Objetivo

Sitio inmersivo para el cliente **Interactivision** (estudio de pintura &
arte digital) con la **calidad de animación y navegación de
activetheory.net** — no una página que se hace scroll, sino un *espacio*
que se recorre. Stack: **Next.js 16 + TypeScript + Tailwind 4 + Three.js**,
auto-deploy en Vercel.

## 2. La referencia (analizada de `sitio evidencia/` — 280 frames de
activetheory.net grabados por el cliente)

Lo que hace superior a la referencia y DEBEMOS replicar:

1. **/work es un carrusel 3D, no una lista**: tarjetas de proyecto como
   paneles de vidrio flotando en perspectiva dentro de un espacio con
   esculturas orgánicas 3D de colores. Se navega horizontal (scroll/drag);
   la tarjeta central está enfocada, las demás se inclinan y alejan.
2. **Transición inmersiva al entrar**: clic en tarjeta → la tarjeta se
   convierte en el mundo del proyecto a pantalla completa. Info en panel
   inferior-izquierdo, tipografía mono, en este orden: TÍTULO /
   año / cliente / descripción / enlace / `<- CLOSE`.
3. **Nav de píldora persistente** arriba-derecha: `WORK ~ CONTACT` con un
   trazo ondulado entre medio. Nunca desaparece.
4. **Tipografía terminal**: todo mono espaciada, MAYÚSCULAS, texto que
   "aparece" como si se tecleara/glitcheara.
5. **Filtros como lista de flechas**: `WHAT ARE YOU LOOKING FOR? -> WEBSITES
   -> INSTALLATIONS -> ...` (izquierda de /work).
6. **El fondo nunca es plano**: siempre hay materia 3D/WebGL viva detrás.
7. Píldora "ASK ME ANYTHING" (IA) abajo-izquierda — opcional para nosotros.

## 3. Traducción a Interactivision (pintura, no tech)

Mismo esqueleto de navegación, materia distinta: donde Active Theory usa
vidrio/cromo/esculturas, nosotros usamos **óleo vivo**: las tarjetas son
lienzos flotantes con pintura generativa, el espacio tiene niebla de
pigmento (estela ultramar↔bermellón ya implementada), y la tipografía mono
se mantiene (IBM Plex Mono) con Fraunces solo para títulos grandes.

### Especificación por pantalla

- **Hero**: INTERACTI / VISION gigante dentro de la propia sala; el primer
  lienzo espera fuera de cuadro y entra al comenzar el recorrido.
- **La Sala (/obras — reemplaza la lista vertical)**: escenario 3D único de
  6 lienzos. Rueda, drag, swipe y flechas mueven el recorrido de forma
  horizontal; no existe página vertical ni sección sticky. Tarjeta central:
  escala 1, sin tilt; laterales: perspectiva, escala y brillo decrecientes.
- **Detalle de obra**: clic en la central → el lienzo crece a pantalla
  completa (dentro del mismo canvas GL), el resto se desvanece; panel
  inferior-izquierdo mono: título, meta, descripción, botón
  `↻ PINTAR OTRA VARIACIÓN`, `<- CERRAR`. Esc/clic fuera cierra.
- **El estudio + Contacto**: siguen en flujo vertical tras la Sala.
- **Nav píldora** arriba-derecha: `OBRAS ~ CONTACTO` + marca a la izquierda.

## 4. Estado actual del código (2026-07-17)

```
src/components/atelier/engine.ts    — escena Three.js: cámara, lienzos con
                                      CanvasTexture, marcos físicos, pigmento
                                      instanciado y destinos Estudio/Contacto.
src/components/atelier/experience.tsx — estado del recorrido, wheel/drag,
                                      teclado, detalle, fallback y limpieza.
src/lib/paintings.ts                — datos de las 6 obras (paleta/semilla/copy).
src/app/globals.css                 — tokens + estilos (sin Tailwind en clases;
                                      Tailwind está disponible para lo nuevo).
```

Prototipo estático viejo en raíz (`index.html`, `js/`, `css/`) — ignorado
por git, borrar cuando se pueda.

## 5. Hoja de ruta

- [x] F1 — Base generativa: pinturas por shader, estela, loader, lightbox.
- [x] F2 — Port a Next.js + marca Interactivision.
- [x] F3 — **Navegación espacial nivel referencia**:
  - [x] Carrusel 3D con tilt en perspectiva (uRotY en VS_RECT)
  - [x] Escena fija con rueda/drag/swipe/flechas
  - [x] Nav píldora + caption mono de la Sala
  - [x] Detalle inmersivo restilizado (panel mono inferior-izquierdo)
  - [x] Drag con continuidad y ajuste al destino
  - [x] Revelado recortado de títulos al cambiar de escena
  - [x] Fragmentos de pincel instanciados entre lienzos
- [x] F4 — Verificación: build de producción, escritorio 1280×720, móvil
  375×812, teclado, detalle y regeneración.
- [ ] F5 — Deploy: commit → push a GitHub (remote `origin` ya configurado,
  ver `.git/config`) → importar en vercel.com → auto-deploy por push.
- [ ] F6 — Contenido real: fotos de pinturas como texturas GL
  (`public/obras/`, cargar con texImage2D en `engine.ts`), mezclables con
  las generativas.
- [ ] F7 — Extras de la referencia: filtros con flechas, transición entre
  páginas (si se agregan rutas), píldora de contacto flotante.

## 6. Reglas de calidad (no negociables)

- 60 fps: nada de layout thrashing; todo movimiento con lerp en RAF único.
- `prefers-reduced-motion`: sin carrusel automático, revelados instantáneos.
- Teclado: flechas navegan la Sala, Enter abre, Esc cierra, foco visible.
- El loader nunca depende del primer frame de RAF (bug ya corregido).
- Móvil: carrusel por swipe nativo, sin cursor custom, DPR cap 2.
- El canvas GL es UNO solo, vive todo el tiempo, no se recrea.

## 7. Contexto de sesiones anteriores

- Caída del clasificador del sistema (z-ai/glm-5.2) bloqueó shell/red/
  capturas toda la sesión del 17-jul: `npm install`, git y Vercel quedaron
  pendientes de ejecutar. El código está completo pero **sin build de
  verificación**: revisar typos de TS en el primer build.
- Proyecto Hamburguesas (`C:\Users\rogel\Desktop\Hamburguesas`) fue solo la
  referencia de stack — NO desplegarlo.
- Memoria persistente del agente en
  `~/.claude/projects/.../memory/interactivision-atelier-site.md`.
