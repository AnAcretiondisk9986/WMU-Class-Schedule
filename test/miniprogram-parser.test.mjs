import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseTimetablePages as parseWebTimetablePages } from "../src/timetable.js";

const source = readFileSync(new URL("../miniprogram/utils/timetable.js", import.meta.url), "utf8");
const moduleObject = { exports: {} };
new Function("module", "exports", source)(moduleObject, moduleObject.exports);
const parser = moduleObject.exports;

function syntheticPage() {
  const anchors = [50, 150, 250, 350, 450, 550, 650].map((x, index) => ({
    str: `星期${"一二三四五六日"[index]}`,
    transform: [1, 0, 0, 1, x, 500]
  }));
  return {
    width: 842,
    height: 595,
    items: [
      ...anchors,
      { str: "黄映焜课表", transform: [1, 0, 0, 1, 40, 480] },
      { str: "星期一", transform: [1, 0, 0, 1, 50, 480] },
      { str: "课程甲", transform: [1, 0, 0, 1, 60, 480] },
      { str: "◆", transform: [1, 0, 0, 1, 80, 470] },
      { str: "(1-2节)1-2周/校区:滨海校区/场地:求知楼101/教师:教师甲/教学班:NN260001-120001-1-测试班/学分:2.0", transform: [1, 0, 0, 1, 90, 470] }
    ]
  };
}

test("小程序解析器清理跨页页眉并保留课程实体标识", () => {
  const result = parser.parseTimetablePages([syntheticPage()]);
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].courseName, "课程甲");
  assert.equal(result.events[0].weekday, 1);
  assert.equal(result.events[0].courseCode, "NN260001-120001-1");
  assert.equal(result.events[0].className, "NN260001-120001-1-测试班");
  assert.equal(result.warnings.length, 0);

  const webResult = parseWebTimetablePages([syntheticPage()]);
  assert.deepEqual(
    webResult.events.map(event => ({
      courseName: event.courseName,
      weekday: event.weekday,
      periods: event.periods,
      weeks: event.weeks,
      courseCode: event.courseCode,
      className: event.className
    })),
    result.events.map(event => ({
      courseName: event.courseName,
      weekday: event.weekday,
      periods: event.periods,
      weeks: event.weeks,
      courseCode: event.courseCode,
      className: event.className
    }))
  );
});
