import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../miniprogram/utils/time.js", import.meta.url), "utf8");
const timeModule = { exports: {} };
new Function("module", "exports", source)(timeModule, timeModule.exports);
const time = timeModule.exports;

test("小程序使用学校提供的显式校区作息表", () => {
  assert.deepEqual(time.CAMPUS_PERIODS["茶山校区"].slice(0, 8), [
    ["08:00", "08:40"], ["08:45", "09:25"], ["09:40", "10:20"],
    ["10:25", "11:05"], ["11:10", "11:50"], ["11:55", "12:35"],
    ["12:40", "13:20"], ["13:30", "14:10"]
  ]);
  assert.strictEqual(
    time.CAMPUS_PERIODS["学院路校区"],
    time.CAMPUS_PERIODS["茶山校区"],
    "学院路与茶山作息相同"
  );
  assert.deepEqual(time.CAMPUS_PERIODS["滨海校区"].slice(0, 8), [
    ["08:30", "09:10"], ["09:15", "09:55"], ["10:10", "10:50"],
    ["10:55", "11:35"], ["11:40", "12:20"], ["12:25", "13:05"],
    ["13:05", "13:20"], ["13:30", "14:10"]
  ]);
  assert.deepEqual(time.CAMPUS_PERIODS["滨海校区"].slice(13, 16), [
    ["18:20", "19:00"], ["19:05", "19:45"], ["19:50", "20:30"]
  ]);
});
