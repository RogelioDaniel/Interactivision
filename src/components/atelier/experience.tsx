"use client";

/* Interactivision — experiencia interactiva.
   Orquesta scroll con inercia, cursor, sincronía DOM↔GL y lightbox.
   La lógica vive en boot() (imperativa, portada del prototipo probado);
   React renderiza la estructura y el efecto la arranca/limpia. */

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

      {/* navegación */}
      <nav className="nav" aria-label="Principal">
        <a className="brand" href="#inicio">
          Interactivision
        </a>
        <ul>
          <li>
            <a href="#obras">Obras</a>
          </li>
          <li>
            <a href="#estudio">El estudio</a>
          </li>
          <li>
            <a href="#contacto">Contacto</a>
          </li>
        </ul>
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

        <section id="obras" aria-label="Galería de obras">
          <div className="section-head">
            <span className="eyebrow">Colección 2025 — 2026</span>
            <h2>Sala primera</h2>
            <p className="note">
              Seis obras pintadas en vivo por la GPU de tu pantalla. Entra en
              cualquiera; si quieres, pídele otra variación.
            </p>
          </div>

          <div className="works">
            {WORKS.map((w, i) => (
              <figure className="work" key={w.id}>
                <button
                  className="work-frame"
                  data-cursor="Ver"
                  aria-label={"Ver obra: " + w.title}
                >
                  <span className="work-canvas" role="img" aria-label={w.alt} />
                </button>
                <figcaption>
                  <span className="work-num">{pad2(i + 1)}</span>
                  <h3>{w.title}</h3>
                  <span className="work-meta">{w.meta}</span>
                </figcaption>
              </figure>
            ))}
          </div>
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

      {/* lightbox */}
      <div
        id="lightbox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lb-title"
        aria-hidden="true"
      >
        <button id="lb-close" data-cursor="Cerrar">
          Cerrar ✕
        </button>
        <div className="lb-panel">
          <span id="lb-num">01 / {pad2(WORKS.length)}</span>
          <h2 id="lb-title">—</h2>
          <p id="lb-meta">—</p>
          <p id="lb-desc">—</p>
          <button id="lb-repaint" data-cursor="Pintar">
            ↻ Pintar otra variación
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
  el: HTMLElement;
  btn: HTMLButtonElement;
  slot: HTMLElement;
  hover: number;
  hoverT: number;
  reveal: number;
  revealT: number;
  vel: number;
  seed: number;
}

