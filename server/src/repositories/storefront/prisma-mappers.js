function createStorefrontPrismaMapperModule({
  accentPalette,
  createStorefrontError
}) {
  function formatMoney(value) {
    return Number(value || 0).toFixed(2);
  }

  function toNumber(value) {
    return Number(value || 0);
  }

  function formatDateTime(date) {
    const current = date ? new Date(date) : new Date();

    if (Number.isNaN(current.getTime())) {
      return "";
    }

    const pad = (value) => String(value).padStart(2, "0");

    return [
      current.getFullYear(),
      pad(current.getMonth() + 1),
      pad(current.getDate())
    ].join("-") + " " + [pad(current.getHours()), pad(current.getMinutes())].join(":");
  }

  function formatDate(date) {
    const current = date ? new Date(date) : new Date();

    if (Number.isNaN(current.getTime())) {
      return "";
    }

    const pad = (value) => String(value).padStart(2, "0");

    return [
      current.getFullYear(),
      pad(current.getMonth() + 1),
      pad(current.getDate())
    ].join("-");
  }

  function hashText(text = "") {
    return String(text).split("").reduce((sum, current) => sum + current.charCodeAt(0), 0);
  }

  function buildAccent(seed = "") {
    return accentPalette[hashText(seed) % accentPalette.length];
  }

  function buildCoverLabel(title = "") {
    const normalized = String(title || "").trim();

    return normalized.slice(0, 2) || "商品";
  }

  function buildHighlightTags(product = {}) {
    const source = [product.shortDesc, product.subTitle]
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .join(" / ");

    if (!source) {
      return ["支持下单", "支持多规格", "支持前台展示"];
    }

    return source
      .split(/[/、，,。]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  function buildCategoryRows(categories = []) {
    return [
      {
        id: "all",
        name: "全部"
      }
    ].concat((categories || []).map((item) => ({
      id: item.id,
      name: item.name
    })));
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

  function getAftersaleStatusText(status) {
    const statusMap = {
      processing: "售后处理中",
      approved: "售后已通过",
      rejected: "售后已驳回",
      done: "售后已完成"
    };

    return statusMap[status] || "";
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

  function buildCheckoutSummary(cartItems = [], coupon = null) {
    const goodsAmountNumber = (cartItems || []).reduce((sum, item) => {
      return sum + toNumber(item.price) * Number(item.quantity || 0);
    }, 0);
    const totalCount = (cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const discountAmountNumber = getCouponDiscount(coupon, goodsAmountNumber);
    const payableAmountNumber = Math.max(goodsAmountNumber - discountAmountNumber, 0);

    return {
      totalCount,
      goodsAmountNumber,
      discountAmountNumber,
      payableAmountNumber,
      goodsAmount: formatMoney(goodsAmountNumber),
      discountAmount: formatMoney(discountAmountNumber),
      payableAmount: formatMoney(payableAmountNumber)
    };
  }

  function mapUser(user = {}) {
    return {
      id: user.id || "",
      nickname: user.nickname || "微信用户",
      level: "普通会员",
      phone: user.mobile || "未授权手机号",
      isAuthorized: !!user.isAuthorized
    };
  }

  function mapSession(session = {}) {
    return {
      sessionToken: session.sessionToken || "",
      expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : "",
      status: session.status || "active"
    };
  }

  function mapAddress(address) {
    if (!address) {
      return null;
    }

    const detail = [
      address.province,
      address.city,
      address.district,
      address.detail
    ].filter(Boolean).join(" ");

    return {
      id: address.id,
      receiver: address.receiver,
      phone: address.phone,
      detail: detail || address.detail || "",
      tag: address.tag || "",
      isDefault: !!address.isDefault
    };
  }

  function mapProduct(product = {}) {
    const specs = (product.skus || [])
      .map((item) => item.specText)
      .filter(Boolean);
    const normalizedSpecs = specs.length ? specs : ["默认规格"];
    const price = toNumber(product.price);
    const marketPrice = toNumber(product.marketPrice);

    return {
      id: product.id,
      categoryId: product.categoryId || "",
      title: product.title,
      shortDesc: product.shortDesc || product.subTitle || "",
      subTitle: product.subTitle || product.shortDesc || "",
      price,
      marketPrice,
      displayPrice: formatMoney(price),
      displayMarketPrice: formatMoney(marketPrice),
      tag: product.status === "off_sale" ? "下架" : "在售",
      coverLabel: buildCoverLabel(product.title),
      accent: buildAccent(product.id),
      salesText: `月销 ${toNumber(product.salesCount)}`,
      salesCount: toNumber(product.salesCount),
      specs: normalizedSpecs,
      highlights: buildHighlightTags(product),
      favoriteCount: toNumber(product.favoriteCount),
      productType: "general",
      detailContent: product.detailContent || `<p>${product.shortDesc || product.title}</p>`,
      coverImage: product.coverImage || "",
      imageList: product.coverImage ? [product.coverImage] : [],
      distributionEnabled: typeof product.distributionEnabled === "boolean" ? product.distributionEnabled : true,
      status: product.status || "on_sale",
      statusText: product.status === "off_sale" ? "已下架" : "销售中"
    };
  }

  function mapCartItem(item = {}) {
    const price = toNumber(item.price);
    const quantity = Number(item.quantity || 0);
    const productId = item.productId || (item.product || {}).id || "";

    return {
      id: productId,
      title: item.title,
      price,
      quantity,
      specText: item.specText || "",
      coverLabel: buildCoverLabel(item.title),
      accent: buildAccent(productId || item.title),
      cartKey: `${productId}-${item.specText || ""}`,
      displayPrice: formatMoney(price),
      displaySubtotal: formatMoney(price * quantity)
    };
  }

  function buildCartPageData(cartItems = []) {
    const mappedItems = (cartItems || []).map((item) => mapCartItem(item));
    const totalCount = mappedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalPrice = mappedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

    return {
      cartItems: mappedItems,
      totalCount,
      totalPrice: formatMoney(totalPrice),
      isEmpty: mappedItems.length === 0
    };
  }

  function mapOrder(order = {}) {
    const amount = toNumber(order.payableAmount);
    const status = order.status || "pending";
    const aftersaleStatus = ((order.afterSale || {}).status) || "";

    return {
      id: order.orderNo,
      status,
      statusText: getStatusText(status),
      createTime: formatDateTime(order.createdAt),
      amount,
      goodsAmount: formatMoney(order.goodsAmount),
      discountAmount: formatMoney(order.discountAmount),
      displayAmount: formatMoney(order.payableAmount),
      couponTitle: order.couponTitle || "",
      remark: order.remark || "",
      sourceScene: order.sourceScene || "direct",
      address: mapAddress(order.address),
      items: (order.items || []).map((item) => {
        const subtotalAmount = toNumber(item.subtotalAmount);

        return {
          id: item.productId || "",
          skuId: item.skuId || "",
          title: item.title,
          price: toNumber(item.price),
          quantity: Number(item.quantity || 0),
          specText: item.specText || "",
          subtotalAmount,
          subtotal: formatMoney(subtotalAmount)
        };
      }),
      aftersaleStatus,
      aftersaleStatusText: getAftersaleStatusText(aftersaleStatus),
      canCancel: status === "pending",
      canConfirm: status === "shipping",
      canAftersale: status === "shipping" || status === "done"
    };
  }

  function mapCouponTemplate(template = {}, options = {}) {
    return {
      id: template.id,
      title: template.title,
      amount: toNumber(template.amount),
      threshold: toNumber(template.threshold),
      badge: template.badge || "",
      desc: template.description || "",
      expiryText: `领取后 ${Number(template.validDays || 0)} 天有效`,
      claimed: !!options.claimed,
      status: template.status || "enabled",
      issueType: template.issueType || "center_claim",
      validDays: Number(template.validDays || 0),
      receivedCount: Number(options.receivedCount || 0),
      usedCount: Number(options.usedCount || 0),
      createdAt: formatDateTime(template.createdAt),
      updatedAt: formatDateTime(template.updatedAt)
    };
  }

  function mapUserCoupon(coupon = {}) {
    const template = coupon.template || {};

    return {
      id: coupon.id,
      templateId: coupon.templateId || template.id || "",
      title: template.title || "",
      amount: toNumber(template.amount),
      threshold: toNumber(template.threshold),
      status: coupon.status || "available",
      expiryText: `${formatDate(coupon.expiresAt)} 前可用`,
      sourceText: coupon.sourceText || ""
    };
  }

  function mapAfterSale(record = {}) {
    return {
      id: record.id,
      orderId: record.orderId || "",
      reason: record.reason || "",
      description: record.description || "",
      status: record.status || "processing",
      statusText: getAftersaleStatusText(record.status),
      reviewRemark: record.reviewRemark || "",
      reviewedAt: formatDateTime(record.reviewedAt),
      reviewedBy: record.reviewedBy || "",
      createdAt: formatDateTime(record.createdAt)
    };
  }

  function assertUserOrderStatusTransition(currentStatus, nextStatus) {
    if (!nextStatus) {
      throw createStorefrontError("缺少订单状态", 400, "ORDER_STATUS_REQUIRED");
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
      throw createStorefrontError("当前订单不能执行这个操作", 409, "ORDER_STATUS_TRANSITION_NOT_ALLOWED");
    }
  }

  return {
    helpers: {
      assertUserOrderStatusTransition,
      buildAccent,
      buildCartPageData,
      buildCategoryRows,
      buildCheckoutSummary,
      buildCoverLabel,
      buildHighlightTags,
      formatDate,
      formatDateTime,
      formatMoney,
      getStatusText,
      mapAddress,
      mapAfterSale,
      mapCartItem,
      mapCouponTemplate,
      mapOrder,
      mapProduct,
      mapSession,
      mapUser,
      mapUserCoupon,
      toNumber
    }
  };
}

module.exports = {
  createStorefrontPrismaMapperModule
};
