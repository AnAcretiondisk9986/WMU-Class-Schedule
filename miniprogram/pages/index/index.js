const store = require("../../utils/store.js");
const time = require("../../utils/time.js");
const pdf = require("../../utils/pdf.js");

const SLOT = 44;              // 45 分钟对应的像素高度，卡片按真实分钟定位
const PX_PER_MINUTE = SLOT / 45;
const AXIS_START = 8 * 60;    // 08:00

function visibleEvents(events, view, week, query) {
  let list = events;
  if (view === "favorites") list = list.filter(e => store.isFavorite(e.title));
  if (query) {
    const q = query.toLowerCase();
    list = list.filter(e => `${e.title} ${e.teacher} ${e.room} ${e.campus}`.toLowerCase().includes(q));
  }
  if (view !== "favorites") list = list.filter(e => time.eventInWeek(e, week));
  return list;
}

Page({
  data: {
    theme: "light",
    semester: "",
    studentName: "",
    week: 1,
    maxWeek: 1,
    view: "schedule", // schedule | list
    query: "",
    hasTimetable: false,
    days: [],
    ticks: [],
    columns: [],
    totalHeight: 0,
    listEvents: [],
    stats: {},
    // 导入
    showImport: false,
    importFileName: "",
    importStatus: "",
    importStatusKind: "",
    importing: false,
    conflicts: [],
    showConflict: false,
    // 详情
    detail: null,
    showDetail: false,
    isFav: false,
    // 切换课表
    showSwitch: false,
    timetableList: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const tt = store.currentTimetable();
    const events = store.currentEvents();
    const view = store.state.view === "list" ? "list" : "schedule";
    const week = Math.min(store.state.week, time.maxWeek(events));
    const query = store.state.query;

    const visible = visibleEvents(events, view, week, query);
    const today = time.weekAndDayForDate(new Date(), store.currentTermStart());
    const days = time.dayInfo(week, store.currentTermStart()).map(d => ({
      ...d,
      isToday: today.week === week && d.key === today.day,
      focus: store.state.day === d.key,
      count: visible.filter(e => e.day === d.key).length
    }));

    // 时间轴
    const axisEnd = Math.max(...Object.keys(time.CAMPUS_PERIODS).reduce((minutes, campus) => {
      return minutes.concat(time.CAMPUS_PERIODS[campus].map(period => time.timeToMinutes(period[1])));
    }, []));
    const ticks = [];
    for (let start = AXIS_START; start < axisEnd; start += 45) {
      ticks.push({
        top: Math.round((start - AXIS_START) * PX_PER_MINUTE),
        label1: time.formatClock(start),
        label2: time.formatClock(start + 30)
      });
    }
    const totalHeight = Math.round((axisEnd - AXIS_START) * PX_PER_MINUTE);

    // 周视图列
    const positioned = visible.map(e => {
      const startMin = time.eventStartMinute(e);
      const endMin = time.eventEndMinute(e);
      return {
        ...e,
        top: Math.round((startMin - AXIS_START) * PX_PER_MINUTE),
        height: Math.max(24, Math.round((endMin - startMin) * PX_PER_MINUTE) - 2),
        timeText: time.timeLabel(e)
      };
    });
    const columns = [1, 2, 3, 4, 5, 6, 7].map(day => ({
      day,
      events: positioned.filter(e => e.day === day)
    }));

    // 列表视图
    const dayNameOf = d => time.DAY_NAMES[(d - 1) % 7];
    const listEvents = [...visible]
      .sort((a, b) => a.day - b.day || a.start - b.start)
      .map(e => ({
        ...e,
        dayName: dayNameOf(e.day),
        timeText: time.timeLabel(e),
        weeksText: time.weeksLabel(e.weeks),
        fav: store.isFavorite(e.title)
      }));

    // 统计
    const stats = this.computeStats(events);

    this.setData({
      theme: store.state.theme,
      semester: tt ? tt.semester : "",
      studentName: tt && tt.student ? tt.student.name : "",
      week,
      maxWeek: time.maxWeek(events),
      view,
      query,
      hasTimetable: !!tt,
      days,
      ticks,
      columns,
      totalHeight,
      listEvents,
      stats
    });
  },

  computeStats(events) {
    const titles = [...new Set(events.map(e => e.title))];
    const credit = events.reduce((sum, e) => {
      const n = Number(e.credit);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const campusCounts = {};
    events.forEach(e => {
      if (e.campus && e.campus !== "线上") campusCounts[e.campus] = (campusCounts[e.campus] || 0) + 1;
    });
    const mainCampus = Object.entries(campusCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      events: events.length,
      courses: titles.length,
      credit: credit.toFixed(1),
      mainCampus: mainCampus ? mainCampus[0] : "未标注校区",
      next: this.nextCourseToday(events)
    };
  },

  nextCourseToday(events) {
    const today = time.weekAndDayForDate(new Date(), store.currentTermStart());
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todayEvents = events
      .filter(e => e.day === today.day && time.eventInWeek(e, today.week))
      .sort((a, b) => a.start - b.start);
    if (!todayEvents.length) return { label: "今天无课", value: "今天没有课程安排" };
    const next = todayEvents.find(e => time.eventStartMinute(e) > nowMinutes);
    if (next) return { label: `下一节 ${time.timeLabel(next).split("–")[0]}`, value: `${next.title} · ${next.room}` };
    return { label: "今天课程已结束", value: `${todayEvents[todayEvents.length - 1].title} 已下课` };
  },

  // ---------------- 交互 ----------------
  onPrevWeek() {
    store.state.week = Math.max(1, store.state.week - 1);
    store.persist();
    this.refresh();
  },
  onNextWeek() {
    store.state.week = Math.min(this.data.maxWeek, store.state.week + 1);
    store.persist();
    this.refresh();
  },
  onToday() {
    const today = time.weekAndDayForDate(new Date(), store.currentTermStart());
    store.state.week = Math.max(1, today.week);
    store.state.day = today.day;
    store.state.view = "schedule";
    store.persist();
    this.refresh();
  },
  onToggleView() {
    store.state.view = store.state.view === "list" ? "schedule" : "list";
    store.persist();
    this.refresh();
  },
  onSearchInput(e) {
    store.state.query = (e.detail.value || "").trim();
    this.refresh();
  },
  onClearSearch() {
    store.state.query = "";
    this.refresh();
  },
  onTapDay(e) {
    store.state.day = Number(e.currentTarget.dataset.day);
    store.persist();
    this.refresh();
  },

  onTapEvent(e) {
    const day = Number(e.currentTarget.dataset.day);
    const index = Number(e.currentTarget.dataset.index);
    const events = this.data.columns.find(c => c.day === day);
    const event = events ? events.events[index] : null;
    if (!event) return;
    this.setData({
      detail: {
        ...event,
        dayName: time.DAY_NAMES[(event.day - 1) % 7],
        weeksText: time.weeksLabel(event.weeks)
      },
      isFav: store.isFavorite(event.title),
      showDetail: true
    });
  },
  onTapListEvent(e) {
    const index = Number(e.currentTarget.dataset.index);
    const event = this.data.listEvents[index];
    if (!event) return;
    this.setData({
      detail: event,
      isFav: store.isFavorite(event.title),
      showDetail: true
    });
  },
  onCloseDetail() {
    this.setData({ showDetail: false });
  },
  onToggleFavorite() {
    if (!this.data.detail) return;
    const title = this.data.detail.title;
    const added = store.toggleFavorite(title);
    this.setData({ isFav: added });
    this.refresh();
  },

  // ---------------- 导入 ----------------
  onOpenImport() {
    this.selectedFilePath = null;
    this.setData({
      showImport: true,
      importFileName: "",
      importStatus: "",
      importStatusKind: "",
      conflicts: []
    });
  },
  onCloseImport() {
    if (this.data.importing) return;
    this.setData({ showImport: false });
  },
  onChooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["pdf"],
      success: res => {
        const file = res.tempFiles && res.tempFiles[0];
        if (!file) return;
        this.selectedFilePath = file.path;
        this.setData({
          importFileName: file.name || "已选择 PDF",
          importStatus: "文件已就绪，可开始识别。",
          importStatusKind: ""
        });
      }
    });
  },
  onConfirmImport() {
    if (this.data.importing) return;
    if (!this.selectedFilePath) {
      this.setData({ importStatus: "请先选择一个 PDF 文件。", importStatusKind: "error" });
      return;
    }
    this.setData({ importing: true, importStatus: "正在解析 PDF 并识别课程，请稍候……", importStatusKind: "" });
    wx.showLoading({ title: "解析中…", mask: true });

    const run = async () => {
      try {
        const arrayBuffer = wx.getFileSystemManager().readFileSync(this.selectedFilePath);
        const result = await pdf.parsePdf(arrayBuffer);
        if (result.conflicts && result.conflicts.length) {
          this.setData({
            conflicts: result.conflicts,
            showConflict: true,
            importStatus: `识别到 ${result.conflicts.length} 个跨校区时间冲突`,
            importStatusKind: "error"
          });
          return;
        }
        const tt = store.addTimetable(result);
        this.setData({
          showImport: false,
          importStatus: "",
          importStatusKind: ""
        });
        wx.showToast({ title: `已识别 ${tt.events.length} 个课次`, icon: "success" });
        this.refresh();
      } catch (error) {
        console.error("解析失败", error);
        this.setData({
          importStatus: `解析失败：${error && error.message ? error.message : "文件格式无法识别"}`,
          importStatusKind: "error"
        });
      } finally {
        wx.hideLoading();
        this.setData({ importing: false });
      }
    };
    run();
  },
  onCloseConflict() {
    this.setData({ showConflict: false });
  },

  // ---------------- 切换课表 ----------------
  onOpenSwitch() {
    const list = store.state.timetables.map(t => ({
      id: t.id,
      name: t.name,
      semester: t.semester,
      student: t.student ? t.student.name : "",
      count: (t.events || []).length,
      active: t.id === store.state.activeId
    }));
    this.setData({ showSwitch: true, timetableList: list });
  },
  onCloseSwitch() {
    this.setData({ showSwitch: false });
  },
  onSelectTimetable(e) {
    const id = e.currentTarget.dataset.id;
    store.switchTimetable(id);
    this.setData({ showSwitch: false });
    this.refresh();
  },
  onSwitchImport() {
    this.setData({ showSwitch: false });
    this.onOpenImport();
  },

  onOpenHelp() {
    wx.navigateTo({ url: "/pages/help/help" });
  },
  onOpenSettings() {
    wx.switchTab({ url: "/pages/settings/settings" });
  },

  onShareAppMessage() {
    const tt = store.currentTimetable();
    return {
      title: tt ? `我的课表 · ${tt.semester}` : "WMU 课表",
      path: "/pages/index/index"
    };
  }
});
