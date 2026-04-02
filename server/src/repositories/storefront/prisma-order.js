function createStorefrontPrismaOrderModule({
  assertUserOrderStatusTransition,
  buildCheckoutSummary,
  buildPublicOrderNo,
  couponHelpers,
  createStorefrontError,
  distributionHelpers,
  getCartItems,
  getCartRecord,
  getCurrentUserContext,
  getSelectedAddress,
  mapAfterSale,
  mapOrder,
  toNumber
}) {
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
          const checkoutSummary = buildCheckoutSummary(
            currentCartItems,
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
          const referralSnapshot = await distributionHelpers.buildOrderReferralSnapshot(tx, user, currentCartItems);

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
              remark: payload.remark || ""
            }
          });

          for (const item of currentCartItems) {
            await tx.orderItem.create({
              data: {
                orderId: nextOrder.id,
                productId: item.productId,
                skuId: item.skuId || null,
                title: item.title,
                specText: item.specText || "",
                price: toNumber(item.price),
                quantity: Number(item.quantity || 0),
                subtotalAmount: toNumber(item.price) * Number(item.quantity || 0)
              }
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
      async getAllOrders(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await syncPendingOrderLifecycle(prisma, user.id);

        const orders = await prisma.order.findMany({
          where: {
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
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        return orders.map((item) => mapOrder(item));
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
