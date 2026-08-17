const store = require("../../utils/store.js");

Page({
  data: { theme: "light" },
  onShow() {
    this.setData({ theme: store.state.theme });
  }
});
