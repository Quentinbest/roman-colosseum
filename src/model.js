import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const DIMENSIONS = { length: 189, width: 156, height: 48, arenaLength: 86, arenaWidth: 54 };
export const pointOnEllipse = (a, b, angle, y = 0) => new THREE.Vector3(a * Math.cos(angle), y, b * Math.sin(angle));

function seededRandom(seed = 8214) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

// Canvas-generated textures keep the complete model self-contained and deterministic.
function masonryTexture(brick = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rand = seededRandom(brick ? 77 : 112);
  ctx.fillStyle = brick ? '#b8a493' : '#c9bda6';
  ctx.fillRect(0, 0, 512, 512);
  const rows = brick ? 22 : 8, rowHeight = 512 / rows;
  for (let row = 0; row < rows; row++) {
    const width = brick ? 85 : 128;
    for (let col = -1; col < 6; col++) {
      const x = col * width + (row % 2) * width / 2;
      const v = Math.floor(rand() * 22);
      ctx.fillStyle = brick ? `rgb(${172 + v},${151 + v},${129 + v})` : `rgb(${195 + v},${185 + v},${162 + v})`;
      ctx.fillRect(x + 1, row * rowHeight + 1, width - 2, rowHeight - 2);
      ctx.strokeStyle = '#64594418';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, row * rowHeight + 2, width - 4, rowHeight - 4);
    }
  }
  for (let i = 0; i < 57000; i++) {
    const v = rand() > .5 ? 255 : 33;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * .16})`;
    ctx.fillRect(rand() * 512, rand() * 512, rand() * 1.8 + .4, rand() * 1.3 + .3);
  }
  for (let i = 0; i < 210; i++) {
    ctx.fillStyle = `rgba(72,60,37,${rand() * .25})`;
    ctx.beginPath();
    ctx.ellipse(rand() * 512, rand() * 512, rand() * 2.3 + .5, rand() * 1.2 + .3, 0, 0, TAU);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// A closed elliptical annular prism; all sides and ruin ends have real surfaces.
function ringGeometry(ai, bi, ao, bo, y0, y1, start, end, steps = 8) {
  const positions = [];
  const tri = (a, b, c) => positions.push(...a, ...b, ...c);
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  const p = (a, b, t, y) => [a * Math.cos(t), y, b * Math.sin(t)];
  for (let i = 0; i < steps; i++) {
    const t0 = start + (end - start) * i / steps, t1 = start + (end - start) * (i + 1) / steps;
    const il = p(ai, bi, t0, y0), ir = p(ai, bi, t1, y0), ol = p(ao, bo, t0, y0), or = p(ao, bo, t1, y0);
    const ilt = p(ai, bi, t0, y1), irt = p(ai, bi, t1, y1), olt = p(ao, bo, t0, y1), ort = p(ao, bo, t1, y1);
    quad(ilt, irt, ort, olt); quad(il, ol, or, ir);
    quad(ol, olt, ort, or); quad(il, ir, irt, ilt);
    if (i === 0) quad(il, ilt, olt, ol);
    if (i === steps - 1) quad(ir, or, ort, irt);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function extrudeShape(points, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(...points[0]);
  points.slice(1).forEach(p => shape.lineTo(...p));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 14 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function finishTexture(sand = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d'), random = seededRandom(sand ? 149 : 208);
  context.fillStyle = sand ? '#d8bf87' : '#f0ece2';
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 18000; i++) {
    context.fillStyle = `rgba(100,85,60,${random() * (sand ? .16 : .04)})`;
    context.fillRect(random() * 256, random() * 256, 1, 1);
  }
  if (!sand) for (let i = 0; i < 9; i++) {
    const y = random() * 256;
    context.strokeStyle = '#928c7910'; context.lineWidth = .5 + random();
    context.beginPath(); context.moveTo(0, y);
    context.bezierCurveTo(65, y - 25, 180, y + 40, 256, y + 5); context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  return texture;
}

export function buildColosseum({ era = 'ruins' } = {}) {
  const ancient = era === 'ancient';
  const root = new THREE.Group();
  root.name = ancient ? 'Ancient Colosseum — interpretive reconstruction' : 'Present-day Colosseum';
  const random = seededRandom();
  const stoneTexture = masonryTexture(), brickTexture = masonryTexture(true);
  const materials = {
    stone: new THREE.MeshStandardMaterial({ color: '#e3dac7', map: stoneTexture, bumpMap: stoneTexture, bumpScale: .065, roughness: .96, vertexColors: true, side: THREE.DoubleSide }),
    brick: new THREE.MeshStandardMaterial({ color: '#d0c2ae', map: brickTexture, bumpMap: brickTexture, bumpScale: .085, roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
    ground: new THREE.MeshStandardMaterial({ color: '#d6d0bd', roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
    wood: new THREE.MeshStandardMaterial({ color: '#9b8768', roughness: .9, vertexColors: true, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: '#645f4f', roughness: .8, vertexColors: true, side: THREE.DoubleSide }),
    grass: new THREE.MeshStandardMaterial({ color: '#8f9573', roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
  };
  if (ancient) {
    materials.marble = new THREE.MeshStandardMaterial({ map: finishTexture(), roughness: .76, vertexColors: true, side: THREE.DoubleSide });
    materials.sand = new THREE.MeshStandardMaterial({ map: finishTexture(true), roughness: 1, vertexColors: true, side: THREE.DoubleSide });
    materials.plaster = new THREE.MeshStandardMaterial({ color: '#eee5d5', roughness: .95, vertexColors: true, side: THREE.DoubleSide });
    materials.red = new THREE.MeshStandardMaterial({ color: '#954c39', roughness: .95, vertexColors: true, side: THREE.DoubleSide });
  }
  const buckets = new Map();
  const surfaces = [];
  const stats = { era, bays: 80, exteriorBays: 0, geometries: 0, approximate: true };

  function add(geometry, material = 'stone', tint = 1) {
    if (geometry.index) { const original = geometry; geometry = geometry.toNonIndexed(); original.dispose(); }
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const colors = new Float32Array(positions.count * 3);
    const uvs = new Float32Array(positions.count * 2);
    const variation = (.87 + random() * .19) * tint;
    const color = new THREE.Color().setRGB(variation, variation * .984, variation * .955);
    for (let i = 0; i < positions.count; i++) {
      colors.set([color.r, color.g, color.b], i * 3);
      const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i)), nz = Math.abs(normals.getZ(i));
      const u = ny > .7 ? positions.getX(i) : nx > nz ? positions.getZ(i) : positions.getX(i);
      uvs[i * 2] = u / 5;
      uvs[i * 2 + 1] = (ny > .7 ? positions.getZ(i) : positions.getY(i)) / 5;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    // Spatial batches give efficient rendering AND inexpensive collision broad-phase bounds.
    geometry.computeBoundingBox();
    const center = geometry.boundingBox.getCenter(new THREE.Vector3());
    const key = `${material}/${Math.floor(center.x / 25)}/${Math.floor(center.z / 25)}/${Math.floor(center.y / 15)}`;
    if (!buckets.has(key)) buckets.set(key, { geometries: [], material });
    buckets.get(key).geometries.push(geometry);
    stats.geometries++;
  }
  function box(w, h, d, x, y, z, rotation = 0, material = 'stone', tint = 1) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateY(rotation); g.translate(x, y, z); add(g, material, tint);
  }
  function ring(ai, bi, ao, bo, y0, y1, start = 0, end = TAU, material = 'stone', steps = 8, tint = 1) {
    add(ringGeometry(ai, bi, ao, bo, y0, y1, start, end, steps), material, tint);
  }
  function localToBay(g, a, b, theta, y = 0) {
    // Ancient bays face outward; preserve the original ruins' bay orientation.
    const tangent = Math.atan2(b * Math.cos(theta), -a * Math.sin(theta));
    g.rotateY(ancient ? Math.PI - tangent : -tangent); g.translate(a * Math.cos(theta), y, b * Math.sin(theta));
    return g;
  }
  function bayBox(w, h, d, lx, ly, lz, a, b, theta, base, material = 'stone', tint = 1) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(lx, ly, lz);
    add(localToBay(g, a, b, theta, base), material, tint);
  }
  function arcadeBay(a, b, theta, base, height, outer, level) {
    const step = TAU / 80;
    const width = Math.hypot(a * Math.sin(theta), b * Math.cos(theta)) * step;
    const radius = width * (outer ? .31 : .30);
    const depth = outer ? 2.55 : 2.1;
    const spring = height - radius - 1.7;
    const material = outer ? 'stone' : ancient ? 'plaster' : 'brick';
    // The arch opening is genuinely empty from floor to soffit.
    const pierWidth = width / 2 - radius;
    for (const sign of [-1, 1]) {
      bayBox(pierWidth + .05, spring, depth, sign * (radius + pierWidth / 2), spring / 2, 0, a, b, theta, base, material);
      if (ancient && !outer) {
        for (const face of [-1, 1]) bayBox(pierWidth, 1.8, .035, sign * (radius + pierWidth / 2), .95, face * (depth / 2 + .025), a, b, theta, base, 'red');
      }
    }
    const top = height - .45;
    const spandrel = [[-width / 2, spring], [-width / 2, top], [width / 2, top], [width / 2, spring], [radius, spring]];
    for (let j = 1; j <= 20; j++) { const t = j / 20 * Math.PI; spandrel.push([Math.cos(t) * radius, spring + Math.sin(t) * radius]); }
    add(localToBay(extrudeShape(spandrel, depth), a, b, theta, base), material);
    // Individual radial voussoirs make the construction readable at close range.
    for (let j = 0; j < 11; j++) {
      const t0 = j / 11 * Math.PI + .01, t1 = (j + 1) / 11 * Math.PI - .01;
      const r2 = radius + (outer ? .6 : .4);
      const pts = [[Math.cos(t0) * radius, spring + Math.sin(t0) * radius], [Math.cos(t1) * radius, spring + Math.sin(t1) * radius], [Math.cos(t1) * r2, spring + Math.sin(t1) * r2], [Math.cos(t0) * r2, spring + Math.sin(t0) * r2]];
      add(localToBay(extrudeShape(pts, depth + .15), a, b, theta, base), 'stone', .99);
    }
    if (outer) {
      const x = width / 2;
      const column = new THREE.CylinderGeometry(level === 0 ? .43 : .37, .48, height - 1.25, 9);
      column.translate(x, height / 2 - .12, depth / 2 + .22);
      add(localToBay(column, a, b, theta, base), 'stone', 1.08);
      for (const [y, w, h] of [[.4, 1.13, .38], [height - .72, 1.2, .35], [height - 1.05, .93, .28]]) {
        bayBox(w, h, .78, x, y, depth / 2 + .2, a, b, theta, base, 'stone', 1.09);
      }
    }
    ring(a - depth / 2 - .25, b - depth / 2 - .25, a + depth / 2 + .42, b + depth / 2 + .42, base + height - .55, base + height + .05, theta - step / 2, theta + step / 2, 'stone', 2, 1.08);
  }

  // Thin archaeological base with a soft, earthy surface, not an idealized intact podium.
  const base = new THREE.CylinderGeometry(1, 1, 1.15, 160);
  base.scale(108, 1, 91); base.translate(0, -.7, 0); add(base, 'ground');
  for (let i = 0; i < 80; i++) {
    const t = i / 80 * TAU, t0 = t - TAU / 160, t1 = t + TAU / 160;
    ring(87, 70.5, 97, 80.5, -.05, .24, t0, t1, 'stone', 3, .96);
    ring(74.5, 58.5, 86.7, 70.3, -.05, .22, t0, t1, 'stone', 3, .92);
  }
  // The northern outer wall survives, with a few low remnants at the broken ends.
  const step = TAU / 80;
  for (let i = 0; i < 80; i++) {
    const t = i * step;
    const surviving = ancient || (i >= 39 && i <= 77);
    if (surviving) {
      stats.exteriorBays++;
      for (let level = 0; level < 3; level++) arcadeBay(93, 76.5, t, .25 + level * 10.6, 10.6, true, level);
      // Fourth-storey attic, with alternate small rectangular windows.
      const width = Math.hypot(93 * Math.sin(t), 76.5 * Math.cos(t)) * step;
      const baseY = 32.05, atticH = 15.65;
      if (i % 2 === 0) {
        bayBox(width, 5.2, 2.4, 0, 2.6, 0, 93, 76.5, t, baseY);
        bayBox(width, 6.45, 2.4, 0, 12.425, 0, 93, 76.5, t, baseY);
        const w = (width - 1.65) / 2;
        for (const sign of [-1, 1]) bayBox(w, 4, 2.4, sign * (1.65 + w) / 2, 7.2, 0, 93, 76.5, t, baseY);
      } else bayBox(width + .03, atticH, 2.4, 0, atticH / 2, 0, 93, 76.5, t, baseY);
      bayBox(.86, 14, .54, width / 2, 7.6, 1.4, 93, 76.5, t, baseY, 'stone', 1.05);
      for (const y of [36.9, 46.8, 47.8]) ring(91.4, 74.9, 94.9, 78.4, y, y + .32, t - step / 2, t + step / 2, 'stone', 3, 1.12);
      for (const x of [-width * .32, width * .32]) bayBox(.65, .8, 1, x, 12.9, 1.5, 93, 76.5, t, baseY, 'stone');
    }
    // Exposed inner arcade has an irregular, lower silhouette on the ruined south.
    const levels = surviving ? 3 : (i < 8 || i > 31 ? 3 : 2);
    for (let level = 0; level < levels; level++) arcadeBay(83.9, 67.4, t, .25 + level * 10.2, 10.2, false, level);
    const edgeY = .25 + levels * 10.2;
    const roughH = ancient ? .4 : .35 + random() * 2.1;
    ring(82.8, 66.3, 85.0, 68.5, edgeY, edgeY + roughH, t - step / 2, t + step / 2, ancient ? 'plaster' : 'brick', 3);
    if (!surviving && i % 3 !== 0) {
      bayBox(1.3 + random(), 1 + random() * 2, 2.1, (random() - .5) * 2, roughH + .7, 0, 83.9, 67.4, t, edgeY, 'brick', .93);
    }
    // Inner ambulatory wall and walkable intermediate floor.
    arcadeBay(74, 57.8, t, .25, 10.2, false, 0);
    if (ancient || (i > 35 && i < 78)) arcadeBay(74, 57.8, t, 10.45, 10.2, false, 1);
    if (surviving) ring(85.1, 68.6, 91.8, 75.3, 10.25, 10.7, t - step / 2, t + step / 2, 'brick', 3);
    ring(75.1, 58.9, 82.8, 66.3, 10.15, 10.55, t - step / 2, t + step / 2, 'brick', 3);
  }
  // Distinctive nineteenth-century masonry buttresses prop up the broken outer wall.
  if (!ancient) for (const [angle, sign] of [[38.5 * step, -1], [77.5 * step, 1]]) {
    const profile = [[-sign * .5, 0], [sign * 12, 0], [sign * 1.2, 47.6], [-sign * .5, 47.6]];
    add(localToBay(extrudeShape(profile, 4.2), 93, 76.5, angle, .25), 'brick', 1.04);
  }

  // Fragmentary cavea: exposed structural terraces, localized preserved steps, radial gaps.
  if (!ancient) for (let sector = 0; sector < 40; sector++) {
    const t0 = sector * TAU / 40 + .011, t1 = (sector + 1) * TAU / 40 - .011;
    const middle = (t0 + t1) / 2;
    const entryGap = Math.abs(Math.sin(middle)) < .105;
    if (entryGap) continue;
    const preserved = sector >= 25 && sector <= 27;
    const count = preserved ? 27 : 0;
    for (let row = 0; row < count; row++) {
      const innerA = 46 + row * 1.03, innerB = 29.2 + row * 1.03;
      const y = 5.5 + row * .72;
      ring(innerA, innerB, innerA + 1.05, innerB + 1.05, .3, y, t0, t1, 'stone', 5, 1.1);
    }
    if (!preserved) {
      // Most seats have disappeared. Broad broken concrete slopes and radial ribs remain.
      for (let tier = 0; tier < 3; tier++) {
        if (tier > 0 && sector % 6 === 2) continue;
        const ai = 46 + tier * 8.6, bi = 29.2 + tier * 8.6;
        const ao = ai + 5.7 + random() * 1.5, bo = bi + (ao - ai);
        const yInner = 5.7 + tier * 5.7, yOuter = yInner + 2.1 + random() * 1.1;
        const geometry = ringGeometry(ai, bi, ao, bo, .3, 1, t0 + .015, t1 - .015, 5);
        const positions = geometry.attributes.position;
        for (let j = 0; j < positions.count; j++) {
          if (positions.getY(j) > .9) positions.setY(j, Math.hypot(positions.getX(j) / ai, positions.getZ(j) / bi) < 1.001 ? yInner : yOuter);
        }
        geometry.computeVertexNormals(); add(geometry, 'brick', .86 + random() * .13);
        ring(ai, bi, ai + .7, bi + .7, .3, yInner + .3, t0, t1, 'stone', 5, .87);
      }
    }
    // Rough radial support walls fill the torn ends and carry the cavea.
    if (sector % 2 === 0 || !preserved) {
      const profile = [[0, 0], [25, 0], [25, 22.8], [0, 5.1]];
      const g = extrudeShape(profile, 1.4);
      g.rotateY(-middle); g.translate(46 * Math.cos(middle), .3, 29.2 * Math.sin(middle));
      add(g, 'brick', .93);
    }
  }
  // Podium around the exposed arena; axial entrance breaks remain open.
  for (let i = 0; i < 80; i++) {
    const t = i * step;
    const stairEntrance = ancient && Math.cos(t) > 0 && Math.sin(t) > 0;
    if (Math.abs(Math.sin(t)) < (stairEntrance ? .28 : .2)) continue;
    ring(42.8, 26.8, 45.4, 29.4, .05, ancient ? 9.4 : 5.5 + random() * .35, t - step / 2, t + step / 2, ancient ? 'marble' : 'brick', 3);
    ring(42.6, 26.6, 45.6, 29.6, ancient ? 9.4 : 5.45, ancient ? 9.7 : 5.85, t - step / 2, t + step / 2, ancient ? 'marble' : 'stone', 3);
  }
  if (ancient) {
    const arena = new THREE.CylinderGeometry(1, 1, .4, 160);
    arena.scale(43, 1, 27); arena.translate(0, 5.08, 0); add(arena, 'sand', 1.08);
    // Closed seat slabs leave a finished underside above the circulation spaces.
    // Narrow radial aisles divide the cavea into wedges, with two circulation terraces.
    for (let sector = 0; sector < 40; sector++) {
      const start = sector * TAU / 40, end = (sector + 1) * TAU / 40;
      for (let row = 0; row < 40; row++) {
        const ai = 46 + row * .95, bi = 29.2 + row * .95;
        const y = row === 12 || row === 13 ? 16.88 : row === 26 || row === 27 ? 24.97 : 9.85 + row * .62 - (row > 13 ? 1 : 0) - (row > 27 ? .62 : 0);
        const aisle = .009;
        let spans = [[start + aisle, end - aisle]];
        // A representative access stair reaches the lower promenade from the arena.
        // Reserve its full width through the seat slabs instead of hiding an intersecting stair.
        if (ai < 63 && sector < 2) {
          const cut0 = Math.asin(3 / (bi + .97)), cut1 = Math.asin(8.5 / bi);
          spans = [[start + aisle, Math.min(end - aisle, cut0)], [Math.max(start + aisle, cut1), end - aisle]];
        }
        // Ten representative vomitoria open from the lower circulation terrace.
        if (sector % 4 === 2 && row >= 14 && row <= 18) {
          const middle = (start + end) / 2;
          const opening = 1.55 / Math.hypot(ai * Math.sin(middle), bi * Math.cos(middle));
          spans = [[start + aisle, middle - opening], [middle + opening, end - aisle]];
        }
        for (const [t0, t1] of spans) if (t1 > t0) ring(ai, bi, ai + .97, bi + .97, y - 1.2, y, t0, t1, row > 35 ? 'wood' : 'marble', 5, 1.08);
        // Two small aisle steps per seating row, with a continuous closed supporting slab.
        for (let half = 0; half < 2; half++) {
          if (sector === 1 && ai < 63) continue;
          const innerA = ai + half * .475, innerB = bi + half * .475;
          const top = [12, 13, 26, 27].includes(row) ? y : y - .31 + half * .31;
          ring(innerA, innerB, innerA + .49, innerB + .49, top - 1.2, top, start - aisle, start + aisle, 'marble', 1, 1.04);
        }
      }
    }
    // Barrel vaults under the axial seating bridge the gallery to the arena.
    for (const sign of [-1, 1]) {
      const vault = [];
      for (let i = 0; i <= 24; i++) { const a = i * Math.PI / 24; vault.push([3.15 * Math.cos(a), 6.2 + 3.15 * Math.sin(a)]); }
      for (let i = 24; i >= 0; i--) { const a = i * Math.PI / 24; vault.push([2.65 * Math.cos(a), 6.2 + 2.65 * Math.sin(a)]); }
      const g = extrudeShape(vault, 30); g.rotateY(Math.PI / 2); g.translate(sign * 59, 0, 0); add(g, 'plaster');
      for (const z of [-2.9, 2.9]) {
        box(30, 6.2, .5, sign * 59, 3.1, z, 0, 'plaster');
        box(30, 1.8, .035, sign * 59, 1, z - Math.sign(z) * .27, 0, 'red');
      }
    }
    box(2.2, .3, 3, 42, 5.13, 4.6, 0, 'marble');
    for (let i = 0; i < 41; i++) {
      const y = 5.28 + i * .29;
      box(.46, y - .3, 3.2, 42.7 + i * .42, (y + .3) / 2, 4.7, 0, 'marble', 1.08);
    }
    box(1.6, .5, 3.2, 60.1, 16.63, 4.7, 0, 'marble');
    box(2.6, .5, 2, 59.5, 16.63, 6.75, 0, 'marble');
    // Close and support the rear of the stair opening beneath the seating slabs.
    box(.4, 19.7, 5.9, 62.3, 10.15, 5.8, 0, 'plaster');
    // The lower promenade meets the stair at 16.88 m and continues around the bowl.
    ring(57.4, 40.6, 59.3, 42.5, 16.45, 16.88, .13, TAU - .13, 'marble', 180, 1.08);
    ring(70.7, 53.9, 72.6, 55.8, 24.55, 24.97, 0, TAU, 'marble', 180, 1.08);
    for (let sector = 0; sector < 40; sector++) {
      const t0 = sector * TAU / 40 + .014, t1 = (sector + 1) * TAU / 40 - .014;
      for (const [a, b, y] of [[57.4, 40.6, 16.88], [70.7, 53.9, 24.97]]) {
        if (sector === 0 && y < 20) continue;
        ring(a, b, a + .24, b + .24, y, y + .85, t0, t1, 'marble', 5, 1.06);
      }
      if (sector % 4 !== 2) continue;
      const t = (t0 + t1) / 2, vault = [];
      for (let i = 0; i <= 16; i++) { const angle = i * Math.PI / 16; vault.push([1.52 * Math.cos(angle), 1.5 + 1.52 * Math.sin(angle)]); }
      for (let i = 16; i >= 0; i--) { const angle = i * Math.PI / 16; vault.push([1.22 * Math.cos(angle), 1.5 + 1.22 * Math.sin(angle)]); }
      add(localToBay(extrudeShape(vault, 5.4), 61.6, 44.8, t, 16.88), 'plaster');
      for (const side of [-1, 1]) bayBox(.3, 1.5, 5.4, side * 1.37, .75, 0, 61.6, 44.8, t, 16.88, 'plaster');
      bayBox(3, .3, 5.7, 0, -.15, 0, 61.6, 44.8, t, 16.88, 'marble');
      // A closed end bounds the representative access bay; deeper chambers are omitted.
      bayBox(3, 3.1, .3, 0, 1.55, 2.7, 61.6, 44.8, t, 16.88, 'plaster');
    }
    // A sheltered upper colonnade, with closed roof, floor and parapet surfaces.
    ring(83.6, 66.8, 91.7, 74.9, 33.5, 34.05, 0, TAU, 'marble', 160);
    ring(84.1, 67.3, 92, 75.2, 42.5, 43.1, 0, TAU, 'stone', 160, 1.1);
    ring(83.9, 67.1, 84.4, 67.6, 34.05, 35.05, 0, TAU, 'marble', 160);
    for (let i = 0; i < 80; i++) {
      const t = i * step;
      const column = new THREE.CylinderGeometry(.37, .48, 7.7, 12);
      column.translate(86 * Math.cos(t), 38.25, 69.2 * Math.sin(t)); add(column, 'marble', 1.08);
      for (const y of [34.3, 42.25]) bayBox(1.35, .45, 1.35, 0, 0, 0, 86, 69.2, t, y, 'marble', 1.1);
      // Masts suggest the awning apparatus. The cloth is stowed in this interpretation.
      for (let mast = 0; mast < 3; mast++) {
        const a = t + (mast - 1) * step / 3;
        const pole = new THREE.CylinderGeometry(.12, .19, 8.8, 6);
        pole.translate(94 * Math.cos(a), 49.5, 77.5 * Math.sin(a)); add(pole, 'wood');
        bayBox(.5, .6, .8, 0, 0, 0, 94, 77.5, a, 45.6, 'stone');
      }
    }
  } else {
  // Exposed hypogeum: parallel longitudinal corridors with interrupted cross walls.
  const pitFloor = new THREE.CylinderGeometry(1, 1, .28, 96);
  pitFloor.scale(42.6, 1, 26.6); pitFloor.translate(0, .0, 0); add(pitFloor, 'ground', .79);
  for (const z of [-21, -16, -10, -4, 4, 10, 16, 21]) {
    const maxX = 40.5 * Math.sqrt(1 - (z / 26.5) ** 2);
    for (let x = -maxX; x < maxX; x += 6) {
      const w = Math.min(5.7, maxX - x);
      const h = 2.4 + random() * 1.5;
      box(w, h, .95, x + w / 2, h / 2 + .15, z, 0, 'brick', .9);
      box(w + .03, .25, 1.04, x + w / 2, h + .19, z, 0, 'stone', .85);
    }
  }
  for (let x = -32; x <= 32; x += 7) {
    const maxZ = 24 * Math.sqrt(1 - (x / 42) ** 2);
    for (let z = -maxZ; z < maxZ; z += 6.1) {
      if (Math.abs(z + 2) < 4) continue;
      const h = 2 + random() * 1.6;
      box(.8, h, 3.6, x, h / 2 + .2, z + 1.8, 0, 'brick', .88);
    }
  }
  // Small contemporary arena platform and axial boardwalk, leaving the hypogeum visible.
  // A continuous subdeck bridges the fine board joints so walking cannot snag in a visual seam.
  const platformOutline = [];
  const platformAngle = Math.acos(24 / 43);
  for (let i = 0; i <= 48; i++) {
    const t = -platformAngle + i / 48 * platformAngle * 2;
    platformOutline.push([43 * Math.cos(t), 26 * Math.sin(t)]);
  }
  const subdeck = extrudeShape(platformOutline, .24);
  subdeck.rotateX(Math.PI / 2); subdeck.translate(0, 5.145, 0);
  add(subdeck, 'wood', 1.02);
  for (let x = 24; x < 42; x += .7) {
    const z = 26 * Math.sqrt(1 - ((x + .7) / 43) ** 2);
    box(.66, .28, z * 2, x + .33, 5.13, 0, 0, 'wood', 1.05);
  }
  box(82, .3, 3.4, 0, 5.13, 0, 0, 'wood');
  for (let x = -41; x < 24; x += 2.8) {
    for (const z of [-1.65, 1.65]) {
      box(.07, 1.12, .07, x, 5.8, z, 0, 'metal');
      box(2.8, .06, .055, x + 1.4, 6.32, z, 0, 'metal');
    }
  }
  }
  // Entrance ramps connect the exterior, ambulatory and arena without a camera jump.
  for (const sign of [-1, 1]) {
    const slope = Math.atan2(5.05, 41);
    const g = new THREE.BoxGeometry(Math.hypot(41, 5.05), .3, 4.0);
    g.rotateZ(-sign * slope); g.translate(sign * 61.5, 2.625, 0); add(g, 'stone', .9);
    box(15, .25, 4, sign * 89.5, .2, 0, 0, 'stone');
  }
  // A broad modern stair allows visitors to reach a lower seating terrace from the arena.
  if (!ancient) {
  box(2.2, .3, 3, 42, 5.13, 4.5, 0, 'stone', 1.1);
  for (let i = 0; i < 22; i++) {
    const x = 42.7 + i * .58, y = 5.28 + i * .28;
    box(.62, y - .3, 2.6, x, (y + .3) / 2, 4.5, 0, 'stone', 1.1);
  }
  // Walkable lower cavea lookout in the front-right sector.
  box(1.2, .3, 3.2, 55.2, 11.01, 4.8, 0, 'stone', 1.1);
  ring(53, 36.2, 56, 39.2, 10.75, 11.05, .16, .85, 'stone', 30);
  // Fragmented stones and quiet vegetation around the lost southern outer ring.
  for (let i = 0; i < 290; i++) {
    const t = random() * Math.PI * .98;
    const radiusOffset = random() * 6;
    const p = pointOnEllipse(92 + radiusOffset, 75.5 + radiusOffset, t);
    if (Math.abs(p.z) < 4.4) continue;
    const h = .22 + random() * .75;
    box(.4 + random() * 1.45, h, .5 + random() * .75, p.x, .24 + h / 2, p.z, random() * TAU, 'stone', .85);
  }
  for (let i = 0; i < 75; i++) {
    const t = random() * TAU, offset = random() * 3.5;
    const p = pointOnEllipse(100 + offset, 83 + offset, t);
    const g = new THREE.IcosahedronGeometry(.5 + random() * .6, 0);
    g.scale(1.6, .2, 1); g.translate(p.x, .07, p.z); add(g, 'grass');
  }
  }
  // Merge by material and spatial cell: hundreds of draw calls instead of tens of thousands.
  for (const [key, bucket] of buckets) {
    const geometry = mergeGeometries(bucket.geometries, false);
    geometry.computeBoundingSphere(); geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, materials[bucket.material]);
    mesh.name = key;
    mesh.castShadow = bucket.material !== 'ground' && bucket.material !== 'grass';
    mesh.receiveShadow = true;
    root.add(mesh); surfaces.push(mesh);
    bucket.geometries.forEach(g => g.dispose());
  }
  root.updateMatrixWorld(true);
  stats.drawCalls = surfaces.length;
  stats.triangles = surfaces.reduce((n, mesh) => n + mesh.geometry.attributes.position.count / 3, 0);
  return { root, surfaces, stats, materials };
}
