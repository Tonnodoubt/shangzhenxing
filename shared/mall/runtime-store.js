function createRuntimeStore(deps) {
  const {
    categories,
    products,
    mockOrders,
    parseSalesCount,
    deriveProductType,
    cloneData,
    normalizeDetailContent,
    decorateOrder,
    generateId
  } = deps;

  function ensureCategorySeeds() {
    categories.forEach((item, index) => {
      if (!item.parentId && item.parentId !== 0) {
        item.parentId = 0;
      }

      if (!item.sortOrder) {
        item.sortOrder = (index + 1) * 10;
      }

      if (!item.status) {
        item.status = "enabled";
      }

      if (!item.createdAt) {
        item.createdAt = `2026-03-2${Math.min(index, 8)} 10:00:00`;
      }

      if (!item.updatedAt) {
        item.updatedAt = item.createdAt;
      }
    });
  }

  function ensureProductSeeds() {
    products.forEach((item, index) => {
      if (!item.subTitle) {
        item.subTitle = item.shortDesc;
      }

      if (!item.coverImage) {
        item.coverImage = `https://example.com/products/${item.id}.jpg`;
      }

      if (!item.imageList) {
        item.imageList = [
          item.coverImage,
          `${item.coverImage}?v=2`
        ];
      }

      item.detailContent = normalizeDetailContent(
        item.detailContent,
        [item.shortDesc, (item.highlights || []).join(" / ")].filter(Boolean).join("\n")
      );

      if (!item.productType) {
        item.productType = deriveProductType(item.categoryId);
      }

      if (!item.status) {
        item.status = "on_sale";
      }

      if (typeof item.distributionEnabled === "undefined") {
        item.distributionEnabled = true;
      }

      if (!item.salesCount) {
        item.salesCount = parseSalesCount(item.salesText);
      }

      if (!item.favoriteCount) {
        item.favoriteCount = 20 + index * 6;
      }

      if (!item.createdAt) {
        item.createdAt = `2026-03-2${Math.min(index, 8)} 11:00:00`;
      }

      if (!item.updatedAt) {
        item.updatedAt = item.createdAt;
      }
    });
  }

  function ensureSeedCollections() {
    ensureCategorySeeds();
    ensureProductSeeds();
  }

  function buildSeedSkusForProduct(product, productIndex = 0) {
    const specs = product.specs && product.specs.length ? product.specs : ["默认规格"];

    return specs.map((spec, specIndex) => {
      return {
        id: `sku-${product.id}-${specIndex + 1}`,
        productId: product.id,
        skuCode: `${String(product.id).toUpperCase()}-${specIndex + 1}`,
        specText: spec,
        price: Number(product.price || 0) + specIndex * 20,
        originPrice: Number(product.marketPrice || product.price || 0) + specIndex * 20,
        stock: Math.max(30, 96 - productIndex * 8 - specIndex * 6),
        lockStock: specIndex === 0 ? 2 : 0,
        status: "enabled"
      };
    });
  }

  function buildSeedProductSkus() {
    ensureProductSeeds();

    return products.reduce((list, product, productIndex) => {
      return list.concat(buildSeedSkusForProduct(product, productIndex));
    }, []);
  }

  function syncProductSkusForSpecs(state, product) {
    const currentSkuList = (state.productSkus || []).filter((item) => item.productId === product.id);
    const productIndex = products.findIndex((item) => item.id === product.id);
    const fallbackSkuList = buildSeedSkusForProduct(product, Math.max(productIndex, 0));
    const specs = product.specs && product.specs.length ? product.specs : ["默认规格"];
    const nextSkuList = specs.map((specText, index) => {
      const matchedBySpec = currentSkuList.find((item) => item.specText === specText);
      const matchedByIndex = currentSkuList[index];
      const matched = matchedBySpec || matchedByIndex || {};
      const fallback = fallbackSkuList[index] || {};

      return {
        id: matched.id || fallback.id || generateId("sku"),
        productId: product.id,
        skuCode: matched.skuCode || fallback.skuCode || `${String(product.id).toUpperCase()}-${index + 1}`,
        specText,
        price: typeof matched.price === "number" ? matched.price : Number(fallback.price || product.price || 0),
        originPrice: typeof matched.originPrice === "number"
          ? matched.originPrice
          : Number(fallback.originPrice || product.marketPrice || product.price || 0),
        stock: typeof matched.stock === "number" ? matched.stock : Number(fallback.stock || 0),
        lockStock: typeof matched.lockStock === "number" ? matched.lockStock : Number(fallback.lockStock || 0),
        status: matched.status || fallback.status || "enabled"
      };
    });

    state.productSkus = (state.productSkus || []).filter((item) => item.productId !== product.id).concat(nextSkuList);

    return nextSkuList;
  }

  function buildSeedUserRecords() {
    return [
      {
        id: "user-1",
        nickname: "微信用户",
        mobile: "13800006699",
        isNewUser: true,
        sourceScene: "share",
        inviterUserId: "user-2",
        createdAt: "2026-03-28 08:30:00"
      },
      {
        id: "user-2",
        nickname: "林小满",
        mobile: "13800006688",
        isNewUser: false,
        sourceScene: "distribution",
        inviterUserId: "",
        createdAt: "2026-03-20 10:00:00"
      },
      {
        id: "user-3",
        nickname: "周星野",
        mobile: "13800007766",
        isNewUser: false,
        sourceScene: "invite",
        inviterUserId: "user-2",
        createdAt: "2026-03-22 09:20:00"
      },
      {
        id: "user-4",
        nickname: "陈一诺",
        mobile: "13800008855",
        isNewUser: false,
        sourceScene: "activity",
        inviterUserId: "user-3",
        createdAt: "2026-03-24 14:10:00"
      }
    ];
  }

  function buildSeedDistributorProfiles() {
    return [
      {
        id: "dist-1",
        userId: "user-2",
        nickname: "林小满",
        mobile: "13800006688",
        level: "高级分销员",
        status: "active",
        teamCount: 12,
        totalCommissionCent: 36800,
        pendingCommissionCent: 12900,
        joinedAt: "2026-03-20 10:00:00"
      },
      {
        id: "dist-2",
        userId: "user-3",
        nickname: "周星野",
        mobile: "13800007766",
        level: "普通分销员",
        status: "pending_review",
        teamCount: 3,
        totalCommissionCent: 8600,
        pendingCommissionCent: 4200,
        joinedAt: "2026-03-27 18:00:00"
      }
    ];
  }

  function buildInitialState() {
    ensureSeedCollections();

    return {
      user: {
        id: "user-1",
        nickname: "访客用户",
        level: "普通会员",
        phone: "未授权手机号",
        isAuthorized: false
      },
      userRecords: buildSeedUserRecords(),
      addresses: [
        {
          id: "addr-1",
          receiver: "张三",
          phone: "138****8888",
          detail: "上海市 浦东新区 张江示例路 88 号",
          tag: "家",
          isDefault: true
        },
        {
          id: "addr-2",
          receiver: "李四",
          phone: "139****6666",
          detail: "上海市 徐汇区 漕河泾示例路 18 号",
          tag: "公司",
          isDefault: false
        }
      ],
      selectedAddressId: "addr-1",
      address: null,
      couponCenterTemplates: [
        {
          id: "tpl-1",
          title: "新人立减 20",
          amount: 20,
          threshold: 99,
          badge: "新人",
          desc: "首单满 99 可用",
          expiryText: "领取后 7 天有效",
          claimed: false,
          status: "enabled",
          issueType: "center_claim",
          validDays: 7,
          receivedCount: 128,
          usedCount: 56,
          createdAt: "2026-03-20 10:00:00",
          updatedAt: "2026-03-28 09:00:00"
        },
        {
          id: "tpl-2",
          title: "满 199 减 30",
          amount: 30,
          threshold: 199,
          badge: "满减",
          desc: "基础转化券",
          expiryText: "领取后 15 天有效",
          claimed: false,
          status: "enabled",
          issueType: "manual_issue",
          validDays: 15,
          receivedCount: 76,
          usedCount: 23,
          createdAt: "2026-03-21 10:00:00",
          updatedAt: "2026-03-28 09:10:00"
        },
        {
          id: "tpl-3",
          title: "分销专享券",
          amount: 15,
          threshold: 129,
          badge: "分销",
          desc: "分享成交场景可用",
          expiryText: "领取后 10 天有效",
          claimed: false,
          status: "enabled",
          issueType: "center_claim",
          validDays: 10,
          receivedCount: 42,
          usedCount: 12,
          createdAt: "2026-03-22 10:00:00",
          updatedAt: "2026-03-28 09:15:00"
        }
      ],
      coupons: [
        {
          id: "coupon-1",
          templateId: "tpl-1",
          title: "新人券",
          amount: 20,
          threshold: 99,
          status: "available",
          expiryText: "2026-04-30 前可用",
          sourceText: "新客礼包"
        },
        {
          id: "coupon-2",
          title: "满 199 减 30",
          templateId: "tpl-2",
          amount: 30,
          threshold: 199,
          status: "available",
          expiryText: "2026-05-15 前可用",
          sourceText: "运营发放"
        }
      ],
      selectedCouponId: "",
      cartItems: [
        {
          id: "p1",
          title: "每日精选零食礼盒",
          price: 129,
          quantity: 1,
          specText: "标准装",
          coverLabel: "礼盒",
          accent: "#F6D4C8"
        }
      ],
      orderRecords: cloneData(mockOrders).map((order, index) => decorateOrder(order, index)),
      runtimeOrders: [],
      afterSales: [],
      shipmentRecords: [],
      productSkus: buildSeedProductSkus(),
      distributionRules: {
        enabled: true,
        levelOneRate: 8,
        levelTwoRate: 3,
        bindDays: 15,
        ruleDesc: "用户通过分享进入后 15 天内下单归属邀请人",
        updatedAt: "2026-03-28 09:30:00",
        updatedBy: {
          adminUserId: "admin-1",
          realName: "张三"
        }
      },
      distributor: {
        level: "高级分销员",
        totalCommission: 368,
        pendingCommission: 129,
        settledCommission: 239,
        teamCount: 12,
        todayInviteCount: 3
      },
      teamMembers: [
        {
          id: "team-1",
          nickname: "林小满",
          avatarLabel: "林",
          joinedAt: "2026-03-24",
          contributedAmount: 268
        },
        {
          id: "team-2",
          nickname: "周星野",
          avatarLabel: "周",
          joinedAt: "2026-03-22",
          contributedAmount: 198
        },
        {
          id: "team-3",
          nickname: "陈一诺",
          avatarLabel: "陈",
          joinedAt: "2026-03-20",
          contributedAmount: 129
        }
      ],
      commissionRecords: [
        {
          id: "cm-1",
          title: "每日精选零食礼盒",
          fromUser: "林小满",
          orderNo: "NO20260326001",
          amount: 26,
          levelText: "一级佣金",
          status: "pending",
          statusText: "待结算",
          createdAt: "2026-03-26 15:22"
        },
        {
          id: "cm-2",
          title: "轻饮系列组合装",
          fromUser: "周星野",
          orderNo: "NO20260325002",
          amount: 18,
          levelText: "二级佣金",
          status: "settled",
          statusText: "已结算",
          createdAt: "2026-03-25 11:08"
        }
      ],
      distributorProfiles: buildSeedDistributorProfiles()
    };
  }

  let runtimeState = null;

  function resolveSelectedAddress(state) {
    const addresses = state.addresses || [];
    let target = addresses.find((item) => item.id === state.selectedAddressId);

    if (!target) {
      target = addresses.find((item) => item.isDefault) || addresses[0] || null;
    }

    return {
      selectedAddressId: target ? target.id : "",
      address: target ? cloneData(target) : null
    };
  }

  function syncAddressState(state) {
    const nextState = resolveSelectedAddress(state);

    state.selectedAddressId = nextState.selectedAddressId;
    state.address = nextState.address;

    return state.address;
  }

  function getState() {
    if (!runtimeState) {
      runtimeState = buildInitialState();
      syncAddressState(runtimeState);
    }

    return runtimeState;
  }

  function syncAppGlobalData() {
    try {
      const app = typeof globalThis.getApp === "function"
        ? globalThis.getApp()
        : null;

      if (app) {
        app.globalData = cloneData(getState());
      }
    } catch (error) {
      // 页面在 App 启动前 require service 时，这里允许静默跳过。
    }
  }

  function withState(handler) {
    const result = handler(getState());

    syncAppGlobalData();

    return result;
  }

  function bootstrap() {
    runtimeState = buildInitialState();
    syncAddressState(runtimeState);
    syncAppGlobalData();
  }

  return {
    ensureCategorySeeds,
    ensureProductSeeds,
    buildSeedProductSkus,
    syncProductSkusForSpecs,
    getState,
    resolveSelectedAddress,
    syncAddressState,
    withState,
    bootstrap
  };
}

module.exports = createRuntimeStore;
