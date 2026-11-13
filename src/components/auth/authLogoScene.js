import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Plane,
  Points,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO_PATH, LOGO_SIZE } from "./jcdLogoPath.js";

const FRAME_MS = 1000 / 30;
const [W, H] = LOGO_SIZE;
// Wing hinges, in logo pixels from the centre line (just outside the body).
const HINGE = 78;
const DEPTH = 56;
// The canvas is larger than the logo (see AuthLogo3D in Auth.vue) so the
// hop, the hover scale and the sparks have room; this is that ratio.
const FIT = 1.5;

// Front/back faces get UVs from the logo's own coordinates, so the PNG
// lands exactly on the shape; side walls use three's default mapping.
const uvGenerator = {
  generateTopUV(geometry, vertices, a, b, c) {
    return [a, b, c].map((i) => new Vector2(vertices[i * 3] / W, vertices[i * 3 + 1] / H));
  },
  generateSideWallUV(geometry, vertices, a, b, c, d) {
    const p = (i) => [vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]];
    const [pa, pb, pc, pd] = [p(a), p(b), p(c), p(d)];
    return Math.abs(pa[1] - pb[1]) < Math.abs(pa[0] - pb[0])
      ? [new Vector2(pa[0] / W, 1 - pa[2] / DEPTH), new Vector2(pb[0] / W, 1 - pb[2] / DEPTH), new Vector2(pc[0] / W, 1 - pc[2] / DEPTH), new Vector2(pd[0] / W, 1 - pd[2] / DEPTH)]
      : [new Vector2(pa[1] / H, 1 - pa[2] / DEPTH), new Vector2(pb[1] / H, 1 - pb[2] / DEPTH), new Vector2(pc[1] / H, 1 - pc[2] / DEPTH), new Vector2(pd[1] / H, 1 - pd[2] / DEPTH)];
  },
};

const buildGeometry = () => {
  // Flip y so the logo stands upright (SVG y grows downwards).
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1 0 0 -1 0 ${H})"><path fill-rule="evenodd" d="${LOGO_PATH}"/></g></svg>`;
  const shapes = new SVGLoader().parse(svg).paths.flatMap((path) => path.toShapes());
  const geometry = new ExtrudeGeometry(shapes, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 7,
    bevelSize: 5,
    bevelSegments: 3,
    curveSegments: 10,
    UVGenerator: uvGenerator,
  });
  geometry.translate(-W / 2, -H / 2, -DEPTH / 2);
  geometry.computeVertexNormals();
  return geometry;
};

// The PNG, recoloured for a dark panel: navy → near-white, blue kept.
const loadFaceTexture = () =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      const light = [236, 242, 255];
      for (let i = 0; i < px.length; i += 4) {
        const blue = Math.min(1, Math.max(0, ((px[i + 2] - px[i]) / 255) * 2.4 - 0.45));
        for (let k = 0; k < 3; k++) px[i + k] = Math.round(light[k] * (1 - blue) + Math.min(255, px[i + k] * 1.12) * blue);
        px[i + 3] = 255; // edges are cut by the geometry, not the texture
      }
      ctx.putImageData(data, 0, 0);
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = 4;
      resolve(texture);
    };
    img.onerror = reject;
    img.src = "/images/jcd-only-color.png";
  });

