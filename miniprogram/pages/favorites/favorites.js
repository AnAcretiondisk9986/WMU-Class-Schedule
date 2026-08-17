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
    const items = store.state.favorites.map(title => {
      const events = [];
      store.state.timetables.forEach(tt => {
        (tt.events || []).forEach(e => {
          if (e.title === title) {
            events.push({
              ...e,
              dayName: time.DAY_NAMES[(e.day - 1) % 7],
              timeText: time.timeLabel(e),
              weeksText: time.weeksLabel(e.weeks)
            });
          }
        });
      });
      events.sort((a, b) => a.day - b.day || a.start - b.start);
      const credit = events.length && events[0].credit != null ? events[0].credit : "—";
      const teachers = [...new Set(events.map(e => e.teacher))].filter(Boolean);
      return { title, credit, teachers: teachers.join("、"), events };
    });
    this.setData({ theme: store.state.theme, items });
  },

  onRemove(e) {
    const title = e.currentTarget.dataset.title;
    store.toggleFavorite(title);
    this.refresh();
    wx.showToast({ title: "已取消收藏", icon: "none" });
  }
});
