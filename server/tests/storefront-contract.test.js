const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontError } = require("../src/modules/storefront/errors");
const { createStorefrontMemoryRepository } = require("../src/repositories/storefront/memory");
const { createStorefrontPrismaMapperModule } = require("../src/repositories/storefront/prisma-mappers");
const { createStorefrontPrismaRepository } = require("../src/repositories/storefront/prisma");

const ACCENT_PALETTE = [
  "#F6D4C8",
  "#D7E7DE",
  "#E8DFC8",
  "#D8E0F0",
  "#F2D2DB",
  "#CFE2EA"
];

function createContractFixtureData() {
  const user = {
    id: "user-1",
    openId: "demo-openid",
    nickname: "微信用户",
    mobile: "未授权手机号",
    isAuthorized: false,
    status: "active"
  };
  const categories = [
    {
      id: "cat-1",
      name: "坚果",
      status: "enabled",
      sortOrder: 1,
      createdAt: new Date("2026-03-01T10:00:00+08:00")
    },
    {
      id: "cat-2",
      name: "茶饮",
      status: "enabled",
      sortOrder: 2,
      createdAt: new Date("2026-03-02T10:00:00+08:00")
    }
  ];
  const products = [
    {
      id: "prod-1",
      categoryId: "cat-1",
      title: "坚果礼盒",
      shortDesc: "每日坚果",
      subTitle: "轻烘焙",
      price: 129,
      marketPrice: 159,
      salesCount: 20,
      favoriteCount: 8,
      detailContent: "<p>坚果礼盒详情</p>",
      coverImage: "https://example.com/p1.jpg",
      distributionEnabled: true,
      status: "on_sale",
      sortOrder: 1,
      createdAt: new Date("2026-03-03T10:00:00+08:00"),
      skus: [
        {
          id: "sku-1",
          specText: "标准装",
          status: "enabled",
          createdAt: new Date("2026-03-03T10:00:00+08:00")
        }
      ]
    },
    {
      id: "prod-2",
      categoryId: "cat-2",
      title: "乌龙茶",
      shortDesc: "清香回甘",
      subTitle: "高山茶",
      price: 88,
      marketPrice: 99,
      salesCount: 10,
      favoriteCount: 5,
      detailContent: "<p>乌龙茶详情</p>",
      coverImage: "https://example.com/p2.jpg",
      distributionEnabled: true,
      status: "on_sale",
      sortOrder: 2,
      createdAt: new Date("2026-03-04T10:00:00+08:00"),
      skus: [
        {
          id: "sku-2",
          specText: "礼袋装",
          status: "enabled",
          createdAt: new Date("2026-03-04T10:00:00+08:00")
        }
      ]
    }
  ];
  const addresses = [
    {
      id: "addr-1",
      userId: user.id,
      receiver: "张三",
      phone: "13800000000",
      province: "上海市",
      city: "上海市",
      district: "浦东新区",
      detail: "世纪大道 100 号",
      tag: "家",
      isDefault: true,
      updatedAt: new Date("2026-03-10T10:00:00+08:00")
    }
  ];
  const carts = [
    {
      id: "cart-1",
      userId: user.id,
      selectedCouponId: null
    }
  ];
  const cartItems = [
    {
      id: "cart-item-1",
      cartId: "cart-1",
      productId: "prod-1",
      title: "坚果礼盒",
      specText: "标准装",
      price: 129,
      quantity: 1,
      updatedAt: new Date("2026-03-11T10:00:00+08:00")
    }
  ];
  const couponTemplates = [
    {
      id: "tpl-1",
      code: "new_user_20",
      title: "新人立减 20",
      amount: 20,
      threshold: 99,
      badge: "新人",
      description: "首单满 99 可用",
      issueType: "center_claim",
      validDays: 7,
      status: "enabled",
      createdAt: new Date("2026-03-20T10:00:00+08:00"),
      updatedAt: new Date("2026-03-28T09:00:00+08:00")
    },
    {
      id: "tpl-2",
      code: "order_199_minus_30",
      title: "满 199 减 30",
      amount: 30,
      threshold: 199,
      badge: "满减",
      description: "基础转化券",
      issueType: "manual_issue",
      validDays: 15,
      status: "enabled",
      createdAt: new Date("2026-03-21T10:00:00+08:00"),
      updatedAt: new Date("2026-03-28T09:10:00+08:00")
    },
    {
      id: "tpl-3",
      code: "distribution_15",
      title: "分销专享券",
      amount: 15,
      threshold: 129,
      badge: "分销",
      description: "分享成交场景可用",
      issueType: "center_claim",
      validDays: 10,
      status: "enabled",
      createdAt: new Date("2026-03-22T10:00:00+08:00"),
      updatedAt: new Date("2026-03-28T09:15:00+08:00")
    }
  ];
  const userCoupons = [
    {
      id: "coupon-1",
      userId: user.id,
      templateId: "tpl-1",
      status: "available",
      sourceType: "system_grant",
      sourceText: "新客礼包",
      claimedAt: new Date("2026-03-24T10:00:00+08:00"),
      expiresAt: new Date("2026-04-30T23:59:59+08:00"),
      usedAt: null,
      usedOrderId: null
    },
    {
      id: "coupon-2",
      userId: user.id,
      templateId: "tpl-2",
      status: "available",
      sourceType: "manual_issue",
      sourceText: "运营发放",
      claimedAt: new Date("2026-03-25T10:00:00+08:00"),
      expiresAt: new Date("2026-05-15T23:59:59+08:00"),
      usedAt: null,
      usedOrderId: null
    }
  ];
  const orders = [
    {
      id: "order-shipping-1",
      orderNo: "NO20260330001",
      userId: user.id,
      addressId: "addr-1",
      referralBindingId: null,
      inviterUserId: null,
      status: "shipping",
      sourceScene: "direct",
      goodsAmount: 88,
      discountAmount: 0,
      payableAmount: 88,
      commissionBaseAmount: 0,
      commissionRate: 0,
      commissionAmount: 0,
      couponTitle: "",
      remark: "历史订单",
      createdAt: new Date("2026-03-30T10:00:00+08:00")
    }
  ];
  const orderItems = [
    {
      id: "order-item-1",
      orderId: "order-shipping-1",
      productId: "prod-2",
      skuId: "sku-2",
      title: "乌龙茶",
      specText: "礼袋装",
      price: 88,
      quantity: 1,
      subtotalAmount: 88,
      createdAt: new Date("2026-03-30T10:00:00+08:00")
    }
  ];
  const distributorProfile = {
    id: "dist-1",
    userId: user.id,
    level: "普通分销员",
    status: "active",
    totalCommission: 0,
    pendingCommission: 0,
    settledCommission: 0,
    teamCount: 1,
    todayInviteCount: 0,
    joinedAt: new Date("2026-03-30T09:00:00+08:00"),
    createdAt: new Date("2026-03-30T09:00:00+08:00"),
    updatedAt: new Date("2026-03-30T09:00:00+08:00")
  };
  const teamMembers = [
    {
      id: "team-1",
      distributorId: "dist-1",
      nickname: "小李",
      avatarLabel: "小",
      joinedAt: new Date("2026-03-20T10:00:00+08:00"),
      contributedAmount: 88
    }
  ];

  return {
    addresses,
    afterSales: [],
    cartItems,
    carts,
    categories,
    commissionRecords: [],
    couponTemplates,
    distributorProfile,
    orderItems,
    orders,
    products,
    referralBindings: [],
    teamMembers,
    userCoupons,
    user
  };
}

