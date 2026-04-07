const { createRequestId, sendData, sendError, wrap } = require("../shared/http");

module.exports = {
  createRequestId,
  sendAdminData: sendData,
  sendAdminError: sendError,
  wrap
};
