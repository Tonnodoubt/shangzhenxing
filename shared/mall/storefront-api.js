function createStorefrontApi(deps) {
  const {
    banners,
    quickEntries,
    categories,
    products,
    cloneData,
    formatDateTime,
    paginateList,
    decorateProducts,
    searchProductSource,
    decorateProduct,
    getProductById,
    getState,
    resolveSelectedAddress,
    withState,
    syncAddressState,
    buildCartPageData,
    buildCheckoutPageData,
    buildCouponPageData,
    buildProfileData,
    getSelectedCouponInternal,
    buildCheckoutSummary,
    buildRuntimeOrder,
    decorateOrder,
    consumeSelectedCoupon,
    syncPendingOrderLifecycle,
    findOrderById,
    updateOrderCollectionsStatus
  } = deps;

  function getHomeData() {
    return {
      banners: cloneData(banners),
      quickEntries: cloneData(quickEntries),
      featuredProducts: decorateProducts(products.slice(0, 4)),
      recommendedProducts: decorateProducts(products.slice(2, 6))
    };
  }

  function getCategories() {
    return cloneData(categories);
  }

  function getProductsByCategory(categoryId = "all") {
    const list = categoryId === "all"
      ? products
      : products.filter((item) => item.categoryId === categoryId);

    return decorateProducts(list);
  }

  function getProductsByKeyword(keyword) {
    return searchProductSource(keyword);
  }

  function searchProducts(keyword) {
    return decorateProducts(searchProductSource(keyword));
  }

  function getProductDetail(id) {
    return decorateProduct(getProductById(id));
  }

  function getAddresses() {
    return cloneData(getState().addresses || []);
  }

  function getAddressById(addressId) {
    return cloneData((getState().addresses || []).find((item) => item.id === addressId) || null);
  }

  function getAddressListData() {
    const state = getState();
    const resolved = resolveSelectedAddress(state);

    return {
      addresses: cloneData(state.addresses || []),
      selectedAddressId: resolved.selectedAddressId
    };
  }

  function getSelectedAddress() {
    return resolveSelectedAddress(getState()).address;
  }

  function setSelectedAddress(addressId) {
    return withState((state) => {
      state.selectedAddressId = addressId;

      return syncAddressState(state);
    });
  }

  function saveAddress(payload) {
    return withState((state) => {
      const addresses = (state.addresses || []).slice();
      let nextSelectedAddressId = state.selectedAddressId;

      if (payload.id) {
        const index = addresses.findIndex((item) => item.id === payload.id);

        if (index > -1) {
          addresses[index] = {
            ...addresses[index],
            ...payload
          };
        }
      } else {
        addresses.unshift({
          ...payload,
          id: `addr-${Date.now()}`
        });
      }

      if (payload.isDefault) {
        const defaultId = payload.id || (addresses[0] || {}).id;

        addresses.forEach((item) => {
          item.isDefault = item.id === defaultId;
        });

        nextSelectedAddressId = defaultId;
      }

      if (!addresses.some((item) => item.isDefault) && addresses[0]) {
        addresses[0].isDefault = true;
      }

      state.addresses = addresses;
      state.selectedAddressId = nextSelectedAddressId;

      return syncAddressState(state);
    });
  }

  function deleteAddress(addressId) {
    return withState((state) => {
      state.addresses = (state.addresses || []).filter((item) => item.id !== addressId);

      if (state.addresses.length && !state.addresses.some((item) => item.isDefault)) {
        state.addresses[0].isDefault = true;
      }

      syncAddressState(state);

      return {
        addresses: cloneData(state.addresses || []),
        selectedAddressId: state.selectedAddressId || ""
      };
    });
  }

  function getCartPageData() {
    return buildCartPageData(getState());
  }

  function setCartItems(cartItems) {
    return withState((state) => {
      state.cartItems = cloneData(cartItems || []);

      return buildCartPageData(state);
    });
  }

  function addToCart(product) {
    return withState((state) => {
      const cartItems = state.cartItems || [];
      const matchIndex = cartItems.findIndex((item) => {
        return item.id === product.id && item.specText === product.specText;
      });

      if (matchIndex > -1) {
        cartItems[matchIndex].quantity += product.quantity;
      } else {
        cartItems.push(cloneData(product));
      }

      state.cartItems = cartItems;

      return buildCartPageData(state);
    });
  }

  function increaseCartItem(id, specText) {
    return withState((state) => {
      state.cartItems = (state.cartItems || []).map((item) => {
        if (item.id !== id || item.specText !== specText) {
          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1
        };
      });

      return buildCartPageData(state);
    });
  }

  function decreaseCartItem(id, specText) {
    return withState((state) => {
      const nextCart = [];

      (state.cartItems || []).forEach((item) => {
        if (item.id !== id || item.specText !== specText) {
          nextCart.push(item);
          return;
        }

        if (item.quantity > 1) {
          nextCart.push({
            ...item,
            quantity: item.quantity - 1
          });
        }
      });

      state.cartItems = nextCart;

      return buildCartPageData(state);
    });
  }

  function removeCartItem(id, specText) {
    return withState((state) => {
      state.cartItems = (state.cartItems || []).filter((item) => {
        return item.id !== id || item.specText !== specText;
      });

      return buildCartPageData(state);
    });
  }

  function getCartCount() {
    return (getState().cartItems || []).reduce((sum, item) => sum + item.quantity, 0);
  }

  function getCouponPageData() {
    return buildCouponPageData(getState());
  }

  function getSelectedCoupon() {
    const selectedCoupon = getSelectedCouponInternal(getState());

    return selectedCoupon ? cloneData(selectedCoupon) : null;
  }

  function getAvailableCoupons(totalAmount) {
    return cloneData((getState().coupons || []).filter((item) => {
      return item.status === "available" && Number(totalAmount || 0) >= Number(item.threshold || 0);
    }));
  }

  function claimCoupon(templateId) {
    return withState((state) => {
      const template = (state.couponCenterTemplates || []).find((item) => item.id === templateId);

      if (!template || template.claimed) {
        return {
          ok: false
        };
      }

      template.claimed = true;

      const nextCoupon = {
        id: `coupon-${Date.now()}`,
        templateId: template.id,
        title: template.title,
        amount: template.amount,
        threshold: template.threshold,
        status: "available",
        expiryText: template.expiryText,
        sourceText: "领券中心"
      };

      state.coupons = [nextCoupon].concat(state.coupons || []);

      return {
        ok: true,
        coupon: cloneData(nextCoupon)
      };
    });
  }

  function selectCoupon(couponId, amount) {
    return withState((state) => {
      const coupon = (state.coupons || []).find((item) => item.id === couponId);

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

      if (Number(amount || 0) < Number(coupon.threshold || 0)) {
        return {
          ok: false,
          message: "当前金额还不能用这张券"
        };
      }

      state.selectedCouponId = couponId;

      return {
        ok: true,
        coupon: cloneData(coupon)
      };
    });
  }

  function clearSelectedCoupon() {
    return withState((state) => {
      state.selectedCouponId = "";

      return {
        ok: true
      };
    });
  }

  function getCheckoutPageData() {
    return buildCheckoutPageData(getState());
  }

  function createOrder(order) {
    return withState((state) => {
      const nextOrder = decorateOrder(order, 0);

      state.runtimeOrders = [nextOrder].concat(state.runtimeOrders || []);
      state.orderRecords = [nextOrder].concat(state.orderRecords || []);

      return cloneData(nextOrder);
    });
  }

  function submitOrder(options = {}) {
    return withState((state) => {
      const source = state.cartItems || [];
      const address = resolveSelectedAddress(state).address;

      if (!source.length) {
        return {
          ok: false,
          message: "购物车为空"
        };
      }

      if (!address) {
        return {
          ok: false,
          message: "请先选择地址"
        };
      }

      const selectedCoupon = getSelectedCouponInternal(state);
      const checkoutSummary = buildCheckoutSummary(source, selectedCoupon);
      const appliedCoupon = checkoutSummary.discountAmountNumber > 0 ? selectedCoupon : null;
      const nextOrder = decorateOrder(buildRuntimeOrder(source, {
        remark: options.remark || "",
        address,
        coupon: appliedCoupon
      }));

      state.runtimeOrders = [nextOrder].concat(state.runtimeOrders || []);
      state.orderRecords = [nextOrder].concat(state.orderRecords || []);

      if (appliedCoupon) {
        consumeSelectedCoupon(state, nextOrder.id);
      } else {
        state.selectedCouponId = "";
      }

      state.cartItems = [];

      return {
        ok: true,
        order: cloneData(nextOrder)
      };
    });
  }

  function getAllOrders(options = {}) {
    return withState((state) => {
      syncPendingOrderLifecycle(state);

      const status = String(options.status || "all").trim();
      const source = cloneData(state.orderRecords || []);
      const filtered = status && status !== "all"
        ? source.filter((item) => item.status === status)
        : source;

      return paginateList(filtered, options);
    });
  }

  function getOrderById(orderId) {
    return withState((state) => {
      syncPendingOrderLifecycle(state);
      return cloneData(findOrderById(state, orderId));
    });
  }

  function getOrderDetailData(orderId) {
    return withState((state) => {
      syncPendingOrderLifecycle(state);

      return {
        order: cloneData(findOrderById(state, orderId)),
        afterSale: cloneData((state.afterSales || []).find((item) => item.orderId === orderId) || null)
      };
    });
  }

  function updateOrderStatus(orderId, nextStatus) {
    return withState((state) => {
      return updateOrderCollectionsStatus(state, orderId, nextStatus);
    });
  }

  function createAfterSale(payload) {
    return withState((state) => {
      syncPendingOrderLifecycle(state);

      const order = findOrderById(state, payload.orderId);
      const existing = (state.afterSales || []).find((item) => item.orderId === payload.orderId);

      if (!order) {
        const err = new Error("订单不存在");
        err.code = "ORDER_NOT_FOUND";
        throw err;
      }

      if (existing || order.aftersaleStatus) {
        const err = new Error("该订单已提交售后");
        err.code = "AFTERSALE_ALREADY_EXISTS";
        throw err;
      }

      if (order.status !== "shipping" && order.status !== "done") {
        const err = new Error("当前订单暂不可售后");
        err.code = "AFTERSALE_NOT_ALLOWED";
        throw err;
      }

      const record = {
        id: `as-${Date.now()}`,
        orderId: payload.orderId,
        reason: payload.reason || "不想要了",
        description: payload.description || "",
        status: "processing",
        statusText: "售后处理中",
        createdAt: formatDateTime()
      };

      state.afterSales = [record].concat(state.afterSales || []);
      state.orderRecords = (state.orderRecords || []).map((item, index) => {
        if (item.id !== payload.orderId) {
          return decorateOrder(item, index);
        }

        return decorateOrder(
          {
            ...item,
            aftersaleStatus: "processing"
          },
          index
        );
      });

      state.runtimeOrders = (state.runtimeOrders || []).map((item, index) => {
        if (item.id !== payload.orderId) {
          return decorateOrder(item, index);
        }

        return decorateOrder(
          {
            ...item,
            aftersaleStatus: "processing"
          },
          index
        );
      });

      return cloneData(record);
    });
  }

  function getAfterSaleByOrderId(orderId) {
    return cloneData((getState().afterSales || []).find((item) => item.orderId === orderId) || null);
  }

  function getUser() {
    return cloneData(getState().user);
  }

  function authorizeUser() {
    return withState((state) => {
      state.user = {
        ...state.user,
        nickname: state.user.nickname || "微信用户",
        isAuthorized: true
      };

      return cloneData(state.user);
    });
  }

  function getProfileData() {
    return buildProfileData(getState());
  }

  function getDistributionData() {
    const state = getState();

    return {
      user: cloneData(state.user),
      distributor: cloneData(state.distributor || {})
    };
  }

  function getTeamData() {
    const state = getState();

    return {
      teamMembers: cloneData(state.teamMembers || []),
      distributor: cloneData(state.distributor || {})
    };
  }

  function getCommissionData() {
    const state = getState();

    return {
      records: cloneData(state.commissionRecords || []),
      distributor: cloneData(state.distributor || {})
    };
  }

  function getPosterData() {
    const state = getState();

    return {
      user: cloneData(state.user),
      distributor: cloneData(state.distributor || {}),
      coupon: cloneData((state.coupons || [])[0] || null),
      sharePath: `/pages/home/index?inviterUserId=${encodeURIComponent(String((state.user || {}).id || "user-1"))}&sourceScene=share`
    };
  }

  return {
    getHomeData,
    getCategories,
    getProductsByCategory,
    getProductsByKeyword,
    searchProducts,
    getProductDetail,
    getAddresses,
    getAddressById,
    getAddressListData,
    getSelectedAddress,
    setSelectedAddress,
    saveAddress,
    deleteAddress,
    getCartPageData,
    setCartItems,
    addToCart,
    increaseCartItem,
    decreaseCartItem,
    removeCartItem,
    getCartCount,
    getCouponPageData,
    getSelectedCoupon,
    getAvailableCoupons,
    claimCoupon,
    selectCoupon,
    clearSelectedCoupon,
    getCheckoutPageData,
    createOrder,
    submitOrder,
    getAllOrders,
    getOrderById,
    getOrderDetailData,
    updateOrderStatus,
    createAfterSale,
    getAfterSaleByOrderId,
    getUser,
    authorizeUser,
    getProfileData,
    getDistributionData,
    getTeamData,
    getCommissionData,
    getPosterData
  };
}

module.exports = createStorefrontApi;
