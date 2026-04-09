const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaCartModule } = require("../src/repositories/storefront/prisma-cart");

function buildCartPageData(cartItems = []) {
  return {
    totalCount: (cartItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    cartItems
  };
}

function createCartModule(overrides = {}) {
  return createStorefrontPrismaCartModule({
    buildCartPageData,
    createStorefrontError: (message, statusCode, code) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.code = code;
      return error;
    },
    getCurrentUserContext: async () => ({
      prisma: {},
      user: {
        id: "user-1"
      }
    }),
    mapAddress: (address) => address,
    toNumber: (value) => Number(value || 0),
    ...overrides
  });
}

test("cart method creates the first address as default", async () => {
  let createdPayload = null;
  const tx = {
    address: {
      updateMany: async () => null,
      create: async ({ data }) => {
        createdPayload = data;

        return {
          id: "addr-1",
          ...data
        };
      }
    }
  };
  const prisma = {
    address: {
      findMany: async () => []
    },
    $transaction: async (handler) => handler(tx)
  };
  const cartModule = createCartModule({
    getCurrentUserContext: async () => ({
      prisma,
      user: {
        id: "user-1"
      }
    }),
    mapAddress: (address) => ({
      id: address.id,
      isDefault: !!address.isDefault
    })
  });

  const result = await cartModule.methods.createAddress("session-token", {
    receiver: "张三",
    phone: "13800000000",
    detail: "上海市浦东新区",
    tag: "家"
  });

  assert.equal(createdPayload.isDefault, true);
  assert.deepEqual(result, {
    id: "addr-1",
    isDefault: true
  });
});

test("cart method promotes the next address when deleting the current one", async () => {
  let promotedAddressId = null;
  const tx = {
    address: {
      deleteMany: async () => null,
      findFirst: async () => ({
        id: "addr-2"
      }),
      updateMany: async () => null,
      update: async ({ where }) => {
        promotedAddressId = where.id;

        return null;
      }
    }
  };
  const prisma = {
    address: {
      findMany: async () => ([
        {
          id: "addr-2",
          receiver: "李四",
          isDefault: true
        }
      ])
    },
    $transaction: async (handler) => handler(tx)
  };
  const cartModule = createCartModule({
    getCurrentUserContext: async () => ({
      prisma,
      user: {
        id: "user-1"
      }
    }),
    mapAddress: (address) => ({
      id: address.id,
      receiver: address.receiver,
      isDefault: !!address.isDefault
    })
  });

  const result = await cartModule.methods.deleteAddress("session-token", "addr-1");

  assert.equal(promotedAddressId, "addr-2");
  assert.deepEqual(result, {
    addresses: [
      {
        id: "addr-2",
        receiver: "李四",
        isDefault: true
      }
    ],
    selectedAddressId: "addr-2"
  });
});

test("cart method increments existing cart items", async () => {
  let updatedPayload = null;
  const prisma = {
    product: {
      findUnique: async () => ({
        id: "product-1",
        title: "坚果礼盒",
        price: 49.9,
        status: "on_sale",
        skus: [
          {
            id: "sku-1",
            specText: "默认规格",
            price: 49.9,
            stock: 10,
            lockStock: 0,
            status: "enabled"
          }
        ]
      })
    },
    cart: {
      upsert: async () => ({
        id: "cart-1"
      }),
      findUnique: async () => ({
        id: "cart-1"
      })
    },
    cartItem: {
      findFirst: async () => ({
        id: "item-1",
        quantity: 2
      }),
      update: async (payload) => {
        updatedPayload = payload;

        return payload;
      },
      findMany: async () => ([
        {
          id: "item-1",
          productId: "product-1",
          quantity: 3
        }
      ])
    }
  };
  const cartModule = createCartModule({
    getCurrentUserContext: async () => ({
      prisma,
      user: {
        id: "user-1"
      }
    })
  });

  const result = await cartModule.methods.addToCart("session-token", {
    id: "product-1",
    title: "坚果礼盒",
    quantity: 2,
    specText: "默认规格"
  });

  assert.deepEqual(updatedPayload, {
    where: {
      id: "item-1"
    },
    data: {
      skuId: "sku-1",
      title: "坚果礼盒",
      specText: "默认规格",
      price: 49.9,
      quantity: {
        increment: 2
      }
    }
  });
  assert.deepEqual(result, {
    totalCount: 3,
    cartItems: [
      {
        id: "item-1",
        productId: "product-1",
        quantity: 3
      }
    ]
  });
});

test("cart method rejects add to cart when requested quantity exceeds stock", async () => {
  const cartModule = createCartModule({
    getCurrentUserContext: async () => ({
      prisma: {
        product: {
          findUnique: async () => ({
            id: "product-2",
            title: "现烤吐司",
            price: 12.8,
            status: "on_sale",
            skus: [
              {
                id: "sku-2",
                specText: "标准装",
                price: 12.8,
                stock: 1,
                lockStock: 0,
                status: "enabled"
              }
            ]
          })
        },
        cart: {
          upsert: async () => ({
            id: "cart-1"
          })
        },
        cartItem: {
          findFirst: async () => null
        }
      },
      user: {
        id: "user-1"
      }
    })
  });

  await assert.rejects(
    () => cartModule.methods.addToCart("session-token", {
      id: "product-2",
      quantity: 2,
      specText: "标准装"
    }),
    (error) => {
      assert.equal(error.code, "STOCK_INSUFFICIENT");
      return true;
    }
  );
});
