import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

import {
  parseTimetablePdf,
  parseWeekRanges,
  detectCampusConflicts
} from "../src/timetable.js";

const sampleUrl = new URL("./fixtures/黄映焜(2026-2027-1)课表.pdf", import.meta.url);
const chashanSampleUrl = new URL("./fixtures/崔艺鑫(2026-2027-1)课表.pdf", import.meta.url);
const cMapUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/cmaps/", import.meta.url)).split(sep).join("/")}/`;
const standardFontDataUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url)).split(sep).join("/")}/`;

test("解析单双周周次范围", () => {
  assert.deepEqual(parseWeekRanges("1-2周,4-12周(双),13-17周(单)"), [
    { start: 1, end: 2, parity: "all" },
    { start: 4, end: 12, parity: "even" },
    { start: 13, end: 17, parity: "odd" }
  ]);
});

test("直接解析真实滨海校区 WMU 课表 PDF", { skip: !existsSync(sampleUrl) }, async () => {
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
  assert.deepEqual(result.conflicts, []);
});

test("直接解析真实茶山校区 WMU 课表 PDF", { skip: !existsSync(chashanSampleUrl) }, async () => {
  const pdf = new Uint8Array(await readFile(chashanSampleUrl));
  const result = await parseTimetablePdf(pdf, pdfjsLib, {
    cMapUrl,
    cMapPacked: true,
    standardFontDataUrl
  });

  assert.equal(result.semester, "2026-2027-1");
  assert.deepEqual(result.student, { name: "崔艺鑫", id: "2531010008" });
  assert.equal(result.events.length, 34);
  assert.deepEqual([...new Set(result.events.map(event => event.campus))], ["茶山校区"]);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.conflicts, []);
});

test("跨校区按实际钟点识别单双周冲突", () => {
  const events = [
    {
      courseName: "茶山课程",
      weekday: 1,
      campus: "茶山校区",
      periods: { start: 1, end: 1 },
      weeks: [{ start: 1, end: 16, parity: "even" }]
    },
    {
      courseName: "滨海课程",
      weekday: 1,
      campus: "滨海校区",
      periods: { start: 1, end: 1 },
      weeks: [{ start: 1, end: 16, parity: "even" }]
    },
    {
      courseName: "滨海不冲突课程",
      weekday: 1,
      campus: "滨海校区",
      periods: { start: 1, end: 1 },
      weeks: [{ start: 1, end: 16, parity: "odd" }]
    }
  ];

  const conflicts = detectCampusConflicts(events);
  assert.equal(conflicts.length, 1);
  assert.deepEqual([conflicts[0].firstIndex, conflicts[0].secondIndex], [0, 1]);
});
