const DB_NAME = "wmu-timetable-share";
const STORE_NAME = "pending";
const FILE_KEY = "latest";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("无法读取分享文件"));
  });
}

export async function takeSharedPdf() {
  if (typeof indexedDB === "undefined" || typeof File === "undefined") return null;
  const db = await openDatabase();
  try {
    const record = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(FILE_KEY);
      request.onsuccess = () => {
        const value = request.result || null;
        store.delete(FILE_KEY);
        resolve(value);
      };
      request.onerror = () => reject(request.error || new Error("无法读取分享文件"));
    });
    if (!record?.bytes) return null;
    return new File([record.bytes], record.name || "wmu-timetable.pdf", { type: "application/pdf" });
  } finally {
    db.close();
  }
}
