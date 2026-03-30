const { categories: mockCategories, products: mockProducts } = require("../../../../miniprogram/data/mock");

function parseSalesCount(salesText) {
  const matched = String(salesText || "").match(/\d+/);

  return matched ? Number(matched[0]) : 0;
}

function buildCategorySeeds() {
  return mockCategories
    .filter((item) => String(item.id || "").trim() && item.id !== "all")
    .map((item, index) => ({
      id: item.id,
      parentId: item.parentId || null,
      name: item.name || `分类 ${index + 1}`,
      sortOrder: Number(item.sortOrder || (index + 1) * 10),
      status: item.status || "enabled",
      createdAt: new Date(`2026-03-${String(20 + Math.min(index, 8)).padStart(2, "0")}T10:00:00+08:00`),
      updatedAt: new Date(`2026-03-${String(20 + Math.min(index, 8)).padStart(2, "0")}T10:00:00+08:00`)
    }));
}

function buildProductSeeds() {
  return mockProducts.map((item, index) => ({
    id: item.id,
    categoryId: item.categoryId || null,
    title: item.title || `商品 ${index + 1}`,
    shortDesc: item.shortDesc || "",
    subTitle: item.subTitle || item.shortDesc || "",
    coverImage: item.coverImage || `https://example.com/products/${item.id}.jpg`,
    detailContent: item.detailContent || `<p>${item.shortDesc || item.title || "商品详情"}</p><p>${(item.highlights || []).join(" / ")}</p>`,
    price: Number(item.price || 0),
    marketPrice: Number(item.marketPrice || item.price || 0),
    salesCount: Number(item.salesCount || parseSalesCount(item.salesText)),
    favoriteCount: Number(item.favoriteCount || 20 + index * 6),
    distributionEnabled: typeof item.distributionEnabled === "boolean" ? item.distributionEnabled : true,
    status: item.status || "on_sale",
    sortOrder: Number(item.sortOrder || (index + 1) * 10),
    createdAt: new Date(`2026-03-${String(20 + Math.min(index, 8)).padStart(2, "0")}T11:00:00+08:00`),
    updatedAt: new Date(`2026-03-${String(20 + Math.min(index, 8)).padStart(2, "0")}T11:00:00+08:00`)
  }));
}

function buildSkuSeeds(product, productIndex) {
  const specs = Array.isArray(product.specs) && product.specs.length ? product.specs : ["默认规格"];

  return specs.map((specText, specIndex) => ({
    id: `sku-${product.id}-${specIndex + 1}`,
    productId: product.id,
    skuCode: `${String(product.id || "").toUpperCase()}-${specIndex + 1}`,
    specText,
    price: Number(product.price || 0) + specIndex * 20,
    originPrice: Number(product.marketPrice || product.price || 0) + specIndex * 20,
    stock: Math.max(30, 96 - productIndex * 8 - specIndex * 6),
    lockStock: specIndex === 0 ? 2 : 0,
    status: "enabled",
    createdAt: new Date(`2026-03-${String(20 + Math.min(productIndex, 8)).padStart(2, "0")}T12:00:00+08:00`),
    updatedAt: new Date(`2026-03-${String(20 + Math.min(productIndex, 8)).padStart(2, "0")}T12:00:00+08:00`)
  }));
}

function buildProductSkuSeeds() {
  return mockProducts.reduce((list, product, index) => list.concat(buildSkuSeeds(product, index)), []);
}

function getStorefrontSeedSummary() {
  const categories = buildCategorySeeds();
  const products = buildProductSeeds();
  const skus = buildProductSkuSeeds();

  return {
    categoryCount: categories.length,
    productCount: products.length,
    skuCount: skus.length
  };
}

async function seedStorefrontCatalog(prisma) {
  const categorySeeds = buildCategorySeeds();
  const productSeeds = buildProductSeeds();
  const productSkuSeeds = buildProductSkuSeeds();

  for (const category of categorySeeds) {
    await prisma.category.upsert({
      where: {
        id: category.id
      },
      update: {
        parentId: category.parentId,
        name: category.name,
        sortOrder: category.sortOrder,
        status: category.status,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
      },
      create: category
    });
  }

  for (const product of productSeeds) {
    await prisma.product.upsert({
      where: {
        id: product.id
      },
      update: {
        categoryId: product.categoryId,
        title: product.title,
        shortDesc: product.shortDesc,
        subTitle: product.subTitle,
        coverImage: product.coverImage,
        detailContent: product.detailContent,
        price: product.price,
        marketPrice: product.marketPrice,
        salesCount: product.salesCount,
        favoriteCount: product.favoriteCount,
        distributionEnabled: product.distributionEnabled,
        status: product.status,
        sortOrder: product.sortOrder,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      create: product
    });
  }

  for (const sku of productSkuSeeds) {
    await prisma.productSku.upsert({
      where: {
        id: sku.id
      },
      update: {
        productId: sku.productId,
        skuCode: sku.skuCode,
        specText: sku.specText,
        price: sku.price,
        originPrice: sku.originPrice,
        stock: sku.stock,
        lockStock: sku.lockStock,
        status: sku.status,
        createdAt: sku.createdAt,
        updatedAt: sku.updatedAt
      },
      create: sku
    });
  }

  for (const product of mockProducts) {
    const expectedSkuIds = buildSkuSeeds(product, 0).map((item) => item.id);

    await prisma.productSku.deleteMany({
      where: {
        productId: product.id,
        id: {
          notIn: expectedSkuIds
        }
      }
    });
  }

  return getStorefrontSeedSummary();
}

module.exports = {
  seedStorefrontCatalog,
  getStorefrontSeedSummary
};
