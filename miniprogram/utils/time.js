/**
 * 日期 / 周次 / 校区时间规则（与网页版 index.html 保持一致）。
 */

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

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

const SHARED_AFTERNOON_PERIODS = [
  ["13:30", "14:10"], ["14:15", "14:55"], ["15:00", "15:40"],
  ["15:45", "16:25"], ["16:30", "17:10"], ["17:15", "17:55"],
  ["18:20", "19:00"], ["19:05", "19:45"], ["19:50", "20:30"],
  ["20:35", "21:15"], ["21:20", "22:00"], ["22:05", "22:45"]
];
const CHASHAN_PERIODS = [
  ["08:00", "08:40"], ["08:45", "09:25"], ["09:40", "10:20"],
  ["10:25", "11:05"], ["11:10", "11:50"], ["11:55", "12:35"],
  ["12:40", "13:20"], ...SHARED_AFTERNOON_PERIODS
];
const BINHAI_PERIODS = [
  ["08:30", "09:10"], ["09:15", "09:55"], ["10:10", "10:50"],
  ["10:55", "11:35"], ["11:40", "12:20"], ["12:25", "13:05"],
  ["13:05", "13:20"], ...SHARED_AFTERNOON_PERIODS
];

// 前 16 节按学校作息表显式配置；17-19 节为兼容旧课表数据的连续晚间时段。
const CAMPUS_PERIODS = {
  "茶山校区": CHASHAN_PERIODS,
  "学院路校区": CHASHAN_PERIODS,
  "滨海校区": BINHAI_PERIODS,
  "线上": BINHAI_PERIODS
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
  CAMPUS_PERIODS,
  pad2,
  mondayOf,
  addDays,
  toIso,
  formatMD,
  formatFull,
  timeToMinutes,
  formatClock,
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
