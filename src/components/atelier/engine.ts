/* Interactivision — motor WebGL.
   Un solo contexto dibuja todo: fondo, estela de pigmento y las obras
   (planos con textura generada por shader). Port TS del prototipo probado. */

import type { Work } from "@/lib/paintings";

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error("Shader: " + gl.getShaderInfoLog(s));
  }
  return s;
}

function makeProgram(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("Program: " + gl.getProgramInfoLog(p));
  }
  return p;
}

/* ---------- shaders ---------- */

const VS_QUAD = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos;
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}`;

const VS_RECT = `
attribute vec2 aPos;
uniform vec4 uRect;
uniform vec2 uRes;
uniform float uRotY;
varying vec2 vUv;
void main(){
  vUv = aPos;
  vec2 half = uRect.zw * 0.5;
  vec2 center = uRect.xy + half;
  vec3 p = vec3((aPos - 0.5) * uRect.zw, 0.0);
  float c = cos(uRotY); float s = sin(uRotY);
  p = vec3(c * p.x, p.y, -s * p.x);
  float persp = 1.0 / max(1.0 + p.z * 0.0011, 0.35);
  vec2 px = center + p.xy * persp;
  vec2 clip = (px / uRes) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const NOISE_GLSL = `
float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0; float amp = 0.5;
  mat2 r = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++){
    v += amp * noise(p);
    p = r * p;
    amp *= 0.55;
  }
  return v;
}`;

// Genera una "pintura" abstracta (una vez por obra, a un FBO)
const FS_GEN = `
precision highp float;
varying vec2 vUv;
uniform float uSeed;
uniform float uZoom;
uniform float uAngle;
uniform vec3 uPal0; uniform vec3 uPal1; uniform vec3 uPal2;
uniform vec3 uPal3; uniform vec3 uPal4;
${NOISE_GLSL}
void main(){
  vec2 p = (vUv - 0.5) * vec2(0.8, 1.0) * uZoom + uSeed;
  vec2 q = vec2(fbm(p + uSeed), fbm(p + uSeed + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2)),
                fbm(p + 4.0 * q + vec2(8.3, 2.8)));
  float f = fbm(p + 4.0 * r);
  vec3 col = mix(uPal0, uPal1, clamp(f * f * 3.2, 0.0, 1.0));
  col = mix(col, uPal2, clamp(length(q) * 0.9, 0.0, 1.0));
  col = mix(col, uPal3, clamp(r.x * r.x, 0.0, 1.0) * 0.75);
  float ca = cos(uAngle); float sa = sin(uAngle);
  vec2 sp = mat2(ca, -sa, sa, ca) * (vUv - 0.5);
  float strokes = noise(vec2(sp.x * 64.0 + uSeed, sp.y * 7.0));
  float strokes2 = noise(vec2(sp.x * 180.0 + uSeed, sp.y * 14.0));
  col *= 0.84 + 0.24 * strokes + 0.08 * strokes2;
  float e = 0.006;
  float hx = fbm(p + 4.0 * r + vec2(e, 0.0)) - f;
  float hy = fbm(p + 4.0 * r + vec2(0.0, e)) - f;
  vec3 n = normalize(vec3(-hx, -hy, e * 3.0));
  float spec = pow(max(dot(n, normalize(vec3(0.4, 0.6, 0.7))), 0.0), 10.0);
  col += spec * 0.16 * vec3(1.0, 0.96, 0.86);
  float weave = (sin(vUv.x * 640.0) * sin(vUv.y * 820.0)) * 0.5 + 0.5;
  col *= 0.965 + 0.035 * weave;
  float bw = 0.035 + 0.028 * noise(vUv * 26.0 + uSeed);
  float edge = smoothstep(0.0, bw, vUv.x) * smoothstep(0.0, bw, 1.0 - vUv.x)
             * smoothstep(0.0, bw, vUv.y) * smoothstep(0.0, bw, 1.0 - vUv.y);
  col = mix(uPal4 * (0.9 + 0.1 * strokes), col, clamp(edge * 1.7, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

// Estela de pigmento (ping-pong, media resolución)
const FS_TRAIL = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform float uAspect;
uniform float uStrength;
uniform float uDir;
uniform float uTime;
uniform vec3 uPigA; uniform vec3 uPigB;
${NOISE_GLSL}
void main(){
  vec2 flow = vec2(noise(vUv * 6.0 + uTime * 0.15) - 0.5,
                   noise(vUv * 6.0 + 7.3 - uTime * 0.12) - 0.5);
  vec2 src = vUv + flow * 0.0028 + vec2(0.0, 0.00055);
  vec3 c = texture2D(uPrev, src).rgb;
  c = max(c * 0.972 - 1.5 / 255.0, 0.0);
  vec2 dm = vUv - uMouse; dm.x *= uAspect;
  float d = length(dm);
  float s = smoothstep(0.055, 0.0, d) * uStrength;
  vec3 pig = mix(uPigA, uPigB, 0.5 + 0.5 * sin(uDir));
  c += pig * s;
  gl_FragColor = vec4(min(c, 1.0), 1.0);
}`;

// Fondo: lavado de pigmento + estela como barniz húmedo
const FS_BG = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTrail;
uniform vec2 uTrailTexel;
uniform vec3 uBase; uniform vec3 uWashA; uniform vec3 uWashB;
${NOISE_GLSL}
void main(){
  vec3 col = uBase;
  float w1 = fbm(vUv * vec2(1.6, 2.2) + uTime * 0.010);
  float w2 = fbm(vUv * 3.1 + 3.7 - uTime * 0.008);
  col += uWashA * w1 * 0.045 + uWashB * w2 * 0.035;
  float vg = smoothstep(1.25, 0.35, length(vUv - 0.5));
  col *= mix(0.80, 1.0, vg);
  vec3 t = texture2D(uTrail, vUv).rgb;
  col += t * 0.50;
  float tl = dot(t, vec3(0.333));
  float tr = dot(texture2D(uTrail, vUv + vec2(uTrailTexel.x * 1.5, 0.0)).rgb, vec3(0.333));
  col += clamp(tr - tl, 0.0, 1.0) * 0.42 * vec3(0.92, 0.9, 0.84);
  float g = hash(vUv * 913.7 + fract(uTime));
  col += (g - 0.5) * 0.028;
  gl_FragColor = vec4(col, 1.0);
}`;

// Plano de obra: textura + ondulación al hover + revelado a brochazos
const FS_PLANE = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform float uHover;
uniform float uVel;
uniform float uReveal;
uniform float uSeed;
uniform vec2 uMouseLocal;
uniform float uAspect;
uniform float uParallax;
uniform float uFocus;
${NOISE_GLSL}
void main(){
  vec2 uv = (vUv - 0.5) / 1.12 + 0.5;
  uv.y += uParallax;
  vec2 dm = vUv - uMouseLocal;
  float dist = length(dm * vec2(uAspect, 1.0));
  float rip = sin(dist * 26.0 - uTime * 5.0) * exp(-dist * 4.0) * 0.014 * uHover;
  uv += normalize(dm + 1e-5) * rip;
  float sh = 0.006 * uHover * clamp(uVel, 0.0, 1.5);
  vec3 col;
  col.r = texture2D(uTex, uv + vec2(sh, 0.0)).r;
  col.g = texture2D(uTex, uv).g;
  col.b = texture2D(uTex, uv - vec2(sh, 0.0)).b;
  float n = noise(vUv * 7.0 + uSeed);
  float t = 1.0 - vUv.y;
  float alpha = smoothstep(t - 0.10, t + 0.02, uReveal * 1.12 + (n - 0.5) * 0.14);
  float bd = 0.012;
  float inner = smoothstep(0.0, bd, vUv.x) * smoothstep(0.0, bd, 1.0 - vUv.x)
              * smoothstep(0.0, bd, vUv.y) * smoothstep(0.0, bd, 1.0 - vUv.y);
  col *= mix(0.55, 1.0, inner);
  col *= mix(0.45, 1.0, uFocus);
  col *= 0.96 + 0.08 * uHover;
  float g = hash(vUv * 719.3 + fract(uTime * 0.7));
  col += (g - 0.5) * 0.02;
  gl_FragColor = vec4(col, alpha);
}`;

// Velo oscuro para el modo lightbox
const FS_DIM = `
precision mediump float;
uniform float uAlpha;
void main(){ gl_FragColor = vec4(0.045, 0.042, 0.038, uAlpha); }`;

/* ---------- tipos de estado ---------- */

export interface PlaneState {
  rect: [number, number, number, number];
  tex: WebGLTexture | null;
  hover: number;
  vel: number;
  reveal: number;
  seed: number;
  parallax: number;
  mouseLocal: [number, number];
  /** rotación Y en radianes (carrusel 3D); 0 = de frente */
  rotY: number;
  /** 1 = tarjeta enfocada (centro), hacia 0 se oscurece */
  focus: number;
}

export interface RenderState {
  time: number;
  mouse: { u: number; v: number; strength: number; dir: number };
  planes: PlaneState[];
  dim: number;
  activePlane: number;
}

const PAINT_W = 896;
const PAINT_H = 1120; // proporción 4:5

/* ---------- clase principal ---------- */

export class AtelierGL {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  dpr: number;
  paintings: (WebGLTexture | undefined)[] = [];
  trailOn: boolean;
  cssW = 0;
  cssH = 0;

  private quad!: WebGLBuffer;
  private progGen!: WebGLProgram;
  private progTrail!: WebGLProgram;
  private progBg!: WebGLProgram;
  private progPlane!: WebGLProgram;
  private progDim!: WebGLProgram;
  private fbo!: WebGLFramebuffer;
  private trailA: WebGLTexture | null = null;
  private trailB: WebGLTexture | null = null;
  private trailW = 0;
  private trailH = 0;

  constructor(canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean } = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL no disponible");
    this.gl = gl;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.trailOn = !opts.reducedMotion;
    this.build();
    this.resize();
  }

  private build() {
    const gl = this.gl;
    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

    this.progGen = makeProgram(gl, VS_QUAD, FS_GEN);
    this.progTrail = makeProgram(gl, VS_QUAD, FS_TRAIL);
    this.progBg = makeProgram(gl, VS_QUAD, FS_BG);
    this.progPlane = makeProgram(gl, VS_RECT, FS_PLANE);
    this.progDim = makeProgram(gl, VS_QUAD, FS_DIM);

    this.fbo = gl.createFramebuffer()!;
  }

  private bindQuad(prog: WebGLProgram) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }

  private makeTexture(w: number, h: number): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  /** Genera (o re-genera) la textura de una obra. */
  generatePainting(index: number, work: Work, seed?: number) {
    const gl = this.gl;
    let tex = this.paintings[index];
    if (!tex) {
      tex = this.makeTexture(PAINT_W, PAINT_H);
      this.paintings[index] = tex;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, PAINT_W, PAINT_H);
    gl.disable(gl.BLEND);

    const p = this.progGen;
    gl.useProgram(p);
    this.bindQuad(p);
    gl.uniform1f(gl.getUniformLocation(p, "uSeed"), seed !== undefined ? seed : work.seed);
    gl.uniform1f(gl.getUniformLocation(p, "uZoom"), work.zoom);
    gl.uniform1f(gl.getUniformLocation(p, "uAngle"), work.angle);
    for (let i = 0; i < 5; i++) {
      const rgb = hexToRgb01(work.palette[i]);
      gl.uniform3f(gl.getUniformLocation(p, "uPal" + i), rgb[0], rgb[1], rgb[2]);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  resize() {
    const gl = this.gl;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.cssW = w;
    this.cssH = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);

    const tw = Math.max(2, Math.round(this.canvas.width / 2));
    const th = Math.max(2, Math.round(this.canvas.height / 2));
    this.trailW = tw;
    this.trailH = th;
    if (this.trailA) gl.deleteTexture(this.trailA);
    if (this.trailB) gl.deleteTexture(this.trailB);
    this.trailA = this.makeTexture(tw, th);
    this.trailB = this.makeTexture(tw, th);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    for (const t of [this.trailA, this.trailB]) {
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.viewport(0, 0, tw, th);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  render(state: RenderState) {
    const gl = this.gl;

    // 1. estela de pigmento (ping-pong)
    if (this.trailOn && this.trailA && this.trailB) {
      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.trailB, 0);
      gl.viewport(0, 0, this.trailW, this.trailH);
      const pt = this.progTrail;
      gl.useProgram(pt);
      this.bindQuad(pt);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.trailA);
      gl.uniform1i(gl.getUniformLocation(pt, "uPrev"), 0);
      gl.uniform2f(gl.getUniformLocation(pt, "uMouse"), state.mouse.u, state.mouse.v);
      gl.uniform1f(gl.getUniformLocation(pt, "uAspect"), this.cssW / this.cssH);
      gl.uniform1f(gl.getUniformLocation(pt, "uStrength"), state.mouse.strength);
      gl.uniform1f(gl.getUniformLocation(pt, "uDir"), state.mouse.dir);
      gl.uniform1f(gl.getUniformLocation(pt, "uTime"), state.time);
      gl.uniform3f(gl.getUniformLocation(pt, "uPigA"), 0.18, 0.29, 0.78); // ultramar
      gl.uniform3f(gl.getUniformLocation(pt, "uPigB"), 0.85, 0.31, 0.13); // bermellón
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      const tmp = this.trailA;
      this.trailA = this.trailB;
      this.trailB = tmp;
    }

    // 2. fondo
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.BLEND);
    const pb = this.progBg;
    gl.useProgram(pb);
    this.bindQuad(pb);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.trailA);
    gl.uniform1i(gl.getUniformLocation(pb, "uTrail"), 0);
    gl.uniform2f(gl.getUniformLocation(pb, "uTrailTexel"), 1 / this.trailW, 1 / this.trailH);
    gl.uniform1f(gl.getUniformLocation(pb, "uTime"), state.time);
    gl.uniform3f(gl.getUniformLocation(pb, "uBase"), 0.063, 0.059, 0.051); // #100F0D
    gl.uniform3f(gl.getUniformLocation(pb, "uWashA"), 0.18, 0.29, 0.78);
    gl.uniform3f(gl.getUniformLocation(pb, "uWashB"), 0.79, 0.59, 0.23);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 3. planos de obras
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (let i = 0; i < state.planes.length; i++) {
      if (i === state.activePlane) continue;
      const pl = state.planes[i];
      if (pl.reveal <= 0.001) continue;
      this.drawPlane(pl, state.time);
    }

    // 4. velo + obra activa (lightbox)
    if (state.dim > 0.001) {
      const pd = this.progDim;
      gl.useProgram(pd);
      this.bindQuad(pd);
      gl.uniform1f(gl.getUniformLocation(pd, "uAlpha"), state.dim * 0.88);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (state.activePlane >= 0) {
      this.drawPlane(state.planes[state.activePlane], state.time);
    }
  }

  private drawPlane(pl: PlaneState, time: number) {
    const gl = this.gl;
    const p = this.progPlane;
    gl.useProgram(p);
    this.bindQuad(p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pl.tex);
    gl.uniform1i(gl.getUniformLocation(p, "uTex"), 0);
    gl.uniform4f(gl.getUniformLocation(p, "uRect"), pl.rect[0], pl.rect[1], pl.rect[2], pl.rect[3]);
    gl.uniform2f(gl.getUniformLocation(p, "uRes"), this.cssW, this.cssH);
    gl.uniform1f(gl.getUniformLocation(p, "uTime"), time);
    gl.uniform1f(gl.getUniformLocation(p, "uHover"), pl.hover);
    gl.uniform1f(gl.getUniformLocation(p, "uVel"), pl.vel);
    gl.uniform1f(gl.getUniformLocation(p, "uReveal"), pl.reveal);
    gl.uniform1f(gl.getUniformLocation(p, "uSeed"), pl.seed);
    gl.uniform2f(gl.getUniformLocation(p, "uMouseLocal"), pl.mouseLocal[0], pl.mouseLocal[1]);
    gl.uniform1f(gl.getUniformLocation(p, "uAspect"), pl.rect[2] / Math.max(pl.rect[3], 1));
    gl.uniform1f(gl.getUniformLocation(p, "uParallax"), pl.parallax);
    gl.uniform1f(gl.getUniformLocation(p, "uRotY"), pl.rotY);
    gl.uniform1f(gl.getUniformLocation(p, "uFocus"), pl.focus);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
