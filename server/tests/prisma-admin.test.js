const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaRepository } = require("../src/repositories/storefront/prisma");

test("prisma repository exposes admin category queries through the extracted admin module", async () => {
  const createdAt = new Date("2026-04-01T10:00:00+08:00");
  const prisma = {
    category: {
      count: async () => 1,
      findMany: async (options) => {
        assert.equal(options.skip, 20);
        assert.equal(options.take, 20);

        return [
          {
            id: "cat-snack",
            parentId: null,
            name: "零食",
            sortOrder: 10,
            status: "enabled",
            createdAt,
            updatedAt: createdAt
          }
        ];
      }
    }
  };
  const repository = createStorefrontPrismaRepository(() => prisma);

  const result = await repository.getAdminCategories({
    page: 2,
    pageSize: 20
  });

  assert.deepEqual(result, {
    list: [
      {
        categoryId: "cat-snack",
        parentId: 0,
        name: "零食",
        sortOrder: 10,
        status: "enabled",
        statusText: "启用",
        createdAt: "2026-04-01 10:00",
        updatedAt: "2026-04-01 10:00"
      }
    ],
    page: 2,
    pageSize: 20,
    total: 1
  });
});

test("prisma repository ships admin orders through the extracted admin module", async () => {
  const createdAt = new Date("2026-04-01T09:30:00+08:00");
  const shippedAt = new Date("2026-04-01T11:00:00+08:00");
  const currentOrder = {
    id: "order-1",
    orderNo: "NO20260401001",
    userId: "user-1",
    status: "pending",
    goodsAmount: 58,
    discountAmount: 0,
    payableAmount: 58,
    remark: "尽快发货",
    address: {
      receiver: "张三",
      phone: "13800000000",
      province: "上海市",
      city: "上海市",
      district: "浦东新区",
      detail: "世纪大道 1 号"
    },
    user: {
      nickname: "测试买家"
    },
    afterSale: null,
    items: [
      {
        id: "item-1",
        productId: "prod-1",
        title: "坚果礼盒",
        skuId: "sku-1",
        specText: "默认规格",
        quantity: 2,
        subtotalAmount: 58
      }
    ],
    createdAt,
    updatedAt: createdAt
  };
  const tx = {
    order: {
      findFirst: async (options) => {
        assert.equal(options.where.orderNo, currentOrder.orderNo);
        return currentOrder;
      },
      update: async (options) => {
        assert.equal(options.data.status, "shipping");
        assert.equal(options.data.shipmentCompanyName, "顺丰速运");
        assert.equal(options.data.shipmentTrackingNo, "SF1234567890");

        return {
          ...currentOrder,
          status: "shipping",
          shipmentCompanyCode: options.data.shipmentCompanyCode,
          shipmentCompanyName: options.data.shipmentCompanyName,
          shipmentTrackingNo: options.data.shipmentTrackingNo,
          shippedAt,
          updatedAt: shippedAt
        };
      }
    }
  };
  const prisma = {
    $transaction: async (handler) => handler(tx)
  };
  const repository = createStorefrontPrismaRepository(() => prisma);

  const result = await repository.shipAdminOrder(currentOrder.orderNo, {
    companyCode: "SF",
    companyName: "顺丰速运",
    trackingNo: "SF1234567890"
  });

  assert.equal(result.order.orderStatus, "shipping");
  assert.equal(result.order.orderStatusText, "待收货");
  assert.equal(result.order.receiverAddress, "上海市 上海市 浦东新区 世纪大道 1 号");
  assert.equal(result.shipment.companyCode, "SF");
  assert.equal(result.shipment.companyName, "顺丰速运");
  assert.equal(result.shipment.trackingNo, "SF1234567890");
  assert.equal(result.shipment.shippedAt, "2026-04-01 11:00");
});

test("prisma repository reviews admin aftersales through the extracted admin module", async () => {
  const createdAt = new Date("2026-04-01T09:30:00+08:00");
  const reviewedAt = new Date("2026-04-01T12:15:00+08:00");
  const currentAfterSale = {
    id: "as-1",
    userId: "user-1",
    reason: "不想要了",
    description: "想改个口味",
    status: "processing",
    reviewRemark: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt,
    user: {
      nickname: "测试买家"
    },
    order: {
      orderNo: "NO20260401001",
      userId: "user-1",
      status: "shipping",
      address: {
        receiver: "张三"
      }
    }
  };
  const tx = {
    afterSale: {
      findUnique: async (options) => {
        assert.equal(options.where.id, currentAfterSale.id);
        return currentAfterSale;
      },
      update: async (options) => {
        assert.equal(options.data.status, "approved");
        assert.equal(options.data.reviewRemark, "同意处理");

        return {
          ...currentAfterSale,
          status: "approved",
          reviewRemark: options.data.reviewRemark,
          reviewedAt,
          reviewedBy: options.data.reviewedBy
        };
      }
    }
  };
  const prisma = {
    $transaction: async (handler) => handler(tx)
  };
  const repository = createStorefrontPrismaRepository(() => prisma);

  const result = await repository.reviewAdminAfterSale(
    currentAfterSale.id,
    "approve",
    "同意处理",
    {
      username: "auditor"
    }
  );

  assert.equal(result.afterSaleId, "as-1");
  assert.equal(result.status, "approved");
  assert.equal(result.statusText, "已通过");
  assert.equal(result.orderStatus, "shipping");
  assert.equal(result.orderStatusText, "待收货");
  assert.equal(result.reviewedBy, "auditor");
  assert.equal(result.reviewedAt, "2026-04-01 12:15");
});