export async function start(host, onReady) {
  const [geometry, faceTexture] = [buildGeometry(), await loadFaceTexture()];

  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  // Full device resolution in the box (sharp logo and sparks on Retina);
  // the full-screen flight is capped lower to stay light.
  const BOX_DPR = Math.min(window.devicePixelRatio || 1, 2);
  const FLIGHT_DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(BOX_DPR);
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 10, 10000);
  camera.position.set(0, 0, 2600);

  scene.add(new AmbientLight(0xdfe8ff, 0.9));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(-700, 900, 1400);
  scene.add(key);
  const rim = new DirectionalLight(0x4f8cff, 2.4);
  rim.position.set(900, -300, -900);
  scene.add(rim);

  // A little self-light from the same texture keeps the logo's own white
  // and blue vivid whichever way the face turns.
  const face = new MeshStandardMaterial({ map: faceTexture, emissive: 0xffffff, emissiveMap: faceTexture, emissiveIntensity: 0.32, roughness: 0.38, metalness: 0.08 });
  const edge = new MeshStandardMaterial({ color: 0xb9cbf2, roughness: 0.28, metalness: 0.55 });

  // Three pieces of the same geometry, cut by clipping planes: the body
  // between the hinges, and one wing on each side (pivoting at its hinge).
  const logo = new Group();
  scene.add(logo);
  const piece = (planes) => {
    const materials = [face, edge].map((m) => {
      const c = m.clone();
      c.clippingPlanes = planes;
      // The cut at a hinge opens the solid while the wing turns; drawing
      // the inside faces too keeps that seam filled instead of see-through.
      c.side = DoubleSide;
      return c;
    });
    faceMaterials.push(materials[0]);
    return new Mesh(geometry, materials);
  };
  const faceMaterials = [];
  const localPlanes = {
    body: [new Plane(new Vector3(1, 0, 0), HINGE), new Plane(new Vector3(-1, 0, 0), HINGE)],
    left: [new Plane(new Vector3(-1, 0, 0), -HINGE)],
    right: [new Plane(new Vector3(1, 0, 0), -HINGE)],
  };
  const worldPlanes = Object.fromEntries(Object.entries(localPlanes).map(([k, list]) => [k, list.map((p) => p.clone())]));

  const body = piece(worldPlanes.body);
  logo.add(body);
  const wing = (side) => {
    const pivot = new Group();
    pivot.position.x = side * HINGE;
    const mesh = piece(worldPlanes[side < 0 ? "left" : "right"]);
    mesh.position.x = -side * HINGE;
    pivot.add(mesh);
    logo.add(pivot);
    return { pivot, mesh };
  };
  const leftWing = wing(-1);
  const rightWing = wing(1);

  const syncPlanes = () => {
    logo.updateMatrixWorld(true);
    const apply = (key, mesh) => worldPlanes[key].forEach((p, i) => p.copy(localPlanes[key][i]).applyMatrix4(mesh.matrixWorld));
    apply("body", body);
    apply("left", leftWing.mesh);
    apply("right", rightWing.mesh);
  };

  let ppu = 1;
  // Near/far follow the camera distance (it backs off a lot for the
  // full-screen flight; a fixed far plane would cut the logo off).
  const fitDepth = () => {
    camera.near = camera.position.z * 0.05;
    camera.far = camera.position.z * 4;
  };
  let updateSparkScale = () => {}; // set once the spark material exists
  const boxResize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit the logo (with room for the flap, hop and sparks) into the box.
    const fit = Math.max(W / camera.aspect, H) * FIT;
    camera.position.z = fit / 2 / Math.tan((camera.fov * Math.PI) / 360);
    fitDepth();
    camera.updateProjectionMatrix();
    ppu = h / fit;
    updateSparkScale();
  };
  const overlayResize = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.position.z = vh / ppu / 2 / Math.tan((camera.fov * Math.PI) / 360);
    fitDepth();
    camera.updateProjectionMatrix();
    updateSparkScale();
  };
  let flight = null;
  const resize = () => (flight ? overlayResize() : boxResize());
  boxResize();
  const ro = new ResizeObserver(() => !flight && boxResize());
  ro.observe(host);
  window.addEventListener("resize", resize);

  let visible = true;
  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting || !!flight));
  io.observe(host);

  // ---- Sparks: one pool for click bursts and the wing trails ----
  const POOL = 700;
  const sparkPos = new Float32Array(POOL * 3);
  const sparkVel = new Float32Array(POOL * 3);
  const sparkBase = new Float32Array(POOL * 3);
  const sparkCol = new Float32Array(POOL * 3);
  const sparkAlpha = new Float32Array(POOL);
  const sparkAge = new Float32Array(POOL).fill(1);
  const sparkLife = new Float32Array(POOL).fill(1);
  let nextSpark = 0;
  let liveSparks = 0;
  const sparkGeo = new BufferGeometry();
  sparkGeo.setAttribute("position", new BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new BufferAttribute(sparkCol, 3));
  sparkGeo.setAttribute("alpha", new BufferAttribute(sparkAlpha, 1));
  const sparkMat = new ShaderMaterial({
    uniforms: { uSize: { value: 140 }, uScale: { value: 1 } },
    vertexShader: `
      attribute vec3 color;
      attribute float alpha;
      uniform float uSize;
      uniform float uScale;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        // Crisp: a solid core with a tight edge and only a faint, narrow halo.
        float core = 1.0 - smoothstep(0.30, 0.38, d);
        float halo = (1.0 - smoothstep(0.38, 0.70, d)) * 0.22;
        float a = max(core, halo) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.6), a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  updateSparkScale = () => (sparkMat.uniforms.uScale.value = renderer.domElement.height / 2);
  updateSparkScale();
  const sparks = new Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  const emit = (x, y, z, vx, vy, vz, life) => {
    const i = nextSpark;
    nextSpark = (nextSpark + 1) % POOL;
    sparkPos.set([x, y, z], i * 3);
    sparkVel.set([vx, vy, vz], i * 3);
    sparkBase.set(Math.random() < 0.6 ? [0.25, 0.62, 1.0] : [0.92, 0.95, 1.0], i * 3);
    sparkAge[i] = 0;
    sparkLife[i] = life;
    liveSparks = POOL;
  };
  const burst = (cx = logo.position.x, cy = logo.position.y) => {
    for (let k = 0; k < 140; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = 120 + Math.random() * 260;
      const speed = 500 + Math.random() * 900;
      emit(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.5, 60, Math.cos(a) * speed, Math.sin(a) * speed * 0.8 + 250, (Math.random() - 0.3) * 600, 1.1 + Math.random() * 0.4);
    }
  };
  const updateSparks = (dt) => {
    if (!liveSparks) return;
    let alive = 0;
    for (let i = 0; i < POOL; i++) {
      const j = i * 3;
      if (sparkAge[i] >= sparkLife[i]) {
        sparkAlpha[i] = 0;
        continue;
      }
      alive++;
      sparkAge[i] += dt;
      sparkVel[j + 1] -= 900 * dt; // a little gravity
      sparkVel[j] *= 1 - dt * 0.9;
      sparkPos[j] += sparkVel[j] * dt;
      sparkPos[j + 1] += sparkVel[j + 1] * dt;
      sparkPos[j + 2] += sparkVel[j + 2] * dt;
      sparkAlpha[i] = Math.max(0, 1 - sparkAge[i] / sparkLife[i]) ** 1.5;
      sparkCol[j] = sparkBase[j];
      sparkCol[j + 1] = sparkBase[j + 1];
      sparkCol[j + 2] = sparkBase[j + 2];
    }
    liveSparks = alive;
    sparkGeo.attributes.position.needsUpdate = true;
    sparkGeo.attributes.color.needsUpdate = true;
    sparkGeo.attributes.alpha.needsUpdate = true;
  };

  const WISPS = 70;
  const SEG = 10; // points per wisp = frames of path history
  const wispPts = new Float32Array(WISPS * SEG * 3);
  const wispDrift = new Float32Array(WISPS * 3); // slow drift, back along the motion
  const wispSeed = new Float32Array(WISPS);
  const wispAge = new Float32Array(WISPS).fill(1);
  const wispLife = new Float32Array(WISPS).fill(1);
  // The path is drawn as a smooth curve through those points (Catmull-Rom),
  // RES samples long, so it bends without corners.
  const RES = 24;
  const windPos = new Float32Array(WISPS * RES * 2 * 3);
  const windUv = new Float32Array(WISPS * RES * 2 * 2);
  const windAlpha = new Float32Array(WISPS * RES * 2);
  const windIndex = [];
  for (let w = 0; w < WISPS; w++) {
    for (let i = 0; i < RES; i++) {
      const v = (w * RES + i) * 2;
      windUv.set([i / (RES - 1), -1, i / (RES - 1), 1], v * 2); // x: head 0 -> tail 1
      if (i < RES - 1) windIndex.push(v, v + 1, v + 2, v + 2, v + 1, v + 3);
    }
  }
  const curve = new Float32Array(RES * 3); // scratch: one wisp's smoothed path
  let nextWisp = 0;
  let liveWind = 0;
  const windGeo = new BufferGeometry();
  windGeo.setAttribute("position", new BufferAttribute(windPos, 3));
  windGeo.setAttribute("aUv", new BufferAttribute(windUv, 2));
  windGeo.setAttribute("aAlpha", new BufferAttribute(windAlpha, 1));
  windGeo.setIndex(windIndex);
  const windMat = new ShaderMaterial({
    side: DoubleSide, // a ribbon faces either way depending on its direction
    vertexShader: `
      attribute vec2 aUv;
      attribute float aAlpha;
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        vUv = aUv;
        vAlpha = aAlpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vUv;
      varying float vAlpha;
      void main() {
        // A puff of air, not a line: a gaussian falloff across, and both
        // ends taper away (fullest a third of the way in).
        float across = exp(-vUv.y * vUv.y * 3.2);
        float along = smoothstep(0.0, 0.32, vUv.x) * pow(1.0 - vUv.x, 1.4);
        float a = vAlpha * across * along * 1.9;
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(vec3(0.74, 0.86, 1.0), vec3(1.0), 0.5 * (1.0 - vUv.x)), a);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const wind = new Mesh(windGeo, windMat);
  wind.frustumCulled = false;
  scene.add(wind);

  // Outline points (logo space) and their recent world positions.
  const TRACK = 10;
  const trackLocal = Array.from({ length: TRACK }, (_, i) => {
    const a = (i / TRACK) * Math.PI * 2;
    return new Vector3(Math.cos(a) * W * 0.46, Math.sin(a) * H * 0.42, 0);
  });
  const trackHist = new Float32Array(TRACK * SEG * 3); // newest first
  let histFilled = 0; // frames of history available (0 after a reset)
  const now3 = new Vector3();
  const WIND_MIN_SPEED = 420; // units/s
  const resetWind = () => (histFilled = 0);

  const shedWisp = (t, speed) => {
    const w = nextWisp;
    nextWisp = (nextWisp + 1) % WISPS;
    // Scatter the copy sideways a little so wisps don't stack on one line.
    const h0 = t * SEG * 3;
    const hx = trackHist[h0] - trackHist[h0 + 3];
    const hy = trackHist[h0 + 1] - trackHist[h0 + 4];
    const hl = Math.hypot(hx, hy) || 1;
    const off = (Math.random() - 0.5) * W * 0.07;
    const ox = (-hy / hl) * off;
    const oy = (hx / hl) * off;
    // Only as much path as the speed earns (slow edges, short wisps).
    const maxLen = Math.min(W * 0.55, Math.max(W * 0.1, speed * 0.16));
    let len = 0;
    let lx = trackHist[h0];
    let ly = trackHist[h0 + 1];
    let lz = trackHist[h0 + 2];
    for (let i = 0; i < SEG; i++) {
      const src = h0 + Math.min(i, histFilled - 1) * 3;
      let x = trackHist[src];
      let y = trackHist[src + 1];
      let z = trackHist[src + 2];
      const step = Math.hypot(x - lx, y - ly, z - lz);
      if (len + step > maxLen && step > 0) {
        const keep = Math.max(0, (maxLen - len) / step);
        x = lx + (x - lx) * keep;
        y = ly + (y - ly) * keep;
        z = lz + (z - lz) * keep;
      } else len += step;
      wispPts.set([x + ox, y + oy, z], (w * SEG + i) * 3);
      lx = x;
      ly = y;
      lz = z;
    }
    // Drift back along the motion, slowly, with a little lift.
    const k = 0.35 / Math.max(1, hl);
    wispDrift.set([-hx * k * 30, -hy * k * 30 + 14, 0], w * 3);
    wispSeed[w] = Math.random() * 100;
    wispAge[w] = 0;
    wispLife[w] = 0.8 + Math.random() * 0.35;
    liveWind = WISPS;
  };

  // `active`: a manoeuvre, click spin or flight is under way.
  const sampleWind = (dt, active) => {
    logo.updateMatrixWorld(true);
    for (let t = 0; t < TRACK; t++) {
      now3.copy(trackLocal[t]).applyMatrix4(logo.matrixWorld);
      const h0 = t * SEG * 3;
      const speed = histFilled ? Math.hypot(now3.x - trackHist[h0], now3.y - trackHist[h0 + 1], now3.z - trackHist[h0 + 2]) / dt : 0;
      trackHist.copyWithin(h0 + 3, h0, h0 + (SEG - 1) * 3); // shift history back
      trackHist.set([now3.x, now3.y, now3.z], h0);
      if (!active || histFilled < 3 || speed < WIND_MIN_SPEED) continue;
      const chance = Math.min(0.38, (speed - WIND_MIN_SPEED) / 2400) * (flight ? 0.4 : 1);
      if (Math.random() < chance) shedWisp(t, speed);
    }
    histFilled = Math.min(SEG, histFilled + 1);
  };

  const catmull = (p0, p1, p2, p3, t) => {
    const t2 = t * t;
    return 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t2 * t);
  };
  const updateWind = (dt) => {
    if (!liveWind) return;
    let alive = 0;
    const w0 = 2.2 / ppu; // a fine ~2 CSS px band (feathered in the shader)
    for (let w = 0; w < WISPS; w++) {
      const v0 = w * RES * 2;
      if (wispAge[w] >= wispLife[w]) {
        windAlpha.fill(0, v0, v0 + RES * 2);
        continue;
      }
      alive++;
      wispAge[w] += dt;
      const k = Math.min(1, wispAge[w] / wispLife[w]);
      // Breathes in gently, lingers, then thins away.
      const alpha = 0.3 * smooth(0, 0.28, k) * (1 - smooth(0.35, 1, k));
      const width = w0 * (0.8 + 0.8 * smooth(0, 1, k)); // spreads a little as it dissolves
      const slow = Math.exp(-wispAge[w] * 1.6); // drift eases off
      const dx = wispDrift[w * 3] * slow * dt;
      const dy = wispDrift[w * 3 + 1] * slow * dt;
      const seed = wispSeed[w];
      const base = w * SEG * 3;
      for (let i = 0; i < SEG; i++) {
        wispPts[base + i * 3] += dx;
        wispPts[base + i * 3 + 1] += dy;
      }
      // Smooth curve through the control points.
      for (let i = 0; i < RES; i++) {
        const u = (i / (RES - 1)) * (SEG - 1);
        const j = Math.min(SEG - 2, Math.floor(u));
        const t = u - j;
        const i0 = base + Math.max(0, j - 1) * 3;
        const i1 = base + j * 3;
        const i2 = base + (j + 1) * 3;
        const i3 = base + Math.min(SEG - 1, j + 2) * 3;
        for (let c = 0; c < 3; c++) curve[i * 3 + c] = catmull(wispPts[i0 + c], wispPts[i1 + c], wispPts[i2 + c], wispPts[i3 + c], t);
      }
      for (let i = 0; i < RES; i++) {
        const along = i / (RES - 1);
        const a = Math.max(0, i - 1) * 3;
        const b = Math.min(RES - 1, i + 1) * 3;
        let tx = curve[b] - curve[a];
        let ty = curve[b + 1] - curve[a + 1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        // A slow, long sway that grows as the air loses its shape.
        const wave = Math.sin(seed + along * 4.2 + wispAge[w] * 3.2) * W * 0.016 * smooth(0, 1, k) * (0.25 + along);
        const cx = curve[i * 3] - ty * wave;
        const cy = curve[i * 3 + 1] + tx * wave;
        const ww = width * (1 - 0.5 * along);
        windPos.set([cx + ty * ww, cy - tx * ww, curve[i * 3 + 2], cx - ty * ww, cy + tx * ww, curve[i * 3 + 2]], (v0 + i * 2) * 3);
      }
      windAlpha.fill(alpha, v0, v0 + RES * 2);
    }
    liveWind = alive;
    windGeo.attributes.position.needsUpdate = true;
    windGeo.attributes.aAlpha.needsUpdate = true;
  };
  // Box <-> full-screen switch: wisps still in the air move with the
  // coordinate change so they don't jump; the path history starts over.
  const shiftWind = (x, y) => {
    for (let i = 0; i < WISPS * SEG; i++) {
      wispPts[i * 3] += x;
      wispPts[i * 3 + 1] += y;
    }
    resetWind();
  };

  const FLIGHT_S = 8;
  const LANDING_S = 2.2;
  const canvas = renderer.domElement;
  const startFlight = () => {
    const r = host.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    flight = {
      t: 0,
      home: { x: (r.left + r.width / 2 - vw / 2) / ppu, y: -(r.top + r.height / 2 - vh / 2) / ppu },
      last: null,
      seed: Math.random() * Math.PI * 2,
      heading: 0,
      roll: 0,
      land: null,
    };
    hovering = false;
    pointerIn = false;
    shiftWind(flight.home.x, flight.home.y);
    canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:40;pointer-events:none;display:block";
    document.body.appendChild(canvas);
    renderer.setPixelRatio(FLIGHT_DPR);
    overlayResize();
  };
  const endFlight = () => {
    const home = flight.home;
    flight = null;
    host.appendChild(canvas);
    canvas.style.cssText = "display:block;width:100%;height:100%";
    logo.position.set(0, logo.position.y - home.y, 0);
    shiftWind(-home.x, -home.y);
    logo.rotation.order = "XYZ";
    logo.rotation.z = 0;
    renderer.setPixelRatio(BOX_DPR);
    boxResize();
  };
  const tipLeft = new Vector3();
  const tipRight = new Vector3();
  const smooth = (a, b, x) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };

  // ---- Pointer ----
  const raycaster = new Raycaster();
  const ndc = new Vector2(9, 9);
  let pointerIn = false;
  let hovering = false;
  const hitArea = new Mesh(new CircleGeometry(1, 40), new MeshBasicMaterial({ side: DoubleSide }));
  hitArea.scale.set(W * 0.44, H * 0.46, 1);
  hitArea.visible = false;
  logo.add(hitArea);
  const pieces = [hitArea];
  const updatePointer = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const hitLogo = () => {
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(pieces, false).length > 0;
  };
  const onMove = (e) => {
    if (flight) return;
    pointerIn = true;
    updatePointer(e);
    hovering = hitLogo();
    canvas.style.cursor = hovering ? "pointer" : "";
  };
  const onLeave = () => {
    pointerIn = false;
    hovering = false;
    canvas.style.cursor = "";
  };
  let spinStart = -Infinity;
  let excite = 0;
  let clicks = [];
  const onDown = (e) => {
    if (flight) return;
    updatePointer(e);
    const now = e.timeStamp;
    if (clicks.length && now - clicks[clicks.length - 1].at > 650) clicks = [];
    // The first click spins the logo (edge-on for a moment), so quick
    // follow-up clicks close to it still count even when they miss the shape.
    const near = clicks.some((c) => Math.hypot(e.clientX - c.x, e.clientY - c.y) < 80);
    if (!hitLogo() && !near) return;
    clicks.push({ at: now, x: e.clientX, y: e.clientY });
    if (clicks.length >= 3) {
      clicks = [];
      startFlight();
      return;
    }
    excite = 1;
    spinStart = clock;
    burst();
  };
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointerdown", onDown);

  // ---- Idle manoeuvre ----
  const IDLE_S = 20;
  const MANEUVERS = { dart: 1.5, salto: 1.6, startle: 1.35 }; // name -> seconds
  let idleSince = 0; // animation clock at the last activity
  let nextIdleAt = IDLE_S;
  let maneuver = null; // { kind, start, dir }
  let lastKind = null;
  const ACTIVITY = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"];
  const onActivity = () => {
    idleSince = clock;
    nextIdleAt = IDLE_S;
    // Someone's back: let a manoeuvre in progress wrap up quicker, by easing
    // its tempo up rather than cutting it off.
    if (maneuver) maneuver.rush = true;
  };
  ACTIVITY.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
  const startManeuver = () => {
    const kinds = Object.keys(MANEUVERS).filter((k) => k !== lastKind);
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    lastKind = kind;
    maneuver = { kind, p: 0, rate: 1, rush: false, dir: Math.random() < 0.5 ? -1 : 1 };
    host.dataset.maneuver = kind; // lets tests (and devtools) see it happen
    excite = 1; // a sudden burst of wing beats
    burst();
  };
  const easeOutBack = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
  // Offsets added on top of the resting pose, p = 0..1 through the manoeuvre.
  const maneuverPose = ({ kind, dir }, p) => {
    if (kind === "dart") {
      // Shoot out to one side, banked into it, then spring back past home.
      const env = p < 0.18 ? easeOutCubic(p / 0.18) : 1 - easeOutBack((p - 0.18) / 0.82);
      return { x: dir * W * 0.15 * env, y: H * 0.05 * Math.sin(Math.PI * Math.min(1, p / 0.6)), rx: 0, ry: dir * 0.35 * env, rz: -dir * 0.55 * env };
    }
    if (kind === "salto") {
      // A crouch, a jump and a quick backflip, landing with a small bounce.
      const crouch = p < 0.12 ? -Math.sin((Math.PI * p) / 0.12) * H * 0.04 : 0;
      const air = p >= 0.12 && p < 0.86 ? Math.sin((Math.PI * (p - 0.12)) / 0.74) * H * 0.18 : 0;
      const bounce = p >= 0.86 ? Math.sin((Math.PI * (p - 0.86)) / 0.14) ** 2 * H * 0.02 : 0; // eases to rest
      const flip = p >= 0.12 && p < 0.86 ? -Math.PI * 2 * easeInOut((p - 0.12) / 0.74) : 0;
      return { x: 0, y: crouch + air + bounce, rx: flip, ry: 0, rz: 0 };
    }
    // startle: two sharp zig-zags while it whips round once.
    const fade = 1 - easeInOut(p);
    return { x: dir * W * 0.1 * Math.sin(p * Math.PI * 3) * fade, y: H * 0.03 * Math.sin(p * Math.PI * 6) * fade, rx: 0, ry: dir * Math.PI * 2 * easeOutCubic(p), rz: 0.3 * Math.sin(p * Math.PI * 3) * fade };
  };

  // ---- Loop ----
  let raf = 0;
  let last = 0;
  let ready = false;
  let clock = 0; // seconds of animated time (stands still while paused)
  let phase = 0;
  let hoverAmt = 0;
  let hoverV = 0;
  let tiltX = 0;
  let tiltY = 0;
  let tiltVX = 0;
  let tiltVY = 0;
  // Critically damped spring: starts and stops without a jolt (an exponential
  // ease jumps to full speed the moment the target moves).
  const SPRING_K = 28;
  const spring = (x, v, target, dt) => {
    const a = SPRING_K * (target - x) - 2 * Math.sqrt(SPRING_K) * v;
    const nv = v + a * dt;
    return [x + nv * dt, nv];
  };
  const ease = (from, to, dt, rate) => from + (to - from) * (1 - Math.exp(-dt * rate));
  const easeOutCubic = (p) => 1 - (1 - p) ** 3;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.visibilityState === "hidden" || now - last < FRAME_MS) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : FRAME_MS / 1000;
    last = now;
    clock += dt;
    const t = clock;

    for (let s = 0, n = Math.ceil(dt / 0.02); s < n; s++) [hoverAmt, hoverV] = spring(hoverAmt, hoverV, hovering ? 1 : 0, dt / n);
    excite *= Math.exp(-dt * 1.4);
    // Toward the pointer, and back to rest when it leaves, on a spring.
    // Sub-stepped so a slow frame can't make it overshoot.
    for (let s = 0, n = Math.ceil(dt / 0.02); s < n; s++) {
      [tiltY, tiltVY] = spring(tiltY, tiltVY, pointerIn ? ndc.x * 0.35 : 0, dt / n);
      [tiltX, tiltVX] = spring(tiltX, tiltVX, pointerIn ? -ndc.y * 0.22 : 0, dt / n);
    }

    // Flight progress: 0 at home, 1 out flying around the screen.
    let fly = 0;
    let flash = 0;
    if (flight) {
      flight.t += dt;
      const ft = flight.t;
      fly = smooth(0.55, 1.5, ft) * (1 - smooth(FLIGHT_S - 0.45, FLIGHT_S, ft));
      // White glow: builds up before take-off, settles while flying,
      // fades out on landing.
      flash = smooth(0, 0.55, ft) * 1.5 - smooth(0.6, 1.8, ft) * 0.9 - smooth(FLIGHT_S - 1.2, FLIGHT_S, ft) * 0.6;
    }

    const glide = Math.max(fly * smooth(0.55, 0.9, Math.sin(t * 0.9 + 1.3)), flight ? fly * smooth(FLIGHT_S - 1.0, FLIGHT_S - 0.5, flight.t) : 0);
    phase += dt * (2.1 * (1 + 0.7 * hoverAmt + 2.4 * excite) * (1 - fly) + 15.5 * fly * (1 - 0.75 * glide));
    const beat = Math.sin(phase);
    const restFlap = (0.34 + 0.1 * hoverAmt + 0.2 * excite) * (beat > 0 ? beat : beat * 0.55);
    const flyFlap = (0.55 + 0.55 * beat) * (1 - glide) + (0.45 + 0.08 * beat) * glide;
    const flap = restFlap * (1 - fly) + flyFlap * fly;
    leftWing.pivot.rotation.y = flap;
    rightWing.pivot.rotation.y = -flap;

    // Click: one full turn and a small hop.
    const sp = Math.min(1, (t - spinStart) / 1.2);
    const spin = sp < 1 ? Math.PI * 2 * easeOutCubic(sp) : 0;
    const hop = sp < 1 ? Math.sin(Math.PI * sp) * 110 : 0;
    const bob = 22 * Math.sin(t * 1.05) + hop;

    if (flight) {
      const halfW = window.innerWidth / ppu / 2;
      const halfH = window.innerHeight / ppu / 2;
      const ft = flight.t;
      const landStart = FLIGHT_S - LANDING_S;
      let px;
      let py;
      if (ft < landStart) {
        // Wander: a few slow, out-of-step waves (different every flight),
        // blended in from the logo's place on take-off.
        const wt = Math.max(0, ft - 0.55);
        const s = flight.seed;
        const wx = halfW * 0.74 * (0.68 * Math.sin(0.85 * wt + s) + 0.32 * Math.sin(1.9 * wt + 2 * s));
        const wy = halfH * 0.62 * (0.65 * Math.sin(1.1 * wt + 0.7 + 1.3 * s) + 0.35 * Math.sin(2.3 * wt + 0.5 * s));
        px = flight.home.x + (wx - flight.home.x) * fly;
        py = flight.home.y + bob * (1 - fly) + (wy - flight.home.y) * fly;
      } else {
        // Landing: curve down to below its place, then rise straight up into
        // it (a quadratic curve whose control point sits under home).
        flight.land ??= { x: flight.last.x, y: flight.last.y };
        const k = Math.min(1, (ft - landStart) / LANDING_S);
        const p = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // ease in-out
        const cx = flight.home.x;
        const cy = Math.max(-halfH * 0.85, flight.home.y - halfH * 0.95);
        // Ends exactly where the resting logo would be (its gentle bob
        // included), so handing back to the box is seamless.
        const hy = flight.home.y + bob;
        px = (1 - p) ** 2 * flight.land.x + 2 * (1 - p) * p * cx + p * p * flight.home.x;
        py = (1 - p) ** 2 * flight.land.y + 2 * (1 - p) * p * cy + p * p * hy;
      }
      const vx = flight.last ? (px - flight.last.x) / dt : 0;
      const vy = flight.last ? (py - flight.last.y) / dt : 0;
      flight.last = { x: px, y: py };

      // Head into the direction of travel, turning gradually; bank (roll
      // toward the inside of the turn) by how fast it is turning.
      const speed = Math.hypot(vx, vy);
      const before = flight.heading;
      if (speed > 80) {
        const target = Math.atan2(vy, vx) - Math.PI / 2;
        const d = Math.atan2(Math.sin(target - flight.heading), Math.cos(target - flight.heading));
        const next = flight.heading + d * (1 - Math.exp(-dt * 3));
        flight.heading = Math.atan2(Math.sin(next), Math.cos(next));
      }
      const turnRate = Math.atan2(Math.sin(flight.heading - before), Math.cos(flight.heading - before)) / dt;
      flight.roll = ease(flight.roll, Math.max(-0.75, Math.min(0.75, -turnRate * 0.5)), dt, 5);

      // Flutter: the body lifts on every downstroke and zig-zags a little
      // sideways, stroke by stroke.
      const flutter = 30 * fly * (1 - glide) * Math.sin(phase + Math.PI / 2);
      const zig = 24 * fly * (1 - glide) * Math.sin(phase * 0.5);
      const nx = speed > 1 ? -vy / speed : 0;
      const ny = speed > 1 ? vx / speed : 0;
      logo.position.set(px + nx * zig, py + flutter + ny * zig, 0);

      logo.rotation.order = "ZXY";
      logo.rotation.set(
        (-0.12 + 0.06 * Math.sin(t * 0.47)) * (1 - fly) + (-0.28 + 0.08 * Math.sin(phase)) * fly, // nods with the strokes
        (0.32 * Math.sin(t * 0.33) + spin) * (1 - fly) + (flight.roll + 0.1 * Math.sin(phase * 0.5)) * fly,
        flight.heading * fly
      );
      logo.scale.setScalar(1 - 0.24 * fly);
      const trail = fly * (1 - smooth(landStart + 0.2, FLIGHT_S - 1.6, ft));
      if (trail > 0.02) {
        leftWing.mesh.localToWorld(tipLeft.set(-W * 0.4, H * 0.18, 0));
        rightWing.mesh.localToWorld(tipRight.set(W * 0.4, H * 0.18, 0));
        for (const tip of [tipLeft, tipRight]) {
          for (let k = 0; k < 3; k++) {
            if (Math.random() > trail) continue;
            emit(tip.x, tip.y, tip.z, -vx * 0.15 + (Math.random() - 0.5) * 300, -vy * 0.15 + (Math.random() - 0.5) * 300 + 120, (Math.random() - 0.5) * 300, 0.9 + Math.random() * 0.6);
          }
        }
      }
      if (flight.t >= FLIGHT_S && (liveSparks === 0 || flight.t >= FLIGHT_S + 1)) endFlight();
    } else {
      // Idle long enough (and not busy with a click spin): a sudden manoeuvre.
      if (!maneuver && sp >= 1 && t - idleSince >= nextIdleAt) {
        startManeuver();
        nextIdleAt = t - idleSince + 16 + Math.random() * 8; // again in ~20 s if still idle
      }
      let m = { x: 0, y: 0, rx: 0, ry: 0, rz: 0 };
      if (maneuver) {
        maneuver.rate = ease(maneuver.rate, maneuver.rush ? 2.2 : 1, dt, 5);
        maneuver.p += (dt / MANEUVERS[maneuver.kind]) * maneuver.rate;
        const mp = maneuver.p;
        if (mp >= 1) {
          maneuver = null;
          delete host.dataset.maneuver;
        }
        else m = maneuverPose(maneuver, mp);
      }
      logo.rotation.y = 0.32 * Math.sin(t * 0.33) * (1 - hoverAmt * 0.6) + tiltY + spin + m.ry;
      logo.rotation.x = -0.12 + 0.06 * Math.sin(t * 0.47) + tiltX + m.rx;
      logo.rotation.z = m.rz;
      logo.position.x = m.x;
      logo.position.y = bob + m.y;
      logo.scale.setScalar(1 + 0.05 * hoverAmt + 0.06 * excite);
    }
    const glow = 0.32 + 0.18 * hoverAmt + 0.35 * excite + Math.max(0, flash);
    faceMaterials.forEach((m) => (m.emissiveIntensity = glow));

    // Wind only from real moves; tilting toward the pointer stays calm.
    sampleWind(dt, !!flight || !!maneuver || sp < 1);
    updateWind(dt);
    updateSparks(dt);
    syncPlanes();
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      onReady?.();
    }
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("pointerdown", onDown);
    ACTIVITY.forEach((type) => window.removeEventListener(type, onActivity));
    window.removeEventListener("resize", resize);
    sparkGeo.dispose();
    sparkMat.dispose();
    windGeo.dispose();
    windMat.dispose();
    hitArea.geometry.dispose();
    hitArea.material.dispose();
    ro.disconnect();
    io.disconnect();
    geometry.dispose();
    faceTexture.dispose();
    // Pieces carry [face, edge] materials, the hit area a single one.
    logo.traverse((o) => o.isMesh && [].concat(o.material).forEach((m) => m.dispose()));
    face.dispose();
    edge.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
