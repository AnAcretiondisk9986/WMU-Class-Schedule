import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// 读取 index.html 的内联模块脚本，并在最小 DOM mock 中实际执行，
// 用于防止前端渲染/状态逻辑回归。
const indexUrl = new URL("../index.html", import.meta.url);
const html = readFileSync(indexUrl, "utf8");
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error("index.html 中未找到模块脚本");
const code = scriptMatch[1].replace(/^\s*import .*$/gm, "");

function makeClassList() {
  const set = new Set();
  return {
    add(...names) { names.forEach((name) => set.add(name)); },
    remove(...names) { names.forEach((name) => set.delete(name)); },
    toggle(name, force) {
      if (force === undefined) { if (set.has(name)) { set.delete(name); return false; } set.add(name); return true; }
      if (force) set.add(name); else set.delete(name);
      return force;
    },
    contains(name) { return set.has(name); }
  };
}

function makeElement(id) {
  return {
    id,
    textContent: "",
    innerHTML: "",
    style: {},
    value: "",
    disabled: false,
    className: "",
    classList: makeClassList(),
    listeners: {},
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute(key, value) { this[`attr_${key}`] = value; },
    removeAttribute() {}
  };
}

function withMocks(mocks, fn) {
  const backup = {};
  for (const key of Object.keys(mocks)) { backup[key] = globalThis[key]; globalThis[key] = mocks[key]; }
  try { fn(); } finally {
    for (const key of Object.keys(mocks)) {
      if (backup[key] === undefined) delete globalThis[key];
      else globalThis[key] = backup[key];
    }
  }
}

function runScenario(saved) {
  const elements = {};
  const $ = (id) => { if (!elements[id]) elements[id] = makeElement(id); return elements[id]; };
  const documentElement = makeElement("documentElement");
  const body = makeElement("body");
  const storage = {};
  if (saved) storage["wmu-timetable-v1"] = JSON.stringify(saved);

  const mocks = {
    pdfjsLib: { GlobalWorkerOptions: {} },
    parseTimetablePdf: async () => ({}),
    document: {
      getElementById: $,
      querySelectorAll: () => [],
      addEventListener() {},
      body,
      documentElement,
      createElement: () => makeElement("created")
    },
    window: { addEventListener() {}, lucide: { createIcons() {} } },
    localStorage: {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => { storage[key] = value; },
      removeItem: (key) => { delete storage[key]; }
    },
    getComputedStyle: () => ({ getPropertyValue: () => "92px" })
  };

  let error = null;
  withMocks(mocks, () => {
    try { new Function(code)(); } catch (caught) { error = caught; }
  });

  const trigger = (id, type = "click") => {
    withMocks(mocks, () => {
      const element = $(id);
      const callback = element.listeners[type];
      if (callback) callback({ target: element, preventDefault() {} });
    });
  };

  return { elements, documentElement, body, storage, error, $, trigger };
}

const W = (start, end, parity = "all") => ({ start, end, parity });
const TEST_EVENTS = [
  { day: 1, start: 1, end: 2, title: "云计算基础", type: "lecture", label: "讲课", room: "求知楼 204", campus: "滨海校区", teacher: "冯振", weeks: [W(1, 16)], credit: "2.5" },
  { day: 1, start: 3, end: 4, title: "概率论及数理统计", type: "lecture", label: "讲课", room: "求知楼 301", campus: "滨海校区", teacher: "韩艳敏", weeks: [W(1, 16)], credit: "2.5" },
  { day: 2, start: 1, end: 2, title: "数据库原理与应用", type: "lecture", label: "讲课", room: "求知楼 204", campus: "滨海校区", teacher: "刘丽娜", weeks: [W(1, 3), W(5, 8)], credit: "2.5" },
  { day: 2, start: 3, end: 4, title: "管理学原理", type: "lecture", label: "讲课", room: "求知楼 206", campus: "滨海校区", teacher: "叶俊", weeks: [W(1, 16)], credit: "3.0" },
  { day: 2, start: 5, end: 6, title: "形势与政策", type: "online", label: "在线", room: "学习通", campus: "线上", teacher: "陈赛虎", weeks: [W(8, 8)], credit: "2.0" },
  { day: 3, start: 1, end: 2, title: "计算机网络与应用", type: "lecture", label: "讲课", room: "求知楼 108", campus: "滨海校区", teacher: "叶晰", weeks: [W(1, 8)], credit: "2.5" },
  { day: 3, start: 3, end: 5, title: "毛泽东思想和中国特色社会主义理论体系概论", type: "lecture", label: "讲课", room: "求知楼 105", campus: "滨海校区", teacher: "纪欣农", weeks: [W(1, 17)], credit: "3.0" },
  { day: 4, start: 1, end: 2, title: "概率论及数理统计", type: "lab", label: "实验", room: "线上课堂", campus: "滨海校区", teacher: "韩艳敏", weeks: [W(3, 3), W(9, 9), W(12, 12)], credit: "2.5" },
  { day: 4, start: 3, end: 4, title: "人工智能基础", type: "lecture", label: "讲课", room: "求知楼 401", campus: "滨海校区", teacher: "纪欣农", weeks: [W(1, 10)], credit: "2.0" },
  { day: 5, start: 1, end: 2, title: "数据库原理与应用", type: "lab", label: "实验", room: "6114 计算机机房", campus: "滨海校区", teacher: "刘丽娜", weeks: [W(11, 16)], credit: "2.5" },
  { day: 5, start: 3, end: 4, title: "课程设计（内部对象应用）", type: "practice", label: "实践", room: "6114 计算机机房", campus: "滨海校区", teacher: "刘丽娜", weeks: [W(11, 16)], credit: "1.5" },
  { day: 5, start: 5, end: 6, title: "习近平新时代中国特色社会主义思想概论", type: "online", label: "在线", room: "在线学习", campus: "线上", teacher: "刘小卫", weeks: [W(7, 7)], credit: "3.0" },
  { day: 6, start: 2, end: 3, title: "习近平新时代中国特色社会主义思想概论", type: "discussion", label: "讨论", room: "在线学习", campus: "线上", teacher: "谢海霞", weeks: [W(8, 8)], credit: "3.0" },
  { day: 7, start: 1, end: 2, title: "管理学原理", type: "lecture", label: "讲课", room: "线上课堂", campus: "滨海校区", teacher: "叶俊", weeks: [W(3, 3)], credit: "3.0" }
];

