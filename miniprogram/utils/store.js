/**
 * 本地存储与全局状态（对应网页版 localStorage 的 state / persist / loadState）。
 */

const time = require("./time.js");

const STORAGE_KEY = "wmu-timetable-v1";
const VALID_EVENT_TYPES = new Set(["lecture", "lab", "online", "discussion", "practice", "independent", "custom"]);
const VALID_COLORS = new Set(["brand", "gold", "blue", "mint", "violet"]);
const MAX_PERIOD = 19;

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

function safeText(value, fallback = "", limit = 500) {
  return String(value == null ? fallback : value).trim().slice(0, limit);
}

// 收藏必须绑定课表，避免不同学期的同名课程互相影响。
function normalizeFavoritePart(value) {
  return safeText(value, "", 240).toLowerCase().replace(/\s+/g, " ");
}

function favoriteKey(event, timetableId) {
  if (!event || typeof event !== "object") return "";
  const owner = safeText(timetableId || event.timetableId || state.activeId, "", 120);
  const courseCode = normalizeFavoritePart(event.courseCode);
  const className = normalizeFavoritePart(event.className);
  const title = normalizeFavoritePart(event.title == null ? event.courseName : event.title);
  const identity = courseCode
    ? `code:${courseCode}`
    : className
      ? `class:${className}`
      : title
        ? `title:${title}`
        : "";
  return owner && identity ? `${owner}::${identity}` : "";
}

function looksLikeFavoriteKey(value) {
  return /::(?:code|class|title):/.test(String(value || ""));
}

function integerInRange(value, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

function validClock(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
}

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === Number(match[1])
    && date.getMonth() + 1 === Number(match[2])
    && date.getDate() === Number(match[3]);
}

function normalizeWeeks(value) {
  if (!Array.isArray(value)) return null;
  const ranges = value.map(range => {
    if (!range || typeof range !== "object") return null;
    const start = integerInRange(range.start, 1, 99);
    const end = integerInRange(range.end, 1, 99);
    const parity = ["all", "odd", "even"].includes(range.parity) ? range.parity : null;
    return start != null && end != null && end >= start && parity ? { start, end, parity } : null;
  });
  return ranges.every(Boolean) ? ranges : null;
}

function normalizeEvent(value) {
  if (!value || typeof value !== "object") return null;
  const custom = value.kind === "custom" || value.type === "custom";
  const title = safeText(value.title == null ? value.courseName : value.title);
  const day = integerInRange(value.day == null ? value.weekday : value.day, 1, 7);
  if (!title || day == null) return null;

  if (custom) {
    const week = integerInRange(value.week == null ? value.weeks && value.weeks[0] && value.weeks[0].start : value.week, -52, 99);
    const startTime = safeText(value.startTime, "", 5);
    const endTime = safeText(value.endTime, "", 5);
    if (week == null || !validClock(startTime) || !validClock(endTime) || time.timeToMinutes(endTime) <= time.timeToMinutes(startTime)) return null;
    return {
      id: safeText(value.id, newTimetableId(), 120), kind: "custom", title,
      description: safeText(value.description, "", 120), room: safeText(value.room, "", 120),
      week, day, startTime, endTime, color: VALID_COLORS.has(value.color) ? value.color : "brand",
      type: "custom", label: "自定义", campus: "", teacher: "", credit: "—",
      weeks: [{ start: week, end: week, parity: "all" }]
    };
  }

  const start = integerInRange(value.start == null ? value.periods && value.periods.start : value.start, 1, MAX_PERIOD);
  const end = integerInRange(value.end == null ? value.periods && value.periods.end : value.end, 1, MAX_PERIOD);
  const rawType = value.type == null ? value.activity : value.type;
  const type = VALID_EVENT_TYPES.has(rawType) ? rawType : null;
  const weeks = normalizeWeeks(value.weeks);
  if (start == null || end == null || end < start || !type || !weeks) return null;
  return {
    day, start, end, title, type,
    label: safeText(value.label == null ? value.activityLabel : value.label, type === "lecture" ? "讲课" : "课程", 40),
    room: safeText(value.room, "", 160) || "待定", campus: safeText(value.campus, "", 80) || "未标注校区",
    teacher: safeText(value.teacher, "", 120) || "待定", weeks,
    credit: value.credit == null ? "—" : safeText(value.credit, "—", 30),
    courseCode: safeText(value.courseCode, "", 80), className: safeText(value.className, "", 180),
    classComposition: safeText(value.classComposition, "", 180), assessment: safeText(value.assessment, "", 120),
    note: safeText(value.note, "", 240), courseHours: safeText(value.courseHours, "", 120),
    weeklyHours: value.weeklyHours == null || !Number.isFinite(Number(value.weeklyHours)) ? null : Number(value.weeklyHours),
    totalHours: value.totalHours == null || !Number.isFinite(Number(value.totalHours)) ? null : Number(value.totalHours)
  };
}

