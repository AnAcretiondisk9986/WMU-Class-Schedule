const DB_NAME = "wmu-timetable-share";
const STORE_NAME = "pending";
const FILE_KEY = "latest";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

function saveSharedPdf(record) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onerror = () => reject(request.error || new Error("无法保存分享文件"));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(record, FILE_KEY);
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error || new Error("无法保存分享文件")); };
    };
  });
}

self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "POST" || !requestUrl.pathname.endsWith("/share-target")) return;

  event.respondWith((async () => {
    const form = await event.request.formData();
    const file = form.get("file");
    if (!file || file.type !== "application/pdf") {
      return Response.redirect(new URL("./?shared=invalid", requestUrl), 303);
    }
    await saveSharedPdf({ name: file.name || "wmu-timetable.pdf", bytes: await file.arrayBuffer() });
    return Response.redirect(new URL("./?shared=1", requestUrl), 303);
  })());
});
