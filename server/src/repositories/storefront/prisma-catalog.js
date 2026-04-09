function createStorefrontPrismaCatalogModule({
  banners,
  quickEntries,
  buildCategoryRows,
  getPrisma,
  mapProduct
}) {
  function getSellableStock(sku = {}) {
    return Math.max(0, Number(sku.stock || 0) - Number(sku.lockStock || 0));
  }

  function normalizeSellableProduct(product) {
    if (!product || product.status !== "on_sale") {
      return null;
    }

    const sellableSkus = (product.skus || []).filter((item) => {
      return item.status === "enabled" && getSellableStock(item) > 0;
    });

    if (!sellableSkus.length) {
      return null;
    }

    return {
      ...product,
      skus: sellableSkus
    };
  }

  async function getHomeData() {
    const prisma = await getPrisma();
    const products = await prisma.product.findMany({
      where: {
        status: "on_sale"
      },
      include: {
        skus: {
          where: {
            status: "enabled"
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "desc"
        }
      ],
      take: 24
    });
    const mappedProducts = products
      .map((item) => normalizeSellableProduct(item))
      .filter(Boolean)
      .slice(0, 8)
      .map((item) => mapProduct(item));

    return {
      banners,
      quickEntries,
      featuredProducts: mappedProducts.slice(0, 4),
      recommendedProducts: mappedProducts.slice(4, 8)
    };
  }

  async function getCategories() {
    const prisma = await getPrisma();
    const categories = await prisma.category.findMany({
      where: {
        status: "enabled"
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return buildCategoryRows(categories);
  }

  async function searchProducts(keyword) {
    const prisma = await getPrisma();
    const normalizedKeyword = String(keyword || "").trim();

    if (!normalizedKeyword) {
      return [];
    }

    const products = await prisma.product.findMany({
      where: {
        status: "on_sale",
        OR: [
          {
            title: {
              contains: normalizedKeyword
            }
          },
          {
            shortDesc: {
              contains: normalizedKeyword
            }
          },
          {
            subTitle: {
              contains: normalizedKeyword
            }
          }
        ]
      },
      include: {
        skus: {
          where: {
            status: "enabled"
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    return products
      .map((item) => normalizeSellableProduct(item))
      .filter(Boolean)
      .map((item) => mapProduct(item));
  }

  async function getProductsByCategory(categoryId) {
    const prisma = await getPrisma();
    const where = {
      status: "on_sale"
    };

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        skus: {
          where: {
            status: "enabled"
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: [
        {
          sortOrder: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    return products
      .map((item) => normalizeSellableProduct(item))
      .filter(Boolean)
      .map((item) => mapProduct(item));
  }

  async function getProductDetail(productId) {
    const prisma = await getPrisma();
    const product = await prisma.product.findUnique({
      where: {
        id: productId
      },
      include: {
        skus: {
          where: {
            status: "enabled"
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      }
    });

    if (!product) {
      return null;
    }

    const sellableProduct = normalizeSellableProduct(product);

    if (!sellableProduct) {
      return null;
    }

    return mapProduct(sellableProduct);
  }

  return {
    methods: {
      getCategories,
      getHomeData,
      getProductDetail,
      getProductsByCategory,
      searchProducts
    }
  };
}

module.exports = {
  createStorefrontPrismaCatalogModule
};
