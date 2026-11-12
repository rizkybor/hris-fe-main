// Login backdrop: a slow aurora of brand-blue light with drifting motes.
// Plain WebGL (no library), two layers: the aurora (one full-screen shader,
// domain-warped noise, kept calm behind the text on the left) renders at a
// reduced resolution since it's soft anyway; the motes (point sprites,
// motion computed on the GPU) get their own canvas at full device
// resolution so they stay crisp on Retina screens. The light leans gently toward the pointer. At most 30 fps, pixel
// ratio capped, paused while the tab is hidden or the panel is off screen.
// Loaded on demand from AuthBackdrop.vue.
//
// Sky: setSky() (from skyPhase.js, once a minute) retints the aurora for the
// time of day, fades the motes (stars) out by day and moves a small sun
// across the sky. All of it is a few uniforms per frame.

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
uniform vec3 uDeep;
uniform vec3 uBright;
uniform float uGlow;
uniform float uTimeSun;
uniform vec2 uSunPos;
uniform float uSunAmt;
uniform float uSunWarm;

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

  float light = ((ribbon * 1.1 + n * 0.3) * calm) * uGlow + glow * 0.75 * (0.5 + n);
  vec3 color = mix(uDeep, uBright, smoothstep(0.45, 1.0, ribbon + glow * 0.6));
  // Sun: a bright disc, a soft halo that lights the sky around it, slow
  // rays and two faint lens ghosts toward the centre.
  float sunLight = 0.0;
  vec3 sunCol = mix(vec3(1.0, 0.98, 0.9), vec3(1.0, 0.74, 0.45), uSunWarm);
  if (uSunAmt > 0.001) {
    vec2 sd = vec2((vUv.x - uSunPos.x) * uAspect, vUv.y - uSunPos.y);
    float r = length(sd);
    float disc = 1.0 - smoothstep(0.009, 0.019, r);
    float halo = exp(-r * r * 220.0) * 0.55 + exp(-r * r * 14.0) * 0.22;
    float ang = atan(sd.y, sd.x);
    float rays = (pow(max(0.0, sin(ang * 9.0 + uTimeSun * 0.06)), 10.0) + pow(max(0.0, sin(ang * 14.0 - uTimeSun * 0.04 + 1.7)), 14.0) * 0.6) * exp(-r * 10.0) * 0.18;
    vec2 toCentre = vec2(0.5, 0.5) - uSunPos;
    vec2 g1 = vec2((vUv.x - (uSunPos.x + toCentre.x * 0.7)) * uAspect, vUv.y - (uSunPos.y + toCentre.y * 0.7));
    vec2 g2 = vec2((vUv.x - (uSunPos.x + toCentre.x * 1.25)) * uAspect, vUv.y - (uSunPos.y + toCentre.y * 1.25));
    float ghosts = (1.0 - smoothstep(0.02, 0.035, length(g1))) * 0.07 + (1.0 - smoothstep(0.045, 0.07, length(g2))) * 0.045;
    sunLight = (disc + halo + rays + ghosts) * uSunAmt;
    color = mix(color, sunCol, clamp(sunLight, 0.0, 1.0));
  }
  gl_FragColor = vec4(color, clamp(max(light * 0.62, sunLight * 0.95), 0.0, 0.97));
}`;

const MOTE_VERTEX = `
attribute vec4 aSeed; // x, y start (0..1), speed, phase
uniform float uTime;
uniform float uScale;
uniform float uStars;
varying float vTwinkle;
varying float vFade;
void main() {
  float speed = 0.012 + aSeed.z * 0.03;
  float y = fract(aSeed.y + uTime * speed);
  float x = aSeed.x + sin(uTime * (0.25 + aSeed.z * 0.4) + aSeed.w * 6.283) * 0.025;
  vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed.z * 2.0) + aSeed.w * 6.283);
  vFade = smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.8, 1.0, y)) * uStars;
  gl_PointSize = (2.6 + aSeed.z * 3.4) * uScale;
  gl_Position = vec4(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
}`;

const MOTE_FRAGMENT = `
precision mediump float;
varying float vTwinkle;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  // A crisp dot (tight edge) with a faint narrow glow.
  float a = ((1.0 - smoothstep(0.42, 0.62, d)) + (1.0 - smoothstep(0.62, 1.0, d)) * 0.18) * vTwinkle * vFade;
  if (a < 0.01) discard;
  gl_FragColor = vec4(0.78, 0.88, 1.0, a);
}`;

export function start(host, onReady) {
  const layer = () => {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, depth: false, powerPreference: "low-power", premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL unavailable");
    host.appendChild(canvas);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    return { canvas, gl };
  };
  const auroraLayer = layer();
  const moteLayer = layer();

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "shader");
    return shader;
  };
  const link = (gl, vsSource, fsSource) => {
    const vs = compile(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link");
    return { program, shaders: [vs, fs] };
  };

  // Aurora: one triangle covering the screen.
  const ga = auroraLayer.gl;
  const aurora = link(ga, QUAD_VERTEX, AURORA_FRAGMENT);
  const quad = ga.createBuffer();
  ga.bindBuffer(ga.ARRAY_BUFFER, quad);
  ga.bufferData(ga.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ga.STATIC_DRAW);
  const aPos = ga.getAttribLocation(aurora.program, "aPos");
  const au = (n) => ga.getUniformLocation(aurora.program, n);
  const uTimeA = au("uTime");
  const uAspect = au("uAspect");
  const uPointer = au("uPointer");
  const uPointerAmt = au("uPointerAmt");
  const uDeep = au("uDeep");
  const uBright = au("uBright");
  const uGlow = au("uGlow");
  const uTimeSun = au("uTimeSun");
  const uSunPos = au("uSunPos");
  const uSunAmt = au("uSunAmt");
  const uSunWarm = au("uSunWarm");
  ga.useProgram(aurora.program);
  ga.bindBuffer(ga.ARRAY_BUFFER, quad);
  ga.enableVertexAttribArray(aPos);
  ga.vertexAttribPointer(aPos, 2, ga.FLOAT, false, 0, 0);

  // Motes: static seeds, motion in the vertex shader.
  const gm = moteLayer.gl;
  const motes = link(gm, MOTE_VERTEX, MOTE_FRAGMENT);
  const seeds = new Float32Array(MOTES * 4);
  for (let i = 0; i < MOTES; i++) seeds.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  const seedBuffer = gm.createBuffer();
  gm.bindBuffer(gm.ARRAY_BUFFER, seedBuffer);
  gm.bufferData(gm.ARRAY_BUFFER, seeds, gm.STATIC_DRAW);
  const aSeed = gm.getAttribLocation(motes.program, "aSeed");
  const uTimeM = gm.getUniformLocation(motes.program, "uTime");
  const uScale = gm.getUniformLocation(motes.program, "uScale");
  const uStars = gm.getUniformLocation(motes.program, "uStars");
  gm.useProgram(motes.program);
  gm.enableVertexAttribArray(aSeed);
  gm.vertexAttribPointer(aSeed, 4, gm.FLOAT, false, 0, 0);


  // The aurora is soft, so it renders at a reduced resolution; the motes
  // at the device's own (up to 2x) so they stay sharp.
  const AURORA_DPR = Math.min(window.devicePixelRatio || 1, 1.25);
  const MOTE_DPR = Math.min(window.devicePixelRatio || 1, 2);
  const fit = ({ canvas, gl }, dpr) => {
    const w = Math.max(1, Math.round((host.clientWidth || 1) * dpr));
    const h = Math.max(1, Math.round((host.clientHeight || 1) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  const resize = () => {
    fit(auroraLayer, AURORA_DPR);
    fit(moteLayer, MOTE_DPR);
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

  // Sky state: targets come from setSky(), current values ease toward them
  // (a few seconds) so a change of phase never pops.
  const sky = {
    deep: [0.12, 0.36, 0.85], bright: [0.32, 0.72, 0.98], glow: 1, stars: 1, sunX: 0.8, sunY: 0.8, sunAmt: 0, sunWarm: 0,
    target: { deep: [0.12, 0.36, 0.85], bright: [0.32, 0.72, 0.98], glow: 1, stars: 1, sunX: 0.8, sunY: 0.8, sunAmt: 0, sunWarm: 0 },
  };
  const setSky = (s) => {
    sky.target = { deep: s.deep, bright: s.bright, glow: s.glow, stars: s.stars, sunX: s.sun.x, sunY: s.sun.y, sunAmt: s.sun.amount, sunWarm: s.sun.warm };
  };

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
    const ks = 1 - Math.exp(-dt * 0.6);
    for (const key of ["deep", "bright"]) sky[key] = sky[key].map((v, i) => v + (sky.target[key][i] - v) * ks);
    for (const key of ["glow", "stars", "sunX", "sunY", "sunAmt", "sunWarm"]) sky[key] += (sky.target[key] - sky[key]) * ks;

    ga.clear(ga.COLOR_BUFFER_BIT);
    ga.uniform1f(uTimeA, elapsed);
    ga.uniform1f(uAspect, auroraLayer.canvas.width / auroraLayer.canvas.height);
    ga.uniform2f(uPointer, pointer.x, pointer.y);
    ga.uniform1f(uPointerAmt, pointer.amt);
    ga.uniform3fv(uDeep, sky.deep);
    ga.uniform3fv(uBright, sky.bright);
    ga.uniform1f(uGlow, sky.glow);
    ga.uniform1f(uTimeSun, elapsed);
    ga.uniform2f(uSunPos, sky.sunX, sky.sunY);
    ga.uniform1f(uSunAmt, sky.sunAmt);
    ga.uniform1f(uSunWarm, sky.sunWarm);
    ga.drawArrays(ga.TRIANGLES, 0, 3);

    gm.clear(gm.COLOR_BUFFER_BIT);
    gm.uniform1f(uTimeM, elapsed);
    gm.uniform1f(uScale, MOTE_DPR);
    gm.uniform1f(uStars, Math.max(0.12, sky.stars)); // a few motes stay, as dust
    gm.drawArrays(gm.POINTS, 0, MOTES);

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

  const stop = () => {
    pause();
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("visibilitychange", sync);
    intersection.disconnect();
    resizeObserver.disconnect();
    ga.deleteBuffer(quad);
    gm.deleteBuffer(seedBuffer);
    for (const [gl, { program, shaders }] of [[ga, aurora], [gm, motes]]) {
      shaders.forEach((sh) => gl.deleteShader(sh));
      gl.deleteProgram(program);
    }
    for (const { gl, canvas } of [auroraLayer, moteLayer]) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    }
  };
  stop.setSky = setSky;
  return stop;
}
