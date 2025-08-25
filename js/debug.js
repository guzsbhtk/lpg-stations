// Debug utilities – enable via ?debug=1 or localStorage.debug = '1'
(function() {
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function setDebugEnabled(enabled) {
    try {
      localStorage.setItem('debug', enabled ? '1' : '0');
    } catch (e) {}
    window.DEBUG = !!enabled;
  }

  // Determine initial state
  const qp = getQueryParam('debug');
  const ls = (function() { try { return localStorage.getItem('debug'); } catch (e) { return null; } })();
  if (qp === '1' || qp === 'true') setDebugEnabled(true);
  else if (qp === '0' || qp === 'false') setDebugEnabled(false);
  else setDebugEnabled(ls === '1');

  async function getSWInfo() {
    const info = { supported: 'serviceWorker' in navigator, controller: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        info.registrations = regs.map(r => ({ scope: r.scope }));
      }
    } catch (e) {
      info.error = String(e);
    }
    return info;
  }

  async function getCachesInfo() {
    const result = { supported: 'caches' in window };
    if (!result.supported) return result;
    try {
      const keys = await caches.keys();
      result.keys = keys;
    } catch (e) {
      result.error = String(e);
    }
    return result;
  }

  async function getPermissions() {
    const res = { supported: 'permissions' in navigator };
    if (!res.supported) return res;
    try {
      const geo = await navigator.permissions.query({ name: 'geolocation' });
      res.geolocation = geo.state;
    } catch (e) {
      res.error = String(e);
    }
    return res;
  }

  async function info() {
    const ios = (typeof isIOS === 'function') ? isIOS() : null;
    const android = (typeof isAndroid === 'function') ? isAndroid() : null;
    const mobile = (typeof isMobile === 'function') ? isMobile() : null;
    const standalone = (typeof isStandalone === 'function') ? isStandalone() : null;
    const stationsCount = (typeof appState !== 'undefined') ? appState.getStations().length : null;
    const userPos = (typeof appState !== 'undefined') ? appState.getUserPosition() : null;
    const buttons = [CONFIG.SELECTORS.IOS_BUTTON, CONFIG.SELECTORS.ANDROID_BUTTON, CONFIG.SELECTORS.PWA_BUTTON].reduce((acc, selector) => {
      const el = document.querySelector(selector);
      if (!el) { acc[selector] = 'missing'; return acc; }
      const cs = window.getComputedStyle(el);
      acc[selector] = { display: el.style.display || '(inline style none)', computed: cs.display };
      return acc;
    }, {});

    const sw = await getSWInfo();
    const cachesInfo = await getCachesInfo();
    const perms = await getPermissions();

    return {
      DEBUG: !!window.DEBUG,
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      mobile, ios, android, standalone,
      stationsCount, userPos,
      buttons,
      sw,
      caches: cachesInfo,
      permissions: perms
    };
  }

  async function testFetch() {
    const url = CONFIG.URLS.SHEET;
    if (!url) throw new Error('CONFIG.URLS.SHEET not found');
    const t0 = performance.now();
    const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
    const t1 = performance.now();
    return { ok: res.ok, status: res.status, elapsedMs: Math.round(t1 - t0) };
  }

  async function testParse() {
    if (typeof fetchSheetData !== 'function') throw new Error('fetchSheetData() not found');
    const t0 = performance.now();
    const data = await fetchSheetData();
    const stations = (typeof parseStations === 'function') ? parseStations(data.table) : [];
    const t1 = performance.now();
    return { rows: stations.length, elapsedMs: Math.round(t1 - t0) };
  }

  async function clearCaches() {
    if (!('caches' in window)) return { supported: false };
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    return { cleared: keys };
  }

  async function forceUpdateSW() {
    if (!navigator.serviceWorker) return { supported: false };
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.update()));
    return { updated: regs.map(r => r.scope) };
  }

  function enable() { setDebugEnabled(true); console.log('[DEBUG] enabled'); }
  function disable() { setDebugEnabled(false); console.log('[DEBUG] disabled'); }

  window.appDebug = { info, testFetch, testParse, clearCaches, forceUpdateSW, enable, disable };

  if (window.DEBUG) {
    console.log('%cDEBUG MODE ON','background:#222;color:#0f0;padding:2px 6px;border-radius:4px');
    info().then((i) => console.log('[debug.info]', i));
  }
})();


