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

function runScenario(saved) {
  const elements = {};
  const $ = (id) => { if (!elements[id]) elements[id] = makeElement(id); return elements[id]; };
  const documentElement = makeElement("documentElement");
  const body = makeElement("body");
  const storage = {};
  if (saved) storage["wmu-timetable-v1"] = JSON.stringify(saved);

  globalThis.pdfjsLib = { GlobalWorkerOptions: {} };
  globalThis.parseTimetablePdf = async () => ({});
  globalThis.document = {
    getElementById: $,
    querySelectorAll: () => [],
    addEventListener() {},
    body,
    documentElement
  };
  globalThis.window = { addEventListener() {}, lucide: { createIcons() {} } };
  globalThis.localStorage = {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, value) => { storage[key] = value; },
    removeItem: (key) => { delete storage[key]; }
  };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => "92px" });

  let error = null;
  try { new Function(code)(); } catch (caught) { error = caught; }

  const trigger = (id, type = "click") => {
    const element = $(id);
    const callback = element.listeners[type];
    if (callback) callback({ target: element, preventDefault() {} });
  };

  return { elements, documentElement, body, storage, error, $, trigger };
}

const SAVED = {
  version: 1,
  semester: "2026-2027-1",
  student: { name: "测试同学", id: "123456" },
  termStartDate: "2026-09-14",
  events: [{ day: 1, start: 1, end: 2, title: "测试课程", type: "lecture", label: "讲课", room: "测试楼101", campus: "滨海校区", teacher: "张老师", weeks: [{ start: 1, end: 16, parity: "all" }], credit: "2.5" }],
  favorites: ["测试课程"],
  theme: "warm",
  week: 2,
  day: 3,
  view: "list",
  updatedAt: 123456
};

test("index.html 脚本在空数据下正确渲染示例课表", () => {
  const s = runScenario(null);
  assert.equal(s.error, null, s.error?.stack);
  assert.equal(s.$("weekValue").textContent, "第 01 周");
  assert.match(s.$("courseCountValue").textContent, /14 节课/);
  assert.match(s.$("courseCountValue").textContent, /10 门/);
  assert.match(s.$("headNote").textContent, /第 1 周共有 7 节课/);
  assert.match(s.$("weekRangeLabel").textContent, /年/);
  assert.equal(s.$("updatedLabel").textContent, "示例数据");
});

test("index.html 周次切换按单双周过滤课程", () => {
  const s = runScenario(null);
  s.trigger("nextWeek");
  assert.equal(s.$("weekValue").textContent, "第 02 周");
  s.trigger("nextWeek");
  assert.match(s.$("headNote").textContent, /第 3 周共有 9 节课/);
  s.trigger("prevWeek");
  assert.equal(s.$("weekValue").textContent, "第 02 周");
});

test("index.html 主题切换与收藏视图", () => {
  const s = runScenario(null);
  s.trigger("themeButton");
  assert.equal(s.documentElement.classList.contains("warm-mode"), true);
  s.trigger("themeButton");
  assert.equal(s.documentElement.classList.contains("warm-mode"), false);
  s.trigger("navFavorites");
  assert.equal(s.$("agenda").style.display, "grid");
  assert.equal(s.$("pageTitle").textContent, "收藏课程");
});

test("index.html 从 localStorage 恢复状态", () => {
  const s = runScenario(SAVED);
  assert.equal(s.error, null, s.error?.stack);
  assert.equal(s.$("weekValue").textContent, "第 02 周");
  assert.equal(s.$("profileName").textContent, "测试同学");
  assert.equal(s.documentElement.classList.contains("warm-mode"), true);
  assert.equal(s.$("scheduleShell").style.display, "none");
  assert.equal(s.$("agenda").style.display, "grid");
  assert.equal(s.$("updatedLabel").textContent, "本地已保存");
});
