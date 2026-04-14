const { createStorefrontError } = require("../../modules/storefront/errors");
const { normalizeDetailContent, getShanghaiTodayRange } = require("../../../shared/utils");

function createStorefrontPrismaAdminRepository({
  getPrisma,
  assertUserOrderStatusTransition,
  buildHighlightTags,
  buildPaginatedResult,
  formatDateTime,
  formatMoney,
  getPaginationQuery,
  getStatusText,
  restoreOrderStock,
  restoreUsedCouponForOrder,
  toNumber
}) {
  function getDisplayTextByStatus(status, textMap) {
    return textMap[status] || "未知状态";
  }

  function getPayStatus() {
    return "paid";
  }

  function getPayStatusText(status) {
    return getDisplayTextByStatus(status, {
      unpaid: "未支付",
      paid: "已支付",
      refunded: "已退款",
      part_refunded: "部分退款"
    });
  }

  function getAdminOrderStatus(order = {}) {
    return {
      pending: "pending_shipment",
      shipping: "shipping",
      done: "done",
      cancelled: "cancelled"
    }[order.status] || "pending_shipment";
  }

  function getAdminAfterSaleStatus(status) {
    return status === "processing" ? "pending_review" : status || "pending_review";
  }

  function getAdminAfterSaleStatusText(status) {
    return getDisplayTextByStatus(getAdminAfterSaleStatus(status), {
      pending_review: "待审核",
      approved: "已通过",
      rejected: "已驳回",
      done: "已完成"
    });
  }

  function getCategoryStatusText(status) {
    return getDisplayTextByStatus(status, {
      enabled: "启用",
      disabled: "停用"
    });
  }

  function getSkuStatusText(status) {
    return getDisplayTextByStatus(status, {
      enabled: "启用",
      disabled: "停用"
    });
  }

  function getProductStatusText(status) {
    return getDisplayTextByStatus(status, {
      on_sale: "销售中",
      off_sale: "已下架"
    });
  }

  function normalizeAdminCategoryStatus(status, fallback = "enabled") {
    return String(status || fallback).trim() === "disabled" ? "disabled" : "enabled";
  }

  function normalizeAdminSkuStatus(status, fallback = "enabled") {
    return String(status || fallback).trim() === "disabled" ? "disabled" : "enabled";
  }

  function normalizeAdminProductStatus(status, fallback = "off_sale") {
    return String(status || fallback).trim() === "on_sale" ? "on_sale" : "off_sale";
  }

  function normalizeOptionalId(value) {
    const normalized = String(value || "").trim();

    if (!normalized || normalized === "0") {
      return null;
    }

    return normalized;
  }

  function buildReceiverAddress(address = {}) {
    if (!address) {
      return "";
    }

    return [
      address.province,
      address.city,
      address.district,
      address.detail
    ].filter(Boolean).join(" ").trim();
  }

  function mapAdminShipment(order = {}) {
    if (!order || !order.shippedAt) {
      return null;
    }

    const shippedAt = formatDateTime(order.shippedAt);

    return {
      id: `ship_${order.id}`,
      orderId: order.orderNo || "",
      companyCode: order.shipmentCompanyCode || "",
      companyName: order.shipmentCompanyName || "",
      trackingNo: order.shipmentTrackingNo || "",
      shippedAt,
      createdAt: shippedAt,
      updatedAt: formatDateTime(order.updatedAt) || shippedAt
    };
  }

  function buildAdminCategoryRecord(category = {}) {
    return {
      categoryId: category.id || "",
      parentId: category.parentId || 0,
      name: category.name || "",
      sortOrder: Number(category.sortOrder || 0),
      status: category.status || "enabled",
      statusText: getCategoryStatusText(category.status || "enabled"),
      createdAt: formatDateTime(category.createdAt),
      updatedAt: formatDateTime(category.updatedAt)
    };
  }

  function buildAdminSkuRecord(sku = {}) {
    return {
      skuId: sku.id || "",
      skuCode: sku.skuCode || "",
      specText: sku.specText || "",
      priceCent: Math.round(toNumber(sku.price) * 100),
      priceText: formatMoney(sku.price),
      originPriceCent: Math.round(toNumber(sku.originPrice) * 100),
      originPriceText: formatMoney(sku.originPrice),
      stock: Number(sku.stock || 0),
      lockStock: Number(sku.lockStock || 0),
      status: sku.status || "enabled",
      statusText: getSkuStatusText(sku.status || "enabled")
    };
  }

  function buildAdminProductListItem(product = {}) {
    const skuList = product.skus || [];
    const priceValues = skuList.length
      ? skuList.map((item) => toNumber(item.price))
      : [toNumber(product.price)];
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const totalStock = skuList.reduce((sum, item) => sum + Number(item.stock || 0), 0);

    return {
      productId: product.id || "",
      title: product.title || "",
      categoryId: product.categoryId || "",
      categoryName: ((product.category || {}).name) || "",
      coverImage: product.coverImage || "",
      status: product.status || "off_sale",
      statusText: getProductStatusText(product.status || "off_sale"),
      priceRangeText: `${formatMoney(minPrice)} - ${formatMoney(maxPrice)}`,
      totalStock,
      salesCount: Number(product.salesCount || 0),
      distributionEnabled: typeof product.distributionEnabled === "boolean" ? product.distributionEnabled : true,
      updatedAt: formatDateTime(product.updatedAt)
    };
  }

  function buildAdminAfterSaleDetail(record = {}, order = null) {
    const sourceOrder = order || record.order || {};

    return {
      afterSaleId: record.id,
      orderId: sourceOrder.orderNo || "",
      orderNo: sourceOrder.orderNo || "",
      userId: record.userId || sourceOrder.userId || "",
      buyerName: ((sourceOrder.address || {}).receiver || (record.user || {}).nickname || "匿名用户"),
      reason: record.reason || "",
      description: record.description || "",
      status: getAdminAfterSaleStatus(record.status),
      statusText: getAdminAfterSaleStatusText(record.status),
      reviewRemark: record.reviewRemark || "",
      reviewedAt: formatDateTime(record.reviewedAt),
      reviewedBy: record.reviewedBy || "",
      orderStatus: sourceOrder.status ? getAdminOrderStatus(sourceOrder) : "",
      orderStatusText: sourceOrder.status ? getStatusText(sourceOrder.status) : "",
      createdAt: formatDateTime(record.createdAt)
    };
  }

  function assertCommissionReversalStatus(status) {
    if (status === "pending" || status === "settled") {
      return;
    }

    if (status === "withdrawing" || status === "withdrawn") {
      throw createStorefrontError("该佣金已进入提现流程，需人工处理", 409, "COMMISSION_REVERSAL_MANUAL_REQUIRED");
    }

    throw createStorefrontError("当前佣金状态不可冲回，需人工处理", 409, "COMMISSION_REVERSAL_STATUS_INVALID");
  }

  function buildDistributorBalancePatchForCommissionReversal(profile = {}, status, amount) {
    const normalizedAmount = Number(Math.max(0, toNumber(amount)).toFixed(2));
    const currentTotal = toNumber(profile.totalCommission);
    const currentPending = toNumber(profile.pendingCommission);
    const currentSettled = toNumber(profile.settledCommission);
    const currentWithdrawable = toNumber(profile.withdrawableCommission);
    const patch = {
      totalCommission: Number(Math.max(currentTotal - normalizedAmount, 0).toFixed(2))
    };

    if (status === "pending") {
      patch.pendingCommission = Number(Math.max(currentPending - normalizedAmount, 0).toFixed(2));
    } else if (status === "settled") {
      patch.settledCommission = Number(Math.max(currentSettled - normalizedAmount, 0).toFixed(2));
      patch.withdrawableCommission = Number(Math.max(currentWithdrawable - normalizedAmount, 0).toFixed(2));
    }

    return patch;
  }

  async function reverseOrderCommissionRecords(tx, orderNo) {
    const normalizedOrderNo = String(orderNo || "").trim();

    if (!normalizedOrderNo) {
      return;
    }

    const records = await tx.commissionRecord.findMany({
      where: {
        orderNo: normalizedOrderNo,
        status: {
          not: "reversed"
        }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    for (const record of records) {
      const status = String(record.status || "pending").trim() || "pending";

      assertCommissionReversalStatus(status);

      const amount = Number(Math.max(0, toNumber(record.amount)).toFixed(2));
      const profile = await tx.distributorProfile.findUnique({
        where: {
          id: record.distributorId
        }
      });

      if (profile && amount > 0) {
        await tx.distributorProfile.update({
          where: {
            id: profile.id
          },
          data: buildDistributorBalancePatchForCommissionReversal(profile, status, amount)
        });
      }

      await tx.commissionRecord.update({
        where: {
          id: record.id
        },
        data: {
          status: "reversed"
        }
      });
    }
  }

  function buildAdminOrderListItem(order = {}) {
    const payStatus = getPayStatus(order);

    return {
      orderId: order.orderNo || "",
      orderNo: order.orderNo || "",
      userId: order.userId || "",
      buyerName: ((order.address || {}).receiver || (order.user || {}).nickname || "匿名用户"),
      orderStatus: getAdminOrderStatus(order),
      orderStatusText: getStatusText(order.status),
      payStatus,
      payStatusText: getPayStatusText(payStatus),
      payableAmountCent: Math.round(toNumber(order.payableAmount) * 100),
      payableAmountText: formatMoney(order.payableAmount),
      itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
      sourceScene: order.sourceScene || "direct",
      createdAt: formatDateTime(order.createdAt),
      paidAt: formatDateTime(order.createdAt)
    };
  }

  function buildAdminOrderDetail(order = {}) {
    const payStatus = getPayStatus(order);
    const shipment = mapAdminShipment(order);

    return {
      orderId: order.orderNo || "",
      orderNo: order.orderNo || "",
      orderStatus: getAdminOrderStatus(order),
      orderStatusText: getStatusText(order.status),
      payStatus,
      payStatusText: getPayStatusText(payStatus),
      goodsAmountCent: Math.round(toNumber(order.goodsAmount) * 100),
      goodsAmountText: formatMoney(order.goodsAmount),
      discountAmountCent: Math.round(toNumber(order.discountAmount) * 100),
      discountAmountText: formatMoney(order.discountAmount),
      freightAmountCent: 0,
      freightAmountText: "0.00",
      payableAmountCent: Math.round(toNumber(order.payableAmount) * 100),
      payableAmountText: formatMoney(order.payableAmount),
      remark: order.remark || "",
      receiverName: (order.address || {}).receiver || "",
      receiverMobile: (order.address || {}).phone || "",
      receiverAddress: buildReceiverAddress(order.address || {}),
      items: (order.items || []).map((item, index) => {
        const quantity = Math.max(1, Number(item.quantity || 1));
        const lineAmount = toNumber(item.subtotalAmount);

        return {
          orderItemId: item.id || `${order.id || order.orderNo || "order"}-${index + 1}`,
          productId: item.productId || "",
          productTitle: item.title,
          skuId: item.skuId || "",
          specText: item.specText || "",
          quantity,
          salePriceCent: Math.round((lineAmount / quantity) * 100),
          salePriceText: formatMoney(lineAmount / quantity)
        };
      }),
      shipment,
      afterSale: order.afterSale ? buildAdminAfterSaleDetail(order.afterSale, order) : null,
      createdAt: formatDateTime(order.createdAt),
      paidAt: formatDateTime(order.createdAt),
      shippedAt: shipment ? shipment.shippedAt : null
    };
  }

  function buildAdminProductDetail(product = {}) {
    const status = product.status || "off_sale";
    const price = toNumber(product.price);
    const marketPrice = toNumber(product.marketPrice);

    return {
      productId: product.id || "",
      title: product.title || "",
      shortDesc: product.shortDesc || "",
      subTitle: product.subTitle || product.shortDesc || "",
      categoryId: product.categoryId || "",
      categoryName: ((product.category || {}).name) || "",
      productType: "general",
      coverImage: product.coverImage || "",
      imageList: product.coverImage ? [product.coverImage] : [],
      detailContent: normalizeDetailContent(product.detailContent, product.shortDesc || product.title),
      labelTags: buildHighlightTags(product),
      status,
      statusText: getProductStatusText(status),
      distributionEnabled: typeof product.distributionEnabled === "boolean" ? product.distributionEnabled : true,
      commissionType: "ratio",
      commissionFirstValue: 800,
      commissionSecondValue: 300,
      salesCount: Number(product.salesCount || 0),
      favoriteCount: Number(product.favoriteCount || 0),
      price,
      marketPrice,
      displayPrice: formatMoney(price),
      displayMarketPrice: formatMoney(marketPrice),
      sortOrder: Number(product.sortOrder || 0),
      createdAt: formatDateTime(product.createdAt),
      updatedAt: formatDateTime(product.updatedAt)
    };
  }

  function normalizeAdminSkuInputList(productId, product = {}, skuList = []) {
    const normalizedList = Array.isArray(skuList)
      ? skuList
        .map((item, index) => {
          const normalizedPrice = toNumber(item.price);
          const normalizedOriginPrice = toNumber(item.originPrice || item.price || product.marketPrice || product.price);

          return {
            skuId: String(item.skuId || item.id || "").trim(),
            skuCode: String(item.skuCode || `${String(productId || "").toUpperCase()}-${index + 1}`).trim(),
            specText: String(item.specText || "").trim() || `规格${index + 1}`,
            price: normalizedPrice,
            originPrice: normalizedOriginPrice,
            stock: Math.max(0, Number(item.stock || 0)),
            lockStock: Math.max(0, Number(item.lockStock || 0)),
            status: normalizeAdminSkuStatus(item.status, "enabled")
          };
        })
        .filter((item) => item.skuCode)
      : [];

    if (normalizedList.length) {
      return normalizedList;
    }

    return [
      {
        skuId: "",
        skuCode: `${String(productId || "SKU").toUpperCase()}-1`,
        specText: "默认规格",
        price: toNumber(product.price),
        originPrice: toNumber(product.marketPrice || product.price),
        stock: 0,
        lockStock: 0,
        status: "enabled"
      }
    ];
  }

  async function assertCategoryExists(prisma, categoryId) {
    const normalizedCategoryId = normalizeOptionalId(categoryId);

    if (!normalizedCategoryId) {
      throw createStorefrontError("请选择商品分类", 400, "CATEGORY_REQUIRED");
    }

    const category = await prisma.category.findUnique({
      where: {
        id: normalizedCategoryId
      }
    });

    if (!category) {
      throw createStorefrontError("分类不存在", 404, "CATEGORY_NOT_FOUND");
    }

    return category;
  }

  async function syncAdminProductSkus(tx, product = {}, skuPayloadList = []) {
    const normalizedList = normalizeAdminSkuInputList(product.id, product, skuPayloadList);
    const existingSkuList = await tx.productSku.findMany({
      where: {
        productId: product.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const existingSkuMap = existingSkuList.reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
    const keepSkuIds = [];

    for (const item of normalizedList) {
      const matchedSku = item.skuId ? existingSkuMap[item.skuId] : null;

      if (matchedSku) {
        const updatedSku = await tx.productSku.update({
          where: {
            id: matchedSku.id
          },
          data: {
            skuCode: item.skuCode,
            specText: item.specText,
            price: item.price,
            originPrice: item.originPrice,
            stock: item.stock,
            lockStock: item.lockStock,
            status: item.status
          }
        });

        keepSkuIds.push(updatedSku.id);
        continue;
      }

      const createdSku = await tx.productSku.create({
        data: {
          productId: product.id,
          skuCode: item.skuCode,
          specText: item.specText,
          price: item.price,
          originPrice: item.originPrice,
          stock: item.stock,
          lockStock: item.lockStock,
          status: item.status
        }
      });

      keepSkuIds.push(createdSku.id);
    }

    await tx.productSku.deleteMany({
      where: {
        productId: product.id,
        id: {
          notIn: keepSkuIds
        }
      }
    });

    const finalSkuList = await tx.productSku.findMany({
      where: {
        productId: product.id
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const priceList = finalSkuList.length
      ? finalSkuList.map((item) => toNumber(item.price))
      : [toNumber(product.price)];
    const originPriceList = finalSkuList.length
      ? finalSkuList.map((item) => toNumber(item.originPrice || item.price))
      : [toNumber(product.marketPrice || product.price)];

    await tx.product.update({
      where: {
        id: product.id
      },
      data: {
        price: Math.min(...priceList),
        marketPrice: Math.max(...originPriceList)
      }
    });

    return finalSkuList;
  }

  function buildAdminOrderWhere(options = {}) {
    const statusFilter = {
      pending_shipment: "pending",
      shipping: "shipping",
      done: "done",
      cancelled: "cancelled"
    }[String(options.status || "").trim()] || "";
    const orderNo = String(options.orderNo || "").trim();
    const where = {};

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (orderNo) {
      where.orderNo = {
        contains: orderNo
      };
    }

    return where;
  }

  function buildAdminAfterSaleWhere(options = {}) {
    const keyword = String(options.keyword || "").trim();
    const statusFilter = {
      pending_review: "processing",
      approved: "approved",
      rejected: "rejected",
      done: "done"
    }[String(options.status || "").trim()] || "";
    const where = {};

    if (statusFilter) {
      where.status = statusFilter;
    }

    if (keyword) {
      where.OR = [
        {
          order: {
            is: {
              orderNo: {
                contains: keyword
              }
            }
          }
        },
        {
          user: {
            is: {
              nickname: {
                contains: keyword
              }
            }
          }
        },
        {
          order: {
            is: {
              address: {
                is: {
                  receiver: {
                    contains: keyword
                  }
                }
              }
            }
          }
        }
      ];
    }

    return where;
  }

  function assertAdminShipmentPayload(payload = {}) {
    if (!String(payload.companyName || "").trim()) {
      throw createStorefrontError("请先填写物流公司", 400, "SHIPMENT_COMPANY_NAME_REQUIRED");
    }

    if (!String(payload.trackingNo || "").trim()) {
      throw createStorefrontError("请先填写物流单号", 400, "SHIPMENT_TRACKING_NO_REQUIRED");
    }
  }

  function assertAdminShipmentAllowed(order) {
    if (!order) {
      return;
    }

    if (order.status !== "pending") {
      throw createStorefrontError("当前订单不可发货", 409, "ORDER_SHIPMENT_NOT_ALLOWED");
    }
  }

  return {
    async getAdminCategories(options = {}) {
      const prisma = await getPrisma();
      const pagination = getPaginationQuery(options);
      const [total, categories] = await Promise.all([
        prisma.category.count(),
        prisma.category.findMany({
          orderBy: [
            {
              sortOrder: "asc"
            },
            {
              createdAt: "asc"
            }
          ],
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        categories.map((item) => buildAdminCategoryRecord(item)),
        total,
        options
      );
    },
    async saveAdminCategory(payload = {}) {
      const prisma = await getPrisma();
      const categoryId = String(payload.categoryId || payload.id || "").trim();
      const name = String(payload.name || "").trim();

      if (!name) {
        throw createStorefrontError("分类名称不能为空", 400, "CATEGORY_NAME_REQUIRED");
      }

      const categoryData = {
        parentId: normalizeOptionalId(payload.parentId),
        name,
        sortOrder: Number(payload.sortOrder || 0),
        status: normalizeAdminCategoryStatus(payload.status, "enabled")
      };

      if (categoryId) {
        const current = await prisma.category.findUnique({
          where: {
            id: categoryId
          }
        });

        if (!current) {
          return null;
        }

        const updated = await prisma.category.update({
          where: {
            id: categoryId
          },
          data: categoryData
        });

        return buildAdminCategoryRecord(updated);
      }

      const created = await prisma.category.create({
        data: categoryData
      });

      return buildAdminCategoryRecord(created);
    },
    async deleteAdminCategory(categoryId) {
      const prisma = await getPrisma();
      const current = await prisma.category.findUnique({
        where: {
          id: categoryId
        }
      });

      if (!current) {
        return null;
      }

      await prisma.category.delete({
        where: {
          id: categoryId
        }
      });

      return buildAdminCategoryRecord(current);
    },
    async getAdminProducts(options = {}) {
      const prisma = await getPrisma();
      const pagination = getPaginationQuery(options);
      const keyword = String(options.keyword || "").trim();
      const status = String(options.status || "").trim();
      const categoryId = String(options.categoryId || "").trim();
      const where = {};

      if (keyword) {
        where.OR = [
          {
            title: {
              contains: keyword
            }
          },
          {
            shortDesc: {
              contains: keyword
            }
          },
          {
            subTitle: {
              contains: keyword
            }
          }
        ];
      }

      if (status === "on_sale" || status === "off_sale") {
        where.status = status;
      }

      if (categoryId) {
        where.categoryId = categoryId;
      }

      const [total, products] = await Promise.all([
        prisma.product.count({
          where
        }),
        prisma.product.findMany({
          where,
          include: {
            category: true,
            skus: {
              orderBy: {
                createdAt: "asc"
              }
            }
          },
          orderBy: [
            {
              sortOrder: "asc"
            },
            {
              createdAt: "desc"
            }
          ],
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        products.map((item) => buildAdminProductListItem(item)),
        total,
        options
      );
    },
    async getAdminProductDetail(productId) {
      const prisma = await getPrisma();
      const product = await prisma.product.findUnique({
        where: {
          id: productId
        },
        include: {
          category: true,
          skus: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return product ? buildAdminProductDetail(product) : null;
    },
    async saveAdminProduct(payload = {}) {
      const prisma = await getPrisma();
      const productId = String(payload.productId || payload.id || "").trim();
      const title = String(payload.title || "").trim();

      if (!title) {
        throw createStorefrontError("商品标题不能为空", 400, "PRODUCT_TITLE_REQUIRED");
      }

      await assertCategoryExists(prisma, payload.categoryId);

      const productData = {
        categoryId: normalizeOptionalId(payload.categoryId),
        title,
        shortDesc: String(payload.shortDesc || "").trim() || null,
        subTitle: String(payload.subTitle || payload.shortDesc || "").trim() || null,
        coverImage: String(payload.coverImage || "").trim() || null,
        detailContent: normalizeDetailContent(
          String(payload.detailContent || "").trim(),
          String(payload.shortDesc || payload.subTitle || payload.title || "").trim()
        ) || null,
        price: toNumber(payload.price),
        marketPrice: toNumber(payload.marketPrice || payload.price),
        salesCount: Math.max(0, Number(payload.salesCount || 0)),
        favoriteCount: Math.max(0, Number(payload.favoriteCount || 0)),
        distributionEnabled: typeof payload.distributionEnabled === "boolean" ? payload.distributionEnabled : true,
        status: normalizeAdminProductStatus(payload.status, "off_sale"),
        sortOrder: Number(payload.sortOrder || 0)
      };

      let targetProductId = productId;

      if (productId) {
        const current = await prisma.product.findUnique({
          where: {
            id: productId
          }
        });

        if (!current) {
          return null;
        }

        await prisma.product.update({
          where: {
            id: productId
          },
          data: productData
        });
      } else {
        targetProductId = await prisma.$transaction(async (tx) => {
          const created = await tx.product.create({
            data: productData
          });

          await syncAdminProductSkus(tx, created, []);

          return created.id;
        });
      }

      const product = await prisma.product.findUnique({
        where: {
          id: targetProductId
        },
        include: {
          category: true,
          skus: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return product ? buildAdminProductDetail(product) : null;
    },
    async updateAdminProductStatus(productId, status) {
      const prisma = await getPrisma();
      const current = await prisma.product.findUnique({
        where: {
          id: productId
        },
        include: {
          category: true,
          skus: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      if (!current) {
        return null;
      }

      const updated = await prisma.product.update({
        where: {
          id: productId
        },
        data: {
          status: normalizeAdminProductStatus(status, current.status)
        },
        include: {
          category: true,
          skus: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return buildAdminProductListItem(updated);
    },
    async getAdminSkus(productId) {
      const prisma = await getPrisma();
      const skus = await prisma.productSku.findMany({
        where: {
          productId
        },
        orderBy: {
          createdAt: "asc"
        }
      });

      return {
        productId,
        list: skus.map((item) => buildAdminSkuRecord(item))
      };
    },
    async saveAdminSkus(productId, payload = {}) {
      const prisma = await getPrisma();

      return prisma.$transaction(async (tx) => {
        const currentProduct = await tx.product.findUnique({
          where: {
            id: productId
          }
        });

        if (!currentProduct) {
          return null;
        }

        const finalSkuList = await syncAdminProductSkus(tx, currentProduct, payload.skus || []);

        return {
          productId,
          list: finalSkuList.map((item) => buildAdminSkuRecord(item))
        };
      });
    },
    async updateAdminSkuStock(skuId, stock) {
      const prisma = await getPrisma();
      const current = await prisma.productSku.findUnique({
        where: {
          id: skuId
        }
      });

      if (!current) {
        return null;
      }

      const updated = await prisma.productSku.update({
        where: {
          id: skuId
        },
        data: {
          stock: Math.max(0, Number(stock || 0))
        }
      });

      return buildAdminSkuRecord(updated);
    },
    async getAdminDashboardSummary() {
      const prisma = await getPrisma();
      const { start: todayStart, end: tomorrowStart } = getShanghaiTodayRange();
      const [todayOrderCount, todayPaidAmount, newUserCount, newDistributorCount, pendingShipmentCount, shippingOrderCount, pendingAftersaleCount, processedAftersaleCount] = await Promise.all([
        prisma.order.count({
          where: {
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart
            }
          }
        }),
        prisma.order.aggregate({
          _sum: {
            payableAmount: true
          },
          where: {
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart
            },
            status: {
              not: "cancelled"
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart
            }
          }
        }),
        prisma.distributorProfile.count({
          where: {
            joinedAt: {
              gte: todayStart,
              lt: tomorrowStart
            }
          }
        }),
        prisma.order.count({
          where: {
            status: "pending"
          }
        }),
        prisma.order.count({
          where: {
            status: "shipping"
          }
        }),
        prisma.afterSale.count({
          where: {
            status: "processing"
          }
        }),
        prisma.afterSale.count({
          where: {
            status: {
              in: ["approved", "rejected", "done"]
            }
          }
        })
      ]);

      return {
        todayOrderCount,
        todayPaidAmountCent: Math.round(toNumber((todayPaidAmount._sum || {}).payableAmount) * 100),
        todayPaidAmountText: formatMoney((todayPaidAmount._sum || {}).payableAmount),
        newUserCount,
        newDistributorCount,
        pendingShipmentCount,
        shippingOrderCount,
        pendingAftersaleCount,
        processedAftersaleCount
      };
    },
    async getAdminOrders(options = {}) {
      const prisma = await getPrisma();
      const where = buildAdminOrderWhere(options);
      const pagination = getPaginationQuery(options);
      const [total, orders] = await Promise.all([
        prisma.order.count({
          where
        }),
        prisma.order.findMany({
          where,
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        orders.map((item) => buildAdminOrderListItem(item)),
        total,
        options
      );
    },
    async getAdminOrderDetail(orderId) {
      const prisma = await getPrisma();
      const order = await prisma.order.findFirst({
        where: {
          orderNo: orderId
        },
        include: {
          address: true,
          user: true,
          afterSale: true,
          items: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      });

      return order ? buildAdminOrderDetail(order) : null;
    },
    async cancelAdminOrder(orderId) {
      const prisma = await getPrisma();
      const order = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findFirst({
          where: {
            orderNo: orderId
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        if (!current) {
          return null;
        }

        assertUserOrderStatusTransition(current.status, "cancelled");

        const nextOrder = await tx.order.update({
          where: {
            id: current.id
          },
          data: {
            status: "cancelled"
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        await restoreOrderStock(tx, current.items);
        await restoreUsedCouponForOrder(tx, current.id);

        return nextOrder;
      });

      return order ? buildAdminOrderDetail(order) : null;
    },
    async getPendingShipmentOrders(options = {}) {
      const prisma = await getPrisma();
      const pagination = getPaginationQuery(options);
      const where = {
        status: "pending"
      };
      const [total, orders] = await Promise.all([
        prisma.order.count({
          where
        }),
        prisma.order.findMany({
          where,
          include: {
            address: true
          },
          orderBy: {
            createdAt: "desc"
          },
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        orders.map((item) => ({
          orderId: item.orderNo,
          orderNo: item.orderNo,
          buyerName: (item.address || {}).receiver || "匿名用户",
          receiverName: (item.address || {}).receiver || "",
          receiverMobile: (item.address || {}).phone || "",
          receiverAddress: buildReceiverAddress(item.address || {}),
          payableAmountCent: Math.round(toNumber(item.payableAmount) * 100),
          payableAmountText: formatMoney(item.payableAmount),
          createdAt: formatDateTime(item.createdAt),
          paidAt: formatDateTime(item.createdAt)
        })),
        total,
        options
      );
    },
    async shipAdminOrder(orderId, payload = {}) {
      assertAdminShipmentPayload(payload);

      const prisma = await getPrisma();
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.order.findFirst({
          where: {
            orderNo: orderId
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });

        if (!current) {
          return null;
        }

        assertAdminShipmentAllowed(current);

        return tx.order.update({
          where: {
            id: current.id
          },
          data: {
            status: "shipping",
            shipmentCompanyCode: payload.companyCode || null,
            shipmentCompanyName: payload.companyName,
            shipmentTrackingNo: payload.trackingNo,
            shippedAt: new Date()
          },
          include: {
            address: true,
            user: true,
            afterSale: true,
            items: {
              orderBy: {
                createdAt: "asc"
              }
            }
          }
        });
      });

      if (!updated) {
        return null;
      }

      return {
        order: buildAdminOrderDetail(updated),
        shipment: mapAdminShipment(updated)
      };
    },
    async getAdminAfterSales(options = {}) {
      const prisma = await getPrisma();
      const where = buildAdminAfterSaleWhere(options);
      const pagination = getPaginationQuery(options);
      const [total, afterSales] = await Promise.all([
        prisma.afterSale.count({
          where
        }),
        prisma.afterSale.findMany({
          where,
          include: {
            user: true,
            order: {
              include: {
                address: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          skip: pagination.skip,
          take: pagination.take
        })
      ]);

      return buildPaginatedResult(
        afterSales.map((item) => buildAdminAfterSaleDetail(item)),
        total,
        options
      );
    },
    async reviewAdminAfterSale(afterSaleId, action, remark = "", actor = {}) {
      const nextStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "";

      if (!nextStatus) {
        throw createStorefrontError("缺少有效的售后处理动作", 400, "AFTERSALE_ACTION_REQUIRED");
      }

      const prisma = await getPrisma();
      const updated = await prisma.$transaction(async (tx) => {
        const current = await tx.afterSale.findUnique({
          where: {
            id: afterSaleId
          },
          include: {
            user: true,
            order: {
              include: {
                address: true
              }
            }
          }
        });

        if (!current) {
          return null;
        }

        if (current.status !== "processing") {
          if (current.status === nextStatus) {
            return current;
          }

          throw createStorefrontError("售后单已处理，请勿重复操作", 409, "AFTERSALE_ALREADY_REVIEWED");
        }

        if (nextStatus === "approved") {
          await reverseOrderCommissionRecords(tx, ((current.order || {}).orderNo) || "");
        }

        return tx.afterSale.update({
          where: {
            id: current.id
          },
          data: {
            status: nextStatus,
            reviewRemark: remark || null,
            reviewedAt: new Date(),
            reviewedBy: String(actor.realName || actor.username || "系统管理员").trim() || "系统管理员"
          },
          include: {
            user: true,
            order: {
              include: {
                address: true
              }
            }
          }
        });
      });

      return updated ? buildAdminAfterSaleDetail(updated) : null;
    }
  };
}

module.exports = {
  createStorefrontPrismaAdminRepository
};
