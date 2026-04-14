const { createStorefrontError } = require("../storefront/errors");
const { createStorefrontRepository } = require("../../repositories/storefront");
const { requireString, normalizeDetailContent, normalizePageOptions } = require("../../../shared/utils");

function requireBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return fallback;
}

function normalizeSkuPayloadList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => ({
    skuId: requireString((item || {}).skuId || (item || {}).id),
    skuCode: requireString((item || {}).skuCode),
    specText: requireString((item || {}).specText),
    price: Number((item || {}).price || 0),
    originPrice: Number((item || {}).originPrice || (item || {}).price || 0),
    stock: Number((item || {}).stock || 0),
    lockStock: Number((item || {}).lockStock || 0),
    status: requireString((item || {}).status, "enabled")
  }));
}

function createAdminService(repository = createStorefrontRepository()) {
  return {
    getRepositoryMode() {
      return repository.mode || "unknown";
    },
    getCategories(options = {}) {
      return repository.getAdminCategories({
        ...normalizePageOptions(options)
      });
    },
    saveCategory(payload = {}) {
      return repository.saveAdminCategory({
        categoryId: requireString(payload.categoryId || payload.id),
        parentId: requireString(payload.parentId),
        name: requireString(payload.name),
        sortOrder: Number(payload.sortOrder || 0),
        status: requireString(payload.status, "enabled")
      });
    },
    deleteCategory(categoryId) {
      return repository.deleteAdminCategory(requireString(categoryId));
    },
    getProducts(options = {}) {
      return repository.getAdminProducts({
        ...normalizePageOptions(options),
        keyword: requireString(options.keyword),
        status: requireString(options.status),
        categoryId: requireString(options.categoryId)
      });
    },
    getProductDetail(productId) {
      return repository.getAdminProductDetail(requireString(productId));
    },
    saveProduct(payload = {}) {
      return repository.saveAdminProduct({
        productId: requireString(payload.productId || payload.id),
        categoryId: requireString(payload.categoryId),
        title: requireString(payload.title),
        shortDesc: requireString(payload.shortDesc),
        subTitle: requireString(payload.subTitle),
        coverImage: requireString(payload.coverImage),
        detailContent: normalizeDetailContent(
          requireString(payload.detailContent),
          requireString(payload.shortDesc || payload.subTitle || payload.title)
        ),
        price: Number(payload.price || 0),
        marketPrice: Number(payload.marketPrice || payload.price || 0),
        salesCount: Number(payload.salesCount || 0),
        favoriteCount: Number(payload.favoriteCount || 0),
        sortOrder: Number(payload.sortOrder || 0),
        distributionEnabled: requireBoolean(payload.distributionEnabled, true),
        status: requireString(payload.status, "off_sale")
      });
    },
    updateProductStatus(productId, status) {
      return repository.updateAdminProductStatus(
        requireString(productId),
        requireString(status, "off_sale")
      );
    },
    getProductSkus(productId) {
      return repository.getAdminSkus(requireString(productId));
    },
    saveProductSkus(productId, payload = {}) {
      return repository.saveAdminSkus(requireString(productId), {
        skus: normalizeSkuPayloadList(payload.skus)
      });
    },
    updateSkuStock(skuId, stock) {
      return repository.updateAdminSkuStock(requireString(skuId), Number(stock || 0));
    },
    getDashboardSummary() {
      return repository.getAdminDashboardSummary();
    },
    getOrders(options = {}) {
      return repository.getAdminOrders({
        ...normalizePageOptions(options),
        orderNo: requireString(options.orderNo),
        status: requireString(options.status),
        payStatus: requireString(options.payStatus)
      });
    },
    getOrderDetail(orderId) {
      return repository.getAdminOrderDetail(requireString(orderId));
    },
    cancelOrder(orderId) {
      return repository.cancelAdminOrder(requireString(orderId));
    },
    getPendingShipmentOrders(options = {}) {
      return repository.getPendingShipmentOrders({
        ...normalizePageOptions(options)
      });
    },
    shipOrder(orderId, payload = {}) {
      return repository.shipAdminOrder(requireString(orderId), {
        companyCode: requireString(payload.companyCode),
        companyName: requireString(payload.companyName),
        trackingNo: requireString(payload.trackingNo)
      });
    },
    getAfterSales(options = {}) {
      return repository.getAdminAfterSales({
        ...normalizePageOptions(options),
        keyword: requireString(options.keyword || options.orderNo),
        status: requireString(options.status)
      });
    },
    reviewAfterSale(afterSaleId, payload = {}, actor = {}) {
      const action = requireString(payload.action);

      if (action !== "approve" && action !== "reject") {
        throw createStorefrontError("缺少有效的售后处理动作", 400, "AFTERSALE_ACTION_REQUIRED");
      }

      return repository.reviewAdminAfterSale(
        requireString(afterSaleId),
        action,
        requireString(payload.remark),
        actor || {}
      );
    },

    // ── 优惠券管理（原 mallService 直调，现归入 adminService） ──

    getCouponTemplates(options = {}) {
      return repository.getAdminCouponTemplates(normalizePageOptions(options));
    },
    saveCouponTemplate(payload = {}) {
      return repository.saveAdminCouponTemplate({
        templateId: requireString(payload.templateId || payload.id),
        title: requireString(payload.title),
        amount: Number(payload.amount || payload.amountCent / 100 || 0),
        threshold: Number(payload.threshold || payload.thresholdAmountCent / 100 || 0),
        issueType: requireString(payload.issueType, "center_claim"),
        status: requireString(payload.status, "enabled"),
        validDays: Number(payload.validDays || 0)
      });
    },
    updateCouponTemplateStatus(templateId, status) {
      return repository.updateAdminCouponTemplateStatus(
        requireString(templateId),
        requireString(status, "disabled")
      );
    },

    // ── 分销管理（原 mallService 直调，现归入 adminService） ──

    getDistributionRules() {
      return repository.getAdminDistributionRules();
    },
    getDistributionRuleVersions(options = {}) {
      return repository.getAdminDistributionRuleVersions({
        ...normalizePageOptions(options),
        keyword: requireString(options.keyword),
        status: requireString(options.status)
      });
    },
    createDistributionRuleVersion(payload = {}, actor = {}) {
      return repository.createAdminDistributionRuleVersion(payload, actor);
    },
    publishDistributionRuleVersion(ruleVersionId, payload = {}, actor = {}) {
      return repository.publishAdminDistributionRuleVersion(requireString(ruleVersionId), payload, actor);
    },
    getDistributionRuleChangeLogs(options = {}) {
      return repository.getAdminDistributionRuleChangeLogs({
        ...normalizePageOptions(options),
        action: requireString(options.action),
        ruleVersionId: requireString(options.ruleVersionId)
      });
    },
    updateDistributionRules(payload = {}, actor = {}) {
      return repository.updateAdminDistributionRules(payload, actor);
    },
    getDistributors(options = {}) {
      return repository.getAdminDistributors({
        ...normalizePageOptions(options),
        keyword: requireString(options.keyword),
        status: requireString(options.status)
      });
    },
    getDistributorDetail(distributorId) {
      return repository.getAdminDistributorDetail(requireString(distributorId));
    },
    updateDistributorStatus(distributorId, status) {
      return repository.updateAdminDistributorStatus(
        requireString(distributorId),
        requireString(status, "disabled")
      );
    },
    getWithdrawalRequests(options = {}) {
      return repository.getAdminWithdrawalRequests({
        ...normalizePageOptions(options),
        keyword: requireString(options.keyword),
        status: requireString(options.status)
      });
    },
    getWithdrawalDetail(withdrawalId) {
      return repository.getAdminWithdrawalDetail(requireString(withdrawalId));
    },
    reviewWithdrawal(withdrawalId, payload = {}, actor = {}) {
      return repository.reviewAdminWithdrawalRequest(
        requireString(withdrawalId),
        payload,
        actor || {}
      );
    },
    payoutWithdrawal(withdrawalId, payload = {}, actor = {}) {
      return repository.payoutAdminWithdrawalRequest(
        requireString(withdrawalId),
        payload,
        actor || {}
      );
    },

    // ── 页面装修管理 ──

    getBanners() {
      return repository.getAdminBanners();
    },
    saveBanner(payload = {}) {
      return repository.saveBanner({
        bannerId: requireString(payload.bannerId || payload.id),
        title: requireString(payload.title),
        subtitle: requireString(payload.subtitle),
        imageUrl: requireString(payload.imageUrl),
        linkType: requireString(payload.linkType, "none"),
        linkValue: requireString(payload.linkValue),
        sortOrder: Number(payload.sortOrder || 0),
        status: requireString(payload.status, "enabled")
      });
    },
    deleteBanner(bannerId) {
      return repository.deleteBanner(requireString(bannerId));
    },
    reorderBanners(items = []) {
      if (!Array.isArray(items) || items.length === 0) {
        throw createStorefrontError("排序数据不能为空", 400, "REORDER_ITEMS_EMPTY");
      }

      return repository.reorderBanners(items);
    },
    getPageSections() {
      return repository.getPageSections();
    },
    updatePageSection(sectionKey, payload = {}) {
      return repository.updatePageSection(requireString(sectionKey), {
        visible: payload.visible !== undefined ? Boolean(payload.visible) : undefined,
        sortOrder: payload.sortOrder !== undefined ? Number(payload.sortOrder) : undefined,
        config: payload.config
      });
    },
    reorderPageSections(items = []) {
      if (!Array.isArray(items) || items.length === 0) {
        throw createStorefrontError("排序数据不能为空", 400, "REORDER_ITEMS_EMPTY");
      }

      return repository.reorderPageSections(items);
    },
    getStoreTheme() {
      return repository.getStoreTheme();
    },
    updateStoreTheme(themeKey, themeValue) {
      return repository.updateStoreTheme(requireString(themeKey), String(themeValue || ""));
    }
  };
}

module.exports = {
  createAdminService
};
