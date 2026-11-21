import assert from "node:assert/strict";
import test from "node:test";
import { generateTimetableIcs } from "../src/ics.js";

test("生成标准 RFC 5545 ICS：含时区、校区作息、单双周、别名与自定义日程", () => {
  const timetable = {
    id: "tt-2026-1",
    name: "2026-2027-1",
    semester: "2026-2027-1",
    termStartDate: "2026-09-14",
    courseAliases: [
      { key: "code:nn1001", global: "内科学总别名", weeks: { "2": "内科学第2周专题" } }
    ],
    events: [
      {
        day: 1, start: 1, end: 2,
        title: "内科学", courseCode: "NN1001",
        type: "lecture", label: "讲课",
        campus: "茶山校区", room: "6A101", teacher: "张医生", credit: "4.0",
        assessment: "考试", note: "带听诊器",
        weeks: [{ start: 1, end: 2, parity: "all" }],
        hidden: false
      },
      {
        day: 2, start: 1, end: 2,
        title: "滨海双周课",
        type: "lab", label: "实验",
        campus: "滨海校区", room: "求知楼204", teacher: "李老师", credit: "2.0",
        weeks: [{ start: 1, end: 4, parity: "even" }],
        hidden: false
      },
      {
        day: 3, start: 1, end: 2,
        title: "已隐藏课程",
        type: "lecture", label: "讲课",
        campus: "茶山校区", room: "6A102", teacher: "王老师", credit: "1.0",
        weeks: [{ start: 1, end: 2, parity: "all" }],
        hidden: true
      }
    ],
    customEvents: [
      {
        id: "custom-1", kind: "custom",
        title: "课题组会", description: "汇报进展, 准备PPT; 含分号",
        room: "科研楼 302", week: 1, day: 5,
        startTime: "19:00", endTime: "20:30",
        color: "brand", hidden: false
      }
    ]
  };

  const { ics, eventCount } = generateTimetableIcs(timetable, {
    now: new Date(Date.UTC(2026, 8, 1, 0, 0, 0))
  });

  // 2 (内科学 w1,w2) + 2 (滨海双周 w2,w4) + 1 (自定义) = 5; 已隐藏课程跳过
  assert.equal(eventCount, 5);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.match(ics, /TZID:Asia\/Shanghai/);
  // 茶山第1-2节：08:00-09:25
  assert.match(ics, /DTSTART;TZID=Asia\/Shanghai:20260914T080000/);
  assert.match(ics, /DTEND;TZID=Asia\/Shanghai:20260914T092500/);
  assert.match(ics, /SUMMARY:内科学总别名/);
  assert.match(ics, /SUMMARY:内科学第2周专题/);
  // 滨海第1-2节：08:30-09:55，第2周周二为 2026-09-22，第4周周二为 2026-10-06
  assert.match(ics, /DTSTART;TZID=Asia\/Shanghai:20260922T083000/);
  assert.match(ics, /DTEND;TZID=Asia\/Shanghai:20260922T095500/);
  assert.match(ics, /DTSTART;TZID=Asia\/Shanghai:20261006T083000/);
  // 隐藏课程不在输出中
  assert.doesNotMatch(ics, /已隐藏课程/);
  // 自定义日程转义逗号与分号
  assert.match(ics, /SUMMARY:课题组会/);
  assert.match(ics, /汇报进展\\, 准备PPT\\; 含分号/);
  // 每行不超过 75 UTF-8 字节
  const encoder = new TextEncoder();
  for (const line of ics.split("\r\n")) {
    assert.ok(encoder.encode(line).length <= 75, `行超 75 字节: ${line}`);
  }
});

test("ICS 正确处理跨午夜第 21 节（23:35-次日 00:15）与非法开学日校验", () => {
  const { ics, eventCount } = generateTimetableIcs({
    id: "midnight",
    termStartDate: "2026-09-14",
    events: [{
      day: 1, start: 21, end: 21,
      title: "跨午夜临床值班", type: "practice", label: "实践",
      campus: "茶山校区", room: "急诊科", teacher: "值班医师", credit: "1",
      weeks: [{ start: 1, end: 1, parity: "all" }]
    }]
  });
  assert.equal(eventCount, 1);
  assert.match(ics, /DTSTART;TZID=Asia\/Shanghai:20260914T233500/);
  assert.match(ics, /DTEND;TZID=Asia\/Shanghai:20260915T001500/);

  assert.throws(() => generateTimetableIcs({ id: "bad", termStartDate: "" }), /学期第一周周一/);
});
