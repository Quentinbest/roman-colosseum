import * as THREE from 'three';

const EYE_HEIGHT = 1.72;
const BODY_RADIUS = .38;
const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

export class Walker {
  constructor(camera, canvas, surfaces, onBlocked) {
    this.camera = camera;
    this.canvas = canvas;
    this.surfaces = surfaces;
    this.onBlocked = onBlocked;
    this.active = false;
    this.keys = new Set();
    this.yaw = 0;
    this.pitch = 0;
    this.ray = new THREE.Raycaster();
    this.direction = new THREE.Vector3();
    this.dragging = false;
    this.blockedAt = 0;
    canvas.addEventListener('pointerdown', e => {
      if (!this.active || e.button !== 0) return;
      this.dragging = true;
      this.lastPointer = [e.clientX, e.clientY];
      canvas.setPointerCapture(e.pointerId);
      canvas.focus({ preventScroll: true });
    });
    canvas.addEventListener('pointermove', e => {
      if (!this.active || !this.dragging) return;
      this.yaw -= (e.clientX - this.lastPointer[0]) * .004;
      this.pitch = THREE.MathUtils.clamp(this.pitch - (e.clientY - this.lastPointer[1]) * .003, -1.25, 1.25);
      this.lastPointer = [e.clientX, e.clientY];
      this.applyLook();
    });
    const endDrag = () => { this.dragging = false; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('lostpointercapture', endDrag);
    window.addEventListener('keydown', e => {
      if (!this.active || document.querySelector('dialog[open]') || e.target.closest('input,textarea,select')) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        e.preventDefault(); this.keys.add(e.code);
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clearInput());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clearInput(); });
    document.querySelectorAll('[data-move]').forEach(button => {
      button.addEventListener('pointerdown', e => {
        e.preventDefault(); button.setPointerCapture(e.pointerId); this.keys.add(button.dataset.move);
      });
      for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(event, () => this.keys.delete(button.dataset.move));
    });
  }
  clearInput() { this.keys.clear(); this.dragging = false; }
  applyLook() { this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')); }
  hit(origin, direction, distance) {
    this.ray.set(origin, direction); this.ray.far = distance;
    const hits = this.ray.intersectObjects(this.surfaces, false);
    return hits[0] ?? null;
  }
  floorAt(position, maxStep = .46) {
    const origin = position.clone(); origin.y += maxStep - EYE_HEIGHT;
    this.ray.set(origin, DOWN); this.ray.far = 2.9;
    const hits = this.ray.intersectObjects(this.surfaces, false);
    // Reject vertical surfaces. Double-sided materials can otherwise make walls act as floors.
    return hits.find(hit => Math.abs(hit.face.normal.y) > .6) ?? null;
  }
  // With closed, outward-facing geometry, the first exit face identifies a point
  // inside masonry. Also keep a small clearance from surfaces around the camera.
  isClear(position, body = false) {
    const directions = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
    for (const height of body ? [0, -.85] : [0]) {
      const origin = position.clone(); origin.y += height;
      for (const vector of directions) {
        const direction = new THREE.Vector3(...vector);
        const hit = this.hit(origin, direction, 240);
        if (hit && (hit.distance < .23 || hit.face.normal.dot(direction) > .05)) return false;
      }
    }
    return true;
  }
  supportedPosition(position) {
    const floor = this.floorAt(position);
    if (!floor) return null;
    const candidate = position.clone(); candidate.y = floor.point.y + EYE_HEIGHT;
    return this.isClear(candidate, true) ? candidate : null;
  }
  enter(position, lookAt) {
    this.clearInput();
    this.active = true;
    this.camera.position.copy(position);
    const floor = this.floorAt(position, 2.3);
    if (floor) this.camera.position.y = floor.point.y + EYE_HEIGHT;
    const direction = lookAt.clone().sub(this.camera.position).normalize();
    this.yaw = Math.atan2(-direction.x, -direction.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -.9, .9));
    this.applyLook();
  }
  canMove(from, to) {
    if (Math.hypot(to.x / 108, to.z / 91) > .99) return null;
    const delta = to.clone().sub(from);
    const distance = delta.length();
    if (distance < .00001) return null;
    delta.divideScalar(distance);
    // Test waist and head at three lateral offsets. A small radius cannot tunnel through piers.
    const side = new THREE.Vector3(delta.z, 0, -delta.x).multiplyScalar(BODY_RADIUS * .8);
    for (const h of [-.85, -.1]) {
      for (const offset of [-1, 0, 1]) {
        const origin = from.clone().addScaledVector(side, offset); origin.y += h;
        if (this.hit(origin, delta, distance + BODY_RADIUS)) return null;
      }
    }
    const floor = this.floorAt(to);
    if (!floor || floor.point.y < from.y - EYE_HEIGHT - .85) return null;
    to.y = floor.point.y + EYE_HEIGHT;
    const head = to.clone(); head.y -= .25;
    if (this.hit(head, UP, .65)) return null;
    return to;
  }
  update(dt) {
    if (!this.active || document.querySelector('dialog[open]')) return;
    const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const right = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    if (!forward && !right) return;
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 9 : 4.8;
    const movement = new THREE.Vector3(-Math.sin(this.yaw) * forward + Math.cos(this.yaw) * right, 0, -Math.cos(this.yaw) * forward - Math.sin(this.yaw) * right).normalize().multiplyScalar(speed * Math.min(dt, .05));
    // Substeps avoid tunnelling, even with Shift on a slow device.
    const steps = Math.ceil(movement.length() / .16);
    movement.divideScalar(steps);
    let moved = false;
    for (let i = 0; i < steps; i++) {
      const from = this.camera.position;
      const next = this.canMove(from, from.clone().add(movement));
      if (next) { from.copy(next); moved = true; }
      else {
        // Slide along walls instead of getting caught at a corner.
        for (const axis of ['x', 'z']) {
          const candidate = from.clone(); candidate[axis] += movement[axis];
          const slide = this.canMove(from, candidate);
          if (slide) { from.copy(slide); moved = true; }
        }
      }
    }
    if (!moved && performance.now() - this.blockedAt > 6500) {
      this.blockedAt = performance.now();
      this.onBlocked('Stone or an edge ahead. Turn to follow the passage, or choose another viewpoint.');
    }
  }
}
