const {
  banners,
  quickEntries,
  categories,
  products,
  orders: mockOrders
} = require("../data/mock");

const AUTO_SHIP_DELAY_MS = 10 * 1000;

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

function ensureCategorySeeds() {
  categories.forEach((item, index) => {
    if (!item.parentId && item.parentId !== 0) {
      item.parentId = 0;
    }

    if (!item.sortOrder) {
      item.sortOrder = (index + 1) * 10;
    }

    if (!item.status) {
      item.status = "enabled";
    }

    if (!item.createdAt) {
      item.createdAt = `2026-03-2${Math.min(index, 8)} 10:00:00`;
    }

    if (!item.updatedAt) {
      item.updatedAt = item.createdAt;
    }
  });
}

function ensureProductSeeds() {
  products.forEach((item, index) => {
    if (!item.subTitle) {
      item.subTitle = item.shortDesc;
    }

    if (!item.coverImage) {
      item.coverImage = `https://example.com/products/${item.id}.jpg`;
    }

    if (!item.imageList) {
      item.imageList = [
        item.coverImage,
        `${item.coverImage}?v=2`
      ];
    }

    if (!item.detailContent) {
      item.detailContent = `<p>${item.shortDesc}</p><p>${(item.highlights || []).join(" / ")}</p>`;
    }

    if (!item.productType) {
      item.productType = deriveProductType(item.categoryId);
    }

    if (!item.status) {
      item.status = "on_sale";
    }

    if (typeof item.distributionEnabled === "undefined") {
      item.distributionEnabled = true;
    }

    if (!item.salesCount) {
      item.salesCount = parseSalesCount(item.salesText);
    }

    if (!item.favoriteCount) {
      item.favoriteCount = 20 + index * 6;
    }

    if (!item.createdAt) {
      item.createdAt = `2026-03-2${Math.min(index, 8)} 11:00:00`;
    }

    if (!item.updatedAt) {
      item.updatedAt = item.createdAt;
    }
  });
}

function ensureSeedCollections() {
  ensureCategorySeeds();
  ensureProductSeeds();
}

function buildSeedProductSkus() {
  ensureProductSeeds();

  return products.reduce((list, product, productIndex) => {
    return list.concat(buildSeedSkusForProduct(product, productIndex));
  }, []);
}

function buildSeedSkusForProduct(product, productIndex = 0) {
  const specs = product.specs && product.specs.length ? product.specs : ["默认规格"];

  return specs.map((spec, specIndex) => {
    return {
      id: `sku-${product.id}-${specIndex + 1}`,
      productId: product.id,
      skuCode: `${String(product.id).toUpperCase()}-${specIndex + 1}`,
      specText: spec,
      price: Number(product.price || 0) + specIndex * 20,
      originPrice: Number(product.marketPrice || product.price || 0) + specIndex * 20,
      stock: Math.max(30, 96 - productIndex * 8 - specIndex * 6),
      lockStock: specIndex === 0 ? 2 : 0,
      status: "enabled"
    };
  });
}

function syncProductSkusForSpecs(state, product) {
  const currentSkuList = (state.productSkus || []).filter((item) => item.productId === product.id);
  const productIndex = products.findIndex((item) => item.id === product.id);
  const fallbackSkuList = buildSeedSkusForProduct(product, Math.max(productIndex, 0));
  const specs = product.specs && product.specs.length ? product.specs : ["默认规格"];
  const nextSkuList = specs.map((specText, index) => {
    const matchedBySpec = currentSkuList.find((item) => item.specText === specText);
    const matchedByIndex = currentSkuList[index];
    const matched = matchedBySpec || matchedByIndex || {};
    const fallback = fallbackSkuList[index] || {};

    return {
      id: matched.id || fallback.id || generateId("sku"),
      productId: product.id,
      skuCode: matched.skuCode || fallback.skuCode || `${String(product.id).toUpperCase()}-${index + 1}`,
      specText,
      price: typeof matched.price === "number" ? matched.price : Number(fallback.price || product.price || 0),
      originPrice: typeof matched.originPrice === "number"
        ? matched.originPrice
        : Number(fallback.originPrice || product.marketPrice || product.price || 0),
      stock: typeof matched.stock === "number" ? matched.stock : Number(fallback.stock || 0),
      lockStock: typeof matched.lockStock === "number" ? matched.lockStock : Number(fallback.lockStock || 0),
      status: matched.status || fallback.status || "enabled"
    };
  });

  state.productSkus = (state.productSkus || []).filter((item) => item.productId !== product.id).concat(nextSkuList);

  return nextSkuList;
}

function buildSeedUserRecords() {
  return [
    {
      id: "user-1",
      nickname: "微信用户",
      mobile: "13800006699",
      isNewUser: true,
      sourceScene: "share",
      inviterUserId: "user-2",
      createdAt: "2026-03-28 08:30:00"
    },
    {
      id: "user-2",
      nickname: "林小满",
      mobile: "13800006688",
      isNewUser: false,
      sourceScene: "distribution",
      inviterUserId: "",
      createdAt: "2026-03-20 10:00:00"
    },
    {
      id: "user-3",
      nickname: "周星野",
      mobile: "13800007766",
      isNewUser: false,
      sourceScene: "invite",
      inviterUserId: "user-2",
      createdAt: "2026-03-22 09:20:00"
    },
    {
      id: "user-4",
      nickname: "陈一诺",
      mobile: "13800008855",
      isNewUser: false,
      sourceScene: "activity",
      inviterUserId: "user-3",
      createdAt: "2026-03-24 14:10:00"
    }
  ];
}

function buildSeedDistributorProfiles() {
  return [
    {
      id: "dist-1",
      userId: "user-2",
      nickname: "林小满",
      mobile: "13800006688",
      level: "高级分销员",
      status: "active",
      teamCount: 12,
      totalCommissionCent: 36800,
      pendingCommissionCent: 12900,
      joinedAt: "2026-03-20 10:00:00"
    },
    {
      id: "dist-2",
      userId: "user-3",
      nickname: "周星野",
      mobile: "13800007766",
      level: "普通分销员",
      status: "pending_review",
      teamCount: 3,
      totalCommissionCent: 8600,
      pendingCommissionCent: 4200,
      joinedAt: "2026-03-27 18:00:00"
    }
  ];
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
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

function formatDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + " " + [pad(date.getHours()), pad(date.getMinutes())].join(":");
}

