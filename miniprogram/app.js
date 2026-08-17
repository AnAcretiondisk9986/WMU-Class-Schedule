require("./utils/polyfills.js");
const store = require("./utils/store.js");

App({
  globalData: {
    theme: "light"
  },

  onLaunch() {
    store.loadState();
    this.globalData.theme = store.state.theme;
  },

  onShow() {
    this.globalData.theme = store.state.theme;
  }
});
