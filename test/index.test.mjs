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
  const triggerEvent = (id, type, event) => {
    withMocks(mocks, () => {
      const callback = $(id).listeners[type];
      if (callback) callback({ target: $(id), currentTarget: $(id), preventDefault() {}, stopPropagation() {}, ...event });
    });
  };

  return { elements, documentElement, body, storage, error, $, trigger, triggerEvent };
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

function TT(id, name, semester, studentName, events) {
  return { id, name, semester, student: { name: studentName, id: "123456" }, termStartDate: "2026-09-14", events, updatedAt: 123456 };
}

function SAVED(overrides = {}) {
  return {
    version: 2,
    timetables: [TT("t1", "2026-2027-1", "2026-2027-1", "测试同学", TEST_EVENTS)],
    activeId: "t1",
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

test("网页仅通过本地 PDF 导入课表", () => {
  assert.match(html, /id="importButton" aria-label="导入 PDF" title="导入 PDF"/);
  assert.match(html, /选择从教务系统导出的课表 PDF/);
  assert.match(html, /href="https:\/\/jwxt\.wmu\.edu\.cn\/jwglxt\/kbcx\/xskbcx_cxXskbcxIndex\.html\?gnmkdm=N2151&amp;layout=default" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /jwxt-bridge|manifest\.webmanifest|快捷导入|一键导入|书签栏|系统分享|serviceWorker|postMessage|downForm/);
});

test("index.html 预填充数据正确渲染课表", () => {
  const s = runScenario(SAVED());
  assert.equal(s.error, null, s.error?.stack);
  assert.equal(s.$("weekValue").textContent, "第 01 周");
  assert.match(s.$("courseCountValue").textContent, /14 节课/);
  assert.match(s.$("courseCountValue").textContent, /10 门/);
  assert.match(s.$("headNote").textContent, /第 1 周共有 7 节课/);
});

test("自定义日程默认当前周日并保存为最高层彩色卡片", () => {
  const s = runScenario(SAVED());
  s.trigger("addCustomButton");

  assert.equal(s.$("customBackdrop").classList.contains("modal-open"), true);
  assert.ok(Number.isInteger(Number(s.$("customWeek").value)), "默认周次有效");
  assert.ok(Number(s.$("customDay").value) >= 1 && Number(s.$("customDay").value) <= 7, "默认星期有效");
  assert.match(s.$("customStart").value, /^\d{2}:\d{2}$/);
  assert.match(s.$("customEnd").value, /^\d{2}:\d{2}$/);

  s.$("customTitle").value = "实验室组会";
  s.$("customDescription").value = "汇报本周进度";
  s.$("customRoom").value = "求知楼 204";
  s.$("customWeek").value = "2";
  s.$("customDay").value = "3";
  s.$("customStart").value = "07:30";
  s.$("customEnd").value = "08:20";
  s.trigger("customSave");

  const saved = JSON.parse(s.storage["wmu-timetable-v1"]);
  assert.equal(saved.timetables[0].customEvents.length, 1);
  assert.deepEqual(saved.timetables[0].customEvents[0], {
    id: saved.timetables[0].customEvents[0].id,
    kind: "custom",
    title: "实验室组会",
    description: "汇报本周进度",
    room: "求知楼 204",
    week: 2,
    day: 3,
    startTime: "07:30",
    endTime: "08:20",
    color: "brand",
    type: "custom",
    label: "自定义",
    campus: "",
    teacher: "",
    credit: "—",
    weeks: [W(2, 2)]
  });
  assert.equal(s.$("customBackdrop").classList.contains("modal-open"), false);
  assert.match(s.$("schedule").innerHTML, /class="course type-custom layer-custom custom-event/);
  assert.match(s.$("schedule").innerHTML, /--course-accent:#a71f3c/);
  assert.match(html, /\.course\.layer-custom \{ z-index: 30; \}/);
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

test("index.html 按校区精确显示非等间隔作息时间", () => {
  const periods = [
    { ...TEST_EVENTS[0], day: 1, start: 3, end: 4, title: "茶山第三至四节", campus: "茶山校区" },
    { ...TEST_EVENTS[0], day: 2, start: 3, end: 4, title: "滨海第三至四节", campus: "滨海校区" },
    { ...TEST_EVENTS[0], day: 3, start: 7, end: 8, title: "滨海第七至八节", campus: "滨海校区" },
    { ...TEST_EVENTS[0], day: 4, start: 8, end: 9, title: "茶山第八至九节", campus: "茶山校区" },
    { ...TEST_EVENTS[0], day: 5, start: 14, end: 15, title: "学院路第十四至十五节", campus: "学院路校区" },
    { ...TEST_EVENTS[0], day: 6, start: 16, end: 17, title: "滨海第十六至十七节", campus: "滨海校区" }
  ];
  const s = runScenario(SAVED({
    timetables: [TT("periods", "2026-2027-1", "2026-2027-1", "测试同学", periods)],
    activeId: "periods"
  }));
  const scheduleHtml = s.$("schedule").innerHTML;

  assert.match(scheduleHtml, /09:40–11:05/, "茶山第三至四节");
  assert.match(scheduleHtml, /10:10–11:35/, "滨海第三至四节");
  assert.match(scheduleHtml, /13:05–14:10/, "滨海第七至八节");
  assert.match(scheduleHtml, /13:30–14:55/, "各校区第八至九节");
  assert.match(scheduleHtml, /18:20–19:45/, "各校区第十四至十五节");
  assert.match(scheduleHtml, /19:50–21:15/, "各校区第十六至十七节");
});

test("40 分钟课程卡片只显示名称和地点", () => {
  const event = { ...TEST_EVENTS[0], start: 1, end: 1, title: "单节40分钟", campus: "茶山校区", room: "6B203", label: "讲课" };
  const s = runScenario(SAVED({
    timetables: [TT("forty-minutes", "2026-2027-1", "2026-2027-1", "测试同学", [event])],
    activeId: "forty-minutes"
  }));
  const card = s.$("schedule").innerHTML.match(/<button class="course[^>]*title="单节40分钟">[\s\S]*?<\/button>/)?.[0] || "";

  assert.match(card, /course-40min/);
  assert.match(card, /course-title">单节40分钟/);
  assert.match(card, /course-room-code">6B203/);
  assert.doesNotMatch(card, /course-room-icon|data-lucide="map-pin"|course-time|course-meta|course-type/);
});

test("不足 40 分钟的极短课程卡片只显示居中名称", () => {
  const event = { ...TEST_EVENTS[0], start: 7, end: 7, title: "极短课程", campus: "滨海校区", room: "1102", label: "讲课" };
  const s = runScenario(SAVED({
    timetables: [TT("ultra-short", "2026-2027-1", "2026-2027-1", "测试同学", [event])],
    activeId: "ultra-short"
  }));
  const card = s.$("schedule").innerHTML.match(/<button class="course[^>]*title="极短课程">[\s\S]*?<\/button>/)?.[0] || "";

  assert.match(card, /course-ultra-short/);
  assert.match(card, /course-title">极短课程/);
  assert.doesNotMatch(card, /course-room|course-time|course-meta|course-type/);
  assert.match(html, /\.course\.course-ultra-short \.course-title \{[^}]*align-self: center;[^}]*text-align: center;/);
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

test("index.html 切换课表列表渲染", () => {
  const s = runScenario(SAVED({
    timetables: [
      TT("t1", "2026-2027-1", "2026-2027-1", "甲同学", TEST_EVENTS),
      TT("t2", "2025-2026-1", "2025-2026-1", "乙同学", [TEST_EVENTS[0]])
    ],
    activeId: "t1"
  }));
  assert.equal(s.error, null, s.error?.stack);
  s.trigger("navSwitch");
  assert.ok(s.$("switchList").innerHTML.includes("2026-2027-1"), "列表含第一个课表");
  assert.ok(s.$("switchList").innerHTML.includes("2025-2026-1"), "列表含第二个课表");
  assert.ok(s.$("switchList").innerHTML.includes("当前"), "当前课表有标记");
});

test("周表头同时渲染星期与日期", () => {
  const s = runScenario(SAVED());
  assert.match(s.$("schedule").innerHTML, /head-date/);
  assert.match(s.$("schedule").innerHTML, /周一/);
});

test("移动端校徽按钮打开完整导航并隐藏底部导航", () => {
  const s = runScenario(null);
  s.trigger("mobileMenuButton");
  assert.equal(s.body.classList.contains("mobile-nav-open"), true);
  assert.equal(s.$("mobileNavPanel")["attr_aria-hidden"], "false");
  s.trigger("mobileNavClose");
  assert.equal(s.body.classList.contains("mobile-nav-open"), false);
});

test("窄屏横向拖动切换到下一周", () => {
  const s = runScenario(SAVED());
  s.triggerEvent("weekSwipeSurface", "pointerdown", { pointerId: 1, pointerType: "touch", clientX: 280, clientY: 420 });
  s.triggerEvent("weekSwipeSurface", "pointermove", { pointerId: 1, pointerType: "touch", clientX: 120, clientY: 420 });
  assert.match(s.$("weekSwipeSurface").style.transform, /calc\(-100% \+ -160px\)/, "拖动中轨道与手指同步");
  s.triggerEvent("weekSwipeSurface", "pointerup", { pointerId: 1, pointerType: "touch", clientX: 80, clientY: 420 });
  assert.equal(s.$("weekValue").textContent, "第 02 周");
});

test("周滑动前预渲染相邻周课表", () => {
  const nextOnly = { ...TEST_EVENTS[0], title: "第二周预渲染课程", weeks: [W(2, 2)] };
  const s = runScenario(SAVED({
    timetables: [TT("preview", "2026-2027-1", "2026-2027-1", "测试同学", [TEST_EVENTS[0], nextOnly])],
    activeId: "preview"
  }));

  assert.equal(s.$("nextWeekPreview")["attr_data-preview-week"], "2");
  assert.doesNotMatch(s.$("schedule").innerHTML, /第二周预渲染课程/);
  assert.match(s.$("nextWeekPreview").innerHTML, /第二周预渲染课程/);
  assert.match(html, /\.week-swipe-surface \{ display: grid; grid-template-columns: repeat\(3, 100%\); transform: translate3d\(-100%, 0, 0\);/);
});

test("课程详情可向右跟手滑动并关闭", () => {
  const s = runScenario(SAVED());
  s.body.classList.add("drawer-open");
  s.$("drawer").setAttribute("aria-hidden", "false");

  s.triggerEvent("drawer", "pointerdown", { pointerId: 2, pointerType: "touch", clientX: 40, clientY: 180 });
  s.triggerEvent("drawer", "pointermove", { pointerId: 2, pointerType: "touch", clientX: 180, clientY: 184 });
  assert.match(s.$("drawer").style.transform, /translate3d\(140px, 0, 0\)/, "详情页与右滑手势同步");
  assert.ok(Number(s.$("drawerBackdrop").style.opacity) < 1, "遮罩随抽屉关闭进度减淡");

  s.triggerEvent("drawer", "pointerup", { pointerId: 2, pointerType: "touch", clientX: 240, clientY: 184 });
  assert.equal(s.body.classList.contains("drawer-open"), false);
  assert.equal(s.$("drawer")["attr_aria-hidden"], "true");
  assert.match(html, /\.drawer \{[^}]*touch-action: pan-y;[^}]*will-change: transform;/);
});

test("宽屏侧栏、顶栏和当前课程高亮规则已定义", () => {
  assert.match(html, /@media \(min-width: 1081px\)[\s\S]*?\.sidebar \{ position: sticky;/);
  assert.match(html, /\.topbar \{ position: sticky; top: 0; z-index: 9;/);
  assert.match(html, /\.day-column\.today-column \{ background-color: #f8e9ed;/);
  assert.match(html, /\.course\.ongoing \{ --course-bg: #DEBA85;/);
  assert.match(code, /const ongoing = isCurrentWeek && event\.day === todayKey && nowMinutes >= eventStartMinute\(event\) && nowMinutes < eventEndMinute\(event\);/);
});

test("星期表头固定且竖屏地点按结构换行", () => {
  assert.match(html, /\.schedule-head \{ position: sticky; top: var\(--topbar-height\); z-index: 8;/);
  assert.match(html, /\.week-swipe-viewport \{ overflow: hidden; overflow: clip; \}/);
  assert.match(html, /\.schedule-shell \{[^}]*overflow: hidden; overflow: clip;/);
  assert.doesNotMatch(html, /day-strip|data-day=|class="day /);
  assert.match(html, /\.course \{[^}]*overflow: hidden;/);
  assert.match(html, /\.course-content \{[^}]*min-height: 0;[^}]*overflow: auto;[^}]*overscroll-behavior: contain;/);
  assert.match(html, /\.course-room \{ display: grid; width: 100%;[^}]*justify-items: center;/);
  assert.match(html, /\.course-room-icon \{ display: flex; width: 100%;[^}]*justify-content: center;/);
  assert.match(html, /\.course-room-code \{ white-space: nowrap; overflow-wrap: normal; word-break: normal; \}/);
  assert.match(html, /@media \(max-width: 520px\) and \(max-aspect-ratio: 1\/1\)[\s\S]*?data-room-code-length="4"\] \{ font-size: 9px; \}[\s\S]*?data-room-code-length="5"\] \{ font-size: 7px; \}[\s\S]*?data-room-code-length="6"\] \{ font-size: 6px; \}/);
  assert.match(html, /\.course-room-extra, \.course-room-free \{ white-space: normal; overflow-wrap: anywhere; word-break: break-word; \}/);
  assert.doesNotMatch(html, /\.course\.course-compact \.course-room, \.course\.course-compact \.course-type \{ display: none; \}/);
  assert.doesNotMatch(html, /\.course\.course-tiny \.course-room, \.course\.course-tiny \.course-type/);
});

test("重叠课程按讲课、线上、无地点、平台确定图层", () => {
  const overlaps = [
    { ...TEST_EVENTS[0], title: "最高层讲课", type: "lecture", label: "讲课", room: "学习通" },
    { ...TEST_EVENTS[0], title: "线上课程", type: "online", label: "在线", room: "云端直播间", campus: "线上" },
    { ...TEST_EVENTS[0], title: "地点待定", type: "lab", label: "实验", room: "待定" },
    { ...TEST_EVENTS[0], title: "平台课程", type: "online", label: "在线", room: "学习通", campus: "线上" },
    { ...TEST_EVENTS[0], title: "空地点", type: "lab", label: "实验", room: "" }
  ];
  const s = runScenario(SAVED({ timetables: [TT("layers", "2026-2027-1", "2026-2027-1", "测试同学", overlaps)], activeId: "layers" }));
  const scheduleHtml = s.$("schedule").innerHTML;

  assert.match(scheduleHtml, /class="course type-lecture layer-lecture[^"]*"[^>]*title="最高层讲课"/);
  assert.match(scheduleHtml, /class="course type-online layer-online[^"]*"[^>]*title="线上课程"/);
  assert.match(scheduleHtml, /class="course type-lab layer-missing[^"]*"[^>]*title="地点待定"/);
  assert.match(scheduleHtml, /class="course type-online layer-platform[^"]*"[^>]*title="平台课程"/);
  assert.match(scheduleHtml, /class="course type-lab layer-missing[^"]*"[^>]*title="空地点"/);
  assert.match(html, /\.course\.layer-platform \{ z-index: 2; \}[\s\S]*?\.course\.layer-missing \{ z-index: 3; \}[\s\S]*?\.course\.layer-online \{ z-index: 5; \}[\s\S]*?\.course\.layer-lecture \{ z-index: 6; \}/);
  assert.match(html, /\.course:hover, \.course:focus-visible \{ z-index: 20;/);
});

test("课程卡片的可见信息元素纵向等距分布", () => {
  const s = runScenario(SAVED());
  const firstCourse = s.$("schedule").innerHTML.match(/<button class="course[\s\S]*?<\/button>/)?.[0] || "";
  assert.match(firstCourse, /<span class="course-content">[\s\S]*<span class="course-meta">[\s\S]*<\/span><span class="course-type">讲课<\/span><\/span><\/button>$/);
  assert.match(html, /\.course-type \{[^}]*align-self: center;/);
  assert.match(html, /\.course-content \{[^}]*flex: 1 1 auto;[^}]*justify-content: space-evenly;[^}]*overflow: auto;/);
  assert.match(html, /\.course-time \{[^}]*margin: 0;/);
  assert.match(html, /\.course-room \{[^}]*margin: 0;/);
  assert.match(html, /\.course-meta \{[^}]*margin: 0;/);
  assert.match(html, /\.course-type \{[^}]*margin: 0;/);
  assert.match(html, /\.course\.course-tiny \.course-meta \{ display: none; \}/);
  assert.doesNotMatch(html, /\.course\.course-(?:compact|tiny) \.course-type \{ display: none; \}/);
});

test("按校区隐藏无用教室说明且保留学院路原始格式", () => {
  const rooms = [
    { ...TEST_EVENTS[0], day: 1, campus: "茶山校区", room: "6A101（智慧教室）" },
    { ...TEST_EVENTS[1], day: 2, campus: "茶山校区", room: "6B203 （智慧教室）" },
    { ...TEST_EVENTS[2], day: 3, campus: "滨海校区", room: "6114计算机机房" },
    { ...TEST_EVENTS[3], day: 4, campus: "学院路校区", room: "教学楼 A101（智慧教室）" },
    { ...TEST_EVENTS[4], day: 5, campus: "滨海校区", room: "求知楼6114计算机机房", weeks: [W(1, 16)] },
    { ...TEST_EVENTS[5], day: 6, campus: "茶山校区", room: "教学楼6A101（智慧教室）" },
    { ...TEST_EVENTS[6], day: 7, campus: "茶山校区", room: "7CJ305" }
  ];
  const s = runScenario(SAVED({ timetables: [TT("rooms", "2026-2027-1", "2026-2027-1", "测试同学", rooms)], activeId: "rooms" }));
  const scheduleHtml = s.$("schedule").innerHTML;
  assert.match(scheduleHtml, /course-room-code">6A101</);
  assert.match(scheduleHtml, /course-room-code">6B203</);
  assert.match(scheduleHtml, /course-room-code">6114</);
  assert.match(scheduleHtml, /data-room-code-length="5" class="course-room-code">6B203/);
  assert.match(scheduleHtml, /data-room-code-length="6" class="course-room-code">7CJ305/);
  assert.match(scheduleHtml, /course-room-free">教学楼 A101（智慧教室）</);
  assert.match(scheduleHtml, /course-room-free">求知楼6114计算机机房</);
  assert.match(scheduleHtml, /course-room-free">教学楼6A101（智慧教室）</);
  assert.doesNotMatch(scheduleHtml, /course-room-code">(?:6114计算机机房|6A101（智慧教室）|6B203 （智慧教室）)<\/span>/);
});

test("教室图标独占一行，短教室号与说明分行，长地点自由换行", () => {
  const rooms = [
    { ...TEST_EVENTS[0], day: 1, campus: "茶山校区", room: "A101东区" },
    { ...TEST_EVENTS[1], day: 2, campus: "茶山校区", room: "10-B203" },
    { ...TEST_EVENTS[2], day: 3, campus: "茶山校区", room: "4B3楼生化实验室7" }
  ];
  const s = runScenario(SAVED({ timetables: [TT("room-layout", "2026-2027-1", "2026-2027-1", "测试同学", rooms)], activeId: "room-layout" }));
  const scheduleHtml = s.$("schedule").innerHTML;

  assert.match(scheduleHtml, /course-room-icon"><i data-lucide="map-pin"><\/i><\/span>/);
  assert.match(scheduleHtml, /course-room-code">A101<\/span><span class="course-room-extra">东区<\/span>/);
  assert.match(scheduleHtml, /course-room-body course-room-free">10-B203<\/span>/);
  assert.match(scheduleHtml, /course-room-body course-room-free">4B3楼生化实验室7<\/span>/);
  assert.doesNotMatch(scheduleHtml, /course-room-code">(?:10-B203|4B3楼生化实验室7)</);
});
