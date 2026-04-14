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

  function normalizeRuleVersionStatus(status, fallback = "draft") {
    const normalized = String(status || fallback).trim();

    if (normalized === "published" || normalized === "archived" || normalized === "draft") {
      return normalized;
    }

    return fallback;
  }

  function getRuleVersionStatusText(status) {
    if (status === "published") {
      return "已发布";
    }

    if (status === "archived") {
      return "已归档";
    }

    return "草稿";
  }

  function buildRuleVersionNo() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
      hour12: false
    }).formatToParts(now);
    const get = (type) => (parts.find((item) => item.type === type) || {}).value || "00";

    return [
      "DRV",
      get("year"),
      get("month"),
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      get("fractionalSecond").padEnd(3, "0")
    ].join("");
  }

  function normalizeRulePayload(payload = {}, fallback = {}) {
    const levelOneRate = typeof payload.levelOneRate === "undefined" ? Number(fallback.levelOneRate || 8) : Number(payload.levelOneRate || 0);
    const levelTwoRate = typeof payload.levelTwoRate === "undefined" ? Number(fallback.levelTwoRate || 3) : Number(payload.levelTwoRate || 0);
    const bindDays = typeof payload.bindDays === "undefined" ? Number(fallback.bindDays || 15) : Number(payload.bindDays || 0);
    const minWithdrawalAmount = typeof payload.minWithdrawalAmount === "undefined"
      ? Number(fallback.minWithdrawalAmount || 0)
      : Number(payload.minWithdrawalAmount || 0);
    const serviceFeeRate = typeof payload.serviceFeeRate === "undefined"
      ? Number(fallback.serviceFeeRate || 0)
      : Number(payload.serviceFeeRate || 0);
    const serviceFeeFixed = typeof payload.serviceFeeFixed === "undefined"
      ? Number(fallback.serviceFeeFixed || 0)
      : Number(payload.serviceFeeFixed || 0);

    return {
      enabled: typeof payload.enabled === "undefined" ? fallback.enabled !== false : !!payload.enabled,
      levelOneRate: Number(Math.max(0, levelOneRate).toFixed(2)),
      levelTwoRate: Number(Math.max(0, levelTwoRate).toFixed(2)),
      bindDays: Math.max(1, Math.round(Number.isFinite(bindDays) ? bindDays : 15)),
      minWithdrawalAmount: Number(Math.max(0, minWithdrawalAmount).toFixed(2)),
      serviceFeeRate: Number(Math.max(0, serviceFeeRate).toFixed(4)),
      serviceFeeFixed: Number(Math.max(0, serviceFeeFixed).toFixed(2)),
      ruleDesc: String(payload.ruleDesc || fallback.ruleDesc || "").trim()
    };
  }

  function mapRuleVersionRecord(record = {}) {
    return {
      versionId: record.id || "",
      versionNo: record.versionNo || "",
      status: normalizeRuleVersionStatus(record.status, "draft"),
      statusText: getRuleVersionStatusText(record.status),
      enabled: record.enabled !== false,
      levelOneRate: Number(record.levelOneRate || 0),
      levelTwoRate: Number(record.levelTwoRate || 0),
      bindDays: Number(record.bindDays || 0),
      minWithdrawalAmount: Number(record.minWithdrawalAmount || 0),
      serviceFeeRate: Number(record.serviceFeeRate || 0),
      serviceFeeFixed: Number(record.serviceFeeFixed || 0),
      ruleDesc: record.ruleDesc || "",
      effectiveAt: record.effectiveAt || "",
      publishedAt: record.publishedAt || "",
      publishedBy: record.publishedBy || "",
      createdBy: record.createdBy || "",
      createdAt: record.createdAt || "",
      updatedAt: record.updatedAt || ""
    };
  }

  function mapRuleSummaryFromVersion(record = null) {
    if (!record) {
      return {
        enabled: true,
        levelOneRate: 8,
        levelTwoRate: 3,
        bindDays: 15,
        minWithdrawalAmount: 0,
        serviceFeeRate: 0,
        serviceFeeFixed: 0,
        ruleDesc: "",
        updatedAt: "",
        updatedBy: {
          adminUserId: "",
          realName: ""
        },
        activeVersionId: "",
        activeVersionNo: "",
        status: "draft",
        publishedAt: "",
        effectiveAt: ""
      };
    }

    const mapped = mapRuleVersionRecord(record);

    return {
      enabled: mapped.enabled,
      levelOneRate: mapped.levelOneRate,
      levelTwoRate: mapped.levelTwoRate,
      bindDays: mapped.bindDays,
      minWithdrawalAmount: mapped.minWithdrawalAmount,
      serviceFeeRate: mapped.serviceFeeRate,
      serviceFeeFixed: mapped.serviceFeeFixed,
      ruleDesc: mapped.ruleDesc,
      updatedAt: mapped.updatedAt,
      updatedBy: {
        adminUserId: "",
        realName: mapped.publishedBy || mapped.createdBy || ""
      },
      activeVersionId: mapped.versionId,
      activeVersionNo: mapped.versionNo,
      status: mapped.status,
      publishedAt: mapped.publishedAt,
      effectiveAt: mapped.effectiveAt
    };
  }

  function buildRuleLogRecord({
    state,
    ruleVersionId = "",
    action = "",
    summary = "",
    payload = null,
    actor = {}
  }) {
    const now = formatDateTime();
    const actorName = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
    const actorId = String(actor.adminUserId || actor.id || "").trim() || "";
    const payloadJson = payload ? JSON.stringify(payload) : "";
    const log = {
      id: generateId("drl"),
      ruleVersionId,
      action,
      summary,
      payloadJson,
      actorId,
      actorName,
      createdAt: now
    };

    state.distributionRuleChangeLogs = [log].concat(state.distributionRuleChangeLogs || []);
    return log;
  }

  function ensureDistributionRuleVersionState(state) {
    if (Array.isArray(state.distributionRuleVersions) && Array.isArray(state.distributionRuleChangeLogs)) {
      if (!state.distributionRuleActiveVersionId) {
        const active = state.distributionRuleVersions.find((item) => item.status === "published");
        state.distributionRuleActiveVersionId = active ? active.id : "";
      }
      return;
    }

    const legacyRule = state.distributionRules || {
      enabled: true,
      levelOneRate: 8,
      levelTwoRate: 3,
      bindDays: 15,
      ruleDesc: ""
    };
    const now = legacyRule.updatedAt || formatDateTime();
    const initialVersionId = generateId("drv");

    state.distributionRuleVersions = [
      {
        id: initialVersionId,
        versionNo: buildRuleVersionNo(),
        enabled: legacyRule.enabled !== false,
        levelOneRate: Number(legacyRule.levelOneRate || 8),
        levelTwoRate: Number(legacyRule.levelTwoRate || 3),
        bindDays: Number(legacyRule.bindDays || 15),
        minWithdrawalAmount: Number(legacyRule.minWithdrawalAmount || 0),
        serviceFeeRate: Number(legacyRule.serviceFeeRate || 0),
        serviceFeeFixed: Number(legacyRule.serviceFeeFixed || 0),
        ruleDesc: legacyRule.ruleDesc || "",
        status: "published",
        effectiveAt: now,
        publishedAt: now,
        publishedBy: ((legacyRule.updatedBy || {}).realName) || "系统管理员",
        createdBy: ((legacyRule.updatedBy || {}).realName) || "系统管理员",
        createdAt: now,
        updatedAt: now
      }
    ];
    state.distributionRuleChangeLogs = [];
    state.distributionRuleActiveVersionId = initialVersionId;
  }

  function getActiveRuleVersion(state) {
    ensureDistributionRuleVersionState(state);

    const activeId = String(state.distributionRuleActiveVersionId || "").trim();
    let active = (state.distributionRuleVersions || []).find((item) => item.id === activeId);

    if (!active) {
      active = (state.distributionRuleVersions || []).find((item) => item.status === "published")
        || (state.distributionRuleVersions || [])[0]
        || null;
      state.distributionRuleActiveVersionId = active ? active.id : "";
    }

    return active || null;
  }

  function refreshLegacyDistributionRuleState(state) {
    const active = getActiveRuleVersion(state);
    state.distributionRules = mapRuleSummaryFromVersion(active);
  }

  function getAdminDistributionRules() {
    const state = getState();
    const active = getActiveRuleVersion(state);

    return cloneData(mapRuleSummaryFromVersion(active));
  }

  function getAdminDistributionRuleVersions(options = {}) {
    const state = getState();
    const active = getActiveRuleVersion(state);
    const keyword = String(options.keyword || "").trim().toLowerCase();
    const status = String(options.status || "").trim();
    const list = (state.distributionRuleVersions || [])
      .filter((item) => {
        if (status && normalizeRuleVersionStatus(item.status, "draft") !== status) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        const text = [
          item.versionNo,
          item.ruleDesc
        ].map((field) => String(field || "").toLowerCase()).join("|");

        return text.includes(keyword);
      })
      .map((item) => ({
        ...mapRuleVersionRecord(item),
        isActive: !!(active && active.id === item.id)
      }));

    return {
      ...paginateList(list, options),
      activeVersionId: active ? active.id : ""
    };
  }

  function createAdminDistributionRuleVersion(payload = {}, actor = {}) {
    return withState((state) => {
      const active = getActiveRuleVersion(state);
      const normalized = normalizeRulePayload(payload, active || {});
      const now = formatDateTime();
      const actorName = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
      const nextVersion = {
        id: generateId("drv"),
        versionNo: buildRuleVersionNo(),
        ...normalized,
        status: "draft",
        effectiveAt: "",
        publishedAt: "",
        publishedBy: "",
        createdBy: actorName,
        createdAt: now,
        updatedAt: now
      };

      state.distributionRuleVersions = [nextVersion].concat(state.distributionRuleVersions || []);
      buildRuleLogRecord({
        state,
        ruleVersionId: nextVersion.id,
        action: "created_draft",
        summary: "创建分销规则草稿",
        payload: normalized,
        actor
      });
      refreshLegacyDistributionRuleState(state);

      return mapRuleVersionRecord(nextVersion);
    });
  }

  function publishAdminDistributionRuleVersion(ruleVersionId, payload = {}, actor = {}) {
    return withState((state) => {
      const current = (state.distributionRuleVersions || []).find((item) => item.id === ruleVersionId);

      if (!current) {
        return null;
      }

      if (current.status === "published") {
        return mapRuleVersionRecord(current);
      }

      const now = formatDateTime();
      const actorName = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
      const effectiveAt = String(payload.effectiveAt || "").trim() || now;

      (state.distributionRuleVersions || []).forEach((item) => {
        if (item.status === "published") {
          item.status = "archived";
          item.updatedAt = now;
        }
      });

      current.status = "published";
      current.effectiveAt = effectiveAt;
      current.publishedAt = now;
      current.publishedBy = actorName;
      current.updatedAt = now;
      state.distributionRuleActiveVersionId = current.id;

      buildRuleLogRecord({
        state,
        ruleVersionId: current.id,
        action: "published",
        summary: "发布分销规则版本",
        payload: normalizeRulePayload(current, current),
        actor
      });
      refreshLegacyDistributionRuleState(state);

      return mapRuleVersionRecord(current);
    });
  }

  function getAdminDistributionRuleChangeLogs(options = {}) {
    const state = getState();
    ensureDistributionRuleVersionState(state);
    const action = String(options.action || "").trim();
    const ruleVersionId = String(options.ruleVersionId || "").trim();
    const list = (state.distributionRuleChangeLogs || [])
      .filter((item) => {
        if (action && item.action !== action) {
          return false;
        }

        if (ruleVersionId && item.ruleVersionId !== ruleVersionId) {
          return false;
        }

        return true;
      })
      .map((item) => {
        const relatedVersion = (state.distributionRuleVersions || []).find((version) => version.id === item.ruleVersionId);

        return {
          logId: item.id,
          action: item.action || "",
          summary: item.summary || "",
          payloadJson: item.payloadJson || "",
          actorId: item.actorId || "",
          actorName: item.actorName || "",
          createdAt: item.createdAt || "",
          ruleVersion: relatedVersion
            ? {
                versionId: relatedVersion.id,
                versionNo: relatedVersion.versionNo
              }
            : null
        };
      });

    return paginateList(list, options);
  }

  function updateAdminDistributionRules(payload = {}, actor = {}) {
    return withState((state) => {
      const active = getActiveRuleVersion(state);
      const normalized = normalizeRulePayload(payload, active || {});
      const now = formatDateTime();
      const actorName = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";

      (state.distributionRuleVersions || []).forEach((item) => {
        if (item.status === "published") {
          item.status = "archived";
          item.updatedAt = now;
        }
      });

      const nextVersion = {
        id: generateId("drv"),
        versionNo: buildRuleVersionNo(),
        ...normalized,
        status: "published",
        effectiveAt: now,
        publishedAt: now,
        publishedBy: actorName,
        createdBy: actorName,
        createdAt: now,
        updatedAt: now
      };

      state.distributionRuleVersions = [nextVersion].concat(state.distributionRuleVersions || []);
      state.distributionRuleActiveVersionId = nextVersion.id;
      buildRuleLogRecord({
        state,
        ruleVersionId: nextVersion.id,
        action: "legacy_put_publish",
        summary: "兼容旧接口直接发布规则",
        payload: normalized,
        actor
      });
      refreshLegacyDistributionRuleState(state);

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

  function getWithdrawalStatusText(status) {
    return {
      submitted: "待审核",
      approved: "待打款",
      rejected: "已拒绝",
      paying: "打款中",
      paid: "已打款",
      pay_failed: "打款失败",
      cancelled: "已撤销"
    }[status] || "未知状态";
  }

  function buildAdminWithdrawalRecord(record = {}, state = getState()) {
    const user = (state.userRecords || []).find((item) => item.id === record.userId) || {};
    const payouts = Array.isArray(record.payouts) ? record.payouts : [];
    const latestPayout = payouts.length ? payouts[payouts.length - 1] : null;

    return {
      withdrawalId: record.id || "",
      requestNo: record.requestNo || "",
      userId: record.userId || "",
      nickname: user.nickname || "",
      mobile: user.mobile || "",
      status: record.status || "submitted",
      statusText: getWithdrawalStatusText(record.status),
      amountCent: Math.round(Number(record.amount || 0) * 100),
      amountText: formatPrice(record.amount || 0),
      serviceFeeCent: Math.round(Number(record.serviceFee || 0) * 100),
      serviceFeeText: formatPrice(record.serviceFee || 0),
      netAmountCent: Math.round(Number(record.netAmount || 0) * 100),
      netAmountText: formatPrice(record.netAmount || 0),
      channel: record.channel || "manual_bank",
      accountName: record.accountName || "",
      accountNoMask: record.accountNoMask || "",
      reviewRemark: record.reviewRemark || "",
      reviewedBy: record.reviewedBy || "",
      reviewedAt: record.reviewedAt || "",
      paidAt: record.paidAt || "",
      createdAt: record.createdAt || "",
      updatedAt: record.updatedAt || "",
      latestPayout: latestPayout ? cloneData(latestPayout) : null
    };
  }

  function getAdminWithdrawalRequests(options = {}) {
    const keyword = String(options.keyword || "").trim().toLowerCase();
    const status = String(options.status || "").trim();
    const state = getState();
    const list = (state.withdrawalRequests || [])
      .filter((item) => {
        if (status && item.status !== status) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        const user = (state.userRecords || []).find((record) => record.id === item.userId) || {};
        const text = [
          item.requestNo,
          user.nickname,
          user.mobile,
          item.accountNoMask
        ].map((field) => String(field || "").toLowerCase()).join("|");

        return text.includes(keyword);
      })
      .map((item) => buildAdminWithdrawalRecord(item, state));

    return paginateList(list, options);
  }

  function getAdminWithdrawalDetail(withdrawalId) {
    const state = getState();
    const record = (state.withdrawalRequests || []).find((item) => item.id === withdrawalId);

    if (!record) {
      return null;
    }

    return {
      ...buildAdminWithdrawalRecord(record, state),
      payouts: cloneData(record.payouts || [])
    };
  }

  function reviewAdminWithdrawalRequest(withdrawalId, payload = {}, actor = {}) {
    const action = String(payload.action || "").trim();

    if (action !== "approve" && action !== "reject") {
      throw new Error("缺少有效审核动作");
    }

    return withState((state) => {
      const current = (state.withdrawalRequests || []).find((item) => item.id === withdrawalId);

      if (!current) {
        return null;
      }

      if (current.status !== "submitted") {
        if ((action === "approve" && current.status === "approved") || (action === "reject" && current.status === "rejected")) {
          return buildAdminWithdrawalRecord(current, state);
        }

        throw new Error("当前提现单状态不可审核");
      }

      current.status = action === "approve" ? "approved" : "rejected";
      current.reviewRemark = String(payload.remark || "").trim();
      current.reviewedBy = String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员";
      current.reviewedAt = formatDateTime();
      current.updatedAt = current.reviewedAt;

      if (current.status === "rejected") {
        state.distributor = {
          ...state.distributor,
          withdrawingCommission: Number(Math.max(0, Number((state.distributor || {}).withdrawingCommission || 0) - Number(current.amount || 0)).toFixed(2))
        };
      }

      return buildAdminWithdrawalRecord(current, state);
    });
  }

  function payoutAdminWithdrawalRequest(withdrawalId, payload = {}, actor = {}) {
    const result = String(payload.result || "paid").trim() === "failed" ? "failed" : "paid";

    return withState((state) => {
      const current = (state.withdrawalRequests || []).find((item) => item.id === withdrawalId);

      if (!current) {
        return null;
      }

      if (!["approved", "paying", "pay_failed", "paid"].includes(current.status)) {
        throw new Error("当前提现单状态不可打款");
      }

      if (current.status === "paid" && result === "paid") {
        return buildAdminWithdrawalRecord(current, state);
      }

      const now = formatDateTime();
      const payout = {
        id: generateId("wdp"),
        channel: String(payload.channel || "manual_bank").trim() || "manual_bank",
        channelBillNo: String(payload.channelBillNo || "").trim(),
        status: result === "paid" ? "paid" : "failed",
        remark: String(payload.remark || "").trim(),
        paidBy: String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员",
        paidAt: now,
        createdAt: now
      };

      current.payouts = (current.payouts || []).concat([payout]);
      current.updatedAt = now;

      if (result === "paid") {
        current.status = "paid";
        current.paidAt = now;
        state.distributor = {
          ...state.distributor,
          withdrawingCommission: Number(Math.max(0, Number((state.distributor || {}).withdrawingCommission || 0) - Number(current.amount || 0)).toFixed(2)),
          withdrawnCommission: Number((Number((state.distributor || {}).withdrawnCommission || 0) + Number(current.amount || 0)).toFixed(2)),
          settledCommission: Number(Math.max(0, Number((state.distributor || {}).settledCommission || 0) - Number(current.amount || 0)).toFixed(2))
        };
      } else {
        current.status = "pay_failed";
      }

      return buildAdminWithdrawalRecord(current, state);
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
    getAdminDistributionRuleVersions,
    createAdminDistributionRuleVersion,
    publishAdminDistributionRuleVersion,
    getAdminDistributionRuleChangeLogs,
    updateAdminDistributionRules,
    getAdminDistributors,
    getAdminDistributorDetail,
    updateAdminDistributorStatus,
    getAdminWithdrawalRequests,
    getAdminWithdrawalDetail,
    reviewAdminWithdrawalRequest,
    payoutAdminWithdrawalRequest
  };
}

module.exports = createAdminApi;
