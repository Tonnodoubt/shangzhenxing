function createStorefrontPrismaCatalogModule({
  banners,
  quickEntries,
  buildCategoryRows,
  getPrisma,
  mapProduct
}) {
  async function getHomeData() {
    const prisma = await getPrisma();
    const products = await prisma.product.findMany({
      where: {
        status: "on_sale"
      },
      include: {
        skus: {
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
      take: 8
    });
    const mappedProducts = products.map((item) => mapProduct(item));

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

    return products.map((item) => mapProduct(item));
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

    return products.map((item) => mapProduct(item));
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

    return mapProduct(product);
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
