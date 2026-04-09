function createStorefrontPrismaOrderModule({
  assertUserOrderStatusTransition,
  buildPaginatedResult,
  buildCheckoutSummary,
  buildPublicOrderNo,
  couponHelpers,
  createStorefrontError,
  distributionHelpers,
  getPaginationQuery,
  getCartItems,
  getCartRecord,
  getCurrentUserContext,
  getSelectedAddress,
  mapAfterSale,
  mapOrder,
  toNumber
}) {
  function getSellableStock(sku = {}) {
    return Math.max(0, Number(sku.stock || 0) - Number(sku.lockStock || 0));
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
    for (const item of orderItems) {
      const quantity = Math.max(0, Number(item.quantity || 0));

      if (!item.skuId || quantity <= 0) {
        continue;
      }

      await tx.productSku.update({
        where: {
          id: item.skuId
        },
        data: {
          stock: {
            increment: quantity
          }
        }
      });
    }
  }

  async function getOrderRecord(prisma, userId, orderNo) {
    return prisma.order.findFirst({
      where: {
        orderNo,
        userId
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
          const referralSnapshot = await distributionHelpers.buildOrderReferralSnapshot(tx, user, normalizedCartItems);

          const nextOrder = await tx.order.create({
            data: {
              orderNo,
              userId: user.id,
              addressId: currentAddress ? currentAddress.id : null,
              referralBindingId: referralSnapshot.referralBindingId,
              inviterUserId: referralSnapshot.inviterUserId,
              status: "pending",
              sourceScene: referralSnapshot.sourceScene,
              goodsAmount: checkoutSummary.goodsAmountNumber,
              discountAmount: checkoutSummary.discountAmountNumber,
              payableAmount: checkoutSummary.payableAmountNumber,
              commissionBaseAmount: referralSnapshot.commissionBaseAmount,
              commissionRate: referralSnapshot.commissionRate,
              commissionAmount: referralSnapshot.commissionAmount,
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

          // ── 库存校验 & 扣减 ──
          for (const item of normalizedCartItems) {
            const qty = Number(item.quantity || 0);

            await tx.productSku.update({
              where: {
                id: item.skuId
              },
              data: {
                stock: {
                  decrement: qty
                }
              }
            });

            await tx.orderItem.create({
              data: {
                orderId: nextOrder.id,
                productId: item.productId,
                skuId: item.skuId,
                title: item.title,
                specText: item.specText || "",
                price: item.price,
                quantity: qty,
                subtotalAmount: item.price * qty
              }
            });

            // 累加商品销量
            await tx.product.update({
              where: { id: item.productId },
              data: { salesCount: { increment: qty } }
            });
          }

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
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaOrderModule
};
