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
    quantity: 2
  });

  assert.deepEqual(updatedPayload, {
    where: {
      id: "item-1"
    },
    data: {
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
