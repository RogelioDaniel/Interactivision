# Interactivision — Galería interactiva

Sitio inmersivo estilo **Active Theory** para el cliente **Interactivision**
(estudio de pintura & arte digital), construido con el mismo stack del
proyecto Hamburguesas: **Next.js 16 + TypeScript + Tailwind 4**, listo para
despliegue automático en **Vercel**.

## Qué hace

- **Las obras se pintan en vivo**: cada "cuadro" es un shader GLSL que genera
  una pintura abstracta en la GPU (deformación de dominio + brochazos +
  impasto + trama de lienzo + borde de gesso). No hay imágenes: no existen
  dos visitas iguales.
- **Estela de pigmento**: el cursor arrastra pintura húmeda por el fondo
  (ultramar ↔ bermellón según la dirección del movimiento).
- **Scroll con inercia**, cursor personalizado, revelado a brochazos,
  ondulación y separación cromática al hover.
- **Lightbox** con zoom dentro del canvas WebGL y botón
  **"↻ Pintar otra variación"** que regenera la obra con otra semilla.
- Accesible: `prefers-reduced-motion`, foco visible, alt text, Escape,
  fallback a gradientes CSS sin WebGL.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # verificación de producción
```

## Estructura

```
src/app/layout.tsx                  — metadata + fuentes (next/font)
src/app/page.tsx                    — página (renderiza la experiencia)
src/app/globals.css                 — tokens de diseño y estilos
src/lib/paintings.ts                — DATOS de las obras (títulos, paletas, semillas)
src/components/atelier/engine.ts    — motor WebGL (shaders)
src/components/atelier/experience.tsx — experiencia completa (scroll, cursor, lightbox)
```

> Las carpetas `js/`, `css/` e `index.html` de la raíz son el prototipo
> estático original (pre-Next). Están en `.gitignore` y se pueden borrar.

## Despliegue automático en Vercel (una sola vez)

1. Sube el repo a GitHub (por ejemplo `RogelioDaniel/Interactivision`):
   ```bash
   git init -b main
   git add -A
   git commit -m "Interactivision v1"
   gh repo create Interactivision --private --source . --push
   # (o crea el repo vacío en github.com y: git remote add origin <url> && git push -u origin main)
   ```
2. En **vercel.com** → Add New → Project → importa **Interactivision** →
   Vercel detecta Next.js solo → **Deploy**.
3. Desde entonces, **cada `git push` a `main` publica a producción**
   automáticamente; cada rama genera una URL de preview. Sin base de datos ni
   variables de entorno: no hay nada más que configurar.

## Cómo cambiar/agregar obras

Edita `src/lib/paintings.ts`. Cada obra: `title`, `meta`, `desc`, `alt`,
`seed` (cambia el dibujo), `zoom` (escala 1.5–3.5), `angle` (brochazos) y
`palette` (5 colores: base, media, acento, luz, gesso). Las tarjetas se
generan solas.

## Cómo usar pinturas REALES (siguiente fase)

1. Fotos en `public/obras/` (ideal 1200×1500, proporción 4:5).
2. En `engine.ts`, cargar el `<img>` como textura (`gl.texImage2D`) en vez de
   generarla con el shader `FS_GEN`.
3. Hover, revelado, lightbox y estela funcionan igual: los efectos operan
   sobre la textura, sea generada o fotográfica.

Se pueden mezclar: obras reales + variaciones generativas como
"estudios digitales".
