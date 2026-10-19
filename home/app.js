import { world, key, same, squareName } from './world.js';
import { legalMoves, shortestPath } from './rules.js';
import { Movement } from './movement.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { attachInput } from './input.js';

const $ = id => document.getElementById(id);
function boot() {
  const canvas = $('world-canvas'), stage = $('world-stage');
  const camera = new Camera(world), renderer = new Renderer(canvas, world, camera);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const panel = $('place-panel'), map = $('tactical-map');
  let selected = null, frame = 0, lastTime = 0, returnFocus = null;
  const cells = new Map();
  const movement = new Movement(world, onMovement);
  movement.reducedMotion = motion.matches;

  function announce(message) { $('announcement').textContent = message; }
  function invalidate() { if (!frame && !document.hidden) frame = requestAnimationFrame(draw); }
  function draw(now) {
    frame = 0;
    movement.tick(now);
    const knight = movement.sample(now);
    camera.follow(knight);
    const cameraMoving = camera.step(lastTime ? now - lastTime : 16, motion.matches);
    lastTime = now;
    const path = movement.busy ? [movement.position, movement.flight.to, ...movement.queue] : selected ? shortestPath(world, movement.position, selected) : null;
    renderer.draw({ knight, legal: movement.busy ? [] : legalMoves(world, movement.position), selected, path });
    $('zoom-value').textContent = `${Math.round(camera.zoom * 100)}%`;
    $('camera-home').setAttribute('aria-pressed', String(camera.following));
    if (movement.busy || cameraMoving) invalidate();
  }
  function updateMoves() {
    const activeSquare = document.activeElement?.dataset.move;
    const options = legalMoves(world, movement.position);
    $('move-options').replaceChildren(...options.map(p => {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = squareName(p); button.dataset.move = key(p);
      button.setAttribute('aria-label', `${squareName(p)} 칸으로 나이트 이동`);
      button.disabled = movement.busy;
      button.addEventListener('click', () => movement.moveTo(p));
      return button;
    }));
    if (activeSquare && !movement.busy) $('move-options').querySelector('button')?.focus({ preventScroll: true });
  }
  function updatePanel() {
    if (!selected) return;
    const path = shortestPath(world, movement.position, selected);
    const atPlace = same(movement.position, selected);
    $('route-note').textContent = !path ? '이 장소까지 가는 길이 없어요. 페이지는 바로 열 수 있어요.' : atPlace ? '도착했어요! 아래에서 페이지를 열어 보세요.' : `현재 위치에서 ${path.length - 1}번의 나이트 점프 · ${squareName(selected)}`;
    $('travel-to').disabled = movement.busy || !path || atPlace;
    $('travel-to').textContent = movement.busy ? '나이트가 이동 중이에요' : atPlace ? '이곳에 도착했어요' : '나이트로 찾아가기';
  }
  function updateMap() {
    const legal = new Set(legalMoves(world, movement.position).map(key));
    for (const [id, cell] of cells) {
      const p = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
      const destination = world.destinations.find(d => same(d, p));
      const knight = same(p, movement.position), blocked = world.blocked.has(id), valid = !movement.busy && legal.has(id);
      cell.className = `map-cell${(p.x + p.y) % 2 ? ' is-dark' : ''}${blocked ? ' is-blocked' : ''}${valid ? ' is-legal' : ''}${destination ? ' is-place' : ''}${knight ? ' is-knight' : ''}${selected && same(selected, p) ? ' is-selected' : ''}`;
      cell.firstChild.textContent = knight ? 'N' : destination ? destination.number : blocked ? '×' : valid ? '+' : '';
      cell.setAttribute('aria-label', `${squareName(p)}${knight ? ', 나이트 현재 위치' : ''}${destination ? `, ${destination.title}` : ''}${blocked ? ', 착지 불가' : valid ? ', 이동 가능' : ''}`);
      if (knight) cell.setAttribute('aria-current', 'location'); else cell.removeAttribute('aria-current');
    }
  }
  function onMovement(kind) {
    if (kind === 'start') {
      $('activity-label').textContent = '폴짝, 이동 중';
      $('cancel-route').hidden = false;
    }
    if (kind === 'land' || kind === 'arrive') {
      $('position-label').textContent = squareName(movement.position);
      $('activity-label').textContent = '다음 한 수는 어디로?';
      const place = world.destinations.find(d => same(d, movement.position));
      if (kind === 'arrive') {
        $('cancel-route').hidden = true;
        announce(`${squareName(movement.position)}에 ${place ? `${place.title} 도착. 페이지는 장소 패널에서 열 수 있어요.` : '도착. 다음 이동 칸을 선택하세요.'}`);
      }
    }
    if (kind === 'cancel') {
      $('activity-label').textContent = movement.busy ? '이번 점프 후 멈춰요' : '이동을 멈췄어요';
      $('cancel-route').hidden = true;
      announce('자동 이동을 중단합니다. 진행 중인 점프는 안전하게 착지합니다.');
    }
    updateMoves(); updatePanel(); updateMap(); invalidate();
  }
  function selectPlace(destination, trigger = document.activeElement) {
    if (map.open) map.close();
    selected = destination; returnFocus = trigger instanceof HTMLElement ? trigger : $('map-open');
    $('place-title').textContent = destination.title;
    $('place-description').textContent = destination.description;
    $('place-number').textContent = `${destination.number} / ${squareName(destination)} / PLACE`;
    $('page-open').href = destination.url;
    updatePanel(); updateMap();
    if (!panel.open) panel.showModal();
    $('place-close').focus({ preventScroll: true });
    invalidate();
  }
  function closePanel(restore = true) {
    if (panel.open) panel.close();
    if (restore && returnFocus?.isConnected && !returnFocus.closest('dialog:not([open])')) returnFocus.focus({ preventScroll: true });
    else if (restore) $('map-open').focus({ preventScroll: true });
  }
  function returnToKnight() {
    camera.following = true; camera.follow(movement.sample(performance.now()), motion.matches); invalidate();
  }
  attachInput(canvas, {
    tap(p) {
      const place = renderer.hit(p);
      if (place) { selectPlace(place, $('map-open')); return; }
      if (panel.open) { closePanel(false); return; }
      const to = camera.tile(p);
      if (!movement.moveTo(to)) announce(movement.busy ? '이동이 끝난 뒤 다음 칸을 골라 주세요.' : '+ 표시가 있는 칸으로 이동할 수 있어요.');
    },
    pan: (dx, dy) => camera.pan(dx, dy), zoom: (factor, p) => camera.zoomAt(factor, p), changed: invalidate,
  });
  $('camera-home').addEventListener('click', returnToKnight);
  $('zoom-in').addEventListener('click', () => { camera.zoomAt(1.2); invalidate(); });
  $('zoom-out').addEventListener('click', () => { camera.zoomAt(1 / 1.2); invalidate(); });
  $('cancel-route').addEventListener('click', () => { movement.cancel(); $('camera-home').focus({ preventScroll: true }); });
  $('place-close').addEventListener('click', () => closePanel());
  $('travel-to').addEventListener('click', () => {
    if (selected && movement.travelTo(selected)) { closePanel(false); returnToKnight(); $('cancel-route').focus({ preventScroll: true }); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !map.open) {
      if (panel.open) closePanel();
      else if (movement.busy) movement.cancel();
    }
  });
  $('map-close').addEventListener('click', () => map.close());
  map.addEventListener('close', () => { if (!panel.open) $('map-open').focus({ preventScroll: true }); });
  $('map-open').addEventListener('click', () => {
    closePanel(false); updateMap(); $('map-message').textContent = `현재 위치 ${squareName(movement.position)}`;
    for (const cell of cells.values()) cell.tabIndex = -1;
    const current = cells.get(key(movement.position)); current.tabIndex = 0;
    map.showModal(); current.focus();
  });
  const grid = $('map-grid'); grid.style.setProperty('--columns', world.width);
  for (let y = world.height - 1; y >= 0; y--) for (let x = 0; x < world.width; x++) {
    const cell = document.createElement('button'); cell.type = 'button'; cell.tabIndex = -1; cell.dataset.x = x; cell.dataset.y = y;
    const content = document.createElement('span'), label = document.createElement('small'); label.textContent = squareName({ x, y });
    cell.append(content, label); grid.append(cell); cells.set(key({ x, y }), cell);
    cell.addEventListener('click', () => {
      const destination = world.destinations.find(d => d.x === x && d.y === y);
      if (destination) { selectPlace(destination, $('map-open')); return; }
      const moved = movement.moveTo({ x, y });
      $('map-message').textContent = moved ? `${squareName({ x, y })}로 이동합니다.` : '이동이 끝난 뒤 + 표시가 있는 칸을 골라 주세요.';
    });
    cell.addEventListener('keydown', e => {
      const delta = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
      let next = null;
      if (delta) next = cells.get(key({ x: x + delta[0], y: y + delta[1] }));
      if (e.key === 'Home') next = cells.get(key({ x: 0, y }));
      if (e.key === 'End') next = cells.get(key({ x: world.width - 1, y }));
      if (delta || e.key === 'Home' || e.key === 'End') e.preventDefault();
      if (next) { cell.tabIndex = -1; next.tabIndex = 0; next.focus(); }
    });
  }
  for (const destination of world.destinations) {
    for (const container of [$('place-shortcuts'), $('map-places')]) {
      const button = document.createElement('button'); button.type = 'button';
      const number = document.createElement('small'); number.textContent = destination.number;
      button.append(number, document.createTextNode(` ${destination.title}`));
      button.setAttribute('aria-haspopup', 'dialog'); button.addEventListener('click', () => selectPlace(destination, button));
      container.append(button);
    }
  }
  motion.addEventListener('change', () => { movement.reducedMotion = motion.matches; if (motion.matches && movement.flight) movement.flight.duration = 0; invalidate(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { lastTime = 0; invalidate(); } });
  function resize() {
    const r = stage.getBoundingClientRect(); camera.resize(r.width, r.height); renderer.resize(r.width, r.height);
    camera.follow(movement.sample(performance.now()), true); invalidate();
  }
  new ResizeObserver(resize).observe(stage);
  canvas.hidden = false; $('world-fallback').hidden = true;
  for (const id of ['scene-controls', 'scene-status', 'explorer-tools']) $(id).hidden = false;
  $('position-label').textContent = squareName(world.start);
  updateMoves(); updateMap(); resize();
  document.fonts?.ready.then(invalidate);
}

// Keep old portfolio bookmarks useful after the root changes identity.
if (['#works', '#about', '#contact'].includes(location.hash)) location.replace(`/portfolio/${location.hash}`);
else try { boot(); }
catch (error) {
  console.error('Home world could not start:', error);
  $('world-canvas').hidden = true; $('world-fallback').hidden = false;
  for (const id of ['scene-controls', 'scene-status', 'explorer-tools']) $(id).hidden = true;
}
