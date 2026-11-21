const CACHE_PREFIX = "wmu-timetable-";
// 外壳与 PDF.js 懒资源分开版本：壳升级不再清空 4 MB 的 CMap/字体/worker。
const SHELL_CACHE = `${CACHE_PREFIX}shell-v6`;
const PDF_CACHE = `${CACHE_PREFIX}pdfjs-v1`;
const SHELL_NETWORK_TIMEOUT_MS = 3500;
// 安装期只预缓存首屏必需的应用壳。首屏之外的大体积资源不进这里。
const APP_SHELL = [
  "./index.html",
  "./manifest.webmanifest",
  "./assets/wmu-preview.png",
  "./assets/wmu-logo-white.png",
  "./assets/wmu-seal-white.png",
  "./assets/wmu-shield-white.png",
  "./src/timetable.js",
  "./src/ics.js"
];

// PDF.js 主库、worker、CMap 与标准字体按需请求，首次使用后写入 PDF_CACHE。
const LAZY_PATH_PREFIXES = [
  "./vendor/pdfjs/"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE && key !== PDF_CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstShell(event));
    return;
  }

  const pathname = new URL(event.request.url).pathname;
  const isVersionSensitive = /\/(?:index\.html|src\/(?:timetable|ics)\.js)/.test(pathname);
  const isLazyVendor = LAZY_PATH_PREFIXES.some(prefix =>
    pathname.includes(prefix.replace(/^\./, "")));

  if (isLazyVendor) {
    event.respondWith(handleLazyRequest(event));
    return;
  }

  event.respondWith(isVersionSensitive ? networkFirst(event) : cacheFirst(event));
});

async function putShell(request, response) {
  if (!response || !response.ok || response.status !== 200) return false;
  const cache = await caches.open(SHELL_CACHE);
  await cache.put(request, response.clone());
  return true;
}

async function networkFirstShell(event) {
  const networkPromise = fetch(event.request, { cache: "no-cache" }).then(response => {
    if (response.ok) event.waitUntil(putShell("./index.html", response.clone()));
    return response;
  });

  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match("./index.html");
  if (!cached) {
    return networkPromise.catch(() => caches.match("./index.html"));
  }

  // 弱网/校园网认证卡顿时限时回退缓存壳，后台继续等待网络更新缓存，保证离线与弱网秒开。
  let timerId = null;
  const timeoutPromise = new Promise(resolve => {
    timerId = setTimeout(() => resolve(null), SHELL_NETWORK_TIMEOUT_MS);
  });

  const winner = await Promise.race([
    networkPromise.then(response => {
      if (timerId !== null) clearTimeout(timerId);
      return response;
    }).catch(() => {
      if (timerId !== null) clearTimeout(timerId);
      return null;
    }),
    timeoutPromise
  ]);

  if (winner) return winner;
  event.waitUntil(networkPromise.then(() => undefined, () => undefined));
  return cached;
}

function networkFirst(event) {
  return fetch(event.request, { cache: "no-cache" }).then(response => {
    if (response.ok) event.waitUntil(putShell(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request));
}

function cacheFirst(event) {
  return caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) event.waitUntil(putShell(event.request, response.clone()));
    return response;
  }));
}

// 网络响应中可用于判断内容是否变化的轻量标识（长度 + ETag）。
function responseVersion(response) {
  return `${response.headers.get("content-length") || ""}|${response.headers.get("etag") || ""}`;
}

async function cacheNetworkResponse(request, response) {
  // 只缓存完整响应：206（Range 请求）等部分响应会导致后续请求拿到不完整内容。
  if (!response || !response.ok || response.status !== 200) return false;
  const cache = await caches.open(PDF_CACHE);
  const cached = await cache.match(request);
  if (!cached) {
    await cache.put(request, response.clone());
    return false;
  }
  const version = responseVersion(response);
  // 拿不到任何版本标识时保守处理：保留已有缓存，避免每次请求都重写。
  if (version === "|") return false;
  if (responseVersion(cached) !== version) {
    await cache.put(request, response.clone());
    return true;
  }
  return false;
}

async function invalidateLazySiblings(request) {
  const cache = await caches.open(PDF_CACHE);
  const keys = await cache.keys();
  // 只让 build/ 内的主库与 worker 互相同步版本；CMap/字体不受壳升级影响。
  const isBuild = key => key.url.includes("/vendor/pdfjs/build/");
  await Promise.all(keys.filter(key => key.url !== request.url && isBuild(key)).map(key => cache.delete(key)));
}

async function handleLazyRequest(event) {
  const { request } = event;
  const pdfCache = await caches.open(PDF_CACHE);
  const cached = await pdfCache.match(request);
  const revalidate = fetch(request).then(async response => {
    const replaced = await cacheNetworkResponse(request, response);
    if (replaced) await invalidateLazySiblings(request);
    return response;
  }).catch(() => null);

  if (cached) {
    event.waitUntil(revalidate.then(() => undefined, () => undefined));
    return cached;
  }
  const response = await revalidate;
  return response || pdfCache.match(request);
}
