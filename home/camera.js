// Projection pixels are independent of CSS viewport pixels and device pixels.
export const TILE_W = 116;
export const TILE_H = 58;
export const project = ({ x, y }) => ({ x: (x + y) * TILE_W / 2, y: (x - y) * TILE_H / 2 });
export const unproject = ({ x, y }) => ({ x: x / TILE_W + y / TILE_H, y: x / TILE_W - y / TILE_H });

export class Camera {
  constructor(world) {
    this.world = world;
    this.width = 1; this.height = 1;
    this.zoom = 1; this.minZoom = 0.55; this.maxZoom = 1.8;
    this.x = 0; this.y = 0; this.targetX = 0; this.targetY = 0;
    this.following = true;
    const corners = [{ x: 0, y: 0 }, { x: world.width - 1, y: 0 }, { x: 0, y: world.height - 1 }, { x: world.width - 1, y: world.height - 1 }].map(project);
    this.bounds = { left: Math.min(...corners.map(p => p.x)) - 90, right: Math.max(...corners.map(p => p.x)) + 90, top: Math.min(...corners.map(p => p.y)) - 90, bottom: Math.max(...corners.map(p => p.y)) + 90 };
  }
  resize(width, height) {
    const first = this.width === 1;
    this.width = width; this.height = height;
    if (first) this.zoom = width < 600 ? 1.02 : 0.96;
  }
  screen(point, height = 0) {
    const p = project(point);
    return { x: (p.x - this.x) * this.zoom + this.width / 2, y: (p.y - this.y - height) * this.zoom + this.height / 2 };
  }
  plane(screen) {
    return { x: (screen.x - this.width / 2) / this.zoom + this.x, y: (screen.y - this.height / 2) / this.zoom + this.y };
  }
  tile(screen) {
    const p = unproject(this.plane(screen));
    return { x: Math.floor(p.x + 0.5), y: Math.floor(p.y + 0.5) };
  }
  follow(point, instant = false) {
    if (!this.following) return;
    const p = project(point);
    const center = project({ x: (this.world.width - 1) / 2, y: (this.world.height - 1) / 2 });
    // A little look-ahead toward the village keeps edge starts readable on phones.
    const bias = this.width < 600 ? 0.22 : 0.45;
    this.targetX = p.x + (center.x - p.x) * bias;
    this.targetY = p.y + (center.y - p.y) * bias - 36;
    if (instant) { this.x = this.targetX; this.y = this.targetY; }
  }
  clamp() {
    this.x = Math.max(this.bounds.left, Math.min(this.bounds.right, this.x));
    this.y = Math.max(this.bounds.top, Math.min(this.bounds.bottom, this.y));
    this.targetX = this.x; this.targetY = this.y;
  }
  pan(dx, dy) {
    this.following = false;
    this.x -= dx / this.zoom; this.y -= dy / this.zoom;
    this.clamp();
  }
  zoomAt(factor, screen = { x: this.width / 2, y: this.height / 2 }) {
    const before = this.plane(screen);
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * factor));
    const after = this.plane(screen);
    this.x += before.x - after.x; this.y += before.y - after.y;
    this.following = false;
    this.clamp();
  }
  step(dt, reduced = false) {
    const dx = this.targetX - this.x, dy = this.targetY - this.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.1) { this.x = this.targetX; this.y = this.targetY; return false; }
    const t = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 50) / 95);
    this.x += dx * t; this.y += dy * t;
    return !reduced;
  }
}
