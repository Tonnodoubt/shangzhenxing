const {
  banners,
  quickEntries,
  categories,
  products,
  orders: mockOrders
} = require("./mock-data");
const createStorefrontApi = require("./mall/storefront-api");
const createAdminApi = require("./mall/admin-api");
const createRuntimeStore = require("./mall/runtime-store");
const createRuntimeHelpers = require("./mall/runtime-helpers");
const {
  cloneData,
  normalizeDetailContent,
  formatPrice,
  formatDateTime,
  generateId,
  paginateList
} = require("./utils");

/**
 * 自动发货延迟时间（毫秒）。
 * 订单创建后等待此时间自动标记为已发货，用于虚拟/无需物流商品的演示场景。
 * 可通过环境变量 AUTO_SHIP_DELAY_MS 覆盖，默认 10 秒。
 */
const AUTO_SHIP_DELAY_MS = Number(process.env.AUTO_SHIP_DELAY_MS) || (10 * 1000);

function parseSalesCount(salesText) {
  const matched = String(salesText || "").match(/\d+/);

  return matched ? Number(matched[0]) : 0;
}

function deriveProductType(categoryId) {
  const typeMap = {
    gift: "gift",
    drink: "food",
    home: "home",
    digital: "digital"
  };

  return typeMap[categoryId] || "general";
}

function decorateProduct(product) {
  if (!product) {
    return null;
  }

  return {
    ...product,
    displayPrice: formatPrice(product.price),
    displayMarketPrice: formatPrice(product.marketPrice)
  };
}

function decorateProducts(list) {
  return (list || []).map((item) => decorateProduct(item));
}

function searchProductSource(keyword) {
  const normalized = String(keyword || "").trim().toLowerCase();

  if (!normalized) {
    return products.slice();
  }

  return products.filter((item) => {
    return item.title.toLowerCase().includes(normalized)
      || item.shortDesc.toLowerCase().includes(normalized)
      || item.coverLabel.toLowerCase().includes(normalized);
  });
}

function getProductById(id) {
  return products.find((item) => item.id === id) || null;
}

function buildCartView(cartItems) {
  return (cartItems || []).map((item) => {
    return {
      ...item,
      cartKey: `${item.id}-${item.specText}`,
      displayPrice: formatPrice(item.price),
      displaySubtotal: formatPrice(item.price * item.quantity)
    };
  });
}

function buildCartSummary(cartItems) {
  const base = {
    totalCount: 0,
    totalPrice: "0.00"
  };

  (cartItems || []).forEach((item) => {
    base.totalCount += item.quantity;
    base.totalPrice = formatPrice(Number(base.totalPrice) + item.price * item.quantity);
  });

  return base;
}

function getCouponDiscount(coupon, goodsAmount) {
  if (!coupon) {
    return 0;
  }

  const threshold = Number(coupon.threshold || 0);
  const amount = Number(coupon.amount || 0);
  const numericGoodsAmount = Number(goodsAmount || 0);

  if (numericGoodsAmount < threshold) {
    return 0;
  }

  return Math.min(amount, numericGoodsAmount);
}

function buildCheckoutSummary(cartItems, coupon) {
  const goodsAmountNumber = (cartItems || []).reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);
  const totalCount = (cartItems || []).reduce((sum, item) => sum + item.quantity, 0);
  const discountAmountNumber = getCouponDiscount(coupon, goodsAmountNumber);
  const payableAmountNumber = Math.max(goodsAmountNumber - discountAmountNumber, 0);

  return {
    totalCount,
    goodsAmountNumber,
    discountAmountNumber,
    payableAmountNumber,
    goodsAmount: formatPrice(goodsAmountNumber),
    discountAmount: formatPrice(discountAmountNumber),
    payableAmount: formatPrice(payableAmountNumber)
  };
}

function buildRuntimeOrder(cartItems, options = {}) {
  const summary = buildCheckoutSummary(cartItems, options.coupon);

  return {
    id: `NO${generateId()}`,
    sourceType: "runtime",
    autoShipAfter: Date.now() + AUTO_SHIP_DELAY_MS,
    status: "pending",
    statusText: "待发货",
    createTime: formatDateTime(),
    amount: Number(summary.payableAmount),
    goodsAmount: summary.goodsAmount,
    discountAmount: summary.discountAmount,
    displayAmount: summary.payableAmount,
    couponTitle: options.coupon ? options.coupon.title : "",
    address: options.address || null,
    remark: options.remark || "",
    items: buildCartView(cartItems).map((item) => {
      return {
        id: item.id || "",
        title: item.title,
        skuId: item.skuId || "",
        price: Number(item.price || 0),
        quantity: item.quantity,
        specText: item.specText,
        subtotalAmount: Number(item.price || 0) * Number(item.quantity || 0),
        subtotal: item.displaySubtotal
      };
    })
  };
}

