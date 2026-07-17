"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { WORKS } from "@/lib/paintings";
import type { AtelierScene } from "./engine";

const ENTRY = -1;
const STUDIO = WORKS.length;
const CONTACT = WORKS.length + 1;

type SceneMode = "loading" | "webgl" | "fallback";
type HistoryMode = "none" | "replace" | "push";

function clampStep(value: number) {
  return Math.max(ENTRY, Math.min(CONTACT, value));
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function stepLabel(step: number) {
  if (step === ENTRY) return "Entrada";
  if (step === STUDIO) return "El estudio";
  if (step === CONTACT) return "Contacto";
  return WORKS[step]?.title ?? "La sala";
}

function hashForStep(step: number) {
  if (step === ENTRY) return "#inicio";
  if (step === STUDIO) return "#estudio";
  if (step === CONTACT) return "#contacto";
  return `#obra-${WORKS[step]?.id ?? WORKS[0].id}`;
}

function stepFromHash(hash: string) {
  if (hash === "#estudio") return STUDIO;
  if (hash === "#contacto") return CONTACT;
  if (hash === "#obras") return 0;
  const workIndex = WORKS.findIndex((work) => hash === `#obra-${work.id}`);
  return workIndex >= 0 ? workIndex : ENTRY;
}

export default function Experience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<AtelierScene | null>(null);
  const stepRef = useRef(ENTRY);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const wheelTotalRef = useRef(0);
  const wheelResetRef = useRef<number>(0);
  const lastWheelMoveRef = useRef(0);
  const dragRef = useRef({ active: false, pointerId: -1, startX: 0, lastX: 0 });

  const [mode, setMode] = useState<SceneMode>("loading");
  const [step, setStep] = useState(ENTRY);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [variation, setVariation] = useState(0);
  const [announcement, setAnnouncement] = useState("Entrada a Interactivision");

  const goTo = useCallback((nextValue: number, historyMode: HistoryMode = "replace") => {
    const next = clampStep(Math.round(nextValue));
    stepRef.current = next;
    setStep(next);
    setDetailIndex(null);
    sceneRef.current?.setDetail(null);
    sceneRef.current?.setProgress(next);
    setAnnouncement(stepLabel(next));

    if (historyMode !== "none") {
      const method = historyMode === "push" ? "pushState" : "replaceState";
      window.history[method](null, "", hashForStep(next));
    }
  }, []);

  const move = useCallback(
    (direction: -1 | 1) => goTo(stepRef.current + direction, "replace"),
    [goTo],
  );

  const openDetail = useCallback((index: number) => {
    if (!WORKS[index]) return;
    lastFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDetailIndex(index);
    sceneRef.current?.setDetail(index);
    setAnnouncement(`Detalle de ${WORKS[index].title}`);
    window.setTimeout(() => closeRef.current?.focus(), 30);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailIndex(null);
    sceneRef.current?.setDetail(null);
    setAnnouncement(stepLabel(stepRef.current));
    window.setTimeout(() => lastFocusRef.current?.focus(), 30);
  }, []);

  const repaint = useCallback(() => {
    if (detailIndex === null) return;
    sceneRef.current?.regenerate(detailIndex);
    setVariation((value) => value + 1);
    setAnnouncement(`Nueva variación de ${WORKS[detailIndex].title}`);
  }, [detailIndex]);

  useEffect(() => {
    const initialStep = stepFromHash(window.location.hash);
    stepRef.current = initialStep;
    setStep(initialStep);
    setAnnouncement(stepLabel(initialStep));

    const syncFromHistory = () => goTo(stepFromHash(window.location.hash), "none");
    window.addEventListener("popstate", syncFromHistory);
    window.addEventListener("hashchange", syncFromHistory);
    return () => {
      window.removeEventListener("popstate", syncFromHistory);
      window.removeEventListener("hashchange", syncFromHistory);
    };
  }, [goTo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let settled = false;
    let fallbackActive = false;
    let localScene: AtelierScene | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const forceFallback = new URLSearchParams(window.location.search).get("render") === "css";
    const saveData = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    );

    const useFallback = (reason: string, error?: unknown) => {
      if (disposed || fallbackActive) return;
      fallbackActive = true;
      settled = true;
      console.warn(`[interactivision] Sala CSS activada: ${reason}`, error ?? "");
      setMode("fallback");
      localScene?.dispose();
      localScene = null;
      sceneRef.current = null;
    };

    if (forceFallback || reducedMotion || saveData) {
      useFallback(forceFallback ? "modo CSS solicitado" : reducedMotion ? "movimiento reducido" : "ahorro de datos");
      return;
    }

    const hardTimeout = window.setTimeout(
      () => useFallback("el renderizador tardó más de cinco segundos"),
      5_000,
    );

    import("./engine")
      .then(({ AtelierScene: Scene }) => {
        if (disposed || settled) return;
        localScene = new Scene(canvas, WORKS, {
          onFirstFrame: () => {
            if (disposed || settled) return;
            settled = true;
            window.clearTimeout(hardTimeout);
            setMode("webgl");
          },
          onFailure: (error) => {
            window.queueMicrotask(() => useFallback("el contexto gráfico se interrumpió", error));
          },
        });
        sceneRef.current = localScene;
        localScene.setProgress(stepRef.current, true);
      })
      .catch((error) => useFallback("Three.js no pudo inicializar la sala", error));

    return () => {
      disposed = true;
      window.clearTimeout(hardTimeout);
      localScene?.dispose();
      if (sceneRef.current === localScene) sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;

      if (detailIndex !== null) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeDetail();
          return;
        }
        if (event.key === "Tab" && dialogRef.current) {
          const focusable = Array.from(
            dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'),
          );
          if (!focusable.length) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "Enter" && stepRef.current >= 0 && stepRef.current < WORKS.length) {
        event.preventDefault();
        openDetail(stepRef.current);
      } else if (event.key === "Escape" && stepRef.current !== ENTRY) {
        goTo(ENTRY, "replace");
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeDetail, detailIndex, goTo, move, openDetail]);

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (detailIndex !== null) return;
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    wheelTotalRef.current += delta;
    const preview = clampStep(stepRef.current + clampStep(wheelTotalRef.current / 280));
    sceneRef.current?.setProgress(preview);

    window.clearTimeout(wheelResetRef.current);
    wheelResetRef.current = window.setTimeout(() => {
      wheelTotalRef.current = 0;
      sceneRef.current?.setProgress(stepRef.current);
    }, 150);

    const now = performance.now();
    if (Math.abs(wheelTotalRef.current) >= 72 && now - lastWheelMoveRef.current > 260) {
      lastWheelMoveRef.current = now;
      const direction = wheelTotalRef.current > 0 ? 1 : -1;
      wheelTotalRef.current = 0;
      move(direction);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (detailIndex !== null) return;
    const target = event.target as Element;
    if (target.closest("a, button")) return;
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    rootRef.current?.classList.add("is-dragging");
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    sceneRef.current?.setPointer(
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1,
      ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1,
    );

    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.lastX = event.clientX;
    const distance = event.clientX - dragRef.current.startX;
    const travel = Math.min(460, Math.max(220, rect.width * 0.36));
    sceneRef.current?.setProgress(clampStep(stepRef.current - distance / travel));
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return;
    const distance = dragRef.current.lastX - dragRef.current.startX;
    dragRef.current.active = false;
    rootRef.current?.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (Math.abs(distance) > 52) move(distance < 0 ? 1 : -1);
    else sceneRef.current?.setProgress(stepRef.current);
  };

  const activeWork = step >= 0 && step < WORKS.length ? WORKS[step] : null;
  const detailWork = detailIndex === null ? null : WORKS[detailIndex];

  return (
    <div
      ref={rootRef}
      className={`experience mode-${mode}${detailIndex !== null ? " detail-open" : ""}`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <a className="skip-link" href="#scene-content">
        Saltar a la información de la escena
      </a>

      <canvas ref={canvasRef} id="atelier-canvas" />

      <div className="fallback-world" aria-hidden={mode !== "fallback"}>
        <div className="fallback-wash" />
        {WORKS.map((work, index) => {
          const offset = index - step;
          const style = {
            "--offset": offset,
            "--abs-offset": Math.abs(offset),
            "--p0": work.palette[0],
            "--p1": work.palette[1],
            "--p2": work.palette[2],
            "--p3": work.palette[3],
            "--variation": variation,
          } as CSSProperties;
          return (
            <div
              className="fallback-card"
              key={work.id}
              style={style}
              aria-hidden="true"
            >
              <span className="fallback-paint" />
            </div>
          );
        })}
        {mode === "fallback" && activeWork && (
          <button
            className="fallback-hit"
            onClick={() => openDetail(step)}
            aria-label={`Abrir ${activeWork.title}`}
          />
        )}
        <div className={`fallback-chapter fallback-studio ${step === STUDIO ? "is-active" : ""}`} />
        <div className={`fallback-chapter fallback-contact ${step === CONTACT ? "is-active" : ""}`} />
      </div>

      <div className="linen-grain" aria-hidden="true" />

      <div className="loader" role="status" aria-live="polite" aria-hidden={mode !== "loading"}>
        <span className="loader-mark" aria-hidden="true" />
        <strong>Interactivision</strong>
        <span>Abriendo la sala</span>
      </div>

      <nav className="site-nav" aria-label="Principal">
        <a
          className="brand"
          href="#inicio"
          onClick={(event) => {
            event.preventDefault();
            goTo(ENTRY, "push");
          }}
        >
          <span>Interactivision</span>
          <small>Archivo vivo</small>
        </a>
        <div className="nav-pill">
          <a
            href="#obras"
            aria-current={step >= 0 && step < WORKS.length ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              goTo(0, "push");
            }}
          >
            Obras
          </a>
          <span aria-hidden="true">⌁</span>
          <a
            href="#estudio"
            aria-current={step === STUDIO ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              goTo(STUDIO, "push");
            }}
          >
            Estudio
          </a>
          <span aria-hidden="true">⌁</span>
          <a
            href="#contacto"
            aria-current={step === CONTACT ? "location" : undefined}
            onClick={(event) => {
              event.preventDefault();
              goTo(CONTACT, "push");
            }}
          >
            Contacto
          </a>
        </div>
      </nav>

      <main id="scene-content" className="scene-content">
        {step === ENTRY && (
          <section className="scene-copy hero-copy" key="entry">
            <p className="scene-kicker">Estudio de pintura &amp; arte digital · México</p>
            <h1>
              <span>Interacti</span>
              <span>
                vision <em>/ sala viva</em>
              </span>
            </h1>
            <p className="hero-statement">
              La obra no está colgada en una página. Está dentro de una sala que cambia mientras la recorres.
            </p>
            <button className="text-action" onClick={() => goTo(0, "push")}>
              Entrar a la sala <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {activeWork && (
          <section className="scene-copy work-copy" key={activeWork.id} aria-labelledby="current-work-title">
            <p className="scene-kicker">
              Obra {pad2(step + 1)} <span>/</span> {pad2(WORKS.length)}
            </p>
            <h2 id="current-work-title">{activeWork.title}</h2>
            <p className="work-meta">{activeWork.meta}</p>
            <button className="text-action" onClick={() => openDetail(step)}>
              Entrar en la obra <span aria-hidden="true">↗</span>
            </button>
          </section>
        )}

        {step === STUDIO && (
          <section className="scene-copy chapter-copy" key="studio">
            <p className="scene-kicker">El estudio · manifiesto</p>
            <h2>La materia recuerda la luz.</h2>
            <div className="chapter-columns">
              <p>
                Interactivision trabaja entre la pintura matérica y los medios digitales. Todo parte de una
                pregunta: ¿qué pasa si un cuadro no termina nunca de pintarse?
              </p>
              <p>
                En esta sala, cada composición se vuelve espacio. El pigmento, el gesto y la profundidad son la
                interfaz.
              </p>
            </div>
          </section>
        )}

        {step === CONTACT && (
          <section className="scene-copy contact-copy" key="contact">
            <p className="scene-kicker">Contacto · nueva obra</p>
            <h2>
              Hablemos de lo que
              <br /> aún no existe.
            </h2>
            <a className="contact-mail" href="mailto:hola@interactivision.art">
              hola@interactivision.art <span aria-hidden="true">↗</span>
            </a>
            <p className="contact-note">Pintura · dirección de arte · experiencias digitales</p>
          </section>
        )}
      </main>

      <div className="scene-controls" aria-label="Controles del recorrido">
        <p className="gesture-hint">
          <span className="desktop-hint">Rueda / arrastra / flechas</span>
          <span className="touch-hint">Desliza para recorrer</span>
        </p>
        <div className="journey-meter" aria-hidden="true">
          {Array.from({ length: CONTACT - ENTRY + 1 }, (_, index) => index + ENTRY).map((position) => (
            <span key={position} className={position === step ? "is-current" : ""} />
          ))}
        </div>
        <p className="scene-position" aria-hidden="true">
          {step === ENTRY ? "00" : pad2(step + 1)} <span>/</span> {pad2(CONTACT + 1)}
        </p>
        <div className="arrow-controls">
          <button onClick={() => move(-1)} disabled={step === ENTRY} aria-label="Escena anterior">
            ←
          </button>
          <button onClick={() => move(1)} disabled={step === CONTACT} aria-label="Escena siguiente">
            →
          </button>
        </div>
      </div>

      {detailWork && (
        <div className="detail-layer">
          <button className="detail-backdrop" onClick={closeDetail} aria-label="Cerrar detalle" />
          <section
            ref={dialogRef}
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
          >
            <p className="scene-kicker">
              {pad2(detailIndex! + 1)} / {pad2(WORKS.length)} · Obra generativa
            </p>
            <h2 id="detail-title">{detailWork.title}</h2>
            <p className="detail-meta">{detailWork.meta}</p>
            <p className="detail-description">{detailWork.desc}</p>
            <div className="detail-actions">
              <button onClick={repaint}>↻ Pintar otra variación</button>
              <button ref={closeRef} onClick={closeDetail}>
                ← Cerrar
              </button>
            </div>
            <small>Cada variación se genera en tu dispositivo y no se repite.</small>
          </section>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
