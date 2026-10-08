import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildColosseum } from './model.js';
import { Walker } from './navigation.js';
import { initializeLocale, changeLocale, getLocale, t, formatNumber, formatMetres } from './i18n.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#scene'), viewer = $('#viewer');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let currentView = 'exterior', walking = false, labels = true, transition = null, toastTimer;
let model, walker;
let era = 'ruins', lastSwitchAdjusted = false;
let openFeature = null, notification = null, loadingState = 'building', scaleMetres = 20;

function renderFeature() {
  if (!openFeature) return;
  for (const field of ['label', 'title', 'text']) {
    $(`#feature-${field}`).textContent = t(`features.${era}.${openFeature}.${field}`);
  }
}

// Text refresh deliberately does not touch the camera, controls, geometry, or timers.
function renderLocalizedUI() {
  document.documentElement.lang = getLocale();
  $('#language-select').value = getLocale();
  document.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
  for (const attribute of ['aria-label', 'title', 'content']) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)));
    });
  }
  $('#era-note').textContent = t(`eras.${era}.note`);
  $('#sidebar-era').textContent = t(`eras.${era}.sidebar`);
  document.querySelectorAll('[data-hotspot]').forEach(button => {
    const key = `features.${era}.${button.dataset.hotspot}`;
    button.setAttribute('aria-label', t(`${key}.learn`));
    button.querySelector('b').textContent = t(`${key}.title`);
  });
  $('#walk-toggle span').textContent = t(walking ? 'ui.returnOverview' : 'ui.walk');
  $('#control-hint-copy').textContent = t(walking ? 'ui.walkHint' : 'ui.orbitHint');
  $('#control-hint svg').toggleAttribute('hidden', walking);
  const fullscreenLabel = t(document.fullscreenElement ? 'ui.exitFullscreen' : 'ui.enterFullscreen');
  $('#fullscreen').setAttribute('aria-label', fullscreenLabel);
  $('#fullscreen').title = fullscreenLabel;
  $('#height-value').textContent = formatMetres(48);
  $('#footprint-value').textContent = t('ui.footprintValue', { length: formatNumber(189), width: formatNumber(156) });
  $('#scale-label').textContent = formatMetres(scaleMetres);
  $('#loading p').textContent = t(`loading.${loadingState}.title`);
  $('#loading small').textContent = t(`loading.${loadingState}.detail`);
  if (notification) $('#toast').textContent = t(notification.key, notification.parameters);
  updateViewCopy();
  renderFeature();
}

