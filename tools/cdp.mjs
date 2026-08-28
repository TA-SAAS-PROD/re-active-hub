// Minimal CDP driver for headless Chrome. Node 24 built-in WebSocket, zero deps.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findWs(port, tries = 80) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch (_) {}
    await sleep(250);
  }
  throw new Error('Chrome did not expose a CDP endpoint');
}

export class Browser {
  constructor(proc, ws, userDataDir) {
    this.proc = proc;
    this.ws = ws;
    this.userDataDir = userDataDir;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener('message', (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (_) { return; }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('CDP timeout: ' + method));
        }
      }, 180000);
    });
  }

  on(fn) { this.listeners.push(fn); }

  async newPage() {
    const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
    return new Page(this, sessionId, targetId);
  }

  async close() {
    try { this.ws.close(); } catch (_) {}
    try { this.proc.kill(); } catch (_) {}
    await sleep(500);
    try { rmSync(this.userDataDir, { recursive: true, force: true }); } catch (_) {}
  }
}

export class Page {
  constructor(browser, sessionId, targetId) {
    this.b = browser;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.consoleLogs = [];
    this.requests = [];
    this.pageErrors = [];
    browser.on((msg) => {
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.consoleAPICalled') {
        this.consoleLogs.push({
          type: msg.params.type,
          text: msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' '),
        });
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        this.pageErrors.push(d.text + ' ' + (d.exception?.description || ''));
      } else if (msg.method === 'Network.responseReceived') {
        this.requests.push({
          url: msg.params.response.url,
          status: msg.params.response.status,
          type: msg.params.type,
          mime: msg.params.response.mimeType,
        });
      }
    });
  }

  cmd(method, params) { return this.b.send(method, params, this.sessionId); }

  async init() {
    await this.cmd('Page.enable');
    await this.cmd('Runtime.enable');
    await this.cmd('Network.enable');
    // never serve a probe a cached asset: files are swapped under a
    // stable URL, so the cache would hand back the previous candidate
    await this.cmd('Network.setCacheDisabled', { cacheDisabled: true });
  }

  addInitScript(source) {
    return this.cmd('Page.addScriptToEvaluateOnNewDocument', { source });
  }

  async setViewport(width, height, dsf = 1, mobile = false) {
    await this.cmd('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: dsf, mobile,
      screenWidth: width, screenHeight: height,
    });
  }

  async goto(url, { waitMs = 3500 } = {}) {
    let resolved = false;
    const done = new Promise((resolve) => {
      const h = (msg) => {
        if (!resolved && msg.sessionId === this.sessionId && msg.method === 'Page.loadEventFired') {
          resolved = true; resolve();
        }
      };
      this.b.on(h);
      setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 45000);
    });
    await this.cmd('Page.navigate', { url });
    await done;
    await sleep(waitMs);
  }

  async eval(expression, { awaitPromise = true, returnByValue = true } = {}) {
    const r = await this.cmd('Runtime.evaluate', {
      expression, awaitPromise, returnByValue,
      allowUnsafeEvalBlockedByCSP: true, userGesture: true,
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
    }
    return r.result.value;
  }

  async screenshot({ fullPage = false, format = 'png', quality } = {}) {
    const p = { format, captureBeyondViewport: fullPage, optimizeForSpeed: false };
    if (quality && format === 'jpeg') p.quality = quality;
    if (fullPage) {
      const m = await this.cmd('Page.getLayoutMetrics');
      const cs = m.cssContentSize || m.contentSize;
      p.clip = { x: 0, y: 0, width: Math.ceil(cs.width), height: Math.ceil(cs.height), scale: 1 };
    }
    const { data } = await this.cmd('Page.captureScreenshot', p);
    return Buffer.from(data, 'base64');
  }

  async scrollThrough(step = 700, pause = 280) {
    const h = await this.eval('document.documentElement.scrollHeight');
    for (let y = 0; y < h; y += step) {
      await this.eval(`window.scrollTo(0, ${y})`);
      await sleep(pause);
    }
    await this.eval('window.scrollTo(0, document.documentElement.scrollHeight)');
    await sleep(700);
    await this.eval('window.scrollTo(0, 0)');
    await sleep(700);
  }

  close() { return this.b.send('Target.closeTarget', { targetId: this.targetId }); }
}

export async function launch({ headless = true, extraArgs = [] } = {}) {
  const exe = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!exe) throw new Error('No Chrome/Edge found');
  const port = 9000 + Math.floor(Math.random() * 900);
  const userDataDir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--hide-scrollbars',
    '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
    '--font-render-hinting=none',
    ...extraArgs,
    'about:blank',
  ];
  if (headless) args.unshift('--headless=new');
  const proc = spawn(exe, args, { stdio: 'ignore', detached: false });
  const wsUrl = await findWs(port);
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const b = new Browser(proc, ws, userDataDir);
  await b.send('Target.setDiscoverTargets', { discover: true });
  return b;
}
