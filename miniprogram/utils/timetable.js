/**
 * WMU 课表 PDF 解析器（小程序 CommonJS 版）。
 *
 * 从 src/timetable.js 忠实移植，仅把 ES Module 导出改为 CommonJS。
 * 解析逻辑不依赖 DOM / Node API，可在小程序与云函数/Node 中共用。
 *
 * 输入：PDF.js 提取出的页面文本数组（见 extractPdfPages）。
 * 输出：{ semester, student, courses, events, warnings, conflicts }。
 */

const ACTIVITY_TYPES = Object.freeze({
  "□": "independent",
  "▲": "online",
  "◆": "lecture",
  "◇": "lab",
  "●": "discussion",
  "#": "practice"
});

const ACTIVITY_LABELS = Object.freeze({
  independent: "自主学习",
  online: "在线",
  lecture: "讲课",
  lab: "实验",
  discussion: "讨论",
  practice: "实践"
});

const DAY_CHARS = Object.freeze(["一", "二", "三", "四", "五", "六", "日"]);
const PHYSICAL_CAMPUSES = Object.freeze(["茶山校区", "学院路校区", "滨海校区"]);
const SHARED_AFTERNOON_PERIODS = Object.freeze([
  ["13:30", "14:10"], ["14:15", "14:55"], ["15:00", "15:40"],
  ["15:45", "16:25"], ["16:30", "17:10"], ["17:15", "17:55"],
  ["18:20", "19:00"], ["19:05", "19:45"], ["19:50", "20:30"],
  ["20:35", "21:15"], ["21:20", "22:00"], ["22:05", "22:45"]
]);
const CHASHAN_PERIODS = Object.freeze([
  ["08:00", "08:40"], ["08:45", "09:25"], ["09:40", "10:20"],
  ["10:25", "11:05"], ["11:10", "11:50"], ["11:55", "12:35"],
  ["12:40", "13:20"], ...SHARED_AFTERNOON_PERIODS
]);
const BINHAI_PERIODS = Object.freeze([
  ["08:30", "09:10"], ["09:15", "09:55"], ["10:10", "10:50"],
  ["10:55", "11:35"], ["11:40", "12:20"], ["12:25", "13:05"],
  ["13:05", "13:20"], ...SHARED_AFTERNOON_PERIODS
]);
const CAMPUS_PERIODS = Object.freeze({
  "茶山校区": CHASHAN_PERIODS,
  "学院路校区": CHASHAN_PERIODS,
  "滨海校区": BINHAI_PERIODS
});
const FIELD_NAMES = Object.freeze([
  "校区",
  "场地",
  "教师",
  "教学班",
  "教学班组成",
  "考核方式",
  "选课备注",
  "课程学时组成",
  "周学时",
  "总学时",
  "学分"
]);

function asText(value) {
  return String(value == null ? "" : value)
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n");
}

