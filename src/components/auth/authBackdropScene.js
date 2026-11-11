// Login backdrop: a slowly rolling field of dots in the brand blues.
// Plain WebGL (no library): one point buffer, a tiny shader, at most
// 30 fps, pixel ratio capped at 1.5, paused while the tab is hidden or the
// panel is off screen. Loaded on demand from AuthBackdrop.vue.

const FRAME_MS = 1000 / 30;

const VERTEX = `
attribute vec3 aPosition;
uniform mat4 uProjection;
uniform mat4 uView;
uniform float uTime;
uniform float uScale;
varying float vHeight;
varying float vDepth;
void main() {
  vec3 p = aPosition;
  float h = sin(p.x * 0.55 + uTime * 0.55) * 0.32 + cos(p.z * 0.75 + uTime * 0.4) * 0.28;
  p.y += h;
  vHeight = h;
  vec4 mv = uView * vec4(p, 1.0);
  vDepth = -mv.z;
  gl_Position = uProjection * mv;
  gl_PointSize = 2.4 * uScale * (6.0 / vDepth);
}`;

const FRAGMENT = `
precision mediump float;
uniform vec3 uLow;
uniform vec3 uHigh;
varying float vHeight;
varying float vDepth;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  if (dot(c, c) > 0.25) discard;
  float t = clamp(vHeight * 1.25 + 0.5, 0.0, 1.0);
  float fade = 1.0 - smoothstep(7.0, 15.0, vDepth);
  gl_FragColor = vec4(mix(uLow, uHigh, t), (0.28 + 0.5 * t) * fade);
}`;

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// Column-major 4x4 matrices (what WebGL expects).
const perspective = (fovDeg, aspect, near, far) => {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
};
const lookAt = (eye, target) => {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const norm = (v) => {
    const l = Math.hypot(...v) || 1;
    return v.map((x) => x / l);
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const z = norm(sub(eye, target));
  const x = norm(cross([0, 1, 0], z));
  const y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
};

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
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "link");
  gl.useProgram(program);

  // A grid of points on the floor plane; the shader lifts them in waves.
  const cols = 120;
  const rows = 64;
  const positions = new Float32Array(cols * rows * 3);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions[i++] = (c / (cols - 1) - 0.5) * 18;
      positions[i++] = 0;
      positions[i++] = (r / (rows - 1) - 0.5) * 11;
    }
  }
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  const uProjection = u("uProjection");
  const uTime = u("uTime");
  const uScale = u("uScale");
  gl.uniformMatrix4fv(u("uView"), false, lookAt([0, 3.4, 8], [0, -0.4, 0]));
  gl.uniform3fv(u("uLow"), hex("#1F5BD8"));
  gl.uniform3fv(u("uHigh"), hex("#A9C2F5"));

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  gl.uniform1f(uScale, dpr);
  const resize = () => {
    const w = Math.max(1, Math.round((host.clientWidth || 1) * dpr));
    const h = Math.max(1, Math.round((host.clientHeight || 1) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniformMatrix4fv(uProjection, false, perspective(42, w / h, 0.1, 100));
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();

  const count = cols * rows;
  let raf = 0;
  let last = 0;
  let elapsed = 0;
  let running = false;
  let ready = false;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    elapsed += Math.min(dt, 100) / 1000;
    gl.uniform1f(uTime, elapsed);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
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
    document.removeEventListener("visibilitychange", sync);
    intersection.disconnect();
    resizeObserver.disconnect();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    canvas.remove();
  };
}
