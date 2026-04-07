function createStorefrontPrismaCouponModule({
  defaultCouponTemplates,
  defaultGrantedCoupons,
  buildCheckoutSummary,
  ensureCart,
  getCartItems,
  getCartRecord,
  getCurrentUserContext,
  getSelectedAddress,
  mapAddress,
  mapCartItem,
  mapCouponTemplate,
  mapUserCoupon,
  toNumber
}) {
  async function syncExpiredCoupons(prisma, userId) {
    await prisma.userCoupon.updateMany({
      where: {
        userId,
        status: "available",
        expiresAt: {
          lte: new Date()
        }
      },
      data: {
        status: "expired"
      }
    });
  }

  async function ensureCouponTemplates(prisma) {
    for (const template of defaultCouponTemplates) {
      await prisma.couponTemplate.upsert({
        where: {
          code: template.code
        },
        update: {
          title: template.title,
          amount: template.amount,
          threshold: template.threshold,
          badge: template.badge,
          description: template.description,
          issueType: template.issueType,
          validDays: template.validDays,
          status: template.status,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt
        },
        create: {
          code: template.code,
          title: template.title,
          amount: template.amount,
          threshold: template.threshold,
          badge: template.badge,
          description: template.description,
          issueType: template.issueType,
          validDays: template.validDays,
          status: template.status,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt
        }
      });
    }
  }

  async function ensureUserCouponExperienceData(prisma, userId) {
    await ensureCouponTemplates(prisma);

    const templates = await prisma.couponTemplate.findMany({
      where: {
        code: {
          in: defaultGrantedCoupons.map((item) => item.templateCode)
        }
      }
    });
    const templateByCode = new Map(templates.map((item) => [item.code, item]));

    for (const seed of defaultGrantedCoupons) {
      const template = templateByCode.get(seed.templateCode);

      if (!template) {
        continue;
      }

      const existing = await prisma.userCoupon.findFirst({
        where: {
          userId,
          templateId: template.id,
          sourceType: seed.sourceType,
          sourceText: seed.sourceText
        }
      });

      if (existing) {
        continue;
      }

      await prisma.userCoupon.create({
        data: {
          userId,
          templateId: template.id,
          status: "available",
          sourceType: seed.sourceType,
          sourceText: seed.sourceText,
          claimedAt: seed.claimedAt,
          expiresAt: seed.expiresAt,
          createdAt: seed.claimedAt,
          updatedAt: seed.claimedAt
        }
      });
    }
  }

  async function ensureCouponFeatureData(prisma, userId) {
    await ensureUserCouponExperienceData(prisma, userId);
    await syncExpiredCoupons(prisma, userId);
  }

  async function findUserCouponById(prisma, userId, couponId) {
    const coupon = await prisma.userCoupon.findFirst({
      where: {
        id: couponId,
        userId
      },
      include: {
        template: true
      }
    });

    if (!coupon) {
      return null;
    }

    if (coupon.status === "available" && coupon.expiresAt instanceof Date && coupon.expiresAt.getTime() <= Date.now()) {
      await prisma.userCoupon.update({
        where: {
          id: coupon.id
        },
        data: {
          status: "expired"
        }
      });

      return {
        ...coupon,
        status: "expired"
      };
    }

    return coupon;
  }

  async function getSelectedCouponRecord(prisma, userId, cart) {
    if (!cart || !cart.selectedCouponId) {
      return null;
    }

    const coupon = await findUserCouponById(prisma, userId, cart.selectedCouponId);

    if (!coupon || coupon.status !== "available") {
      await prisma.cart.update({
        where: {
          id: cart.id
        },
        data: {
          selectedCouponId: null
        }
      }).catch(() => null);

      return null;
    }

    return coupon;
  }

  async function restoreUsedCouponForOrder(prisma, orderId) {
    const usedCoupon = await prisma.userCoupon.findFirst({
      where: {
        usedOrderId: orderId
      }
    });

    if (!usedCoupon || usedCoupon.status !== "used") {
      return null;
    }

    return prisma.userCoupon.update({
      where: {
        id: usedCoupon.id
      },
      data: {
        status: "available",
        usedAt: null,
        usedOrderId: null
      }
    });
  }

  return {
    helpers: {
      ensureCouponFeatureData,
      getSelectedCouponRecord,
      restoreUsedCouponForOrder
    },
    methods: {
      async getCouponPageData(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await ensureCouponFeatureData(prisma, user.id);

        const cart = await getCartRecord(prisma, user.id);
        const selectedCoupon = await getSelectedCouponRecord(prisma, user.id, cart);
        const [templates, coupons] = await Promise.all([
          prisma.couponTemplate.findMany({
            where: {
              status: "enabled"
            },
            orderBy: [
              {
                createdAt: "asc"
              }
            ]
          }),
          prisma.userCoupon.findMany({
            where: {
              userId: user.id
            },
            include: {
              template: true
            },
            orderBy: [
              {
                claimedAt: "desc"
              }
            ]
          })
        ]);
        const centerTemplates = [];

        for (const template of templates) {
          const [receivedCount, usedCount, claimedCount] = await Promise.all([
            prisma.userCoupon.count({
              where: {
                templateId: template.id
              }
            }),
            prisma.userCoupon.count({
              where: {
                templateId: template.id,
                status: "used"
              }
            }),
            prisma.userCoupon.count({
              where: {
                templateId: template.id,
                userId: user.id,
                sourceType: "center_claim"
              }
            })
          ]);

          centerTemplates.push(mapCouponTemplate(template, {
            receivedCount,
            usedCount,
            claimed: claimedCount > 0
          }));
        }

        return {
          centerTemplates,
          coupons: coupons.map((item) => mapUserCoupon(item)),
          selectedCouponId: selectedCoupon ? selectedCoupon.id : ""
        };
      },
      async claimCoupon(sessionToken, templateId) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await ensureCouponFeatureData(prisma, user.id);

        const template = await prisma.couponTemplate.findFirst({
          where: {
            id: templateId,
            status: "enabled"
          }
        });

        if (!template) {
          return {
            ok: false
          };
        }

        // 事务内查重 + 创建，防止并发重复领取
        const coupon = await prisma.$transaction(async (tx) => {
          const existing = await tx.userCoupon.findFirst({
            where: {
              userId: user.id,
              templateId: template.id,
              sourceType: "center_claim"
            }
          });

          if (existing) {
            return null;
          }

          const claimedAt = new Date();

          return tx.userCoupon.create({
            data: {
              userId: user.id,
              templateId: template.id,
              status: "available",
              sourceType: "center_claim",
              sourceText: "领券中心",
              claimedAt,
              expiresAt: new Date(claimedAt.getTime() + Number(template.validDays || 0) * 24 * 60 * 60 * 1000)
            },
            include: {
              template: true
            }
          });
        });

        if (!coupon) {
          return {
            ok: false
          };
        }

        return {
          ok: true,
          coupon: mapUserCoupon(coupon)
        };
      },
      async selectCoupon(sessionToken, couponId, amount) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await ensureCouponFeatureData(prisma, user.id);

        const coupon = await findUserCouponById(prisma, user.id, couponId);

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

        if (Number(amount || 0) < toNumber((coupon.template || {}).threshold)) {
          return {
            ok: false,
            message: "当前金额还不能用这张券"
          };
        }

        const cart = await ensureCart(prisma, user.id);

        await prisma.cart.update({
          where: {
            id: cart.id
          },
          data: {
            selectedCouponId: coupon.id
          }
        });

        return {
          ok: true,
          coupon: mapUserCoupon(coupon)
        };
      },
      async clearSelectedCoupon(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const cart = await ensureCart(prisma, user.id);

        await prisma.cart.update({
          where: {
            id: cart.id
          },
          data: {
            selectedCouponId: null
          }
        });

        return {
          ok: true
        };
      },
      async getCheckoutPageData(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await ensureCouponFeatureData(prisma, user.id);

        const [cartItems, selectedAddress, cart] = await Promise.all([
          getCartItems(prisma, user.id),
          getSelectedAddress(prisma, user.id),
          getCartRecord(prisma, user.id)
        ]);
        const selectedCoupon = await getSelectedCouponRecord(prisma, user.id, cart);
        const checkoutSummary = buildCheckoutSummary(
          cartItems,
          selectedCoupon
            ? {
                amount: toNumber((selectedCoupon.template || {}).amount),
                threshold: toNumber((selectedCoupon.template || {}).threshold)
              }
            : null
        );

        return {
          address: mapAddress(selectedAddress),
          cartItems: cartItems.map((item) => mapCartItem(item)),
          totalCount: checkoutSummary.totalCount,
          goodsAmount: checkoutSummary.goodsAmount,
          discountAmount: checkoutSummary.discountAmount,
          payableAmount: checkoutSummary.payableAmount,
          goodsAmountNumber: checkoutSummary.goodsAmountNumber,
          selectedCoupon: selectedCoupon ? mapUserCoupon(selectedCoupon) : null
        };
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaCouponModule
};