function compact(value) {
  return asText(value)
    .replace(/[\u3000\t ]+/g, " ")
    .replace(/\s*\n\s*/g, "")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function toFiniteNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseWeekRanges(value) {
  const ranges = [];
  const source = compact(value).replace(/[，；;]/g, ",");
  const pattern = /(\d{1,2})(?:\s*-\s*(\d{1,2}))?周(?:\((单|双)\))?/g;

  for (const match of source.matchAll(pattern)) {
    ranges.push({
      start: Number(match[1]),
      end: Number(match[2] != null ? match[2] : match[1]),
      parity: match[3] === "单" ? "odd" : match[3] === "双" ? "even" : "all"
    });
  }

  return ranges;
}

function parseFields(value) {
  const source = compact(value);
  const fields = {};
  const labelPattern = FIELD_NAMES.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const pattern = new RegExp(`(?:^|/)(${labelPattern})\\s*[:：]`, "g");
  const matches = [...source.matchAll(pattern)];

  matches.forEach((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    fields[match[1]] = source.slice(start, end).replace(/^\/+|\/+$/g, "").trim();
  });

  return fields;
}

function courseCodeFromClassName(className) {
  const match = /\b(NN\d{6}-\d{6}-\d+)\b/i.exec(className || "");
  return match ? match[1].toUpperCase() : "";
}

function cleanCourseName(value) {
  return compact(value)
    .replace(/^星期[一二三四五六日天]/, "")
    .replace(/^(?:上午|中午|下午|晚上)/, "")
    .replace(/^\d{1,2}/, "")
    .trim();
}

function scheduleMatchAfter(source, markerEnd) {
  const tail = source.slice(markerEnd);
  return /^\s*\((\d{1,2})(?:\s*-\s*(\d{1,2}))?节\)\s*([^/]+)/.exec(tail);
}

function parseColumn(source, weekday, warnings) {
  const text = asText(source);
  const markers = [...text.matchAll(/[□▲◆◇●#]/g)];
  const events = [];
  let previousEventEnd = 0;

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const schedule = scheduleMatchAfter(text, marker.index + marker[0].length);
    if (!schedule) continue;

    const nextMarkerIndex = index + 1 < markers.length ? markers[index + 1].index : text.length;
    const remainder = text.slice(marker.index + marker[0].length);
    const credit = /\/学\s*分\s*[:：]\s*(\d+(?:\.\d+)?)/.exec(remainder);
    const relativeEnd = credit ? credit.index + credit[0].length : nextMarkerIndex - marker.index - marker[0].length;
    const eventEnd = marker.index + marker[0].length + relativeEnd;
    const title = cleanCourseName(text.slice(previousEventEnd, marker.index));

    if (!title) {
      // PDF 分页时，课程标题可能落在上一页底部，此处仅出现节次标记。
      previousEventEnd = eventEnd;
      continue;
    }

    const raw = compact(text.slice(marker.index + marker[0].length, eventEnd));
    const fields = parseFields(raw);
    const activity = ACTIVITY_TYPES[marker[0]];
    const weekRanges = parseWeekRanges(schedule[3]);

    if (weekRanges.length === 0) {
      warnings.push(`「${title}」未识别到周次`);
    }

    events.push({
      courseName: title,
      weekday,
      activity,
      activityLabel: ACTIVITY_LABELS[activity],
      periods: {
        start: Number(schedule[1]),
        end: Number(schedule[2] != null ? schedule[2] : schedule[1])
      },
      weeks: weekRanges,
      campus: fields["校区"] || "",
      room: fields["场地"] || "",
      teacher: fields["教师"] || "",
      className: fields["教学班"] || "",
      classComposition: fields["教学班组成"] || "",
      assessment: fields["考核方式"] || "",
      note: fields["选课备注"] || "",
      courseHours: fields["课程学时组成"] || "",
      weeklyHours: toFiniteNumber(fields["周学时"]),
      totalHours: toFiniteNumber(fields["总学时"]),
      credit: toFiniteNumber(fields["学分"]),
      courseCode: courseCodeFromClassName(fields["教学班"]),
      raw
    });

    previousEventEnd = eventEnd;
  }

  return events;
}

function itemPosition(item) {
  const transform = item && item.transform;
  return {
    x: Number(transform && transform[4] != null ? transform[4] : (item && item.x != null ? item.x : 0)),
    y: Number(transform && transform[5] != null ? transform[5] : (item && item.y != null ? item.y : 0))
  };
}

function pageWidth(page) {
  return Number(page && page.width != null ? page.width : (page && page.viewport ? page.viewport.width : 842));
}

function pageHeight(page) {
  return Number(page && page.height != null ? page.height : (page && page.viewport ? page.viewport.height : 595));
}

function findColumnAnchors(pages) {
  const found = new Map();

  for (const page of pages) {
    for (const item of page.items || []) {
      const text = compact(item.str != null ? item.str : item.text);
      const match = /^星期([一二三四五六日天])$/.exec(text);
      if (!match) continue;
      const weekday = match[1] === "天" ? 7 : DAY_CHARS.indexOf(match[1]) + 1;
      if (!found.has(weekday)) found.set(weekday, itemPosition(item));
    }
  }

  if (found.size === 7) {
    const positions = [...found.values()];
    const xSpread = Math.max(...positions.map(position => position.x)) - Math.min(...positions.map(position => position.x));
    const ySpread = Math.max(...positions.map(position => position.y)) - Math.min(...positions.map(position => position.y));
    const axis = ySpread > xSpread ? "y" : "x";
    return { axis, values: DAY_CHARS.map((_, index) => found.get(index + 1)[axis]) };
  }

  const rotated = pageHeight(pages[0]) > pageWidth(pages[0]);
  const dimension = rotated ? pageHeight(pages[0]) : pageWidth(pages[0]);
  return {
    axis: rotated ? "y" : "x",
    values: [0.1236, 0.2469, 0.3703, 0.4936, 0.617, 0.7403, 0.8637]
      .map(ratio => ratio * dimension)
  };
}

function weekdayForPosition(position, anchors) {
  const values = anchors.values;
  const value = position[anchors.axis];
  const gap = values.length > 1 ? values[1] - values[0] : 100;
  for (let index = 0; index < values.length; index += 1) {
    const start = index === 0 ? values[index] - gap / 2 : (values[index - 1] + values[index]) / 2;
    const end = index + 1 < values.length ? (values[index] + values[index + 1]) / 2 : values[index] + gap / 2;
    if (value >= start && value < end) return index + 1;
  }
  return null;
}

function columnTextForPage(page, weekday, anchors) {
  const rows = [];
  const items = (page.items || [])
    .map(item => ({ item, ...itemPosition(item) }))
    .filter(entry => compact(entry.item.str != null ? entry.item.str : entry.item.text))
    .filter(entry => weekdayForPosition(entry, anchors));

  if (anchors.axis === "y") {
    return items
      .filter(entry => weekdayForPosition(entry, anchors) === weekday)
      .sort((a, b) => a.x - b.x || a.y - b.y)
      .map(entry => entry.item.str != null ? entry.item.str : entry.item.text)
      .join("\n");
  }

  const orderedItems = items
    .filter(entry => weekdayForPosition(entry, anchors) === weekday)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (const entry of orderedItems) {
    let row = rows.find(candidate => Math.abs(candidate.y - entry.y) <= 2);
    if (!row) {
      row = { y: entry.y, items: [] };
      rows.push(row);
    }
    row.items.push(entry);
  }

  return rows
    .sort((a, b) => b.y - a.y)
    .map(row => row.items.sort((a, b) => a.x - b.x).map(entry => entry.item.str != null ? entry.item.str : entry.item.text).join(""))
    .join("\n");
}

function parseDocumentIdentity(pages) {
  const text = pages.flatMap(page => page.items || []).map(item => item.str != null ? item.str : (item.text != null ? item.text : "")).join("\n");
  const semester = /(\d{4})\s*-\s*(\d{4})\s*学年\s*第?\s*([12])\s*学期/.exec(text);
  const studentId = /学号\s*[:：]\s*([A-Za-z0-9-]+)/.exec(text);
  const studentName = /([^\s]{2,12})课表/.exec(text);

  return {
    semester: semester ? `${semester[1]}-${semester[2]}-${semester[3]}` : "",
    student: {
      name: studentName && studentName[1] ? studentName[1] : "",
      id: studentId && studentId[1] ? studentId[1] : ""
    }
  };
}

function mergeCourses(events) {
  const courses = new Map();

  for (const event of events) {
    const key = event.courseName.toLowerCase();
    let course = courses.get(key);
    if (!course) {
      course = {
        name: event.courseName,
        credit: event.credit,
        score: "",
        scale: "percent",
        type: "",
        courseCode: event.courseCode,
        teachers: [],
        campuses: [],
        assessments: [],
        events: []
      };
      courses.set(key, course);
    }

    if (course.credit == null && event.credit != null) course.credit = event.credit;
    if (!course.courseCode && event.courseCode) course.courseCode = event.courseCode;
    course.teachers = unique([...course.teachers, event.teacher]);
    course.campuses = unique([...course.campuses, event.campus]);
    course.assessments = unique([...course.assessments, event.assessment]);
    course.events.push(event);
  }

  return [...courses.values()];
}

function rangeHasWeek(range, week) {
  if (week < range.start || week > range.end) return false;
  return range.parity === "all"
    || (range.parity === "odd" && week % 2 === 1)
    || (range.parity === "even" && week % 2 === 0);
}

function weeksOverlap(first, second) {
  if (!first || !first.length || !second || !second.length) return false;
  const start = Math.min(...first.map(range => range.start), ...second.map(range => range.start));
  const end = Math.max(...first.map(range => range.end), ...second.map(range => range.end));
  for (let week = start; week <= end; week += 1) {
    if (first.some(range => rangeHasWeek(range, week)) && second.some(range => rangeHasWeek(range, week))) {
      return true;
    }
  }
  return false;
}

function clockToMinutes(value) {
  const parts = String(value).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function eventClockRange(event) {
  const periods = CAMPUS_PERIODS[event.campus];
  if (!periods || !event.periods) return null;
  const start = periods[event.periods.start - 1];
  const end = periods[event.periods.end - 1];
  if (!start || !end) return null;
  return {
    start: clockToMinutes(start[0]),
    end: clockToMinutes(end[1])
  };
}

function detectCampusConflicts(events) {
  const conflicts = [];

  for (let firstIndex = 0; firstIndex < events.length; firstIndex += 1) {
    const first = events[firstIndex];
    if (!PHYSICAL_CAMPUSES.includes(first.campus)) continue;
    const firstClock = eventClockRange(first);
    if (!firstClock) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < events.length; secondIndex += 1) {
      const second = events[secondIndex];
      if (!PHYSICAL_CAMPUSES.includes(second.campus) || first.campus === second.campus) continue;
      if (first.weekday !== second.weekday || !weeksOverlap(first.weeks, second.weeks)) continue;

      const secondClock = eventClockRange(second);
      if (!secondClock || firstClock.start >= secondClock.end || secondClock.start >= firstClock.end) continue;

      conflicts.push({
        firstIndex,
        secondIndex,
        weekday: first.weekday,
        campuses: [first.campus, second.campus],
        periods: [first.periods, second.periods],
        weeks: [first.weeks, second.weeks],
        message: `周${DAY_CHARS[first.weekday - 1]}第 ${first.periods.start}-${first.periods.end} 节「${first.courseName}」（${first.campus}）与第 ${second.periods.start}-${second.periods.end} 节「${second.courseName}」（${second.campus}）存在跨校区时间冲突`
      });
    }
  }

  return conflicts;
}

function parseTimetablePages(pages) {
  if (!Array.isArray(pages) || pages.length === 0) {
    throw new TypeError("pages 必须是非空的 PDF.js 页面文本数组");
  }

  const warnings = [];
  const anchors = findColumnAnchors(pages);
  const events = [];

  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const columnText = pages.map(page => columnTextForPage(page, weekday, anchors)).join("\n");
    events.push(...parseColumn(columnText, weekday, warnings));
  }

  if (events.length === 0) {
    throw new Error("未在 PDF 页面中识别到课程记录");
  }

  const identity = parseDocumentIdentity(pages);
  const conflicts = detectCampusConflicts(events);
  return {
    ...identity,
    courses: mergeCourses(events),
    events,
    warnings,
    conflicts
  };
}

async function extractPdfPages(fileOrData, pdfjsLib, pdfOptions = {}) {
  if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
    throw new TypeError("需要传入 PDF.js 模块");
  }

  let data;
  if (fileOrData instanceof Uint8Array) data = fileOrData;
  else if (fileOrData instanceof ArrayBuffer) data = new Uint8Array(fileOrData);
  else if (fileOrData && typeof fileOrData.arrayBuffer === "function") {
    data = new Uint8Array(await fileOrData.arrayBuffer());
  } else {
    throw new TypeError("fileOrData 必须是 File、ArrayBuffer 或 Uint8Array");
  }

  const pdf = await pdfjsLib.getDocument({ ...pdfOptions, data }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      items: content.items.map(item => ({
        str: item.str || "",
        transform: item.transform,
        width: item.width,
        height: item.height,
        hasEOL: item.hasEOL
      }))
    });
  }

  return pages;
}

async function parseTimetablePdf(fileOrData, pdfjsLib, pdfOptions = {}) {
  return parseTimetablePages(await extractPdfPages(fileOrData, pdfjsLib, pdfOptions));
}

module.exports = {
  activityTypes: ACTIVITY_TYPES,
  physicalCampuses: PHYSICAL_CAMPUSES,
  parseWeekRanges,
  detectCampusConflicts,
  parseTimetablePages,
  extractPdfPages,
  parseTimetablePdf
};
