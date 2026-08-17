const LEGACY_DB_NAME = "wmu-timetable-share";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    self.registration.unregister(),
    new Promise(resolve => {
      const request = indexedDB.deleteDatabase(LEGACY_DB_NAME);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    })
  ]));
});
