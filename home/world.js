// Chess coordinates: x increases a→h; y increases 1→8. Units are tiles, not pixels.
export const key = ({ x, y }) => `${x},${y}`;
export const same = (a, b) => a.x === b.x && a.y === b.y;
export function squareName({ x, y }) {
  let file = '';
  for (let n = x + 1; n > 0; n = Math.floor((n - 1) / 26)) file = String.fromCharCode(97 + (n - 1) % 26) + file;
  return `${file}${y + 1}`;
}

export function createWorld(data) {
  const inside = p => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < data.width && p.y < data.height;
  if (!Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 1 || data.height < 1) throw Error('Invalid world size');
  const objects = data.objects ?? [];
  const destinations = data.destinations ?? [];
  const blocked = new Set([...(data.blocked ?? []), ...objects.filter(o => o.blocksLanding)].map(key));
  if (!inside(data.start) || blocked.has(key(data.start))) throw Error('Invalid knight start');
  if (objects.some(o => !inside(o)) || (data.blocked ?? []).some(p => !inside(p)) || (data.paths ?? []).some(p => !inside(p))) throw Error('Object outside world');
  if (destinations.some(d => !inside(d) || blocked.has(key(d)))) throw Error('Destination must have a free landing tile');
  if (new Set(destinations.map(d => d.id)).size !== destinations.length) throw Error('Duplicate destination id');
  if (new Set(destinations.map(key)).size !== destinations.length) throw Error('Duplicate destination tile');
  return { ...data, objects, destinations, blocked };
}

export const world = createWorld({
  width: 8, height: 8,
  start: { x: 1, y: 0 },
  paths: [[1, 0], [2, 1], [3, 2], [4, 2], [4, 3], [4, 4], [3, 5], [2, 5], [5, 5], [6, 5]].map(([x, y]) => ({ x, y })),
  destinations: [
    { id: 'portfolio', x: 4, y: 2, kind: 'workshop', title: '게임 개발 공방', short: '공방', number: '01', color: '#b94630', url: '/portfolio/', description: '게임과 엔진, 그리고 만드는 도구들. 직접 만든 작업물을 모아 두었습니다.' },
    { id: 'travel', x: 2, y: 5, kind: 'station', title: '여행역', short: '여행', number: '02', color: '#23745b', url: '/travel/', description: '다녀온 곳에서 가져온 사진과 메모. 잠깐 다른 풍경으로 떠나 보세요.' },
    { id: 'chess', x: 6, y: 5, kind: 'observatory', title: '체스 전망대', short: '체스', number: '03', color: '#6551a0', url: '/chess/', description: '한 수씩 쌓인 기록을 들여다보는 곳. 내 체스 전적과 오프닝을 살펴봅니다.' },
  ],
  objects: [
    { x: 0, y: 4, kind: 'tree', blocksLanding: true },
    { x: 1, y: 3, kind: 'pine', blocksLanding: true },
    { x: 3, y: 6, kind: 'tree', blocksLanding: true },
    { x: 7, y: 7, kind: 'pine', blocksLanding: true },
    { x: 6, y: 0, kind: 'tree', blocksLanding: true },
    { x: 7, y: 3, kind: 'tree', blocksLanding: true },
    { x: 0, y: 7, kind: 'pine', blocksLanding: true },
    { x: 5, y: 3, kind: 'pond', blocksLanding: true },
    { x: 5, y: 4, kind: 'pond', blocksLanding: true },
    { x: 4, y: 6, kind: 'lab', blocksLanding: true },
    { x: 3, y: 2, kind: 'lamp' },
    { x: 1, y: 5, kind: 'luggage' },
    { x: 7, y: 5, kind: 'mushroom' },
    { x: 2, y: 1, kind: 'flowers' },
    { x: 0, y: 2, kind: 'flowers' },
    { x: 4, y: 4, kind: 'flowers' },
    { x: 6, y: 7, kind: 'flowers' },
    { x: 4, y: 0, kind: 'mushroom' },
    { x: 1, y: 7, kind: 'flowers' },
    { x: 6, y: 2, kind: 'bench' },
  ],
});
