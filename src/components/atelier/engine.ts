import * as THREE from "three";
import type { Work } from "@/lib/paintings";

const CARD_SPACING = 5.15;
const MIN_PROGRESS = -1;

type SceneOptions = {
  reducedMotion?: boolean;
  onFirstFrame?: () => void;
  onFailure?: (error: Error) => void;
};

type WorkMesh = {
  group: THREE.Group;
  art: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  frame: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshStandardMaterial>;
  shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  revealCanvas: HTMLCanvasElement;
  revealContext: CanvasRenderingContext2D;
  revealTexture: THREE.CanvasTexture;
  lastRevealUv: THREE.Vector2 | null;
  baseY: number;
  baseTilt: number;
  hover: number;
};

type WorkHit = {
  index: number;
  intersection: THREE.Intersection<THREE.Object3D>;
};

type ChapterMesh = {
  group: THREE.Group;
  materials: Array<THREE.MeshBasicMaterial | THREE.MeshStandardMaterial>;
  progress: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function seededRandom(seed: number) {
  let state = Math.floor(Math.abs(seed) * 100_000) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function rgb(hex: string, alpha = 1) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Paints a lightweight, deterministic oil study once on a 2D canvas. Three.js
 * then treats it as a physical canvas in the room; there is no expensive
 * full-resolution shader compilation during startup.
 */
function paintStudy(
  palette: readonly string[],
  seed: number,
  quiet = false,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = quiet ? 768 : 512;
  canvas.height = quiet ? 512 : 640;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("El navegador no pudo crear la textura de pintura.");

  const random = seededRandom(seed);
  const { width, height } = canvas;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, width, height);

  const washCount = quiet ? 16 : 26;
  for (let i = 0; i < washCount; i += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = (0.22 + random() * 0.5) * Math.max(width, height);
    const color = palette[1 + Math.floor(random() * Math.max(1, palette.length - 1))];
    const gradient = ctx.createRadialGradient(x, y, radius * 0.04, x, y, radius);
    gradient.addColorStop(0, rgb(color, quiet ? 0.075 : 0.48));
    gradient.addColorStop(0.55, rgb(color, quiet ? 0.028 : 0.2));
    gradient.addColorStop(1, rgb(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const strokeCount = quiet ? 46 : 92;
  for (let i = 0; i < strokeCount; i += 1) {
    const color = palette[Math.floor(random() * palette.length)];
    const x = (random() * 1.28 - 0.14) * width;
    const y = random() * height;
    const length = (0.16 + random() * 0.72) * width;
    const bend = (random() - 0.5) * height * 0.34;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(
      x + length * 0.28,
      y + bend,
      x + length * 0.7,
      y - bend * 0.45,
      x + length,
      y + bend * 0.12,
    );
    ctx.strokeStyle = rgb(color, quiet ? 0.025 + random() * 0.04 : 0.08 + random() * 0.42);
    ctx.lineWidth = quiet ? 8 + random() * 56 : 2 + random() * 42;
    ctx.stroke();
  }

  // Dry-brush interruptions: short marks that read as dragged bristles.
  if (!quiet) {
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 120; i += 1) {
      const x = random() * width;
      const y = random() * height;
      const w = 8 + random() * 88;
      ctx.fillStyle = rgb(palette[3] ?? palette[2], 0.015 + random() * 0.08);
      ctx.fillRect(x, y, w, 0.5 + random() * 2.2);
    }
    ctx.globalCompositeOperation = "source-over";
  }

  // Linen weave and an imperfect gesso edge.
  ctx.fillStyle = "rgba(242, 237, 226, 0.025)";
  for (let x = 0; x < width; x += 7) ctx.fillRect(x, 0, 1, height);
  for (let y = 0; y < height; y += 9) ctx.fillRect(0, y, width, 1);

  if (!quiet) {
    ctx.strokeStyle = rgb(palette[4] ?? "#eee7d9", 0.64);
    ctx.lineWidth = 7;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = 2;
    ctx.strokeRect(13, 13, width - 26, height - 26);
  }

  return canvas;
}

function canvasTexture(canvas: HTMLCanvasElement, renderer: THREE.WebGLRenderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function revealTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no pudo preparar la capa de revelado.");
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return { canvas, context, texture };
}

const PAINT_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const PAINT_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uReveal;
  uniform float uOpacity;
  uniform float uInside;
  uniform float uRevealFloor;
  uniform float uTime;
  uniform float uSeed;
  uniform vec3 uAccent;
  uniform vec3 uGesso;

  varying vec2 vUv;

  float hash21(vec2 point) {
    point = fract(point * vec2(234.34, 435.345));
    point += dot(point, point + 34.23);
    return fract(point.x * point.y);
  }

  void main() {
    vec4 paint = texture2D(uMap, vUv);
    float storedReveal = texture2D(uReveal, vUv).r;
    float reveal = max(storedReveal, uRevealFloor);
    reveal = mix(reveal, 1.0, uInside);

    float horizontalThread = 0.5 + 0.5 * sin(vUv.y * 1260.0 + uSeed);
    float verticalThread = 0.5 + 0.5 * sin(vUv.x * 960.0 - uSeed * 1.7);
    float fiber = horizontalThread * verticalThread;
    float dust = hash21(floor(vUv * vec2(170.0, 214.0)) + uSeed);
    vec3 darkGround = mix(vec3(0.025, 0.021, 0.017), uGesso * 0.11, fiber * 0.2 + dust * 0.035);

    float pigment = smoothstep(0.06, 0.72, reveal);
    float wetEdge = smoothstep(0.08, 0.42, reveal)
      * (1.0 - smoothstep(0.5, 0.88, reveal))
      * (1.0 - uInside);
    vec3 edgeColor = mix(uGesso, uAccent, 0.34);
    vec3 color = mix(darkGround, paint.rgb, pigment);
    color = mix(color, edgeColor, wetEdge * 0.42);
    color += uInside * 0.018 * sin(uTime * 0.42 + vUv.y * 5.0 + uSeed);

    gl_FragColor = vec4(color, uOpacity);
  }
`;

function canvasFrameGeometry() {
  const outerWidth = 3.45;
  const outerHeight = 4.28;
  const innerWidth = 3.18;
  const innerHeight = 4;
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-outerWidth / 2, -outerHeight / 2);
  frameShape.lineTo(outerWidth / 2, -outerHeight / 2);
  frameShape.lineTo(outerWidth / 2, outerHeight / 2);
  frameShape.lineTo(-outerWidth / 2, outerHeight / 2);
  frameShape.closePath();

  const opening = new THREE.Path();
  opening.moveTo(-innerWidth / 2, -innerHeight / 2);
  opening.lineTo(-innerWidth / 2, innerHeight / 2);
  opening.lineTo(innerWidth / 2, innerHeight / 2);
  opening.lineTo(innerWidth / 2, -innerHeight / 2);
  opening.closePath();
  frameShape.holes.push(opening);

  return new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.13,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });
}

export class AtelierScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly works: readonly Work[];
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly world = new THREE.Group();
  private readonly camera = new THREE.PerspectiveCamera(39, 1, 0.1, 80);
  private readonly workMeshes: WorkMesh[] = [];
  private readonly hoverTargets: THREE.Object3D[] = [];
  private readonly chapters: ChapterMesh[] = [];
  private readonly reducedMotion: boolean;
  private readonly hoverCapable: boolean;
  private readonly onFirstFrame?: () => void;
  private readonly onFailure?: (error: Error) => void;
  private readonly resizeObserver: ResizeObserver;
  private readonly pointer = new THREE.Vector2();
  private readonly pointerTarget = new THREE.Vector2();
  private readonly rayPointer = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly lookTarget = new THREE.Vector3();
  private pointerInside = false;
  private hoveredIndex = -1;
  private progress = MIN_PROGRESS;
  private targetProgress = MIN_PROGRESS;
  private detailIndex = -1;
  private detailMix = 0;
  private targetDetailMix = 0;
  private raf = 0;
  private lastTime = 0;
  private firstFrameSent = false;
  private disposed = false;
  private visible = true;

  constructor(canvas: HTMLCanvasElement, works: readonly Work[], options: SceneOptions = {}) {
    this.canvas = canvas;
    this.works = works;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    this.onFirstFrame = options.onFirstFrame;
    this.onFailure = options.onFailure;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = false;

    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      "Sala tridimensional de Interactivision. Mueve el puntero sobre un lienzo para revelar su pintura y haz clic para entrar. Arrastra, usa la rueda o las flechas para recorrer seis obras.",
    );

    this.scene.background = new THREE.Color("#0b0a08");
    this.scene.fog = new THREE.FogExp2("#0b0a08", 0.055);
    this.camera.position.set(0, 0.05, 9.2);
    this.scene.add(this.camera);
    this.scene.add(this.world);

    this.createLighting();
    this.createBackdrop();
    this.createWorks();
    this.createPigmentDabs();
    this.createChapters();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();

    this.canvas.addEventListener("webglcontextlost", this.handleContextLost, false);
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.raf = window.requestAnimationFrame(this.render);
  }

  setProgress(progress: number, immediate = false) {
    this.targetProgress = clamp(progress, MIN_PROGRESS, this.works.length + 1);
    if (immediate || this.reducedMotion) this.progress = this.targetProgress;
  }

  setPointer(x: number, y: number, canHover = true) {
    this.pointerTarget.set(clamp(x, -1, 1), clamp(y, -1, 1));
    this.pointerInside = canHover && this.hoverCapable;
  }

  clearPointer() {
    this.pointerInside = false;
    this.workMeshes.forEach((mesh) => {
      mesh.lastRevealUv = null;
    });
  }

  pickWorkAt(x: number, y: number) {
    const hit = this.hitWork(x, y);
    if (!hit || Math.abs(hit.index - this.targetProgress) > 1.45) return null;
    return hit.index;
  }

  setDetail(index: number | null) {
    if (index === null) {
      this.targetDetailMix = 0;
      return;
    }
    this.detailIndex = Math.round(clamp(index, 0, this.works.length - 1));
    this.targetDetailMix = 1;
  }

  regenerate(index: number, seed = Math.random() * 500 + 1) {
    const mesh = this.workMeshes[index];
    const work = this.works[index];
    if (!mesh || !work) return;
    const previous = mesh.art.material.uniforms.uMap.value as THREE.Texture;
    mesh.art.material.uniforms.uMap.value = canvasTexture(paintStudy(work.palette, seed), this.renderer);
    previous?.dispose();
  }

  private hitWork(x: number, y: number): WorkHit | null {
    this.rayPointer.set(clamp(x, -1, 1), -clamp(y, -1, 1));
    this.camera.updateMatrixWorld();
    this.world.updateMatrixWorld(true);
    this.raycaster.setFromCamera(this.rayPointer, this.camera);
    const intersection = this.raycaster.intersectObjects(this.hoverTargets, false)[0];
    if (!intersection) return null;
    const index = this.workMeshes.findIndex((mesh) => mesh.art === intersection.object);
    return index >= 0 ? { index, intersection } : null;
  }

  private stampReveal(mesh: WorkMesh, uv: THREE.Vector2) {
    const current = new THREE.Vector2(uv.x, uv.y);
    const previous = mesh.lastRevealUv;
    const width = mesh.revealCanvas.width;
    const height = mesh.revealCanvas.height;
    const dx = previous ? (current.x - previous.x) * width : 0;
    const dy = previous ? (previous.y - current.y) * height : 0;
    const pixelDistance = Math.hypot(dx, dy);
    if (previous && pixelDistance < 1.4) return;

    const radius = width * 0.115;
    const steps = previous ? clamp(Math.ceil(pixelDistance / (radius * 0.3)), 1, 12) : 1;
    const angle = previous && pixelDistance > 0.1 ? Math.atan2(dy, dx) : -0.18;

    for (let step = 1; step <= steps; step += 1) {
      const mix = step / steps;
      const pointX = THREE.MathUtils.lerp(previous?.x ?? current.x, current.x, mix) * width;
      const pointY = (1 - THREE.MathUtils.lerp(previous?.y ?? current.y, current.y, mix)) * height;
      const context = mesh.revealContext;

      context.save();
      context.globalCompositeOperation = "lighter";
      context.translate(pointX, pointY);
      context.rotate(angle);
      context.scale(1.3, 0.72);
      const softness = context.createRadialGradient(0, 0, radius * 0.04, 0, 0, radius);
      softness.addColorStop(0, "rgba(255,255,255,0.98)");
      softness.addColorStop(0.56, "rgba(255,255,255,0.72)");
      softness.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = softness;
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.save();
      context.globalCompositeOperation = "lighter";
      context.translate(pointX, pointY);
      context.rotate(angle);
      context.fillStyle = "rgba(255,255,255,0.2)";
      for (let bristle = -4; bristle <= 4; bristle += 1) {
        const offset = bristle * radius * 0.13;
        const length = radius * (1.12 + 0.12 * Math.sin(bristle * 2.4 + pointX * 0.02));
        context.fillRect(-length * 0.56, offset, length, 1.1 + (Math.abs(bristle) % 2));
      }
      context.restore();
    }

    mesh.lastRevealUv = current;
    mesh.revealTexture.needsUpdate = true;
    this.canvas.dataset.revealedWork = this.works[this.workMeshes.indexOf(mesh)]?.id ?? "";
  }

  private createLighting() {
    const ambient = new THREE.HemisphereLight("#efe7d7", "#17110d", 1.05);
    const key = new THREE.DirectionalLight("#ffe6c4", 2.2);
    key.position.set(-4, 6, 8);
    const blue = new THREE.PointLight("#4d67d2", 8, 18, 2);
    blue.position.set(4, 1, 4);
    const red = new THREE.PointLight("#cf4e2d", 6, 16, 2);
    red.position.set(-4, -3, 2);
    this.scene.add(ambient, key, blue, red);
  }

  private createBackdrop() {
    const texture = canvasTexture(
      paintStudy(["#090806", "#15120f", "#1d2845", "#4a2419", "#9d7939"], 17.4, true),
      this.renderer,
    );
    const material = new THREE.MeshBasicMaterial({ map: texture, fog: false });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(34, 20), material);
    backdrop.position.set(0, 0, -8);
    backdrop.scale.set(1.25, 1.25, 1);
    this.scene.add(backdrop);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#0c0a08",
      roughness: 0.92,
      metalness: 0.02,
      transparent: true,
      opacity: 0.86,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 24), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(18, -3.55, -0.5);
    this.scene.add(floor);
  }

  private createWorks() {
    this.works.forEach((work, index) => {
      const group = new THREE.Group();
      const baseY = Math.sin(index * 1.67) * 0.34;
      const baseTilt = (index % 2 === 0 ? -1 : 1) * (0.018 + (index % 3) * 0.009);
      group.position.set(index * CARD_SPACING, baseY, 0);

      const shadowMaterial = new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      });
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.75, 4.65), shadowMaterial);
      shadow.position.set(0.24, -0.26, -0.16);

      const frameMaterial = new THREE.MeshStandardMaterial({
        color: work.palette[4],
        roughness: 0.78,
        metalness: 0.025,
        transparent: true,
      });
      const frame = new THREE.Mesh(canvasFrameGeometry(), frameMaterial);
      frame.position.z = -0.065;

      const texture = canvasTexture(paintStudy(work.palette, work.seed), this.renderer);
      const reveal = revealTexture();
      const artMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: texture },
          uReveal: { value: reveal.texture },
          uOpacity: { value: 1 },
          uInside: { value: 0 },
          uRevealFloor: { value: this.hoverCapable && !this.reducedMotion ? 0 : 1 },
          uTime: { value: 0 },
          uSeed: { value: work.seed },
          uAccent: { value: new THREE.Color(work.palette[3]) },
          uGesso: { value: new THREE.Color("#eadfcb") },
        },
        vertexShader: PAINT_VERTEX_SHADER,
        fragmentShader: PAINT_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: true,
      });
      artMaterial.toneMapped = false;
      const art = new THREE.Mesh(new THREE.PlaneGeometry(3.18, 4, 1, 1), artMaterial);
      art.position.z = 0.072;

      group.add(shadow, frame, art);
      group.rotation.z = baseTilt;
      this.world.add(group);
      this.workMeshes.push({
        group,
        art,
        frame,
        shadow,
        revealCanvas: reveal.canvas,
        revealContext: reveal.context,
        revealTexture: reveal.texture,
        lastRevealUv: null,
        baseY,
        baseTilt,
        hover: 0,
      });
      this.hoverTargets.push(art);
    });
  }

  private createPigmentDabs() {
    const count = 180;
    const geometry = new THREE.PlaneGeometry(0.13, 0.72, 1, 3);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const random = seededRandom(91.7);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    for (let i = 0; i < count; i += 1) {
      const work = this.works[i % this.works.length];
      position.set(
        (random() * (this.works.length + 2) - 1) * CARD_SPACING,
        (random() - 0.5) * 7.4,
        -3.8 + random() * 6.4,
      );
      rotation.set((random() - 0.5) * 1.3, (random() - 0.5) * 2.4, random() * Math.PI);
      quaternion.setFromEuler(rotation);
      scale.set(0.45 + random() * 1.5, 0.25 + random() * 1.8, 1);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, new THREE.Color(work.palette[2 + (i % 2)]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.world.add(mesh);
  }

  private createChapters() {
    const studio = new THREE.Group();
    const studioMaterials: ChapterMesh["materials"] = [];
    const studioPalettes = [
      ["#17130f", "#5b4a32", "#c6b79a", "#354b88", "#ece4d5"],
      ["#0e1417", "#23483d", "#8f6a35", "#bdc8bd", "#ece4d5"],
      ["#170d0a", "#5a2118", "#bb4a29", "#b8a080", "#ece4d5"],
    ];
    studioPalettes.forEach((palette, index) => {
      const texture = canvasTexture(paintStudy(palette, 201 + index * 17, index === 1), this.renderer);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.25), material);
      panel.position.set((index - 1) * 2.35, (index % 2) * 0.35 - 0.12, -Math.abs(index - 1) * 0.8);
      panel.rotation.y = (index - 1) * -0.18;
      studio.add(panel);
      studioMaterials.push(material);
    });
    const studioProgress = this.works.length;
    studio.position.x = studioProgress * CARD_SPACING;
    this.world.add(studio);
    this.chapters.push({ group: studio, materials: studioMaterials, progress: studioProgress });

    const contact = new THREE.Group();
    const contactMaterials: ChapterMesh["materials"] = [];
    const contactTexture = canvasTexture(
      paintStudy(["#0b0a08", "#25120d", "#bc4022", "#e08f4f", "#ece4d5"], 404.2),
      this.renderer,
    );
    const contactMaterial = new THREE.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      toneMapped: false,
    });
    const contactCanvas = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 4.35), contactMaterial);
    contactCanvas.rotation.z = -0.035;
    contact.add(contactCanvas);
    contactMaterials.push(contactMaterial);

    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: "#e9dfcf",
      roughness: 0.84,
      transparent: true,
    });
    const edge = new THREE.Mesh(new THREE.BoxGeometry(7.05, 4.6, 0.11), edgeMaterial);
    edge.position.z = -0.08;
    contact.add(edge);
    contactMaterials.push(edgeMaterial);
    const contactProgress = this.works.length + 1;
    contact.position.x = contactProgress * CARD_SPACING;
    this.world.add(contact);
    this.chapters.push({ group: contact, materials: contactMaterials, progress: contactProgress });
  }

  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.fov = width < 700 ? 48 : 39;
    this.camera.updateProjectionMatrix();
  }

  private handleVisibility = () => {
    this.visible = !document.hidden;
    if (this.visible && !this.disposed && !this.raf) {
      this.lastTime = performance.now();
      this.raf = window.requestAnimationFrame(this.render);
    }
  };

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.visible = false;
    this.onFailure?.(new Error("El contexto gráfico se perdió durante la visita."));
  };

  private render = (now: number) => {
    this.raf = 0;
    if (this.disposed || !this.visible) return;

    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.05) : 1 / 60;
    this.lastTime = now;
    const motion = this.reducedMotion ? 80 : 5.8;
    this.progress = damp(this.progress, this.targetProgress, motion, dt);
    this.detailMix = damp(this.detailMix, this.targetDetailMix, this.reducedMotion ? 80 : 7.2, dt);
    if (this.targetDetailMix === 0 && this.detailMix < 0.002) this.detailIndex = -1;

    this.pointer.x = damp(this.pointer.x, this.pointerTarget.x, 5.5, dt);
    this.pointer.y = damp(this.pointer.y, this.pointerTarget.y, 5.5, dt);
    this.world.position.x = -this.progress * CARD_SPACING;

    this.workMeshes.forEach((mesh, index) => {
      const work = this.works[index];
      const offset = index - this.progress;
      const distance = Math.abs(offset);
      const activeDetail = index === this.detailIndex ? this.detailMix : 0;
      const focus = clamp(1 - distance * 0.42, 0.08, 1);
      const idle = this.reducedMotion ? 0 : Math.sin(now * 0.00055 + index * 1.7) * 0.035 * focus;
      const insideDistance = clamp(2.78 - (work.zoom - 2) * 0.06, 2.62, 2.78);
      const viewportHeight = 2
        * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5))
        * insideDistance;
      const viewportWidth = viewportHeight * this.camera.aspect;
      const coverScale = Math.max(viewportWidth / 3.18, viewportHeight / 4)
        * (1.055 + (work.zoom - 2) * 0.018);
      const normalScale = clamp(1 - distance * 0.105, 0.58, 1) + mesh.hover * 0.018;
      const detailX = this.progress * CARD_SPACING - this.pointer.x * 0.06;
      const detailY = -this.pointer.y * 0.055;

      mesh.group.position.x = THREE.MathUtils.lerp(index * CARD_SPACING, detailX, activeDetail);
      mesh.group.position.y = damp(
        mesh.group.position.y,
        THREE.MathUtils.lerp(mesh.baseY + idle, detailY, activeDetail),
        7,
        dt,
      );
      mesh.group.position.z = damp(
        mesh.group.position.z,
        THREE.MathUtils.lerp(-distance * 1.22, this.camera.position.z - insideDistance, activeDetail),
        7,
        dt,
      );
      mesh.group.rotation.y = damp(mesh.group.rotation.y, clamp(-offset * 0.24, -0.72, 0.72) * (1 - activeDetail), 7, dt);
      mesh.group.rotation.z = damp(
        mesh.group.rotation.z,
        THREE.MathUtils.lerp(mesh.baseTilt, THREE.MathUtils.degToRad(work.angle), activeDetail),
        7,
        dt,
      );
      const scale = THREE.MathUtils.lerp(normalScale, coverScale, activeDetail);
      mesh.group.scale.setScalar(damp(mesh.group.scale.x, scale, 7, dt));

      const otherFade = this.detailMix > 0 && index !== this.detailIndex ? 1 - this.detailMix * 0.93 : 1;
      const opacity = clamp((0.26 + focus * 0.74) * otherFade, 0.02, 1);
      mesh.art.material.uniforms.uOpacity.value = opacity;
      mesh.art.material.uniforms.uInside.value = activeDetail;
      mesh.art.material.uniforms.uTime.value = now * 0.001;
      mesh.frame.material.opacity = opacity * (1 - activeDetail);
      mesh.shadow.material.opacity = 0.34 * opacity * (1 - activeDetail);
      mesh.group.visible = distance < 3.8 || activeDetail > 0.01;
    });

    this.chapters.forEach((chapter) => {
      const distance = Math.abs(chapter.progress - this.progress);
      const opacity = clamp(1 - distance * 0.55, 0, 1) * (1 - this.detailMix);
      chapter.group.visible = distance < 2.2;
      chapter.group.position.z = -distance * 1.3;
      chapter.group.rotation.y = clamp((chapter.progress - this.progress) * -0.16, -0.5, 0.5);
      chapter.group.scale.setScalar(clamp(1 - distance * 0.08, 0.72, 1));
      chapter.materials.forEach((material) => {
        material.opacity = opacity;
      });
    });

    const parallax = THREE.MathUtils.lerp(1, 0.28, this.detailMix);
    this.camera.position.x = damp(this.camera.position.x, this.pointer.x * 0.22 * parallax, 4.5, dt);
    this.camera.position.y = damp(this.camera.position.y, 0.05 - this.pointer.y * 0.16 * parallax, 4.5, dt);
    this.lookTarget.set(this.pointer.x * 0.08 * parallax, -this.pointer.y * 0.06 * parallax, 0);
    this.camera.lookAt(this.lookTarget);

    let nextHoveredIndex = -1;
    const canRevealPaint = this.pointerInside && !this.reducedMotion && this.detailMix < 0.025;
    if (canRevealPaint) {
      const hit = this.hitWork(this.pointerTarget.x, this.pointerTarget.y);
      if (hit && Math.abs(hit.index - this.targetProgress) <= 1.45) {
        nextHoveredIndex = hit.index;
        const uv = hit.intersection.uv;
        if (uv) this.stampReveal(this.workMeshes[hit.index], uv);
      }
    }

    this.hoveredIndex = nextHoveredIndex;
    this.canvas.classList.toggle("is-art-hovered", this.hoveredIndex >= 0);
    this.canvas.dataset.hoveredWork = this.hoveredIndex >= 0 ? this.works[this.hoveredIndex].id : "";
    this.workMeshes.forEach((mesh, index) => {
      const targetHover = index === this.hoveredIndex ? 1 : 0;
      mesh.hover = damp(mesh.hover, targetHover, targetHover ? 8.8 : 6.2, dt);
      if (index !== this.hoveredIndex) mesh.lastRevealUv = null;
    });

    try {
      this.renderer.render(this.scene, this.camera);
      if (!this.firstFrameSent) {
        this.firstFrameSent = true;
        this.onFirstFrame?.();
      }
    } catch (error) {
      this.onFailure?.(error instanceof Error ? error : new Error("La sala 3D no pudo dibujarse."));
      return;
    }

    this.raf = window.requestAnimationFrame(this.render);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.canvas.removeEventListener("webglcontextlost", this.handleContextLost);
    this.canvas.classList.remove("is-art-hovered");
    delete this.canvas.dataset.hoveredWork;
    delete this.canvas.dataset.revealedWork;

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if ("map" in material && material.map instanceof THREE.Texture) material.map.dispose();
        if (material instanceof THREE.ShaderMaterial) {
          Object.values(material.uniforms).forEach((uniform) => {
            if (uniform.value instanceof THREE.Texture) uniform.value.dispose();
          });
        }
        material.dispose();
      });
    });
    this.renderer.dispose();
  }
}
