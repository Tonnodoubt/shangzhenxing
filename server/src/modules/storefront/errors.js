function createStorefrontError(message, statusCode = 500, code = "") {
  const error = new Error(message || "服务异常");

  error.statusCode = statusCode;

  if (code) {
    error.code = code;
  }

  return error;
}

function createUnauthorizedError(message = "登录态已失效，请重新登录") {
  return createStorefrontError(message, 401, "UNAUTHORIZED");
}

module.exports = {
  createStorefrontError,
  createUnauthorizedError
};