function SAVED(overrides = {}) {
  return {
    version: 1,
    semester: "2026-2027-1",
    student: { name: "测试同学", id: "123456" },
    termStartDate: "2026-09-14",
    events: TEST_EVENTS,
    favorites: [],
    theme: "light",
    week: 1,
    day: 1,
    view: "schedule",
    updatedAt: 123456,
    ...overrides
  };
}

test("index.html 空数据显示引导导入", () => {
  const s = runScenario(null);
  assert.equal(s.error, null, s.error?.stack);
  assert.ok(s.$("emptyState").innerHTML.includes("还没有课表"), "空数据显示引导文案");
  assert.ok(s.$("emptyState").innerHTML.includes("emptyImportBtn"), "引导界面含导入按钮");
});

test("index.html 预填充数据正确渲染课表", () => {
  const s = runScenario(SAVED());
  assert.equal(s.error, null, s.error?.stack);
  assert.equal(s.$("weekValue").textContent, "第 01 周");
  assert.match(s.$("courseCountValue").textContent, /14 节课/);
  assert.match(s.$("courseCountValue").textContent, /10 门/);
  assert.match(s.$("headNote").textContent, /第 1 周共有 7 节课/);
});

test("index.html 周次切换按单双周过滤", () => {
  const s = runScenario(SAVED());
  s.trigger("nextWeek");
  assert.equal(s.$("weekValue").textContent, "第 02 周");
  s.trigger("nextWeek");
  assert.match(s.$("headNote").textContent, /第 3 周共有 9 节课/);
  s.trigger("prevWeek");
  assert.equal(s.$("weekValue").textContent, "第 02 周");
});

test("index.html 主题切换与收藏视图", () => {
  const s = runScenario(SAVED());
  s.trigger("themeButton");
  assert.equal(s.documentElement.classList.contains("warm-mode"), true);
  s.trigger("navFavorites");
  assert.equal(s.$("agenda").style.display, "grid");
  assert.equal(s.$("pageTitle").textContent, "收藏课程");
});

test("index.html 课程名超九字截断、Y 轴为严格时间标尺", () => {
  const s = runScenario(SAVED());
  const scheduleHtml = s.$("schedule").innerHTML;
  assert.ok(scheduleHtml.includes('class="course-title">毛泽东思想和中国特..</span>'), "超长课程名截断为 9 字 + ..");
  assert.ok(scheduleHtml.includes('title="毛泽东思想和中国特色社会主义理论体系概论"'), "完整名保留在悬停 title");
  assert.ok(scheduleHtml.includes(">08:00<"), "Y 轴时间标尺起点 08:00");
  assert.ok(scheduleHtml.includes("08:30–09:55"), "滨海课程卡片时间标签 08:30–09:55");
});

test("index.html 从 localStorage 恢复状态", () => {
  const s = runScenario(SAVED({ week: 2, day: 3, view: "list", theme: "warm" }));
  assert.equal(s.error, null, s.error?.stack);
  assert.equal(s.$("weekValue").textContent, "第 02 周");
  assert.equal(s.$("profileName").textContent, "测试同学");
  assert.equal(s.documentElement.classList.contains("warm-mode"), true);
  assert.equal(s.$("scheduleShell").style.display, "none");
  assert.equal(s.$("agenda").style.display, "grid");
  assert.equal(s.$("updatedLabel").textContent, "本地已保存");
});