function boot(root: HTMLDivElement): () => void {
  const works = WORKS;
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

  const planes: PlaneCtl[] = [];
  const lb = { open: false, index: -1, p: 0, pT: 0, srcRect: null as number[] | null };

  const cleanups: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(
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
    console.warn("[atelier] WebGL no disponible — usando gradientes CSS");
    document.body.classList.add("no-gl");
    works.forEach((w, i) => {
      const slot = planes[i]?.slot;
      if (slot) {
        slot.style.background =
          "linear-gradient(160deg, " + w.palette[1] + ", " + w.palette[0] + " 55%, " + w.palette[2] + ")";
      }
    });
  }

  /* ---------- loader ---------- */

  // obras + fuentes (no depender del primer frame de RAF: en pestañas en
  // segundo plano RAF no corre y el loader quedaría congelado)
  const loadSteps = works.length + 1;
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

  /* ---------- obras ---------- */

  root.querySelectorAll<HTMLElement>(".work").forEach((el, i) => {
    planes.push({
      el,
      btn: el.querySelector(".work-frame") as HTMLButtonElement,
      slot: el.querySelector(".work-canvas") as HTMLElement,
      hover: 0,
      hoverT: 0,
      reveal: reducedMotion ? 1 : 0,
      revealT: reducedMotion ? 1 : 0,
      vel: 0,
      seed: works[i].seed,
    });
  });

  planes.forEach((pl, i) => {
    on(pl.btn, "pointerenter", () => (pl.hoverT = 1));
    on(pl.btn, "pointerleave", () => (pl.hoverT = 0));
    on(pl.btn, "click", () => openLightbox(i));
  });

  /* ---------- scroll ---------- */

  function syncSpacer() {
    spacer.style.height = app.offsetHeight + "px";
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

  const rectOf = (el: HTMLElement): [number, number, number, number] => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height];
  };
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

  /* ---------- lightbox ---------- */

  function lbTargetRect(): [number, number, number, number] {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw > 900) {
      const h = Math.min(vh * 0.76, vw * 0.42 * 1.25);
      const w = h * 0.8;
      return [vw * 0.3 - w / 2, (vh - h) / 2, w, h];
    }
    const w = Math.min(vw * 0.78, vh * 0.5 * 0.8);
    const h = w * 1.25;
    return [(vw - w) / 2, vh * 0.06, w, h];
  }

  function openLightbox(i: number) {
    if (lb.open) return;
    lb.open = true;
    lb.index = i;
    lb.pT = 1;
    lb.srcRect = rectOf(planes[i].slot);
    scrollTarget = scrollCur;
    lastFocus = document.activeElement;

    const w = works[i];
    lbNum.textContent = pad2(i + 1) + " / " + pad2(works.length);
    lbTitle.textContent = w.title;
    lbMeta.textContent = w.meta;
    lbDesc.textContent = w.desc;

    document.body.classList.add("lb-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    lbClose.focus();
  }

  function closeLightbox() {
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
    const renderPlanes: PlaneState[] = [];
    let nearest = 0;
    let nearestDist = 1e9;

    lb.p = lerp(lb.p, lb.pT, 1 - Math.pow(0.002, dt));
    if (Math.abs(lb.p - lb.pT) < 0.002) lb.p = lb.pT;
    const lbEase = easeInOut(Math.max(0, Math.min(1, lb.p)));

    for (let i = 0; i < planes.length; i++) {
      const pl = planes[i];
      const rect = rectOf(pl.slot);

      if (rect[1] < vh * 0.88 && rect[1] + rect[3] > 0) pl.revealT = 1;
      pl.reveal = reducedMotion
        ? pl.revealT
        : lerp(pl.reveal, pl.revealT, 1 - Math.pow(0.05, dt));
      pl.hover = lerp(pl.hover, pl.hoverT, 1 - Math.pow(0.01, dt));
      pl.vel = mouse.speed;

      const c = rect[1] + rect[3] / 2 - vh / 2;
      if (Math.abs(c) < nearestDist) {
        nearestDist = Math.abs(c);
        nearest = i;
      }

      let par = reducedMotion ? 0 : Math.max(-0.045, Math.min(0.045, (c / vh) * 0.09));
      let finalRect = rect;
      let hover = pl.hover;
      if (lb.index === i && lb.p > 0.001) {
        finalRect = mixRect(lb.srcRect || rect, lbTargetRect(), lbEase);
        hover = 0;
        par = lerp(par, 0, lbEase);
      }

      renderPlanes.push({
        rect: finalRect,
        tex: glOK && painter ? painter.paintings[i] || null : null,
        hover,
        vel: pl.vel,
        reveal: pl.reveal,
        seed: pl.seed,
        parallax: par,
        mouseLocal: [
          (mouse.x - finalRect[0]) / Math.max(finalRect[2], 1),
          (mouse.y - finalRect[1]) / Math.max(finalRect[3], 1),
        ],
      });
    }

    const label = pad2(nearest + 1) + " / " + pad2(planes.length);
    if (progressEl.textContent !== label) progressEl.textContent = label;

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
          activePlane: lb.index >= 0 && lb.p > 0.001 ? lb.index : -1,
        });
      } catch {
        applyNoGL();
      }
    }

    if (lb.index >= 0 && lb.p <= 0.001 && !lb.open) lb.index = -1;
  }

  let curX = -100,
    curY = -100,
    ringX = -100,
    ringY = -100;

  /* ---------- arranque ---------- */

  try {
    painter = new AtelierGL(canvas, { reducedMotion });
  } catch {
    applyNoGL();
    for (let k = 0; k < works.length; k++) stepLoaded();
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
    syncSpacer();
    const ro = new ResizeObserver(syncSpacer);
    ro.observe(app);
    cleanups.push(() => ro.disconnect());
  }

  on(window, "scroll", () => {
    if (!lb.open) scrollTarget = window.scrollY;
  }, { passive: true });

  on(window, "resize", () => {
    if (glOK && painter) painter.resize();
    if (smoothScroll) syncSpacer();
    if (lb.open && lb.index >= 0) lb.srcRect = rectOf(planes[lb.index].slot);
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
      if (lb.open) closeLightbox();
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

  on(lbClose, "click", closeLightbox);
  on(lbRepaint, "click", repaintActive);
  on(lightbox, "click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  on(document, "keydown", (e) => {
    if ((e as KeyboardEvent).key === "Escape") closeLightbox();
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
