/**
 * 日期 / 周次 / 校区时间规则（与网页版 index.html 保持一致）。
 */

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
const PERIOD_COUNT = 19;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function addDays(date, count) {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

function toIso(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatMD(date) {
  return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}`;
}

function formatFull(date) {
  return `${date.getFullYear()} 年 ${pad2(date.getMonth() + 1)} 月 ${pad2(date.getDate())} 日`;
}

function timeToMinutes(hhmm) {
  const parts = String(hhmm).split(":").map(Number);
  return parts[0] * 60 + (parts[1] || 0);
}

function formatClock(minutes) {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

function buildPeriods(startMinutes) {
  return Array.from({ length: PERIOD_COUNT }, (_, index) => {
    const start = startMinutes + index * 45;
    return [formatClock(start), formatClock(start + 40)];
  });
}

// 茶山/学院路 08:00 上课，滨海 08:30 上课，每节 40 分钟、课间 5 分钟。
const CAMPUS_PERIODS = {
  "茶山校区": buildPeriods(8 * 60),
  "学院路校区": buildPeriods(8 * 60),
  "滨海校区": buildPeriods(8 * 60 + 30),
  "线上": buildPeriods(8 * 60 + 30)
};

function weeksLabel(weeks) {
  if (!Array.isArray(weeks) || !weeks.length) return "周次未标注";
  return weeks.map(range => {
    const span = range.start === range.end ? `${range.start}` : `${range.start}–${range.end}`;
    return `${span}${range.parity === "odd" ? "（单）" : range.parity === "even" ? "（双）" : ""}`;
  }).join("、") + " 周";
}

function rangeHasWeek(range, week) {
  if (week < range.start || week > range.end) return false;
  return range.parity === "all"
    || (range.parity === "odd" && week % 2 === 1)
    || (range.parity === "even" && week % 2 === 0);
}

function eventInWeek(event, week) {
  return (event.weeks || []).some(range => rangeHasWeek(range, week));
}

function termMonday(termStartDate) {
  return mondayOf(new Date(termStartDate));
}

function weekAndDayForDate(date, termStartDate) {
  const monday = termMonday(termStartDate);
  const diff = Math.round((mondayOf(date) - monday) / 86400000);
  return { week: Math.floor(diff / 7) + 1, day: (date.getDay() + 6) % 7 + 1 };
}

function dayInfo(week, termStartDate) {
  const monday = addDays(termMonday(termStartDate), (week - 1) * 7);
  return DAY_NAMES.map((name, index) => ({
    key: index + 1,
    name,
    date: formatMD(addDays(monday, index))
  }));
}

function maxWeek(events) {
  if (!events || !events.length) return 1;
  return Math.max(1, ...events.flatMap(event => (event.weeks || []).map(range => range.end)));
}

// 解析器事件 -> UI 事件
function eventFromParsed(event) {
  return {
    day: event.weekday,
    start: event.periods.start,
    end: event.periods.end,
    title: event.courseName,
    type: event.activity || "lecture",
    label: event.activityLabel || "讲课",
    room: event.room || "待定",
    campus: event.campus || "未标注校区",
    teacher: event.teacher || "待定",
    weeks: event.weeks || [],
    credit: event.credit == null ? "—" : String(event.credit),
    courseCode: event.courseCode || "",
    className: event.className || "",
    classComposition: event.classComposition || "",
    assessment: event.assessment || "",
    note: event.note || "",
    courseHours: event.courseHours || "",
    weeklyHours: event.weeklyHours,
    totalHours: event.totalHours
  };
}

function periodsForCampus(campus) {
  return CAMPUS_PERIODS[campus] || CAMPUS_PERIODS["滨海校区"];
}

function timeLabel(event) {
  const periods = periodsForCampus(event.campus);
  return `${periods[event.start - 1][0]}–${periods[event.end - 1][1]}`;
}

function eventStartMinute(event) {
  const periods = periodsForCampus(event.campus);
  return timeToMinutes(periods[event.start - 1][0]);
}

function eventEndMinute(event) {
  const periods = periodsForCampus(event.campus);
  return timeToMinutes(periods[event.end - 1][1]);
}

module.exports = {
  DAY_NAMES,
  PERIOD_COUNT,
  CAMPUS_PERIODS,
  pad2,
  mondayOf,
  addDays,
  toIso,
  formatMD,
  formatFull,
  timeToMinutes,
  formatClock,
  buildPeriods,
  weeksLabel,
  eventInWeek,
  termMonday,
  weekAndDayForDate,
  dayInfo,
  maxWeek,
  eventFromParsed,
  periodsForCampus,
  timeLabel,
  eventStartMinute,
  eventEndMinute
};
