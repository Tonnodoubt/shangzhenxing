const banners = [
  {
    id: "banner-1",
    title: "新人福利专区",
    subtitle: "领券下单享优惠，好物一站直达",
    accent: "linear-gradient(135deg, #F4D9C9, #F7F1E8)"
  },
  {
    id: "banner-2",
    title: "臻泉精选好物",
    subtitle: "品质饮品、精致礼盒，为你用心甄选",
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
    shortDesc: "严选多款人气零食，搭配精美礼盒包装，送礼自用皆宜。",
    price: 129,
    marketPrice: 169,
    tag: "热销",
    coverLabel: "礼盒",
    accent: "#F6D4C8",
    salesText: "月销 238",
    specs: ["标准装", "升级装"],
    highlights: ["多种口味组合，满足不同偏好", "精美礼盒包装，送礼体面", "新鲜生产，品质保证"]
  },
  {
    id: "p2",
    categoryId: "drink",
    title: "轻饮系列组合装",
    shortDesc: "低糖清爽饮品组合，精选水果风味，畅饮无负担。",
    price: 89,
    marketPrice: 119,
    tag: "新品",
    coverLabel: "饮品",
    accent: "#D7E7DE",
    salesText: "月销 152",
    specs: ["6 瓶装", "12 瓶装"],
    highlights: ["低糖配方，健康无负担", "天然果味，清爽解渴", "便携包装，随时随地享受"]
  },
  {
    id: "p3",
    categoryId: "home",
    title: "日常家居收纳套组",
    shortDesc: "简约实用收纳方案，帮您轻松整理居家空间。",
    price: 149,
    marketPrice: 199,
    tag: "推荐",
    coverLabel: "家居",
    accent: "#E8DFC8",
    salesText: "月销 96",
    specs: ["基础套组", "完整套组"],
    highlights: ["多场景适用，分类收纳更高效", "环保材质，结实耐用", "简约设计，美观不占地"]
  },
  {
    id: "p4",
    categoryId: "digital",
    title: "便携数码周边单品",
    shortDesc: "出行好伴侣，小巧便携，日常使用更方便。",
    price: 219,
    marketPrice: 269,
    tag: "精选",
    coverLabel: "数码",
    accent: "#D8E0F0",
    salesText: "月销 84",
    specs: ["标准版", "高配版"],
    highlights: ["小巧轻便，随身携带", "兼容多设备，即插即用", "高品质做工，持久耐用"]
  },
  {
    id: "p5",
    categoryId: "gift",
    title: "节日限定心意礼袋",
    shortDesc: "节日专属定制礼袋，传递温暖心意，让每一份祝福更有仪式感。",
    price: 99,
    marketPrice: 139,
    tag: "活动",
    coverLabel: "限定",
    accent: "#F2D2DB",
    salesText: "月销 178",
    specs: ["心意装", "分享装"],
    highlights: ["节日限定，限量发售", "精美定制包装，仪式感满满", "超值组合，物超所值"]
  },
  {
    id: "p6",
    categoryId: "drink",
    title: "冷萃风味尝鲜组合",
    shortDesc: "精选冷萃工艺，保留原味醇香，一包体验多种风味。",
    price: 69,
    marketPrice: 89,
    tag: "爆款",
    coverLabel: "尝鲜",
    accent: "#CFE2EA",
    salesText: "月销 301",
    specs: ["尝鲜包", "家庭包"],
    highlights: ["冷萃工艺，口感醇厚顺滑", "多种风味，一次尝遍", "高性价比入门首选"]
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