function buildRuntimeOrder(cartItems, options = {}) {
  const summary = buildCheckoutSummary(cartItems, options.coupon);

  return {
    id: `NO${Date.now()}`,
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

function buildInitialState() {
  ensureSeedCollections();

  return {
    user: {
      nickname: "访客用户",
      level: "普通会员",
      phone: "未授权手机号",
      isAuthorized: false
    },
    userRecords: buildSeedUserRecords(),
    addresses: [
      {
        id: "addr-1",
        receiver: "张三",
        phone: "138****8888",
        detail: "上海市 浦东新区 张江示例路 88 号",
        tag: "家",
        isDefault: true
      },
      {
        id: "addr-2",
        receiver: "李四",
        phone: "139****6666",
        detail: "上海市 徐汇区 漕河泾示例路 18 号",
        tag: "公司",
        isDefault: false
      }
    ],
    selectedAddressId: "addr-1",
    address: null,
    couponCenterTemplates: [
      {
        id: "tpl-1",
        title: "新人立减 20",
        amount: 20,
        threshold: 99,
        badge: "新人",
        desc: "首单满 99 可用",
        expiryText: "领取后 7 天有效",
        claimed: false,
        status: "enabled",
        issueType: "center_claim",
        validDays: 7,
        receivedCount: 128,
        usedCount: 56,
        createdAt: "2026-03-20 10:00:00",
        updatedAt: "2026-03-28 09:00:00"
      },
      {
        id: "tpl-2",
        title: "满 199 减 30",
        amount: 30,
        threshold: 199,
        badge: "满减",
        desc: "基础转化券",
        expiryText: "领取后 15 天有效",
        claimed: false,
        status: "enabled",
        issueType: "manual_issue",
        validDays: 15,
        receivedCount: 76,
        usedCount: 23,
        createdAt: "2026-03-21 10:00:00",
        updatedAt: "2026-03-28 09:10:00"
      },
      {
        id: "tpl-3",
        title: "分销专享券",
        amount: 15,
        threshold: 129,
        badge: "分销",
        desc: "分享成交场景可用",
        expiryText: "领取后 10 天有效",
        claimed: false,
        status: "enabled",
        issueType: "center_claim",
        validDays: 10,
        receivedCount: 42,
        usedCount: 12,
        createdAt: "2026-03-22 10:00:00",
        updatedAt: "2026-03-28 09:15:00"
      }
    ],
    coupons: [
      {
        id: "coupon-1",
        templateId: "tpl-1",
        title: "新人券",
        amount: 20,
        threshold: 99,
        status: "available",
        expiryText: "2026-04-30 前可用",
        sourceText: "新客礼包"
      },
      {
        id: "coupon-2",
        title: "满 199 减 30",
        templateId: "tpl-2",
        amount: 30,
        threshold: 199,
        status: "available",
        expiryText: "2026-05-15 前可用",
        sourceText: "运营发放"
      }
    ],
    selectedCouponId: "",
    cartItems: [
      {
        id: "p1",
        title: "每日精选零食礼盒",
        price: 129,
        quantity: 1,
        specText: "标准装",
        coverLabel: "礼盒",
        accent: "#F6D4C8"
      }
    ],
    orderRecords: cloneData(mockOrders).map((order, index) => decorateOrder(order, index)),
    runtimeOrders: [],
    afterSales: [],
    shipmentRecords: [],
    productSkus: buildSeedProductSkus(),
    distributionRules: {
      enabled: true,
      levelOneRate: 8,
      levelTwoRate: 3,
      bindDays: 15,
      ruleDesc: "用户通过分享进入后 15 天内下单归属邀请人",
      updatedAt: "2026-03-28 09:30:00",
      updatedBy: {
        adminUserId: "admin-1",
        realName: "张三"
      }
    },
    distributor: {
      level: "高级分销员",
      totalCommission: 368,
      pendingCommission: 129,
      settledCommission: 239,
      teamCount: 12,
      todayInviteCount: 3
    },
    teamMembers: [
      {
        id: "team-1",
        nickname: "林小满",
        avatarLabel: "林",
        joinedAt: "2026-03-24",
        contributedAmount: 268
      },
      {
        id: "team-2",
        nickname: "周星野",
        avatarLabel: "周",
        joinedAt: "2026-03-22",
        contributedAmount: 198
      },
      {
        id: "team-3",
        nickname: "陈一诺",
        avatarLabel: "陈",
        joinedAt: "2026-03-20",
        contributedAmount: 129
      }
    ],
    commissionRecords: [
      {
        id: "cm-1",
        title: "每日精选零食礼盒",
        fromUser: "林小满",
        orderNo: "NO20260326001",
        amount: 26,
        levelText: "一级佣金",
        status: "pending",
        statusText: "待结算",
        createdAt: "2026-03-26 15:22"
      },
      {
        id: "cm-2",
        title: "轻饮系列组合装",
        fromUser: "周星野",
        orderNo: "NO20260325002",
        amount: 18,
        levelText: "二级佣金",
        status: "settled",
        statusText: "已结算",
        createdAt: "2026-03-25 11:08"
      }
    ],
    distributorProfiles: buildSeedDistributorProfiles()
  };
}

let runtimeState = null;

function getState() {
  if (!runtimeState) {
    runtimeState = buildInitialState();
    syncAddressState(runtimeState);
  }

  return runtimeState;
}

function resolveSelectedAddress(state) {
  const addresses = state.addresses || [];
  let target = addresses.find((item) => item.id === state.selectedAddressId);

  if (!target) {
    target = addresses.find((item) => item.isDefault) || addresses[0] || null;
  }

  return {
    selectedAddressId: target ? target.id : "",
    address: target ? cloneData(target) : null
  };
}

function syncAddressState(state) {
  const nextState = resolveSelectedAddress(state);

  state.selectedAddressId = nextState.selectedAddressId;
  state.address = nextState.address;

  return state.address;
}

function syncAppGlobalData() {
  try {
    const app = getApp();

    if (app) {
      app.globalData = cloneData(getState());
    }
  } catch (error) {
    // 页面在 App 启动前 require service 时，这里允许静默跳过。
  }
}

function withState(handler) {
  const result = handler(getState());

  syncAppGlobalData();

  return result;
}

function getSelectedCouponInternal(state) {
  return (state.coupons || []).find((item) => {
    return item.id === state.selectedCouponId && item.status === "available";
  }) || null;
}

function consumeSelectedCoupon(state, orderId) {
  const selectedCouponId = state.selectedCouponId;

  if (!selectedCouponId) {
    return;
  }

  state.coupons = (state.coupons || []).map((item) => {
    if (item.id !== selectedCouponId) {
      return item;
    }

    return {
      ...item,
      status: "used",
      orderId
    };
  });

  state.selectedCouponId = "";
}

function restoreUsedCouponForOrder(state, orderId) {
  state.coupons = (state.coupons || []).map((item) => {
    if (item.orderId !== orderId || item.status !== "used") {
      return item;
    }

    return {
      ...item,
      status: "available",
      orderId: ""
    };
  });
}

function shouldAutoShipOrder(order) {
  return !!(
    order &&
    order.sourceType === "runtime" &&
    order.status === "pending" &&
    Number(order.autoShipAfter || 0) >= 0 &&
    Date.now() >= Number(order.autoShipAfter || 0)
  );
}

function buildCommissionTitle(order = {}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const firstTitle = String(((items[0] || {}).title || "")).trim();

  if (!firstTitle) {
    return "订单成交分佣";
  }

  if (items.length > 1) {
    return `${firstTitle} 等 ${items.length} 件商品`;
  }

  return firstTitle;
}

function calculateCommissionableAmount(order = {}) {
  return (order.items || []).reduce((sum, item) => {
    const product = getProductById(item.id);

    if (product && product.distributionEnabled === false) {
      return sum;
    }

    return sum + Number(item.subtotalAmount || 0);
  }, 0);
}

function syncDistributionAfterOrderDone(state, order) {
  if (!order || !order.id) {
    return;
  }

  const alreadySynced = (state.commissionRecords || []).some((item) => item.orderNo === order.id);

  if (alreadySynced) {
    return;
  }

  const commissionBase = calculateCommissionableAmount(order);
  const commissionAmount = Number((commissionBase * getCommissionRate(state.distributor || {})).toFixed(2));

  if (commissionAmount <= 0) {
    return;
  }

  const record = {
    id: generateId("cm"),
    title: buildCommissionTitle(order),
    fromUser: String(((state.user || {}).nickname || "微信用户")).trim() || "微信用户",
    orderNo: order.id,
    amount: commissionAmount,
    levelText: "一级佣金",
    status: "pending",
    statusText: "待结算",
    createdAt: formatDateTime()
  };

  state.commissionRecords = [record].concat(state.commissionRecords || []);
  state.distributor = {
    ...(state.distributor || {}),
    totalCommission: Number((Number((state.distributor || {}).totalCommission || 0) + commissionAmount).toFixed(2)),
    pendingCommission: Number((Number((state.distributor || {}).pendingCommission || 0) + commissionAmount).toFixed(2))
  };
}

function syncPendingOrderLifecycle(state) {
  state.orderRecords = (state.orderRecords || []).map((item, index) => {
    if (!shouldAutoShipOrder(item)) {
      return decorateOrder(item, index);
    }

    return decorateOrder(
      {
        ...item,
        status: "shipping",
        statusText: getStatusText("shipping")
      },
      index
    );
  });

  state.runtimeOrders = (state.runtimeOrders || []).map((item, index) => {
    if (!shouldAutoShipOrder(item)) {
      return decorateOrder(item, index);
    }

    return decorateOrder(
      {
        ...item,
        status: "shipping",
        statusText: getStatusText("shipping")
      },
      index
    );
  });
}

function findOrderById(state, orderId) {
  return (state.orderRecords || []).find((item) => item.id === orderId) || null;
}

function assertUserOrderStatusTransition(currentStatus, nextStatus) {
  if (!nextStatus) {
    throw new Error("缺少订单状态");
  }

  if (currentStatus === nextStatus) {
    return;
  }

  const allowedTransitions = {
    pending: ["cancelled"],
    shipping: ["done"]
  };
  const allowedList = allowedTransitions[currentStatus] || [];

  if (!allowedList.includes(nextStatus)) {
    throw new Error("当前订单不能执行这个操作");
  }
}

function buildCartPageData(state) {
  const source = state.cartItems || [];
  const summary = buildCartSummary(source);

  return {
    cartItems: buildCartView(source),
    totalCount: summary.totalCount,
    totalPrice: summary.totalPrice,
    isEmpty: source.length === 0
  };
}

function buildCheckoutPageData(state) {
  const source = state.cartItems || [];
  const selectedCoupon = getSelectedCouponInternal(state);
  const summary = buildCheckoutSummary(source, selectedCoupon);

  return {
    address: resolveSelectedAddress(state).address,
    cartItems: buildCartView(source),
    totalCount: summary.totalCount,
    goodsAmount: summary.goodsAmount,
    discountAmount: summary.discountAmount,
    payableAmount: summary.payableAmount,
    goodsAmountNumber: summary.goodsAmountNumber,
    selectedCoupon: selectedCoupon ? cloneData(selectedCoupon) : null
  };
}

function buildCouponPageData(state) {
  return {
    centerTemplates: cloneData(state.couponCenterTemplates || []),
    coupons: cloneData(state.coupons || []),
    selectedCouponId: state.selectedCouponId || ""
  };
}

function buildProfileData(state) {
  return {
    user: cloneData(state.user),
    address: resolveSelectedAddress(state).address || {},
    coupons: cloneData(state.coupons || []),
    cartCount: (state.cartItems || []).reduce((sum, item) => sum + item.quantity, 0),
    runtimeOrderCount: (state.runtimeOrders || []).length,
    distributor: cloneData(state.distributor || {})
  };
}

function bootstrap() {
  getState();
  syncAppGlobalData();
}

function getHomeData() {
  return {
    banners: cloneData(banners),
    quickEntries: cloneData(quickEntries),
    featuredProducts: decorateProducts(products.slice(0, 4)),
    recommendedProducts: decorateProducts(products.slice(2, 6))
  };
}

function getCategories() {
  return cloneData(categories);
}

function getProductsByCategory(categoryId = "all") {
  const list = categoryId === "all"
    ? products
    : products.filter((item) => item.categoryId === categoryId);

  return decorateProducts(list);
}

function getProductsByKeyword(keyword) {
  return searchProductSource(keyword);
}

function searchProducts(keyword) {
  return decorateProducts(searchProductSource(keyword));
}

function getProductDetail(id) {
  return decorateProduct(getProductById(id));
}

function getAddresses() {
  return cloneData(getState().addresses || []);
}

function getAddressById(addressId) {
  return cloneData((getState().addresses || []).find((item) => item.id === addressId) || null);
}

function getAddressListData() {
  const state = getState();
  const resolved = resolveSelectedAddress(state);

  return {
    addresses: cloneData(state.addresses || []),
    selectedAddressId: resolved.selectedAddressId
  };
}

function getSelectedAddress() {
  return resolveSelectedAddress(getState()).address;
}

function setSelectedAddress(addressId) {
  return withState((state) => {
    state.selectedAddressId = addressId;

    return syncAddressState(state);
  });
}

function saveAddress(payload) {
  return withState((state) => {
    const addresses = (state.addresses || []).slice();
    let nextSelectedAddressId = state.selectedAddressId;

    if (payload.id) {
      const index = addresses.findIndex((item) => item.id === payload.id);

      if (index > -1) {
        addresses[index] = {
          ...addresses[index],
          ...payload
        };
      }
    } else {
      addresses.unshift({
        ...payload,
        id: `addr-${Date.now()}`
      });
    }

    if (payload.isDefault) {
      const defaultId = payload.id || (addresses[0] || {}).id;

      addresses.forEach((item) => {
        item.isDefault = item.id === defaultId;
      });

      nextSelectedAddressId = defaultId;
    }

    if (!addresses.some((item) => item.isDefault) && addresses[0]) {
      addresses[0].isDefault = true;
    }

    state.addresses = addresses;
    state.selectedAddressId = nextSelectedAddressId;

    return syncAddressState(state);
  });
}

function deleteAddress(addressId) {
  return withState((state) => {
    state.addresses = (state.addresses || []).filter((item) => item.id !== addressId);

    if (state.addresses.length && !state.addresses.some((item) => item.isDefault)) {
      state.addresses[0].isDefault = true;
    }

    syncAddressState(state);

    return {
      addresses: cloneData(state.addresses || []),
      selectedAddressId: state.selectedAddressId || ""
    };
  });
}

function getCartPageData() {
  return buildCartPageData(getState());
}

function setCartItems(cartItems) {
  return withState((state) => {
    state.cartItems = cloneData(cartItems || []);

    return buildCartPageData(state);
  });
}

function addToCart(product) {
  return withState((state) => {
    const cartItems = state.cartItems || [];
    const matchIndex = cartItems.findIndex((item) => {
      return item.id === product.id && item.specText === product.specText;
    });

    if (matchIndex > -1) {
      cartItems[matchIndex].quantity += product.quantity;
    } else {
      cartItems.push(cloneData(product));
    }

    state.cartItems = cartItems;

    return buildCartPageData(state);
  });
}

function increaseCartItem(id, specText) {
  return withState((state) => {
    state.cartItems = (state.cartItems || []).map((item) => {
      if (item.id !== id || item.specText !== specText) {
        return item;
      }

      return {
        ...item,
        quantity: item.quantity + 1
      };
    });

    return buildCartPageData(state);
  });
}

function decreaseCartItem(id, specText) {
  return withState((state) => {
    const nextCart = [];

    (state.cartItems || []).forEach((item) => {
      if (item.id !== id || item.specText !== specText) {
        nextCart.push(item);
        return;
      }

      if (item.quantity > 1) {
        nextCart.push({
          ...item,
          quantity: item.quantity - 1
        });
      }
    });

    state.cartItems = nextCart;

    return buildCartPageData(state);
  });
}

function removeCartItem(id, specText) {
  return withState((state) => {
    state.cartItems = (state.cartItems || []).filter((item) => {
      return item.id !== id || item.specText !== specText;
    });

    return buildCartPageData(state);
  });
}

function getCartCount() {
  return (getState().cartItems || []).reduce((sum, item) => sum + item.quantity, 0);
}

function getCouponPageData() {
  return buildCouponPageData(getState());
}

function getSelectedCoupon() {
  const selectedCoupon = getSelectedCouponInternal(getState());

  return selectedCoupon ? cloneData(selectedCoupon) : null;
}

function getAvailableCoupons(totalAmount) {
  return cloneData((getState().coupons || []).filter((item) => {
    return item.status === "available" && Number(totalAmount || 0) >= Number(item.threshold || 0);
  }));
}

function claimCoupon(templateId) {
  return withState((state) => {
    const template = (state.couponCenterTemplates || []).find((item) => item.id === templateId);

    if (!template || template.claimed) {
      return {
        ok: false
      };
    }

    template.claimed = true;

    const nextCoupon = {
      id: `coupon-${Date.now()}`,
      templateId: template.id,
      title: template.title,
      amount: template.amount,
      threshold: template.threshold,
      status: "available",
      expiryText: template.expiryText,
      sourceText: "领券中心"
    };

    state.coupons = [nextCoupon].concat(state.coupons || []);

    return {
      ok: true,
      coupon: cloneData(nextCoupon)
    };
  });
}

function selectCoupon(couponId, amount) {
  return withState((state) => {
    const coupon = (state.coupons || []).find((item) => item.id === couponId);

    if (!coupon) {
      return {
        ok: false,
        message: "这张券不存在了"
      };
    }

    if (coupon.status !== "available") {
      return {
        ok: false,
        message: "这张券当前不可用"
      };
    }

    if (Number(amount || 0) < Number(coupon.threshold || 0)) {
      return {
        ok: false,
        message: "当前金额还不能用这张券"
      };
    }

    state.selectedCouponId = couponId;

    return {
      ok: true,
      coupon: cloneData(coupon)
    };
  });
}

function clearSelectedCoupon() {
  return withState((state) => {
    state.selectedCouponId = "";

    return {
      ok: true
    };
  });
}

function getCheckoutPageData() {
  return buildCheckoutPageData(getState());
}

function createOrder(order) {
  return withState((state) => {
    const nextOrder = decorateOrder(order, 0);

    state.runtimeOrders = [nextOrder].concat(state.runtimeOrders || []);
    state.orderRecords = [nextOrder].concat(state.orderRecords || []);

    return cloneData(nextOrder);
  });
}

function submitOrder(options = {}) {
  return withState((state) => {
    const source = state.cartItems || [];
    const address = resolveSelectedAddress(state).address;

    if (!source.length) {
      return {
        ok: false,
        message: "购物车为空"
      };
    }

    if (!address) {
      return {
        ok: false,
        message: "请先选择地址"
      };
    }

    const selectedCoupon = getSelectedCouponInternal(state);
    const checkoutSummary = buildCheckoutSummary(source, selectedCoupon);
    const appliedCoupon = checkoutSummary.discountAmountNumber > 0 ? selectedCoupon : null;
    const nextOrder = decorateOrder(buildRuntimeOrder(source, {
      remark: options.remark || "",
      address,
      coupon: appliedCoupon
    }));

    state.runtimeOrders = [nextOrder].concat(state.runtimeOrders || []);
    state.orderRecords = [nextOrder].concat(state.orderRecords || []);

    if (appliedCoupon) {
      consumeSelectedCoupon(state, nextOrder.id);
    } else {
      state.selectedCouponId = "";
    }

    state.cartItems = [];

    return {
      ok: true,
      order: cloneData(nextOrder)
    };
  });
}

function getAllOrders() {
  return withState((state) => {
    syncPendingOrderLifecycle(state);
    return cloneData(state.orderRecords || []);
  });
}

function getOrderById(orderId) {
  return withState((state) => {
    syncPendingOrderLifecycle(state);
    return cloneData(findOrderById(state, orderId));
  });
}

function getOrderDetailData(orderId) {
  return withState((state) => {
    syncPendingOrderLifecycle(state);

    return {
      order: cloneData(findOrderById(state, orderId)),
      afterSale: cloneData((state.afterSales || []).find((item) => item.orderId === orderId) || null)
    };
  });
}

function updateOrderStatus(orderId, nextStatus) {
  return withState((state) => {
    return updateOrderCollectionsStatus(state, orderId, nextStatus);
  });
}

function updateOrderCollectionsStatus(state, orderId, nextStatus) {
  let targetOrder = null;
  let currentOrder = null;

  syncPendingOrderLifecycle(state);
  currentOrder = findOrderById(state, orderId);

  if (!currentOrder) {
    return null;
  }

  assertUserOrderStatusTransition(currentOrder.status, nextStatus);

  state.orderRecords = (state.orderRecords || []).map((item, index) => {
    if (item.id !== orderId) {
      return decorateOrder(item, index);
    }

    targetOrder = decorateOrder(
      {
        ...item,
        status: nextStatus,
        statusText: getStatusText(nextStatus)
      },
      index
    );

    return targetOrder;
  });

  state.runtimeOrders = (state.runtimeOrders || []).map((item, index) => {
    if (item.id !== orderId) {
      return decorateOrder(item, index);
    }

    return decorateOrder(
      {
        ...item,
        status: nextStatus,
        statusText: getStatusText(nextStatus)
      },
      index
    );
  });

  if (currentOrder.status === "pending" && nextStatus === "cancelled") {
    restoreUsedCouponForOrder(state, orderId);
  }

  if (currentOrder.status === "shipping" && nextStatus === "done" && targetOrder) {
    syncDistributionAfterOrderDone(state, targetOrder);
  }

  return targetOrder ? cloneData(targetOrder) : null;
}

function createAfterSale(payload) {
  return withState((state) => {
    syncPendingOrderLifecycle(state);

    const order = findOrderById(state, payload.orderId);
    const existing = (state.afterSales || []).find((item) => item.orderId === payload.orderId);

    if (!order) {
      throw new Error("订单不存在");
    }

    if (existing || order.aftersaleStatus) {
      throw new Error("该订单已提交售后");
    }

    if (order.status !== "shipping" && order.status !== "done") {
      throw new Error("当前订单暂不可售后");
    }

    const record = {
      id: `as-${Date.now()}`,
      orderId: payload.orderId,
      reason: payload.reason || "不想要了",
      description: payload.description || "",
      status: "processing",
      statusText: "售后处理中",
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " ")
    };

    state.afterSales = [record].concat(state.afterSales || []);
    state.orderRecords = (state.orderRecords || []).map((item, index) => {
      if (item.id !== payload.orderId) {
        return decorateOrder(item, index);
      }

      return decorateOrder(
        {
          ...item,
          aftersaleStatus: "processing"
        },
        index
      );
    });

    state.runtimeOrders = (state.runtimeOrders || []).map((item, index) => {
      if (item.id !== payload.orderId) {
        return decorateOrder(item, index);
      }

      return decorateOrder(
        {
          ...item,
          aftersaleStatus: "processing"
        },
        index
      );
    });

    return cloneData(record);
  });
}

function getAfterSaleByOrderId(orderId) {
  return cloneData((getState().afterSales || []).find((item) => item.orderId === orderId) || null);
}

function getUser() {
  return cloneData(getState().user);
}

function authorizeUser() {
  return withState((state) => {
    state.user = {
      ...state.user,
      nickname: "微信用户",
      phone: "138****6699",
      isAuthorized: true
    };

    return cloneData(state.user);
  });
}

function getProfileData() {
  return buildProfileData(getState());
}

function getDistributionData() {
  const state = getState();

  return {
    user: cloneData(state.user),
    distributor: cloneData(state.distributor || {})
  };
}

function getTeamData() {
  const state = getState();

  return {
    teamMembers: cloneData(state.teamMembers || []),
    distributor: cloneData(state.distributor || {})
  };
}

function getCommissionData() {
  const state = getState();

  return {
    records: cloneData(state.commissionRecords || []),
    distributor: cloneData(state.distributor || {})
  };
}

function getPosterData() {
  const state = getState();

  return {
    user: cloneData(state.user),
    distributor: cloneData(state.distributor || {}),
    coupon: cloneData((state.coupons || [])[0] || null)
  };
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizePageOptions(options = {}) {
  return {
    page: Math.max(1, Number(options.page || 1)),
    pageSize: Math.min(100, Math.max(1, Number(options.pageSize || 20)))
  };
}

function paginateList(list, options = {}) {
  const { page, pageSize } = normalizePageOptions(options);
  const start = (page - 1) * pageSize;

  return {
    list: list.slice(start, start + pageSize),
    page,
    pageSize,
    total: list.length
  };
}

function getDisplayTextByStatus(status, textMap) {
  return textMap[status] || "未知状态";
}

function getCategoryStatusText(status) {
  return getDisplayTextByStatus(status, {
    enabled: "启用",
    disabled: "禁用"
  });
}

function getGenericStatusText(status) {
  return getDisplayTextByStatus(status, {
    enabled: "启用",
    disabled: "禁用",
    active: "正常",
    pending_review: "待审核",
    frozen: "已冻结"
  });
}

function getPayStatus(order) {
  return order.payStatus || (order.status === "pending_payment" ? "unpaid" : "paid");
}

function getPayStatusText(status) {
  return getDisplayTextByStatus(status, {
    unpaid: "未支付",
    paid: "已支付",
    refunded: "已退款",
    part_refunded: "部分退款"
  });
}

function getAdminOrderStatus(order) {
  const statusMap = {
    pending: "pending_shipment",
    shipping: "shipping",
    done: "done",
    cancelled: "cancelled",
    pending_payment: "pending_payment"
  };

  return statusMap[order.status] || order.status || "pending_shipment";
}

function getAdminAfterSaleStatus(status) {
  return status === "processing" ? "pending_review" : status;
}

function getAdminAfterSaleStatusText(status) {
  return getDisplayTextByStatus(getAdminAfterSaleStatus(status), {
    pending_review: "待审核",
    approved: "已通过",
    rejected: "已驳回",
    done: "已完成"
  });
}

function getCategoryMap() {
  ensureCategorySeeds();

  return categories.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {});
}

function buildAdminCategoryRecord(category) {
  return {
    categoryId: category.id,
    parentId: category.parentId || 0,
    name: category.name,
    sortOrder: category.sortOrder || 0,
    status: category.status || "enabled",
    statusText: getCategoryStatusText(category.status || "enabled"),
    createdAt: category.createdAt || "",
    updatedAt: category.updatedAt || ""
  };
}

function buildAdminProductListItem(product) {
  const categoryMap = getCategoryMap();
  const skuList = getState().productSkus.filter((item) => item.productId === product.id);
  const prices = skuList.length ? skuList.map((item) => Number(item.price || 0)) : [Number(product.price || 0)];
  const totalStock = skuList.reduce((sum, item) => sum + Number(item.stock || 0), 0);

  return {
    productId: product.id,
    title: product.title,
    categoryId: product.categoryId,
    categoryName: (categoryMap[product.categoryId] || {}).name || "",
    coverImage: product.coverImage || "",
    status: product.status || "on_sale",
    statusText: getDisplayTextByStatus(product.status || "on_sale", {
      on_sale: "销售中",
      off_sale: "已下架"
    }),
    priceRangeText: `${formatPrice(Math.min(...prices))} - ${formatPrice(Math.max(...prices))}`,
    totalStock,
    salesCount: Number(product.salesCount || 0),
    distributionEnabled: !!product.distributionEnabled,
    updatedAt: product.updatedAt || ""
  };
}

function buildAdminProductDetail(product) {
  const categoryMap = getCategoryMap();

  return {
    productId: product.id,
    title: product.title,
    subTitle: product.subTitle || product.shortDesc || "",
    categoryId: product.categoryId,
    categoryName: (categoryMap[product.categoryId] || {}).name || "",
    productType: product.productType || deriveProductType(product.categoryId),
    coverImage: product.coverImage || "",
    imageList: cloneData(product.imageList || []),
    detailContent: product.detailContent || "",
    labelTags: cloneData(product.highlights || []),
    status: product.status || "on_sale",
    statusText: getDisplayTextByStatus(product.status || "on_sale", {
      on_sale: "销售中",
      off_sale: "已下架"
    }),
    distributionEnabled: !!product.distributionEnabled,
    commissionType: "ratio",
    commissionFirstValue: 800,
    commissionSecondValue: 300,
    salesCount: Number(product.salesCount || 0),
    favoriteCount: Number(product.favoriteCount || 0),
    createdAt: product.createdAt || "",
    updatedAt: product.updatedAt || ""
  };
}

function buildAdminSkuRecord(sku) {
  return {
    skuId: sku.id,
    skuCode: sku.skuCode,
    specText: sku.specText,
    priceCent: Math.round(Number(sku.price || 0) * 100),
    priceText: formatPrice(sku.price),
    originPriceCent: Math.round(Number(sku.originPrice || 0) * 100),
    originPriceText: formatPrice(sku.originPrice),
    stock: Number(sku.stock || 0),
    lockStock: Number(sku.lockStock || 0),
    status: sku.status || "enabled",
    statusText: getGenericStatusText(sku.status || "enabled")
  };
}

function getAdminDashboardSummary() {
  const state = getState();
  const today = formatDateTime().slice(0, 10);
  const todayOrders = (state.orderRecords || []).filter((item) => String(item.createTime || "").startsWith(today));
  const paidOrders = todayOrders.filter((item) => item.status !== "cancelled");

  return {
    todayOrderCount: todayOrders.length,
    todayPaidAmountCent: paidOrders.reduce((sum, item) => sum + Math.round(Number(item.amount || 0) * 100), 0),
    todayPaidAmountText: formatPrice(paidOrders.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
    newUserCount: (state.userRecords || []).filter((item) => String(item.createdAt || "").startsWith(today)).length,
    newDistributorCount: (state.distributorProfiles || []).filter((item) => String(item.joinedAt || "").startsWith(today)).length,
    pendingShipmentCount: (state.orderRecords || []).filter((item) => item.status === "pending").length
  };
}

function getAdminCategories(options = {}) {
  ensureCategorySeeds();

  const list = categories
    .slice()
    .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
    .map((item) => buildAdminCategoryRecord(item));

  return paginateList(list, options);
}

function saveAdminCategory(payload = {}) {
  ensureCategorySeeds();

  const categoryId = payload.categoryId || payload.id;
  const now = formatDateTime();

  if (categoryId) {
    const current = categories.find((item) => item.id === categoryId);

    if (!current) {
      return null;
    }

    Object.assign(current, {
      parentId: typeof payload.parentId === "undefined" ? current.parentId : Number(payload.parentId || 0),
      name: payload.name || current.name,
      sortOrder: typeof payload.sortOrder === "undefined" ? current.sortOrder : Number(payload.sortOrder || 0),
      status: payload.status || current.status || "enabled",
      updatedAt: now
    });

    return buildAdminCategoryRecord(current);
  }

  const nextRecord = {
    id: payload.id || generateId("cat"),
    parentId: Number(payload.parentId || 0),
    name: payload.name || "新分类",
    sortOrder: Number(payload.sortOrder || categories.length * 10 + 10),
    status: payload.status || "enabled",
    createdAt: now,
    updatedAt: now
  };

  categories.push(nextRecord);

  return buildAdminCategoryRecord(nextRecord);
}

function deleteAdminCategory(categoryId) {
  const index = categories.findIndex((item) => item.id === categoryId);

  if (index === -1) {
    return null;
  }

  const removed = categories.splice(index, 1)[0];

  return buildAdminCategoryRecord(removed);
}

function getAdminProducts(options = {}) {
  ensureProductSeeds();

  const keyword = String(options.keyword || "").trim().toLowerCase();
  const status = String(options.status || "").trim();
  const categoryId = String(options.categoryId || "").trim();
  const list = products
    .filter((item) => {
      if (keyword && !item.title.toLowerCase().includes(keyword) && !item.shortDesc.toLowerCase().includes(keyword)) {
        return false;
      }

      if (status && item.status !== status) {
        return false;
      }

      if (categoryId && item.categoryId !== categoryId) {
        return false;
      }

      return true;
    })
    .map((item) => buildAdminProductListItem(item));

  return paginateList(list, options);
}

function getAdminProductDetail(productId) {
  ensureProductSeeds();

  const product = products.find((item) => item.id === productId);

  return product ? buildAdminProductDetail(product) : null;
}

function saveAdminProduct(payload = {}) {
  ensureProductSeeds();

  const productId = payload.productId || payload.id;
  const now = formatDateTime();
  const specList = Array.isArray(payload.specs) && payload.specs.length ? payload.specs : null;
  const basePatch = {
    categoryId: payload.categoryId,
    title: payload.title,
    shortDesc: payload.shortDesc || payload.subTitle,
    subTitle: payload.subTitle || payload.shortDesc,
    productType: payload.productType,
    coverImage: payload.coverImage,
    imageList: Array.isArray(payload.imageList) ? payload.imageList : undefined,
    detailContent: payload.detailContent,
    price: typeof payload.price === "undefined" ? undefined : Number(payload.price || 0),
    marketPrice: typeof payload.marketPrice === "undefined" ? undefined : Number(payload.marketPrice || payload.price || 0),
    tag: payload.tag,
    coverLabel: payload.coverLabel,
    accent: payload.accent,
    specs: specList || undefined,
    highlights: Array.isArray(payload.highlights)
      ? payload.highlights
      : Array.isArray(payload.labelTags)
        ? payload.labelTags
        : undefined,
    status: payload.status,
    distributionEnabled: typeof payload.distributionEnabled === "undefined" ? undefined : !!payload.distributionEnabled
  };

  if (productId) {
    const current = products.find((item) => item.id === productId);

    if (!current) {
      return null;
    }

    Object.keys(basePatch).forEach((key) => {
      if (typeof basePatch[key] !== "undefined") {
        current[key] = basePatch[key];
      }
    });

    current.updatedAt = now;
    current.salesText = current.salesText || `月销 ${current.salesCount || 0}`;
    ensureProductSeeds();

    if (specList) {
      withState((state) => {
        syncProductSkusForSpecs(state, current);
        return null;
      });
    }

    return buildAdminProductDetail(current);
  }

  const nextProduct = {
    id: generateId("p"),
    categoryId: payload.categoryId || "gift",
    title: payload.title || "新建商品",
    shortDesc: payload.shortDesc || payload.subTitle || "待补充商品描述",
    subTitle: payload.subTitle || payload.shortDesc || "待补充商品描述",
    productType: payload.productType || deriveProductType(payload.categoryId || "gift"),
    coverImage: payload.coverImage || "",
    imageList: Array.isArray(payload.imageList) ? payload.imageList : payload.coverImage ? [payload.coverImage] : undefined,
    detailContent: payload.detailContent || "",
    price: Number(payload.price || 0),
    marketPrice: Number(payload.marketPrice || payload.price || 0),
    tag: payload.tag || "新品",
    coverLabel: payload.coverLabel || "商品",
    accent: payload.accent || "#F6D4C8",
    salesText: "月销 0",
    specs: specList || ["默认规格"],
    highlights: Array.isArray(payload.highlights)
      ? payload.highlights
      : Array.isArray(payload.labelTags)
        ? payload.labelTags
        : ["支持后续补充卖点"],
    status: payload.status || "off_sale",
    distributionEnabled: typeof payload.distributionEnabled === "undefined" ? true : !!payload.distributionEnabled,
    createdAt: now,
    updatedAt: now
  };

  products.unshift(nextProduct);
  ensureProductSeeds();

  withState((state) => {
    syncProductSkusForSpecs(state, nextProduct);
    return null;
  });

  return buildAdminProductDetail(nextProduct);
}

function updateAdminProductStatus(productId, status) {
  const current = products.find((item) => item.id === productId);

  if (!current) {
    return null;
  }

  current.status = status || current.status;
  current.updatedAt = formatDateTime();

  return buildAdminProductListItem(current);
}

function getAdminSkus(productId) {
  const state = getState();

  return {
    productId,
    list: (state.productSkus || [])
      .filter((item) => item.productId === productId)
      .map((item) => buildAdminSkuRecord(item))
  };
}

function saveAdminSkus(productId, payload = {}) {
  return withState((state) => {
    const skuList = Array.isArray(payload.skus) ? payload.skus : [];
    const currentProduct = products.find((item) => item.id === productId);

    if (!currentProduct) {
      return null;
    }

    const nextSkuList = skuList.length
      ? skuList.map((item, index) => {
          return {
            id: item.skuId || item.id || generateId("sku"),
            productId,
            skuCode: item.skuCode || `${String(productId).toUpperCase()}-${index + 1}`,
            specText: item.specText || `规格${index + 1}`,
            price: Number(item.price || item.priceCent / 100 || currentProduct.price || 0),
            originPrice: Number(item.originPrice || item.originPriceCent / 100 || currentProduct.marketPrice || currentProduct.price || 0),
            stock: Number(item.stock || 0),
            lockStock: Number(item.lockStock || 0),
            status: item.status || "enabled"
          };
        })
      : buildSeedProductSkus().filter((item) => item.productId === productId);

    state.productSkus = (state.productSkus || []).filter((item) => item.productId !== productId).concat(nextSkuList);
    currentProduct.specs = nextSkuList.map((item) => item.specText);
    currentProduct.price = nextSkuList.length ? Math.min(...nextSkuList.map((item) => Number(item.price || 0))) : currentProduct.price;
    currentProduct.marketPrice = nextSkuList.length
      ? Math.max(...nextSkuList.map((item) => Number(item.originPrice || item.price || 0)))
      : currentProduct.marketPrice;
    currentProduct.updatedAt = formatDateTime();

    return {
      productId,
      list: nextSkuList.map((item) => buildAdminSkuRecord(item))
    };
  });
}

function updateAdminSkuStock(skuId, stock) {
  return withState((state) => {
    let target = null;

    state.productSkus = (state.productSkus || []).map((item) => {
      if (item.id !== skuId) {
        return item;
      }

      target = {
        ...item,
        stock: Number(stock || 0)
      };

      return target;
    });

    return target ? buildAdminSkuRecord(target) : null;
  });
}

function buildAdminOrderListItem(order) {
  const payStatus = getPayStatus(order);
  const orderStatus = getAdminOrderStatus(order);

  return {
    orderId: order.id,
    orderNo: order.id,
    userId: "user-1",
    buyerName: (order.address || {}).receiver || "匿名用户",
    orderStatus,
    orderStatusText: order.statusText || getStatusText(order.status),
    payStatus,
    payStatusText: getPayStatusText(payStatus),
    payableAmountCent: Math.round(Number(order.amount || 0) * 100),
    payableAmountText: formatPrice(order.amount),
    itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    sourceScene: order.sourceScene || "direct",
    createdAt: order.createTime || "",
    paidAt: order.paidAt || order.createTime || ""
  };
}

function buildAdminOrderDetail(order, shipmentRecord) {
  const payStatus = getPayStatus(order);
  const orderStatus = getAdminOrderStatus(order);

  return {
    orderId: order.id,
    orderNo: order.id,
    orderStatus,
    orderStatusText: order.statusText || getStatusText(order.status),
    payStatus,
    payStatusText: getPayStatusText(payStatus),
    goodsAmountCent: Math.round(Number(order.goodsAmount || order.amount || 0) * 100),
    goodsAmountText: formatPrice(order.goodsAmount || order.amount || 0),
    discountAmountCent: Math.round(Number(order.discountAmount || 0) * 100),
    discountAmountText: formatPrice(order.discountAmount || 0),
    freightAmountCent: 0,
    freightAmountText: "0.00",
    payableAmountCent: Math.round(Number(order.amount || 0) * 100),
    payableAmountText: formatPrice(order.amount || 0),
    remark: order.remark || "",
    receiverName: (order.address || {}).receiver || "",
    receiverMobile: (order.address || {}).phone || "",
    receiverAddress: (order.address || {}).detail || "",
    items: (order.items || []).map((item, index) => {
      const quantity = Math.max(1, Number(item.quantity || 1));
      const lineAmount = Number(item.subtotalAmount || item.subtotal || order.amount || 0);
      const salePrice = quantity > 0 ? lineAmount / quantity : lineAmount;

      return {
        orderItemId: `${order.id}-${index + 1}`,
        productId: item.id || "",
        productTitle: item.title,
        skuId: item.skuId || "",
        specText: item.specText,
        quantity,
        salePriceCent: Math.round(salePrice * 100),
        salePriceText: formatPrice(salePrice)
      };
    }),
    shipment: shipmentRecord ? cloneData(shipmentRecord) : null,
    createdAt: order.createTime || "",
    paidAt: order.paidAt || order.createTime || "",
    shippedAt: shipmentRecord ? shipmentRecord.shippedAt : null
  };
}

function getAdminOrders(options = {}) {
  const orderNo = String(options.orderNo || "").trim().toLowerCase();
  const status = String(options.status || "").trim();
  const payStatus = String(options.payStatus || "").trim();
  const list = (getState().orderRecords || [])
    .filter((item) => {
      if (orderNo && !String(item.id || "").toLowerCase().includes(orderNo)) {
        return false;
      }

      if (status && getAdminOrderStatus(item) !== status) {
        return false;
      }

      if (payStatus && getPayStatus(item) !== payStatus) {
        return false;
      }

      return true;
    })
    .map((item) => buildAdminOrderListItem(item));

  return paginateList(list, options);
}

function getAdminOrderDetail(orderId) {
  const state = getState();
  const order = (state.orderRecords || []).find((item) => item.id === orderId);
  const shipmentRecord = (state.shipmentRecords || []).find((item) => item.orderId === orderId) || null;

  return order ? buildAdminOrderDetail(order, shipmentRecord) : null;
}

function shipAdminOrder(orderId, payload = {}) {
  return withState((state) => {
    const shippedAt = formatDateTime();
    const nextOrder = updateOrderCollectionsStatus(state, orderId, "shipping");

    if (!nextOrder) {
      return null;
    }

    const shipmentRecord = {
      id: generateId("ship"),
      orderId,
      companyCode: payload.companyCode || "",
      companyName: payload.companyName || "",
      trackingNo: payload.trackingNo || "",
      shippedAt,
      createdAt: shippedAt,
      updatedAt: shippedAt
    };

    state.shipmentRecords = (state.shipmentRecords || []).filter((item) => item.orderId !== orderId).concat(shipmentRecord);

    return {
      order: nextOrder,
      shipment: cloneData(shipmentRecord)
    };
  });
}

function getPendingShipmentOrders(options = {}) {
  const list = (getState().orderRecords || [])
    .filter((item) => item.status === "pending")
    .map((item) => {
      return {
        orderId: item.id,
        orderNo: item.id,
        buyerName: (item.address || {}).receiver || "匿名用户",
        receiverName: (item.address || {}).receiver || "",
        receiverMobile: (item.address || {}).phone || "",
        receiverAddress: (item.address || {}).detail || "",
        payableAmountCent: Math.round(Number(item.amount || 0) * 100),
        payableAmountText: formatPrice(item.amount || 0),
        createdAt: item.createTime || "",
        paidAt: item.paidAt || item.createTime || ""
      };
    });

  return paginateList(list, options);
}

function getAdminAfterSales(options = {}) {
  const state = getState();
  const keyword = String(options.keyword || options.orderNo || "").trim().toLowerCase();
  const statusFilter = String(options.status || "").trim();
  const list = (state.afterSales || [])
    .map((item) => {
      const order = (state.orderRecords || []).find((orderItem) => orderItem.id === item.orderId) || null;
      const afterSaleStatus = getAdminAfterSaleStatus(item.status);

      return {
        afterSaleId: item.id,
        orderId: item.orderId,
        orderNo: item.orderId,
        userId: "user-1",
        buyerName: order && order.address ? order.address.receiver : "匿名用户",
        reason: item.reason,
        description: item.description || "",
        status: afterSaleStatus,
        statusText: getAdminAfterSaleStatusText(item.status),
        reviewRemark: item.reviewRemark || "",
        reviewedAt: item.reviewedAt || "",
        createdAt: item.createdAt || ""
      };
    })
    .filter((item) => {
      if (keyword) {
        const buyerName = String(item.buyerName || "").toLowerCase();
        const orderNo = String(item.orderNo || "").toLowerCase();

        if (!buyerName.includes(keyword) && !orderNo.includes(keyword)) {
          return false;
        }
      }

      if (statusFilter && item.status !== statusFilter) {
        return false;
      }

      return true;
    });

  return paginateList(list, options);
}

function reviewAdminAfterSale(afterSaleId, action, remark = "") {
  return withState((state) => {
    let target = null;
    let orderId = "";
    const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "processing";
    const reviewedAt = formatDateTime();

    state.afterSales = (state.afterSales || []).map((item) => {
      if (item.id !== afterSaleId) {
        return item;
      }

      orderId = item.orderId;
      target = {
        ...item,
        status: nextStatus,
        statusText: getAftersaleStatusText(nextStatus),
        reviewRemark: remark,
        reviewedAt
      };

      return target;
    });

    if (!target) {
      return null;
    }

    state.orderRecords = (state.orderRecords || []).map((item, index) => {
      if (item.id !== orderId) {
        return decorateOrder(item, index);
      }

      return decorateOrder(
        {
          ...item,
          aftersaleStatus: nextStatus
        },
        index
      );
    });

    state.runtimeOrders = (state.runtimeOrders || []).map((item, index) => {
      if (item.id !== orderId) {
        return decorateOrder(item, index);
      }

      return decorateOrder(
        {
          ...item,
          aftersaleStatus: nextStatus
        },
        index
      );
    });

    return cloneData(target);
  });
}

function buildAdminCouponTemplateRecord(template) {
  return {
    templateId: template.id,
    title: template.title,
    couponType: "minus",
    amountCent: Math.round(Number(template.amount || 0) * 100),
    amountText: formatPrice(template.amount || 0),
    thresholdAmountCent: Math.round(Number(template.threshold || 0) * 100),
    thresholdAmountText: formatPrice(template.threshold || 0),
    issueType: template.issueType || "center_claim",
    status: template.status || "enabled",
    statusText: getGenericStatusText(template.status || "enabled"),
    validDays: Number(template.validDays || 0),
    receivedCount: Number(template.receivedCount || 0),
    usedCount: Number(template.usedCount || 0),
    updatedAt: template.updatedAt || ""
  };
}

function getAdminCouponTemplates(options = {}) {
  return paginateList(
    (getState().couponCenterTemplates || []).map((item) => buildAdminCouponTemplateRecord(item)),
    options
  );
}

function saveAdminCouponTemplate(payload = {}) {
  return withState((state) => {
    const templateId = payload.templateId || payload.id;
    const now = formatDateTime();

    if (templateId) {
      const current = (state.couponCenterTemplates || []).find((item) => item.id === templateId);

      if (!current) {
        return null;
      }

      Object.assign(current, {
        title: payload.title || current.title,
        amount: typeof payload.amount === "undefined" ? current.amount : Number(payload.amount || payload.amountCent / 100 || 0),
        threshold: typeof payload.threshold === "undefined" ? current.threshold : Number(payload.threshold || payload.thresholdAmountCent / 100 || 0),
        issueType: payload.issueType || current.issueType || "center_claim",
        status: payload.status || current.status || "enabled",
        validDays: typeof payload.validDays === "undefined" ? current.validDays : Number(payload.validDays || 0),
        updatedAt: now
      });

      return buildAdminCouponTemplateRecord(current);
    }

    const nextTemplate = {
      id: generateId("tpl"),
      title: payload.title || "新建优惠券",
      amount: Number(payload.amount || payload.amountCent / 100 || 0),
      threshold: Number(payload.threshold || payload.thresholdAmountCent / 100 || 0),
      badge: payload.badge || "活动",
      desc: payload.desc || "后台新建优惠券模板",
      expiryText: payload.expiryText || "领取后 7 天有效",
      claimed: false,
      status: payload.status || "enabled",
      issueType: payload.issueType || "center_claim",
      validDays: Number(payload.validDays || 7),
      receivedCount: 0,
      usedCount: 0,
      createdAt: now,
      updatedAt: now
    };

    state.couponCenterTemplates = [nextTemplate].concat(state.couponCenterTemplates || []);

    return buildAdminCouponTemplateRecord(nextTemplate);
  });
}

function updateAdminCouponTemplateStatus(templateId, status) {
  return withState((state) => {
    const current = (state.couponCenterTemplates || []).find((item) => item.id === templateId);

    if (!current) {
      return null;
    }

    current.status = status || current.status;
    current.updatedAt = formatDateTime();

    return buildAdminCouponTemplateRecord(current);
  });
}

function getAdminDistributionRules() {
  return cloneData(getState().distributionRules || {});
}

function updateAdminDistributionRules(payload = {}, actor = {}) {
  return withState((state) => {
    state.distributionRules = {
      ...state.distributionRules,
      enabled: typeof payload.enabled === "undefined" ? state.distributionRules.enabled : !!payload.enabled,
      levelOneRate: typeof payload.levelOneRate === "undefined" ? state.distributionRules.levelOneRate : Number(payload.levelOneRate || 0),
      levelTwoRate: typeof payload.levelTwoRate === "undefined" ? state.distributionRules.levelTwoRate : Number(payload.levelTwoRate || 0),
      bindDays: typeof payload.bindDays === "undefined" ? state.distributionRules.bindDays : Number(payload.bindDays || 0),
      ruleDesc: payload.ruleDesc || state.distributionRules.ruleDesc,
      updatedAt: formatDateTime(),
      updatedBy: {
        adminUserId: actor.adminUserId || "admin-1",
        realName: actor.realName || "系统管理员"
      }
    };

    return cloneData(state.distributionRules);
  });
}

function buildAdminDistributorRecord(profile) {
  return {
    distributorId: profile.id,
    userId: profile.userId,
    nickname: profile.nickname,
    mobile: profile.mobile,
    level: profile.level,
    status: profile.status,
    statusText: getGenericStatusText(profile.status),
    teamCount: Number(profile.teamCount || 0),
    totalCommissionCent: Number(profile.totalCommissionCent || 0),
    totalCommissionText: formatPrice(Number(profile.totalCommissionCent || 0) / 100),
    pendingCommissionCent: Number(profile.pendingCommissionCent || 0),
    pendingCommissionText: formatPrice(Number(profile.pendingCommissionCent || 0) / 100),
    joinedAt: profile.joinedAt || ""
  };
}

function getAdminDistributors(options = {}) {
  const keyword = String(options.keyword || "").trim().toLowerCase();
  const status = String(options.status || "").trim();
  const list = (getState().distributorProfiles || [])
    .filter((item) => {
      if (keyword && !String(item.nickname || "").toLowerCase().includes(keyword) && !String(item.mobile || "").includes(keyword)) {
        return false;
      }

      if (status && item.status !== status) {
        return false;
      }

      return true;
    })
    .map((item) => buildAdminDistributorRecord(item));

  return paginateList(list, options);
}

function getAdminDistributorDetail(distributorId) {
  const state = getState();
  const profile = (state.distributorProfiles || []).find((item) => item.id === distributorId);

  if (!profile) {
    return null;
  }

  return {
    ...buildAdminDistributorRecord(profile),
    recentCommissionRecords: (state.commissionRecords || []).slice(0, 5).map((item) => {
      return {
        commissionId: item.id,
        title: item.title,
        fromUser: item.fromUser,
        orderNo: item.orderNo,
        amountCent: Math.round(Number(item.amount || 0) * 100),
        amountText: formatPrice(item.amount || 0),
        status: item.status,
        statusText: item.statusText,
        createdAt: item.createdAt
      };
    })
  };
}

function updateAdminDistributorStatus(distributorId, status) {
  return withState((state) => {
    const current = (state.distributorProfiles || []).find((item) => item.id === distributorId);

    if (!current) {
      return null;
    }

    current.status = status || current.status;

    return buildAdminDistributorRecord(current);
  });
}

module.exports = {
  bootstrap,
  cloneData,
  formatPrice,
  decorateProduct,
  decorateProducts,
  getProductById,
  getProductsByKeyword,
  searchProducts,
  getProductDetail,
  getHomeData,
  getCategories,
  getProductsByCategory,
  buildCartView,
  buildCartSummary,
  getCouponDiscount,
  buildCheckoutSummary,
  buildRuntimeOrder,
  decorateOrder,
  mergeOrders,
  getAddresses,
  getAddressById,
  getAddressListData,
  getSelectedAddress,
  setSelectedAddress,
  saveAddress,
  deleteAddress,
  getCartPageData,
  setCartItems,
  addToCart,
  increaseCartItem,
  decreaseCartItem,
  removeCartItem,
  getCartCount,
  getCouponPageData,
  getSelectedCoupon,
  getAvailableCoupons,
  claimCoupon,
  selectCoupon,
  clearSelectedCoupon,
  getCheckoutPageData,
  createOrder,
  submitOrder,
  getAllOrders,
  getOrderById,
  getOrderDetailData,
  updateOrderStatus,
  createAfterSale,
  getAfterSaleByOrderId,
  getUser,
  authorizeUser,
  getProfileData,
  getDistributionData,
  getTeamData,
  getCommissionData,
  getPosterData,
  getAdminDashboardSummary,
  getAdminCategories,
  saveAdminCategory,
  deleteAdminCategory,
  getAdminProducts,
  getAdminProductDetail,
  saveAdminProduct,
  updateAdminProductStatus,
  getAdminSkus,
  saveAdminSkus,
  updateAdminSkuStock,
  getAdminOrders,
  getAdminOrderDetail,
  shipAdminOrder,
  getPendingShipmentOrders,
  getAdminAfterSales,
  reviewAdminAfterSale,
  getAdminCouponTemplates,
  saveAdminCouponTemplate,
  updateAdminCouponTemplateStatus,
  getAdminDistributionRules,
  updateAdminDistributionRules,
  getAdminDistributors,
  getAdminDistributorDetail,
  updateAdminDistributorStatus
};
