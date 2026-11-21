import { campusPeriods, periodMinutes } from "./timetable.js";

const TZID = "Asia/Shanghai";
const CRLF = "\r\n";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function escapeIcsText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

// RFC 5545 §3.1: fold lines longer than 75 UTF-8 octets with CRLF + single space.
function foldLine(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    if (bytes + chBytes > limit && current) {
      parts.push(current);
      current = ch;
      bytes = chBytes;
      limit = 74; // Account for leading continuation space
    } else {
      current += ch;
      bytes += chBytes;
    }
  }
  if (current) parts.push(current);
  return parts.join(`${CRLF} `);
}

function formatLocalDateTime(year, month, day, hours, minutes) {
  return `${year}${pad2(month)}${pad2(day)}T${pad2(hours)}${pad2(minutes)}00`;
}

function formatUtcStamp(date) {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`;
}

function parseIsoMonday(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return null;
  const weekdayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekdayOffset);
  return date;
}

function addUtcDays(base, days) {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

function expandWeeks(ranges) {
  const weeks = new Set();
  for (const range of ranges || []) {
    const start = Number(range?.start);
    const end = Number(range?.end);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) continue;
    for (let week = start; week <= end; week += 1) {
      if (
        range.parity === "all"
        || (range.parity === "odd" && Math.abs(week) % 2 === 1)
        || (range.parity === "even" && Math.abs(week) % 2 === 0)
      ) {
        weeks.add(week);
      }
    }
  }
  return [...weeks].sort((a, b) => a - b);
}

function normalizePart(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function aliasMapFrom(timetable) {
  const map = new Map();
  for (const entry of timetable?.courseAliases || []) {
    if (entry?.key) map.set(entry.key, entry);
  }
  return map;
}

function aliasKeyFor(event) {
  const code = normalizePart(event?.courseCode);
  if (code) return `code:${code}`;
  const cls = normalizePart(event?.className);
  if (cls) return `class:${cls}`;
  const title = normalizePart(event?.title ?? event?.courseName);
  return title ? `title:${title}` : "";
}

function resolveTitle(event, week, aliasMap) {
  if (event.kind === "custom") return event.title;
  const entry = aliasMap.get(aliasKeyFor(event));
  return entry?.weeks?.[String(week)] || entry?.global || event.title;
}

function eventMinutesRange(event) {
  if (event.kind === "custom") {
    const start = timeToMinutes(event.startTime);
    const end = timeToMinutes(event.endTime);
    if (start == null || end == null || end <= start) return null;
    return { start, end };
  }
  const periods = campusPeriods[event.campus] || campusPeriods["滨海校区"];
  const start = periodMinutes(periods, event.start - 1, 0);
  let end = periodMinutes(periods, event.end - 1, 1);
  if (start == null || end == null) return null;
  if (end < start) end += 1440;
  return { start, end };
}

function makeDateTimeOnBase(baseDate, totalMinutes) {
  const dayShift = Math.floor(totalMinutes / 1440);
  const minuteOfDay = ((totalMinutes % 1440) + 1440) % 1440;
  const d = dayShift ? addUtcDays(baseDate, dayShift) : baseDate;
  return formatLocalDateTime(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    Math.floor(minuteOfDay / 60),
    minuteOfDay % 60
  );
}

/**
 * 将温医大课表对象生成标准 RFC 5545 ICS 日历文本。
 * @param {object} timetable 当前课表对象
 * @param {{ includeHidden?: boolean, now?: Date }} [options]
 * @returns {{ ics: string, eventCount: number }}
 */
export function generateTimetableIcs(timetable, options = {}) {
  const includeHidden = options.includeHidden === true;
  const stamp = formatUtcStamp(options.now instanceof Date ? options.now : new Date());
  const monday = parseIsoMonday(timetable?.termStartDate);
  if (!monday) {
    throw new Error("缺少有效的学期第一周周一日期，无法生成日历文件。");
  }

  const aliasMap = aliasMapFrom(timetable);
  const calName = timetable?.name || timetable?.semester || "温医大课表";
  const timetableId = String(timetable?.id || "wmu").replace(/[^A-Za-z0-9_-]/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WMU Timetable//Web PWA//CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    `X-WR-TIMEZONE:${TZID}`,
    "BEGIN:VTIMEZONE",
    `TZID:${TZID}`,
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:CST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE"
  ];

  const allEvents = [
    ...(Array.isArray(timetable?.events) ? timetable.events : []),
    ...(Array.isArray(timetable?.customEvents) ? timetable.customEvents : [])
  ];

  let eventCount = 0;

  allEvents.forEach((event, eventIdx) => {
    if (!event || (!includeHidden && event.hidden)) return;
    const range = eventMinutesRange(event);
    if (!range) return;
    const day = Number(event.day);
    if (!Number.isInteger(day) || day < 1 || day > 7) return;

    const weeks = event.kind === "custom"
      ? (Number.isInteger(Number(event.week)) ? [Number(event.week)] : [])
      : expandWeeks(event.weeks);
    if (!weeks.length) return;

    const location = event.kind === "custom"
      ? (event.room || "")
      : [event.campus, event.room].filter(Boolean).join(" · ");

    const descParts = [];
    if (event.kind === "custom") {
      if (event.description) descParts.push(event.description);
    } else {
      descParts.push(`第 ${event.start}-${event.end} 节 · ${event.label || "课程"}`);
      if (event.teacher && event.teacher !== "待定") descParts.push(`教师：${event.teacher}`);
      if (event.credit && event.credit !== "—") descParts.push(`学分：${event.credit}`);
      if (event.assessment) descParts.push(`考核：${event.assessment}`);
      if (event.note) descParts.push(`备注：${event.note}`);
    }
    const baseDescription = descParts.join("\n");

    for (const week of weeks) {
      const date = addUtcDays(monday, (week - 1) * 7 + (day - 1));
      const dtStart = makeDateTimeOnBase(date, range.start);
      const dtEnd = makeDateTimeOnBase(date, range.end);
      const title = resolveTitle(event, week, aliasMap);
      const description = title !== event.title && event.kind !== "custom"
        ? `原课程名：${event.title}${baseDescription ? `\n${baseDescription}` : ""}`
        : baseDescription;
      const uid = `${timetableId}-${eventIdx}-w${week}-d${day}@wmu-timetable`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;TZID=${TZID}:${dtStart}`);
      lines.push(`DTEND;TZID=${TZID}:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcsText(title)}`);
      if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
      if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
      lines.push("END:VEVENT");
      eventCount += 1;
    }
  });

  lines.push("END:VCALENDAR");
  return {
    ics: lines.map(foldLine).join(CRLF) + CRLF,
    eventCount
  };
}
