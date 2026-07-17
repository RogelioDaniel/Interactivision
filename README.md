# Interactivision — sala viva

Experiencia inmersiva para **Interactivision**, un estudio de pintura y arte
digital. No se navega como una página vertical: todo ocurre dentro de una sola
sala a pantalla completa.

## La experiencia

- **Recorrido espacial:** rueda, arrastre, gesto táctil y flechas desplazan la
  cámara entre seis lienzos, el estudio y contacto.
- **Lienzos generativos:** cada obra se pinta una vez en un canvas 2D y se
  convierte en una textura física dentro de Three.js. Evita el bloqueo de GPU
  del prototipo anterior sin perder variación.
- **Detalle inmersivo:** la obra enfocada crece dentro de la misma escena y se
  puede volver a pintar sin recargar la página.
- **Navegación accesible:** controles visibles, teclado, foco, anuncios para
  lectores de pantalla, enlaces profundos y blancos táctiles de al menos 44 px.
- **Fallback completo:** si WebGL falla, hay ahorro de datos o el usuario
  prefiere movimiento reducido, aparece la misma sala como carrusel CSS. No se
  muestra una pantalla vacía ni un aviso técnico.

## Desarrollo

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # build de producción + TypeScript
npm start
```

Para revisar manualmente el fallback sin desactivar WebGL:

```text
http://localhost:3000/?render=css
```

## Estructura

```text
src/app/layout.tsx                    metadata y fuentes locales de Next
src/app/page.tsx                      entrada de la experiencia
src/app/globals.css                   sistema visual, escena CSS y responsive
src/lib/paintings.ts                  contenido, paletas y semillas
src/components/atelier/experience.tsx estado, navegación y accesibilidad
src/components/atelier/engine.ts      escena Three.js, lienzos y pigmento
```

## Cambiar o agregar obras

Edita `src/lib/paintings.ts`. El recorrido, la numeración y los destinos de
Estudio/Contacto se recalculan a partir del número de obras. Cada obra incluye
título, metadatos, descripción, texto alternativo, semilla y una paleta de
cinco colores.

## Sustituir por pinturas reales

Cuando existan fotografías finales, colócalas en `public/obras/` y reemplaza
la creación de `CanvasTexture` de esa obra por un `TextureLoader`. La cámara,
los marcos, el detalle, los controles y el fallback no necesitan cambiar.