function createContractMapperHelpers() {
  return createStorefrontPrismaMapperModule({
    accentPalette: ACCENT_PALETTE,
    createStorefrontError
  }).helpers;
}

function cloneProduct(product) {
  return {
    ...product,
    skus: (product.skus || []).map((sku) => ({
      ...sku
    }))
  };
}

function filterContractProducts(products, keyword = "", categoryId = "") {
  return (products || []).filter((product) => {
    if (product.status !== "on_sale") {
      return false;
    }

    if (categoryId && categoryId !== "all" && product.categoryId !== categoryId) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [product.title, product.shortDesc, product.subTitle]
      .some((field) => String(field || "").includes(keyword));
  });
}

function buildPublicOrderNo(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    "NO",
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    String(date.getMilliseconds()).padStart(3, "0")
  ].join("");
}

function createContractMemorySource(fixtures, helpers) {
  const state = {
    addresses: fixtures.addresses.map((item) => ({
      ...item
    })),
    afterSales: fixtures.afterSales.map((item) => ({
      ...item
    })),
    cart: {
      ...fixtures.carts[0]
    },
    cartItems: fixtures.cartItems.map((item) => ({
      ...item
    })),
    categories: fixtures.categories.map((item) => ({
      ...item
    })),
    commissionRecords: fixtures.commissionRecords.map((item) => ({
      ...item
    })),
    couponTemplates: fixtures.couponTemplates.map((item) => ({
      ...item
    })),
    distributorProfile: {
      ...fixtures.distributorProfile
    },
    orderItems: fixtures.orderItems.map((item) => ({
      ...item
    })),
    orders: fixtures.orders.map((item) => ({
      ...item
    })),
    products: fixtures.products.map((item) => cloneProduct(item)),
    teamMembers: fixtures.teamMembers.map((item) => ({
      ...item
    })),
    user: {
      ...fixtures.user
    },
    userCoupons: fixtures.userCoupons.map((item) => ({
      ...item
    }))
  };
  let orderCounter = state.orders.length + 1;
  let orderItemCounter = state.orderItems.length + 1;
  let afterSaleCounter = state.afterSales.length + 1;

  function getTemplateById(templateId) {
    return state.couponTemplates.find((item) => item.id === templateId) || null;
  }

  function mapCouponRecord(coupon) {
    return helpers.mapUserCoupon({
      ...coupon,
      template: getTemplateById(coupon.templateId)
    });
  }

  function getSortedCouponRecords() {
    return state.userCoupons
      .slice()
      .sort((left, right) => new Date(right.claimedAt).getTime() - new Date(left.claimedAt).getTime());
  }

  function getSelectedCoupon() {
    const selectedCouponId = state.cart.selectedCouponId;

    if (!selectedCouponId) {
      return null;
    }

    const coupon = state.userCoupons.find((item) => item.id === selectedCouponId);

    return coupon && coupon.status === "available" ? coupon : null;
  }

  function getSelectedAddress() {
    return state.addresses.find((item) => item.isDefault) || state.addresses[0] || null;
  }

  function buildCenterTemplates() {
    return state.couponTemplates
      .filter((item) => item.status === "enabled")
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
      .map((template) => helpers.mapCouponTemplate(template, {
        claimed: state.userCoupons.some((item) => item.userId === state.user.id
          && item.templateId === template.id
          && item.sourceType === "center_claim"),
        receivedCount: state.userCoupons.filter((item) => item.templateId === template.id).length,
        usedCount: state.userCoupons.filter((item) => item.templateId === template.id && item.status === "used").length
      }));
  }

  function mapDistributor(profile = state.distributorProfile) {
    return {
      level: profile.level || "普通分销员",
      totalCommission: helpers.toNumber(profile.totalCommission),
      pendingCommission: helpers.toNumber(profile.pendingCommission),
      settledCommission: helpers.toNumber(profile.settledCommission),
      teamCount: Number(profile.teamCount || 0),
      todayInviteCount: Number(profile.todayInviteCount || 0)
    };
  }

  function mapTeamMember(member = {}) {
    return {
      id: member.id,
      nickname: member.nickname || "",
      avatarLabel: member.avatarLabel || "成",
      joinedAt: helpers.formatDate(member.joinedAt),
      contributedAmount: helpers.toNumber(member.contributedAmount)
    };
  }

  function mapCommissionRecord(record = {}) {
    return {
      id: record.id,
      title: record.title || "",
      fromUser: record.fromUser || "",
      orderNo: record.orderNo || "",
      amount: helpers.toNumber(record.amount),
      levelText: record.levelText || "",
      status: record.status || "pending",
      statusText: record.status === "settled" ? "已结算" : "待结算",
      createdAt: helpers.formatDateTime(record.createdAt)
    };
  }

  function getOrderItems(orderId) {
    return state.orderItems
      .filter((item) => item.orderId === orderId)
      .slice()
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }

  function getHydratedOrder(order) {
    if (!order) {
      return null;
    }

    return {
      ...order,
      address: state.addresses.find((item) => item.id === order.addressId) || null,
      afterSale: state.afterSales.find((item) => item.orderId === order.id) || null,
      items: getOrderItems(order.id)
    };
  }

  return {
    bootstrap() {
      return null;
    },
    getUser() {
      return helpers.mapUser(state.user);
    },
    getCategories() {
      return helpers.buildCategoryRows(state.categories.filter((item) => item.status === "enabled"));
    },
    searchProducts(keyword) {
      const normalizedKeyword = String(keyword || "").trim();

      if (!normalizedKeyword) {
        return [];
      }

      return filterContractProducts(state.products, normalizedKeyword)
        .map((item) => helpers.mapProduct(cloneProduct(item)));
    },
    getProductsByCategory(categoryId) {
      return filterContractProducts(state.products, "", categoryId)
        .map((item) => helpers.mapProduct(cloneProduct(item)));
    },
    getProductDetail(productId) {
      const product = state.products.find((item) => item.id === productId);

      return product ? helpers.mapProduct(cloneProduct(product)) : null;
    },
    getAddressListData() {
      const selectedAddress = getSelectedAddress();

      return {
        addresses: state.addresses.map((item) => helpers.mapAddress(item)),
        selectedAddressId: selectedAddress ? selectedAddress.id : ""
      };
    },
    getAddressById(addressId) {
      return helpers.mapAddress(state.addresses.find((item) => item.id === addressId) || null);
    },
    getCartPageData() {
      return helpers.buildCartPageData(state.cartItems);
    },
    getCouponPageData() {
      return {
        centerTemplates: buildCenterTemplates(),
        coupons: getSortedCouponRecords().map((item) => mapCouponRecord(item)),
        selectedCouponId: state.cart.selectedCouponId || ""
      };
    },
    selectCoupon(couponId, amount) {
      const coupon = state.userCoupons.find((item) => item.id === couponId);

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

      const template = getTemplateById(coupon.templateId);

      if (Number(amount || 0) < helpers.toNumber((template || {}).threshold)) {
        return {
          ok: false,
          message: "当前金额还不能用这张券"
        };
      }

      state.cart.selectedCouponId = coupon.id;

      return {
        ok: true,
        coupon: mapCouponRecord(coupon)
      };
    },
    clearSelectedCoupon() {
      state.cart.selectedCouponId = null;

      return {
        ok: true
      };
    },
    getCheckoutPageData() {
      const selectedCoupon = getSelectedCoupon();
      const template = selectedCoupon ? getTemplateById(selectedCoupon.templateId) : null;
      const checkoutSummary = helpers.buildCheckoutSummary(state.cartItems, template ? {
        amount: template.amount,
        threshold: template.threshold
      } : null);

      return {
        address: helpers.mapAddress(getSelectedAddress()),
        cartItems: state.cartItems.map((item) => helpers.mapCartItem(item)),
        totalCount: checkoutSummary.totalCount,
        goodsAmount: checkoutSummary.goodsAmount,
        discountAmount: checkoutSummary.discountAmount,
        payableAmount: checkoutSummary.payableAmount,
        goodsAmountNumber: checkoutSummary.goodsAmountNumber,
        selectedCoupon: selectedCoupon ? mapCouponRecord(selectedCoupon) : null
      };
    },
    submitOrder(options = {}) {
      if (!state.cartItems.length) {
        return {
          ok: false,
          message: "购物车为空"
        };
      }

      const selectedAddress = getSelectedAddress();

      if (!selectedAddress) {
        return {
          ok: false,
          message: "请先选择地址"
        };
      }

      const selectedCoupon = getSelectedCoupon();
      const template = selectedCoupon ? getTemplateById(selectedCoupon.templateId) : null;
      const checkoutSummary = helpers.buildCheckoutSummary(state.cartItems, template ? {
        amount: template.amount,
        threshold: template.threshold
      } : null);
      const nextOrder = {
        id: `order-${orderCounter++}`,
        orderNo: buildPublicOrderNo(),
        userId: state.user.id,
        addressId: selectedAddress.id,
        referralBindingId: null,
        inviterUserId: null,
        status: "pending",
        sourceScene: "direct",
        goodsAmount: checkoutSummary.goodsAmountNumber,
        discountAmount: checkoutSummary.discountAmountNumber,
        payableAmount: checkoutSummary.payableAmountNumber,
        commissionBaseAmount: 0,
        commissionRate: 0,
        commissionAmount: 0,
        couponTitle: checkoutSummary.discountAmountNumber > 0 && template ? template.title : "",
        remark: options.remark || "",
        createdAt: new Date()
      };

      state.orders.unshift(nextOrder);
      state.cartItems.forEach((item) => {
        state.orderItems.push({
          id: `order-item-${orderItemCounter++}`,
          orderId: nextOrder.id,
          productId: item.productId,
          skuId: null,
          title: item.title,
          specText: item.specText || "",
          price: item.price,
          quantity: item.quantity,
          subtotalAmount: helpers.toNumber(item.price) * Number(item.quantity || 0),
          createdAt: new Date()
        });
      });

      if (selectedCoupon && checkoutSummary.discountAmountNumber > 0) {
        selectedCoupon.status = "used";
        selectedCoupon.usedAt = new Date();
        selectedCoupon.usedOrderId = nextOrder.id;
      }

      state.cart.selectedCouponId = null;
      state.cartItems = [];

      return {
        ok: true,
        order: helpers.mapOrder(getHydratedOrder(nextOrder))
      };
    },
    getAllOrders() {
      return state.orders
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .map((item) => helpers.mapOrder(getHydratedOrder(item)));
    },
    getOrderDetailData(orderId) {
      const order = state.orders.find((item) => item.orderNo === orderId) || null;
      const hydrated = getHydratedOrder(order);

      return {
        order: hydrated ? helpers.mapOrder(hydrated) : null,
        afterSale: hydrated && hydrated.afterSale ? helpers.mapAfterSale({
          ...hydrated.afterSale,
          orderId
        }) : null
      };
    },
    updateOrderStatus(orderId, nextStatus) {
      const order = state.orders.find((item) => item.orderNo === orderId);

      if (!order) {
        return null;
      }

      helpers.assertUserOrderStatusTransition(order.status, nextStatus);
      order.status = nextStatus;

      if (nextStatus === "cancelled") {
        state.userCoupons.forEach((item) => {
          if (item.usedOrderId === order.id && item.status === "used") {
            item.status = "available";
            item.usedAt = null;
            item.usedOrderId = null;
          }
        });
      }

      return helpers.mapOrder(getHydratedOrder(order));
    },
    createAfterSale(payload = {}) {
      const order = state.orders.find((item) => item.orderNo === payload.orderId);

      if (!order) {
        throw new Error("订单不存在");
      }

      const existing = state.afterSales.find((item) => item.orderId === order.id);

      if (existing) {
        throw new Error("该订单已提交售后");
      }

      if (order.status !== "shipping" && order.status !== "done") {
        throw new Error("当前订单暂不可售后");
      }

      const afterSale = {
        id: `after-sale-${afterSaleCounter++}`,
        orderId: order.id,
        userId: state.user.id,
        reason: payload.reason || "不想要了",
        description: payload.description || "",
        status: "processing",
        reviewRemark: "",
        reviewedAt: null,
        reviewedBy: "",
        createdAt: new Date()
      };

      state.afterSales.unshift(afterSale);

      return helpers.mapAfterSale({
        ...afterSale,
        orderId: payload.orderId
      });
    },
    getProfileData() {
      return {
        user: helpers.mapUser(state.user),
        address: helpers.mapAddress(getSelectedAddress()) || {},
        coupons: getSortedCouponRecords().map((item) => mapCouponRecord(item)),
        cartCount: state.cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
        runtimeOrderCount: state.orders.length,
        distributor: mapDistributor()
      };
    },
    authorizeUser() {
      state.user = {
        ...state.user,
        nickname: "微信用户",
        mobile: "138****6699",
        isAuthorized: true
      };

      return helpers.mapUser(state.user);
    },
    getDistributionData() {
      return {
        user: helpers.mapUser(state.user),
        distributor: mapDistributor()
      };
    },
    getTeamData() {
      return {
        teamMembers: state.teamMembers.map((item) => mapTeamMember(item)),
        distributor: mapDistributor()
      };
    },
    getCommissionData() {
      return {
        records: state.commissionRecords.map((item) => mapCommissionRecord(item)),
        distributor: mapDistributor()
      };
    },
    getPosterData() {
      const posterCoupon = getSortedCouponRecords().find((item) => item.status === "available") || null;

      return {
        user: helpers.mapUser(state.user),
        distributor: mapDistributor(),
        coupon: posterCoupon ? mapCouponRecord(posterCoupon) : null,
        sharePath: `/pages/home/index?inviterUserId=${encodeURIComponent(state.user.id)}&sourceScene=share`
      };
    }
  };
}

