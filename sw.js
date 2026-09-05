const CACHE_PREFIX = "wmu-timetable-shell-";
// 发布静态资源时同步递增版本，避免 cache-first 长期保留旧版 JS / PDF.js。
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/wmu-preview.png",
  "./assets/wmu-logo-white.png",
  "./assets/wmu-seal-white.png",
  "./assets/wmu-shield-white.png",
  "./src/timetable.js",
  "./vendor/pdfjs/build/pdf.min.mjs",
  "./vendor/pdfjs/build/pdf.worker.min.mjs",
  "./vendor/pdfjs/cmaps/78-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/78-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/78-H.bcmap",
  "./vendor/pdfjs/cmaps/78-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/78-RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/78-V.bcmap",
  "./vendor/pdfjs/cmaps/78ms-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/78ms-RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/83pv-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/90ms-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/90ms-RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/90msp-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/90msp-RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/90pv-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/90pv-RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/Add-H.bcmap",
  "./vendor/pdfjs/cmaps/Add-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/Add-RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/Add-V.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-0.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-1.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-2.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-3.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-4.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-5.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-6.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-CNS1-UCS2.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-GB1-0.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-GB1-1.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-GB1-2.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-GB1-3.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-GB1-4.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-GB1-5.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-GB1-UCS2.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-0.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-1.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-2.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-3.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-4.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-5.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-6.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Japan1-UCS2.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Korea1-0.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Korea1-1.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Korea1-2.bcmap",
  "./vendor/pdfjs/cmaps/Adobe-Korea1-UCS2.bcmap",
  "./vendor/pdfjs/cmaps/B5-H.bcmap",
  "./vendor/pdfjs/cmaps/B5-V.bcmap",
  "./vendor/pdfjs/cmaps/B5pc-H.bcmap",
  "./vendor/pdfjs/cmaps/B5pc-V.bcmap",
  "./vendor/pdfjs/cmaps/CNS-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/CNS-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/CNS1-H.bcmap",
  "./vendor/pdfjs/cmaps/CNS1-V.bcmap",
  "./vendor/pdfjs/cmaps/CNS2-H.bcmap",
  "./vendor/pdfjs/cmaps/CNS2-V.bcmap",
  "./vendor/pdfjs/cmaps/ETen-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/ETen-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/ETenms-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/ETenms-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/ETHK-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/ETHK-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/Ext-H.bcmap",
  "./vendor/pdfjs/cmaps/Ext-RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/Ext-RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/Ext-V.bcmap",
  "./vendor/pdfjs/cmaps/GB-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/GB-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/GB-H.bcmap",
  "./vendor/pdfjs/cmaps/GB-V.bcmap",
  "./vendor/pdfjs/cmaps/GBK-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/GBK-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/GBK2K-H.bcmap",
  "./vendor/pdfjs/cmaps/GBK2K-V.bcmap",
  "./vendor/pdfjs/cmaps/GBKp-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/GBKp-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/GBpc-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/GBpc-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/GBT-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/GBT-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/GBT-H.bcmap",
  "./vendor/pdfjs/cmaps/GBT-V.bcmap",
  "./vendor/pdfjs/cmaps/GBTpc-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/GBTpc-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/H.bcmap",
  "./vendor/pdfjs/cmaps/Hankaku.bcmap",
  "./vendor/pdfjs/cmaps/Hiragana.bcmap",
  "./vendor/pdfjs/cmaps/HKdla-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/HKdla-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/HKdlb-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/HKdlb-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/HKgccs-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/HKgccs-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/HKm314-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/HKm314-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/HKm471-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/HKm471-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/HKscs-B5-H.bcmap",
  "./vendor/pdfjs/cmaps/HKscs-B5-V.bcmap",
  "./vendor/pdfjs/cmaps/Katakana.bcmap",
  "./vendor/pdfjs/cmaps/KSC-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/KSC-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/KSC-H.bcmap",
  "./vendor/pdfjs/cmaps/KSC-Johab-H.bcmap",
  "./vendor/pdfjs/cmaps/KSC-Johab-V.bcmap",
  "./vendor/pdfjs/cmaps/KSC-V.bcmap",
  "./vendor/pdfjs/cmaps/KSCms-UHC-H.bcmap",
  "./vendor/pdfjs/cmaps/KSCms-UHC-HW-H.bcmap",
  "./vendor/pdfjs/cmaps/KSCms-UHC-HW-V.bcmap",
  "./vendor/pdfjs/cmaps/KSCms-UHC-V.bcmap",
  "./vendor/pdfjs/cmaps/KSCpc-EUC-H.bcmap",
  "./vendor/pdfjs/cmaps/KSCpc-EUC-V.bcmap",
  "./vendor/pdfjs/cmaps/LICENSE",
  "./vendor/pdfjs/cmaps/NWP-H.bcmap",
  "./vendor/pdfjs/cmaps/NWP-V.bcmap",
  "./vendor/pdfjs/cmaps/RKSJ-H.bcmap",
  "./vendor/pdfjs/cmaps/RKSJ-V.bcmap",
  "./vendor/pdfjs/cmaps/Roman.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UCS2-H.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UCS2-V.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UTF16-H.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UTF16-V.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UTF32-H.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UTF32-V.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UTF8-H.bcmap",
  "./vendor/pdfjs/cmaps/UniCNS-UTF8-V.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UCS2-H.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UCS2-V.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UTF16-H.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UTF16-V.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UTF32-H.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UTF32-V.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UTF8-H.bcmap",
  "./vendor/pdfjs/cmaps/UniGB-UTF8-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UCS2-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UCS2-HW-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UCS2-HW-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UCS2-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UTF16-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UTF16-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UTF32-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UTF32-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UTF8-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS-UTF8-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS2004-UTF16-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS2004-UTF16-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS2004-UTF32-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS2004-UTF32-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS2004-UTF8-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJIS2004-UTF8-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJISPro-UCS2-HW-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJISPro-UCS2-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJISPro-UTF8-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJISX0213-UTF32-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJISX0213-UTF32-V.bcmap",
  "./vendor/pdfjs/cmaps/UniJISX02132004-UTF32-H.bcmap",
  "./vendor/pdfjs/cmaps/UniJISX02132004-UTF32-V.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UCS2-H.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UCS2-V.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UTF16-H.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UTF16-V.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UTF32-H.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UTF32-V.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UTF8-H.bcmap",
  "./vendor/pdfjs/cmaps/UniKS-UTF8-V.bcmap",
  "./vendor/pdfjs/cmaps/V.bcmap",
  "./vendor/pdfjs/cmaps/WP-Symbol.bcmap",
  "./vendor/pdfjs/LICENSE",
  "./vendor/pdfjs/standard_fonts/FoxitDingbats.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitFixed.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitFixedBold.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitFixedBoldItalic.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitFixedItalic.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitSerif.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitSerifBold.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitSerifBoldItalic.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitSerifItalic.pfb",
  "./vendor/pdfjs/standard_fonts/FoxitSymbol.pfb",
  "./vendor/pdfjs/standard_fonts/LiberationSans-Bold.ttf",
  "./vendor/pdfjs/standard_fonts/LiberationSans-BoldItalic.ttf",
  "./vendor/pdfjs/standard_fonts/LiberationSans-Italic.ttf",
  "./vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf",
  "./vendor/pdfjs/standard_fonts/LICENSE_FOXIT",
  "./vendor/pdfjs/standard_fonts/LICENSE_LIBERATION"
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
  // 版本敏感资源优先走网络，网络可用时自动刷新缓存；离线时回退到缓存。
  const pathname = new URL(event.request.url).pathname;
  const isVersionSensitive = /\/(?:index\.html|src\/timetable\.js|vendor\/pdfjs\/)/.test(pathname);
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
