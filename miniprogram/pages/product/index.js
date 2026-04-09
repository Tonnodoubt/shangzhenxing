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

function hasFiniteStock(value) {
  return value !== "" && value !== null && typeof value !== "undefined" && Number.isFinite(Number(value));
}

function normalizeSkuOptions(product = {}) {
  const source = Array.isArray(product.skuOptions) && product.skuOptions.length
    ? product.skuOptions
    : (Array.isArray(product.specs) ? product.specs.map((item) => ({
        skuId: "",
        specText: item,
        availableStock: null
      })) : []);

  return source.map((item, index) => ({
    skuId: item.skuId || "",
    specText: String(item.specText || `规格${index + 1}`).trim() || `规格${index + 1}`,
    availableStock: hasFiniteStock(item.availableStock) ? Math.max(0, Number(item.availableStock)) : null,
    price: typeof item.price !== "undefined" ? Number(item.price || 0) : null
  }));
}

function getSelectedSku(product = {}, selectedSpec = "") {
  const skuOptions = Array.isArray(product.skuOptions) ? product.skuOptions : [];
  const normalizedSpec = String(selectedSpec || "").trim();

  if (!skuOptions.length) {
    return null;
  }

  return skuOptions.find((item) => item.specText === normalizedSpec) || skuOptions[0];
}

function getSelectedSpecMaxQuantity(product = {}, selectedSpec = "") {
  const selectedSku = getSelectedSku(product, selectedSpec);

  if (!selectedSku || !hasFiniteStock(selectedSku.availableStock)) {
    return MAX_QUANTITY;
  }

  return Math.max(0, Math.min(MAX_QUANTITY, Number(selectedSku.availableStock)));
}

function buildQuantityHint(product = {}, selectedSpec = "") {
  const selectedSku = getSelectedSku(product, selectedSpec);
  const maxQuantity = getSelectedSpecMaxQuantity(product, selectedSpec);

  if (selectedSku && hasFiniteStock(selectedSku.availableStock)) {
    return `当前规格最多可买 ${maxQuantity} 件`;
  }

  return `当前单次最多先买 ${MAX_QUANTITY} 件，避免误操作。`;
}

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
  const skuOptions = normalizeSkuOptions(product);
  const specs = skuOptions.length ? skuOptions.map((item) => item.specText) : [];
  const highlights = Array.isArray(product.highlights) ? product.highlights : [];
  const selectedSpec = specs[0] || "";
  const maxQuantity = getSelectedSpecMaxQuantity({
    ...product,
    skuOptions
  }, selectedSpec);

  return {
    product: {
      ...product,
      skuOptions,
      specs,
      metricList: buildProductMetrics({
        ...product,
        specs
      }),
      detailParagraphs: buildDetailParagraphs(product),
      servicePromises: buildServicePromises(product),
      highlightTags: highlights.slice(0, 3),
      selectedSpecHint: specs.length ? `${specs.length} 个规格可选` : "默认规格已就绪",
      statusHint: product.statusText || "销售中"
    },
    selectedSpec,
    quantity: maxQuantity > 0 ? 1 : 0,
    maxQuantity,
    quantityHint: buildQuantityHint({
      ...product,
      skuOptions,
      specs
    }, selectedSpec)
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
    maxQuantity: MAX_QUANTITY,
    quantityHint: `当前单次最多先买 ${MAX_QUANTITY} 件，避免误操作。`,
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
        maxQuantity: MAX_QUANTITY,
        quantityHint: `当前单次最多先买 ${MAX_QUANTITY} 件，避免误操作。`,
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
        maxQuantity: MAX_QUANTITY,
        quantityHint: `当前单次最多先买 ${MAX_QUANTITY} 件，避免误操作。`,
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
          quantity: 1,
          maxQuantity: MAX_QUANTITY,
          quantityHint: `当前单次最多先买 ${MAX_QUANTITY} 件，避免误操作。`
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
        quantity: 1,
        maxQuantity: MAX_QUANTITY,
        quantityHint: `当前单次最多先买 ${MAX_QUANTITY} 件，避免误操作。`
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

    const maxQuantity = getSelectedSpecMaxQuantity(this.data.product, spec);
    const nextQuantity = maxQuantity > 0
      ? Math.max(1, Math.min(Number(this.data.quantity || 1), maxQuantity))
      : 0;

    this.setData({
      selectedSpec: spec,
      quantity: nextQuantity,
      maxQuantity,
      quantityHint: buildQuantityHint(this.data.product, spec)
    });
  },
  increaseQuantity() {
    if (this.data.pageState !== "success") {
      return;
    }

    if (this.data.quantity >= this.data.maxQuantity) {
      wx.showToast({
        title: `当前规格最多购买 ${this.data.maxQuantity} 件`,
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
    const { product, selectedSpec, quantity, maxQuantity } = this.data;

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

    const selectedSku = getSelectedSku(product, selectedSpec);

    if (quantity > maxQuantity) {
      this.setData({
        quantity: maxQuantity
      });
      wx.showToast({
        title: `当前规格最多购买 ${maxQuantity} 件`,
        icon: "none"
      });
      return false;
    }

    this.setData({
      addingAction: action
    });

    try {
      await mallService.addToCart({
        id: product.id,
        title: product.title,
        skuId: selectedSku ? selectedSku.skuId : "",
        price: selectedSku && typeof selectedSku.price === "number" ? selectedSku.price : product.price,
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