function normalizeTimetable(value) {
  if (!value || typeof value !== "object" || !safeText(value.id, "", 120)) return null;
  if (!Array.isArray(value.events) || !Array.isArray(value.customEvents || [])) return null;
  const events = value.events.map(normalizeEvent);
  const customEvents = (value.customEvents || []).map(normalizeEvent);
  if (events.some(event => !event) || customEvents.some(event => !event || event.kind !== "custom")) return null;
  const termStartDate = validDate(value.termStartDate) ? value.termStartDate : "";
  return {
    id: safeText(value.id, "", 120), name: safeText(value.name, "", 120) || "课表", semester: safeText(value.semester, "", 80),
    student: { name: safeText(value.student && value.student.name, "", 80), id: safeText(value.student && value.student.id, "", 80) },
    termStartDate, termStartConfirmed: value.termStartConfirmed !== false && !!termStartDate,
    events, customEvents, updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : 0
  };
}

function normalizeBackup(value) {
  if (!value || value.version !== 2 || !Array.isArray(value.timetables) || !value.timetables.length) return null;
  const timetables = value.timetables.map(normalizeTimetable);
  if (timetables.some(timetable => !timetable)) return null;
  const ids = new Set(timetables.map(timetable => timetable.id));
  if (ids.size !== timetables.length) return null;
  return {
    timetables,
    activeId: ids.has(value.activeId) ? value.activeId : timetables[0].id,
    favorites: Array.isArray(value.favorites) ? value.favorites.filter(item => typeof item === "string").map(item => item.slice(0, 420)) : null,
    theme: value.theme === "warm" ? "warm" : "light",
    week: value.week == null ? 1 : (integerInRange(value.week, -52, 99) ?? 1),
    day: integerInRange(value.day, 1, 7) || 1,
    view: ["schedule", "list", "favorites"].includes(value.view) ? value.view : "schedule",
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : 0
  };
}

function migrateFavorites(favorites = state.favorites, timetables = state.timetables) {
  const source = Array.isArray(favorites) ? favorites : [];
  const knownKeys = new Set();
  const titleMatches = new Map();
  (Array.isArray(timetables) ? timetables : []).forEach(timetable => {
    const timetableId = safeText(timetable && timetable.id, "", 120);
    const events = timetable && Array.isArray(timetable.events) ? timetable.events : [];
    events.forEach(event => {
      const key = favoriteKey(event, timetableId);
      if (!key) return;
      knownKeys.add(key);
      const title = normalizeFavoritePart(event.title == null ? event.courseName : event.title);
      if (!title) return;
      const matches = titleMatches.get(title) || [];
      if (!matches.includes(key)) matches.push(key);
      titleMatches.set(title, matches);
    });
  });

  const result = [];
  const seen = new Set();
  const add = value => {
    const item = safeText(value, "", 420);
    if (!item || seen.has(item)) return;
    seen.add(item);
    result.push(item);
  };

  source.forEach(value => {
    if (typeof value !== "string") return;
    const item = safeText(value, "", 420);
    if (!item) return;
    if (knownKeys.has(item) || looksLikeFavoriteKey(item)) {
      // 已经是稳定 key，或指向当前尚未导入的课表，原样保留。
      add(item);
      return;
    }
    const matches = titleMatches.get(normalizeFavoritePart(item));
    if (matches && matches.length) matches.forEach(add);
    else add(item); // 无法匹配时保留旧值，待后续导入课表时再尝试迁移。
  });
  return result;
}

function favoriteInputKey(eventOrTitle, timetableId) {
  if (eventOrTitle && typeof eventOrTitle === "object") {
    return favoriteKey(eventOrTitle, timetableId);
  }
  if (typeof eventOrTitle !== "string") return "";
  const raw = safeText(eventOrTitle, "", 420);
  if (!raw) return "";
  if (looksLikeFavoriteKey(raw)) return raw;
  const owner = timetableId || state.activeId;
  const timetable = state.timetables.find(item => item.id === owner);
  const title = normalizeFavoritePart(raw);
  const event = timetable && (timetable.events || []).find(item =>
    normalizeFavoritePart(item.title == null ? item.courseName : item.title) === title
  );
  return event ? favoriteKey(event, owner) : raw;
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
  state.favorites = migrateFavorites(state.favorites, state.timetables);
  const updatedAt = Date.now();
  const payload = {
    version: 2,
    timetables: state.timetables,
    activeId: state.activeId,
    favorites: state.favorites,
    theme: state.theme,
    week: state.week,
    day: state.day,
    view: state.view,
    updatedAt
  };
  try {
    wx.setStorageSync(STORAGE_KEY, payload);
    state.updatedAt = updatedAt;
    return true;
  } catch (error) {
    console.warn("保存失败", error);
    return false;
  }
}

