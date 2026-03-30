const { createStorefrontError } = require("../storefront/errors");
const { createStorefrontRepository } = require("../../repositories/storefront");

function requireString(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizePageOptions(options = {}) {
  return {
    page: Math.max(1, Number(options.page || 1)),
    pageSize: Math.min(100, Math.max(1, Number(options.pageSize || 20)))
  };
}

function createAdminService(repository = createStorefrontRepository()) {
  return {
    getRepositoryMode() {
      return repository.mode || "unknown";
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
    }
  };
}

module.exports = {
  createAdminService
};
