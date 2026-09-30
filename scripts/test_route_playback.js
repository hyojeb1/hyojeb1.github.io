// 브라우저 없이 직선 연결과 카메라 추적을 확인한다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const makeNode = (day) => ({
  dataset: { day }, hidden: false, value: 0, handlers: {},
  addEventListener(event, fn) { this.handlers[event] = fn; },
  setAttribute() {}
});
const buttons = ['all', '2026-09-17', '2026-09-19', '2026-09-22'].map(makeNode);
const panels = [makeNode('2026-09-17'), makeNode('2026-09-19'), makeNode('2026-09-22')];
const mapElement = makeNode();
const routeData = makeNode();
const pinData = makeNode();
const visitData = makeNode();
pinData.textContent = JSON.stringify({
  '2026-09-17': [[1, 37.5665, 126.978, 'd1e1', '서울 출발']],
  '2026-09-19': [
    [1, 35.70, 139.80, 'd3e1', '숙소 출발', 'event'],
    [1, 35.699, 139.799, 'd3e1s1', '순회 지점', 'stop'],
    [2, 35.646, 140.034, 'd3e2', 'TGS', 'event']
  ],
  '2026-09-22': [[1, 35.77, 140.38, 'd6e1', '나리타']]
});
visitData.textContent = JSON.stringify({
  '2026-09-17': [],
  '2026-09-19': [[[139.80, 35.70], [139.799, 35.699], [140.034, 35.646]]],
  '2026-09-22': []
});
routeData.textContent = JSON.stringify({
  '2026-09-17': [
    [['2026-09-17T07:00:00+09:00', 37.45, 126.45]],
    [['2026-09-17T10:40:00+09:00', 35.77, 140.38]]
  ],
  '2026-09-22': [
    [['2026-09-22T10:40:00+09:00', 35.77, 140.38]],
    [['2026-09-22T13:46:00+09:00', 37.45, 126.45]]
  ],
  '2026-09-19': [
    [['2026-09-19T06:00:00+09:00', 35.70, 139.80],
     ['2026-09-19T06:20:00+09:00', 35.68, 139.90],
     ['2026-09-19T07:00:00+09:00', 35.65, 140.03],
     ['2026-09-19T08:00:00+09:00', 35.646, 140.034],
     ['2026-09-19T09:00:00+09:00', 35.646, 140.036],
     ['2026-09-19T10:00:00+09:00', 35.647, 140.037],
     ['2026-09-19T11:00:00+09:00', 35.647, 140.038],
     ['2026-09-19T12:00:00+09:00', 35.647, 140.039]]
  ]
});
const nodes = {
  '#route-map': mapElement, '#route-data': routeData, '#event-pins': pinData,
  '#visit-paths': visitData,
  '#route-progress': makeNode(), '#route-play': makeNode(),
  '#route-speed': makeNode(), '#route-time': makeNode()
};
nodes['#route-speed'].value = 1;
let map;
let scheduled;
class FakeMap {
  constructor(options) { map = this; this.center = options.center; this.zoom = options.zoom; this.handlers = {}; this.sources = {}; }
  addControl() {}
  on(event, fn) { this.handlers[event] = fn; }
  getStyle() { return { layers: [] }; }
  addSource(id, source) { this.sources[id] = { data: source.data, setData(data) { this.data = data; } }; }
  getSource(id) { return this.sources[id]; }
  addLayer() {}
  getZoom() { return this.zoom; }
  jumpTo({ center, zoom }) { this.center = center; this.zoom = zoom; }
  fitBounds() {}
}
class FakeBounds { extend() { return this; } }
let markers = [];
class FakeMarker {
  constructor(options) { this.element = options.element; }
  setLngLat(point) { this.point = point; return this; }
  addTo() { markers.push(this); return this; }
  remove() { markers = markers.filter((marker) => marker !== this); }
}
const context = {
  window: { maplibregl: { Map: FakeMap, Marker: FakeMarker, NavigationControl: class {}, LngLatBounds: FakeBounds } },
  maplibregl: { Map: FakeMap, Marker: FakeMarker, NavigationControl: class {}, LngLatBounds: FakeBounds },
  document: {
    querySelector: (selector) => nodes[selector],
    querySelectorAll: (selector) => selector === '.route-days button' ? buttons : panels,
    createElement: () => makeNode()
  },
  requestAnimationFrame: (fn) => { scheduled = fn; return 1; }, cancelAnimationFrame() {},
  Intl, Date, JSON
};
vm.runInNewContext(fs.readFileSync('travel/route.js', 'utf8'), context);
map.handlers.load();
assert.deepEqual(Array.from(map.center), [139.8, 35.7]); // 첫 화면은 일본
assert.equal(map.zoom, 10);
assert.equal(markers.length, 1);
assert.equal(markers[0].element.textContent, 1);
assert.equal(map.sources.route.data.features[0].geometry.coordinates.length, 2); // 비행 구간 연결
nodes['#route-progress'].value = 1;
nodes['#route-progress'].handlers.input();
assert.deepEqual(Array.from(map.center), [140.38, 35.77]); // 발자국을 따라감
assert.equal(map.zoom, 5); // 국가 간 비행은 넓게
nodes['#route-progress'].value = 0;
nodes['#route-progress'].handlers.input();
nodes['#route-play'].handlers.click();
scheduled(1000);
scheduled(1016);
assert.ok(map.center[0] > 126.45 && map.center[0] < 140.38); // 비행 중에도 따라감
assert.equal(map.sources.progress.data.features[0].geometry.coordinates.length, 2);
buttons[3].handlers.click();
assert.equal(map.sources.route.data.features[0].geometry.coordinates.length, 2); // 귀국편도 연결
buttons[2].handlers.click();
assert.equal(markers.length, 3);
assert.equal(map.sources.visit.data.features.length, 1);
assert.deepEqual(
  Array.from(map.sources.visit.data.features[0].geometry.coordinates[1]),
  [139.799, 35.699]
);
assert.equal(markers[0].element.className, 'event-pin');
assert.equal(markers[1].element.className, 'event-pin stop-pin');
assert.equal(markers[1].element.textContent, 1);
nodes['#route-progress'].value = 1;
nodes['#route-progress'].handlers.input();
assert.ok(map.zoom < 12); // 도쿄에서 치바로 가는 동안 줌아웃
nodes['#route-progress'].value = 7;
nodes['#route-progress'].handlers.input();
assert.ok(map.zoom > 14); // 현지에서 맴돌 때 줌인
