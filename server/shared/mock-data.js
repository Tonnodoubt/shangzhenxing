const banners = [
  {
    id: "banner-1",
    title: "新人福利专区",
    subtitle: "先领券再下单，首页直接就能进入",
    accent: "linear-gradient(135deg, #F4D9C9, #F7F1E8)"
  },
  {
    id: "banner-2",
    title: "分享爆款赚佣金",
    subtitle: "推广主推商品后，团队和佣金进度都能追踪",
    accent: "linear-gradient(135deg, #D8E6DF, #F6F1E7)"
  }
];

const quickEntries = [
  {
    id: "entry-1",
    title: "分类专区",
    subtitle: "快速找到想买的商品",
    action: "category"
  },
  {
    id: "entry-2",
    title: "我的订单",
    subtitle: "查看下单和售后进度",
    action: "orders"
  },
  {
    id: "entry-3",
    title: "购物车",
    subtitle: "已选商品一键去结算",
    action: "cart"
  },
  {
    id: "entry-4",
    title: "领券中心",
    subtitle: "先领券，下单更划算",
    action: "coupons"
  },
  {
    id: "entry-5",
    title: "分销中心",
    subtitle: "查看团队和佣金进度",
    action: "distribution"
  }
];

const categories = [
  { id: "all", name: "全部" },
  { id: "gift", name: "礼盒" },
  { id: "drink", name: "饮品" },
  { id: "home", name: "家居" },
  { id: "digital", name: "数码" }
];

const products = [
  {
    id: "p1",
    categoryId: "gift",
    title: "每日精选零食礼盒",
    shortDesc: "适合作为首版商城的标准商品模板",
    price: 129,
    marketPrice: 169,
    tag: "热销",
    coverLabel: "礼盒",
    accent: "#F6D4C8",
    salesText: "月销 238",
    specs: ["标准装", "升级装"],
    highlights: ["可做多规格", "适合活动页", "适合作为首发商品"]
  },
  {
    id: "p2",
    categoryId: "drink",
    title: "轻饮系列组合装",
    shortDesc: "可以替换为任何快消品类",
    price: 89,
    marketPrice: 119,
    tag: "新品",
    coverLabel: "饮品",
    accent: "#D7E7DE",
    salesText: "月销 152",
    specs: ["6 瓶装", "12 瓶装"],
    highlights: ["适合秒杀", "适合满减", "适合复购"]
  },
  {
    id: "p3",
    categoryId: "home",
    title: "日常家居收纳套组",
    shortDesc: "适合验证图文详情和多图展示结构",
    price: 149,
    marketPrice: 199,
    tag: "推荐",
    coverLabel: "家居",
    accent: "#E8DFC8",
    salesText: "月销 96",
    specs: ["基础套组", "完整套组"],
    highlights: ["适合大图详情", "适合搭配推荐", "适合组合销售"]
  },
  {
    id: "p4",
    categoryId: "digital",
    title: "便携数码周边单品",
    shortDesc: "用于测试高客单价商品展示方式",
    price: 219,
    marketPrice: 269,
    tag: "精选",
    coverLabel: "数码",
    accent: "#D8E0F0",
    salesText: "月销 84",
    specs: ["标准版", "高配版"],
    highlights: ["适合规格切换", "适合权益说明", "适合活动价格"]
  },
  {
    id: "p5",
    categoryId: "gift",
    title: "节日限定心意礼袋",
    shortDesc: "适合未来接入节日营销专题",
    price: 99,
    marketPrice: 139,
    tag: "活动",
    coverLabel: "限定",
    accent: "#F2D2DB",
    salesText: "月销 178",
    specs: ["心意装", "分享装"],
    highlights: ["适合限时活动", "适合优惠券", "适合送礼场景"]
  },
  {
    id: "p6",
    categoryId: "drink",
    title: "冷萃风味尝鲜组合",
    shortDesc: "可替换成任何饮品或食品 SKU",
    price: 69,
    marketPrice: 89,
    tag: "爆款",
    coverLabel: "尝鲜",
    accent: "#CFE2EA",
    salesText: "月销 301",
    specs: ["尝鲜包", "家庭包"],
    highlights: ["适合爆品测试", "适合推荐位", "适合复购模型"]
  }
];

const orders = [
  {
    id: "NO20260326001",
    status: "shipping",
    statusText: "待收货",
    createTime: "2026-03-26 16:32",
    amount: 129,
    items: [
      {
        title: "每日精选零食礼盒",
        quantity: 1,
        specText: "标准装"
      }
    ]
  },
  {
    id: "NO20260325002",
    status: "done",
    statusText: "已完成",
    createTime: "2026-03-25 11:08",
    amount: 218,
    items: [
      {
        title: "轻饮系列组合装",
        quantity: 2,
        specText: "6 瓶装"
      }
    ]
  }
];

module.exports = {
  banners,
  quickEntries,
  categories,
  products,
  orders
};