initializeLocale();
renderLocalizedUI();
$('#language-select').addEventListener('focus', () => walker?.clearInput());
$('#language-select').addEventListener('change', event => {
  changeLocale(event.target.value);
  renderLocalizedUI();
});
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  loadingState = 'webgl';
  renderLocalizedUI();
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#eeece5');
scene.fog = new THREE.Fog('#eeece5', 390, 750);
const camera = new THREE.PerspectiveCamera(39, 1, .08, 1200);
const ambient = new THREE.HemisphereLight('#fff9e9', '#9c9b85', 1.6);
scene.add(ambient);
const sun = new THREE.DirectionalLight('#fff1d4', 2.5);
sun.position.set(-100, 150, 95);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -145, right: 145, top: 130, bottom: -130, near: 1, far: 450 });
sun.shadow.bias = -.0003;
sun.shadow.normalBias = .11;
sun.shadow.radius = 3;
scene.add(sun);
const fill = new THREE.DirectionalLight('#e9edec', .65);
fill.position.set(100, 65, -110); scene.add(fill);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshStandardMaterial({ color: '#e7e4d9', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -1.34; ground.receiveShadow = true; scene.add(ground);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = .065;
controls.rotateSpeed = .58;
controls.zoomSpeed = .8;
controls.panSpeed = .65;
controls.minDistance = 9;
controls.maxDistance = 450;
controls.minPolarAngle = .08;
controls.maxPolarAngle = Math.PI / 2 - .025;
controls.maxTargetRadius = 90;
controls.autoRotateSpeed = .7;
controls.screenSpacePanning = false;
controls.listenToKeyEvents(canvas);

const views = {
  exterior: { position: [174, 150, 215], target: [0, 12, 0], walk: [101, 2, 8], look: [84, 3, 0] },
  arena: { position: [29, 11, 9], target: [-13, 10, -5], walk: [31, 7, 0], look: [-25, 9, -5] },
  seating: { position: [57, 34, 34], target: [-3, 4, -6], walk: [54.3, 12.8, 7.1], look: [-5, 6, -5] },
  passages: { position: [88.2, 3, 0], target: [58, 4, 0], walk: [88.2, 2, 0], look: [55, 3, 0] },
};
const ancientViews = {
  arena: { position: [29, 11, 9], target: [-13, 16, -5] },
  seating: { position: [57, 34, 34], target: [-3, 9, -6], walk: [57.4, 18.6, 7.1], look: [-5, 7, -5] },
};
const featureData = {
  wall: { position: new THREE.Vector3(-12, 42, -75) },
  hypogeum: { position: new THREE.Vector3(-12, 6, 6) },
  cavea: { position: new THREE.Vector3(52, 21, 31) },
};
const ancientFeatures = {
  wall: { position: new THREE.Vector3(-12, 42, -75) },
  hypogeum: { position: new THREE.Vector3(-12, 6, 6) },
  cavea: { position: new THREE.Vector3(52, 24, 31) },
};
const viewFor = key => ({ ...views[key], ...(era === 'ancient' ? ancientViews[key] : {}) });
const featuresFor = () => era === 'ancient' ? ancientFeatures : featureData;
let frame = 0, running = true, lastTime = performance.now();
const models = {};
const tmp = new THREE.Vector3();

function toast(key, parameters = {}) {
  notification = { key, parameters };
  $('#toast').textContent = t(key, parameters);
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').classList.remove('visible'); notification = null; }, 3800);
}
function resize() {
  const width = viewer.clientWidth, height = viewer.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = walking ? 62 : currentView === 'exterior' ? (width < 600 ? 48 : 39) : 55;
  // Reserve breathing room beneath the overview model for the editorial caption.
  camera.setViewOffset(width, height, 0, !walking && currentView === 'exterior' ? (width < 600 ? 64 : 45) : 0, width, height);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewer);

function stopOrbit() {
  controls.autoRotate = false;
  $('#rotate-toggle').setAttribute('aria-pressed', 'false');
}
function updateViewCopy() {
  $('#view-index').textContent = t(`views.ruins.${currentView}.index`);
  $('#view-title').textContent = t(`views.${era}.${currentView}.title`);
  $('#view-description').textContent = t(`views.${era}.${currentView}.description`);
  $('#mode-label').textContent = t(walking ? 'ui.onFoot' : `views.ruins.${currentView}.mode`);
}
function switchEra(nextEra) {
  if (!models[nextEra] || nextEra === era) return;
  transition = null; canvas.style.opacity = '1';
  walker.clearInput();
  // Consume pending orbit motion before recording the viewpoint.
  if (!walking) { controls.enableDamping = false; controls.update(); controls.enableDamping = true; }
  const previous = camera.position.clone();
  model.root.visible = false;
  era = nextEra; model = models[era]; model.root.visible = true;
  walker.surfaces = model.surfaces;
  let placement = previous.clone();
  if (walking) {
    const supported = walker.supportedPosition(previous);
    if (supported && Math.abs(supported.y - previous.y) < .5) placement = supported;
    else {
      const candidates = Object.keys(views).map(key => new THREE.Vector3(...viewFor(key).walk));
      // The shared centerline remains a safe route when the ancient arena floor vanishes.
      candidates.push(new THREE.Vector3(THREE.MathUtils.clamp(previous.x, -39, 39), 7, 0));
      const safe = candidates.map(point => walker.supportedPosition(point)).filter(Boolean);
      safe.sort((a, b) => a.distanceToSquared(previous) - b.distanceToSquared(previous));
      placement = safe[0] ?? new THREE.Vector3(88.2, 1.96, 0);
    }
  } else if (!walker.isClear(previous)) {
    // Prefer a nearby vertical adjustment. Fall back to a clear overview if necessary.
    let clear = false;
    for (let rise = .5; rise <= 55; rise += .5) {
      placement.copy(previous); placement.y += rise;
      if (walker.isClear(placement)) { clear = true; break; }
    }
    if (!clear) placement.set(...views.exterior.position);
  }
  lastSwitchAdjusted = placement.distanceTo(previous) > .05;
  camera.position.copy(placement);
  if (walking) walker.applyLook();
  else {
    controls.target.add(placement.clone().sub(previous));
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, .3, 48);
    controls.update();
    // Orbit target constraints can move the camera again; validate the final pose.
    if (!walker.isClear(camera.position)) setView('exterior', true);
  }
  renderer.shadowMap.needsUpdate = true;
  document.querySelectorAll('[data-era]').forEach(button => {
    const active = button.dataset.era === era;
    button.setAttribute('aria-pressed', String(active)); button.classList.toggle('selected', active);
  });
  $('#feature-card').hidden = true;
  openFeature = null;
  renderLocalizedUI();
  lastSwitchAdjusted = camera.position.distanceTo(previous) > .05;
  toast(lastSwitchAdjusted ? 'messages.formAdjusted' : 'messages.formRetained');
}
document.querySelectorAll('[data-era]').forEach(button => button.addEventListener('click', () => switchEra(button.dataset.era)));
function setView(key, immediate = false) {
  if (!views[key]) return;
  currentView = key;
  viewer.classList.toggle('interior', key !== 'exterior');
  canvas.style.opacity = '1';
  controls.maxPolarAngle = key === 'exterior' ? Math.PI / 2 - .025 : Math.PI - .08;
  const view = viewFor(key);
  stopOrbit();
  $('#feature-card').hidden = true;
  openFeature = null;
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === key);
    button.setAttribute('aria-pressed', String(button.dataset.view === key));
  });
  updateViewCopy();
  if (walking) {
    transition = null;
    walker.enter(new THREE.Vector3(...view.walk), new THREE.Vector3(...view.look));
  } else {
    controls.enabled = true;
    // Flush residual orbit momentum before moving to a new safe viewpoint.
    controls.enableDamping = false; controls.update(); controls.enableDamping = true;
    let position = new THREE.Vector3(...view.position);
    if (key === 'exterior' && viewer.clientWidth < 600) position.multiplyScalar(1.23);
    if (immediate || reducedMotion) {
      camera.position.copy(position); controls.target.set(...view.target); controls.update(); transition = null;
    } else {
      // Fade through black-free paper for interior transitions; do not fly through solid masonry.
      transition = { start: performance.now(), fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), position, target: new THREE.Vector3(...view.target), interior: key !== 'exterior' };
    }
  }
  resize();
}
function setWalking(enabled) {
  walking = enabled;
  viewer.classList.toggle('walking', walking);
  $('#walk-ui').hidden = !walking;
  $('#rotate-toggle').disabled = walking;
  $('#labels-toggle').disabled = walking;
  $('#zoom-in').disabled = walking;
  $('#zoom-out').disabled = walking;
  controls.enabled = !walking;
  walker.active = walking;
  walker.clearInput();
  setView(walking ? (currentView === 'exterior' ? 'passages' : currentView) : 'exterior', true);
  renderLocalizedUI();
  canvas.focus({ preventScroll: true });
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
$('#walk-toggle').addEventListener('click', () => setWalking(!walking));
$('#reset').addEventListener('click', () => { setView(currentView, true); toast('messages.reset'); });
$('#rotate-toggle').addEventListener('click', () => {
  if (currentView !== 'exterior') setView('exterior', true);
  transition = null;
  controls.autoRotate = !controls.autoRotate;
  $('#rotate-toggle').setAttribute('aria-pressed', String(controls.autoRotate));
});
$('#labels-toggle').addEventListener('click', () => {
  labels = !labels;
  $('#labels-toggle').setAttribute('aria-pressed', String(labels));
  if (!labels) { $('#feature-card').hidden = true; openFeature = null; }
});
function zoom(factor) {
  transition = null;
  canvas.style.opacity = '1';
  const offset = camera.position.clone().sub(controls.target);
  const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(offset.setLength(distance));
  controls.update();
}
$('#zoom-in').addEventListener('click', () => zoom(.8));
$('#zoom-out').addEventListener('click', () => zoom(1.25));
$('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (viewer.requestFullscreen) await viewer.requestFullscreen();
    else toast('messages.fullscreenUnsupported');
  } catch { toast('messages.fullscreenFailed'); }
});
document.addEventListener('fullscreenchange', () => {
  renderLocalizedUI();
  resize();
});

