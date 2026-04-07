const ERROR_CODES = {
  UNKNOWN_ERROR: { statusCode: 500, code: "UNKNOWN_ERROR" },
  UNAUTHORIZED: { statusCode: 401, code: "UNAUTHORIZED" },
  FORBIDDEN: { statusCode: 403, code: "FORBIDDEN" },
  NOT_FOUND: { statusCode: 404, code: "NOT_FOUND" },

  WECHAT_LOGIN_CODE_REQUIRED: { statusCode: 400, code: "WECHAT_LOGIN_CODE_REQUIRED" },
  MOCK_LOGIN_DISABLED: { statusCode: 403, code: "MOCK_LOGIN_DISABLED" },

  CATEGORY_NOT_FOUND: { statusCode: 404, code: "CATEGORY_NOT_FOUND" },
  PRODUCT_NOT_FOUND: { statusCode: 404, code: "PRODUCT_NOT_FOUND" },
  SKU_NOT_FOUND: { statusCode: 404, code: "SKU_NOT_FOUND" },
  STOCK_INSUFFICIENT: { statusCode: 400, code: "STOCK_INSUFFICIENT" },

  CART_EMPTY: { statusCode: 400, code: "CART_EMPTY" },
  ADDRESS_REQUIRED: { statusCode: 400, code: "ADDRESS_REQUIRED" },

  ORDER_NOT_FOUND: { statusCode: 404, code: "ORDER_NOT_FOUND" },
  ORDER_STATUS_REQUIRED: { statusCode: 400, code: "ORDER_STATUS_REQUIRED" },
  ORDER_STATUS_TRANSITION_INVALID: { statusCode: 400, code: "ORDER_STATUS_TRANSITION_INVALID" },

  AFTERSALE_NOT_ALLOWED: { statusCode: 400, code: "AFTERSALE_NOT_ALLOWED" },
  AFTERSALE_ALREADY_EXISTS: { statusCode: 409, code: "AFTERSALE_ALREADY_EXISTS" },
  AFTERSALE_NOT_FOUND: { statusCode: 404, code: "AFTERSALE_NOT_FOUND" },
  AFTERSALE_ACTION_REQUIRED: { statusCode: 400, code: "AFTERSALE_ACTION_REQUIRED" },

  COUPON_NOT_FOUND: { statusCode: 404, code: "COUPON_NOT_FOUND" },
  COUPON_TEMPLATE_NOT_FOUND: { statusCode: 404, code: "COUPON_TEMPLATE_NOT_FOUND" },
  COUPON_UNAVAILABLE: { statusCode: 400, code: "COUPON_UNAVAILABLE" },
  COUPON_THRESHOLD_NOT_MET: { statusCode: 400, code: "COUPON_THRESHOLD_NOT_MET" },

  DISTRIBUTOR_NOT_FOUND: { statusCode: 404, code: "DISTRIBUTOR_NOT_FOUND" },

  MEMORY_SOURCE_ERROR: { statusCode: 500, code: "MEMORY_SOURCE_ERROR" }
};

function createAppError(message, codeKey) {
  const spec = ERROR_CODES[codeKey] || ERROR_CODES.UNKNOWN_ERROR;
  const error = new Error(message || "服务异常");

  error.statusCode = spec.statusCode;
  error.code = spec.code;

  return error;
}

function isAppError(error) {
  return !!(error && error.code && error.statusCode);
}

module.exports = {
  ERROR_CODES,
  createAppError,
  isAppError
};
