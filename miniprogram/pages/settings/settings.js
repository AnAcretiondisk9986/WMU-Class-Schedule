const store = require("../../utils/store.js");

Page({
  data: {
    theme: "light",
    termStartDate: "",
    themeIndex: 0,
    themes: ["light", "warm"],
    themeLabels: ["浅色", "暖色"],
    hasTimetable: false,
    timetableName: ""
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const tt = store.currentTimetable();
    this.setData({
      theme: store.state.theme,
      termStartDate: store.currentTermStart(),
      themeIndex: store.state.theme === "warm" ? 1 : 0,
      hasTimetable: !!tt,
      timetableName: tt ? tt.name : ""
    });
  },

  onTermStartChange(e) {
    const value = e.detail.value;
    const tt = store.currentTimetable();
    if (tt && value) tt.termStartDate = value;
    store.persist();
    this.setData({ termStartDate: value });
    wx.showToast({ title: "已保存", icon: "success" });
  },

  onThemeChange(e) {
    const index = Number(e.detail.value);
    store.setTheme(this.data.themes[index]);
    this.setData({ theme: store.state.theme });
  },

  onExport() {
    wx.setClipboardData({
      data: store.exportPayload(),
      success: () => wx.showToast({ title: "已复制到剪贴板", icon: "none" })
    });
  },

  onImport() {
    wx.getClipboardData({
      success: res => {
        try {
          const data = JSON.parse(res.data);
          if (store.importPayload(data)) {
            this.refresh();
            wx.showToast({ title: "已恢复备份", icon: "success" });
          } else {
            wx.showToast({ title: "备份格式不正确", icon: "none" });
          }
        } catch (error) {
          wx.showToast({ title: "备份格式不正确", icon: "none" });
        }
      }
    });
  },

  onReset() {
    wx.showModal({
      title: "清除本地数据",
      content: "将删除所有课表与收藏，且无法恢复。确定继续？",
      confirmColor: "#b91c1c",
      success: res => {
        if (res.confirm) {
          store.resetData();
          this.refresh();
          wx.showToast({ title: "已清除", icon: "none" });
        }
      }
    });
  },

  onHelp() {
    wx.navigateTo({ url: "/pages/help/help" });
  }
});
