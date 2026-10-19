import { key, same } from './world.js';

export const KNIGHT_OFFSETS = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
export const inBounds = (world, p) => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < world.width && p.y < world.height;
export const canLand = (world, p) => inBounds(world, p) && !world.blocked.has(key(p));
export function legalMoves(world, from) {
  return KNIGHT_OFFSETS.map(([x, y]) => ({ x: from.x + x, y: from.y + y })).filter(p => canLand(world, p));
}
export const isLegalMove = (world, from, to) => legalMoves(world, from).some(p => same(p, to));

// BFS visits landing tiles only: the knight never collides with intermediate tiles.
// Returns both endpoints; null means unreachable, [start] means already there.
export function shortestPath(world, start, goal) {
  if (!canLand(world, start) || !canLand(world, goal)) return null;
  const queue = [start];
  const parents = new Map([[key(start), null]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    if (same(current, goal)) {
      const path = [];
      for (let p = current; p; p = parents.get(key(p))) path.push(p);
      return path.reverse();
    }
    for (const next of legalMoves(world, current)) {
      if (parents.has(key(next))) continue;
      parents.set(key(next), current);
      queue.push(next);
    }
  }
  return null;
}
