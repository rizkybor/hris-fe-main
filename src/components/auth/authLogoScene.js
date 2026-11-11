// Login panel: the Jendela Cakra Digital butterfly in 3D (three.js).
// The traced silhouette (jcdLogoPath.js) is extruded; the front face shows
// the logo's own colours from the PNG (navy lifted to near-white so it reads
// on the navy panel, the blue wing tips kept), the edges are a soft metal.
// Body stays put while the two wings flap on their hinges; the whole logo
// floats and turns slowly. At most 30 fps, pixel ratio capped at 1.5,
// paused while the tab is hidden or the panel is off screen. Loaded on
// demand from AuthLogo3D.vue.
//
// Interaction: hovering the logo speeds up and widens the wing beat, lifts
// the glow, scales it up a touch and tilts it toward the pointer; a click
// or tap makes it hop and spin once with a quick burst of wing beats and a
// spray of blue/white sparks. Three quick clicks: it glows white, takes off
// and flutters around the whole screen like a butterfly for a few seconds with
// sparks trailing from its wings, then lands back in place.
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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

  // ---- Sizing: in its box, or full screen while flying ----
  // pixels per world unit at the logo's depth, so leaving the box for the
  // full-screen overlay keeps the logo exactly where and how big it was.
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
  // Crisp sparks drawn in the shader: a solid, white-hot core with a thin
  // coloured halo (a soft texture made them look blurred). Each spark fades
  // through its own alpha, not by darkening its colour, which would leave
  // dark dots on a transparent canvas over a light page.
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
        float core = 1.0 - smoothstep(0.18, 0.34, d);
        float halo = (1.0 - smoothstep(0.34, 1.0, d)) * 0.45;
        float a = max(core, halo) * vAlpha;
        if (a < 0.01) discard;
        gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.75), a);
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

  // ---- Flight (three quick clicks) ----
  // The canvas leaves its box for a full-screen layer that lets clicks
  // through, glows white, flutters around the screen like a butterfly with
  // sparks trailing from the wing tips, and lands back where it was.
  // In the air it moves like a butterfly: full wing beats with the odd
  // glide, a flutter on every stroke, a wandering path, head first.
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
    canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:40;pointer-events:none;display:block";
    document.body.appendChild(canvas);
    overlayResize();
  };
  // Back into the box. It has already landed and its trail has died out,
  // so this is invisible: the position is converted to box coordinates in
  // the same frame (no one-frame jump) and nothing gets cut at the edges.
  const endFlight = () => {
    const home = flight.home;
    flight = null;
    host.appendChild(canvas);
    canvas.style.cssText = "display:block;width:100%;height:100%";
    logo.position.set(0, logo.position.y - home.y, 0);
    logo.rotation.order = "XYZ";
    logo.rotation.z = 0;
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
  // Hit area: an invisible ellipse the size of the butterfly that moves with
  // it, so clicks in the gaps between the wings (or on a logo that is
  // mid-spin) still count, and the empty corners of the canvas don't.
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
    // A chain of quick clicks, like a triple-click: each one within 650 ms
    // of the previous (timed by when the click happened, not when it got
    // handled, which can lag on a busy device).
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

  // ---- Loop ----
  let raf = 0;
  let last = 0;
  let ready = false;
  let clock = 0; // seconds of animated time (stands still while paused)
  let phase = 0;
  let hoverAmt = 0;
  let tiltX = 0;
  let tiltY = 0;
  const ease = (from, to, dt, rate) => from + (to - from) * (1 - Math.exp(-dt * rate));
  const easeOutCubic = (p) => 1 - (1 - p) ** 3;

  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.visibilityState === "hidden" || now - last < FRAME_MS) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : FRAME_MS / 1000;
    last = now;
    clock += dt;
    const t = clock;

    hoverAmt = ease(hoverAmt, hovering ? 1 : 0, dt, 6);
    excite *= Math.exp(-dt * 1.4);
    tiltY = ease(tiltY, pointerIn ? ndc.x * 0.35 : 0, dt, 4);
    tiltX = ease(tiltX, pointerIn ? -ndc.y * 0.22 : 0, dt, 4);

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

    // Wing beat. At rest: soft (quick lift, slow settle), faster and wider
    // on hover and after a click. In flight: a full butterfly beat, wings
    // swinging from open to almost meeting about 2.5 times a second, with
    // the odd glide on half-open wings.
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
      // Sparks from both wing tips while airborne.
      // The trail thins out while it rises into place and stops early
      // enough that every spark has faded before it lands.
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
      logo.rotation.y = 0.32 * Math.sin(t * 0.33) * (1 - hoverAmt * 0.6) + tiltY + spin;
      logo.rotation.x = -0.12 + 0.06 * Math.sin(t * 0.47) + tiltX;
      logo.position.y = bob;
      logo.scale.setScalar(1 + 0.05 * hoverAmt + 0.06 * excite);
    }
    const glow = 0.32 + 0.18 * hoverAmt + 0.35 * excite + Math.max(0, flash);
    faceMaterials.forEach((m) => (m.emissiveIntensity = glow));

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
    window.removeEventListener("resize", resize);
    sparkGeo.dispose();
    sparkMat.dispose();
    hitArea.geometry.dispose();
    hitArea.material.dispose();
    ro.disconnect();
    io.disconnect();
    geometry.dispose();
    faceTexture.dispose();
    logo.traverse((o) => o.isMesh && o.material.forEach((m) => m.dispose()));
    face.dispose();
    edge.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
