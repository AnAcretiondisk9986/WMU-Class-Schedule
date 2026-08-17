/**
 * 本地存储与全局状态（对应网页版 localStorage 的 state / persist / loadState）。
 */

const time = require("./time.js");

const STORAGE_KEY = "wmu-timetable-v1";

const state = {
  timetables: [],
  activeId: null,
  favorites: [],
  theme: "light",
  week: 1,
  day: 1,
  view: "schedule", // schedule | list | favorites
  query: "",
  updatedAt: 0
};

function newTimetableId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueTimetableName(base) {
  const names = new Set(state.timetables.map(t => t.name));
  if (!names.has(base)) return base;
  let index = 2;
  while (names.has(`${base}（${index}）`)) index += 1;
  return `${base}（${index}）`;
}

function currentTimetable() {
  return state.timetables.find(t => t.id === state.activeId) || null;
}

function currentEvents() {
  const tt = currentTimetable();
  return tt ? tt.events : [];
}

function currentTermStart() {
  const tt = currentTimetable();
  return (tt && tt.termStartDate) || time.toIso(time.mondayOf(new Date()));
}

function persist() {
  state.updatedAt = Date.now();
  const payload = {
    version: 2,
    timetables: state.timetables,
    activeId: state.activeId,
    favorites: state.favorites,
    theme: state.theme,
    week: state.week,
    day: state.day,
    view: state.view,
    updatedAt: state.updatedAt
  };
  try {
    wx.setStorageSync(STORAGE_KEY, payload);
  } catch (error) {
    console.warn("保存失败", error);
  }
}

function loadState() {
  let saved = null;
  try {
    saved = wx.getStorageSync(STORAGE_KEY);
  } catch (error) {
    saved = null;
  }
  if (saved && saved.version === 2 && Array.isArray(saved.timetables) && saved.timetables.length) {
    state.timetables = saved.timetables;
    state.activeId = saved.activeId || saved.timetables[0].id || null;
    state.favorites = Array.isArray(saved.favorites) ? saved.favorites : [];
    state.theme = saved.theme === "warm" ? "warm" : "light";
    state.week = Number.isFinite(saved.week) ? saved.week : 1;
    state.day = Number.isFinite(saved.day) ? saved.day : 1;
    state.view = ["schedule", "list", "favorites"].includes(saved.view) ? saved.view : "schedule";
    state.updatedAt = saved.updatedAt || 0;
    return true;
  }
  // 兼容旧版单课表格式
  if (saved && saved.version === 1 && Array.isArray(saved.events) && saved.events.length) {
    state.timetables = [{
      id: newTimetableId(),
      name: saved.semester || "课表 1",
      semester: saved.semester || "",
      student: saved.student || { name: "", id: "" },
      termStartDate: saved.termStartDate || time.toIso(time.mondayOf(new Date())),
      events: saved.events,
      updatedAt: saved.updatedAt || 0
    }];
    state.activeId = state.timetables[0].id;
    state.favorites = Array.isArray(saved.favorites) ? saved.favorites : [];
    state.theme = saved.theme === "warm" ? "warm" : "light";
    state.week = Number.isFinite(saved.week) ? saved.week : 1;
    state.day = Number.isFinite(saved.day) ? saved.day : 1;
    state.view = ["schedule", "list", "favorites"].includes(saved.view) ? saved.view : "schedule";
    state.updatedAt = saved.updatedAt || 0;
    return true;
  }
  resetData();
  return false;
}

function resetData() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (error) {}
  state.timetables = [];
  state.activeId = null;
  state.favorites = [];
  state.theme = "light";
  state.week = 1;
  state.day = 1;
  state.view = "schedule";
  state.query = "";
  state.updatedAt = 0;
}

// 解析结果 -> 新建课表（对应网页版 confirmImport）
function addTimetable(parsedResult) {
  const events = (parsedResult.events || []).map(time.eventFromParsed);
  const semester = parsedResult.semester || "未设置学期";
  const timetable = {
    id: newTimetableId(),
    name: uniqueTimetableName(semester),
    semester,
    student: parsedResult.student || { name: "", id: "" },
    termStartDate: time.toIso(time.mondayOf(new Date())),
    events,
    updatedAt: Date.now()
  };
  state.timetables.push(timetable);
  state.activeId = timetable.id;
  state.favorites = [];
  state.week = 1;
  state.day = 1;
  state.view = "schedule";
  state.query = "";
  persist();
  return timetable;
}

function switchTimetable(id) {
  const tt = state.timetables.find(t => t.id === id);
  if (!tt) return false;
  state.activeId = id;
  state.week = 1;
  state.day = 1;
  state.view = "schedule";
  state.query = "";
  persist();
  return true;
}

function toggleFavorite(title) {
  const index = state.favorites.indexOf(title);
  if (index >= 0) state.favorites.splice(index, 1);
  else state.favorites.push(title);
  persist();
  return index < 0; // true 表示新收藏
}

function isFavorite(title) {
  return state.favorites.includes(title);
}

function setTheme(theme) {
  state.theme = theme === "warm" ? "warm" : "light";
  persist();
}

function exportPayload() {
  return JSON.stringify({
    version: 2,
    timetables: state.timetables,
    activeId: state.activeId,
    favorites: state.favorites,
    theme: state.theme,
    week: state.week,
    day: state.day,
    view: state.view,
    updatedAt: Date.now()
  }, null, 2);
}

function importPayload(data) {
  if (!data || data.version !== 2 || !Array.isArray(data.timetables)) return false;
  state.timetables = data.timetables;
  state.activeId = data.activeId || data.timetables[0].id || null;
  state.favorites = Array.isArray(data.favorites) ? data.favorites : [];
  state.theme = data.theme === "warm" ? "warm" : "light";
  state.week = Number.isFinite(data.week) ? data.week : 1;
  state.day = Number.isFinite(data.day) ? data.day : 1;
  state.view = ["schedule", "list", "favorites"].includes(data.view) ? data.view : "schedule";
  persist();
  return true;
}

module.exports = {
  STORAGE_KEY,
  state,
  currentTimetable,
  currentEvents,
  currentTermStart,
  persist,
  loadState,
  resetData,
  addTimetable,
  switchTimetable,
  toggleFavorite,
  isFavorite,
  setTheme,
  exportPayload,
  importPayload
};
