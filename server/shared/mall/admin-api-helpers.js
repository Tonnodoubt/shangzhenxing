function getDisplayTextByStatus(status, textMap) {
  return textMap[status] || "未知状态";
}

function getCategoryStatusText(status) {
  return getDisplayTextByStatus(status, {
    enabled: "启用",
    disabled: "禁用"
  });
}

function getGenericStatusText(status) {
  return getDisplayTextByStatus(status, {
    enabled: "启用",
    disabled: "禁用",
    active: "正常",
    pending_review: "待审核",
    frozen: "已冻结"
  });
}

function getPayStatus(order) {
  return order.payStatus || (order.status === "pending_payment" ? "unpaid" : "paid");
}

function getPayStatusText(status) {
  return getDisplayTextByStatus(status, {
    unpaid: "未支付",
    paid: "已支付",
    refunded: "已退款",
    part_refunded: "部分退款"
  });
}

function getAdminOrderStatus(order) {
  const statusMap = {
    pending: "pending_shipment",
    shipping: "shipping",
    done: "done",
    cancelled: "cancelled",
    pending_payment: "pending_payment"
  };

  return statusMap[order.status] || order.status || "pending_shipment";
}

function getAdminAfterSaleStatus(status) {
  return status === "processing" ? "pending_review" : status;
}

function getAdminAfterSaleStatusText(status) {
  return getDisplayTextByStatus(getAdminAfterSaleStatus(status), {
    pending_review: "待审核",
    approved: "已通过",
    rejected: "已驳回",
    done: "已完成"
  });
}

module.exports = {
  getDisplayTextByStatus,
  getCategoryStatusText,
  getGenericStatusText,
  getPayStatus,
  getPayStatusText,
  getAdminOrderStatus,
  getAdminAfterSaleStatus,
  getAdminAfterSaleStatusText
};
