function getSellableStock(sku = {}) {
  return Math.max(0, Number(sku.stock || 0) - Number(sku.lockStock || 0));
}

module.exports = {
  getSellableStock
};