function createContractPrisma(fixtures) {
  const state = {
    addresses: fixtures.addresses.map((item) => ({
      ...item
    })),
    afterSales: fixtures.afterSales.map((item) => ({
      ...item
    })),
    cartItems: fixtures.cartItems.map((item) => ({
      ...item
    })),
    carts: fixtures.carts.map((item) => ({
      ...item
    })),
    categories: fixtures.categories.map((item) => ({
      ...item
    })),
    commissionRecords: fixtures.commissionRecords.map((item) => ({
      ...item
    })),
    couponTemplates: fixtures.couponTemplates.map((item) => ({
      ...item
    })),
    distributorProfiles: [
      {
        ...fixtures.distributorProfile
      }
    ],
    orderItems: fixtures.orderItems.map((item) => ({
      ...item
    })),
    orders: fixtures.orders.map((item) => ({
      ...item
    })),
    products: fixtures.products.map((item) => cloneProduct(item)),
    referralBindings: fixtures.referralBindings.map((item) => ({
      ...item
    })),
    teamMembers: fixtures.teamMembers.map((item) => ({
      ...item
    })),
    userCoupons: fixtures.userCoupons.map((item) => ({
      ...item
    })),
    userSessions: [],
    users: [
      {
        ...fixtures.user
      }
    ]
  };
  let sessionCounter = 1;
  let cartItemCounter = state.cartItems.length + 1;
  let userCouponCounter = state.userCoupons.length + 1;
  let orderCounter = state.orders.length + 1;
  let orderItemCounter = state.orderItems.length + 1;
  let afterSaleCounter = state.afterSales.length + 1;

  function findUserById(userId) {
    return state.users.find((item) => item.id === userId) || null;
  }

  function findTemplateById(templateId) {
    return state.couponTemplates.find((item) => item.id === templateId) || null;
  }

  function includeCouponTemplate(coupon, includeTemplate) {
    if (!coupon) {
      return null;
    }

    return {
      ...coupon,
      template: includeTemplate ? findTemplateById(coupon.templateId) : undefined
    };
  }

  function hydrateOrder(order) {
    if (!order) {
      return null;
    }

    return {
      ...order,
      address: state.addresses.find((item) => item.id === order.addressId) || null,
      afterSale: state.afterSales.find((item) => item.orderId === order.id) || null,
      items: state.orderItems
        .filter((item) => item.orderId === order.id)
        .slice()
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
        .map((item) => ({ ...item }))
    };
  }

  const prisma = {
    address: {
      findFirst: async ({ where }) => {
        const address = state.addresses.find((item) => {
          return (!where.id || item.id === where.id) && (!where.userId || item.userId === where.userId);
        });

        return address ? { ...address } : null;
      },
      findMany: async ({ where }) => {
        return state.addresses
          .filter((item) => !where.userId || item.userId === where.userId)
          .map((item) => ({ ...item }));
      }
    },
    afterSale: {
      create: async ({ data }) => {
        const record = {
          id: `after-sale-${afterSaleCounter++}`,
          reviewRemark: "",
          reviewedAt: null,
          reviewedBy: "",
          createdAt: new Date(),
          ...data
        };

        state.afterSales.push(record);

        return { ...record };
      }
    },
    cart: {
      findUnique: async ({ where }) => {
        const cart = state.carts.find((item) => item.id === where.id);

        return cart ? { ...cart } : null;
      },
      update: async ({ where, data }) => {
        const cart = state.carts.find((item) => item.id === where.id);

        Object.assign(cart, data);

        return { ...cart };
      },
      upsert: async ({ where, create }) => {
        const existing = state.carts.find((item) => item.userId === where.userId);

        if (existing) {
          return { ...existing };
        }

        const nextCart = {
          id: `cart-${state.carts.length + 1}`,
          selectedCouponId: null,
          ...create
        };

        state.carts.push(nextCart);

        return { ...nextCart };
      }
    },
    cartItem: {
      create: async ({ data }) => {
        const record = {
          id: `cart-item-${cartItemCounter++}`,
          updatedAt: new Date(),
          ...data
        };

        state.cartItems.push(record);

        return { ...record };
      },
      deleteMany: async ({ where }) => {
        state.cartItems = state.cartItems.filter((item) => item.cartId !== where.cartId);
        return {
          count: 1
        };
      },
      findMany: async ({ where }) => {
        return state.cartItems
          .filter((item) => item.cartId === where.cartId)
          .map((item) => ({ ...item }));
      }
    },
    category: {
      findMany: async ({ where }) => {
        return state.categories
          .filter((item) => !where.status || item.status === where.status)
          .map((item) => ({ ...item }));
      }
    },
    commissionRecord: {
      findMany: async ({ where }) => {
        return state.commissionRecords
          .filter((item) => item.distributorId === where.distributorId)
          .slice()
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .map((item) => ({ ...item }));
      }
    },
    couponTemplate: {
      findFirst: async ({ where }) => {
        return state.couponTemplates.find((item) => {
          return (!where.id || item.id === where.id) && (!where.status || item.status === where.status);
        }) || null;
      },
      findMany: async ({ where }) => {
        return state.couponTemplates
          .filter((item) => {
            if (!where) {
              return true;
            }

            if (where.status && item.status !== where.status) {
              return false;
            }

            if (where.code && Array.isArray(where.code.in) && !where.code.in.includes(item.code)) {
              return false;
            }

            return true;
          })
          .map((item) => ({ ...item }));
      },
      upsert: async ({ where, update, create }) => {
        const existing = state.couponTemplates.find((item) => item.code === where.code);

        if (existing) {
          Object.assign(existing, update);
          return { ...existing };
        }

        const nextTemplate = {
          id: `tpl-${state.couponTemplates.length + 1}`,
          ...create
        };

        state.couponTemplates.push(nextTemplate);

        return { ...nextTemplate };
      }
    },
    distributorProfile: {
      findUnique: async ({ where }) => {
        return state.distributorProfiles.find((item) => item.id === where.id) || null;
      },
      update: async ({ where, data }) => {
        const profile = state.distributorProfiles.find((item) => item.id === where.id);

        Object.keys(data || {}).forEach((key) => {
          const value = data[key];

          if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "increment")) {
            profile[key] = Number(profile[key] || 0) + Number(value.increment || 0);
            return;
          }

          profile[key] = value;
        });

        return { ...profile };
      },
      upsert: async ({ where, create }) => {
        const existing = state.distributorProfiles.find((item) => item.userId === where.userId);

        if (existing) {
          return { ...existing };
        }

        const nextProfile = {
          id: `dist-${state.distributorProfiles.length + 1}`,
          ...create
        };

        state.distributorProfiles.push(nextProfile);

        return { ...nextProfile };
      }
    },
    order: {
      count: async ({ where } = {}) => {
        return state.orders.filter((item) => !where.userId || item.userId === where.userId).length;
      },
      create: async ({ data }) => {
        const record = {
          id: `order-${orderCounter++}`,
          createdAt: new Date(),
          ...data
        };

        state.orders.unshift(record);

        return { ...record };
      },
      findFirst: async ({ where, include }) => {
        const order = state.orders.find((item) => {
          return (!where.userId || item.userId === where.userId)
            && (!where.orderNo || item.orderNo === where.orderNo);
        }) || null;

        return include ? hydrateOrder(order) : (order ? { ...order } : null);
      },
      findMany: async ({ where, include }) => {
        return state.orders
          .filter((item) => !where.userId || item.userId === where.userId)
          .slice()
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .map((item) => (include ? hydrateOrder(item) : { ...item }));
      },
      findUnique: async ({ where, include }) => {
        const order = state.orders.find((item) => item.id === where.id) || null;

        return include ? hydrateOrder(order) : (order ? { ...order } : null);
      },
      update: async ({ where, data, include }) => {
        const order = state.orders.find((item) => item.id === where.id);

        Object.assign(order, data);

        return include ? hydrateOrder(order) : { ...order };
      }
    },
    orderItem: {
      create: async ({ data }) => {
        const record = {
          id: `order-item-${orderItemCounter++}`,
          createdAt: new Date(),
          ...data
        };

        state.orderItems.push(record);

        return { ...record };
      }
    },
    product: {
      findMany: async ({ where }) => {
        const keyword = (((where || {}).OR || []).map((item) => {
          return (item.title || item.shortDesc || item.subTitle || {}).contains || "";
        }).find(Boolean)) || "";

        return filterContractProducts(state.products, keyword, (where || {}).categoryId || "")
          .filter((item) => !where.status || item.status === where.status)
          .map((item) => cloneProduct(item));
      },
      findUnique: async ({ where, include }) => {
        const product = state.products.find((item) => item.id === where.id);

        if (!product) {
          return null;
        }

        const cloned = cloneProduct(product);

        if (include && include.skus && include.skus.where && include.skus.where.status) {
          cloned.skus = cloned.skus.filter((item) => item.status === include.skus.where.status);
        }

        return cloned;
      }
    },
    referralBinding: {
      create: async ({ data }) => {
        const nextBinding = {
          id: `binding-${state.referralBindings.length + 1}`,
          boundAt: new Date(),
          ...data
        };

        state.referralBindings.push(nextBinding);

        return {
          ...nextBinding,
          invitee: findUserById(nextBinding.inviteeUserId),
          inviter: findUserById(nextBinding.inviterUserId)
        };
      },
      findMany: async ({ where }) => {
        return state.referralBindings
          .filter((item) => !where.inviterUserId || item.inviterUserId === where.inviterUserId)
          .map((item) => ({
            ...item,
            invitee: findUserById(item.inviteeUserId),
            inviter: findUserById(item.inviterUserId)
          }));
      },
      findUnique: async ({ where }) => {
        const binding = state.referralBindings.find((item) => item.inviteeUserId === where.inviteeUserId);

        if (!binding) {
          return null;
        }

        return {
          ...binding,
          invitee: findUserById(binding.inviteeUserId),
          inviter: findUserById(binding.inviterUserId)
        };
      }
    },
    teamMember: {
      count: async ({ where }) => {
        return state.teamMembers.filter((item) => {
          if (where.distributorId && item.distributorId !== where.distributorId) {
            return false;
          }

          if (where.joinedAt && where.joinedAt.gte && new Date(item.joinedAt).getTime() < new Date(where.joinedAt.gte).getTime()) {
            return false;
          }

          return true;
        }).length;
      },
      findMany: async ({ where }) => {
        return state.teamMembers
          .filter((item) => !where.distributorId || item.distributorId === where.distributorId)
          .slice()
          .sort((left, right) => new Date(right.joinedAt).getTime() - new Date(left.joinedAt).getTime())
          .map((item) => ({ ...item }));
      }
    },
    user: {
      findFirst: async ({ where }) => {
        return state.users.find((item) => {
          return (!where.id || item.id === where.id) && (!where.status || item.status === where.status);
        }) || null;
      },
      findUnique: async ({ where }) => {
        return state.users.find((item) => {
          return (!where.id || item.id === where.id)
            && (!where.openId || item.openId === where.openId)
            && (!where.unionId || item.unionId === where.unionId);
        }) || null;
      },
      update: async ({ where, data }) => {
        const user = findUserById(where.id);

        Object.assign(user, data);

        return { ...user };
      },
      upsert: async ({ where, create }) => {
        const existing = state.users.find((item) => item.openId === where.openId);

        if (existing) {
          return { ...existing };
        }

        const nextUser = {
          id: `user-${state.users.length + 1}`,
          status: "active",
          ...create
        };

        state.users.push(nextUser);

        return { ...nextUser };
      }
    },
    userCoupon: {
      count: async ({ where }) => {
        return state.userCoupons.filter((item) => {
          if (where.templateId && item.templateId !== where.templateId) {
            return false;
          }

          if (where.userId && item.userId !== where.userId) {
            return false;
          }

          if (where.sourceType && item.sourceType !== where.sourceType) {
            return false;
          }

          if (where.status && item.status !== where.status) {
            return false;
          }

          return true;
        }).length;
      },
      create: async ({ data, include }) => {
        const record = {
          id: `coupon-${userCouponCounter++}`,
          usedAt: null,
          usedOrderId: null,
          createdAt: data.claimedAt || new Date(),
          updatedAt: data.claimedAt || new Date(),
          ...data
        };

        state.userCoupons.push(record);

        return include && include.template ? includeCouponTemplate(record, true) : { ...record };
      },
      findFirst: async ({ where, include }) => {
        const coupon = state.userCoupons.find((item) => {
          if (where.id && item.id !== where.id) {
            return false;
          }

          if (where.userId && item.userId !== where.userId) {
            return false;
          }

          if (where.templateId && item.templateId !== where.templateId) {
            return false;
          }

          if (where.sourceType && item.sourceType !== where.sourceType) {
            return false;
          }

          if (where.sourceText && item.sourceText !== where.sourceText) {
            return false;
          }

          if (where.usedOrderId && item.usedOrderId !== where.usedOrderId) {
            return false;
          }

          return true;
        }) || null;

        return include && include.template ? includeCouponTemplate(coupon, true) : (coupon ? { ...coupon } : null);
      },
      findMany: async ({ where, include }) => {
        return state.userCoupons
          .filter((item) => !where.userId || item.userId === where.userId)
          .slice()
          .sort((left, right) => new Date(right.claimedAt).getTime() - new Date(left.claimedAt).getTime())
          .map((item) => (include && include.template ? includeCouponTemplate(item, true) : { ...item }));
      },
      update: async ({ where, data }) => {
        const coupon = state.userCoupons.find((item) => item.id === where.id);

        Object.assign(coupon, data);

        return { ...coupon };
      },
      updateMany: async ({ where, data }) => {
        let count = 0;

        state.userCoupons.forEach((item) => {
          if (where.userId && item.userId !== where.userId) {
            return;
          }

          if (where.status && item.status !== where.status) {
            return;
          }

          if (where.expiresAt && where.expiresAt.lte && new Date(item.expiresAt).getTime() > new Date(where.expiresAt.lte).getTime()) {
            return;
          }

          Object.assign(item, data);
          count += 1;
        });

        return {
          count
        };
      }
    },
    userSession: {
      create: async ({ data }) => {
        const session = {
          id: `session-${sessionCounter++}`,
          ...data
        };

        state.userSessions.push(session);

        return { ...session };
      },
      findUnique: async ({ where, include }) => {
        const session = state.userSessions.find((item) => item.sessionToken === where.sessionToken);

        if (!session) {
          return null;
        }

        return {
          ...session,
          user: include && include.user ? findUserById(session.userId) : undefined
        };
      },
      update: async ({ where, data }) => {
        const session = state.userSessions.find((item) => item.id === where.id);

        Object.assign(session, data);

        return { ...session };
      }
    }
  };

  prisma.$transaction = async (handler) => handler(prisma);

  return prisma;
}

