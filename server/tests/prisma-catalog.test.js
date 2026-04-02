const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaCatalogModule } = require("../src/repositories/storefront/prisma-catalog");

function createCatalogModule(overrides = {}) {
  return createStorefrontPrismaCatalogModule({
    banners: [
      {
        id: "banner-1"
      }
    ],
    quickEntries: [
      {
        id: "entry-1"
      }
    ],
    buildCategoryRows: (categories = []) => ([{ id: "all", name: "全部" }]).concat(categories),
    getPrisma: async () => ({
      product: {
        findMany: async () => [],
        findUnique: async () => null
      },
      category: {
        findMany: async () => []
      }
    }),
    mapProduct: (product = {}) => ({
      id: product.id || "",
      title: product.title || ""
    }),
    ...overrides
  });
}

test("catalog method builds home payload from mapped products", async () => {
  const products = Array.from({ length: 6 }, (_, index) => ({
    id: `product-${index + 1}`,
    title: `商品 ${index + 1}`
  }));
  const catalogModule = createCatalogModule({
    getPrisma: async () => ({
      product: {
        findMany: async () => products
      }
    }),
    mapProduct: (product = {}) => ({
      id: product.id,
      title: product.title
    })
  });

  const result = await catalogModule.methods.getHomeData();

  assert.equal(result.banners.length, 1);
  assert.equal(result.quickEntries.length, 1);
  assert.deepEqual(result.featuredProducts.map((item) => item.id), [
    "product-1",
    "product-2",
    "product-3",
    "product-4"
  ]);
  assert.deepEqual(result.recommendedProducts.map((item) => item.id), [
    "product-5",
    "product-6"
  ]);
});

test("catalog method skips product search when keyword is blank", async () => {
  let queried = false;
  const catalogModule = createCatalogModule({
    getPrisma: async () => ({
      product: {
        findMany: async () => {
          queried = true;

          return [];
        }
      },
      category: {
        findMany: async () => []
      }
    })
  });

  const result = await catalogModule.methods.searchProducts("   ");

  assert.deepEqual(result, []);
  assert.equal(queried, false);
});

test("catalog method applies category filter when category is not all", async () => {
  let receivedWhere = null;
  const catalogModule = createCatalogModule({
    getPrisma: async () => ({
      product: {
        findMany: async ({ where }) => {
          receivedWhere = where;

          return [];
        },
        findUnique: async () => null
      },
      category: {
        findMany: async () => []
      }
    })
  });

  await catalogModule.methods.getProductsByCategory("cat-9");

  assert.deepEqual(receivedWhere, {
    status: "on_sale",
    categoryId: "cat-9"
  });
});

test("catalog method returns null when product detail is missing", async () => {
  const catalogModule = createCatalogModule();

  const result = await catalogModule.methods.getProductDetail("missing-product");

  assert.equal(result, null);
});