function loadState() {
  let saved = null;
  try {
    saved = wx.getStorageSync(STORAGE_KEY);
  } catch (error) {
    saved = null;
  }
  const normalized = normalizeBackup(saved);
  if (normalized) {
    state.timetables = normalized.timetables;
    state.activeId = normalized.activeId;
    state.favorites = migrateFavorites(normalized.favorites || [], state.timetables);
    state.theme = normalized.theme;
    state.week = normalized.week;
    state.day = normalized.day;
    state.view = normalized.view;
    state.updatedAt = normalized.updatedAt;
    return true;
  }
  // 兼容旧版单课表格式
  if (saved && saved.version === 1 && Array.isArray(saved.events) && saved.events.length) {
    const events = saved.events.map(time.eventFromParsed).map(normalizeEvent);
    if (events.every(Boolean)) {
      state.timetables = [{
        id: newTimetableId(),
        name: saved.semester || "课表 1",
        semester: saved.semester || "",
        student: saved.student || { name: "", id: "" },
        termStartDate: validDate(saved.termStartDate) ? saved.termStartDate : time.toIso(time.mondayOf(new Date())),
        termStartConfirmed: validDate(saved.termStartDate),
        events,
        customEvents: [],
        updatedAt: saved.updatedAt || 0
      }];
      state.activeId = state.timetables[0].id;
      state.favorites = migrateFavorites(Array.isArray(saved.favorites) ? saved.favorites : [], state.timetables);
      state.theme = saved.theme === "warm" ? "warm" : "light";
      state.week = Number.isFinite(saved.week) ? saved.week : 1;
      state.day = Number.isFinite(saved.day) ? saved.day : 1;
      state.view = ["schedule", "list", "favorites"].includes(saved.view) ? saved.view : "schedule";
      state.updatedAt = saved.updatedAt || 0;
      return true;
    }
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
  if (!parsedResult || !Array.isArray(parsedResult.events) || !parsedResult.events.length) return null;
  const events = parsedResult.events.map(time.eventFromParsed).map(normalizeEvent);
  if (events.some(event => !event)) return null;
  const semester = parsedResult.semester || "未设置学期";
  const inherited = state.timetables.find(timetable => timetable.semester === semester && timetable.termStartDate);
  const previous = {
    timetables: [...state.timetables],
    activeId: state.activeId,
    favorites: [...state.favorites],
    week: state.week,
    day: state.day,
    view: state.view,
    query: state.query,
    updatedAt: state.updatedAt
  };
  const timetable = {
    id: newTimetableId(),
    name: uniqueTimetableName(semester),
    semester,
    student: parsedResult.student || { name: "", id: "" },
    termStartDate: inherited ? inherited.termStartDate : time.toIso(time.mondayOf(new Date())),
    termStartConfirmed: inherited ? inherited.termStartConfirmed !== false : false,
    events,
    updatedAt: Date.now()
  };
  state.timetables.push(timetable);
  state.activeId = timetable.id;
  state.favorites = migrateFavorites(state.favorites, state.timetables);
  state.week = 1;
  state.day = 1;
  state.view = "schedule";
  state.query = "";
  if (!persist()) {
    Object.assign(state, previous);
    return null;
  }
  return timetable;
}

function switchTimetable(id) {
  const tt = state.timetables.find(t => t.id === id);
  if (!tt) return false;
  state.favorites = migrateFavorites(state.favorites, state.timetables);
  state.activeId = id;
  state.week = 1;
  state.day = 1;
  state.view = "schedule";
  state.query = "";
  persist();
  return true;
}

function toggleFavorite(eventOrTitle, timetableId) {
  state.favorites = migrateFavorites(state.favorites, state.timetables);
  const key = favoriteInputKey(eventOrTitle, timetableId);
  if (!key) return false;
  const index = state.favorites.indexOf(key);
  if (index >= 0) state.favorites.splice(index, 1);
  else state.favorites.push(key);
  persist();
  return index < 0; // true 表示新收藏
}

function isFavorite(eventOrTitle, timetableId) {
  state.favorites = migrateFavorites(state.favorites, state.timetables);
  const key = favoriteInputKey(eventOrTitle, timetableId);
  return !!key && state.favorites.includes(key);
}

function setTheme(theme) {
  state.theme = theme === "warm" ? "warm" : "light";
  persist();
}

function exportPayload() {
  state.favorites = migrateFavorites(state.favorites, state.timetables);
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
  const normalized = normalizeBackup(data);
  if (!normalized) return false;
  const previous = {
    timetables: state.timetables,
    activeId: state.activeId,
    favorites: [...state.favorites],
    theme: state.theme,
    week: state.week,
    day: state.day,
    view: state.view,
    updatedAt: state.updatedAt
  };
  state.timetables = normalized.timetables;
  state.activeId = normalized.activeId;
  state.favorites = migrateFavorites(normalized.favorites == null ? state.favorites : normalized.favorites, state.timetables);
  state.theme = normalized.theme;
  state.week = normalized.week;
  state.day = normalized.day;
  state.view = normalized.view;
  if (!persist()) {
    Object.assign(state, previous);
    return false;
  }
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
  favoriteKey,
  migrateFavorites,
  toggleFavorite,
  isFavorite,
  setTheme,
  exportPayload,
  importPayload
};