function createContractRepositories() {
  const fixtures = createContractFixtureData();
  const helpers = createContractMapperHelpers();
  const memoryRepository = createStorefrontMemoryRepository(createContractMemorySource(fixtures, helpers));
  const prisma = createContractPrisma(fixtures);
  const prismaRepository = createStorefrontPrismaRepository(() => prisma);

  memoryRepository.bootstrap();

  return {
    expectedUser: helpers.mapUser(fixtures.user),
    memoryRepository,
    prismaRepository
  };
}

function assertSessionPayloadShape(payload, prefixPattern, expectedUser) {
  assert.match(payload.sessionToken, prefixPattern);
  assert.equal(payload.status, "active");
  assert.deepEqual(payload.user, expectedUser);
  assert.equal(new Date(payload.expiresAt).toISOString(), payload.expiresAt);
}

async function assertUnauthorized(getter) {
  try {
    await getter();
    assert.fail("expected unauthorized error");
  } catch (error) {
    assert.equal(error.statusCode, 401);
  }
}

function normalizeContractOrder(order) {
  if (!order) {
    return null;
  }

  return {
    status: order.status,
    statusText: order.statusText,
    amount: order.amount,
    goodsAmount: order.goodsAmount,
    discountAmount: order.discountAmount,
    displayAmount: order.displayAmount,
    couponTitle: order.couponTitle,
    remark: order.remark,
    sourceScene: order.sourceScene,
    address: order.address,
    items: (order.items || []).map((item) => ({
      id: item.id,
      skuId: item.skuId,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      specText: item.specText,
      subtotalAmount: item.subtotalAmount,
      subtotal: item.subtotal
    })),
    aftersaleStatus: order.aftersaleStatus,
    aftersaleStatusText: order.aftersaleStatusText,
    canCancel: order.canCancel,
    canConfirm: order.canConfirm,
    canAftersale: order.canAftersale
  };
}

