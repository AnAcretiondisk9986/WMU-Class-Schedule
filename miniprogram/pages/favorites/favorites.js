const store = require("../../utils/store.js");
const time = require("../../utils/time.js");

Page({
  data: {
    theme: "light",
    items: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const favoriteKeys = new Set(store.migrateFavorites());
    const groups = new Map();
    store.state.timetables.forEach(tt => {
      (tt.events || []).forEach(e => {
        const key = store.favoriteKey(e, tt.id);
        if (!key || !favoriteKeys.has(key)) return;
        let item = groups.get(key);
        if (!item) {
          item = {
            key,
            title: e.title,
            credit: e.credit != null ? e.credit : "—",
            teachers: "",
            timetableName: tt.name || "课表",
            semester: tt.semester || "",
            events: [],
            teacherSet: new Set()
          };
          groups.set(key, item);
        }
        if (e.teacher) item.teacherSet.add(e.teacher);
        item.events.push({
          ...e,
          dayName: time.DAY_NAMES[(e.day - 1) % 7],
          timeText: time.timeLabel(e),
          weeksText: time.weeksLabel(e.weeks)
        });
      });
    });
    const items = [...groups.values()].map(item => {
      item.events.sort((a, b) => a.day - b.day || a.start - b.start);
      item.teachers = [...item.teacherSet].join("、");
      delete item.teacherSet;
      return item;
    }).sort((a, b) => a.timetableName.localeCompare(b.timetableName) || a.title.localeCompare(b.title));
    this.setData({ theme: store.state.theme, items });
  },

  onRemove(e) {
    const key = e.currentTarget.dataset.key;
    store.toggleFavorite(key);
    this.refresh();
    wx.showToast({ title: "已取消收藏", icon: "none" });
  }
});
