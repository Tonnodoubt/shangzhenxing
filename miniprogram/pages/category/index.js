const catalogService = require("../../services/catalog");

Page({
  data: {
    categories: [],
    activeCategoryId: "all",
    currentProducts: [],
    pageState: "loading",
    errorMessage: "",
    productLoading: false,
    productErrorMessage: "",
    isProductEmpty: false
  },
  async onLoad() {
    await this.loadCategories();
  },
  async loadCategories() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: "",
        productErrorMessage: "",
        isProductEmpty: false
      });

      wx.showNavigationBarLoading();
      const categories = await catalogService.getCategories();

      this.setData({
        categories,
        activeCategoryId: categories[0] ? categories[0].id : "all",
        pageState: "success",
        errorMessage: ""
      });
      await this.syncProducts();
    } catch (error) {
      this.setData({
        categories: [],
        currentProducts: [],
        pageState: "error",
        errorMessage: error.message || "分类加载失败",
        productLoading: false,
        productErrorMessage: "",
        isProductEmpty: false
      });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },
  switchCategory(event) {
    if (this.data.pageState !== "success" || this.data.productLoading) {
      return;
    }

    const { id } = event.currentTarget.dataset;

    this.setData(
      {
        activeCategoryId: id
      },
      async () => {
        await this.syncProducts();
      }
    );
  },
  async syncProducts() {
    try {
      this.setData({
        productLoading: true,
        productErrorMessage: "",
        isProductEmpty: false
      });

      const currentProducts = await catalogService.getProducts({
        categoryId: this.data.activeCategoryId
      });

      this.setData({
        currentProducts,
        productLoading: false,
        productErrorMessage: "",
        isProductEmpty: currentProducts.length === 0
      });
    } catch (error) {
      this.setData({
        currentProducts: [],
        productLoading: false,
        productErrorMessage: error.message || "商品加载失败",
        isProductEmpty: false
      });
    }
  },
  openProduct(event) {
    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/product/index?id=${id}`
    });
  },
  retryLoad() {
    this.loadCategories();
  },
  retryProducts() {
    this.syncProducts();
  },
  goHome() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  }
});
