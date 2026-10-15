const CACHE_PREFIX = "wmu-timetable-shell-";
// 发布静态资源时同步递增版本，避免 cache-first 长期保留旧版 JS / PDF.js。
const CACHE_NAME = `${CACHE_PREFIX}v4`;
// 安装期只预缓存首屏必需的应用壳。首屏之外的大体积资源不进这里，
// 否则 install 会串行拉取数 MB 数据，与首屏渲染抢带宽并拖慢首次打开。
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/wmu-preview.png",
  "./assets/wmu-logo-white.png",
  "./assets/wmu-seal-white.png",
  "./assets/wmu-shield-white.png",
  "./src/timetable.js"
];

// PDF.js 主库、worker、CMap 与标准字体按需请求，首次使用后写入同一缓存，
// 之后离线仍可解析课表。这些路径不参与 install 预缓存。
const LAZY_PATH_PREFIXES = [
  "./vendor/pdfjs/"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy));
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }
  // 网络优先：网络可用时自动刷新缓存，离线时回退到缓存。
  const pathname = new URL(event.request.url).pathname;
  const isVersionSensitive = /\/(?:index\.html|src\/timetable\.js)/.test(pathname);
  const isLazyVendor = LAZY_PATH_PREFIXES.some(prefix =>
    pathname.includes(prefix.replace(/^\./, "")));

  if (isLazyVendor) {
    // 按需资源（PDF.js 主库 / worker / CMap / 标准字体）：命中缓存立即返回，
    // 后台校验内容；内容变化（例如发布新版 PDF.js）时替换缓存并清空该路径其他条目，
    // 避免主库与 worker 版本不一致。未命中时回退到网络，离线再取缓存。
    event.respondWith(handleLazyRequest(event));
    return;
  }

  event.respondWith(
    (isVersionSensitive
      ? fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        }).catch(() => caches.match(event.request))
      : caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })))
  );
});

// 网络响应中可用于判断内容是否变化的轻量标识（长度 + ETag）。
function responseVersion(response) {
  return `${response.headers.get("content-length") || ""}|${response.headers.get("etag") || ""}`;
}

async function cacheNetworkResponse(request, response) {
  // 只缓存完整响应：206（Range 请求）等部分响应会导致后续请求拿到不完整内容。
  if (!response || !response.ok || response.status !== 200) return false;
  const cache = await caches.open(CACHE_NAME);
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
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const isLazy = key => LAZY_PATH_PREFIXES.some(prefix => key.url.includes(prefix.replace(/^\./, "")));
  await Promise.all(keys.filter(key => key.url !== request.url && isLazy(key)).map(key => cache.delete(key)));
}

async function handleLazyRequest(event) {
  const { request } = event;
  const cached = await caches.match(request);
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
  return response || caches.match(request);
}
