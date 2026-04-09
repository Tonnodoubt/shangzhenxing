function createStorefrontPrismaProfileModule({
  cartHelpers,
  couponHelpers,
  distributionHelpers,
  getCurrentUserContext,
  getWechatPhoneNumber,
  mapAddress,
  mapUser,
  mapUserCoupon
}) {
  return {
    methods: {
      async getProfileData(sessionToken) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);

        await couponHelpers.ensureCouponFeatureData(prisma, user.id);

        const { distributor } = await distributionHelpers.getDistributorContext(prisma, user);
        const [selectedAddress, coupons, cartItems, orderCount] = await Promise.all([
          cartHelpers.getSelectedAddress(prisma, user.id),
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
          }),
          cartHelpers.getCartItems(prisma, user.id),
          prisma.order.count({
            where: {
              userId: user.id
            }
          })
        ]);

        return {
          user: mapUser(user),
          address: mapAddress(selectedAddress) || {},
          coupons: coupons.map((item) => mapUserCoupon(item)),
          cartCount: cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
          runtimeOrderCount: orderCount,
          distributor
        };
      },
      async authorizeUser(sessionToken, payload = {}) {
        const { prisma, user } = await getCurrentUserContext(sessionToken);
        const nextNickname = String(payload.nickname || "").trim() || user.nickname || "微信用户";
        const nextAvatarUrl = String(payload.avatarUrl || "").trim() || user.avatarUrl || null;
        let nextMobile = user.mobile || null;

        if (String(payload.phoneCode || "").trim()) {
          const phoneInfo = await getWechatPhoneNumber(payload.phoneCode);

          nextMobile = phoneInfo.phoneNumber || phoneInfo.purePhoneNumber || nextMobile;
        }

        const updated = await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            nickname: nextNickname,
            avatarUrl: nextAvatarUrl,
            mobile: nextMobile,
            isAuthorized: true
          }
        });

        return mapUser(updated);
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaProfileModule
};