function getStatusText(status) {
  if (status === "pending") {
    return "待发货";
  }

  if (status === "shipping") {
    return "待收货";
  }

  if (status === "cancelled") {
    return "已取消";
  }

  return "已完成";
}

function getCommissionRate(distributor = {}) {
  const level = String((distributor || {}).level || "").trim();

  if (level.indexOf("高级") > -1 || level.indexOf("合伙人") > -1) {
    return 0.08;
  }

  return 0.05;
}

function getAftersaleStatusText(status) {
  const statusMap = {
    processing: "售后处理中",
    approved: "售后已通过",
    rejected: "售后已驳回",
    done: "售后已完成"
  };

  return statusMap[status] || "";
}

function buildAddressSnapshot(order, index) {
  if (order.address) {
    return cloneData(order.address);
  }

  return index % 2 === 0
    ? {
        receiver: "张三",
        phone: "138****8888",
        detail: "上海市 浦东新区 张江示例路 88 号",
        tag: "家"
      }
    : {
        receiver: "李四",
        phone: "139****6666",
        detail: "上海市 徐汇区 漕河泾示例路 18 号",
        tag: "公司"
      };
}

function decorateOrder(order, index = 0) {
  const amount = Number(order.amount || 0);
  const status = order.status || "pending";
  const aftersaleStatus = order.aftersaleStatus || "";

  return {
    ...order,
    amount,
    goodsAmount: order.goodsAmount || formatPrice(amount),
    discountAmount: order.discountAmount || "0.00",
    displayAmount: formatPrice(amount),
    status,
    statusText: order.statusText || getStatusText(status),
    address: buildAddressSnapshot(order, index),
    couponTitle: order.couponTitle || "",
    aftersaleStatus,
    aftersaleStatusText: getAftersaleStatusText(aftersaleStatus),
    canCancel: status === "pending",
    canConfirm: status === "shipping",
    canAftersale: status === "shipping" || status === "done"
  };
}

function mergeOrders(runtimeOrders) {
  return (runtimeOrders || []).concat(mockOrders).map((item, index) => {
    return decorateOrder(item, index);
  });
}

const runtimeStore = createRuntimeStore({
  categories,
  products,
  mockOrders,
  parseSalesCount,
  deriveProductType,
  cloneData,
  normalizeDetailContent,
  decorateOrder,
  generateId
});

const {
  ensureCategorySeeds,
  ensureProductSeeds,
  buildSeedProductSkus,
  syncProductSkusForSpecs,
  getState,
  resolveSelectedAddress,
  syncAddressState,
  withState,
  bootstrap
} = runtimeStore;

const runtimeHelpers = createRuntimeHelpers({
  cloneData,
  buildCartView,
  buildCartSummary,
  buildCheckoutSummary,
  resolveSelectedAddress,
  getProductById,
  generateId,
  formatDateTime,
  getStatusText,
  getCommissionRate,
  decorateOrder
});

const {
  getSelectedCouponInternal,
  consumeSelectedCoupon,
  syncPendingOrderLifecycle,
  findOrderById,
  buildCartPageData,
  buildCheckoutPageData,
  buildCouponPageData,
  buildProfileData,
  updateOrderCollectionsStatus
} = runtimeHelpers;

const storefrontApi = createStorefrontApi({
  banners,
  quickEntries,
  categories,
  products,
  cloneData,
  formatDateTime,
  paginateList,
  decorateProducts,
  searchProductSource,
  decorateProduct,
  getProductById,
  getState,
  resolveSelectedAddress,
  withState,
  syncAddressState,
  buildCartPageData,
  buildCheckoutPageData,
  buildCouponPageData,
  buildProfileData,
  getSelectedCouponInternal,
  buildCheckoutSummary,
  buildRuntimeOrder,
  decorateOrder,
  consumeSelectedCoupon,
  syncPendingOrderLifecycle,
  findOrderById,
  updateOrderCollectionsStatus
});

const adminApi = createAdminApi({
  categories,
  products,
  ensureCategorySeeds,
  ensureProductSeeds,
  deriveProductType,
  buildSeedProductSkus,
  syncProductSkusForSpecs,
  cloneData,
  formatPrice,
  formatDateTime,
  getState,
  withState,
  updateOrderCollectionsStatus,
  decorateOrder,
  getStatusText,
  getAftersaleStatusText
});

module.exports = {
  bootstrap,
  cloneData,
  formatPrice,
  decorateProduct,
  decorateProducts,
  getProductById,
  buildCartView,
  buildCartSummary,
  getCouponDiscount,
  buildCheckoutSummary,
  buildRuntimeOrder,
  decorateOrder,
  mergeOrders,
  ...storefrontApi,
  ...adminApi
};
