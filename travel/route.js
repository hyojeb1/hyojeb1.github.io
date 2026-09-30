// 기기의 타임라인 좌표를 시간순 직선으로 잇고 날짜별로 되짚는다.
(() => {
  const element = document.querySelector('#route-map');
  const buttons = [...document.querySelectorAll('.route-days button')];
  const dayPanels = [...document.querySelectorAll('.map-trip .day')];
  function showDay(day, overview = false) {
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.day === day)));
    dayPanels.forEach((panel) => { panel.hidden = overview || (day !== 'all' && panel.dataset.day !== day); });
  }
  buttons.forEach((button) => button.addEventListener('click', () => showDay(button.dataset.day)));
  if (!window.maplibregl) {
    element.textContent = '지도를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.';
    return;
  }
  const data = JSON.parse(document.querySelector('#route-data').textContent);
  const pins = JSON.parse(document.querySelector('#event-pins').textContent);
  const visitPaths = JSON.parse(document.querySelector('#visit-paths')?.textContent || '{}');
  const map = new maplibregl.Map({
    container: element,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [139.8, 35.7], zoom: 10,
    scrollZoom: false,
    localIdeographFontFamily: 'sans-serif'
  });
  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  const slider = document.querySelector('#route-progress');
  const play = document.querySelector('#route-play');
  const speed = document.querySelector('#route-speed');
  const clock = document.querySelector('#route-time');
  const empty = { type: 'FeatureCollection', features: [] };
  let coords = [];
  let points = [];
  let frame = null;
  let position = 0;
  let lastFrame = 0;
  let markers = [];

  const line = (path) => ({
    type: 'FeatureCollection',
    features: path.length > 1 ? [{
      type: 'Feature', geometry: { type: 'LineString', coordinates: path }, properties: {}
    }] : []
  });

  const lines = (segments) => ({
    type: 'FeatureCollection',
    features: segments
      .filter((segment) => segment.length > 1)
      .map((segment) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: segment },
        properties: {}
      }))
  });
  const formatTime = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  function zoomFor(index) {
    const here = points[index].coord;
    let reach = 0;
    for (let i = Math.max(0, index - 3); i <= Math.min(points.length - 1, index + 3); i++) {
      const there = points[i].coord;
      const east = (there[0] - here[0]) * 111 * Math.cos(here[1] * Math.PI / 180);
      const north = (there[1] - here[1]) * 111;
      reach = Math.max(reach, Math.hypot(east, north));
    }
    return Math.max(5, Math.min(15, 15 - 1.35 * Math.log2(Math.max(1, reach))));
  }

  function pause() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    play.textContent = '▶';
    play.setAttribute('aria-label', '경로 재생');
  }

  function render(value, follow = false, snapZoom = false) {
    position = Math.max(0, Math.min(value, points.length - 1));
    const index = Math.floor(position);
    slider.value = index;
    const next = Math.min(index + 1, points.length - 1);
    const fraction = position - index;
    const coord = points[index].coord.map((v, i) => v + (points[next].coord[i] - v) * fraction);
    const visible = coords.slice(0, index + 1);
    if (fraction) visible.push(coord);
    map.getSource('progress').setData(line(visible));
    map.getSource('cursor').setData({
      type: 'Feature', geometry: { type: 'Point', coordinates: coord }, properties: {}
    });
    const a = Date.parse(points[index].time);
    const b = Date.parse(points[next].time);
    clock.value = formatTime.format(new Date(a + (b - a) * fraction));
    if (follow) {
      const target = zoomFor(index);
      const zoom = snapZoom ? target : map.getZoom() + (target - map.getZoom()) * 0.12;
      map.jumpTo({ center: coord, zoom });
    }
  }

  function tick(now) {
    if (lastFrame) {
      const i = Math.floor(position);
      const j = Math.min(i + 1, points.length - 1);
      const flight = Math.abs(points[i].coord[0] - points[j].coord[0]) > 1;
      render(position + Math.min(now - lastFrame, 50) / 1000 * Number(speed.value) * (flight ? 0.4 : 8), true);
    }
    lastFrame = now;
    if (position >= points.length - 1) pause();
    else frame = requestAnimationFrame(tick);
  }

  function select(day, keepJapanView = false) {
    pause();
    const dates = day === 'all' ? Object.keys(data) : [day];
    const selected = dates.flatMap((date) => data[date].flat()).sort((a, b) => a[0].localeCompare(b[0]));
    points = selected.map((p) => ({ time: p[0], coord: [p[2], p[1]] }));
    if (!points.length) return;
    coords = points.map((p) => p.coord);
    map.getSource('route').setData(line(coords));
    const selectedVisitPaths = dates.flatMap((date) => visitPaths[date] || []);
    map.getSource('visit').setData(lines(selectedVisitPaths));
    markers.forEach((marker) => marker.remove());
    const previous = [];
    markers = (day === 'all' ? [] : dates).flatMap((date) => pins[date].map(([number, lat, lon, id, title, kind = 'event']) => {
      const button = document.createElement('button');
      const placeOnly = kind === 'place' || number === null;
      button.type = 'button';
      button.className = kind === 'stop'
        ? 'event-pin stop-pin'
        : (placeOnly ? 'event-pin place-pin' : 'event-pin');
      button.textContent = placeOnly ? '·' : number;
      button.title = title;
      button.setAttribute(
        'aria-label',
        placeOnly ? `${date} · ${title}`
          : kind === 'stop' ? `${date} 순회 ${number}번 · ${title}`
          : `${date} ${number}번 · ${title}`
      );
      button.addEventListener('click', () => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      const overlap = previous.filter(([y, x]) => Math.abs(y - lat) < 0.00008 && Math.abs(x - lon) < 0.00008).length;
      previous.push([lat, lon]);
      return new maplibregl.Marker({ element: button, offset: [overlap * 30, 0] }).setLngLat([lon, lat]).addTo(map);
    }));
    slider.max = points.length - 1;
    render(0);
    if (!keepJapanView) {
      const bounds = points.reduce((box, p) => box.extend(p.coord), new maplibregl.LngLatBounds());
      dates.forEach((date) => pins[date].forEach(([, lat, lon]) => bounds.extend([lon, lat])));
      map.fitBounds(bounds, { padding: 24, maxZoom: 14, duration: 0 });
    }
    showDay(day, day === 'all');
  }

  map.on('load', () => {
    // 한국어 이름이 제공되는 지명만 한글로 표시한다.
    for (const layer of map.getStyle().layers) {
      if (layer.type === 'symbol' && JSON.stringify(layer.layout?.['text-field'] ?? '').includes('name')) {
        map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:ko'], ['get', 'name']]);
      }
    }
    map.addSource('route', { type: 'geojson', data: empty });
    map.addSource('visit', { type: 'geojson', data: empty });
    map.addSource('progress', { type: 'geojson', data: empty });
    map.addSource('cursor', { type: 'geojson', data: empty });
    map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#1a1a1c', 'line-opacity': 0.65, 'line-width': 5 } });
    map.addLayer({ id: 'visit-line', type: 'line', source: 'visit', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#535b63', 'line-width': 3, 'line-dasharray': [1, 2] } });
    map.addLayer({ id: 'progress-outline', type: 'line', source: 'progress', paint: { 'line-color': '#1a1a1c', 'line-width': 8 } });
    map.addLayer({ id: 'progress-line', type: 'line', source: 'progress', paint: { 'line-color': '#f1ec95', 'line-width': 5 } });
    map.addLayer({ id: 'cursor-dot', type: 'circle', source: 'cursor', paint: { 'circle-radius': 7, 'circle-color': '#f1ec95', 'circle-stroke-color': '#1a1a1c', 'circle-stroke-width': 2 } });
    buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.day)));
    slider.addEventListener('input', () => { pause(); render(Number(slider.value), true, true); });
    play.addEventListener('click', () => {
      if (frame !== null) return pause();
      if (position >= points.length - 1) render(0);
      play.textContent = '❚❚';
      play.setAttribute('aria-label', '경로 일시정지');
      render(position, true, true);
      frame = requestAnimationFrame(tick);
    });
    select(buttons[1].dataset.day, true);
  });
})();
