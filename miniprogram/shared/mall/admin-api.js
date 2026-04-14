const { generateId, normalizeDetailContent, normalizePageOptions, paginateList } = require("../utils");
const {
  getDisplayTextByStatus,
  getCategoryStatusText,
  getGenericStatusText,
  getPayStatus,
  getPayStatusText,
  getAdminOrderStatus,
  getAdminAfterSaleStatus,
  getAdminAfterSaleStatusText
} = require("./admin-api-helpers");

function createAdminApi(deps) {
  const {
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
  } = deps;

  // ── 分类 / 商品 / SKU ──

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
      detailContent: normalizeDetailContent(product.detailContent, product.shortDesc || product.title),
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
      const index = categories.findIndex((item) => item.id === categoryId);
      if (index === -1) {
        return null;
      }

      const current = categories[index];
      categories[index] = {
        ...current,
        parentId: typeof payload.parentId === "undefined" ? current.parentId : Number(payload.parentId || 0),
        name: payload.name || current.name,
        sortOrder: typeof payload.sortOrder === "undefined" ? current.sortOrder : Number(payload.sortOrder || 0),
        status: payload.status || current.status || "enabled",
        updatedAt: now
      };

      return buildAdminCategoryRecord(categories[index]);
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
      detailContent: normalizeDetailContent(
        payload.detailContent,
        payload.shortDesc || payload.subTitle || payload.title
      ),
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
      detailContent: normalizeDetailContent(
        payload.detailContent,
        payload.shortDesc || payload.subTitle || payload.title
      ),
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

  // ── 订单 / 发货 / 售后 ──

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
      const nextOrder = updateOrderCollectionsStatus(state, orderId, "shipping", {
        skipTransitionCheck: true
      });

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
      const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "processing";
      const reviewedAt = formatDateTime();
      const current = (state.afterSales || []).find((item) => item.id === afterSaleId);

      if (!current) {
        return null;
      }

      const orderId = current.orderId;

      if (nextStatus === "approved") {
        const normalizeAmount = (value) => {
          const amount = Number(value || 0);

          if (!Number.isFinite(amount) || amount <= 0) {
            return 0;
          }

          return Number(amount.toFixed(2));
        };
        const normalizeAmountCent = (value) => Math.round(normalizeAmount(value) * 100);
        const orderCommissionRecords = (state.commissionRecords || []).filter((item) => item.orderNo === orderId && item.status !== "reversed");

        orderCommissionRecords.forEach((item) => {
          const status = String(item.status || "pending").trim() || "pending";
          const amount = normalizeAmount(item.amount);
          const amountCent = normalizeAmountCent(item.amount);

          if (status === "withdrawing" || status === "withdrawn") {
            throw new Error("该佣金已进入提现流程，需人工处理");
          }

          if (status !== "pending" && status !== "settled") {
            throw new Error("当前佣金状态不可冲回，需人工处理");
          }

          if (amount > 0) {
            state.distributor = {
              ...(state.distributor || {}),
              totalCommission: Number(Math.max(0, Number((state.distributor || {}).totalCommission || 0) - amount).toFixed(2)),
              pendingCommission: status === "pending"
                ? Number(Math.max(0, Number((state.distributor || {}).pendingCommission || 0) - amount).toFixed(2))
                : Number(Number((state.distributor || {}).pendingCommission || 0).toFixed(2)),
              settledCommission: status === "settled"
                ? Number(Math.max(0, Number((state.distributor || {}).settledCommission || 0) - amount).toFixed(2))
                : Number(Number((state.distributor || {}).settledCommission || 0).toFixed(2))
            };

            if (item.distributorId) {
              state.distributorProfiles = (state.distributorProfiles || []).map((profile) => {
                if (profile.id !== item.distributorId) {
                  return profile;
                }

                const nextProfile = {
                  ...profile,
                  totalCommissionCent: Math.max(0, Number(profile.totalCommissionCent || 0) - amountCent)
                };

                if (status === "pending") {
                  nextProfile.pendingCommissionCent = Math.max(0, Number(profile.pendingCommissionCent || 0) - amountCent);
                } else if (typeof profile.settledCommissionCent !== "undefined") {
                  nextProfile.settledCommissionCent = Math.max(0, Number(profile.settledCommissionCent || 0) - amountCent);
                }

                if (status === "settled" && typeof profile.withdrawableCommissionCent !== "undefined") {
                  nextProfile.withdrawableCommissionCent = Math.max(0, Number(profile.withdrawableCommissionCent || 0) - amountCent);
                }

                return nextProfile;
              });
            }
          }
        });

        state.commissionRecords = (state.commissionRecords || []).map((item) => {
          if (item.orderNo !== orderId || item.status === "reversed") {
            return item;
          }

          return {
            ...item,
            status: "reversed",
            statusText: "已冲回"
          };
        });
      }

      let target = null;
      state.afterSales = (state.afterSales || []).map((item) => {
        if (item.id !== afterSaleId) {
          return item;
        }

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

  // ── 优惠券模板 ──

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
        const index = (state.couponCenterTemplates || []).findIndex((item) => item.id === templateId);

        if (index === -1) {
          return null;
        }

        const current = state.couponCenterTemplates[index];
        state.couponCenterTemplates[index] = {
          ...current,
          title: payload.title || current.title,
          amount: typeof payload.amount === "undefined" ? current.amount : Number(payload.amount || payload.amountCent / 100 || 0),
          threshold: typeof payload.threshold === "undefined" ? current.threshold : Number(payload.threshold || payload.thresholdAmountCent / 100 || 0),
          issueType: payload.issueType || current.issueType || "center_claim",
          status: payload.status || current.status || "enabled",
          validDays: typeof payload.validDays === "undefined" ? current.validDays : Number(payload.validDays || 0),
          updatedAt: now
        };

        return buildAdminCouponTemplateRecord(state.couponCenterTemplates[index]);
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

  // ── 分销管理 ──

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

  return {
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
}

module.exports = createAdminApi;
