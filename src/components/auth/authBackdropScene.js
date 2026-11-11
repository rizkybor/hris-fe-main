// Login backdrop: a slow aurora of brand-blue light with drifting motes.
// Plain WebGL (no library): one full-screen shader for the aurora (domain-
// warped noise, kept calm behind the text on the left) and one point
// sprite pass for the motes (motion computed on the GPU, no per-frame CPU
// work). The light leans gently toward the pointer. At most 30 fps, pixel
// ratio capped, paused while the tab is hidden or the panel is off screen.
// Loaded on demand from AuthBackdrop.vue.

const FRAME_MS = 1000 / 30;
const MOTES = 190;

const QUAD_VERTEX = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const AURORA_FRAGMENT = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform vec2 uPointer;
uniform float uPointerAmt;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  float t = uTime * 0.035;
  // Domain warp: the light folds slowly into itself.
  vec2 q = vec2(fbm(p * 1.6 + vec2(t, -t)), fbm(p * 1.6 + vec2(-t * 0.8, t * 1.2) + 5.2));
  float n = fbm(p * 1.3 + q * 1.8 + vec2(t * 0.6, t * 0.3));

  // Ribbons: soft bands running diagonally, drifting.
  float band = sin((p.x * 1.2 + p.y * 2.4 + q.x * 2.6 - uTime * 0.05) * 3.1416);
  float ribbon = smoothstep(-0.15, 1.0, band) * smoothstep(0.28, 0.7, n);

  // Keep the text column (left, middle) calm; more light right and low.
  float calm = smoothstep(0.0, 0.62, vUv.x) * 0.75 + 0.25;
  calm *= 1.0 - 0.35 * smoothstep(0.35, 0.0, abs(vUv.y - 0.55)) * (1.0 - smoothstep(0.35, 0.6, vUv.x));

  // Light leans toward the pointer.
  vec2 d = vec2((vUv.x - uPointer.x) * uAspect, vUv.y - uPointer.y);
  float glow = exp(-dot(d, d) * 4.5) * uPointerAmt;

  float light = (ribbon * 1.1 + n * 0.3) * calm + glow * 0.75 * (0.5 + n);
  vec3 deep = vec3(0.12, 0.36, 0.85);   // brand blue
  vec3 bright = vec3(0.32, 0.72, 0.98); // cyan accent
  vec3 color = mix(deep, bright, smoothstep(0.45, 1.0, ribbon + glow * 0.6));
  gl_FragColor = vec4(color, clamp(light * 0.62, 0.0, 0.72));
}`;

const MOTE_VERTEX = `
attribute vec4 aSeed; // x, y start (0..1), speed, phase
uniform float uTime;
uniform float uScale;
varying float vTwinkle;
varying float vFade;
void main() {
  float speed = 0.012 + aSeed.z * 0.03;
  float y = fract(aSeed.y + uTime * speed);
  float x = aSeed.x + sin(uTime * (0.25 + aSeed.z * 0.4) + aSeed.w * 6.283) * 0.025;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed.z * 2.0) + aSeed.w * 6.283);
  vFade = smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.8, 1.0, y));
  gl_PointSize = (2.2 + aSeed.z * 3.6) * uScale;
  gl_Position = vec4(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
}`;

const MOTE_FRAGMENT = `
precision mediump float;
varying float vTwinkle;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.25, 1.0, d)) * vTwinkle * vFade * 0.95;
  if (a < 0.01) discard;
  gl_FragColor = vec4(0.78, 0.88, 1.0, a);
}`;

export function start(host, onReady) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, depth: false, powerPreference: "low-power", premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL unavailable");
  host.appendChild(canvas);

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader");
    return shader;
  };
  const link = (vsSource, fsSource) => {
    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link");
    return { program, shaders: [vs, fs] };
  };

  // Aurora: one triangle covering the screen.
  const aurora = link(QUAD_VERTEX, AURORA_FRAGMENT);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(aurora.program, "aPos");
  const au = (n) => gl.getUniformLocation(aurora.program, n);
  const uTimeA = au("uTime");
  const uAspect = au("uAspect");
  const uPointer = au("uPointer");
  const uPointerAmt = au("uPointerAmt");

  // Motes: static seeds, motion in the vertex shader.
  const motes = link(MOTE_VERTEX, MOTE_FRAGMENT);
  const seeds = new Float32Array(MOTES * 4);
  for (let i = 0; i < MOTES; i++) seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  const seedBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  const aSeed = gl.getAttribLocation(motes.program, "aSeed");
  const uTimeM = gl.getUniformLocation(motes.program, "uTime");
  const uScale = gl.getUniformLocation(motes.program, "uScale");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  // The aurora is soft, so it renders at a reduced resolution.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  const resize = () => {
    const w = Math.max(1, Math.round((host.clientWidth || 1) * dpr));
    const h = Math.max(1, Math.round((host.clientHeight || 1) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  // Pointer, in panel UV (0..1, y up), eased in the loop.
  const pointer = { x: 0.7, y: 0.5, tx: 0.7, ty: 0.5, amt: 0, target: 0 };
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    pointer.tx = (e.clientX - r.left) / r.width;
    pointer.ty = 1 - (e.clientY - r.top) / r.height;
    pointer.target = pointer.tx >= 0 && pointer.tx <= 1 && pointer.ty >= 0 && pointer.ty <= 1 ? 1 : 0;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let running = false;
  let ready = false;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dtMs = now - last;
    if (dtMs < FRAME_MS) return;
    last = now;
    const dt = Math.min(dtMs, 100) / 1000;
    elapsed += dt;
    const k = 1 - Math.exp(-dt * 2.5);
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.amt += (pointer.target - pointer.amt) * k;

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(aurora.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uTimeA, elapsed);
    gl.uniform1f(uAspect, canvas.width / canvas.height);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.uniform1f(uPointerAmt, pointer.amt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(aPos);

    gl.useProgram(motes.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
    gl.enableVertexAttribArray(aSeed);
    gl.vertexAttribPointer(aSeed, 4, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uTimeM, elapsed);
    gl.uniform1f(uScale, dpr);
    gl.drawArrays(gl.POINTS, 0, MOTES);
    gl.disableVertexAttribArray(aSeed);

    if (!ready) {
      ready = true;
      onReady?.();
    }
  };
  const play = () => {
    if (running) return;
    running = true;
    last = performance.now() - FRAME_MS;
    raf = requestAnimationFrame(frame);
  };
  const pause = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  let onScreen = true;
  const sync = () => (onScreen && !document.hidden ? play() : pause());
  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  intersection.observe(host);
  document.addEventListener("visibilitychange", sync);
  sync();

  return () => {
    pause();
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("visibilitychange", sync);
    intersection.disconnect();
    resizeObserver.disconnect();
    gl.deleteBuffer(quad);
    gl.deleteBuffer(seedBuffer);
    for (const { program, shaders } of [aurora, motes]) {
      shaders.forEach((s) => gl.deleteShader(s));
      gl.deleteProgram(program);
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  };
}
