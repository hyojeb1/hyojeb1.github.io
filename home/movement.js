import { isLegalMove, shortestPath } from './rules.js';

// An in-flight jump always lands safely. Cancellation discards only future hops.
export class Movement {
  constructor(world, onChange = () => {}) {
    this.world = world;
    this.position = { ...world.start };
    this.flight = null;
    this.queue = [];
    this.onChange = onChange;
    this.reducedMotion = false;
  }
  get busy() { return this.flight !== null; }
  moveTo(to, now = performance.now()) {
    if (this.busy || !isLegalMove(this.world, this.position, to)) return false;
    this.flight = { from: { ...this.position }, to: { ...to }, started: now, duration: this.reducedMotion ? 0 : 420 };
    this.onChange('start');
    return true;
  }
  travelTo(to, now = performance.now()) {
    if (this.busy) return false;
    const path = shortestPath(this.world, this.position, to);
    if (!path) return false;
    this.queue = path.slice(1);
    if (this.queue.length) this.moveTo(this.queue.shift(), now);
    else this.onChange('arrive');
    return true;
  }
  cancel() {
    this.queue = [];
    this.onChange('cancel');
  }
  tick(now) {
    if (!this.flight) return false;
    if (this.flight.duration && now - this.flight.started < this.flight.duration) return true;
    this.position = { ...this.flight.to };
    this.flight = null;
    this.onChange('land');
    if (this.queue.length) this.moveTo(this.queue.shift(), now);
    else this.onChange('arrive');
    return this.busy;
  }
  sample(now) {
    if (!this.flight) return { ...this.position, lift: 0 };
    const t = this.reducedMotion || !this.flight.duration ? 1 : Math.min(1, Math.max(0, (now - this.flight.started) / this.flight.duration));
    const eased = t * t * (3 - 2 * t);
    const { from, to } = this.flight;
    return { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased, lift: this.reducedMotion ? 0 : Math.sin(t * Math.PI) * 72 };
  }
}