function setLighting(mode) {
  const golden = mode === 'golden';
  sun.position.set(golden ? -160 : -100, golden ? 65 : 150, golden ? 35 : 95);
  sun.color.set(golden ? '#ffcf8a' : '#fff1d4');
  sun.intensity = golden ? 3.0 : 2.5;
  ambient.intensity = golden ? 1.3 : 1.6;
  fill.intensity = golden ? .4 : .65;
  scene.background.set(golden ? '#e9e1d3' : '#eeece5');
  scene.fog.color.copy(scene.background);
  renderer.shadowMap.needsUpdate = true;
  document.querySelectorAll('[data-light]').forEach(button => {
    const active = button.dataset.light === mode;
    button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active));
  });
}
document.querySelectorAll('[data-light]').forEach(button => button.addEventListener('click', () => setLighting(button.dataset.light)));
document.querySelectorAll('[data-hotspot]').forEach(button => button.addEventListener('click', () => {
  openFeature = button.dataset.hotspot;
  renderFeature();
  $('#feature-card').hidden = false;
}));
$('#feature-close').addEventListener('click', () => { $('#feature-card').hidden = true; openFeature = null; });
for (const name of ['about', 'help']) {
  const dialog = $(`#${name}-dialog`);
  $(`#${name}-open`).addEventListener('click', () => { walker?.clearInput(); stopOrbit(); dialog.showModal(); });
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
}
window.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]') || event.target.closest('input,textarea,select')) return;
  if (event.code === 'KeyR') { setView(currentView, true); toast('messages.resetShort'); }
  if (event.code === 'Escape') {
    if (walking) setWalking(false);
    $('#feature-card').hidden = true;
    openFeature = null;
  }
});
controls.addEventListener('start', () => { transition = null; canvas.style.opacity = '1'; stopOrbit(); });

