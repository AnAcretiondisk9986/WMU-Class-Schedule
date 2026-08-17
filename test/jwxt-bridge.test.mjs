import assert from "node:assert/strict";
import test from "node:test";

import {
  JWXT_ORIGIN,
  createJwxtBookmarklet,
  createJwxtWindowRunner,
  readJwxtPdfMessage
} from "../src/jwxt-bridge.js";

const pdfBuffer = () => new TextEncoder().encode("%PDF-1.7\nfixture").buffer;

test("书签脚本只向当前课表应用来源发送 PDF", () => {
  const bookmarklet = createJwxtBookmarklet("https://example.com/path");
  assert.ok(bookmarklet.startsWith("javascript:"));
  assert.ok(bookmarklet.includes("https://example.com"));
  assert.ok(bookmarklet.includes("xskbcx_cxXsShcPdf.html"));
  assert.ok(!bookmarklet.includes("/path"));
  assert.doesNotThrow(() => new Function(bookmarklet.slice("javascript:".length)));
  assert.equal(createJwxtWindowRunner("https://example.com"), createJwxtBookmarklet("https://example.com"));
});

test("拒绝非 HTTP 来源生成书签脚本", () => {
  assert.throws(() => createJwxtBookmarklet("file:///tmp/index.html"), /HTTP/);
});

test("只接收来自教务系统指定窗口的有效 PDF", () => {
  const source = {};
  const accepted = readJwxtPdfMessage({
    origin: JWXT_ORIGIN,
    source,
    data: { type: "wmu-timetable-pdf", filename: "2026/课表", pdf: pdfBuffer() }
  }, source);

  assert.equal(accepted.filename, "2026-课表.pdf");
  assert.equal(new TextDecoder().decode(accepted.bytes).startsWith("%PDF-"), true);
  assert.equal(readJwxtPdfMessage({
    origin: "https://example.com",
    source,
    data: { type: "wmu-timetable-pdf", pdf: pdfBuffer() }
  }, source), null);
  assert.equal(readJwxtPdfMessage({
    origin: JWXT_ORIGIN,
    source: {},
    data: { type: "wmu-timetable-pdf", pdf: pdfBuffer() }
  }, source), null);
  assert.equal(readJwxtPdfMessage({
    origin: JWXT_ORIGIN,
    source,
    data: { type: "wmu-timetable-pdf", pdf: pdfBuffer() }
  }), null);
  assert.equal(readJwxtPdfMessage({
    origin: JWXT_ORIGIN,
    source,
    data: { type: "wmu-timetable-pdf", pdf: new TextEncoder().encode("not pdf").buffer }
  }, source), null);
});
