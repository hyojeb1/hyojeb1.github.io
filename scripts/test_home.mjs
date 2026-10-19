import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, world, key, same, squareName } from '../home/world.js';
import { legalMoves, isLegalMove, shortestPath, canLand } from '../home/rules.js';
import { Movement } from '../home/movement.js';
import { Camera, project, unproject } from '../home/camera.js';

const empty = (width = 8, height = width, extra = {}) => createWorld({ width, height, start: { x: 0, y: 0 }, ...extra });

test('knight: exactly eight L offsets, with no sliding/diagonal/same-square moves', () => {
  const w = empty(), from = { x: 3, y: 3 };
  const expected = new Set(['2,1', '4,1', '1,2', '5,2', '1,4', '5,4', '2,5', '4,5']);
  assert.deepEqual(new Set(legalMoves(w, from).map(key)), expected);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) assert.equal(isLegalMove(w, from, { x, y }), expected.has(`${x},${y}`));
});
test('edges, integer coordinates and blocked landings; intervening blockers ignored', () => {
  const w = empty(8, 8, { blocked: [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }] });
  assert.deepEqual(legalMoves(w, w.start), [{ x: 1, y: 2 }]);
  assert.equal(canLand(w, { x: -1, y: 2 }), false);
  assert.equal(canLand(w, { x: 8, y: 2 }), false);
  assert.equal(canLand(w, { x: 1.5, y: 2 }), false);
  assert.equal(canLand(w, { x: NaN, y: 2 }), false);
});
test('BFS known minimum, endpoints, blocked goal and disconnected board', () => {
  const w = empty();
  assert.equal(shortestPath(w, w.start, { x: 7, y: 7 }).length - 1, 6);
  assert.deepEqual(shortestPath(w, w.start, w.start), [w.start]);
  const trap = empty(8, 8, { blocked: [{ x: 1, y: 2 }, { x: 2, y: 1 }] });
  assert.equal(shortestPath(trap, trap.start, { x: 7, y: 7 }), null);
  assert.equal(shortestPath(trap, trap.start, { x: 1, y: 2 }), null);
  assert.equal(shortestPath(w, w.start, { x: 9, y: 2 }), null);
});
test('every V1 free square and all three destinations are reachable through legal hops', () => {
  assert.equal(squareName(world.start), 'b1');
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) {
    const goal = { x, y }; if (!canLand(world, goal)) continue;
    const path = shortestPath(world, world.start, goal);
    assert.ok(path, `unreachable ${squareName(goal)}`);
    assert.ok(same(path.at(-1), goal));
    path.slice(1).forEach((to, i) => assert.ok(isLegalMove(world, path[i], to)));
  }
});
test('BFS handles 16/32 boards and rectangular boards without an eight-square assumption', () => {
  for (const [width, height] of [[16, 16], [32, 32], [12, 19]]) {
    const w = empty(width, height), goal = { x: width - 1, y: height - 1 };
    const path = shortestPath(w, w.start, goal);
    assert.ok(path && same(path.at(-1), goal));
    path.slice(1).forEach((p, i) => assert.ok(isLegalMove(w, path[i], p)));
  }
  assert.equal(squareName({ x: 26, y: 31 }), 'aa32');
});
test('world rejects blocked starts/destinations and duplicate places', () => {
  assert.throws(() => empty(8, 8, { blocked: [{ x: 0, y: 0 }] }));
  assert.throws(() => empty(8, 8, { destinations: [{ id: 'a', x: 8, y: 0 }] }));
  assert.throws(() => empty(8, 8, { destinations: [{ id: 'a', x: 1, y: 1 }, { id: 'a', x: 2, y: 2 }] }));
});
test('movement locks input during a jump and samples a vertical arc', () => {
  const m = new Movement(empty());
  assert.equal(m.moveTo({ x: 1, y: 2 }, 100), true);
  assert.equal(m.moveTo({ x: 2, y: 1 }, 101), false);
  assert.equal(m.travelTo({ x: 7, y: 7 }, 101), false);
  assert.deepEqual(m.position, { x: 0, y: 0 });
  const middle = m.sample(310); assert.equal(middle.lift, 72); assert.equal(middle.x, 0.5);
  m.tick(520); assert.deepEqual(m.position, { x: 1, y: 2 }); assert.equal(m.busy, false);
});
test('cancel keeps only the current safe landing; a new route works afterwards', () => {
  const m = new Movement(world);
  assert.equal(m.travelTo(world.destinations[1], 0), true); assert.ok(m.queue.length);
  const firstLanding = { ...m.flight.to }; m.cancel(); m.tick(500);
  assert.deepEqual(m.position, firstLanding); assert.equal(m.queue.length, 0); assert.equal(m.busy, false);
  assert.ok(m.travelTo(world.destinations[2], 1000));
  let now = 1000;
  for (let guard = 0; m.busy && guard < 100; guard++) m.tick(now += 500);
  assert.ok(same(m.position, world.destinations[2]));
});
test('reduced motion finishes without an arc and cannot bypass move legality', () => {
  const m = new Movement(world); m.reducedMotion = true;
  assert.equal(m.moveTo({ x: 1, y: 1 }, 0), false);
  assert.ok(m.travelTo(world.destinations[0], 0));
  assert.equal(m.sample(0).lift, 0);
  for (let guard = 0; m.busy && guard < 100; guard++) m.tick(0);
  assert.ok(same(m.position, world.destinations[0]));
});
test('camera projection, inverse tile picking, pan, anchored zoom, follow and bounds', () => {
  for (const p of [{ x: 0, y: 0 }, { x: 3.5, y: 6.2 }, { x: 31, y: 25 }]) {
    const roundtrip = unproject(project(p));
    assert.ok(Math.abs(p.x - roundtrip.x) < 1e-10 && Math.abs(p.y - roundtrip.y) < 1e-10);
  }
  const c = new Camera(world); c.resize(390, 510); c.follow(world.start, true);
  assert.deepEqual(c.tile(c.screen({ x: 6, y: 5 })), { x: 6, y: 5 });
  const anchor = { x: 100, y: 120 }, before = c.plane(anchor); c.zoomAt(1.2, anchor);
  const after = c.plane(anchor); assert.ok(Math.abs(before.x - after.x) + Math.abs(before.y - after.y) < 1e-8);
  c.pan(-20, 10); assert.equal(c.following, false);
  c.zoomAt(100); assert.equal(c.zoom, c.maxZoom);
  c.zoomAt(0.001); assert.equal(c.zoom, c.minZoom);
  c.following = true; c.follow({ x: 6, y: 5 }); c.step(100, true);
  assert.equal(c.x, c.targetX); assert.equal(c.y, c.targetY);
  const large = new Camera(empty(32)); large.resize(390, 510); assert.equal(large.zoom, 1.02);
});
