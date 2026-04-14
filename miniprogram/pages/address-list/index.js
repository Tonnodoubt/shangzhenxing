const mallService = require("../../services/mall-client");
const { confirmAction } = require("../../shared/dialog");

function buildAddressViewModel(payload = {}) {
  return {
    addresses: payload.addresses || [],
    selectedAddressId: payload.selectedAddressId || "",
    pageState: "success",
    errorMessage: ""
  };
}

Page({
  data: {
    addresses: [],
    mode: "manage",
    selectedAddressId: "",
    pageState: "loading",
    errorMessage: "",
    actionLoadingId: "",
    actionType: ""
  },
  onLoad(options) {
    this.setData({
      mode: options.mode || "manage"
    });
  },
  async onShow() {
    await this.loadAddresses();
  },
  async loadAddresses() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: "",
        actionLoadingId: "",
        actionType: ""
      });

      this.setData(buildAddressViewModel(await mallService.getAddressListData()));
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "地址加载失败",
        actionLoadingId: "",
        actionType: ""
      });
    }
  },
  async selectAddress(event) {
    if (this.data.mode !== "select" || this.data.actionLoadingId || this.data.pageState !== "success") {
      return;
    }

    const { id } = event.currentTarget.dataset;

    try {
      this.setData({
        actionLoadingId: id,
        actionType: "select"
      });

      await mallService.setSelectedAddress(id);
    } catch (error) {
      this.setData({
        actionLoadingId: "",
        actionType: ""
      });
      wx.showToast({
        title: error.message || "地址切换失败",
        icon: "none"
      });
      return;
    }

    wx.showToast({
      title: "地址已切换",
      icon: "success",
      complete() {
        wx.navigateBack({
          delta: 1
        });
      }
    });
  },
  openCreate() {
    if (this.data.actionLoadingId || this.data.pageState !== "success") {
      return;
    }

    wx.navigateTo({
      url: "/pages/address-edit/index"
    });
  },
  openEdit(event) {
    if (this.data.actionLoadingId || this.data.pageState !== "success") {
      return;
    }

    const { id } = event.currentTarget.dataset;

    wx.navigateTo({
      url: `/pages/address-edit/index?id=${id}`
    });
  },
  async deleteAddress(event) {
    if (this.data.actionLoadingId || this.data.pageState !== "success") {
      return;
    }

    const { id } = event.currentTarget.dataset;
    const confirmed = await confirmAction({
      title: "删除地址",
      content: "确认删除这个收货地址吗？删除后需要重新填写。",
      confirmText: "确认删除"
    });

    if (!confirmed) {
      return;
    }

    try {
      this.setData({
        actionLoadingId: id,
        actionType: "delete"
      });

      this.setData({
        ...buildAddressViewModel(await mallService.deleteAddress(id)),
        actionLoadingId: "",
        actionType: ""
      });
    } catch (error) {
      this.setData({
        actionLoadingId: "",
        actionType: ""
      });
      wx.showToast({
        title: error.message || "地址删除失败",
        icon: "none"
      });
    }
  },
  retryLoad() {
    this.loadAddresses();
  },
  backProfile() {
    wx.switchTab({
      url: "/pages/profile/index"
    });
  }
});
