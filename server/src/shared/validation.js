const { z } = require("zod");

const addressSchema = z.object({
  receiver: z.string().min(1).max(50),
  phone: z.string().regex(/^1\d{10}$/, "请输入正确的 11 位手机号"),
  detail: z.string().min(1).max(200),
  tag: z.string().max(20).optional()
});

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().max(999)
});

const orderSubmitSchema = z.object({
  addressId: z.string().min(1),
  couponId: z.string().optional(),
  remark: z.string().max(200).optional()
});

const afterSaleSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(1).max(100),
  description: z.string().max(500).optional()
});

const authorizeSchema = z.object({
  phoneCode: z.string().optional(),
  phoneNumber: z.string().regex(/^1\d{10}$/).optional(),
  nickname: z.string().max(30).optional(),
  avatarUrl: z.string().max(500).optional()
});

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  parentId: z.string().optional(),
  sortOrder: z.number().int().min(0).max(999).optional()
});

const productSchema = z.object({
  title: z.string().min(1).max(100),
  price: z.number().positive(),
  categoryId: z.string().min(1)
});

const couponTemplateSchema = z.object({
  title: z.string().min(1).max(50),
  amount: z.number().positive(),
  threshold: z.number().nonnegative()
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});

    if (!result.success) {
      const firstError = result.error.issues[0];
      const message = firstError
        ? `${firstError.path.join(".") || "输入"}: ${firstError.message}`
        : "参数校验失败";

      res.status(400).json({
        success: false,
        message,
        code: 40001,
        requestId: req.requestId || null
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

module.exports = {
  addressSchema,
  cartItemSchema,
  orderSubmitSchema,
  afterSaleSchema,
  authorizeSchema,
  categorySchema,
  productSchema,
  couponTemplateSchema,
  validateBody
};
