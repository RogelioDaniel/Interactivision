"use client";

/* Interactivision — experiencia interactiva.
   La Sala: carrusel 3D de lienzos flotantes (modelo activetheory.net/work).
   Scroll vertical secuestrado → desplazamiento horizontal con tilt en
   perspectiva; clic en el lienzo central → detalle inmersivo. */

import { useEffect, useRef } from "react";
import { WORKS } from "@/lib/paintings";
import { AtelierGL, type PlaneState } from "./engine";

function pad2(n: number) {
  return n < 10 ? "0" + n : "" + n;
}

export default function Experience() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return boot(rootRef.current!);
  }, []);

  return (
    <div ref={rootRef}>
      {/* lienzo WebGL: fondo, estela de pigmento y las obras */}
      <canvas id="gl" aria-hidden="true" />

      {/* loader */}
      <div id="loader" role="status" aria-live="polite">
        <p className="loader-name">Interactivision</p>
        <p id="loader-pct">0%</p>
        <p className="loader-hint">Preparando los pigmentos</p>
      </div>

      {/* cursor personalizado */}
      <div id="cursor-dot" aria-hidden="true" />
      <div id="cursor-ring" aria-hidden="true" data-label="" />

      {/* navegación píldora (persistente, estilo referencia) */}
      <nav className="nav" aria-label="Principal">
        <a className="brand" href="#inicio">
          Interactivision
        </a>
        <div className="nav-pill">
          <a href="#obras">Obras</a>
          <span className="pill-wave" aria-hidden="true">
            〜
          </span>
          <a href="#estudio">Estudio</a>
          <span className="pill-wave" aria-hidden="true">
            〜
          </span>
          <a href="#contacto">Contacto</a>
        </div>
      </nav>

      {/* indicador de obra actual */}
      <p id="work-progress" aria-hidden="true">
        01 / {pad2(WORKS.length)}
      </p>

      {/* contenido */}
      <main id="app">
        <header className="hero" id="inicio">
          <p className="eyebrow">Estudio de pintura &amp; arte digital</p>
          <h1 aria-label="Interactivision">
            <span className="h1-line">Interacti</span>
            <span className="h1-line">
              vision <em>estudio</em>
            </span>
          </h1>
          <p className="statement">
            Pintamos con materia que no se queda quieta. En esta sala,
            <strong> cada obra se genera y se repinta ante tus ojos</strong>:
            ningún visitante ve exactamente el mismo cuadro.
          </p>
          <p className="scroll-hint" aria-hidden="true">
            Desliza — la sala se pinta sola ↓
          </p>
        </header>

        <section id="obras" aria-label="La sala — galería">
          <div className="section-head">
            <span className="eyebrow">Colección 2025 — 2026</span>
            <h2>La sala</h2>
            <p className="note">
              Seis lienzos flotando en la sala. Desliza para recorrerla; entra
              al que te llame y, si quieres, pídele otra variación.
            </p>
          </div>

          {/* Carrusel 3D: sección alta; el escenario queda pegado al viewport
              y el avance vertical se convierte en desplazamiento horizontal */}
          <div
            className="sala"
            style={{ height: (WORKS.length + 1) * 100 + "vh" }}
          >
            <div className="sala-stage">
              <button
                id="sala-open"
                data-cursor="Ver"
                aria-label="Ver la obra al centro de la sala"
              />
              <div id="sala-caption">
                <span id="sala-num" className="work-num">
                  01
                </span>
                <h3 id="sala-title">{WORKS[0].title}</h3>
                <p id="sala-meta">{WORKS[0].meta}</p>
              </div>
              <p className="sala-hint" aria-hidden="true">
                Desliza para recorrer — ← → también funcionan
              </p>
            </div>
          </div>

          {/* catálogo accesible para lectores de pantalla */}
          <ul className="sr-only">
            {WORKS.map((w) => (
              <li key={w.id}>
                {w.title} — {w.meta}. {w.alt}
              </li>
            ))}
          </ul>
        </section>

        <section id="estudio" aria-label="El estudio">
          <div className="section-head">
            <span className="eyebrow">El estudio</span>
            <h2>La materia recuerda la luz</h2>
          </div>
          <div className="about-grid">
            <div className="bio">
              <p>
                <strong>Interactivision</strong> trabaja entre la pintura
                matérica y los medios digitales. Todo parte de una pregunta
                sencilla: ¿qué pasa si un cuadro no termina nunca de pintarse?
              </p>
              <p>
                Esta sala es la respuesta: seis composiciones cuyo pigmento se
                calcula en vivo, con paletas tomadas del óleo clásico —
                ultramar, bermellón, ocre, viridiana — y brochazos que ningún
                archivo guarda. Cuando las obras físicas se fotografíen,
                ocuparán estos mismos marcos.
              </p>
            </div>
            <blockquote className="pull-quote">
              «Un cuadro terminado es solo un cuadro que dejó de moverse. Aquí
              preferimos que sigan respirando.»
              <footer>— Interactivision</footer>
            </blockquote>
          </div>
        </section>

        <footer className="contact" id="contacto">
          <div className="contact-inner">
            <h2>
              <a href="mailto:hola@interactivision.art" data-cursor="Escribir">
                hola@interactivision.art
              </a>
            </h2>
            <div className="contact-links">
              <a href="#contacto" data-cursor="Abrir">
                Instagram — @interactivision
              </a>
              <a href="#contacto" data-cursor="Abrir">
                Estudio — visitas con cita
              </a>
            </div>
          </div>
          <div className="colophon">
            <span>© 2026 Interactivision · Todos los derechos reservados</span>
            <span>Obras generativas de ejemplo — pronto, la colección real</span>
          </div>
        </footer>
      </main>

      {/* espaciador para el scroll suave */}
      <div id="scroll-space" aria-hidden="true" />

      {/* detalle inmersivo */}
      <div
        id="lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-title"
        aria-hidden="true"
      >
        <div className="lb-panel">
          <span id="lb-num">01 / {pad2(WORKS.length)}</span>
          <h2 id="lb-title">—</h2>
          <p id="lb-meta">—</p>
          <p id="lb-desc">—</p>
          <button id="lb-repaint" data-cursor="Pintar">
            ↻ Pintar otra variación
          </button>
          <button id="lb-close" data-cursor="Cerrar">
            ← Cerrar
          </button>
          <span className="lb-note">
            Obra generativa — cada variación es única e irrepetible
          </span>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   boot(): arranca la experiencia y devuelve la limpieza.
   ========================================================= */

interface PlaneCtl {
  hover: number;
  reveal: number;
  revealT: number;
  seed: number;
}

function boot(root: HTMLDivElement): () => void {
  const works = WORKS;
  const N = works.length;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const app = $<HTMLElement>("#app");
  const spacer = $<HTMLElement>("#scroll-space");
  const canvas = $<HTMLCanvasElement>("#gl");
  const loaderEl = $<HTMLElement>("#loader");
  const loaderPct = $<HTMLElement>("#loader-pct");
  const progressEl = $<HTMLElement>("#work-progress");
  const cursorDot = $<HTMLElement>("#cursor-dot");
  const cursorRing = $<HTMLElement>("#cursor-ring");
  const sala = $<HTMLElement>(".sala");
  const salaStage = $<HTMLElement>(".sala-stage");
  const salaOpen = $<HTMLButtonElement>("#sala-open");
  const salaNum = $<HTMLElement>("#sala-num");
  const salaTitle = $<HTMLElement>("#sala-title");
  const salaMeta = $<HTMLElement>("#sala-meta");
  const lightbox = $<HTMLElement>("#lightbox");
  const lbTitle = $<HTMLElement>("#lb-title");
  const lbMeta = $<HTMLElement>("#lb-meta");
  const lbDesc = $<HTMLElement>("#lb-desc");
  const lbNum = $<HTMLElement>("#lb-num");
  const lbClose = $<HTMLButtonElement>("#lb-close");
  const lbRepaint = $<HTMLButtonElement>("#lb-repaint");

  let painter: AtelierGL | null = null;
  let glOK = true;

  const smoothScroll = finePointer && !reducedMotion && !("ontouchstart" in window);
  let scrollCur = 0;
  let scrollTarget = 0;

  const mouse = { x: -100, y: -100, px: -100, py: -100, vx: 0, vy: 0, speed: 0, dir: 0 };
  let lastFocus: Element | null = null;

  const planes: PlaneCtl[] = works.map((w) => ({
    hover: 0,
    reveal: reducedMotion ? 1 : 0,
    revealT: reducedMotion ? 1 : 0,
    seed: w.seed,
  }));

  // carrusel
  let salaX = 0; // índice flotante (0..N-1) — se lerpea
  let salaTop = 0;
  let salaRange = 1; // alto de .sala menos un viewport
  let centerIdx = 0;
  let salaHover = false;
  let salaRevealed = false;
  const lastRects: [number, number, number, number][] = works.map(() => [0, 0, 1, 1]);

  const lb = { open: false, index: -1, p: 0, pT: 0, srcRect: null as number[] | null };

  const cleanups: (() => void)[] = [];
  const on = (
    target: Window | Document | HTMLElement,
    type: string,
    fn: EventListenerOrEventListenerObject,
    opts?: AddEventListenerOptions
  ) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  /* ---------- fallback sin WebGL ---------- */

  function applyNoGL() {
    glOK = false;
    console.warn("[atelier] WebGL no disponible — modo reducido");
    document.body.classList.add("no-gl");
  }

  /* ---------- loader ---------- */

  const loadSteps = N + 1; // obras + fuentes (nunca depender del primer RAF)
  let loadDone = 0;

  function stepLoaded() {
    loadDone++;
    const pct = Math.min(100, Math.round((loadDone / loadSteps) * 100));
    loaderPct.textContent = pct + "%";
    if (loadDone >= loadSteps) {
      document.body.classList.add("is-ready");
      window.setTimeout(() => loaderEl.setAttribute("aria-hidden", "true"), 900);
    }
  }

  /* ---------- geometría del carrusel ---------- */

  function cardSize(): [number, number] {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const h = Math.min(vh * 0.6, 560, vw * 0.94 * 1.25);
    return [h * 0.8, h];
  }

  function syncSalaMetrics() {
    salaTop = sala.offsetTop;
    salaRange = Math.max(sala.offsetHeight - window.innerHeight, 1);
    const [cw, ch] = cardSize();
    salaOpen.style.width = cw + "px";
    salaOpen.style.height = ch + "px";
  }

  /** rect de la tarjeta i para el desplazamiento actual del carrusel */
  function cardRect(i: number): [number, number, number, number] {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const [cw, ch] = cardSize();
    const off = i - salaX;
    const spacing = cw * 1.22;
    const scale = 1 / (1 + Math.abs(off) * 0.42);
    const w = cw * scale;
    const h = ch * scale;
    const x = vw / 2 + off * spacing - w / 2;
    const y = vh / 2 - h / 2 + Math.abs(off) * vh * 0.02;
    return [x, y, w, h];
  }

  function updateCaption() {
    const w = works[centerIdx];
    salaNum.textContent = pad2(centerIdx + 1);
    salaTitle.textContent = w.title;
    salaMeta.textContent = w.meta;
    const label = pad2(centerIdx + 1) + " / " + pad2(N);
    if (progressEl.textContent !== label) progressEl.textContent = label;
    salaOpen.setAttribute("aria-label", "Ver obra: " + w.title);
  }

  /** navegar con teclado: salta al índice pedido moviendo el scroll real */
  function goToIndex(idx: number) {
    const clamped = Math.max(0, Math.min(N - 1, idx));
    const y = salaTop + (clamped / Math.max(N - 1, 1)) * salaRange;
    if (smoothScroll) {
      window.scrollTo(0, y);
    } else {
      window.scrollTo({ top: y, behavior: reducedMotion ? "auto" : "smooth" });
    }
  }

  /* ---------- scroll ---------- */

  function syncSpacer() {
    spacer.style.height = app.offsetHeight + "px";
    syncSalaMetrics();
  }

  function anchorTo(hash: string) {
    const el = root.querySelector(hash);
    if (!el) return;
    const top =
      el.getBoundingClientRect().top + (smoothScroll ? scrollCur : window.scrollY) - 90;
    if (smoothScroll) {
      window.scrollTo(0, top);
    } else {
      window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
    }
  }

  /* ---------- helpers ---------- */

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const easeInOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const mixRect = (
    a: number[],
    b: number[],
    t: number
  ): [number, number, number, number] => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];

  /* ---------- detalle inmersivo ---------- */

  function lbTargetRect(): [number, number, number, number] {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw > 900) {
      const h = Math.min(vh * 0.84, vw * 0.44 * 1.25);
      const w = h * 0.8;
      return [vw * 0.58 - w / 2, (vh - h) / 2, w, h];
    }
    const w = Math.min(vw * 0.8, vh * 0.52 * 0.8);
    const h = w * 1.25;
    return [(vw - w) / 2, vh * 0.05, w, h];
  }

  function openDetail(i: number) {
    if (lb.open) return;
    lb.open = true;
    lb.index = i;
    lb.pT = 1;
    lb.srcRect = lastRects[i].slice();
    scrollTarget = scrollCur;
    lastFocus = document.activeElement;

    const w = works[i];
    lbNum.textContent = pad2(i + 1) + " / " + pad2(N);
    lbTitle.textContent = w.title;
    lbMeta.textContent = w.meta;
    lbDesc.textContent = w.desc;

    document.body.classList.add("lb-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    lbClose.focus();
  }

  function closeDetail() {
    if (!lb.open) return;
    lb.open = false;
    lb.pT = 0;
    document.body.classList.remove("lb-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }

  function repaintActive() {
    if (lb.index < 0 || !glOK || !painter) return;
    const i = lb.index;
    const newSeed = Math.random() * 120 + 1;
    planes[i].seed = newSeed;
    painter.generatePainting(i, works[i], newSeed);
    planes[i].reveal = 0.15;
    planes[i].revealT = 1;
  }

  /* ---------- bucle principal ---------- */

  let lastT = 0;
  let running = true;
  let disposed = false;
  let rafId = 0;
  let curX = -100,
    curY = -100,
    ringX = -100,
    ringY = -100;

  function frame(now: number) {
    if (!running || disposed) return;
    rafId = requestAnimationFrame(frame);

    const t = now * 0.001;
    const dt = Math.min(t - lastT, 0.05);
    lastT = t;

    if (smoothScroll) {
      scrollCur = lerp(scrollCur, scrollTarget, 1 - Math.pow(0.001, dt));
      if (Math.abs(scrollCur - scrollTarget) < 0.05) scrollCur = scrollTarget;
      app.style.transform = "translate3d(0," + -scrollCur + "px,0)";
      // el escenario de la Sala se "pega" manualmente (sticky no funciona
      // dentro de un contenedor fijo transformado)
      const stick = Math.max(0, Math.min(scrollCur - salaTop, salaRange));
      salaStage.style.transform = "translate3d(0," + stick + "px,0)";
    } else {
      scrollCur = window.scrollY;
    }

    mouse.vx = mouse.x - mouse.px;
    mouse.vy = mouse.y - mouse.py;
    mouse.speed = lerp(mouse.speed, Math.min(Math.hypot(mouse.vx, mouse.vy) / 28, 1.4), 0.2);
    if (Math.abs(mouse.vx) + Math.abs(mouse.vy) > 0.5) {
      mouse.dir = Math.atan2(mouse.vy, mouse.vx);
    }
    mouse.px = mouse.x;
    mouse.py = mouse.y;

    if (finePointer) {
      curX = lerp(curX, mouse.x, 0.6);
      curY = lerp(curY, mouse.y, 0.6);
      ringX = lerp(ringX, mouse.x, 0.16);
      ringY = lerp(ringY, mouse.y, 0.16);
      cursorDot.style.transform = "translate(" + curX + "px," + curY + "px)";
      cursorRing.style.transform = "translate(" + ringX + "px," + ringY + "px)";
    }

    const vh = window.innerHeight;

    // progreso del carrusel a partir del scroll (fuente de verdad: el scroll)
    const prog = Math.max(0, Math.min((scrollCur - salaTop) / salaRange, 1));
    const salaXT = prog * (N - 1);
    salaX = reducedMotion ? salaXT : lerp(salaX, salaXT, 1 - Math.pow(0.002, dt));

    const newCenter = Math.round(Math.max(0, Math.min(N - 1, salaXT)));
    if (newCenter !== centerIdx) {
      centerIdx = newCenter;
      updateCaption();
    }

    // revelado escalonado la primera vez que la Sala entra al viewport
    if (!salaRevealed && sala.getBoundingClientRect().top < vh * 0.7) {
      salaRevealed = true;
      planes.forEach((pl, i) => {
        const id = window.setTimeout(() => {
          pl.revealT = 1;
        }, 120 * i);
        cleanups.push(() => window.clearTimeout(id));
      });
    }

    // detalle: progreso animado
    lb.p = lerp(lb.p, lb.pT, 1 - Math.pow(0.002, dt));
    if (Math.abs(lb.p - lb.pT) < 0.002) lb.p = lb.pT;
    const lbEase = easeInOut(Math.max(0, Math.min(1, lb.p)));

    // construir planos: lejanos primero para que el centro tape correcto
    const order = planes
      .map((_, i) => i)
      .sort((a, b) => Math.abs(b - salaX) - Math.abs(a - salaX));

    const renderPlanes: PlaneState[] = [];
    let activePos = -1;

    for (const i of order) {
      const pl = planes[i];
      const rect = cardRect(i);
      lastRects[i] = rect;

      const off = i - salaX;
      pl.reveal = reducedMotion
        ? pl.revealT
        : lerp(pl.reveal, pl.revealT, 1 - Math.pow(0.05, dt));
      const hoverT = salaHover && i === centerIdx && !lb.open ? 1 : 0;
      pl.hover = lerp(pl.hover, hoverT, 1 - Math.pow(0.01, dt));

      let finalRect = rect;
      let rotY = Math.max(-0.85, Math.min(0.85, -off * 0.5));
      let focus = 1 / (1 + Math.abs(off) * 1.7);
      let par = reducedMotion ? 0 : Math.max(-0.045, Math.min(0.045, off * 0.03));
      let hover = pl.hover;

      const isActive = lb.index === i && lb.p > 0.001;
      if (isActive) {
        finalRect = mixRect(lb.srcRect || rect, lbTargetRect(), lbEase);
        rotY = rotY * (1 - lbEase);
        focus = lerp(focus, 1, lbEase);
        par = lerp(par, 0, lbEase);
        hover = 0;
      }

      const st: PlaneState = {
        rect: finalRect,
        tex: glOK && painter ? painter.paintings[i] || null : null,
        hover,
        vel: mouse.speed,
        reveal: pl.reveal,
        seed: pl.seed,
        parallax: par,
        mouseLocal: [
          (mouse.x - finalRect[0]) / Math.max(finalRect[2], 1),
          (mouse.y - finalRect[1]) / Math.max(finalRect[3], 1),
        ],
        rotY,
        focus,
      };

      if (isActive) {
        activePos = renderPlanes.length;
      }
      renderPlanes.push(st);
    }

    // la obra activa se dibuja al final (sobre el velo)
    if (activePos >= 0 && activePos !== renderPlanes.length - 1) {
      const [act] = renderPlanes.splice(activePos, 1);
      renderPlanes.push(act);
    }
    if (activePos >= 0) activePos = renderPlanes.length - 1;

    if (glOK && painter) {
      try {
        painter.render({
          time: t,
          mouse: {
            u: mouse.x / Math.max(window.innerWidth, 1),
            v: 1 - mouse.y / Math.max(vh, 1),
            strength: reducedMotion ? 0 : mouse.speed * 0.5,
            dir: mouse.dir,
          },
          planes: renderPlanes,
          dim: lbEase,
          activePlane: activePos,
        });
      } catch {
        applyNoGL();
      }
    }

    if (lb.index >= 0 && lb.p <= 0.001 && !lb.open) lb.index = -1;
  }

  /* ---------- arranque ---------- */

  try {
    painter = new AtelierGL(canvas, { reducedMotion });
  } catch {
    applyNoGL();
    for (let k = 0; k < N; k++) stepLoaded();
  }

  if (glOK) {
    works.forEach((w, i) => {
      const id = window.setTimeout(() => {
        if (disposed) return;
        try {
          painter!.generatePainting(i, w);
        } catch {
          applyNoGL();
        }
        stepLoaded();
      }, 60 * i);
      cleanups.push(() => window.clearTimeout(id));
    });
  }

  {
    let fontDone = false;
    const fontStep = () => {
      if (!fontDone && !disposed) {
        fontDone = true;
        stepLoaded();
      }
    };
    document.fonts.ready.then(fontStep);
    const id = window.setTimeout(fontStep, 2500);
    cleanups.push(() => window.clearTimeout(id));
  }

  if (smoothScroll) {
    document.body.classList.add("smooth");
    const ro = new ResizeObserver(syncSpacer);
    ro.observe(app);
    cleanups.push(() => ro.disconnect());
  }
  syncSpacer();
  updateCaption();

  on(window, "scroll", () => {
    if (!lb.open) scrollTarget = window.scrollY;
  }, { passive: true });

  on(window, "resize", () => {
    if (glOK && painter) painter.resize();
    syncSpacer();
    if (lb.open && lb.index >= 0) lb.srcRect = lastRects[lb.index].slice();
  });

  on(document, "visibilitychange", () => {
    if (document.hidden) {
      running = false;
    } else if (!running && !disposed) {
      running = true;
      lastT = performance.now() * 0.001;
      rafId = requestAnimationFrame(frame);
    }
  });

  on(canvas, "webglcontextlost", (e) => {
    e.preventDefault();
    applyNoGL();
  });

  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    on(a, "click", (e) => {
      e.preventDefault();
      if (lb.open) closeDetail();
      anchorTo(a.getAttribute("href")!);
    });
  });

  if (finePointer) {
    document.body.classList.add("has-cursor");
    on(document, "pointermove", (e) => {
      mouse.x = (e as PointerEvent).clientX;
      mouse.y = (e as PointerEvent).clientY;
    });
    root.querySelectorAll<HTMLElement>("[data-cursor]").forEach((el) => {
      on(el, "pointerenter", () => {
        cursorRing.classList.add("is-hover");
        cursorRing.dataset.label = el.getAttribute("data-cursor") || "";
      });
      on(el, "pointerleave", () => {
        cursorRing.classList.remove("is-hover");
        cursorRing.dataset.label = "";
      });
    });
  }

  on(salaOpen, "pointerenter", () => (salaHover = true));
  on(salaOpen, "pointerleave", () => (salaHover = false));
  on(salaOpen, "click", () => openDetail(centerIdx));

  on(lbClose, "click", closeDetail);
  on(lbRepaint, "click", repaintActive);
  on(lightbox, "click", (e) => {
    if (e.target === lightbox) closeDetail();
  });

  on(document, "keydown", (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === "Escape") {
      closeDetail();
      return;
    }
    // flechas: navegar la Sala cuando está a la vista y sin detalle abierto
    if (lb.open) return;
    if (ke.key !== "ArrowLeft" && ke.key !== "ArrowRight") return;
    const r = sala.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.6 || r.bottom < window.innerHeight * 0.4) return;
    ke.preventDefault();
    goToIndex(centerIdx + (ke.key === "ArrowRight" ? 1 : -1));
  });

  on(window, "touchmove", (e) => {
    const te = e as TouchEvent;
    if (te.touches.length) {
      mouse.x = te.touches[0].clientX;
      mouse.y = te.touches[0].clientY;
    }
  }, { passive: true });

  rafId = requestAnimationFrame((now) => {
    lastT = now * 0.001;
    rafId = requestAnimationFrame(frame);
  });

  console.log("[atelier] Interactivision iniciado — gl:" + glOK + " smooth:" + smoothScroll);

  /* ---------- limpieza (React StrictMode / desmontaje) ---------- */

  return () => {
    disposed = true;
    running = false;
    cancelAnimationFrame(rafId);
    cleanups.forEach((fn) => fn());
    document.documentElement.style.overflow = "";
    document.body.classList.remove("smooth", "has-cursor", "lb-open");
  };
}
