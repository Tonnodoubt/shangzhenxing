const envConfig = require("../config/env");
const request = require("./request");
const mallService = require("../shared/mall-core");

function shouldUseApi() {
  return envConfig.mallDataSource === "api";
}

async function getHomeData() {
  if (!shouldUseApi()) {
    return mallService.getHomeData();
  }

  return request.get("/api/v1/home");
}

async function getCategories() {
  if (!shouldUseApi()) {
    return mallService.getCategories();
  }

  return request.get("/api/v1/categories");
}

async function getProducts(params = {}) {
  if (!shouldUseApi()) {
    if (params.keyword) {
      return mallService.searchProducts(params.keyword);
    }

    return mallService.getProductsByCategory(params.categoryId || "all");
  }

  return request.get("/api/v1/products", params);
}

async function getProductDetail(id) {
  if (!shouldUseApi()) {
    return mallService.getProductDetail(id);
  }

  return request.get(`/api/v1/products/${id}`);
}

module.exports = {
  getHomeData,
  getCategories,
  getProducts,
  getProductDetail
};
