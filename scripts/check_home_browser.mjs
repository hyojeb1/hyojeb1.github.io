// Dependency-free Chrome DevTools test runner. Only an isolated localhost tab is used.
// Start `python -m http.server 8765 --bind 127.0.0.1` before running this script.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.HYOJE_TEST_URL || 'http://127.0.0.1:8765/';
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname), 'Tests are local-only');
const chrome = process.env.HYOJE_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
await access(chrome);
const profile = await mkdtemp(join(tmpdir(), 'hyoje-chrome-'));
const output = resolve('Playground/verification'); await mkdir(output, { recursive: true });
const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--password-store=basic', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let launchErrors = ''; child.stderr.on('data', chunk => { launchErrors += String(chunk).slice(0, 1000); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(check, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await check(); if (value) return value; await sleep(50); }
  throw Error('Timed out waiting for local browser state');
}
let socket;
const reports = [];
try {
  const active = await until(async () => { try { return await readFile(join(profile, 'DevToolsActivePort'), 'utf8'); } catch { return null; } }, 15000);
  const port = Number(active.split('\n')[0]);
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const target = targets.find(t => t.type === 'page'); assert.ok(target);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map(), exceptions = [], failedResponses = [];
  socket.addEventListener('message', e => {
    const message = JSON.parse(String(e.data));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id); clearTimeout(timer); pending.delete(message.id);
      if (message.error) reject(Error(JSON.stringify(message.error))); else resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.text);
    if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) failedResponses.push(message.params.response.url);
  });
  function call(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async function capture(name) {
    const r = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(output, `${name}.png`), Buffer.from(r.data, 'base64'));
  }
  async function click(selector) {
    const r = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'center'}); const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...r, button: 'left', clickCount: 1 });
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...r, button: 'left', clickCount: 1 });
  }
  async function load(width, height, mobile) {
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await call('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: 5 });
    await call('Page.navigate', { url: base });
    await until(() => evaluate(`document.querySelector('#world-canvas')?.hidden===false && document.querySelectorAll('.map-cell').length===64`));
    await evaluate('document.fonts.ready.then(()=>true)'); await sleep(100);
  }
  async function check(name, action) { await action(); reports.push(name); console.log(`PASS: ${name}`); }
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable');
  await load(1440, 1050, false);
  await check('desktop home initializes, has direct links and no horizontal overflow', async () => {
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('.top-nav a')].map(a=>a.getAttribute('href'))`), ['/portfolio/', '/travel/', '/chess/']);
    await capture('desktop-home');
  });
  await check('place panel and direct page link work before any knight move', async () => {
    await click('#place-shortcuts button');
    assert.equal(await evaluate(`document.querySelector('#place-panel').open`), true);
    assert.equal(await evaluate(`document.querySelector('#page-open').getAttribute('href')`), '/portfolio/');
    assert.equal(await evaluate(`document.querySelector('#position-label').textContent`), 'b1');
    await capture('desktop-place');
    await click('#place-close');
  });
  await check('tactical map keyboard movement and one legal hop', async () => {
    await click('#map-open');
    assert.equal(await evaluate(`document.activeElement.getAttribute('aria-current')`), 'location');
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowUp', code: 'ArrowUp' });
    assert.equal(await evaluate(`document.activeElement.dataset.y`), '1');
    await click('.map-cell[data-x="2"][data-y="2"]');
    await until(() => evaluate(`document.querySelector('#position-label').textContent==='c3'`));
    await capture('desktop-map');
    await click('#map-close');
  });
  await check('automatic shortest route, cancellation and re-route', async () => {
    await click('#place-shortcuts button:nth-child(3)'); await click('#travel-to');
    await click('#cancel-route');
    await until(() => evaluate(`document.querySelector('#cancel-route').hidden`));
    await sleep(600);
    const stopped = await evaluate(`document.querySelector('#position-label').textContent`); await sleep(600);
    assert.equal(await evaluate(`document.querySelector('#position-label').textContent`), stopped);
    await click('#place-shortcuts button:nth-child(2)'); await click('#travel-to');
    await until(() => evaluate(`document.querySelector('#position-label').textContent==='c6' && document.querySelector('#cancel-route').hidden`));
  });
  for (const [width, height] of [[390, 844], [360, 740], [320, 650], [844, 390]]) {
    await load(width, height, true);
    await check(`mobile viewport ${width}x${height}: no overflow, controls and sheet fit`, async () => {
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      assert.equal(await evaluate(`[...document.querySelectorAll('.scene-controls button')].every(b=>{const r=b.getBoundingClientRect();return r.width>=44 && r.height>=44})`), true);
      await capture(`mobile-${width}-home`);
      await click('#place-shortcuts button:nth-child(2)');
      assert.equal(await evaluate(`(()=>{const r=document.querySelector('#place-panel').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight})()`), true);
      assert.equal(await evaluate(`(()=>{const b=document.querySelector('#page-open'),r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})()`), true, 'Sheet actions must not be covered by page cards');
      await capture(`mobile-${width}-sheet`);
      await click('#place-close');
      await click('#map-open');
      assert.equal(await evaluate(`(()=>{const d=document.querySelector('#tactical-map');const r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&d.scrollWidth<=d.clientWidth})()`), true);
      await capture(`mobile-${width}-map`); await click('#map-close');
    });
  }
  await load(390, 844, true);
  await check('trusted emulated touch selects a legal canvas tile and follows its jump', async () => {
    await evaluate(`document.querySelector('#world-stage').scrollIntoView({block:'center'})`);
    const p = await evaluate(`(async()=>{const {Camera}=await import('/home/camera.js'),{world}=await import('/home/world.js');const c=new Camera(world),s=document.querySelector('#world-stage').getBoundingClientRect(),r=document.querySelector('#world-canvas').getBoundingClientRect();c.resize(s.width,s.height);c.follow(world.start,true);const p=c.screen({x:2,y:2});return {x:r.x+p.x,y:r.y+p.y}})()`);
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150); await capture('mobile-knight-jump');
    await until(() => evaluate(`document.querySelector('#position-label').textContent==='c3'`));
    await sleep(500);
    assert.equal(await evaluate(`document.querySelector('#camera-home').getAttribute('aria-pressed')`), 'true');
  });
  await check('trusted canvas building touch opens the matching place panel', async () => {
    const p = await evaluate(`(async()=>{const {Camera}=await import('/home/camera.js'),{world}=await import('/home/world.js');const c=new Camera(world),s=document.querySelector('#world-stage').getBoundingClientRect(),r=document.querySelector('#world-canvas').getBoundingClientRect();c.resize(s.width,s.height);c.follow({x:2,y:2},true);const p=c.screen(world.destinations[0],65);return {x:r.x+p.x,y:r.y+p.y}})()`);
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...p, id: 1 }] });
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await until(() => evaluate(`document.querySelector('#place-panel').open`));
    assert.equal(await evaluate(`document.querySelector('#place-title').textContent`), '게임 개발 공방');
    await click('#place-close');
  });
  await load(390, 844, true);
  await evaluate(`document.querySelector('#world-stage').scrollIntoView({block:'center'})`);
  const rect = await evaluate(`(()=>{const r=document.querySelector('#world-canvas').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`);
  const x = rect.x + rect.w / 2, y = Math.max(100, rect.y + rect.h / 2);
  await check('trusted emulated touch drag does not move the knight or open a panel', async () => {
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 65, y: y + 20, id: 1 }] });
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(100);
    assert.equal(await evaluate(`document.querySelector('#position-label').textContent`), 'b1');
    assert.equal(await evaluate(`document.querySelector('#place-panel').open`), false);
    assert.equal(await evaluate(`document.querySelector('#camera-home').getAttribute('aria-pressed')`), 'false');
  });
  await check('trusted emulated pinch changes zoom and recenter restores follow', async () => {
    const before = await evaluate(`document.querySelector('#zoom-value').textContent`);
    await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 1 }, { x: x + 35, y, id: 2 }] });
    await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 70, y, id: 1 }, { x: x + 70, y, id: 2 }] });
    await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(100);
    assert.notEqual(await evaluate(`document.querySelector('#zoom-value').textContent`), before);
    await click('#camera-home'); await sleep(500);
    assert.equal(await evaluate(`document.querySelector('#camera-home').getAttribute('aria-pressed')`), 'true');
  });
  await check('reduced motion still permits complete auto-travel', async () => {
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await click('#place-shortcuts button'); await click('#travel-to');
    await until(() => evaluate(`document.querySelector('#position-label').textContent==='e3' && document.querySelector('#cancel-route').hidden`));
  });
  await check('portfolio, existing pages and resources load', async () => {
    for (const path of ['/portfolio/', '/works/dog.html', '/works/aurora.html', '/travel/', '/chess/']) {
      assert.equal((await fetch(new URL(path, base))).status, 200);
    }
  });
  await check('rendering becomes idle after movement and camera settle', async () => {
    await sleep(500);
    await evaluate(`window.__homeFrames=0;window.__originalRaf=requestAnimationFrame;window.requestAnimationFrame=callback=>{window.__homeFrames++;return window.__originalRaf(callback)}`);
    await sleep(250);
    assert.equal(await evaluate('window.__homeFrames'), 0);
  });
  assert.deepEqual(exceptions, [], 'Uncaught browser errors');
  assert.deepEqual(failedResponses, [], 'Failed browser resources');
  await check('migrated portfolio renders all six cards and its local media on desktop and mobile', async () => {
    for (const [width, height, mobile] of [[1440, 1050, false], [390, 844, true]]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await call('Page.navigate', { url: new URL('/portfolio/', base).href });
      await until(() => evaluate(`document.querySelectorAll('article.card').length===6`));
      await evaluate('document.fonts.ready.then(()=>true)');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await capture(`portfolio-${width}`);
    }
  });
  await check('legacy portfolio anchor bookmarks reach the new portfolio', async () => {
    await call('Page.navigate', { url: new URL('/#works', base).href });
    await until(() => evaluate(`location.pathname==='/portfolio/' && location.hash==='#works'`));
  });
  await check('existing chess dashboard still loads its local data and module', async () => {
    await call('Page.navigate', { url: new URL('/chess/', base).href });
    await until(() => evaluate(`document.querySelector('#filters')?.hidden===false`));
    assert.equal(await evaluate(`document.querySelector('#load-error').hidden`), true);
    await capture('existing-chess');
  });
  assert.deepEqual(exceptions, [], 'Uncaught errors in preserved pages');
  assert.deepEqual(failedResponses, [], 'Failed resources in preserved pages');
  await check('Canvas failure leaves ordinary site navigation usable', async () => {
    await call('Page.addScriptToEvaluateOnNewDocument', { source: `HTMLCanvasElement.prototype.getContext=function(){return null}` });
    await call('Page.navigate', { url: base });
    await until(() => evaluate(`document.querySelector('#world-fallback') && !document.querySelector('#world-fallback').hidden`));
    assert.equal(await evaluate(`document.querySelector('#world-canvas').hidden`), true);
    assert.equal(await evaluate(`document.querySelectorAll('.destination-card[href]').length`), 3);
    await capture('canvas-fallback');
  });
  await writeFile(join(output, 'browser-results.json'), JSON.stringify({ testedAt: new Date().toISOString(), browser: 'Headless Chrome via CDP; mobile emulation, not a physical phone', passed: reports }, null, 2));
  console.log(`All ${reports.length} browser scenarios passed; screenshots: Playground/verification/`);
  await call('Browser.close').catch(() => {});
} catch (error) {
  await writeFile(join(output, 'browser-failure.txt'), `${error.stack}\n${launchErrors.slice(-3000)}`);
  throw error;
} finally {
  socket?.close(); child.kill();
}
