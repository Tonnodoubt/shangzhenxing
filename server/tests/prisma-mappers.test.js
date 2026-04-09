const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaMapperModule } = require("../src/repositories/storefront/prisma-mappers");

function createMapperModule(overrides = {}) {
  return createStorefrontPrismaMapperModule({
    accentPalette: ["#111111", "#222222", "#333333"],
    createStorefrontError: (message, statusCode, code) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.code = code;
      return error;
    },
    ...overrides
  });
}

test("mapper helper builds checkout summary with coupon threshold", () => {
  const mapperModule = createMapperModule();

  const result = mapperModule.helpers.buildCheckoutSummary([
    {
      price: 60,
      quantity: 2
    }
  ], {
    amount: 20,
    threshold: 99
  });

  assert.deepEqual(result, {
    totalCount: 2,
    goodsAmountNumber: 120,
    discountAmountNumber: 20,
    payableAmountNumber: 100,
    goodsAmount: "120.00",
    discountAmount: "20.00",
    payableAmount: "100.00"
  });
});

test("mapper helper maps order flags and aftersale state", () => {
  const mapperModule = createMapperModule();

  const result = mapperModule.helpers.mapOrder({
    orderNo: "NO20260402001",
    status: "shipping",
    payableAmount: 88,
    goodsAmount: 108,
    discountAmount: 20,
    createdAt: "2026-04-02T10:30:00.000Z",
    address: {
      id: "addr-1",
      receiver: "张三",
      phone: "13800000000",
      detail: "浦东新区"
    },
    items: [
      {
        productId: "product-1",
        title: "坚果礼盒",
        price: 88,
        quantity: 1,
        subtotalAmount: 88
      }
    ],
    afterSale: {
      status: "processing"
    }
  });

  assert.equal(result.id, "NO20260402001");
  assert.equal(result.statusText, "待收货");
  assert.equal(result.aftersaleStatusText, "售后处理中");
  assert.equal(result.canCancel, false);
  assert.equal(result.canConfirm, true);
  assert.equal(result.canAftersale, true);
  assert.equal(result.items[0].subtotal, "88.00");
});

test("mapper helper rejects invalid order status transitions", () => {
  const mapperModule = createMapperModule();

  assert.throws(
    () => mapperModule.helpers.assertUserOrderStatusTransition("pending", "done"),
    /当前订单不能执行这个操作/
  );
});

test("mapper helper maps user avatar url", () => {
  const mapperModule = createMapperModule();

  const result = mapperModule.helpers.mapUser({
    id: "user-1",
    nickname: "阿青",
    avatarUrl: "https://example.com/avatar-1.png",
    mobile: "13800000000",
    isAuthorized: true
  });

  assert.deepEqual(result, {
    id: "user-1",
    nickname: "阿青",
    avatarUrl: "https://example.com/avatar-1.png",
    level: "普通会员",
    phone: "13800000000",
    isAuthorized: true
  });
});

test("mapper helper exposes sellable sku options for product detail", () => {
  const mapperModule = createMapperModule();

  const result = mapperModule.helpers.mapProduct({
    id: "product-1",
    title: "坚果礼盒",
    shortDesc: "今日现货",
    price: 39.9,
    marketPrice: 59.9,
    status: "on_sale",
    skus: [
      {
        id: "sku-1",
        specText: "单盒",
        price: 39.9,
        stock: 2,
        lockStock: 0
      },
      {
        id: "sku-2",
        specText: "双盒",
        price: 69.9,
        stock: 1,
        lockStock: 1
      }
    ]
  });

  assert.deepEqual(result.specs, ["单盒"]);
  assert.equal(result.availableStock, 2);
  assert.deepEqual(result.skuOptions, [
    {
      skuId: "sku-1",
      specText: "单盒",
      price: 39.9,
      displayPrice: "39.90",
      availableStock: 2
    }
  ]);
});

test("mapper helper exposes available stock for cart items", () => {
  const mapperModule = createMapperModule();

  const result = mapperModule.helpers.mapCartItem({
    productId: "product-1",
    skuId: "sku-1",
    title: "坚果礼盒",
    price: 39.9,
    quantity: 2,
    specText: "单盒",
    sku: {
      id: "sku-1",
      stock: 3,
      lockStock: 1
    }
  });

  assert.equal(result.skuId, "sku-1");
  assert.equal(result.availableStock, 2);
  assert.equal(result.displaySubtotal, "79.80");
});
