const { getSellableStock } = require("./prisma-utils");
const {
  prepareWechatJsapiPayment,
  parseWechatPayNotification
} = require("../../lib/wechat-pay");

function createStorefrontPrismaOrderModule({
  assertUserOrderStatusTransition,
  buildPaginatedResult,
  buildCheckoutSummary,
  buildPublicOrderNo,
  couponHelpers,
  createStorefrontError,
  distributionHelpers,
  formatDateTime,
  getPrisma,
  getPaginationQuery,
  getCartItems,
  getCartRecord,
  getCurrentUserContext,
  getSelectedAddress,
  mapAfterSale,
  mapOrder,
  toNumber,
  prepareWechatJsapiPaymentFn = prepareWechatJsapiPayment,
  parseWechatPayNotificationFn = parseWechatPayNotification
}) {
  const PAYMENT_PREPARE_EXPIRE_MS = 15 * 60 * 1000;

  function resolvePaymentProvider() {
    const requested = String(process.env.PAYMENT_PROVIDER || "mock").trim().toLowerCase();

    if (requested === "wechat_jsapi") {
      return "wechat_jsapi";
    }

    return "mock";
  }

  function buildMockPaymentNo(date = new Date()) {
    return [
      "MP",
      date.getTime(),
      Math.floor(Math.random() * 1000000).toString().padStart(6, "0")
    ].join("");
  }

  function buildMockToken() {
    return `mock_${Math.random().toString(36).slice(2, 14)}`;
  }

  function getPaymentStatusText(status) {
    const normalized = String(status || "").trim();

    if (normalized === "paid") {
      return "支付成功";
    }

    if (normalized === "failed") {
      return "支付失败";
    }

    if (normalized === "closed") {
      return "已关闭";
    }

    if (normalized === "paying") {
      return "支付中";
    }

    if (normalized === "prepared") {
      return "待支付";
    }

    return "待发起";
  }

  function normalizeWechatTradeStateToPaymentStatus(state) {
    const normalized = String(state || "").trim().toUpperCase();

    if (normalized === "SUCCESS") {
      return "paid";
    }

    if (normalized === "CLOSED" || normalized === "REVOKED") {
      return "closed";
    }

    if (normalized === "PAYERROR") {
      return "failed";
    }

    if (normalized === "NOTPAY" || normalized === "USERPAYING") {
      return "paying";
    }

    return "paying";
  }

  function parseSuccessTime(value) {
    const normalized = String(value || "").trim();

    if (!normalized) {
      return null;
    }

    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  function mapPaymentRecord(record = {}, order = null) {
    const status = String(record.status || "unprepared").trim() || "unprepared";
    const provider = String(record.provider || "mock").trim() || "mock";
    let parsedRequestPayload = {};

    if (record && record.requestPayloadJson) {
      try {
        parsedRequestPayload = JSON.parse(record.requestPayloadJson) || {};
      } catch (_error) {
        parsedRequestPayload = {};
      }
    }
    const requestPaymentFromRecord = parsedRequestPayload && typeof parsedRequestPayload === "object"
      ? parsedRequestPayload.requestPayment
      : null;

    return {
      orderId: (order && order.orderNo) || record.orderNo || "",
      orderNo: (order && order.orderNo) || record.orderNo || "",
      paymentNo: record.paymentNo || "",
      provider,
      status,
      statusText: getPaymentStatusText(status),
      amount: toNumber((order && order.payableAmount) || record.amount),
      currency: record.currency || "CNY",
      mockFlow: provider === "mock",
      mockToken: provider === "mock" && status !== "paid" ? (record.mockToken || "") : "",
      preparedAt: formatDateTime(record.preparedAt),
      paidAt: formatDateTime(record.paidAt),
      expiresAt: formatDateTime(record.expiresAt),
      requestPayment: provider === "mock"
        ? {
            timeStamp: String(Math.floor(Date.now() / 1000)),
            nonceStr: record.mockToken || buildMockToken(),
            package: `prepay_id=mock_${record.paymentNo || "pending"}`,
            signType: "RSA",
            paySign: "MOCK_SIGN"
          }
        : (requestPaymentFromRecord || null),
      order: order ? mapOrder(order) : null
    };
  }

  async function getOrderPaymentRecordByOrderNo(tx, userId, orderNo) {
    const order = await getOrderRecord(tx, userId, orderNo);

    if (!order) {
      return null;
    }

    const payment = await tx.paymentOrder.findUnique({
      where: {
        orderId: order.id
      }
    }).catch(() => null);

    return {
      order,
      payment
    };
  }

  async function resolveOrderCartItem(tx, item = {}) {
    const product = await tx.product.findUnique({
      where: {
        id: item.productId
      },
      include: {
        skus: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!product) {
      throw createStorefrontError(
        `「${item.title || "商品"}」不存在`,
        404,
        "PRODUCT_NOT_FOUND"
      );
    }

    if (product.status !== "on_sale") {
      throw createStorefrontError(
        `「${product.title || item.title || "商品"}」已下架`,
        409,
        "PRODUCT_OFF_SALE"
      );
    }

    const enabledSkus = (product.skus || []).filter((sku) => sku.status === "enabled");

    if (!enabledSkus.length) {
      throw createStorefrontError(
        `「${product.title || item.title || "商品"}」规格不存在`,
        404,
        "SKU_NOT_FOUND"
      );
    }

    const normalizedSpecText = String(item.specText || "").trim();
    let matchedSku = item.skuId ? enabledSkus.find((sku) => sku.id === item.skuId) : null;

    if (!matchedSku && normalizedSpecText) {
      matchedSku = enabledSkus.find((sku) => String(sku.specText || "").trim() === normalizedSpecText);
    }

    if (!matchedSku && enabledSkus.length === 1) {
      matchedSku = enabledSkus[0];
    }

    if (!matchedSku) {
      throw createStorefrontError(
        `「${product.title || item.title || "商品"}」规格不存在`,
        404,
        "SKU_NOT_FOUND"
      );
    }

    return {
      ...item,
      productId: product.id,
      title: product.title || item.title || "",
      skuId: matchedSku.id,
      specText: String(matchedSku.specText || normalizedSpecText || "").trim(),
      price: toNumber(matchedSku.price || item.price || product.price),
      quantity: Math.max(1, Number(item.quantity || 0)),
      product,
      sku: matchedSku
    };
  }

  async function restoreOrderStock(tx, orderItems = []) {
    const updates = orderItems
      .filter((item) => item.skuId && Math.max(0, Number(item.quantity || 0)) > 0)
      .map((item) =>
        tx.productSku.update({
          where: { id: item.skuId },
          data: { stock: { increment: Math.max(0, Number(item.quantity || 0)) } }
        })
      );

    await Promise.all(updates);
  }

  async function getOrderRecord(prisma, userId, orderNo) {
    return prisma.order.findFirst({
      where: {
        orderNo,
        userId
      },
      include: {
        user: true,
        address: true,
        afterSale: true,
        items: {
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });
  }

  async function syncPendingOrderLifecycle(prisma, userId) {
    return {
      prisma,
      userId
    };
  }

  function mapPublicAfterSale(record, order) {
    if (!record) {
      return null;
    }

    return mapAfterSale({
      ...record,
      orderId: order && order.orderNo ? order.orderNo : record.orderId
    });
  }

  return {
    helpers: {
      getOrderRecord,
      restoreOrderStock,
      syncPendingOrderLifecycle
    },
    methods: {
      async submitOrder(sessionToken, payload = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await couponHelpers.ensureCouponFeatureData(prisma, user.id);

        const cartItems = await getCartItems(prisma, user.id);

        if (!cartItems.length) {
          return {
            ok: false,
            message: "购物车为空"
          };
        }

        const selectedAddress = await getSelectedAddress(prisma, user.id);

        if (!selectedAddress) {
          return {
            ok: false,
            message: "请先选择地址"
          };
        }

        const orderNo = buildPublicOrderNo();

        return prisma.$transaction(async (tx) => {
          const cart = await getCartRecord(tx, user.id);
          const currentCartItems = await getCartItems(tx, user.id);
          const currentAddress = await getSelectedAddress(tx, user.id);
          const selectedCoupon = await couponHelpers.getSelectedCouponRecord(tx, user.id, cart);
          const normalizedCartItems = [];
          const remainingStockBySku = new Map();

          for (const item of currentCartItems) {
            const normalizedItem = await resolveOrderCartItem(tx, item);
            const currentAvailableStock = remainingStockBySku.has(normalizedItem.skuId)
              ? remainingStockBySku.get(normalizedItem.skuId)
              : getSellableStock(normalizedItem.sku);

            if (currentAvailableStock < normalizedItem.quantity) {
              throw createStorefrontError(
                `「${normalizedItem.title || "商品"}」库存不足`,
                400,
                "STOCK_INSUFFICIENT"
              );
            }

            remainingStockBySku.set(normalizedItem.skuId, currentAvailableStock - normalizedItem.quantity);
            normalizedCartItems.push(normalizedItem);
          }

          const checkoutSummary = buildCheckoutSummary(
            normalizedCartItems,
            selectedCoupon
              ? {
                  amount: toNumber((selectedCoupon.template || {}).amount),
                  threshold: toNumber((selectedCoupon.template || {}).threshold)
                }
              : null
          );
          const appliedCoupon = selectedCoupon && checkoutSummary.discountAmountNumber > 0
            ? selectedCoupon
            : null;
          const rawReferralSnapshot = await distributionHelpers.buildOrderReferralSnapshot(tx, user, normalizedCartItems);
          const referralSnapshot = rawReferralSnapshot || {};
          const commissionBaseAmount = toNumber(referralSnapshot.commissionBaseAmount);
          const commissionRate = toNumber(referralSnapshot.commissionRate);
          const commissionAmount = toNumber(referralSnapshot.commissionAmount);
          const levelTwoCommissionRate = toNumber(referralSnapshot.levelTwoCommissionRate);
          const levelTwoCommissionAmount = toNumber(referralSnapshot.levelTwoCommissionAmount);

          const nextOrder = await tx.order.create({
            data: {
              orderNo,
              userId: user.id,
              addressId: currentAddress ? currentAddress.id : null,
              referralBindingId: referralSnapshot.referralBindingId || null,
              inviterUserId: referralSnapshot.inviterUserId || null,
              levelTwoInviterUserId: referralSnapshot.levelTwoInviterUserId || null,
              status: "pending",
              sourceScene: referralSnapshot.sourceScene || "direct",
              ruleVersionId: referralSnapshot.ruleVersionId || null,
              goodsAmount: checkoutSummary.goodsAmountNumber,
              discountAmount: checkoutSummary.discountAmountNumber,
              payableAmount: checkoutSummary.payableAmountNumber,
              commissionBaseAmount,
              commissionRate,
              commissionAmount,
              levelTwoCommissionRate,
              levelTwoCommissionAmount,
              couponTitle: appliedCoupon ? (appliedCoupon.template || {}).title || "" : null,
              remark: payload.remark || "",
              // 地址快照
              snapReceiver: currentAddress ? currentAddress.receiver : null,
              snapPhone: currentAddress ? currentAddress.phone : null,
              snapAddress: currentAddress
                ? [currentAddress.province, currentAddress.city, currentAddress.district, currentAddress.detail].filter(Boolean).join(" ")
                : null
            }
          });

          // ── 库存扣减 & 订单项 & 销量（批量操作） ──
          await tx.orderItem.createMany({
            data: normalizedCartItems.map((item) => ({
              orderId: nextOrder.id,
              productId: item.productId,
              skuId: item.skuId,
              title: item.title,
              specText: item.specText || "",
              price: item.price,
              quantity: Number(item.quantity || 0),
              subtotalAmount: item.price * Number(item.quantity || 0)
            }))
          });

          await Promise.all([
            ...normalizedCartItems.map((item) =>
              tx.productSku.update({
                where: { id: item.skuId },
                data: { stock: { decrement: Number(item.quantity || 0) } }
              })
            ),
            ...normalizedCartItems.map((item) =>
              tx.product.update({
                where: { id: item.productId },
                data: { salesCount: { increment: Number(item.quantity || 0) } }
              })
            )
          ]);

          if (appliedCoupon) {
            await tx.userCoupon.update({
              where: {
                id: appliedCoupon.id
              },
              data: {
                status: "used",
                usedAt: new Date(),
                usedOrderId: nextOrder.id
              }
            });
          }

          await tx.cart.update({
            where: {
              id: cart.id
            },
            data: {
              selectedCouponId: null
            }
          });

          await tx.cartItem.deleteMany({
            where: {
              cartId: cart.id
            }
          });

          const order = await tx.order.findUnique({
            where: {
              id: nextOrder.id
            },
            include: {
              address: true,
              afterSale: true,
              items: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          });

          return {
            ok: true,
            order: mapOrder(order)
          };
        });
      },
      async getAllOrders(sessionToken, options = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const pagination = getPaginationQuery(options);
        const status = String(options.status || "all").trim();
        const where = {
          userId: user.id
        };

        if (status && status !== "all") {
          where.status = status;
        }

        await syncPendingOrderLifecycle(prisma, user.id);

        const [orders, total] = await Promise.all([
          prisma.order.findMany({
            where,
            include: {
              address: true,
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
          }),
          prisma.order.count({
            where
          })
        ]);

        return buildPaginatedResult(orders.map((item) => mapOrder(item)), total, pagination);
      },
      async getOrderDetail(sessionToken, orderId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await syncPendingOrderLifecycle(prisma, user.id);

        const order = await getOrderRecord(prisma, user.id, orderId);

        return {
          order: order ? mapOrder(order) : null,
          afterSale: order && order.afterSale ? mapPublicAfterSale(order.afterSale, order) : null
        };
      },
      async updateOrderStatus(sessionToken, orderId, status) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const updated = await prisma.$transaction(async (tx) => {
          const current = await tx.order.findFirst({
            where: {
              orderNo: orderId,
              userId: user.id
            },
            include: {
              address: true,
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

          assertUserOrderStatusTransition(current.status, status);

          if (current.status === status) {
            return current;
          }

          const nextOrder = await tx.order.update({
            where: {
              id: current.id
            },
            data: {
              status
            },
            include: {
              address: true,
              afterSale: true,
              items: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          });

          if (current.status === "pending" && status === "cancelled") {
            await restoreOrderStock(tx, current.items);
            await couponHelpers.restoreUsedCouponForOrder(tx, current.id);
          }

          if (current.status === "shipping" && status === "done") {
            await distributionHelpers.syncDistributionAfterOrderDone(tx, user, nextOrder);
          }

          return tx.order.findUnique({
            where: {
              id: current.id
            },
            include: {
              address: true,
              afterSale: true,
              items: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          });
        });

        return updated ? mapOrder(updated) : null;
      },
      async createAfterSale(payload = {}) {
        const { prisma, user } = await getCurrentUserContext(payload.sessionToken);

        await syncPendingOrderLifecycle(prisma, user.id);

        const order = await getOrderRecord(prisma, user.id, payload.orderId);

        if (!order) {
          throw createStorefrontError("订单不存在", 404, "ORDER_NOT_FOUND");
        }

        if (order.afterSale) {
          throw createStorefrontError("该订单已提交售后", 409, "AFTERSALE_ALREADY_EXISTS");
        }

        if (order.status !== "shipping" && order.status !== "done") {
          throw createStorefrontError("当前订单暂不可售后", 400, "AFTERSALE_NOT_ALLOWED");
        }

        const afterSale = await prisma.afterSale.create({
          data: {
            orderId: order.id,
            userId: user.id,
            reason: payload.reason || "不想要了",
            description: payload.description || "",
            status: "processing"
          }
        });

        return mapPublicAfterSale(afterSale, order);
      },
      async prepareOrderPayment(sessionToken, orderId, payload = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const provider = resolvePaymentProvider();

        return prisma.$transaction(async (tx) => {
          const current = await getOrderPaymentRecordByOrderNo(tx, user.id, orderId);

          if (!current || !current.order) {
            return null;
          }

          if (current.order.status === "cancelled") {
            throw createStorefrontError("已取消订单不支持发起支付", 409, "ORDER_PAYMENT_NOT_ALLOWED");
          }

          if (provider !== "mock") {
            if (provider !== "wechat_jsapi") {
              throw createStorefrontError(
                "暂不支持当前支付通道，请使用 mock 或 wechat_jsapi",
                400,
                "PAYMENT_PROVIDER_NOT_READY"
              );
            }
          }

          if (current.payment && current.payment.status === "paid") {
            return mapPaymentRecord(current.payment, current.order);
          }

          const now = new Date();
          const scene = String(payload.scene || "checkout").trim() || "checkout";
          let nextRecordData = null;

          if (provider === "wechat_jsapi") {
            const payerOpenId = String((((current.order || {}).user) || {}).openId || "").trim();
            const totalAmountFen = Math.max(0, Math.round(toNumber(current.order.payableAmount) * 100));
            const prepared = await prepareWechatJsapiPaymentFn({
              outTradeNo: current.order.orderNo,
              description: `商城订单 ${current.order.orderNo}`,
              totalAmountFen,
              payerOpenId,
              attach: JSON.stringify({
                scene,
                orderNo: current.order.orderNo
              })
            });

            nextRecordData = {
              orderId: current.order.id,
              orderNo: current.order.orderNo,
              userId: user.id,
              provider: "wechat_jsapi",
              status: "prepared",
              amount: toNumber(current.order.payableAmount),
              currency: "CNY",
              paymentNo: prepared.prepayId,
              mockToken: null,
              preparedAt: now,
              expiresAt: new Date(now.getTime() + PAYMENT_PREPARE_EXPIRE_MS),
              requestPayloadJson: JSON.stringify({
                scene,
                prepayId: prepared.prepayId,
                requestPayment: prepared.requestPayment
              })
            };
          } else {
            nextRecordData = {
              orderId: current.order.id,
              orderNo: current.order.orderNo,
              userId: user.id,
              provider: "mock",
              status: "prepared",
              amount: toNumber(current.order.payableAmount),
              currency: "CNY",
              paymentNo: current.payment && current.payment.paymentNo ? current.payment.paymentNo : buildMockPaymentNo(now),
              mockToken: buildMockToken(),
              preparedAt: now,
              expiresAt: new Date(now.getTime() + PAYMENT_PREPARE_EXPIRE_MS),
              requestPayloadJson: JSON.stringify({
                scene
              })
            };
          }
          const nextPayment = current.payment
            ? await tx.paymentOrder.update({
                where: {
                  id: current.payment.id
                },
                data: nextRecordData
              })
            : await tx.paymentOrder.create({
                data: nextRecordData
              });

          return mapPaymentRecord(nextPayment, current.order);
        });
      },
      async getOrderPayment(sessionToken, orderId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const current = await getOrderPaymentRecordByOrderNo(prisma, user.id, orderId);

        if (!current || !current.order) {
          return null;
        }

        if (!current.payment) {
          return mapPaymentRecord({
            provider: resolvePaymentProvider(),
            status: "unprepared",
            amount: toNumber(current.order.payableAmount)
          }, current.order);
        }

        return mapPaymentRecord(current.payment, current.order);
      },
      async confirmMockOrderPayment(sessionToken, orderId, payload = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        return prisma.$transaction(async (tx) => {
          const current = await getOrderPaymentRecordByOrderNo(tx, user.id, orderId);

          if (!current || !current.order) {
            return null;
          }

          if (!current.payment) {
            throw createStorefrontError("请先发起支付", 409, "PAYMENT_NOT_PREPARED");
          }

          if (current.payment.provider !== "mock") {
            throw createStorefrontError("当前支付单不支持 mock 确认", 409, "PAYMENT_PROVIDER_NOT_READY");
          }

          if (current.payment.status === "paid") {
            return mapPaymentRecord(current.payment, current.order);
          }

          const incomingMockToken = String(payload.mockToken || "").trim();

          if (incomingMockToken && current.payment.mockToken && incomingMockToken !== current.payment.mockToken) {
            throw createStorefrontError("支付确认凭证无效，请重试", 400, "PAYMENT_TOKEN_INVALID");
          }

          const updated = await tx.paymentOrder.update({
            where: {
              id: current.payment.id
            },
            data: {
              status: "paid",
              paidAt: new Date(),
              resultPayloadJson: JSON.stringify({
                scene: String(payload.scene || "checkout").trim() || "checkout",
                confirmedBy: "mock_confirm"
              })
            }
          });

          return mapPaymentRecord(updated, current.order);
        });
      },
      async handleWechatPayNotify(payload = {}) {
        if (typeof getPrisma !== "function") {
          throw createStorefrontError("当前环境不支持微信支付回调处理", 503, "PAYMENT_PROVIDER_NOT_READY");
        }

        const prisma = await getPrisma();
        const notification = await parseWechatPayNotificationFn(payload);
        const orderNo = String(notification.outTradeNo || "").trim();
        const paymentStatus = normalizeWechatTradeStateToPaymentStatus(notification.tradeState);
        const successTime = parseSuccessTime(notification.successTime);

        if (!orderNo) {
          throw createStorefrontError("微信支付回调缺少订单号", 400, "PAYMENT_REQUEST_INVALID");
        }

        return prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({
            where: {
              orderNo
            },
            include: {
              user: true,
              address: true,
              afterSale: true,
              items: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          });

          if (!order) {
            return null;
          }

          const currentPayment = await tx.paymentOrder.findUnique({
            where: {
              orderId: order.id
            }
          }).catch(() => null);

          if (currentPayment && currentPayment.status === "paid") {
            return mapPaymentRecord(currentPayment, order);
          }

          const now = new Date();
          const paidAt = paymentStatus === "paid" ? (successTime || now) : null;
          const paymentNo = String(notification.transactionId || "").trim()
            || (currentPayment && currentPayment.paymentNo)
            || null;
          const resultPayloadJson = JSON.stringify({
            notifyId: notification.notifyId || "",
            eventType: notification.eventType || "",
            summary: notification.summary || "",
            tradeState: notification.tradeState || "",
            transactionId: notification.transactionId || "",
            transaction: notification.transaction || null
          });
          const nextData = {
            provider: "wechat_jsapi",
            status: paymentStatus,
            amount: toNumber(order.payableAmount),
            currency: "CNY",
            paymentNo,
            mockToken: null,
            paidAt,
            resultPayloadJson
          };
          const nextPayment = currentPayment
            ? await tx.paymentOrder.update({
                where: {
                  id: currentPayment.id
                },
                data: {
                  ...nextData,
                  preparedAt: currentPayment.preparedAt || now
                }
              })
            : await tx.paymentOrder.create({
                data: {
                  orderId: order.id,
                  orderNo: order.orderNo,
                  userId: order.userId,
                  ...nextData,
                  preparedAt: now
                }
              });

          return mapPaymentRecord(nextPayment, order);
        });
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaOrderModule
};