function normalizeContractAfterSale(record) {
  if (!record) {
    return null;
  }

  return {
    orderId: record.orderId,
    reason: record.reason,
    description: record.description,
    status: record.status,
    statusText: record.statusText,
    reviewRemark: record.reviewRemark,
    reviewedBy: record.reviewedBy
  };
}

test("memory and prisma repositories share session and catalog contracts", async () => {
  const { expectedUser, memoryRepository, prismaRepository } = createContractRepositories();

  const memorySession = memoryRepository.createSession({
    loginType: "mock_wechat"
  });
  const prismaSession = await prismaRepository.createSession({
    loginType: "mock_wechat"
  });

  assertSessionPayloadShape(memorySession, /^memory_/, expectedUser);
  assertSessionPayloadShape(prismaSession, /^prisma_/, expectedUser);

  const memoryMe = memoryRepository.getMe(memorySession.sessionToken);
  const prismaMe = await prismaRepository.getMe(prismaSession.sessionToken);

  assert.deepEqual(memoryMe.user, expectedUser);
  assert.deepEqual(prismaMe.user, expectedUser);
  assert.deepEqual(
    {
      user: memoryMe.user,
      status: memoryMe.session.status
    },
    {
      user: prismaMe.user,
      status: prismaMe.session.status
    }
  );

  const memoryCategories = memoryRepository.getCategories();
  const prismaCategories = await prismaRepository.getCategories();
  const memorySearch = memoryRepository.searchProducts("坚果");
  const prismaSearch = await prismaRepository.searchProducts("坚果");
  const memoryCategoryProducts = memoryRepository.getProductsByCategory("cat-1");
  const prismaCategoryProducts = await prismaRepository.getProductsByCategory("cat-1");
  const memoryProductDetail = memoryRepository.getProductDetail("prod-1");
  const prismaProductDetail = await prismaRepository.getProductDetail("prod-1");

  assert.deepEqual(prismaCategories, memoryCategories);
  assert.deepEqual(prismaSearch, memorySearch);
  assert.deepEqual(prismaCategoryProducts, memoryCategoryProducts);
  assert.deepEqual(prismaProductDetail, memoryProductDetail);

  assert.deepEqual(memoryRepository.logout(memorySession.sessionToken), {
    ok: true
  });
  assert.deepEqual(await prismaRepository.logout(prismaSession.sessionToken), {
    ok: true
  });

  await assertUnauthorized(() => memoryRepository.getMe(memorySession.sessionToken));
  await assertUnauthorized(() => prismaRepository.getMe(prismaSession.sessionToken));
});

