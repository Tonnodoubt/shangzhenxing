const mallService = require("../../services/mall-client");

function isValidMobile(phone) {
  return /^1\d{10}$/.test(String(phone || "").trim());
}

Page({
  data: {
    id: "",
    pageState: "loading",
    errorMessage: "",
    saving: false,
    form: {
      receiver: "",
      phone: "",
      detail: "",
      tag: "",
      isDefault: false
    }
  },
  async onLoad(options) {
    if (!options.id) {
      this.setData({
        pageState: "success",
        errorMessage: ""
      });
      return;
    }

    await this.loadAddress(options.id);
  },
  async loadAddress(addressId = this.data.id) {
    if (!addressId) {
      this.setData({
        pageState: "success",
        errorMessage: ""
      });
      return;
    }

    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      const current = await mallService.getAddressById(addressId);

      if (!current) {
        this.setData({
          id: addressId,
          pageState: "notFound",
          errorMessage: "地址不存在"
        });
        return;
      }

      this.setData({
        id: current.id,
        pageState: "success",
        errorMessage: "",
        form: {
          receiver: current.receiver,
          phone: current.phone,
          detail: current.detail,
          tag: current.tag || "",
          isDefault: !!current.isDefault
        }
      });
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "地址加载失败"
      });
      return;
    }
  },
  handleInput(event) {
    if (this.data.saving || this.data.pageState !== "success") {
      return;
    }

    const { field } = event.currentTarget.dataset;

    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },
  toggleDefault() {
    if (this.data.saving || this.data.pageState !== "success") {
      return;
    }

    this.setData({
      "form.isDefault": !this.data.form.isDefault
    });
  },
  async saveAddress() {
    if (this.data.saving || this.data.pageState !== "success") {
      return;
    }

    const { receiver, phone, detail, tag, isDefault } = this.data.form;
    const normalizedReceiver = String(receiver || "").trim();
    const normalizedPhone = String(phone || "").trim();
    const normalizedDetail = String(detail || "").trim();
    const normalizedTag = String(tag || "").trim();

    if (!normalizedReceiver || !normalizedPhone || !normalizedDetail) {
      wx.showToast({
        title: "请把地址信息补完整",
        icon: "none"
      });
      return;
    }

    if (!isValidMobile(normalizedPhone)) {
      wx.showToast({
        title: "请输入正确的 11 位手机号",
        icon: "none"
      });
      return;
    }

    try {
      this.setData({
        saving: true
      });

      await mallService.saveAddress({
        id: this.data.id,
        receiver: normalizedReceiver,
        phone: normalizedPhone,
        detail: normalizedDetail,
        tag: normalizedTag,
        isDefault
      });
    } catch (error) {
      this.setData({
        saving: false
      });
      wx.showToast({
        title: error.message || "地址保存失败",
        icon: "none"
      });
      return;
    }

    this.setData({
      saving: false
    });

    wx.showToast({
      title: "地址已保存",
      icon: "success"
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 250);
  },
  retryLoad() {
    this.loadAddress(this.data.id);
  },
  backList() {
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.switchTab({
          url: "/pages/profile/index"
        });
      }
    });
  }
});
