const { createStorefrontRepository } = require("../../repositories/storefront");
const { requireString, normalizePageOptions } = require("../../../shared/utils");

function createStorefrontService(repository = createStorefrontRepository()) {
  return {
    getRepositoryMode() {
      return repository.mode || "unknown";
    },
    bootstrap() {
      repository.bootstrap();
    },
    getHomeData() {
      return repository.getHomeData();
    },
    getCategories() {
      return repository.getCategories();
    },
    listProducts(options = {}) {
      const keyword = requireString(options.keyword);
      const categoryId = requireString(options.categoryId, "all");

      if (keyword) {
        return repository.searchProducts(keyword);
      }

      return repository.getProductsByCategory(categoryId || "all");
    },
    getProductDetail(productId) {
      return repository.getProductDetail(requireString(productId));
    },
    createSession(payload = {}) {
      return repository.createSession(payload);
    },
    getMe(sessionToken) {
      return repository.getMe(requireString(sessionToken));
    },
    logout(sessionToken) {
      return repository.logout(requireString(sessionToken));
    },
    getAddressListData(sessionToken) {
      return repository.getAddressListData(requireString(sessionToken));
    },
    getAddressById(sessionToken, addressId) {
      return repository.getAddressById(requireString(sessionToken), requireString(addressId));
    },
    createAddress(sessionToken, payload = {}) {
      return repository.createAddress(requireString(sessionToken), payload);
    },
    updateAddress(sessionToken, addressId, payload = {}) {
      return repository.updateAddress(requireString(sessionToken), requireString(addressId), payload);
    },
    deleteAddress(sessionToken, addressId) {
      return repository.deleteAddress(requireString(sessionToken), requireString(addressId));
    },
    setSelectedAddress(sessionToken, addressId) {
      return repository.setSelectedAddress(requireString(sessionToken), requireString(addressId));
    },
    getCartPageData(sessionToken) {
      return repository.getCartPageData(requireString(sessionToken));
    },
    setCartItems(sessionToken, cartItems = []) {
      return repository.setCartItems(requireString(sessionToken), Array.isArray(cartItems) ? cartItems : []);
    },
    addToCart(sessionToken, product = {}) {
      return repository.addToCart(requireString(sessionToken), product);
    },
    increaseCartItem(sessionToken, productId, specText) {
      return repository.increaseCartItem(
        requireString(sessionToken),
        requireString(productId),
        requireString(specText)
      );
    },
    decreaseCartItem(sessionToken, productId, specText) {
      return repository.decreaseCartItem(
        requireString(sessionToken),
        requireString(productId),
        requireString(specText)
      );
    },
    removeCartItem(sessionToken, productId, specText) {
      return repository.removeCartItem(
        requireString(sessionToken),
        requireString(productId),
        requireString(specText)
      );
    },
    getCouponPageData(sessionToken) {
      return repository.getCouponPageData(requireString(sessionToken));
    },
    claimCoupon(sessionToken, templateId) {
      return repository.claimCoupon(requireString(sessionToken), requireString(templateId));
    },
    selectCoupon(sessionToken, couponId, amount) {
      return repository.selectCoupon(
        requireString(sessionToken),
        requireString(couponId),
        Number(amount || 0)
      );
    },
    clearSelectedCoupon(sessionToken) {
      return repository.clearSelectedCoupon(requireString(sessionToken));
    },
    getCheckoutPageData(sessionToken) {
      return repository.getCheckoutPageData(requireString(sessionToken));
    },
    submitOrder(sessionToken, payload = {}) {
      return repository.submitOrder(requireString(sessionToken), payload);
    },
    getAllOrders(sessionToken, options = {}) {
      return repository.getAllOrders(requireString(sessionToken), {
        ...normalizePageOptions(options),
        status: requireString(options.status, "all")
      });
    },
    getOrderDetail(sessionToken, orderId) {
      return repository.getOrderDetail(requireString(sessionToken), requireString(orderId));
    },
    updateOrderStatus(sessionToken, orderId, status) {
      return repository.updateOrderStatus(
        requireString(sessionToken),
        requireString(orderId),
        requireString(status)
      );
    },
    createAfterSale(sessionToken, payload = {}) {
      return repository.createAfterSale({
        sessionToken: requireString(sessionToken),
        orderId: requireString(payload.orderId),
        reason: requireString(payload.reason),
        description: requireString(payload.description)
      });
    },
    getProfileData(sessionToken) {
      return repository.getProfileData(requireString(sessionToken));
    },
    authorizeUser(sessionToken, payload = {}) {
      return repository.authorizeUser(requireString(sessionToken), {
        phoneCode: requireString(payload.phoneCode),
        phoneNumber: requireString(payload.phoneNumber),
        nickname: requireString(payload.nickname),
        avatarUrl: requireString(payload.avatarUrl)
      });
    },
    getDistributionData(sessionToken) {
      return repository.getDistributionData(requireString(sessionToken));
    },
    getTeamData(sessionToken) {
      return repository.getTeamData(requireString(sessionToken));
    },
    getCommissionData(sessionToken) {
      return repository.getCommissionData(requireString(sessionToken));
    },
    getPosterData(sessionToken) {
      return repository.getPosterData(requireString(sessionToken));
    }
  };
}

module.exports = {
  createStorefrontService
};
