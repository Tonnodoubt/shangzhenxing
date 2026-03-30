const catalogService = require("../../services/catalog");
const mallService = require("../../services/mall-client");

const MAX_QUANTITY = 99;
const PRODUCT_TYPE_TEXT = {
  gift: "礼赠场景",
  food: "快消饮食",
  home: "家居日用",
  digital: "数码周边",
  general: "通用商品"
};

function parseSalesCount(product = {}) {
  if (typeof product.salesCount !== "undefined") {
    return Number(product.salesCount || 0);
  }

  const matched = String(product.salesText || "").match(/\d+/);

  return matched ? Number(matched[0]) : 0;
}

function buildDetailParagraphs(product = {}) {
  const detailContent = String(product.detailContent || "");
  const plainParagraphs = detailContent
    .replace(/<\/p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (plainParagraphs.length) {
    return plainParagraphs.slice(0, 3);
  }

  const fallback = [product.shortDesc].concat(product.highlights || [])
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return fallback.slice(0, 3);
}

function buildProductMetrics(product = {}) {
  const specs = Array.isArray(product.specs) ? product.specs : [];

  return [
    {
      id: "sales",
      label: "月销",
      value: String(parseSalesCount(product))
    },
    {
      id: "favorite",
      label: "收藏",
      value: String(Number(product.favoriteCount || 0))
    },
    {
      id: "specs",
      label: "规格",
      value: String(specs.length || 1)
    },
    {
      id: "type",
      label: "类型",
      value: PRODUCT_TYPE_TEXT[product.productType] || PRODUCT_TYPE_TEXT.general
    }
  ];
}

function buildServicePromises(product = {}) {
  return [
    {
      id: "coupon",
      title: "支持优惠券与活动价",
      copy: "下单前可以先去领券中心领券，结算页会自动判断是否满足门槛。"
    },
    {
      id: "aftersale",
      title: "支持基础售后申请",
      copy: "待收货和已完成订单支持发起售后，当前版本先走文本申请流程。"
    },
    {
      id: "distribution",
      title: product.distributionEnabled === false ? "当前偏自购展示" : "支持分销分享",
      copy: product.distributionEnabled === false
        ? "这类商品更适合先验证自购下单链路，后面再补推广策略。"
        : "商品卡和海报可以继续复用到分销中心，方便演示分享赚佣。"
    }
  ];
}

function buildProductViewModel(product = {}) {
  const specs = Array.isArray(product.specs) ? product.specs : [];
  const highlights = Array.isArray(product.highlights) ? product.highlights : [];

  return {
    product: {
      ...product,
      metricList: buildProductMetrics(product),
      detailParagraphs: buildDetailParagraphs(product),
      servicePromises: buildServicePromises(product),
      highlightTags: highlights.slice(0, 3),
      selectedSpecHint: specs.length ? `${specs.length} 个规格可选` : "默认规格已就绪",
      statusHint: product.statusText || "销售中"
    },
    selectedSpec: specs[0] || "",
    quantity: 1
  };
}

Page({
  data: {
    productId: "",
    product: null,
    pageState: "loading",
    errorMessage: "",
    selectedSpec: "",
    quantity: 1,
    addingAction: ""
  },
  async onLoad(options) {
    const productId = String((options && options.id) || "").trim();

    this.setData({
      productId
    });

    await this.loadProduct(productId);
  },
  async loadProduct(productId = this.data.productId) {
    if (!productId) {
      this.setData({
        product: null,
        pageState: "notFound",
        errorMessage: "缺少商品参数",
        selectedSpec: "",
        quantity: 1,
        addingAction: ""
      });
      return;
    }

    try {
      this.setData({
        product: null,
        pageState: "loading",
        errorMessage: "",
        selectedSpec: "",
        quantity: 1,
        addingAction: ""
      });

      wx.showNavigationBarLoading();
      const product = await catalogService.getProductDetail(productId);

      if (!product) {
        this.setData({
          product: null,
          pageState: "notFound",
          errorMessage: "商品不存在",
          selectedSpec: "",
          quantity: 1
        });
        return;
      }

      this.setData({
        ...buildProductViewModel(product),
        pageState: "success",
        errorMessage: ""
      });
    } catch (error) {
      const message = (error && error.message) || "商品加载失败";
      const pageState = message.indexOf("不存在") > -1 ? "notFound" : "error";

      this.setData({
        product: null,
        pageState,
        errorMessage: message,
        selectedSpec: "",
        quantity: 1
      });
    } finally {
      wx.hideNavigationBarLoading();
    }
  },
  chooseSpec(event) {
    const { spec } = event.currentTarget.dataset;

    if (!spec || this.data.pageState !== "success") {
      return;
    }

    this.setData({
      selectedSpec: spec
    });
  },
  increaseQuantity() {
    if (this.data.pageState !== "success") {
      return;
    }

    if (this.data.quantity >= MAX_QUANTITY) {
      wx.showToast({
        title: `单次最多购买 ${MAX_QUANTITY} 件`,
        icon: "none"
      });
      return;
    }

    this.setData({
      quantity: this.data.quantity + 1
    });
  },
  decreaseQuantity() {
    if (this.data.pageState !== "success") {
      return;
    }

    if (this.data.quantity <= 1) {
      return;
    }

    this.setData({
      quantity: this.data.quantity - 1
    });
  },
  async addCurrentProductToCart(action) {
    const { product, selectedSpec, quantity } = this.data;

    if (!product || this.data.pageState !== "success") {
      wx.showToast({
        title: "商品还没准备好",
        icon: "none"
      });
      return false;
    }

    if (this.data.addingAction) {
      return false;
    }

    this.setData({
      addingAction: action
    });

    try {
      await mallService.addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
        quantity,
        specText: selectedSpec,
        coverLabel: product.coverLabel,
        accent: product.accent
      });

      wx.showToast({
        title: "已加入购物车",
        icon: "success"
      });

      return true;
    } catch (error) {
      wx.showToast({
        title: error.message || "加入购物车失败",
        icon: "none"
      });
    } finally {
      this.setData({
        addingAction: ""
      });
    }

    return false;
  },
  async addToCart() {
    await this.addCurrentProductToCart("cart");
  },
  async buyNow() {
    const ok = await this.addCurrentProductToCart("buy");

    if (!ok) {
      return;
    }

    setTimeout(() => {
      wx.navigateTo({
        url: "/pages/checkout/index"
      });
    }, 300);
  },
  retryLoad() {
    this.loadProduct();
  },
  backHome() {
    wx.switchTab({
      url: "/pages/home/index"
    });
  }
});