test("memory and prisma repositories share address and cart contracts", async () => {
  const { memoryRepository, prismaRepository } = createContractRepositories();
  const memorySession = memoryRepository.createSession({
    loginType: "mock_wechat"
  });
  const prismaSession = await prismaRepository.createSession({
    loginType: "mock_wechat"
  });

  const memoryAddresses = memoryRepository.getAddressListData(memorySession.sessionToken);
  const prismaAddresses = await prismaRepository.getAddressListData(prismaSession.sessionToken);
  const memoryAddressDetail = memoryRepository.getAddressById(memorySession.sessionToken, "addr-1");
  const prismaAddressDetail = await prismaRepository.getAddressById(prismaSession.sessionToken, "addr-1");
  const memoryCart = memoryRepository.getCartPageData(memorySession.sessionToken);
  const prismaCart = await prismaRepository.getCartPageData(prismaSession.sessionToken);

  assert.deepEqual(prismaAddresses, memoryAddresses);
  assert.deepEqual(prismaAddressDetail, memoryAddressDetail);
  assert.deepEqual(prismaCart, memoryCart);
});

test("memory and prisma repositories share coupon order profile and distribution contracts", async () => {
  const { memoryRepository, prismaRepository } = createContractRepositories();
  const memorySession = memoryRepository.createSession({
    loginType: "mock_wechat"
  });
  const prismaSession = await prismaRepository.createSession({
    loginType: "mock_wechat"
  });

  const memoryCouponPage = memoryRepository.getCouponPageData(memorySession.sessionToken);
  const prismaCouponPage = await prismaRepository.getCouponPageData(prismaSession.sessionToken);

  assert.deepEqual(prismaCouponPage, memoryCouponPage);

  const memorySelectCoupon = memoryRepository.selectCoupon(memorySession.sessionToken, "coupon-1", 129);
  const prismaSelectCoupon = await prismaRepository.selectCoupon(prismaSession.sessionToken, "coupon-1", 129);

  assert.deepEqual(prismaSelectCoupon, memorySelectCoupon);

  const memoryCheckout = memoryRepository.getCheckoutPageData(memorySession.sessionToken);
  const prismaCheckout = await prismaRepository.getCheckoutPageData(prismaSession.sessionToken);

  assert.deepEqual(prismaCheckout, memoryCheckout);

  const memorySubmit = memoryRepository.submitOrder(memorySession.sessionToken, {
    remark: "contract-order"
  });
  const prismaSubmit = await prismaRepository.submitOrder(prismaSession.sessionToken, {
    remark: "contract-order"
  });

  assert.equal(memorySubmit.ok, true);
  assert.equal(prismaSubmit.ok, true);
  assert.match(memorySubmit.order.id, /^NO/);
  assert.match(prismaSubmit.order.id, /^NO/);
  assert.deepEqual(normalizeContractOrder(prismaSubmit.order), normalizeContractOrder(memorySubmit.order));

  const memoryOrders = memoryRepository.getAllOrders(memorySession.sessionToken);
  const prismaOrders = await prismaRepository.getAllOrders(prismaSession.sessionToken);

  assert.deepEqual(
    prismaOrders.map((item) => normalizeContractOrder(item)),
    memoryOrders.map((item) => normalizeContractOrder(item))
  );

  const memoryCancelled = memoryRepository.updateOrderStatus(
    memorySession.sessionToken,
    memorySubmit.order.id,
    "cancelled"
  );
  const prismaCancelled = await prismaRepository.updateOrderStatus(
    prismaSession.sessionToken,
    prismaSubmit.order.id,
    "cancelled"
  );

  assert.deepEqual(normalizeContractOrder(prismaCancelled), normalizeContractOrder(memoryCancelled));

  const memoryCouponPageAfterCancel = memoryRepository.getCouponPageData(memorySession.sessionToken);
  const prismaCouponPageAfterCancel = await prismaRepository.getCouponPageData(prismaSession.sessionToken);

  assert.deepEqual(prismaCouponPageAfterCancel, memoryCouponPageAfterCancel);

  const memoryAfterSale = memoryRepository.createAfterSale({
    sessionToken: memorySession.sessionToken,
    orderId: "NO20260330001",
    reason: "不想要了",
    description: "contract-aftersale"
  });
  const prismaAfterSale = await prismaRepository.createAfterSale({
    sessionToken: prismaSession.sessionToken,
    orderId: "NO20260330001",
    reason: "不想要了",
    description: "contract-aftersale"
  });

  assert.deepEqual(normalizeContractAfterSale(prismaAfterSale), normalizeContractAfterSale(memoryAfterSale));

  const memoryOrderDetail = memoryRepository.getOrderDetail(memorySession.sessionToken, "NO20260330001");
  const prismaOrderDetail = await prismaRepository.getOrderDetail(prismaSession.sessionToken, "NO20260330001");

  assert.deepEqual(
    {
      order: normalizeContractOrder(prismaOrderDetail.order),
      afterSale: normalizeContractAfterSale(prismaOrderDetail.afterSale)
    },
    {
      order: normalizeContractOrder(memoryOrderDetail.order),
      afterSale: normalizeContractAfterSale(memoryOrderDetail.afterSale)
    }
  );

  const memoryProfile = memoryRepository.getProfileData(memorySession.sessionToken);
  const prismaProfile = await prismaRepository.getProfileData(prismaSession.sessionToken);
  const memoryDistribution = memoryRepository.getDistributionData(memorySession.sessionToken);
  const prismaDistribution = await prismaRepository.getDistributionData(prismaSession.sessionToken);
  const memoryTeam = memoryRepository.getTeamData(memorySession.sessionToken);
  const prismaTeam = await prismaRepository.getTeamData(prismaSession.sessionToken);
  const memoryCommission = memoryRepository.getCommissionData(memorySession.sessionToken);
  const prismaCommission = await prismaRepository.getCommissionData(prismaSession.sessionToken);
  const memoryPoster = memoryRepository.getPosterData(memorySession.sessionToken);
  const prismaPoster = await prismaRepository.getPosterData(prismaSession.sessionToken);

  assert.deepEqual(prismaProfile, memoryProfile);
  assert.deepEqual(prismaDistribution, memoryDistribution);
  assert.deepEqual(prismaTeam, memoryTeam);
  assert.deepEqual(prismaCommission, memoryCommission);
  assert.deepEqual(prismaPoster, memoryPoster);

  const memoryAuthorized = memoryRepository.authorizeUser(memorySession.sessionToken);
  const prismaAuthorized = await prismaRepository.authorizeUser(prismaSession.sessionToken);

  assert.deepEqual(prismaAuthorized, memoryAuthorized);
});
