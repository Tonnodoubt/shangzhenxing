const catalogService = require("../../services/catalog");

function normalizeKeyword(value) {
  return String(value || "").trim();
}

Page({
  data: {
    keyword: "",
    results: [],
    pageState: "idle",
    errorMessage: "",
    searching: false,
    canSearch: false,
    lastKeyword: ""
  },
  async onLoad(options) {
    const keyword = normalizeKeyword(options && options.keyword);

    this.setData({
      keyword,
      canSearch: !!keyword
    });

    if (keyword) {
      await this.performSearch();
    }
  },
  handleInput(event) {
    const keyword = event.detail.value || "";

    this.setData({
      keyword,
      canSearch: !!normalizeKeyword(keyword)
    });
  },
  submitSearch() {
    this.performSearch();
  },
  async performSearch() {
    if (this.data.searching) {
      return;
    }

    const keyword = normalizeKeyword(this.data.keyword);

    if (!keyword) {
      this.setData({
        keyword: "",
        results: [],
        pageState: "idle",
        errorMessage: "",
        lastKeyword: "",
        canSearch: false
      });
      wx.showToast({
        title: "先输入关键词",
        icon: "none"
      });
      return;
    }

    try {
      wx.showNavigationBarLoading();
      this.setData({
        keyword,
        pageState: "loading",
        errorMessage: "",
        searching: true,
        lastKeyword: keyword,
        canSearch: true
      });

      const results = await catalogService.getProducts({
        keyword
      });

      this.setData({
        results,
        pageState: results.length ? "success" : "empty",
        errorMessage: "",
        searching: false
      });
    } catch (error) {
      this.setData({
        results: [],
        pageState: "error",
        errorMessage: error.message || "搜索失败",
        searching: false
      });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },
  openProduct(event) {
    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/product/index?id=${id}`
    });
  },
  retrySearch() {
    this.performSearch();
  },
  openCategory() {
    wx.switchTab({
      url: "/pages/category/index"
    });
  }
});