function updateHotspots() {
  for (const [key, feature] of Object.entries(featuresFor())) {
    const element = $(`[data-hotspot="${key}"]`);
    tmp.copy(feature.position).project(camera);
    const visible = labels && !walking && currentView === 'exterior' && tmp.z < 1 && tmp.z > -1 && Math.abs(tmp.x) < .92 && Math.abs(tmp.y) < .9;
    element.hidden = !visible;
    if (visible) { element.style.left = `${(tmp.x * .5 + .5) * viewer.clientWidth}px`; element.style.top = `${(-tmp.y * .5 + .5) * viewer.clientHeight}px`; }
  }
}

function animate(time) {
  if (!running) return;
  requestAnimationFrame(animate);
  const delta = Math.min((time - lastTime) / 1000, .05); lastTime = time;
  if (document.hidden) return;
  if (transition) {
    const t = Math.min((time - transition.start) / 900, 1), ease = t * t * (3 - 2 * t);
    if (transition.interior) {
      // Snap at the midpoint beneath a brief paper fade, avoiding misleading wall fly-throughs.
      canvas.style.opacity = String(.3 + Math.abs(t - .5) * 1.4);
      if (t >= .5) { camera.position.copy(transition.position); controls.target.copy(transition.target); }
    } else {
      camera.position.lerpVectors(transition.fromPosition, transition.position, ease);
      controls.target.lerpVectors(transition.fromTarget, transition.target, ease);
    }
    if (t === 1) { transition = null; canvas.style.opacity = '1'; }
  }
  if (walking) walker.update(delta);
  else {
    controls.update(delta);
    camera.position.y = Math.max(camera.position.y, .9);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, .3, 48);
  }
  renderer.render(scene, camera);
  if (++frame % 3 === 0) {
    updateHotspots();
    const direction = camera.getWorldDirection(tmp);
    $('#compass-needle').style.transform = `rotate(${Math.atan2(direction.x, -direction.z)}rad)`;
    const pixelsPerMetre = viewer.clientHeight / (2 * camera.position.distanceTo(controls.target) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const metres = pixelsPerMetre > 70 ? 1 : pixelsPerMetre > 12 ? 5 : 20;
    $('.scale-bar>span').style.width = `${metres * pixelsPerMetre}px`;
    if (metres !== scaleMetres) { scaleMetres = metres; $('#scale-label').textContent = formatMetres(metres); }
  }
}

// Yield once so the static interface and loading state paint before geometry generation.
setTimeout(() => {
  try {
    models.ruins = buildColosseum();
    models.ancient = buildColosseum({ era: 'ancient' });
    models.ancient.root.visible = false;
    scene.add(models.ruins.root, models.ancient.root);
    model = models.ruins;
    walker = new Walker(camera, canvas, model.surfaces, toast);
    setView('exterior', true);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    $('#loading').classList.add('finished');
    setTimeout(() => { $('#loading').hidden = true; }, 650);
    requestAnimationFrame(animate);
    // A small read-only diagnostics surface makes geometry and navigation acceptance reproducible.
    window.colosseum = {
      ready: true,
      get stats() { return model.stats; },
      state: () => ({ era, view: currentView, walking, lastSwitchAdjusted, autoRotate: controls.autoRotate, position: camera.position.toArray(), target: controls.target.toArray(), quaternion: camera.quaternion.toArray(), yaw: walker.yaw, cameraClear: walker.isClear(camera.position, walking), supported: Boolean(walker.floorAt(camera.position)), visibleForms: Object.values(models).filter(item => item.root.visible).map(item => item.stats.era), distance: camera.position.distanceTo(controls.target), azimuth: controls.getAzimuthalAngle(), triangles: renderer.info.render.triangles, calls: renderer.info.render.calls }),
      auditGeometry: () => {
        let nonFinite = 0, missingNormals = 0;
        for (const surface of model.surfaces) {
          const geometry = surface.geometry;
          if (!geometry.attributes.normal || !geometry.attributes.uv) missingNormals++;
          for (const coordinate of geometry.attributes.position.array) if (!Number.isFinite(coordinate)) nonFinite++;
        }
        return { nonFinite, missingNormals, allDoubleSided: model.surfaces.every(mesh => mesh.material.side === THREE.DoubleSide) };
      },
    };
  } catch (error) {
    console.error(error);
    loadingState = 'failed';
    renderLocalizedUI();
  }
}, 60);

canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault(); running = false;
  toast('messages.contextLost');
});
