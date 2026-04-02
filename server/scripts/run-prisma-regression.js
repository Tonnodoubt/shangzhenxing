const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

process.env.STOREFRONT_DATA_SOURCE = "prisma";

const { getPrismaClient } = require("../src/lib/prisma");
const { createAdminService } = require("../src/modules/admin/service");
const { createStorefrontService } = require("../src/modules/storefront/service");
const { seedStorefrontCatalog } = require("../src/repositories/storefront/prisma-seeds");
const {
  setExchangeMiniProgramCodeOverrideForTest,
  resetExchangeMiniProgramCodeOverrideForTest
} = require("../src/lib/wechat-auth");

const DEMO_OPEN_ID = "demo-openid";
const INVITEE_OPEN_ID = "prisma-regression-invitee-openid";
const INVITEE_UNION_ID = "prisma-regression-invitee-unionid";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function resetDemoUserState(prisma) {
  const user = await prisma.user.findUnique({
    where: {
      openId: DEMO_OPEN_ID
    }
  });

  if (!user) {
    return;
  }

  const distributorProfile = await prisma.distributorProfile.findUnique({
    where: {
      userId: user.id
    }
  });
  const cart = await prisma.cart.findUnique({
    where: {
      userId: user.id
    }
  });

  await prisma.$transaction(async (tx) => {
    if (distributorProfile) {
      await tx.commissionRecord.deleteMany({
        where: {
          distributorId: distributorProfile.id
        }
      });
      await tx.teamMember.deleteMany({
        where: {
          distributorId: distributorProfile.id
        }
      });
      await tx.distributorProfile.delete({
        where: {
          id: distributorProfile.id
        }
      });
    }

    if (cart) {
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id
        }
      });
      await tx.cart.delete({
        where: {
          id: cart.id
        }
      });
    }

    await tx.afterSale.deleteMany({
      where: {
        userId: user.id
      }
    });
    await tx.userCoupon.deleteMany({
      where: {
        userId: user.id
      }
    });
    await tx.order.deleteMany({
      where: {
        userId: user.id
      }
    });
    await tx.address.deleteMany({
      where: {
        userId: user.id
      }
    });
    await tx.userSession.deleteMany({
      where: {
        userId: user.id
      }
    });
    await tx.user.update({
      where: {
        id: user.id
      },
      data: {
        nickname: "微信用户",
        mobile: "未授权手机号",
        isAuthorized: false
      }
    });
  });
}

async function cleanupWechatUsers(prisma, options = {}) {
  const openIds = (options.openIds || []).filter(Boolean);
  const unionIds = (options.unionIds || []).filter(Boolean);
  const whereClauses = [];

  if (openIds.length) {
    whereClauses.push({
      openId: {
        in: openIds
      }
    });
  }

  if (unionIds.length) {
    whereClauses.push({
      unionId: {
        in: unionIds
      }
    });
  }

  if (!whereClauses.length) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      OR: whereClauses
    }
  });
}

