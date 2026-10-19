import { TILE_W, TILE_H, project } from './camera.js';
import { key, squareName } from './world.js';

const INK = '#254d43';
const knightShape = 'M-23-18 L-19-29 Q-16-40-5-49 L-13-56 L-8-67 L-11-79 L2-73 Q14-77 23-65 L34-49 Q36-44 30-41 L19-37 L8-43 Q7-29 21-21 L24-18 Z';

export class Renderer {
  constructor(canvas, world, camera) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw Error('Canvas 2D unavailable');
    this.world = world; this.camera = camera; this.hits = [];
    this.knightPath = new Path2D(knightShape);
    this.paths = new Set((world.paths ?? []).map(key));
    this.objects = [...world.objects, ...world.destinations].sort((a, b) => project(a).y - project(b).y);
  }
  resize(width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr); this.canvas.height = Math.round(height * dpr);
    this.dpr = dpr;
  }
  poly(points, fill, stroke = null, width = 1.2) {
    const c = this.ctx;
    c.beginPath(); c.moveTo(...points[0]);
    for (const p of points.slice(1)) c.lineTo(...p);
    c.closePath(); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  }
  ellipse(x, y, rx, ry, fill) {
    const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = fill; c.fill();
  }
  box(x, y, w, h, fill, radius = 4, stroke = null) {
    const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, radius); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
  }
  line(points, color, width = 2) {
    const c = this.ctx; c.beginPath(); c.moveTo(...points[0]);
    for (const p of points.slice(1)) c.lineTo(...p);
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  text(value, x, y, size = 12, fill = INK, weight = '600') {
    const c = this.ctx; c.font = `${weight} ${size}px "ONE Mobile", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fill; c.fillText(value, x, y);
  }
  diamond(x, y, fill, stroke = null, inset = 0) {
    const w = TILE_W / 2 - inset, h = TILE_H / 2 - inset / 2;
    this.poly([[x - w, y], [x, y - h], [x + w, y], [x, y + h]], fill, stroke);
  }
  block(w, d, h, front, side, top) {
    this.poly([[-w, -d], [0, 0], [0, -h], [-w, -h - d]], side, INK);
    this.poly([[0, 0], [w, -d], [w, -h - d], [0, -h]], front, INK);
    this.poly([[-w, -h - d], [0, -h - 2 * d], [w, -h - d], [0, -h]], top, INK);
  }
  shadow(size = 33) { this.ellipse(5, 1, size, size * 0.36, '#30534923'); }
  tree(pine) {
    this.shadow(27); this.box(-5, -42, 10, 42, '#95724c');
    if (pine) {
      for (let i = 0; i < 3; i++) this.poly([[-28 + i * 5, -22 - i * 18], [0, -73 - i * 7], [28 - i * 5, -22 - i * 18]], ['#367f63', '#4b9870', '#72ac79'][i]);
    } else {
      this.ellipse(-13, -49, 23, 24, '#367c5f'); this.ellipse(12, -52, 24, 27, '#5d9d69'); this.ellipse(-3, -69, 22, 24, '#86b578');
      this.ellipse(-9, -75, 8, 6, '#b6d38b');
    }
  }
  flowers() {
    for (const [x, y, color] of [[-15, -10, '#f6bc60'], [6, -17, '#f6a2ac'], [22, -3, '#f7e7a3']]) {
      this.line([[x, 1], [x, y - 8]], '#659268', 2);
      for (let i = 0; i < 5; i++) this.ellipse(x + Math.cos(i * 1.26) * 4, y - 8 + Math.sin(i * 1.26) * 4, 4, 4, color);
      this.ellipse(x, y - 8, 2.4, 2.4, '#986942');
    }
  }
  luggage() {
    this.shadow(25); this.box(-25, -37, 33, 32, '#e6a459', 5, INK); this.box(3, -27, 23, 26, '#d87463', 4, INK);
    this.line([[-15, -37], [-15, -43], [-4, -43], [-4, -37]], INK, 3);
    this.line([[-16, -34], [-16, -8]], '#f9ddb2', 3); this.line([[1, -34], [1, -8]], '#f9ddb2', 3);
  }
  workshop() {
    this.shadow(49); this.block(43, 21, 55, '#f4c565', '#c99b4d', '#ffde88');
    this.poly([[-48, -76], [-6, -111], [45, -81], [0, -51]], '#df7959', INK, 2);
    this.poly([[-48, -76], [-48, -84], [-6, -120], [-6, -111]], '#b84736', INK);
    this.poly([[-6, -120], [48, -88], [45, -81], [-6, -111]], '#ee9775', INK);
    this.box(-25, -77, 22, 19, '#3d746b', 3, INK); this.line([[-14, -76], [-14, -59]], '#f8e8b9', 2);
    this.box(12, -42, 17, 31, '#4f8570', 6, INK); this.ellipse(24, -23, 2, 2, '#ffdb74');
    this.box(-11, -138, 10, 23, '#4f7668', 2); this.poly([[-1, -139], [28, -130], [-1, -121]], '#f4d66b', INK);
    this.box(-25, -108, 39, 18, '#fff2ca', 5, INK); this.text('GAME', -5, -99, 10);
    this.box(-47, -20, 20, 10, '#7e8f73', 2); this.ellipse(-36, -24, 5, 5, '#b7c3a0');
  }
  station() {
    this.shadow(49); this.block(44, 21, 53, '#efad98', '#ca806b', '#ffd1ae');
    this.poly([[-51, -74], [-8, -101], [48, -78], [1, -51]], '#447c6c', INK, 2);
    this.poly([[-8, -101], [48, -78], [51, -86], [-8, -110]], '#66a38b', INK);
    this.box(-18, -111, 32, 39, '#f9e2ae', 6, INK); this.ellipse(-2, -97, 10, 10, '#fff6d8');
    this.line([[-2, -103], [-2, -97], [4, -94]], INK, 2);
    this.box(13, -42, 17, 30, '#477d77', 8, INK); this.box(-25, -52, 18, 15, '#8ac0b1', 3, INK);
    this.line([[-40, 6], [34, -28]], '#75847a', 4); this.line([[-27, 13], [47, -21]], '#75847a', 4);
    for (let i = 0; i < 5; i++) this.line([[-37 + i * 16, 13 - i * 7], [-43 + i * 16, 1 - i * 7]], '#bd9164', 5);
    this.box(-43, -31, 34, 15, '#fff1cb', 3, INK); this.text('TRAVEL', -26, -23, 8);
  }
  observatory() {
    this.shadow(42); this.block(31, 16, 70, '#b1a0d3', '#8175ab', '#c8b9e5');
    this.ellipse(0, -83, 34, 15, '#78669a');
    const c = this.ctx; c.beginPath(); c.arc(0, -83, 33, Math.PI, Math.PI * 2); c.fillStyle = '#a9d3cc'; c.fill();
    this.line([[-33, -83], [33, -83]], INK, 2); this.line([[0, -115], [7, -85]], '#e7f1db', 5);
    c.save(); c.translate(17, -103); c.rotate(-0.42); this.box(-5, -8, 39, 16, '#eab870', 4, INK); this.box(27, -11, 10, 22, '#fff0c3', 3, INK); c.restore();
    this.box(7, -42, 14, 29, '#574e7d', 6); this.ellipse(-16, -67, 7, 7, '#f9e9ae');
    this.line([[-20, -26], [-10, -30], [-10, -20]], '#f4d889', 2);
    this.line([[-36, -113], [-28, -113]], '#e3bd54', 2); this.line([[-32, -117], [-32, -109]], '#e3bd54', 2);
  }
  prop(object) {
    switch (object.kind) {
      case 'tree': this.tree(false); break;
      case 'pine': this.tree(true); break;
      case 'flowers': this.flowers(); break;
      case 'luggage': this.luggage(); break;
      case 'workshop': this.workshop(); break;
      case 'station': this.station(); break;
      case 'observatory': this.observatory(); break;
      case 'lamp':
        this.shadow(10); this.line([[0, 0], [0, -62], [14, -62]], '#476c5a', 4); this.box(7, -64, 14, 17, '#f7d77e', 4, INK); break;
      case 'mushroom':
        this.shadow(20); this.box(-5, -22, 10, 24, '#fff0c9'); this.ellipse(0, -24, 20, 13, '#d97d64'); this.ellipse(-6, -28, 4, 3, '#fff4d8'); this.ellipse(9, -23, 3, 3, '#fff4d8'); break;
      case 'bench':
        this.shadow(25); this.line([[-22, -6], [-22, 5]], INK, 3); this.line([[20, -12], [20, -1]], INK, 3);
        this.poly([[-29, -14], [11, -31], [30, -21], [-10, -4]], '#d7a56a', INK); this.line([[-28, -26], [10, -43], [10, -32]], '#b87e52', 6); break;
      case 'lab':
        this.shadow(26); this.block(24, 12, 15, '#c6bf9d', '#a29d7e', '#e4dcc0');
        this.poly([[-15, -28], [-7, -73], [9, -51], [4, -23]], '#70b9b5', INK); this.poly([[4, -23], [9, -51], [23, -40], [14, -19]], '#a8dcce', INK);
        this.text('LAB', 0, -5, 8); break;
    }
  }
  knight(lift = 0) {
    const c = this.ctx;
    this.ellipse(4, 2, 29 - lift * 0.08, 11 - lift * 0.02, '#244c4340');
    c.translate(0, -lift);
    this.ellipse(0, -5, 26, 10, '#a4b6a3'); this.box(-27, -16, 54, 13, '#fff5dd', 6, INK);
    this.ellipse(0, -17, 25, 8, '#fffdf0');
    c.fillStyle = '#fff8e3'; c.strokeStyle = INK; c.lineWidth = 2.6; c.fill(this.knightPath); c.stroke(this.knightPath);
    this.poly([[-11, -77], [-17, -66], [-16, -54], [-9, -49], [-16, -38], [-17, -28], [-8, -39], [0, -49], [-6, -58], [-4, -69]], '#d0b0cd');
    this.ellipse(14, -62, 3, 3, INK); this.line([[22, -44], [29, -47]], INK, 2);
    this.line([[-10, -23], [13, -23]], '#d8c9a4', 2);
  }
  hit(screen) {
    return [...this.hits].reverse().find(h => screen.x >= h.left && screen.x <= h.right && screen.y >= h.top && screen.y <= h.bottom)?.destination ?? null;
  }
  draw(state) {
    const c = this.ctx, cam = this.camera;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, cam.width, cam.height);
    const sky = c.createLinearGradient(0, 0, 0, cam.height); sky.addColorStop(0, '#e0ede1'); sky.addColorStop(1, '#f6eed9');
    c.fillStyle = sky; c.fillRect(0, 0, cam.width, cam.height);
    // Static cloudlets: no perpetual animation loop and no external assets.
    for (const [x, y, s] of [[0.12, 0.18, 1], [0.87, 0.13, 0.8], [0.8, 0.8, 0.6]]) {
      this.ellipse(cam.width * x, cam.height * y, 48 * s, 13 * s, '#ffffff70');
      this.ellipse(cam.width * x - 15 * s, cam.height * y - 9 * s, 23 * s, 18 * s, '#ffffff70');
    }
    c.save(); c.translate(cam.width / 2 - cam.x * cam.zoom, cam.height / 2 - cam.y * cam.zoom); c.scale(cam.zoom, cam.zoom);
    const corner = (x, y) => { const p = project({ x, y }); return [p.x, p.y]; };
    const w = this.world.width - 0.5, h = this.world.height - 0.5;
    const outline = [corner(-0.5, -0.5), corner(-0.5, h), corner(w, h), corner(w, -0.5)];
    this.poly(outline.map(([x, y]) => [x + 13, y + 35]), '#41684d20');
    const edge1 = [corner(-0.5, -0.5), corner(w, -0.5)], edge2 = [corner(w, -0.5), corner(w, h)];
    for (const [edge, color] of [[edge1, '#a8b987'], [edge2, '#829f7b']]) this.poly([edge[0], edge[1], [edge[1][0], edge[1][1] + 23], [edge[0][0], edge[0][1] + 23]], color, '#537358');
    // Cull rows and columns against the viewport, independent of total world size.
    const tiles = [{ x: -100, y: -180 }, { x: cam.width + 100, y: -180 }, { x: -100, y: cam.height + 180 }, { x: cam.width + 100, y: cam.height + 180 }].map(p => cam.tile(p));
    const minX = Math.max(0, Math.min(...tiles.map(p => p.x)) - 1), maxX = Math.min(this.world.width - 1, Math.max(...tiles.map(p => p.x)) + 1);
    const minY = Math.max(0, Math.min(...tiles.map(p => p.y)) - 1), maxY = Math.min(this.world.height - 1, Math.max(...tiles.map(p => p.y)) + 1);
    const legal = new Set(state.legal.map(key));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const p = project({ x, y }), odd = (x + y) % 2;
      this.diamond(p.x, p.y, odd ? '#b7cba2' : '#f3e9c9', '#778e713b');
      if (this.paths.has(`${x},${y}`)) {
        this.diamond(p.x, p.y, '#dacaac', null, 18);
        this.line([[p.x - 13, p.y + 6], [p.x - 2, p.y + 1]], '#b6a68d', 1);
        this.line([[p.x + 3, p.y - 7], [p.x + 14, p.y - 2]], '#b6a68d', 1);
      }
      if (this.world.blocked.has(`${x},${y}`)) this.diamond(p.x, p.y, '#72917518', null, 3);
      if (legal.has(`${x},${y}`)) {
        this.diamond(p.x, p.y, '#fff8dacc', '#347665', 7);
        this.ellipse(p.x, p.y, 13, 7, '#337a67'); this.text('+', p.x, p.y - 1, 16, '#fff9df');
      }
      if (state.selected?.x === x && state.selected?.y === y) this.diamond(p.x, p.y, '#f1cc674f', '#a56432', 3);
      if (this.world.objects.some(o => o.x === x && o.y === y && o.kind === 'pond')) {
        this.diamond(p.x, p.y, '#8dbfc1', '#699e9d', 2);
        this.line([[p.x - 19, p.y + 2], [p.x - 4, p.y + 2]], '#d5eddf', 2); this.line([[p.x + 6, p.y - 7], [p.x + 19, p.y - 7]], '#d5eddf', 2);
      }
    }
    if (state.path?.length > 1) {
      c.setLineDash([5, 7]); this.line(state.path.map(p => { const s = project(p); return [s.x, s.y]; }), '#ac6f32', 3); c.setLineDash([]);
    }
    const entities = [...this.objects.filter(o => o.kind !== 'pond'), { ...state.knight, kind: 'knight' }].sort((a, b) => project(a).y - project(b).y);
    this.hits = [];
    for (const object of entities) {
      const screen = cam.screen(object);
      if (screen.x < -140 || screen.x > cam.width + 140 || screen.y < -50 || screen.y > cam.height + 200) continue;
      const p = project(object); c.save(); c.translate(p.x, p.y);
      if (object.kind === 'knight') this.knight(object.lift);
      else this.prop(object);
      if (object.url) {
        const selected = state.selected?.id === object.id;
        this.box(-53, 12, 106, 25, selected ? '#284e42' : '#fff7df', 12, '#41634f');
        this.text(`${object.number}  ${object.title}`, 0, 25, 10, selected ? '#fff2c9' : INK);
        this.hits.push({ destination: object, left: screen.x - 54 * cam.zoom, right: screen.x + 54 * cam.zoom, top: screen.y - 141 * cam.zoom, bottom: screen.y + 38 * cam.zoom });
      }
      c.restore();
    }
    // Board coordinates are a quiet visual cue, not a dependency of the rules.
    for (let x = minX; x <= maxX; x++) { const p = project({ x, y: -0.72 }); this.text(squareName({ x, y: 0 }).slice(0, -1), p.x, p.y + 16, 12, '#48644e'); }
    for (let y = minY; y <= maxY; y++) { const p = project({ x: this.world.width - 0.25, y }); this.text(String(y + 1), p.x + 13, p.y + 6, 12, '#48644e'); }
    c.restore();
  }
}
