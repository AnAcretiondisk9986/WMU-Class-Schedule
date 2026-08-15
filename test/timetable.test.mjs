import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  parseTimetablePdf,
  parseWeekRanges
} from "../src/timetable.js";

const sampleUrl = new URL("./fixtures/黄映焜(2026-2027-1)课表.pdf", import.meta.url);
const cMapUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/cmaps/", import.meta.url)).split(sep).join("/")}/`;
const standardFontDataUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url)).split(sep).join("/")}/`;

test("解析单双周周次范围", () => {
  assert.deepEqual(parseWeekRanges("1-2周,4-12周(双),13-17周(单)"), [
    { start: 1, end: 2, parity: "all" },
    { start: 4, end: 12, parity: "even" },
    { start: 13, end: 17, parity: "odd" }
  ]);
});

test("直接解析真实 WMU 课表 PDF", async () => {
  const pdf = new Uint8Array(await readFile(sampleUrl));
  const result = await parseTimetablePdf(pdf, pdfjsLib, {
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl
  });

  assert.equal(result.semester, "2026-2027-1");
  assert.deepEqual(result.student, { name: "黄映焜", id: "2519120004" });
  assert.ok(result.courses.length >= 10);
  assert.ok(result.events.length >= 25);
  assert.deepEqual(result.warnings, []);

  const cloud = result.courses.find(course => course.name === "云计算基础");
  assert.ok(cloud);
  assert.equal(cloud.credit, 2.5);
  assert.equal(cloud.courseCode, "NN230426-113769-1");
  assert.equal(cloud.events.length, 2);
  assert.deepEqual(cloud.events.map(event => event.weekday), [2, 2]);
  assert.deepEqual(cloud.events[0].periods, { start: 2, end: 5 });
  assert.deepEqual(cloud.events[0].weeks, [
    { start: 1, end: 2, parity: "all" },
    { start: 4, end: 12, parity: "even" },
    { start: 13, end: 17, parity: "odd" }
  ]);

  const management = result.courses.find(course => course.name === "管理学原理");
  assert.ok(management);
  assert.ok(management.events.some(event => event.weekday === 3 && event.periods.start === 17));
  assert.ok(management.events.some(event => event.weekday === 4 && event.periods.start === 14));
});