async function main() {
  const prisma = getPrismaClient();

  console.log("[prisma-regression] seeding catalog");
  await seedStorefrontCatalog(prisma);

  console.log("[prisma-regression] resetting demo user state");
  await resetDemoUserState(prisma);
  await cleanupWechatUsers(prisma, {
    openIds: [INVITEE_OPEN_ID],
    unionIds: [INVITEE_UNION_ID]
  });

  setExchangeMiniProgramCodeOverrideForTest(async (code) => {
    if (code === "invitee-code") {
      return {
        openId: INVITEE_OPEN_ID,
        unionId: INVITEE_UNION_ID,
        sessionKey: "invitee-session-key"
      };
    }

    throw new Error("unexpected mocked wechat code");
  });

  const service = createStorefrontService();
  const adminService = createAdminService();

  console.log("[prisma-regression] creating inviter session");
  const inviterSessionPayload = await service.createSession({
    loginType: "mock_wechat"
  });
  const inviterSessionToken = inviterSessionPayload.sessionToken;
  const inviterUserId = inviterSessionPayload.user && inviterSessionPayload.user.id;

  assert(inviterSessionToken, "未拿到 inviter sessionToken");
  assert(inviterUserId, "未拿到 inviter userId");
  assert(inviterSessionPayload.user && inviterSessionPayload.user.nickname, "未拿到 inviter 用户");

  const me = await service.getMe(inviterSessionToken);
  assert(me.session && me.session.status === "active", "user_sessions 未正常生效");

  console.log("[prisma-regression] creating invitee session with inviter binding");
  const inviteeSessionPayload = await service.createSession({
    loginType: "wechat_miniprogram",
    code: "invitee-code",
    inviterUserId,
    sourceScene: "share"
  });
  const inviteeSessionToken = inviteeSessionPayload.sessionToken;

  assert(inviteeSessionToken, "未拿到 invitee sessionToken");
  assert(inviteeSessionPayload.user && inviteeSessionPayload.user.id, "未拿到 invitee 用户");

  const referralBinding = await prisma.referralBinding.findUnique({
    where: {
      inviteeUserId: inviteeSessionPayload.user.id
    }
  });

  assert(referralBinding && referralBinding.inviterUserId === inviterUserId, "邀请绑定未建立到 inviter");

  const authorizedUser = await service.authorizeUser(inviteeSessionToken);
  assert(authorizedUser.isAuthorized === true, "用户授权状态未更新");

  const home = await service.getHomeData();
  assert((home.featuredProducts || []).length > 0, "首页商品为空，真库种子未生效");

  const categories = await service.getCategories();
  assert((categories || []).length > 1, "分类种子未生效");

  const product = home.featuredProducts[0];
  assert(product && product.id, "未找到可下单商品");

  console.log("[prisma-regression] creating address");
  const address = await service.createAddress(inviteeSessionToken, {
    receiver: "真库回归",
    phone: "13800138000",
    detail: "上海市 浦东新区 真库联调路 88 号",
    tag: "测试",
    isDefault: true
  });

  assert(address && address.id, "创建地址失败");

  console.log("[prisma-regression] claiming coupon");
  const couponPageBeforeClaim = await service.getCouponPageData(inviteeSessionToken);
  const claimableTemplate = (couponPageBeforeClaim.centerTemplates || []).find((item) => !item.claimed);

  assert(claimableTemplate, "没有可领取优惠券模板");

  const claimResult = await service.claimCoupon(inviteeSessionToken, claimableTemplate.id);

  assert(claimResult.ok === true, "领取优惠券失败");
  assert(claimResult.coupon && claimResult.coupon.id, "领取优惠券未返回 coupon");

  console.log("[prisma-regression] adding product to cart");
  await service.addToCart(inviteeSessionToken, {
    id: product.id,
    title: product.title,
    price: product.price,
    quantity: 1,
    specText: (product.specs || [])[0] || "默认规格"
  });

  const checkoutBeforeFirstOrder = await service.getCheckoutPageData(inviteeSessionToken);

  assert(checkoutBeforeFirstOrder.goodsAmountNumber >= claimResult.coupon.threshold, "测试商品金额不足以使用优惠券");

  const firstSelectResult = await service.selectCoupon(
    inviteeSessionToken,
    claimResult.coupon.id,
    checkoutBeforeFirstOrder.goodsAmountNumber
  );

  assert(firstSelectResult.ok === true, "首单选券失败");

  console.log("[prisma-regression] submitting first order and canceling");
  const firstOrderResult = await service.submitOrder(inviteeSessionToken, {
    remark: "prisma regression cancel path"
  });

  assert(firstOrderResult.ok === true, "首单提交失败");
  assert(firstOrderResult.order && firstOrderResult.order.status === "pending", "首单状态不是 pending");
  assert(firstOrderResult.order.couponTitle, "首单未带出优惠券标题");

  const cancelledOrder = await service.updateOrderStatus(inviteeSessionToken, firstOrderResult.order.id, "cancelled");

  assert(cancelledOrder && cancelledOrder.status === "cancelled", "取消订单失败");

  const couponPageAfterCancel = await service.getCouponPageData(inviteeSessionToken);
  const restoredCoupon = (couponPageAfterCancel.coupons || []).find((item) => item.id === claimResult.coupon.id);

  assert(restoredCoupon && restoredCoupon.status === "available", "取消订单后优惠券未恢复");

  console.log("[prisma-regression] submitting second order and completing lifecycle");
  await service.addToCart(inviteeSessionToken, {
    id: product.id,
    title: product.title,
    price: product.price,
    quantity: 1,
    specText: (product.specs || [])[0] || "默认规格"
  });

  const checkoutBeforeSecondOrder = await service.getCheckoutPageData(inviteeSessionToken);
  const secondSelectResult = await service.selectCoupon(
    inviteeSessionToken,
    claimResult.coupon.id,
    checkoutBeforeSecondOrder.goodsAmountNumber
  );

  assert(secondSelectResult.ok === true, "二次选券失败");

  const secondOrderResult = await service.submitOrder(inviteeSessionToken, {
    remark: "prisma regression shipping and commission path"
  });

  assert(secondOrderResult.ok === true, "第二单提交失败");
  assert(secondOrderResult.order && secondOrderResult.order.status === "pending", "第二单初始状态异常");
  console.log("[prisma-regression] shipping second order from admin fulfillment");

  const pendingShipmentOrders = await adminService.getPendingShipmentOrders({
    page: 1,
    pageSize: 20
  });
  const pendingOrder = (pendingShipmentOrders.list || []).find((item) => item.orderId === secondOrderResult.order.id);

  assert(pendingOrder, "最小履约入口未看到待发货订单");

  const shippedOrder = await adminService.shipOrder(secondOrderResult.order.id, {
    companyName: "顺丰速运",
    trackingNo: "SF2026033000001",
    companyCode: "SF"
  });

  assert(shippedOrder && shippedOrder.shipment && shippedOrder.shipment.trackingNo, "后台发货失败");

  const shippingOrderDetail = await service.getOrderDetail(inviteeSessionToken, secondOrderResult.order.id);

  assert(shippingOrderDetail.order && shippingOrderDetail.order.status === "shipping", "后台发货后订单未进入待收货");

  const commissionBeforeDone = await service.getCommissionData(inviterSessionToken);
  const distributionBeforeDone = await service.getDistributionData(inviterSessionToken);

  const doneOrder = await service.updateOrderStatus(inviteeSessionToken, secondOrderResult.order.id, "done");

  assert(doneOrder && doneOrder.status === "done", "确认收货失败");

  const commissionAfterDone = await service.getCommissionData(inviterSessionToken);
  const distributionAfterDone = await service.getDistributionData(inviterSessionToken);

  assert(
    (commissionAfterDone.records || []).length === (commissionBeforeDone.records || []).length + 1,
    "确认收货后佣金记录未增加"
  );
  assert(
    Number(distributionAfterDone.distributor.pendingCommission || 0) > Number(distributionBeforeDone.distributor.pendingCommission || 0),
    "确认收货后待结算佣金未增加"
  );

  console.log("[prisma-regression] creating aftersale and checking duplicate guard");
  const afterSale = await service.createAfterSale(inviteeSessionToken, {
    orderId: secondOrderResult.order.id,
    reason: "测试售后",
    description: "Prisma 真库回归"
  });

  assert(afterSale && afterSale.status === "processing", "售后申请失败");

  let duplicateBlocked = false;

  try {
    await service.createAfterSale(inviteeSessionToken, {
      orderId: secondOrderResult.order.id,
      reason: "重复售后",
      description: "Prisma 真库回归重复提交"
    });
  } catch (error) {
    duplicateBlocked = error && error.code === "AFTERSALE_ALREADY_EXISTS";
  }

  assert(duplicateBlocked, "重复售后拦截未生效");

  console.log("[prisma-regression] reviewing aftersale from admin fulfillment");
  const adminAfterSales = await adminService.getAfterSales({
    page: 1,
    pageSize: 20,
    status: "pending_review"
  });
  const pendingAfterSale = (adminAfterSales.list || []).find((item) => item.afterSaleId === afterSale.id);

  assert(pendingAfterSale, "最小履约入口未看到待审核售后");

  const approvedAfterSale = await adminService.reviewAfterSale(afterSale.id, {
    action: "approve",
    remark: "Prisma 真库回归通过"
  }, {
    realName: "回归管理员"
  });

  assert(approvedAfterSale && approvedAfterSale.status === "approved", "后台审核售后失败");

  const reviewedOrderDetail = await service.getOrderDetail(inviteeSessionToken, secondOrderResult.order.id);

  assert(reviewedOrderDetail.afterSale && reviewedOrderDetail.afterSale.status === "approved", "售后审核结果未回写");

  const teamData = await service.getTeamData(inviterSessionToken);
  const posterData = await service.getPosterData(inviterSessionToken);
  const profileData = await service.getProfileData(inviteeSessionToken);

  assert((teamData.teamMembers || []).length > 0, "团队数据为空");
  assert(posterData && posterData.coupon, "海报优惠券数据为空");
  assert(profileData.user && profileData.user.isAuthorized === true, "用户资料回归失败");

  console.log("[prisma-regression] logging out");
  await service.logout(inviteeSessionToken);

  let logoutBlocked = false;

  try {
    await service.getMe(inviteeSessionToken);
  } catch (error) {
    logoutBlocked = error && error.code === "UNAUTHORIZED";
  }

  assert(logoutBlocked, "退出登录后 user_sessions 未失效");

  console.log("[prisma-regression] passed");

  resetExchangeMiniProgramCodeOverrideForTest();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[prisma-regression] failed:", error && error.message ? error.message : error);

  resetExchangeMiniProgramCodeOverrideForTest();

  try {
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error("[prisma-regression] disconnect failed:", disconnectError && disconnectError.message
      ? disconnectError.message
      : disconnectError);
  }

  process.exitCode = 1;
});
