// Google Takeout에서 추린 경로를 날짜별로 되짚는다. 비어 있는 구간은 선으로 잇지 않는다.
(() => {
  const element = document.querySelector('#route-map');
  if (!element) return;
  if (!window.L) {
    element.textContent = '지도를 불러오지 못했습니다.';
    return;
  }

  const data = JSON.parse(document.querySelector('#route-data').textContent);
  const map = L.map(element, { scrollWheelZoom: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const slider = document.querySelector('#route-progress');
  const play = document.querySelector('#route-play');
  const speed = document.querySelector('#route-speed');
  const clock = document.querySelector('#route-time');
  const buttons = [...document.querySelectorAll('.route-days button')];
  const dayPanels = [...document.querySelectorAll('.map-trip .day')];
  const cursor = L.circleMarker([0, 0], {
    radius: 7, color: '#1a1a1c', weight: 2, fillColor: '#f1ec95', fillOpacity: 1
  }).addTo(map);
  let parts = [];
  let points = [];
  let frame = null;
  let position = 0;
  let lastFrame = 0;

  function pause() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    play.textContent = '▶';
    play.setAttribute('aria-label', '경로 재생');
  }

  function render(value) {
    position = Math.max(0, Math.min(value, points.length - 1));
    const index = Math.floor(position);
    slider.value = index;
    let offset = 0;
    for (const part of parts) {
      const count = Math.max(0, Math.min(index - offset + 1, part.coords.length));
      const visible = part.coords.slice(0, count);
      part.outline.setLatLngs(visible);
      part.line.setLatLngs(visible);
      offset += part.coords.length;
    }
    cursor.setLatLng(points[index].coord);
    const time = new Date(points[index].time);
    clock.value = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(time);
  }

  function tick(now) {
    if (lastFrame) render(position + (now - lastFrame) / 1000 * Number(speed.value) * 8);
    lastFrame = now;
    if (position >= points.length - 1) pause();
    else frame = requestAnimationFrame(tick);
  }

  function select(day) {
    pause();
    for (const part of parts) {
      map.removeLayer(part.base);
      map.removeLayer(part.outline);
      map.removeLayer(part.line);
    }
    parts = [];
    points = [];
    const dates = day === 'all' ? Object.keys(data) : [day];
    for (const date of dates) {
      for (const path of data[date]) {
        const coords = path.map((p) => [p[1], p[2]]);
        if (!coords.length) continue;
        parts.push({
          coords,
          base: L.polyline(coords, { color: '#1a1a1c', opacity: 0.65, weight: 5 }).addTo(map),
          outline: L.polyline([], { color: '#1a1a1c', weight: 8 }).addTo(map),
          line: L.polyline([], { color: '#f1ec95', weight: 5 }).addTo(map)
        });
        points.push(...path.map((p) => ({ time: p[0], coord: [p[1], p[2]] })));
      }
    }
    if (!points.length) return;
    slider.max = points.length - 1;
    render(0);
    map.fitBounds(L.latLngBounds(points.map((p) => p.coord)), { padding: [24, 24] });
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.day === day)));
    dayPanels.forEach((panel) => { panel.hidden = panel.dataset.day !== day; });
  }

  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.day)));
  slider.addEventListener('input', () => { pause(); render(Number(slider.value)); });
  play.addEventListener('click', () => {
    if (frame !== null) return pause();
    if (position >= points.length - 1) render(0);
    play.textContent = '❚❚';
    play.setAttribute('aria-label', '경로 일시정지');
    frame = requestAnimationFrame(tick);
  });
  select('all');
})();
