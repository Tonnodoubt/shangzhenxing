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
