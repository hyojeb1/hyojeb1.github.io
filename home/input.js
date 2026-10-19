// Pointer Events unify mouse/touch. No click handler: a drag can never become a tap.
export function attachInput(canvas, { tap, pan, zoom, changed }) {
  const pointers = new Map();
  let dragged = false, multi = false, origin = null;
  const local = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const pair = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? { distance: Math.hypot(a.x - b.x, a.y - b.y), center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } } : null;
  };
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (pointers.size === 0) { dragged = false; multi = false; origin = local(e); }
    pointers.set(e.pointerId, local(e));
    if (pointers.size > 1) multi = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-grabbing');
  });
  canvas.addEventListener('pointermove', e => {
    const previous = pointers.get(e.pointerId);
    if (!previous) return;
    const before = pair(), next = local(e);
    pointers.set(e.pointerId, next);
    if (pointers.size > 1) {
      const after = pair();
      if (before?.distance > 1 && after?.distance > 1) {
        pan(after.center.x - before.center.x, after.center.y - before.center.y);
        zoom(after.distance / before.distance, after.center);
      }
      dragged = true;
    } else {
      const wasDragging = dragged;
      if (origin && Math.hypot(next.x - origin.x, next.y - origin.y) > (e.pointerType === 'touch' ? 10 : 6)) dragged = true;
      if (dragged && !multi) pan(next.x - (wasDragging ? previous.x : origin.x), next.y - (wasDragging ? previous.y : origin.y));
    }
    if (dragged) changed();
  });
  function end(e) {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    // Check final displacement too: a browser may coalesce the last move event.
    const distance = origin ? Math.hypot(p.x - origin.x, p.y - origin.y) : Infinity;
    pointers.delete(e.pointerId);
    if (e.type === 'pointerup' && !dragged && !multi && distance <= (e.pointerType === 'touch' ? 10 : 6)) tap(p);
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (!pointers.size) { canvas.classList.remove('is-grabbing'); origin = null; }
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', e => {
    if (pointers.has(e.pointerId)) { pointers.delete(e.pointerId); multi = true; }
    if (!pointers.size) canvas.classList.remove('is-grabbing');
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    zoom(Math.exp(-Math.max(-150, Math.min(150, e.deltaY * (e.deltaMode === 1 ? 16 : 1))) * 0.002), local(e)); changed();
  }, { passive: false });
}
