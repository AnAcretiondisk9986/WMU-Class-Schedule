import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const storage = {};
globalThis.wx = {
  getStorageSync(key) { return storage[key]; },
  setStorageSync(key, value) { storage[key] = value; },
  removeStorageSync(key) { delete storage[key]; }
};

const timeModule = { exports: {} };
const timeSource = readFileSync(new URL("../miniprogram/utils/time.js", import.meta.url), "utf8");
new Function("module", "exports", timeSource)(timeModule, timeModule.exports);
const storeModule = { exports: {} };
const storeSource = readFileSync(new URL("../miniprogram/utils/store.js", import.meta.url), "utf8");
new Function("require", "module", "exports", storeSource)(
  request => request === "./time.js" ? timeModule.exports : (() => { throw new Error(`unexpected require: ${request}`); })(),
  storeModule,
  storeModule.exports
);
const store = storeModule.exports;

const parsed = {
  semester: "2026-2027-1",
  student: { name: "测试同学", id: "T1" },
  events: [{
    courseName: "课程甲", weekday: 1, activity: "lecture", activityLabel: "讲课",
    periods: { start: 1, end: 2 }, weeks: [{ start: 1, end: 16, parity: "all" }],
    campus: "滨海校区", room: "求知楼 101", teacher: "教师甲", credit: 2.5,
    courseCode: "NN260001-120001-1", className: "NN260001-120001-1-测试班"
  }]
};

test("小程序导入新课表保留已有收藏并标记日期待确认", () => {
  store.resetData();
  const first = store.addTimetable(parsed);
  const firstKey = store.favoriteKey(first.events[0], first.id);
  store.toggleFavorite(first.events[0], first.id);
  const second = store.addTimetable(parsed);

  assert.notEqual(first.id, second.id);
  assert.deepEqual(store.state.favorites, [firstKey]);
  assert.equal(store.isFavorite(first.events[0], first.id), true);
  assert.equal(store.isFavorite(second.events[0], second.id), false);
  assert.equal(second.termStartConfirmed, false);
});

test("小程序拒绝空/非法备份并回退不存在的 activeId", () => {
  const before = store.state.timetables;
  const beforeFavorites = [...store.state.favorites];
  assert.equal(store.importPayload({ version: 2, timetables: [] }), false);
  assert.equal(store.importPayload({ version: 2, timetables: [{ id: "bad", events: [{}] }] }), false);
  assert.strictEqual(store.state.timetables, before);

  const valid = {
    version: 2,
    timetables: [{
      id: "safe", name: "安全课表", semester: "2026-2027-1",
      termStartDate: "2026-09-14", events: [parsed.events[0]], customEvents: []
    }],
    activeId: "missing"
  };
  assert.equal(store.importPayload(valid), true);
  assert.equal(store.state.activeId, "safe");
  assert.deepEqual(store.state.favorites, beforeFavorites, "缺少 favorites 字段时保留当前收藏");
});

test("同名但不同课程代码的课次使用独立收藏 key", () => {
  store.resetData();
  const first = store.addTimetable({
    ...parsed,
    events: [{ ...parsed.events[0], courseCode: "CODE-A" }]
  });
  const second = store.addTimetable({
    ...parsed,
    events: [{ ...parsed.events[0], courseCode: "CODE-B" }]
  });
  store.toggleFavorite(first.events[0], first.id);

  const firstKey = store.favoriteKey(first.events[0], first.id);
  const secondKey = store.favoriteKey(second.events[0], second.id);
  assert.notEqual(firstKey, secondKey);
  assert.equal(store.isFavorite(first.events[0], first.id), true);
  assert.equal(store.isFavorite(second.events[0], second.id), false);

  store.toggleFavorite(second.events[0], second.id);
  assert.deepEqual(new Set(store.state.favorites), new Set([firstKey, secondKey]));
});

test("旧版标题收藏会迁移到已有课表的稳定 key", () => {
  store.resetData();
  const first = store.addTimetable({
    ...parsed,
    events: [{ ...parsed.events[0], courseCode: "CODE-A" }]
  });
  const second = store.addTimetable({
    ...parsed,
    events: [{ ...parsed.events[0], courseCode: "CODE-B" }]
  });

  store.state.favorites = ["课程甲"];
  const migrated = store.migrateFavorites();
  assert.deepEqual(new Set(migrated), new Set([
    store.favoriteKey(first.events[0], first.id),
    store.favoriteKey(second.events[0], second.id)
  ]));
  assert.equal(store.isFavorite(first.events[0], first.id), true);
  assert.equal(store.isFavorite(second.events[0], second.id), true);
});

test("小程序拒绝空导入，并把非法日期标记为待确认", () => {
  store.resetData();
  assert.equal(store.addTimetable({ semester: "空课表", events: [] }), null);

  const valid = {
    version: 2,
    timetables: [{
      id: "invalid-date", name: "日期待确认", semester: "2026-2027-1",
      termStartDate: "2026-02-31", events: [parsed.events[0]], customEvents: []
    }],
    activeId: "invalid-date"
  };
  assert.equal(store.importPayload(valid), true);
  assert.equal(store.currentTimetable().termStartDate, "");
  assert.equal(store.currentTimetable().termStartConfirmed, false);
});
