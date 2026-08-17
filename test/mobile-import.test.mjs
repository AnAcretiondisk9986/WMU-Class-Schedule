import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");

test("PWA manifest declares PDF share target", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.share_target.method, "POST");
  assert.equal(manifest.share_target.enctype, "multipart/form-data");
  assert.deepEqual(manifest.share_target.params.files[0].accept, ["application/pdf", ".pdf"]);
});

test("share target stores only PDF files and redirects back to the app", () => {
  assert.match(serviceWorker, /file\.type !== "application\/pdf"/);
  assert.match(serviceWorker, /event\.request\.formData\(\)/);
  assert.match(serviceWorker, /shared=1/);
});
