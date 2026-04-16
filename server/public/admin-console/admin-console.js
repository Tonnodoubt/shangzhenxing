const state = {
  loggedIn: false,
  session: null,
  repositoryMode: "-",
  activeSection: "summary",
  wizardStep: 1,
  productImages: [],
  detailImages: [],
  summary: null,
  categories: [],
  products: [],
  productDetail: null,
  skuDrafts: [],
  orders: [],
  afterSales: [],
  distributionRules: null,
  distributionRuleVersions: [],
  distributionRuleChangeLogs: [],
  distributors: [],
  distributorDetails: new Map(),
  withdrawals: [],
  withdrawalDetails: new Map(),
  orderDetails: new Map(),
  banners: [],
  pageSections: [],
  storeTheme: {},
  couponTemplates: [],
  salesStatistics: [],
  users: [],
  userDetails: new Map(),
  reviews: [],
  notifications: [],
  unreadNotificationCount: 0,
  notificationPollingTimer: null,
  adminUsers: [],
  operationLogs: []
};

const summaryLabels = [
  { key: "pendingShipmentCount", label: "待发货", suffix: "单" },
  { key: "pendingAftersaleCount", label: "待审核售后", suffix: "笔" },
  { key: "shippingOrderCount", label: "待收货", suffix: "单" },
  { key: "todayPaidAmountText", label: "今日成交", suffix: "元" },
  { key: "todayOrderCount", label: "今日订单", suffix: "单" },
  { key: "newUserCount", label: "今日新用户", suffix: "人" },
  { key: "totalUserCount", label: "累计用户", suffix: "人" },
  { key: "totalProductCount", label: "在售商品", suffix: "个" }
];

const nodes = {
  loginForm: document.getElementById("login-form"),
  loginStatus: document.getElementById("login-status"),
  loginSubmit: document.getElementById("login-submit"),
  sessionPanel: document.getElementById("session-panel"),
  sessionName: document.getElementById("session-name"),
  sessionRoles: document.getElementById("session-roles"),
  repositoryMode: document.getElementById("repository-mode"),
  heroRepositoryMode: document.getElementById("hero-repository-mode"),
  sessionStatus: document.getElementById("session-status"),
  navigationPanel: document.getElementById("navigation-panel"),
  workspaceNav: document.getElementById("workspace-nav"),
  workspaceStats: document.getElementById("workspace-stats"),
  workspace: document.getElementById("workspace"),
  summaryPanel: document.getElementById("summary-panel"),
  summaryGrid: document.getElementById("summary-grid"),
  categoriesPanel: document.getElementById("categories-panel"),
  categoriesCount: document.getElementById("categories-count"),
  categoryForm: document.getElementById("category-form"),
  categoryId: document.getElementById("category-id"),
  categoryName: document.getElementById("category-name"),
  categoryParentId: document.getElementById("category-parent-id"),
  categorySortOrder: document.getElementById("category-sort-order"),
  categoryStatus: document.getElementById("category-status"),
  categorySave: document.getElementById("category-save"),
  categoryReset: document.getElementById("category-reset"),
  categoriesList: document.getElementById("categories-list"),
  productsPanel: document.getElementById("products-panel"),
  productsCount: document.getElementById("products-count"),
  productsOnSaleCount: document.getElementById("products-on-sale-count"),
  productForm: document.getElementById("product-form"),
  productId: document.getElementById("product-id"),
  productTitle: document.getElementById("product-title"),
  productCategoryId: document.getElementById("product-category-id"),
  productStatus: document.getElementById("product-status"),
  productDistributionEnabled: document.getElementById("product-distribution-enabled"),
  productPrice: document.getElementById("product-price"),
  productMarketPrice: document.getElementById("product-market-price"),
  productSortOrder: document.getElementById("product-sort-order"),
  productCoverImage: document.getElementById("product-cover-image"),
  productCoverUploadBtn: document.getElementById("product-cover-upload-btn"),
  productImageGallery: document.getElementById("product-image-gallery"),
  wizardSteps: document.getElementById("wizard-steps"),
  wizardPrev: document.getElementById("wizard-prev"),
  wizardNext: document.getElementById("wizard-next"),
  gotoSkuBtn: document.getElementById("goto-sku-btn"),
  skuHint: document.getElementById("sku-hint"),
  productShortDesc: document.getElementById("product-short-desc"),
  productSubTitle: document.getElementById("product-sub-title"),
  productDetailContent: document.getElementById("product-detail-content"),
  detailImageGallery: document.getElementById("detail-image-gallery"),
  detailImageUploadBtn: document.getElementById("detail-image-upload-btn"),
  productSave: document.getElementById("product-save"),
  productReset: document.getElementById("product-reset"),
  previewCover: document.getElementById("preview-cover"),
  previewTag: document.getElementById("preview-tag"),
  previewTitle: document.getElementById("preview-title"),
  previewDesc: document.getElementById("preview-desc"),
  previewHighlights: document.getElementById("preview-highlights"),
  previewPrice: document.getElementById("preview-price"),
  previewMarketPrice: document.getElementById("preview-market-price"),
  previewStatus: document.getElementById("preview-status"),
  previewDetail: document.getElementById("preview-detail"),
  productsFilterKeyword: document.getElementById("products-filter-keyword"),
  productsFilterCategory: document.getElementById("products-filter-category"),
  productsFilterStatus: document.getElementById("products-filter-status"),
  productsFilterSubmit: document.getElementById("products-filter-submit"),
  productsList: document.getElementById("products-list"),
  skuPanel: document.getElementById("sku-panel"),
  skuCount: document.getElementById("sku-count"),
  skuEmpty: document.getElementById("sku-empty"),
  skuEditor: document.getElementById("sku-editor"),
  skuProductPreview: document.getElementById("sku-product-preview"),
  skuProductTitle: document.getElementById("sku-product-title"),
  skuProductMeta: document.getElementById("sku-product-meta"),
  skuSummaryGrid: document.getElementById("sku-summary-grid"),
  skuList: document.getElementById("sku-list"),
  skuAddRow: document.getElementById("sku-add-row"),
  skuSave: document.getElementById("sku-save"),
  ordersPanel: document.getElementById("orders-panel"),
  ordersCount: document.getElementById("orders-count"),
  ordersList: document.getElementById("orders-list"),
  aftersalesPanel: document.getElementById("aftersales-panel"),
  aftersalesCount: document.getElementById("aftersales-count"),
  aftersalesList: document.getElementById("aftersales-list"),
  distributionOverviewPanel: document.getElementById("distribution-overview-panel"),
  distributionKpiGrid: document.getElementById("distribution-kpi-grid"),
  distributionRulesPanel: document.getElementById("distribution-rules-panel"),
  distributionRuleCurrent: document.getElementById("distribution-rule-current"),
  ruleVersionsCount: document.getElementById("rule-versions-count"),
  ruleLogsCount: document.getElementById("rule-logs-count"),
  ruleVersionForm: document.getElementById("rule-version-form"),
  ruleEnabled: document.getElementById("rule-enabled"),
  ruleLevelOneRate: document.getElementById("rule-level-one-rate"),
  ruleLevelTwoRate: document.getElementById("rule-level-two-rate"),
  ruleBindDays: document.getElementById("rule-bind-days"),
  ruleMinWithdrawalAmount: document.getElementById("rule-min-withdrawal-amount"),
  ruleServiceFeeRate: document.getElementById("rule-service-fee-rate"),
  ruleServiceFeeFixed: document.getElementById("rule-service-fee-fixed"),
  ruleEffectiveAt: document.getElementById("rule-effective-at"),
  ruleDesc: document.getElementById("rule-desc"),
  ruleVersionSave: document.getElementById("rule-version-save"),
  ruleVersionReset: document.getElementById("rule-version-reset"),
  ruleVersionsFilterKeyword: document.getElementById("rule-versions-filter-keyword"),
  ruleVersionsFilterStatus: document.getElementById("rule-versions-filter-status"),
  ruleVersionsFilterSubmit: document.getElementById("rule-versions-filter-submit"),
  ruleVersionsList: document.getElementById("rule-versions-list"),
  ruleLogsFilterAction: document.getElementById("rule-logs-filter-action"),
  ruleLogsFilterVersionId: document.getElementById("rule-logs-filter-version-id"),
  ruleLogsFilterSubmit: document.getElementById("rule-logs-filter-submit"),
  ruleLogsList: document.getElementById("rule-logs-list"),
  distributorsPanel: document.getElementById("distributors-panel"),
  distributorsCount: document.getElementById("distributors-count"),
  distributorsFilterKeyword: document.getElementById("distributors-filter-keyword"),
  distributorsFilterStatus: document.getElementById("distributors-filter-status"),
  distributorsFilterSubmit: document.getElementById("distributors-filter-submit"),
  distributorsList: document.getElementById("distributors-list"),
  distributionPanel: document.getElementById("distribution-panel"),
  withdrawalsCount: document.getElementById("withdrawals-count"),
  withdrawalsFilterKeyword: document.getElementById("withdrawals-filter-keyword"),
  withdrawalsFilterStatus: document.getElementById("withdrawals-filter-status"),
  withdrawalsFilterSubmit: document.getElementById("withdrawals-filter-submit"),
  withdrawalsList: document.getElementById("withdrawals-list"),
  decorationPanel: document.getElementById("decoration-panel"),
  bannersCount: document.getElementById("banners-count"),
  sectionsCount: document.getElementById("sections-count"),
  bannerForm: document.getElementById("banner-form"),
  bannerId: document.getElementById("banner-id"),
  bannerTitle: document.getElementById("banner-title"),
  bannerSubtitle: document.getElementById("banner-subtitle"),
  bannerImageUrl: document.getElementById("banner-image-url"),
  bannerUploadBtn: document.getElementById("banner-upload-btn"),
  bannerLinkType: document.getElementById("banner-link-type"),
  bannerLinkValue: document.getElementById("banner-link-value"),
  bannerSortOrder: document.getElementById("banner-sort-order"),
  bannerStatus: document.getElementById("banner-status"),
  bannerSave: document.getElementById("banner-save"),
  bannerReset: document.getElementById("banner-reset"),
  bannersList: document.getElementById("banners-list"),
  pageSectionsList: document.getElementById("page-sections-list"),
  themePrimaryColor: document.getElementById("theme-primary-color"),
  themeSave: document.getElementById("theme-save"),
  couponTemplatesPanel: document.getElementById("coupon-templates-panel"),
  couponTemplatesCount: document.getElementById("coupon-templates-count"),
  couponForm: document.getElementById("coupon-form"),
  couponId: document.getElementById("coupon-id"),
  couponTitle: document.getElementById("coupon-title"),
  couponCode: document.getElementById("coupon-code"),
  couponAmount: document.getElementById("coupon-amount"),
  couponThreshold: document.getElementById("coupon-threshold"),
  couponIssueType: document.getElementById("coupon-issue-type"),
  couponValidDays: document.getElementById("coupon-valid-days"),
  couponBadge: document.getElementById("coupon-badge"),
  couponStatus: document.getElementById("coupon-status"),
  couponDescription: document.getElementById("coupon-description"),
  couponSave: document.getElementById("coupon-save"),
  couponReset: document.getElementById("coupon-reset"),
  couponFilterKeyword: document.getElementById("coupon-filter-keyword"),
  couponFilterStatus: document.getElementById("coupon-filter-status"),
  couponFilterSubmit: document.getElementById("coupon-filter-submit"),
  couponTemplatesList: document.getElementById("coupon-templates-list"),
  usersPanel: document.getElementById("users-panel"),
  usersCount: document.getElementById("users-count"),
  usersFilterKeyword: document.getElementById("users-filter-keyword"),
  usersFilterStatus: document.getElementById("users-filter-status"),
  usersFilterSubmit: document.getElementById("users-filter-submit"),
  usersList: document.getElementById("users-list"),
  salesTrendDays: document.getElementById("sales-trend-days"),
  salesTrendRefresh: document.getElementById("sales-trend-refresh"),
  salesTrendChart: document.getElementById("sales-trend-chart"),
  notificationBell: document.getElementById("notification-bell"),
  notificationBadge: document.getElementById("notification-badge"),
  reviewsPanel: document.getElementById("reviews-panel"),
  reviewsCount: document.getElementById("reviews-count"),
  reviewsFilterStatus: document.getElementById("reviews-filter-status"),
  reviewsFilterRating: document.getElementById("reviews-filter-rating"),
  reviewsFilterSubmit: document.getElementById("reviews-filter-submit"),
  reviewsList: document.getElementById("reviews-list"),
  notificationsPanel: document.getElementById("notifications-panel"),
  notificationsCount: document.getElementById("notifications-count"),
  notificationsFilterRead: document.getElementById("notifications-filter-read"),
  notificationsFilterSubmit: document.getElementById("notifications-filter-submit"),
  notificationsList: document.getElementById("notifications-list"),
  notificationsMarkAllRead: document.getElementById("notifications-mark-all-read"),
  systemAccountsPanel: document.getElementById("system-accounts-panel"),
  systemAccountsCount: document.getElementById("system-accounts-count"),
  adminUserForm: document.getElementById("admin-user-form"),
  adminUserId: document.getElementById("admin-user-id"),
  adminUserUsername: document.getElementById("admin-user-username"),
  adminUserRealname: document.getElementById("admin-user-realname"),
  adminUserMobile: document.getElementById("admin-user-mobile"),
  adminUserPassword: document.getElementById("admin-user-password"),
  adminUserRoles: document.getElementById("admin-user-roles"),
  adminUserStatus: document.getElementById("admin-user-status"),
  adminUserSave: document.getElementById("admin-user-save"),
  adminUserReset: document.getElementById("admin-user-reset"),
  systemAccountsList: document.getElementById("system-accounts-list"),
  operationLogsPanel: document.getElementById("operation-logs-panel"),
  operationLogsCount: document.getElementById("operation-logs-count"),
  logsFilterModule: document.getElementById("logs-filter-module"),
  logsFilterSubmit: document.getElementById("logs-filter-submit"),
  operationLogsList: document.getElementById("operation-logs-list")
};

function setStatus(node, message, type) {
  node.textContent = message || "";
  node.className = "status-line" + (type ? " " + type : "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderProductVisual(url, title, options = {}) {
  const className = "product-visual" + (options.compact ? " compact" : "");
  const placeholder = String(title || "货").trim().slice(0, 1) || "货";

  if (url) {
    return '<div class="' + className + '"><img src="' + escapeHtml(url) + '" alt="' + escapeHtml(title || "商品封面") + '" loading="lazy" /></div>';
  }

  return '<div class="' + className + '">' + escapeHtml(placeholder) + "</div>";
}

function hasPermission(permission) {
  const permissions = ((state.session || {}).permissions) || [];

  return permissions.includes("*") || permissions.includes(permission);
}

function canEditCategories() {
  return hasPermission("category.create") || hasPermission("category.edit");
}

function canDeleteCategories() {
  return hasPermission("category.delete");
}

function canEditProducts() {
  return hasPermission("product.create") || hasPermission("product.edit");
}

function canToggleProducts() {
  return hasPermission("product.status");
}

function canEditSkus() {
  return hasPermission("sku.edit") || hasPermission("stock.adjust");
}

function canViewDecoration() {
  return hasPermission("page_decoration.view");
}

function canEditDecoration() {
  return hasPermission("page_decoration.edit") || hasPermission("page_decoration.manage");
}

function canViewDistribution() {
  return hasPermission("distribution.distributor.view");
}

function canViewDistributionRules() {
  return hasPermission("distribution.rule.view");
}

function canEditDistributionRules() {
  return hasPermission("distribution.rule.edit");
}

function canViewDistributors() {
  return hasPermission("distribution.distributor.view");
}

function canEditDistributors() {
  return hasPermission("distribution.distributor.status");
}

function canReviewWithdrawals() {
  return hasPermission("distribution.withdraw.review");
}

function canViewCoupons() {
  return hasPermission("coupon.view");
}

function canEditCoupons() {
  return hasPermission("coupon.create") || hasPermission("coupon.edit");
}

function canToggleCouponStatus() {
  return hasPermission("coupon.status");
}

function canViewUsers() {
  return hasPermission("user.view");
}

function canEditUserStatus() {
  return hasPermission("user.status");
}

function canViewReviews() {
  return hasPermission("review.view");
}

function canEditReviewStatus() {
  return hasPermission("review.status");
}

function canReplyReviews() {
  return hasPermission("review.reply");
}

function canViewNotifications() {
  return hasPermission("notification.view");
}

function canViewSystemAccounts() {
  return hasPermission("system.account.view");
}

function canCreateSystemAccounts() {
  return hasPermission("system.account.create");
}

function canEditSystemAccounts() {
  return hasPermission("system.account.edit");
}

function canViewOperationLogs() {
  return hasPermission("system.log.view");
}

function toBoolean(value) {
  return value === true || value === "true";
}

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function getFirstCategoryId() {
  return state.categories[0] ? state.categories[0].categoryId : "";
}

function getCategoryMap() {
  return state.categories.reduce((result, item) => {
    result[item.categoryId] = item;
    return result;
  }, {});
}

function getWorkspaceStats() {
  const onSaleCount = state.products.filter((item) => item.status === "on_sale").length;
  const lowStockCount = state.products.filter((item) => toNumber(item.totalStock, 0) > 0 && toNumber(item.totalStock, 0) < 10).length;
  const todoCount = toNumber((state.summary || {}).pendingShipmentCount, 0) + toNumber((state.summary || {}).pendingAftersaleCount, 0);
  const activeDistributorCount = state.distributors.filter((item) => String(item.status || "") === "active").length;
  const distributorCommissionTotal = state.distributors.reduce((sum, item) => sum + toNumber(item.totalCommissionText || 0), 0);
  const pendingWithdrawalCount = state.withdrawals.filter((item) => {
    const status = String(item.status || "").trim();
    return status === "submitted" || status === "approved" || status === "pay_failed" || status === "paying";
  }).length;

  return {
    todoCount,
    categoryCount: state.categories.length,
    productCount: state.products.length,
    onSaleCount,
    lowStockCount,
    skuCount: state.skuDrafts.length,
    orderCount: state.orders.length,
    aftersaleCount: state.afterSales.length,
    distributionRuleVersionCount: state.distributionRuleVersions.length,
    distributionRuleLogCount: state.distributionRuleChangeLogs.length,
    distributorCount: state.distributors.length,
    activeDistributorCount,
    distributorCommissionTotal,
    withdrawalCount: state.withdrawals.length,
    pendingWithdrawalCount,
    bannerCount: state.banners.length,
    sectionCount: state.pageSections.length,
    couponTemplateCount: state.couponTemplates.length,
    enabledCouponCount: state.couponTemplates.filter((item) => String(item.status) === "enabled").length,
    userCount: state.users.length,
    reviewCount: state.reviews.length,
    notificationCount: state.notifications.length,
    adminUserCount: state.adminUsers.length,
    operationLogCount: state.operationLogs.length
  };
}

function getVisibleSections() {
  const stats = getWorkspaceStats();

  return [
    {
      key: "summary",
      label: "履约概览",
      hint: "先看今天待办",
      count: stats.todoCount + " 待办",
      visible: !!state.session && hasPermission("dashboard.view"),
      node: nodes.summaryPanel
    },
    {
      key: "categories",
      label: "分类管理",
      hint: "先建商品分类",
      count: stats.categoryCount + " 个分类",
      visible: !!state.session && hasPermission("category.view"),
      node: nodes.categoriesPanel
    },
    {
      key: "products",
      label: "商品管理",
      hint: "编辑基础信息",
      count: stats.onSaleCount + " 个在售",
      visible: !!state.session && hasPermission("product.view"),
      node: nodes.productsPanel
    },
    {
      key: "sku",
      label: "SKU 管理",
      hint: state.productDetail ? "当前已选商品" : "先选择一个商品",
      count: stats.skuCount + " 条规格",
      visible: !!state.session && hasPermission("sku.view"),
      node: nodes.skuPanel
    },
    {
      key: "orders",
      label: "订单处理",
      hint: "确认发货与取消",
      count: stats.orderCount + " 笔订单",
      visible: !!state.session && hasPermission("order.view"),
      node: nodes.ordersPanel
    },
    {
      key: "aftersales",
      label: "售后处理",
      hint: "处理退款与驳回",
      count: stats.aftersaleCount + " 条售后",
      visible: !!state.session && hasPermission("aftersale.view"),
      node: nodes.aftersalesPanel
    },
    {
      key: "coupon-templates",
      label: "优惠券管理",
      hint: "创建与发放优惠券",
      count: stats.enabledCouponCount + " 张启用",
      visible: !!state.session && canViewCoupons(),
      node: nodes.couponTemplatesPanel
    },
    {
      key: "users",
      label: "会员管理",
      hint: "查看用户与消费",
      count: stats.userCount + " 位用户",
      visible: !!state.session && canViewUsers(),
      node: nodes.usersPanel
    },
    {
      key: "reviews",
      label: "评价管理",
      hint: "查看与回复评价",
      count: stats.reviewCount + " 条评价",
      visible: !!state.session && canViewReviews(),
      node: nodes.reviewsPanel
    },
    {
      key: "notifications",
      label: "通知中心",
      hint: "关键事件提醒",
      count: stats.notificationCount + " 条通知",
      visible: !!state.session && canViewNotifications(),
      node: nodes.notificationsPanel
    },
    {
      key: "system-accounts",
      label: "系统账号",
      hint: "管理员与角色",
      count: stats.adminUserCount + " 个账号",
      visible: !!state.session && canViewSystemAccounts(),
      node: nodes.systemAccountsPanel
    },
    {
      key: "operation-logs",
      label: "操作日志",
      hint: "审计与追溯",
      count: stats.operationLogCount + " 条日志",
      visible: !!state.session && canViewOperationLogs(),
      node: nodes.operationLogsPanel
    },
    {
      key: "distribution-overview",
      label: "分销总览",
      hint: "看运营关键指标",
      count: stats.distributorCount + " 位分销员",
      visible: !!state.session && (canViewDistributionRules() || canViewDistributors()),
      node: nodes.distributionOverviewPanel
    },
    {
      key: "distribution-rules",
      label: "规则版本",
      hint: "草稿与发布",
      count: stats.distributionRuleVersionCount + " 个版本",
      visible: !!state.session && canViewDistributionRules(),
      node: nodes.distributionRulesPanel
    },
    {
      key: "distributors",
      label: "分销员管理",
      hint: "状态与佣金",
      count: stats.activeDistributorCount + " 位活跃",
      visible: !!state.session && canViewDistributors(),
      node: nodes.distributorsPanel
    },
    {
      key: "distribution-withdrawals",
      label: "分销提现",
      hint: "审核与打款",
      count: stats.pendingWithdrawalCount + " 待处理",
      visible: !!state.session && canViewDistribution(),
      node: nodes.distributionPanel
    },
    {
      key: "decoration",
      label: "页面装修",
      hint: "轮播图、版块与主题",
      count: stats.bannerCount + " 张轮播图",
      visible: !!state.session && canViewDecoration(),
      node: nodes.decorationPanel
    }
  ].filter((item) => item.visible);
}

function ensureActiveSection() {
  const sections = getVisibleSections();

  if (!sections.length) {
    state.activeSection = "summary";
    return;
  }

  if (!sections.some((item) => item.key === state.activeSection)) {
    state.activeSection = sections[0].key;
  }
}

function renderWorkspaceChrome() {
  const stats = getWorkspaceStats();
  const sections = getVisibleSections();

  ensureActiveSection();

  nodes.heroRepositoryMode.textContent = state.repositoryMode || "-";
  nodes.categoriesCount.textContent = stats.categoryCount + " 个分类";
  nodes.productsCount.textContent = stats.productCount + " 个商品";
  nodes.productsOnSaleCount.textContent = stats.onSaleCount + " 个在售";
  nodes.skuCount.textContent = stats.skuCount + " 条规格";
  nodes.ordersCount.textContent = stats.orderCount + " 笔订单";
  nodes.aftersalesCount.textContent = stats.aftersaleCount + " 条售后";
  nodes.ruleVersionsCount.textContent = stats.distributionRuleVersionCount + " 个版本";
  nodes.ruleLogsCount.textContent = stats.distributionRuleLogCount + " 条日志";
  nodes.distributorsCount.textContent = stats.distributorCount + " 位分销员";
  nodes.withdrawalsCount.textContent = stats.withdrawalCount + " 条提现单";
  nodes.bannersCount.textContent = stats.bannerCount + " 张轮播图";
  nodes.sectionsCount.textContent = stats.sectionCount + " 个版块";
  nodes.couponTemplatesCount.textContent = stats.couponTemplateCount + " 张优惠券";
  nodes.usersCount.textContent = stats.userCount + " 位用户";
  nodes.reviewsCount.textContent = stats.reviewCount + " 条评价";
  nodes.notificationsCount.textContent = stats.notificationCount + " 条通知";
  nodes.systemAccountsCount.textContent = stats.adminUserCount + " 个账号";
  nodes.operationLogsCount.textContent = stats.operationLogCount + " 条日志";

  nodes.workspaceNav.innerHTML = sections.map((item) => {
    return [
      '<button class="nav-button' + (state.activeSection === item.key ? " active" : "") + '" type="button" data-action="jump-section" data-section-key="' + escapeHtml(item.key) + '">',
      '<span class="nav-copy"><strong>' + escapeHtml(item.label) + "</strong><span>" + escapeHtml(item.hint) + "</span></span>",
      '<span class="nav-count">' + escapeHtml(item.count) + "</span>",
      "</button>"
    ].join("");
  }).join("");

  nodes.workspaceStats.innerHTML = [
    { label: "待处理", value: String(stats.todoCount) },
    { label: "在售商品", value: String(stats.onSaleCount) },
    { label: "活跃分销员", value: String(stats.activeDistributorCount) },
    { label: "待审提现", value: String(stats.pendingWithdrawalCount) }
  ].map((item) => {
    return [
      '<div class="mini-stat">',
      "<span>" + escapeHtml(item.label) + "</span>",
      "<strong>" + escapeHtml(item.value) + "</strong>",
      "</div>"
    ].join("");
  }).join("");
}

function scrollToSection(sectionKey) {
  const sections = getVisibleSections();
  const target = sections.find((item) => item.key === sectionKey);

  if (!target || !target.node) {
    return;
  }

  state.activeSection = sectionKey;

  sections.forEach((item) => {
    if (item.node) {
      item.node.classList.toggle("hidden", item.key !== sectionKey);
    }
  });

  renderWorkspaceChrome();
}

async function request(url, options = {}) {
  const headers = Object.assign(
    {
      "Content-Type": "application/json"
    },
    options.headers || {}
  );

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    credentials: "same-origin",
    body: typeof options.body === "undefined" ? undefined : JSON.stringify(options.body)
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code) {
    var message = payload.message || "请求失败";
    if (response.status === 503) {
      message = "服务暂时不可用（可能正在执行数据库迁移），请稍后重试。";
    }
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return payload.data;
}

function compressImage(file, maxWidth, quality) {
  return new Promise(function (resolve) {
    if (maxWidth == null) maxWidth = 2048;
    if (quality == null) quality = 0.85;

    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var w = img.width;
        var h = img.height;

        // 不需要压缩：文件小于 2MB
        if (file.size <= 2 * 1024 * 1024) {
          resolve(file);
          return;
        }

        // 按比例缩放（maxWidth 为 0 时不缩放，保持原始分辨率）
        if (maxWidth > 0 && (w > maxWidth || h > maxWidth)) {
          var ratio = Math.min(maxWidth / w, maxWidth / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        // 尝试多个质量等级，找到最小的合格质量
        var qualities = [quality, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5];

        function tryQuality(index) {
          if (index >= qualities.length) {
            resolve(file);
            return;
          }
          canvas.toBlob(function (blob) {
            if (!blob || blob.size >= file.size) {
              tryQuality(index + 1);
              return;
            }
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
          }, "image/jpeg", qualities[index]);
        }

        tryQuality(0);
      };

      img.onerror = function () {
        resolve(file);
      };

      img.src = e.target.result;
    };

    reader.onerror = function () {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}

async function uploadImage(file, type, options) {
  // 客户端压缩后再上传，避免 413
  var originalSize = file.size;
  var opts = options || {};
  file = await compressImage(file, opts.maxWidth, opts.quality);
  console.log("[upload] 压缩:", (originalSize / 1024 / 1024).toFixed(1) + "MB →", (file.size / 1024 / 1024).toFixed(1) + "MB");

  var formData = new FormData();
  formData.append("image", file);
  if (type) {
    formData.append("type", type);
  }

  var response = await fetch("/admin/v1/upload/image", {
    method: "POST",
    credentials: "same-origin",
    body: formData
  });
  var payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code) {
    var message = payload.message || "图片上传失败";
    if (response.status === 503) {
      message = "服务暂时不可用（可能正在执行数据库迁移），请稍后重试。";
    }
    var error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return ((payload || {}).data || {}).imageUrl || "";
}

async function ensureRepositoryMode() {
  const payload = await fetch("/health").then((response) => response.json());
  state.repositoryMode = (((payload || {}).data || {}).storefrontRepositoryMode) || "-";
  nodes.repositoryMode.textContent = state.repositoryMode;
}

function buildCategoryOptions(options = {}) {
  const selectedValue = String(options.selectedValue || "");
  const excludeId = String(options.excludeId || "");
  const list = [];

  if (options.includeAll) {
    list.push({
      value: "",
      label: "全部"
    });
  }

  if (options.includeRoot) {
    list.push({
      value: "0",
      label: "顶级分类"
    });
  }

  state.categories.forEach((item) => {
    if (excludeId && item.categoryId === excludeId) {
      return;
    }

    list.push({
      value: item.categoryId,
      label: item.name
    });
  });

  if (!list.length) {
    return '<option value="">暂无分类</option>';
  }

  return list.map((item) => {
    return '<option value="' + escapeHtml(item.value) + '"' + (item.value === selectedValue ? " selected" : "") + ">" + escapeHtml(item.label) + "</option>";
  }).join("");
}

function renderCategorySelects() {
  const currentCategoryId = nodes.categoryId.value.trim();
  const selectedParentId = nodes.categoryParentId.value || "0";
  const selectedProductCategoryId = nodes.productCategoryId.value || getFirstCategoryId();
  const selectedFilterCategoryId = nodes.productsFilterCategory.value || "";

  nodes.categoryParentId.innerHTML = buildCategoryOptions({
    selectedValue: selectedParentId,
    includeRoot: true,
    excludeId: currentCategoryId
  });
  nodes.productCategoryId.innerHTML = buildCategoryOptions({
    selectedValue: selectedProductCategoryId
  });
  nodes.productsFilterCategory.innerHTML = buildCategoryOptions({
    selectedValue: selectedFilterCategoryId,
    includeAll: true
  });
}

function resetCategoryForm() {
  nodes.categoryId.value = "";
  nodes.categoryName.value = "";
  nodes.categorySortOrder.value = "0";
  nodes.categoryStatus.value = "enabled";
  renderCategorySelects();
  nodes.categoryParentId.value = "0";
  renderCategories();
}

function populateCategoryForm(record) {
  nodes.categoryId.value = record.categoryId || "";
  nodes.categoryName.value = record.name || "";
  nodes.categorySortOrder.value = String(record.sortOrder || 0);
  nodes.categoryStatus.value = record.status || "enabled";
  renderCategorySelects();
  nodes.categoryParentId.value = String(record.parentId || 0);
  renderCategories();
}

function resetProductSelection() {
  state.productDetail = null;
  state.skuDrafts = [];
  renderSkuEditor();
}

function resetProductForm() {
  nodes.productId.value = "";
  nodes.productTitle.value = "";
  nodes.productStatus.value = "off_sale";
  nodes.productDistributionEnabled.value = "true";
  nodes.productPrice.value = "0";
  nodes.productMarketPrice.value = "0";
  nodes.productSortOrder.value = "0";
  nodes.productCoverImage.value = "";
  state.productImages = [];
  nodes.productShortDesc.value = "";
  nodes.productSubTitle.value = "";
  nodes.productDetailContent.value = "";
  state.detailImages = [];
  renderCategorySelects();
  nodes.productCategoryId.value = getFirstCategoryId();
  resetProductSelection();
  setWizardStep(1);
  renderProductImageGallery();
  renderDetailImageGallery();
  updateCoverPreview();
  updatePhonePreview();
  renderProducts();
  updateSkuHintVisibility();
}

function populateProductForm(detail) {
  nodes.productId.value = detail.productId || "";
  nodes.productTitle.value = detail.title || "";
  nodes.productStatus.value = detail.status || "off_sale";
  nodes.productDistributionEnabled.value = detail.distributionEnabled === false ? "false" : "true";
  nodes.productPrice.value = String(detail.price || 0);
  nodes.productMarketPrice.value = String(detail.marketPrice || 0);
  nodes.productSortOrder.value = String(detail.sortOrder || 0);
  nodes.productCoverImage.value = detail.coverImage || "";
  state.productImages = Array.isArray(detail.imageList) && detail.imageList.length
    ? detail.imageList.filter(function (u) { return u; })
    : (detail.coverImage ? [detail.coverImage] : []);
  nodes.productShortDesc.value = detail.shortDesc || "";
  nodes.productSubTitle.value = detail.subTitle || "";
  nodes.productDetailContent.value = detail.detailContent || "";
  state.detailImages = Array.isArray(detail.detailImages) && detail.detailImages.length
    ? detail.detailImages.filter(function (u) { return u; }) : [];
  renderCategorySelects();
  nodes.productCategoryId.value = detail.categoryId || getFirstCategoryId();
  setWizardStep(1);
  renderProductImageGallery();
  renderDetailImageGallery();
  updateCoverPreview();
  updatePhonePreview();
  renderProducts();
  updateSkuHintVisibility();
}

function toDateTimeLocalValue(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  return normalized.replace(" ", "T").slice(0, 16);
}

function updateSkuHintVisibility() {
  var hasProduct = !!(nodes.productId.value || "").trim();
  if (hasProduct) {
    nodes.gotoSkuBtn.classList.remove("hidden");
    nodes.skuHint.classList.add("hidden");
  } else {
    nodes.gotoSkuBtn.classList.add("hidden");
    nodes.skuHint.classList.remove("hidden");
  }
}

var WIZARD_TOTAL_STEPS = 3;

function setWizardStep(step) {
  step = Math.max(1, Math.min(WIZARD_TOTAL_STEPS, step));
  state.wizardStep = step;

  document.querySelectorAll("[data-wizard-panel]").forEach(function (panel) {
    var panelStep = Number(panel.dataset.wizardPanel);
    panel.classList.toggle("hidden", panelStep !== step);
  });

  document.querySelectorAll("[data-wizard-step]").forEach(function (btn) {
    var btnStep = Number(btn.dataset.wizardStep);
    btn.classList.toggle("active", btnStep === step);
    btn.classList.toggle("completed", btnStep < step);
  });

  nodes.wizardPrev.classList.toggle("hidden", step <= 1);
  nodes.wizardNext.classList.toggle("hidden", step >= WIZARD_TOTAL_STEPS);
}

function populateRuleVersionForm(record = {}) {
  nodes.ruleEnabled.value = record.enabled === false ? "false" : "true";
  nodes.ruleLevelOneRate.value = String(toNumber(record.levelOneRate, 8));
  nodes.ruleLevelTwoRate.value = String(toNumber(record.levelTwoRate, 3));
  nodes.ruleBindDays.value = String(Math.max(1, Math.round(toNumber(record.bindDays, 15))));
  nodes.ruleMinWithdrawalAmount.value = String(toNumber(record.minWithdrawalAmount, 0));
  nodes.ruleServiceFeeRate.value = String(toNumber(record.serviceFeeRate, 0));
  nodes.ruleServiceFeeFixed.value = String(toNumber(record.serviceFeeFixed, 0));
  nodes.ruleDesc.value = String(record.ruleDesc || "");
  nodes.ruleEffectiveAt.value = toDateTimeLocalValue(record.effectiveAt || record.publishedAt || "");
}

function resetRuleVersionForm() {
  populateRuleVersionForm(state.distributionRules || {});
}

function renderDistributionOverview() {
  const activeRule = state.distributionRules || {};
  const pendingWithdrawalCount = state.withdrawals.filter((item) => {
    const status = String(item.status || "").trim();
    return status === "submitted" || status === "approved" || status === "paying" || status === "pay_failed";
  }).length;
  const activeDistributorCount = state.distributors.filter((item) => String(item.status || "") === "active").length;
  const totalCommission = state.distributors.reduce((sum, item) => sum + toNumber(item.totalCommissionText || 0), 0);

  nodes.distributionKpiGrid.innerHTML = [
    {
      label: "当前生效规则",
      value: activeRule.activeVersionNo || "未发布",
      note: activeRule.publishedAt ? ("发布于 " + activeRule.publishedAt) : "建议先发布一个可回溯版本"
    },
    {
      label: "活跃分销员",
      value: String(activeDistributorCount),
      note: "总分销员 " + String(state.distributors.length) + " 位"
    },
    {
      label: "待处理提现",
      value: String(pendingWithdrawalCount),
      note: "submitted / approved / paying / pay_failed"
    },
    {
      label: "累计佣金规模",
      value: totalCommission.toFixed(2) + " 元",
      note: "按分销员列表合计"
    },
    {
      label: "一级比例",
      value: toNumber(activeRule.levelOneRate, 0).toFixed(2) + "%",
      note: "二级比例 " + toNumber(activeRule.levelTwoRate, 0).toFixed(2) + "%"
    },
    {
      label: "提现门槛",
      value: toNumber(activeRule.minWithdrawalAmount, 0).toFixed(2) + " 元",
      note: "绑客有效期 " + String(Math.max(0, Math.round(toNumber(activeRule.bindDays, 0)))) + " 天"
    }
  ].map((item) => {
    return [
      '<div class="metric-card">',
      "<span>" + escapeHtml(item.label) + "</span>",
      "<strong>" + escapeHtml(item.value) + "</strong>",
      "<small>" + escapeHtml(item.note) + "</small>",
      "</div>"
    ].join("");
  }).join("");

  renderWorkspaceChrome();
}

function renderRuleLogVersionFilterOptions() {
  const selectedValue = nodes.ruleLogsFilterVersionId.value || "";
  const options = [{ value: "", label: "全部版本" }].concat(
    state.distributionRuleVersions.map((item) => ({
      value: item.versionId || "",
      label: (item.versionNo || item.versionId || "未命名版本") + (item.isActive ? "（当前生效）" : "")
    }))
  );

  nodes.ruleLogsFilterVersionId.innerHTML = options.map((item) => {
    return '<option value="' + escapeHtml(item.value) + '"' + (item.value === selectedValue ? " selected" : "") + ">" + escapeHtml(item.label) + "</option>";
  }).join("");
}

function renderDistributionRules() {
  const activeRule = state.distributionRules || {};

  nodes.distributionRuleCurrent.innerHTML = [
    "<p><strong>当前规则快照</strong></p>",
    "<p>版本 " + escapeHtml(activeRule.activeVersionNo || "未发布") + " · 状态 " + escapeHtml(activeRule.status || "draft") + "</p>",
    "<p class=\"muted\">一级 " + escapeHtml(toNumber(activeRule.levelOneRate, 0).toFixed(2)) + "% · 二级 " + escapeHtml(toNumber(activeRule.levelTwoRate, 0).toFixed(2)) + "% · 绑定 " + escapeHtml(String(Math.max(0, Math.round(toNumber(activeRule.bindDays, 0))))) + " 天</p>",
    "<p class=\"muted\">最低提现 " + escapeHtml(toNumber(activeRule.minWithdrawalAmount, 0).toFixed(2)) + " 元 · 手续费率 " + escapeHtml(toNumber(activeRule.serviceFeeRate, 0).toFixed(4)) + " · 固定手续费 " + escapeHtml(toNumber(activeRule.serviceFeeFixed, 0).toFixed(2)) + " 元</p>",
    "<p class=\"muted\">" + escapeHtml(activeRule.ruleDesc || "暂无规则说明") + "</p>"
  ].join("");
  renderRuleLogVersionFilterOptions();

  if (!state.distributionRuleVersions.length) {
    nodes.ruleVersionsList.innerHTML = '<div class="empty">当前没有规则版本。</div>';
  } else {
    nodes.ruleVersionsList.innerHTML = state.distributionRuleVersions.map((item) => {
      const versionId = item.versionId || "";
      const canPublish = canEditDistributionRules() && item.status !== "published";
      const effectiveInputValue = toDateTimeLocalValue(item.effectiveAt || nodes.ruleEffectiveAt.value || "");

      return [
        '<article class="card' + (item.isActive ? " selected-card" : "") + '">',
        '<div class="card-top">',
        '<div class="meta">',
        '<strong>' + escapeHtml(item.versionNo || versionId || "-") + (item.isActive ? " · 当前生效" : "") + "</strong>",
        '<span class="muted">创建人 ' + escapeHtml(item.createdBy || "-") + " · " + escapeHtml(item.createdAt || "-") + "</span>",
        "</div>",
        '<div class="tag-row">',
        '<span class="tag">' + escapeHtml(item.statusText || item.status || "-") + "</span>",
        '<span class="tag">一级 ' + escapeHtml(toNumber(item.levelOneRate, 0).toFixed(2)) + "%</span>",
        '<span class="tag">二级 ' + escapeHtml(toNumber(item.levelTwoRate, 0).toFixed(2)) + "%</span>",
        "</div>",
        "</div>",
        '<p class="muted">绑定 ' + escapeHtml(String(item.bindDays || 0)) + " 天 · 最低提现 " + escapeHtml(toNumber(item.minWithdrawalAmount, 0).toFixed(2)) + " 元 · 费率 " + escapeHtml(toNumber(item.serviceFeeRate, 0).toFixed(4)) + " · 固定 " + escapeHtml(toNumber(item.serviceFeeFixed, 0).toFixed(2)) + " 元</p>",
        '<p class="muted">' + escapeHtml(item.ruleDesc || "暂无规则说明") + "</p>",
        '<div class="card-actions">',
        '<button class="secondary" data-action="fill-rule-form" data-rule-version-id="' + escapeHtml(versionId) + '">载入到表单</button>',
        (canPublish
          ? '<label class="muted">生效时间<input type="datetime-local" data-rule-effective-at="' + escapeHtml(versionId) + '" value="' + escapeHtml(effectiveInputValue) + '" /></label>'
          : ""),
        (canPublish
          ? '<button class="primary" data-action="publish-rule-version" data-rule-version-id="' + escapeHtml(versionId) + '">发布版本</button>'
          : ""),
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  if (!state.distributionRuleChangeLogs.length) {
    nodes.ruleLogsList.innerHTML = '<div class="empty">当前没有规则日志。</div>';
  } else {
    nodes.ruleLogsList.innerHTML = state.distributionRuleChangeLogs.map((item) => {
      return [
        '<article class="card">',
        '<div class="card-top">',
        '<div class="meta">',
        '<strong>' + escapeHtml(item.summary || item.action || "规则变更") + "</strong>",
        '<span class="muted">操作人 ' + escapeHtml(item.actorName || "-") + " · " + escapeHtml(item.createdAt || "-") + "</span>",
        "</div>",
        '<div class="tag-row">',
        '<span class="tag">' + escapeHtml(item.action || "-") + "</span>",
        '<span class="tag">' + escapeHtml(((item.ruleVersion || {}).versionNo) || "未关联版本") + "</span>",
        "</div>",
        "</div>",
        '<p class="muted">' + escapeHtml(item.payloadJson || "无 payload") + "</p>",
        "</article>"
      ].join("");
    }).join("");
  }

  renderWorkspaceChrome();
}

function renderDistributors() {
  if (!state.distributors.length) {
    nodes.distributorsList.innerHTML = '<div class="empty">当前没有符合条件的分销员。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.distributorsList.innerHTML = state.distributors.map((item) => {
    const detail = state.distributorDetails.get(item.distributorId) || null;
    const nextStatus = item.status === "inactive" ? "active" : "inactive";
    const nextStatusText = item.status === "inactive" ? "恢复正常" : "冻结账号";

    return [
      '<article class="card">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.nickname || "未命名分销员") + "</strong>",
      '<span class="muted">' + escapeHtml(item.mobile || "-") + " · 加入时间 " + escapeHtml(item.joinedAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.statusText || item.status || "-") + "</span>",
      '<span class="tag">' + escapeHtml(item.level || "普通分销员") + "</span>",
      '<span class="tag">团队 ' + escapeHtml(String(item.teamCount || 0)) + " 人</span>",
      "</div>",
      "</div>",
      '<div class="metrics-grid">',
      '<div class="metric-card"><span>累计佣金</span><strong>' + escapeHtml(item.totalCommissionText || "0.00") + '</strong><small>单位：元</small></div>',
      '<div class="metric-card"><span>待结算</span><strong>' + escapeHtml(item.pendingCommissionText || "0.00") + '</strong><small>单位：元</small></div>',
      "</div>",
      '<div class="card-actions">',
      '<button class="secondary" data-action="toggle-distributor-detail" data-distributor-id="' + escapeHtml(item.distributorId) + '">' + (detail ? "收起详情" : "查看详情") + "</button>",
      (canEditDistributors()
        ? '<button class="' + (item.status === "inactive" ? "success" : "danger") + '" data-action="update-distributor-status" data-distributor-id="' + escapeHtml(item.distributorId) + '" data-next-status="' + escapeHtml(nextStatus) + '">' + escapeHtml(nextStatusText) + "</button>"
        : ""),
      "</div>",
      (detail
        ? [
            '<div class="detail-grid">',
            '<div class="detail-box"><p><strong>已结算</strong></p><p>' + escapeHtml(detail.settledCommissionText || "0.00") + ' 元</p></div>',
            '<div class="detail-box"><p><strong>提现中</strong></p><p>' + escapeHtml(detail.withdrawingCommissionText || "0.00") + ' 元</p></div>',
            '<div class="detail-box"><p><strong>可提现</strong></p><p>' + escapeHtml(detail.withdrawableCommissionText || "0.00") + ' 元</p></div>',
            "</div>",
            '<div class="order-items">',
            (detail.recentCommissionRecords || []).length
              ? (detail.recentCommissionRecords || []).map((record) => {
                  return '<div class="order-item"><strong>' + escapeHtml(record.title || "佣金流水") + '</strong><p class="muted">订单 ' + escapeHtml(record.orderNo || "-") + ' · ' + escapeHtml(record.levelText || "-") + ' · ' + escapeHtml(record.amountText || "0.00") + ' 元</p><p class="muted">状态 ' + escapeHtml(record.statusText || record.status || "-") + ' · ' + escapeHtml(record.createdAt || "-") + '</p></div>';
                }).join("")
              : '<div class="empty">暂无佣金流水。</div>',
            "</div>"
          ].join("")
        : ""),
      "</article>"
    ].join("");
  }).join("");

  renderWorkspaceChrome();
}

function renderSession() {
  const loggedIn = !!state.loggedIn;

  nodes.sessionPanel.classList.toggle("hidden", !loggedIn);
  nodes.navigationPanel.classList.toggle("hidden", !loggedIn);
  nodes.workspace.classList.toggle("hidden", !loggedIn);
  nodes.sessionName.textContent = loggedIn ? state.session.adminUser.realName + " / " + state.session.adminUser.username : "未登录";
  nodes.sessionRoles.textContent = loggedIn ? (state.session.roleCodes || []).join(" / ") : "-";
  nodes.repositoryMode.textContent = state.repositoryMode;
  nodes.heroRepositoryMode.textContent = state.repositoryMode;

  nodes.summaryPanel.classList.toggle("hidden", !loggedIn || !hasPermission("dashboard.view"));
  nodes.categoriesPanel.classList.toggle("hidden", !loggedIn || !hasPermission("category.view"));
  nodes.productsPanel.classList.toggle("hidden", !loggedIn || !hasPermission("product.view"));
  nodes.skuPanel.classList.toggle("hidden", !loggedIn || !hasPermission("sku.view"));
  nodes.ordersPanel.classList.toggle("hidden", !loggedIn || !hasPermission("order.view"));
  nodes.aftersalesPanel.classList.toggle("hidden", !loggedIn || !hasPermission("aftersale.view"));
  nodes.couponTemplatesPanel.classList.toggle("hidden", !loggedIn || !canViewCoupons());
  nodes.usersPanel.classList.toggle("hidden", !loggedIn || !canViewUsers());
  nodes.reviewsPanel.classList.toggle("hidden", !loggedIn || !canViewReviews());
  nodes.notificationsPanel.classList.toggle("hidden", !loggedIn || !canViewNotifications());
  nodes.systemAccountsPanel.classList.toggle("hidden", !loggedIn || !canViewSystemAccounts());
  nodes.operationLogsPanel.classList.toggle("hidden", !loggedIn || !canViewOperationLogs());
  nodes.distributionOverviewPanel.classList.toggle("hidden", !loggedIn || !(canViewDistributionRules() || canViewDistributors()));
  nodes.distributionRulesPanel.classList.toggle("hidden", !loggedIn || !canViewDistributionRules());
  nodes.distributorsPanel.classList.toggle("hidden", !loggedIn || !canViewDistributors());
  nodes.distributionPanel.classList.toggle("hidden", !loggedIn || !canViewDistribution());
  nodes.decorationPanel.classList.toggle("hidden", !loggedIn || !canViewDecoration());

  if (loggedIn && canViewNotifications()) {
    nodes.notificationBell.classList.remove("hidden");
    startNotificationPolling();
  } else {
    nodes.notificationBell.classList.add("hidden");
    stopNotificationPolling();
  }

  nodes.categorySave.disabled = !loggedIn || !canEditCategories();
  nodes.categoryReset.disabled = !loggedIn || !canEditCategories();
  nodes.productSave.disabled = !loggedIn || !canEditProducts();
  nodes.productReset.disabled = !loggedIn || !canEditProducts();
  nodes.skuAddRow.disabled = !loggedIn || !canEditSkus();
  nodes.skuSave.disabled = !loggedIn || !canEditSkus();
  nodes.ruleVersionSave.disabled = !loggedIn || !canEditDistributionRules();
  nodes.ruleVersionReset.disabled = !loggedIn || !canEditDistributionRules();
  nodes.bannerSave.disabled = !loggedIn || !canEditDecoration();
  nodes.bannerReset.disabled = !loggedIn || !canEditDecoration();
  nodes.themeSave.disabled = !loggedIn || !canEditDecoration();
  nodes.couponSave.disabled = !loggedIn || !canEditCoupons();
  nodes.couponReset.disabled = !loggedIn || !canEditCoupons();
  nodes.adminUserSave.disabled = !loggedIn || !(canCreateSystemAccounts() || canEditSystemAccounts());
  nodes.adminUserReset.disabled = !loggedIn || !(canCreateSystemAccounts() || canEditSystemAccounts());

  if (loggedIn) {
    scrollToSection(state.activeSection);
  }

  renderWorkspaceChrome();
}

function renderSummary() {
  const data = state.summary || {};

  nodes.summaryGrid.innerHTML = summaryLabels.map((item) => {
    const rawValue = data[item.key];
    const displayValue = typeof rawValue === "number" ? String(rawValue) : (rawValue || "0.00");

    return [
      '<div class="summary-card">',
      "<div class=\"muted\">" + escapeHtml(item.label) + "</div>",
      "<strong>" + escapeHtml(displayValue) + "</strong>",
      "<div class=\"muted\">" + escapeHtml(item.suffix) + "</div>",
      "</div>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function renderCategories() {
  if (!state.categories.length) {
    nodes.categoriesList.innerHTML = '<div class="empty">当前还没有分类，先新建一个分类。</div>';
    renderWorkspaceChrome();
    return;
  }

  const categoryMap = getCategoryMap();
  const currentCategoryId = nodes.categoryId.value.trim();

  nodes.categoriesList.innerHTML = state.categories.map((item) => {
    const parentCategory = categoryMap[item.parentId] || null;
    const childCount = state.categories.filter((category) => String(category.parentId || "") === String(item.categoryId)).length;

    return [
      '<article class="card' + (currentCategoryId === item.categoryId ? " selected-card" : "") + '">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.name) + "</strong>",
      '<span class="muted">排序 ' + escapeHtml(String(item.sortOrder || 0)) + " · 更新时间 " + escapeHtml(item.updatedAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.statusText || item.status) + "</span>",
      '<span class="tag">子类 ' + escapeHtml(String(childCount)) + "</span>",
      (parentCategory ? '<span class="tag">上级 ' + escapeHtml(parentCategory.name) + "</span>" : '<span class="tag">顶级分类</span>'),
      "</div>",
      "</div>",
      '<div class="card-actions">',
      (canEditCategories()
        ? '<button class="secondary" data-action="edit-category" data-category-id="' + escapeHtml(item.categoryId) + '">编辑分类</button>'
        : ""),
      (canDeleteCategories()
        ? '<button class="danger" data-action="delete-category" data-category-id="' + escapeHtml(item.categoryId) + '">删除分类</button>'
        : ""),
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function renderProducts() {
  if (!state.products.length) {
    nodes.productsList.innerHTML = '<div class="empty">当前没有符合条件的商品。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.productsList.innerHTML = state.products.map((item) => {
    const nextStatus = item.status === "on_sale" ? "off_sale" : "on_sale";
    const nextStatusText = item.status === "on_sale" ? "下架" : "上架";
    const isSelected = !!(state.productDetail && state.productDetail.productId === item.productId);
    const summaryText = item.shortDesc || item.subTitle || "还没有填写卖点摘要，建议补一句让运营和导购都看得懂的话。";

    return [
      '<article class="card' + (isSelected ? " selected-card" : "") + '">',
      '<div class="product-layout">',
      renderProductVisual(item.coverImage, item.title),
      '<div class="product-body">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.title) + (isSelected ? ' · 当前编辑中' : "") + "</strong>",
      '<span class="muted">' + escapeHtml(item.categoryName || "未分类") + " · 更新时间 " + escapeHtml(item.updatedAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.statusText || item.status) + "</span>",
      '<span class="tag">' + escapeHtml(item.distributionEnabled ? "参与分销" : "不参与分销") + "</span>",
      (item.coverImage ? '<span class="tag">已配封面</span>' : '<span class="tag">待补封面</span>'),
      "</div>",
      "</div>",
      '<p class="product-copy">' + escapeHtml(summaryText) + "</p>",
      '<div class="metrics-grid">',
      '<div class="metric-card"><span>售价区间</span><strong>' + escapeHtml(item.priceRangeText || "0.00 - 0.00") + '</strong><small>前台显示价格</small></div>',
      '<div class="metric-card"><span>当前库存</span><strong>' + escapeHtml(String(item.totalStock || 0)) + '</strong><small>低于 10 建议尽快补货</small></div>',
      '<div class="metric-card"><span>累计销量</span><strong>' + escapeHtml(String(item.salesCount || 0)) + '</strong><small>用于判断是否继续投流</small></div>',
      "</div>",
      '<div class="card-actions">',
      (hasPermission("product.view")
        ? '<button class="secondary" data-action="edit-product" data-product-id="' + escapeHtml(item.productId) + '">' + (isSelected ? "继续编辑" : "编辑商品") + "</button>"
        : ""),
      (hasPermission("sku.view")
        ? '<button class="secondary" data-action="manage-skus" data-product-id="' + escapeHtml(item.productId) + '">管理 SKU</button>'
        : ""),
      (canToggleProducts()
        ? '<button class="' + (item.status === "on_sale" ? "danger" : "success") + '" data-action="toggle-product-status" data-product-id="' + escapeHtml(item.productId) + '" data-next-status="' + escapeHtml(nextStatus) + '">' + escapeHtml(nextStatusText) + "</button>"
        : ""),
      "</div>",
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function normalizeSkuDraft(item = {}) {
  return {
    skuId: item.skuId || "",
    skuCode: item.skuCode || "",
    specText: item.specText || "",
    price: toNumber(item.price || item.priceText || 0),
    originPrice: toNumber(item.originPrice || item.originPriceText || item.price || item.priceText || 0),
    stock: Math.max(0, toNumber(item.stock || 0)),
    lockStock: Math.max(0, toNumber(item.lockStock || 0)),
    status: item.status || "enabled"
  };
}

function createSkuDraft(index) {
  const productId = (state.productDetail || {}).productId || "SKU";

  return {
    skuId: "",
    skuCode: String(productId).toUpperCase() + "-" + String(index + 1),
    specText: "规格" + String(index + 1),
    price: toNumber(nodes.productPrice.value, 0),
    originPrice: toNumber(nodes.productMarketPrice.value, toNumber(nodes.productPrice.value, 0)),
    stock: 0,
    lockStock: 0,
    status: "enabled"
  };
}

function renderSkuEditor() {
  const detail = state.productDetail;

  if (!detail) {
    nodes.skuEmpty.classList.remove("hidden");
    nodes.skuEditor.classList.add("hidden");
    nodes.skuProductPreview.innerHTML = renderProductVisual("", "SKU", {
      compact: true
    });
    nodes.skuSummaryGrid.innerHTML = "";
    nodes.skuList.innerHTML = "";
    renderWorkspaceChrome();
    return;
  }

  if (!state.skuDrafts.length) {
    state.skuDrafts = [createSkuDraft(0)];
  }

  nodes.skuEmpty.classList.add("hidden");
  nodes.skuEditor.classList.remove("hidden");
  nodes.skuProductPreview.innerHTML = renderProductVisual(detail.coverImage, detail.title, {
    compact: true
  });
  nodes.skuProductTitle.textContent = detail.title || "-";
  nodes.skuProductMeta.textContent = [
    detail.categoryName || "未分类",
    detail.statusText || detail.status || "已下架",
    "当前商品 ID " + (detail.productId || "-")
  ].join(" · ");
  nodes.skuSummaryGrid.innerHTML = [
    {
      label: "规格数",
      value: String(state.skuDrafts.length),
      note: "建议至少保留 1 条可售规格"
    },
    {
      label: "总库存",
      value: String(state.skuDrafts.reduce((sum, item) => sum + Math.max(0, toNumber(item.stock, 0)), 0)),
      note: "含全部 SKU 的库存合计"
    },
    {
      label: "价格范围",
      value: (function () {
        const prices = state.skuDrafts.map((item) => Math.max(0, toNumber(item.price, 0)));

        if (!prices.length) {
          return "0.00";
        }

        const minPrice = Math.min.apply(null, prices);
        const maxPrice = Math.max.apply(null, prices);

        return minPrice === maxPrice
          ? minPrice.toFixed(2)
          : minPrice.toFixed(2) + " - " + maxPrice.toFixed(2);
      }()),
      note: "单位：元"
    }
  ].map((item) => {
    return [
      '<div class="metric-card">',
      "<span>" + escapeHtml(item.label) + "</span>",
      "<strong>" + escapeHtml(item.value) + "</strong>",
      "<small>" + escapeHtml(item.note) + "</small>",
      "</div>"
    ].join("");
  }).join("");

  nodes.skuList.innerHTML = state.skuDrafts.map((item, index) => {
    const disabled = canEditSkus() ? "" : " disabled";

    return [
      '<article class="card">',
      '<div class="sku-row">',
      '<label>规格名<input data-sku-index="' + index + '" data-sku-field="specText" value="' + escapeHtml(item.specText) + '"' + disabled + " /></label>",
      '<label>SKU 编码<input data-sku-index="' + index + '" data-sku-field="skuCode" value="' + escapeHtml(item.skuCode) + '"' + disabled + " /></label>",
      '<label>状态<select data-sku-index="' + index + '" data-sku-field="status"' + disabled + '><option value="enabled"' + (item.status === "enabled" ? " selected" : "") + '>启用</option><option value="disabled"' + (item.status === "disabled" ? " selected" : "") + '>停用</option></select></label>',
      '<label>售价<input type="number" min="0" step="0.01" data-sku-index="' + index + '" data-sku-field="price" value="' + escapeHtml(String(item.price || 0)) + '"' + disabled + " /></label>",
      '<label>划线价<input type="number" min="0" step="0.01" data-sku-index="' + index + '" data-sku-field="originPrice" value="' + escapeHtml(String(item.originPrice || 0)) + '"' + disabled + " /></label>",
      '<label>库存<input type="number" min="0" step="1" data-sku-index="' + index + '" data-sku-field="stock" value="' + escapeHtml(String(item.stock || 0)) + '"' + disabled + " /></label>",
      '<label>锁定库存<input type="number" min="0" step="1" data-sku-index="' + index + '" data-sku-field="lockStock" value="' + escapeHtml(String(item.lockStock || 0)) + '"' + disabled + " /></label>",
      "</div>",
      (canEditSkus()
        ? '<div class="card-actions"><button class="danger" data-action="remove-sku-row" data-sku-index="' + index + '">删除规格</button></div>'
        : ""),
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function renderOrders() {
  if (!state.orders.length) {
    nodes.ordersList.innerHTML = '<div class="empty">当前没有符合条件的订单。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.ordersList.innerHTML = state.orders.map((order) => {
    const detail = state.orderDetails.get(order.orderId) || null;
    const detailHtml = detail ? renderOrderDetail(detail) : "";
    const shipForm = order.orderStatus === "pending_shipment"
      ? [
          '<div class="ship-form">',
          '<label>物流公司<input data-ship-company-name="' + escapeHtml(order.orderId) + '" placeholder="例如：顺丰速运" /></label>',
          '<label>物流单号<input data-ship-tracking-no="' + escapeHtml(order.orderId) + '" placeholder="录入真实物流单号" /></label>',
          '<label>物流编码<input data-ship-company-code="' + escapeHtml(order.orderId) + '" placeholder="可选，例如 SF" /></label>',
          '<div class="action-row">',
          '<button class="primary" data-action="ship" data-order-id="' + escapeHtml(order.orderId) + '">确认发货</button>',
          '<button class="danger" data-action="cancel-order" data-order-id="' + escapeHtml(order.orderId) + '">取消订单</button>',
          "</div>",
          "</div>"
        ].join("")
      : "";

    return [
      '<article class="card">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(order.orderNo) + "</strong>",
      '<span class="muted">买家 ' + escapeHtml(order.buyerName) + " · " + escapeHtml(order.createdAt) + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(order.orderStatusText) + "</span>",
      '<span class="tag">' + escapeHtml(order.payableAmountText) + " 元</span>",
      '<span class="tag">' + escapeHtml(String(order.itemCount || 0)) + " 件商品</span>",
      "</div>",
      "</div>",
      '<div class="card-bottom">',
      '<span class="muted">状态码：' + escapeHtml(order.orderStatus) + "</span>",
      '<div class="action-row">',
      '<button class="secondary" data-action="toggle-order-detail" data-order-id="' + escapeHtml(order.orderId) + '">' + (detail ? "收起详情" : "查看详情") + "</button>",
      "</div>",
      "</div>",
      detailHtml,
      shipForm,
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function renderOrderDetail(detail) {
  const shipment = detail.shipment;
  const afterSale = detail.afterSale;

  return [
    '<div class="detail-grid">',
    '<div class="detail-box">',
    "<p><strong>收货信息</strong></p>",
    "<p>" + escapeHtml(detail.receiverName || "-") + " / " + escapeHtml(detail.receiverMobile || "-") + "</p>",
    "<p class=\"muted\">" + escapeHtml(detail.receiverAddress || "-") + "</p>",
    "</div>",
    '<div class="detail-box">',
    "<p><strong>金额信息</strong></p>",
    "<p>商品金额 " + escapeHtml(detail.goodsAmountText) + " 元</p>",
    "<p>优惠抵扣 " + escapeHtml(detail.discountAmountText) + " 元</p>",
    "<p>实付 " + escapeHtml(detail.payableAmountText) + " 元</p>",
    "</div>",
    '<div class="detail-box">',
    "<p><strong>履约信息</strong></p>",
    (shipment
      ? "<p>" + escapeHtml(shipment.companyName) + " · " + escapeHtml(shipment.trackingNo) + "</p><p class=\"muted\">发货时间 " + escapeHtml(shipment.shippedAt) + "</p>"
      : '<p class="muted">还没有录入物流信息</p>'),
    (afterSale
      ? "<p>售后状态 " + escapeHtml(afterSale.statusText) + "</p>"
      : '<p class="muted">当前没有售后记录</p>'),
    "</div>",
    "</div>",
    '<div class="order-items">',
    (detail.items || []).map((item) => {
      return [
        '<div class="order-item">',
        "<strong>" + escapeHtml(item.productTitle) + "</strong>",
        "<p class=\"muted\">" + escapeHtml(item.specText || "默认规格") + " · x" + escapeHtml(String(item.quantity || 1)) + "</p>",
        "<p class=\"muted\">成交单价 " + escapeHtml(item.salePriceText) + " 元</p>",
        "</div>"
      ].join("");
    }).join(""),
    "</div>"
  ].join("");
}

function renderAfterSales() {
  if (!state.afterSales.length) {
    nodes.aftersalesList.innerHTML = '<div class="empty">当前没有符合条件的售后记录。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.aftersalesList.innerHTML = state.afterSales.map((record) => {
    const canReview = record.status === "pending_review";

    return [
      '<article class="card">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(record.orderNo) + "</strong>",
      '<span class="muted">买家 ' + escapeHtml(record.buyerName) + " · " + escapeHtml(record.createdAt) + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(record.statusText) + "</span>",
      '<span class="tag">' + escapeHtml(record.reason) + "</span>",
      "</div>",
      "</div>",
      '<div class="detail-grid">',
      '<div class="detail-box">',
      "<p><strong>申请说明</strong></p>",
      "<p>" + escapeHtml(record.description || "未填写说明") + "</p>",
      "</div>",
      '<div class="detail-box">',
      "<p><strong>订单状态</strong></p>",
      "<p>" + escapeHtml(record.orderStatusText || "-") + "</p>",
      "</div>",
      '<div class="detail-box">',
      "<p><strong>处理结果</strong></p>",
      (record.reviewedAt
        ? "<p>" + escapeHtml(record.reviewedBy || "系统管理员") + " · " + escapeHtml(record.reviewedAt) + "</p><p class=\"muted\">" + escapeHtml(record.reviewRemark || "未填写备注") + "</p>"
        : '<p class="muted">尚未处理</p>'),
      "</div>",
      "</div>",
      (canReview
        ? [
            '<div class="review-form">',
            '<label>处理备注<textarea data-review-remark="' + escapeHtml(record.afterSaleId) + '" placeholder="例如：已核实问题，同意退款或换货"></textarea></label>',
            '<div class="action-row">',
            '<button class="success" data-action="approve-aftersale" data-aftersale-id="' + escapeHtml(record.afterSaleId) + '">通过</button>',
            '<button class="danger" data-action="reject-aftersale" data-aftersale-id="' + escapeHtml(record.afterSaleId) + '">驳回</button>',
            "</div>",
            "</div>"
          ].join("")
        : ""),
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function getWithdrawalId(record = {}) {
  return record.withdrawalId || record.id || "";
}

function renderWithdrawalDetail(detail = {}) {
  const payouts = Array.isArray(detail.payouts) ? detail.payouts : [];
  const items = Array.isArray(detail.items) ? detail.items : [];

  return [
    '<div class="detail-grid">',
    '<div class="detail-box">',
    "<p><strong>审核信息</strong></p>",
    "<p>" + escapeHtml(detail.reviewedBy || "未审核") + "</p>",
    "<p class=\"muted\">" + escapeHtml(detail.reviewedAt || "-") + "</p>",
    "<p class=\"muted\">" + escapeHtml(detail.reviewRemark || "暂无审核备注") + "</p>",
    "</div>",
    '<div class="detail-box">',
    "<p><strong>打款信息</strong></p>",
    "<p>" + escapeHtml(detail.paidAt || "未打款") + "</p>",
    "<p class=\"muted\">最近流水号 " + escapeHtml((((detail.latestPayout || {}).channelBillNo) || "-")) + "</p>",
    "</div>",
    '<div class="detail-box">',
    "<p><strong>金额信息</strong></p>",
    "<p>申请 " + escapeHtml(String(detail.amount || 0)) + " 元</p>",
    "<p>手续费 " + escapeHtml(String(detail.serviceFee || 0)) + " 元</p>",
    "<p>到账 " + escapeHtml(String(detail.netAmount || 0)) + " 元</p>",
    "</div>",
    "</div>",
    (items.length
      ? [
          '<div class="order-items">',
          items.map((item) => {
            return [
              '<div class="order-item">',
              "<strong>" + escapeHtml(item.commissionTitle || "佣金流水") + "</strong>",
              "<p class=\"muted\">订单 " + escapeHtml(item.commissionOrderNo || "-") + " · 金额 " + escapeHtml(String(item.amount || 0)) + " 元</p>",
              "<p class=\"muted\">状态 " + escapeHtml(item.commissionStatus || "-") + "</p>",
              "</div>"
            ].join("");
          }).join(""),
          "</div>"
        ].join("")
      : ""),
    (payouts.length
      ? [
          '<div class="order-items">',
          payouts.map((item) => {
            return [
              '<div class="order-item">',
              "<strong>打款流水</strong>",
              "<p class=\"muted\">" + escapeHtml(item.channel || "manual_bank") + " · " + escapeHtml(item.status || "-") + "</p>",
              "<p class=\"muted\">单号 " + escapeHtml(item.channelBillNo || "-") + " · " + escapeHtml(item.paidBy || "-") + " · " + escapeHtml(item.paidAt || "-") + "</p>",
              "</div>"
            ].join("");
          }).join(""),
          "</div>"
        ].join("")
      : "")
  ].join("");
}

function renderWithdrawals() {
  if (!state.withdrawals.length) {
    nodes.withdrawalsList.innerHTML = '<div class="empty">当前没有符合条件的提现单。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.withdrawalsList.innerHTML = state.withdrawals.map((record) => {
    const withdrawalId = getWithdrawalId(record);
    const detail = state.withdrawalDetails.get(withdrawalId) || null;
    const distributor = record.distributor || {};
    const distributorNickname = record.nickname || distributor.nickname || "未知分销员";
    const distributorMobile = record.mobile || distributor.mobile || "-";
    const canReview = canReviewWithdrawals();
    const reviewable = String(record.status || "").trim() === "submitted";
    const payable = ["approved", "pay_failed", "paying"].includes(String(record.status || "").trim());

    return [
      '<article class="card">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(record.requestNo || withdrawalId) + "</strong>",
      '<span class="muted">' + escapeHtml(distributorNickname) + " · " + escapeHtml(distributorMobile) + " · " + escapeHtml(record.createdAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(record.statusText || record.status || "-") + "</span>",
      '<span class="tag">申请 ' + escapeHtml(record.amountText || String(record.amount || 0)) + " 元</span>",
      '<span class="tag">到账 ' + escapeHtml(record.netAmountText || String(record.netAmount || 0)) + " 元</span>",
      "</div>",
      "</div>",
      '<div class="detail-grid">',
      '<div class="detail-box">',
      "<p><strong>提现账户</strong></p>",
      "<p>" + escapeHtml(record.accountName || "未填写") + "</p>",
      "<p class=\"muted\">" + escapeHtml(record.accountNoMask || "-") + "</p>",
      "</div>",
      '<div class="detail-box">',
      "<p><strong>审核备注</strong></p>",
      "<p>" + escapeHtml(record.reviewRemark || "暂无") + "</p>",
      "<p class=\"muted\">" + escapeHtml(record.reviewedBy || "-") + " · " + escapeHtml(record.reviewedAt || "-") + "</p>",
      "</div>",
      '<div class="detail-box">',
      "<p><strong>最新打款</strong></p>",
      "<p>" + escapeHtml((((record.latestPayout || {}).status) || "暂无")) + "</p>",
      "<p class=\"muted\">单号 " + escapeHtml((((record.latestPayout || {}).channelBillNo) || "-")) + "</p>",
      "</div>",
      "</div>",
      (canReview && reviewable
        ? [
            '<div class="review-form">',
            '<label>审核备注<textarea data-review-withdrawal-remark="' + escapeHtml(withdrawalId) + '" placeholder="例如：已核实实名信息，允许提现"></textarea></label>',
            '<div class="action-row">',
            '<button class="success" data-action="approve-withdrawal" data-withdrawal-id="' + escapeHtml(withdrawalId) + '">审核通过</button>',
            '<button class="danger" data-action="reject-withdrawal" data-withdrawal-id="' + escapeHtml(withdrawalId) + '">审核驳回</button>',
            "</div>",
            "</div>"
          ].join("")
        : ""),
      (canReview && payable
        ? [
            '<div class="review-form">',
            '<label>打款流水号<input data-payout-bill="' + escapeHtml(withdrawalId) + '" placeholder="例如：BANK20260413001" /></label>',
            '<label>打款备注<textarea data-payout-remark="' + escapeHtml(withdrawalId) + '" placeholder="例如：人工转账已完成"></textarea></label>',
            '<div class="action-row">',
            '<button class="primary" data-action="payout-withdrawal" data-withdrawal-id="' + escapeHtml(withdrawalId) + '">登记打款成功</button>',
            '<button class="danger" data-action="payout-withdrawal-failed" data-withdrawal-id="' + escapeHtml(withdrawalId) + '">登记打款失败</button>',
            "</div>",
            "</div>"
          ].join("")
        : ""),
      '<div class="card-bottom">',
      '<span class="muted">渠道 ' + escapeHtml(record.channel || "manual_bank") + "</span>",
      '<div class="action-row"><button class="secondary" data-action="toggle-withdrawal-detail" data-withdrawal-id="' + escapeHtml(withdrawalId) + '">' + (detail ? "收起详情" : "查看详情") + "</button></div>",
      "</div>",
      (detail ? renderWithdrawalDetail(detail) : ""),
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

async function login(username, password) {
  const payload = await request("/admin/v1/auth/login", {
    method: "POST",
    auth: false,
    body: {
      username,
      password
    }
  });

  state.loggedIn = true;
  state.session = payload;
  await ensureRepositoryMode();
  renderSession();
  await refreshAll();
}

async function validateSession() {
  try {
    state.session = await request("/admin/v1/auth/me");
    state.loggedIn = true;
    await ensureRepositoryMode();
    renderSession();
    await refreshAll();
  } catch (error) {
    clearSession();
  }
}

function clearSession() {
  state.loggedIn = false;
  state.session = null;
  state.activeSection = "summary";
  state.summary = null;
  state.categories = [];
  state.products = [];
  state.productDetail = null;
  state.skuDrafts = [];
  state.orders = [];
  state.afterSales = [];
  state.distributionRules = null;
  state.distributionRuleVersions = [];
  state.distributionRuleChangeLogs = [];
  state.distributors = [];
  state.distributorDetails = new Map();
  state.withdrawals = [];
  state.withdrawalDetails = new Map();
  state.orderDetails = new Map();
  state.banners = [];
  state.pageSections = [];
  state.storeTheme = {};
  state.couponTemplates = [];
  state.users = [];
  state.userDetails = new Map();
  state.reviews = [];
  state.notifications = [];
  state.unreadNotificationCount = 0;
  stopNotificationPolling();
  state.adminUsers = [];
  state.operationLogs = [];
  renderSession();
  renderSummary();
  renderCategorySelects();
  renderCategories();
  renderProducts();
  renderSkuEditor();
  renderOrders();
  renderAfterSales();
  resetRuleVersionForm();
  renderDistributionOverview();
  renderDistributionRules();
  renderDistributors();
  renderWithdrawals();
  renderBannersList();
  renderPageSectionsList();
  renderCouponTemplates();
  renderUsers();
  renderReviews();
  renderNotifications();
  renderAdminUsers();
  renderOperationLogs();
}

async function refreshSummary() {
  state.summary = await request("/admin/v1/dashboard/summary");
  renderSummary();
}

async function refreshCategories() {
  const payload = await request("/admin/v1/categories?page=1&pageSize=100");
  state.categories = payload.list || [];
  renderCategorySelects();
  renderCategories();
}

async function refreshProducts() {
  const query = new URLSearchParams({
    page: "1",
    pageSize: "100"
  });
  const keyword = nodes.productsFilterKeyword.value.trim();
  const categoryId = nodes.productsFilterCategory.value;
  const status = nodes.productsFilterStatus.value;

  if (keyword) {
    query.set("keyword", keyword);
  }

  if (categoryId) {
    query.set("categoryId", categoryId);
  }

  if (status) {
    query.set("status", status);
  }

  const payload = await request("/admin/v1/products?" + query.toString());
  state.products = payload.list || [];
  renderProducts();
}

async function refreshProductSkus(productId) {
  if (!productId || !hasPermission("sku.view")) {
    state.skuDrafts = [];
    renderSkuEditor();
    return;
  }

  const payload = await request("/admin/v1/products/" + encodeURIComponent(productId) + "/skus");
  state.skuDrafts = (payload.list || []).map((item) => normalizeSkuDraft(item));
  renderSkuEditor();
}

async function refreshOrders() {
  const orderNo = document.getElementById("orders-filter-order-no").value.trim();
  const status = document.getElementById("orders-filter-status").value;
  const query = new URLSearchParams({
    page: "1",
    pageSize: "50"
  });

  if (orderNo) {
    query.set("orderNo", orderNo);
  }

  if (status) {
    query.set("status", status);
  }

  const payload = await request("/admin/v1/orders?" + query.toString());
  state.orders = payload.list || [];
  renderOrders();
}

async function refreshAfterSales() {
  const keyword = document.getElementById("aftersales-filter-keyword").value.trim();
  const status = document.getElementById("aftersales-filter-status").value;
  const query = new URLSearchParams({
    page: "1",
    pageSize: "50"
  });

  if (keyword) {
    query.set("keyword", keyword);
  }

  if (status) {
    query.set("status", status);
  }

  const payload = await request("/admin/v1/aftersales?" + query.toString());
  state.afterSales = payload.list || [];
  renderAfterSales();
}

async function refreshDistributionRules() {
  state.distributionRules = await request("/admin/v1/distribution/rules");
  renderDistributionOverview();
  renderDistributionRules();
}

async function refreshDistributionRuleVersions() {
  const query = new URLSearchParams({
    page: "1",
    pageSize: "50"
  });
  const keyword = nodes.ruleVersionsFilterKeyword.value.trim();
  const status = nodes.ruleVersionsFilterStatus.value;

  if (keyword) {
    query.set("keyword", keyword);
  }

  if (status) {
    query.set("status", status);
  }

  const payload = await request("/admin/v1/distribution/rule-versions?" + query.toString());
  state.distributionRuleVersions = payload.list || [];
  renderDistributionOverview();
  renderDistributionRules();
}

async function refreshDistributionRuleChangeLogs() {
  const query = new URLSearchParams({
    page: "1",
    pageSize: "100"
  });
  const action = nodes.ruleLogsFilterAction.value;
  const ruleVersionId = nodes.ruleLogsFilterVersionId.value;

  if (action) {
    query.set("action", action);
  }

  if (ruleVersionId) {
    query.set("ruleVersionId", ruleVersionId);
  }

  const payload = await request("/admin/v1/distribution/rule-change-logs?" + query.toString());
  state.distributionRuleChangeLogs = payload.list || [];
  renderDistributionRules();
}

async function refreshDistributors() {
  const query = new URLSearchParams({
    page: "1",
    pageSize: "100"
  });
  const keyword = nodes.distributorsFilterKeyword.value.trim();
  const status = nodes.distributorsFilterStatus.value;

  if (keyword) {
    query.set("keyword", keyword);
  }

  if (status) {
    query.set("status", status);
  }

  const payload = await request("/admin/v1/distributors?" + query.toString());
  state.distributors = payload.list || [];
  renderDistributionOverview();
  renderDistributors();
}

async function refreshWithdrawals() {
  const keyword = nodes.withdrawalsFilterKeyword.value.trim();
  const status = nodes.withdrawalsFilterStatus.value;
  const query = new URLSearchParams({
    page: "1",
    pageSize: "50"
  });

  if (keyword) {
    query.set("keyword", keyword);
  }

  if (status) {
    query.set("status", status);
  }

  const payload = await request("/admin/v1/distribution/withdrawals?" + query.toString());
  state.withdrawals = payload.list || [];
  renderDistributionOverview();
  renderWithdrawals();
}

async function loadBanners() {
  const payload = await request("/admin/v1/banners");
  state.banners = payload.list || payload || [];
  renderBannersList();
}

async function saveBanner() {
  const bannerId = nodes.bannerId.value.trim();
  const payload = {
    title: nodes.bannerTitle.value.trim(),
    subtitle: nodes.bannerSubtitle.value.trim(),
    imageUrl: nodes.bannerImageUrl.value.trim(),
    linkType: nodes.bannerLinkType.value,
    linkValue: nodes.bannerLinkValue.value.trim(),
    sortOrder: toNumber(nodes.bannerSortOrder.value, 0),
    status: nodes.bannerStatus.value
  };

  const result = bannerId
    ? await request("/admin/v1/banners/" + encodeURIComponent(bannerId), {
        method: "PUT",
        body: payload
      })
    : await request("/admin/v1/banners", {
        method: "POST",
        body: payload
      });

  await loadBanners();
  populateBannerForm(result);
  scrollToSection("decoration");
}

async function deleteBanner(bannerId) {
  await request("/admin/v1/banners/" + encodeURIComponent(bannerId), {
    method: "DELETE"
  });

  if (nodes.bannerId.value === bannerId) {
    resetBannerForm();
  }

  await loadBanners();
}

async function loadPageSections() {
  const payload = await request("/admin/v1/page-sections");
  state.pageSections = payload.list || payload || [];
  renderPageSectionsList();
}

async function updateSectionVisibility(sectionKey, visible) {
  await request("/admin/v1/page-sections/" + encodeURIComponent(sectionKey), {
    method: "PUT",
    body: { visible }
  });

  await loadPageSections();
}

async function loadStoreTheme() {
  const payload = await request("/admin/v1/store-theme");
  state.storeTheme = payload || {};

  const primaryColor = state.storeTheme.primaryColor || state.storeTheme.primary_color;
  if (primaryColor) {
    nodes.themePrimaryColor.value = primaryColor;
  }
}

async function saveTheme() {
  const primaryColor = nodes.themePrimaryColor.value;

  await request("/admin/v1/store-theme/primary_color", {
    method: "PUT",
    body: { themeValue: primaryColor }
  });

  state.storeTheme = Object.assign({}, state.storeTheme, {
    primary_color: primaryColor,
    primaryColor
  });
}

async function uploadBannerImage() {
  if (!canEditDecoration()) {
    return;
  }

  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/jpeg,image/png,image/webp";
  picker.click();

  const file = await new Promise((resolve) => {
    picker.addEventListener("change", () => resolve((picker.files || [])[0] || null), { once: true });
  });

  if (!file) {
    return;
  }

  nodes.bannerUploadBtn.disabled = true;
  try {
    const imageUrl = await uploadImage(file, "banner");
    if (!imageUrl) {
      throw new Error("图片上传失败");
    }
    nodes.bannerImageUrl.value = imageUrl;
    setStatus(nodes.sessionStatus, "图片上传成功。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "图片上传失败", "error");
  } finally {
    nodes.bannerUploadBtn.disabled = false;
  }
}

function renderProductImageGallery() {
  if (!state.productImages.length) {
    nodes.productImageGallery.innerHTML = '<div class="image-gallery-empty">暂无图片，点击下方按钮上传</div>';
    nodes.productCoverImage.value = "";
    return;
  }

  nodes.productImageGallery.innerHTML = state.productImages.map(function (url, index) {
    return [
      '<div class="image-gallery-item">',
      '<img src="' + escapeHtml(url) + '" alt="商品图' + (index + 1) + '" />',
      (index === 0 ? '<div class="cover-badge">封面</div>' : ''),
      '<button class="remove-btn" data-remove-image="' + index + '" type="button">&times;</button>',
      '</div>'
    ].join("");
  }).join("");

  nodes.productCoverImage.value = state.productImages[0];
}

function updateCoverPreview() {
  // Image preview is now handled by renderProductImageGallery()
}

function updatePhonePreview() {
  var title = (nodes.productTitle.value || "").trim() || "商品标题";
  var desc = (nodes.productShortDesc.value || "").trim();
  var subTitle = (nodes.productSubTitle.value || "").trim();
  var price = parseFloat(nodes.productPrice.value) || 0;
  var marketPrice = parseFloat(nodes.productMarketPrice.value) || 0;
  var coverImage = state.productImages.length ? state.productImages[0] : "";
  var status = nodes.productStatus.value;
  var detailContent = (nodes.productDetailContent.value || "").trim();

  // cover
  if (coverImage) {
    nodes.previewCover.innerHTML = '<img src="' + escapeHtml(coverImage) + '" alt="封面" />';
    nodes.previewCover.classList.add("has-image");
  } else {
    var firstChar = String(title).charAt(0) || "?";
    nodes.previewCover.innerHTML = '<span>' + escapeHtml(firstChar) + '</span>';
    nodes.previewCover.classList.remove("has-image");
  }

  // category tag
  var catEl = nodes.productCategoryId;
  var catName = catEl.selectedIndex >= 0 ? catEl.options[catEl.selectedIndex].text : "";
  nodes.previewTag.textContent = catName || "未分类";

  // title
  nodes.previewTitle.textContent = title;

  // description
  nodes.previewDesc.textContent = subTitle || desc || "卖点摘要";

  // highlights from short desc
  var highlights = (desc || "").split(/[,，、；;]/).filter(function (s) { return s.trim(); }).slice(0, 5);
  if (highlights.length > 1) {
    nodes.previewHighlights.innerHTML = highlights.map(function (h) {
      return '<span class="preview-detail-tag">' + escapeHtml(h.trim()) + '</span>';
    }).join("");
    nodes.previewHighlights.classList.remove("preview-highlights-hidden");
  } else {
    nodes.previewHighlights.innerHTML = "";
    nodes.previewHighlights.classList.add("preview-highlights-hidden");
  }

  // price
  nodes.previewPrice.textContent = price.toFixed(2);
  if (marketPrice > price && marketPrice > 0) {
    nodes.previewMarketPrice.textContent = "\u00a5" + marketPrice.toFixed(2);
    nodes.previewMarketPrice.classList.remove("preview-market-hidden");
  } else {
    nodes.previewMarketPrice.classList.add("preview-market-hidden");
  }

  // status
  if (status === "on_sale") {
    nodes.previewStatus.textContent = "销售中";
    nodes.previewStatus.classList.add("on-sale");
  } else {
    nodes.previewStatus.textContent = "已下架";
    nodes.previewStatus.classList.remove("on-sale");
  }

  // detail content
  var paragraphs = detailContent.split("\n").filter(function (l) { return l.trim(); });
  var html = "";
  if (paragraphs.length) {
    html += paragraphs.map(function (p) {
      return '<p>' + escapeHtml(p) + '</p>';
    }).join("");
  }
  if (state.detailImages.length) {
    html += state.detailImages.map(function (url) {
      return '<img class="preview-detail-image" src="' + escapeHtml(url) + '" alt="详情图" />';
    }).join("");
  }
  nodes.previewDetail.innerHTML = html || '<span class="preview-detail-empty">暂无详情内容</span>';
}

async function uploadProductCoverImage() {
  const picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/jpeg,image/png,image/webp";
  picker.click();

  const file = await new Promise(function (resolve) {
    picker.addEventListener("change", function () { resolve((picker.files || [])[0] || null); }, { once: true });
  });

  if (!file) {
    return;
  }

  nodes.productCoverUploadBtn.disabled = true;
  try {
    var imageUrl = await uploadImage(file);
    if (!imageUrl) {
      throw new Error("图片上传失败");
    }
    state.productImages.push(imageUrl);
    renderProductImageGallery();
    updateCoverPreview();
    updatePhonePreview();
    setStatus(nodes.sessionStatus, "图片上传成功。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "图片上传失败", "error");
  } finally {
    nodes.productCoverUploadBtn.disabled = false;
  }
}

function renderDetailImageGallery() {
  if (!state.detailImages.length) {
    nodes.detailImageGallery.innerHTML = '<div class="image-gallery-empty">暂无详情图片，点击下方按钮上传</div>';
    return;
  }

  nodes.detailImageGallery.innerHTML = state.detailImages.map(function (url, index) {
    return [
      '<div class="image-gallery-item">',
      '<img src="' + escapeHtml(url) + '" alt="详情图' + (index + 1) + '" />',
      '<button class="remove-btn" data-remove-detail-image="' + index + '" type="button">&times;</button>',
      '</div>'
    ].join("");
  }).join("");
}

async function uploadDetailImage() {
  var picker = document.createElement("input");
  picker.type = "file";
  picker.accept = "image/jpeg,image/png,image/webp";
  picker.click();

  var file = await new Promise(function (resolve) {
    picker.addEventListener("change", function () { resolve((picker.files || [])[0] || null); }, { once: true });
  });

  if (!file) {
    return;
  }

  nodes.detailImageUploadBtn.disabled = true;
  try {
    var imageUrl = await uploadImage(file, "product", { maxWidth: 0, quality: 0.95 });
    if (!imageUrl) {
      throw new Error("图片上传失败");
    }
    state.detailImages.push(imageUrl);
    renderDetailImageGallery();
    updatePhonePreview();
    setStatus(nodes.sessionStatus, "详情图片上传成功。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "详情图片上传失败", "error");
  } finally {
    nodes.detailImageUploadBtn.disabled = false;
  }
}

function resetBannerForm() {
  nodes.bannerId.value = "";
  nodes.bannerTitle.value = "";
  nodes.bannerSubtitle.value = "";
  nodes.bannerImageUrl.value = "";
  nodes.bannerLinkType.value = "none";
  nodes.bannerLinkValue.value = "";
  nodes.bannerSortOrder.value = "0";
  nodes.bannerStatus.value = "enabled";
  renderBannersList();
}

function populateBannerForm(record) {
  nodes.bannerId.value = record.bannerId || record.id || "";
  nodes.bannerTitle.value = record.title || "";
  nodes.bannerSubtitle.value = record.subtitle || "";
  nodes.bannerImageUrl.value = record.imageUrl || "";
  nodes.bannerLinkType.value = record.linkType || "none";
  nodes.bannerLinkValue.value = record.linkValue || "";
  nodes.bannerSortOrder.value = String(record.sortOrder || 0);
  nodes.bannerStatus.value = record.status || "enabled";
  renderBannersList();
}

function renderBannersList() {
  if (!state.banners.length) {
    nodes.bannersList.innerHTML = '<div class="empty">当前还没有轮播图，先新建一张。</div>';
    renderWorkspaceChrome();
    return;
  }

  const currentBannerId = nodes.bannerId.value.trim();

  nodes.bannersList.innerHTML = state.banners.map((item) => {
    const bannerId = item.bannerId || item.id || "";
    const thumbnailHtml = item.imageUrl
      ? '<div class="banner-thumbnail"><img src="' + escapeHtml(item.imageUrl) + '" alt="' + escapeHtml(item.title || "轮播图") + '" loading="lazy" /></div>'
      : '<div class="banner-thumbnail">无图</div>';

    return [
      '<article class="banner-card' + (currentBannerId === bannerId ? " selected-card" : "") + '">',
      thumbnailHtml,
      '<div class="banner-body">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.title || "未命名轮播图") + '<span class="sort-badge">排序 ' + escapeHtml(String(item.sortOrder || 0)) + "</span></strong>",
      '<span class="muted">' + escapeHtml(item.subtitle || "无副标题") + " · " + escapeHtml(item.statusText || item.status || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.linkType === "none" ? "不跳转" : item.linkType) + "</span>",
      "</div>",
      '<div class="card-actions">',
      (canEditDecoration()
        ? '<button class="secondary" data-action="edit-banner" data-banner-id="' + escapeHtml(bannerId) + '">编辑</button>'
        : ""),
      (canEditDecoration()
        ? '<button class="danger" data-action="delete-banner" data-banner-id="' + escapeHtml(bannerId) + '">删除</button>'
        : ""),
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function renderPageSectionsList() {
  if (!state.pageSections.length) {
    nodes.pageSectionsList.innerHTML = '<div class="empty">当前没有可配置的版块。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.pageSectionsList.innerHTML = state.pageSections.map((item) => {
    const sectionKey = item.key || item.sectionKey || "";
    const visible = item.visible !== false;

    return [
      '<article class="section-order-item">',
      '<div class="section-info">',
      "<strong>" + escapeHtml(item.title || item.name || sectionKey) + "</strong>",
      "<span>" + escapeHtml(item.description || "排序 " + (item.sortOrder || 0)) + "</span>",
      "</div>",
      '<div class="section-controls">',
      '<button class="toggle-switch' + (visible ? " active" : "") + '" data-action="toggle-section-visibility" data-section-key="' + escapeHtml(sectionKey) + '" data-visible="' + (visible ? "true" : "false") + '" type="button" aria-label="' + (visible ? "隐藏版块" : "显示版块") + '"></button>',
      '<input class="sort-input" type="number" min="0" data-action="update-section-sort" data-section-key="' + escapeHtml(sectionKey) + '" value="' + escapeHtml(String(item.sortOrder || 0)) + '"' + (canEditDecoration() ? "" : " disabled") + ' />',
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

async function refreshAll() {
  setStatus(nodes.sessionStatus, "正在刷新控制台数据...");

  try {
    if (hasPermission("dashboard.view")) {
      await refreshSummary();
    }

    if (hasPermission("statistics.sales.view")) {
      await refreshSalesStatistics();
    }

    if (hasPermission("category.view")) {
      await refreshCategories();
    }

    if (hasPermission("product.view")) {
      await refreshProducts();
    }

    if (hasPermission("sku.view") && state.productDetail && state.productDetail.productId) {
      await refreshProductSkus(state.productDetail.productId);
    } else {
      renderSkuEditor();
    }

    if (hasPermission("order.view")) {
      await refreshOrders();
    }

    if (hasPermission("aftersale.view")) {
      await refreshAfterSales();
    }

    if (canViewDistributionRules()) {
      await refreshDistributionRules();
      await refreshDistributionRuleVersions();
      resetRuleVersionForm();
      await refreshDistributionRuleChangeLogs();
    } else {
      state.distributionRules = null;
      state.distributionRuleVersions = [];
      state.distributionRuleChangeLogs = [];
      renderDistributionRules();
    }

    if (canViewDistributors()) {
      await refreshDistributors();
    } else {
      state.distributors = [];
      state.distributorDetails = new Map();
      renderDistributors();
    }

    if (canViewDistribution()) {
      await refreshWithdrawals();
      renderDistributionOverview();
    }

    if (canViewDecoration()) {
      await loadBanners();
      await loadPageSections();
      await loadStoreTheme();
    }

    if (canViewCoupons()) {
      await refreshCouponTemplates();
    }

    if (canViewUsers()) {
      await refreshUsers();
    }

    if (canViewReviews()) {
      await refreshReviews();
    }

    if (canViewNotifications()) {
      await refreshNotifications();
    }

    if (canViewSystemAccounts()) {
      await refreshAdminUsers();
    }

    if (canViewOperationLogs()) {
      await refreshOperationLogs();
    }

    setStatus(nodes.sessionStatus, "数据已更新。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "刷新失败", "error");
  }
}

async function saveCategory(event) {
  event.preventDefault();

  const categoryId = nodes.categoryId.value.trim();
  const payload = {
    name: nodes.categoryName.value.trim(),
    parentId: nodes.categoryParentId.value,
    sortOrder: toNumber(nodes.categorySortOrder.value, 0),
    status: nodes.categoryStatus.value
  };
  const response = categoryId
    ? await request("/admin/v1/categories/" + encodeURIComponent(categoryId), {
        method: "PUT",
        body: payload
      })
    : await request("/admin/v1/categories", {
        method: "POST",
        body: payload
      });

  await refreshCategories();
  populateCategoryForm(response);
  scrollToSection("categories");
}

async function saveProduct(event) {
  event.preventDefault();

  var errors = [];
  var title = nodes.productTitle.value.trim();
  var categoryId = nodes.productCategoryId.value;
  var price = toNumber(nodes.productPrice.value, 0);

  if (!title) { errors.push("请填写商品标题"); }
  if (!categoryId) { errors.push("请选择商品分类"); }
  if (price <= 0) { errors.push("商品价格必须大于 0"); }

  if (errors.length) {
    throw new Error(errors.join("；"));
  }

  const productId = nodes.productId.value.trim();
  const payload = {
    title: title,
    categoryId: categoryId,
    status: nodes.productStatus.value,
    distributionEnabled: toBoolean(nodes.productDistributionEnabled.value),
    price: price,
    marketPrice: toNumber(nodes.productMarketPrice.value, price),
    sortOrder: toNumber(nodes.productSortOrder.value, 0),
    coverImage: state.productImages.length ? state.productImages[0] : "",
    imageList: state.productImages,
    detailImages: state.detailImages,
    shortDesc: nodes.productShortDesc.value.trim(),
    subTitle: nodes.productSubTitle.value.trim(),
    detailContent: nodes.productDetailContent.value.trim()
  };
  const detail = productId
    ? await request("/admin/v1/products/" + encodeURIComponent(productId), {
        method: "PUT",
        body: payload
      })
    : await request("/admin/v1/products", {
        method: "POST",
        body: payload
      });

  state.productDetail = detail;
  populateProductForm(detail);
  await refreshProducts();

  if (hasPermission("sku.view")) {
    await refreshProductSkus(detail.productId);
  }

  scrollToSection("products");
}

async function loadProductEditor(productId) {
  const detail = await request("/admin/v1/products/" + encodeURIComponent(productId));

  state.productDetail = detail;
  populateProductForm(detail);
  scrollToSection("products");

  if (hasPermission("sku.view")) {
    await refreshProductSkus(productId);
  } else {
    renderSkuEditor();
  }
}

async function toggleProductStatus(productId, nextStatus) {
  await request("/admin/v1/products/" + encodeURIComponent(productId) + "/status", {
    method: "POST",
    body: {
      status: nextStatus
    }
  });

  await refreshProducts();

  if (state.productDetail && state.productDetail.productId === productId) {
    await loadProductEditor(productId);
  }
}

async function deleteCategory(categoryId) {
  await request("/admin/v1/categories/" + encodeURIComponent(categoryId), {
    method: "DELETE"
  });

  if (nodes.categoryId.value === categoryId) {
    resetCategoryForm();
  }

  await refreshCategories();
}

function addSkuRow() {
  state.skuDrafts.push(createSkuDraft(state.skuDrafts.length));
  renderSkuEditor();
}

function removeSkuRow(index) {
  if (state.skuDrafts.length <= 1) {
    state.skuDrafts = [createSkuDraft(0)];
  } else {
    state.skuDrafts.splice(index, 1);
  }

  renderSkuEditor();
}

function updateSkuDraft(target) {
  const index = Number(target.dataset.skuIndex || -1);
  const field = target.dataset.skuField;
  const current = state.skuDrafts[index];

  if (!current || !field) {
    return;
  }

  if (field === "price" || field === "originPrice") {
    current[field] = Math.max(0, toNumber(target.value, 0));
    return;
  }

  if (field === "stock" || field === "lockStock") {
    current[field] = Math.max(0, Math.round(toNumber(target.value, 0)));
    return;
  }

  current[field] = target.value;
}

async function saveSkus() {
  if (!(state.productDetail && state.productDetail.productId)) {
    throw new Error("请先选择一个商品");
  }

  await request("/admin/v1/products/" + encodeURIComponent(state.productDetail.productId) + "/skus", {
    method: "POST",
    body: {
      skus: state.skuDrafts
    }
  });

  await refreshProducts();
  await loadProductEditor(state.productDetail.productId);
  scrollToSection("sku");
}

function resetProductFilters() {
  nodes.productsFilterKeyword.value = "";
  nodes.productsFilterCategory.value = "";
  nodes.productsFilterStatus.value = "";
  refreshProducts();
}

function resetOrderFilters() {
  document.getElementById("orders-filter-order-no").value = "";
  document.getElementById("orders-filter-status").value = "";
  refreshOrders();
}

function resetAfterSaleFilters() {
  document.getElementById("aftersales-filter-keyword").value = "";
  document.getElementById("aftersales-filter-status").value = "";
  refreshAfterSales();
}

function resetWithdrawalFilters() {
  nodes.withdrawalsFilterKeyword.value = "";
  nodes.withdrawalsFilterStatus.value = "";
  refreshWithdrawals();
}

function resetRuleVersionFilters() {
  nodes.ruleVersionsFilterKeyword.value = "";
  nodes.ruleVersionsFilterStatus.value = "";
  refreshDistributionRuleVersions();
}

function resetRuleLogFilters() {
  nodes.ruleLogsFilterAction.value = "";
  nodes.ruleLogsFilterVersionId.value = "";
  refreshDistributionRuleChangeLogs();
}

function resetDistributorFilters() {
  nodes.distributorsFilterKeyword.value = "";
  nodes.distributorsFilterStatus.value = "";
  refreshDistributors();
}

async function createRuleVersion(event) {
  event.preventDefault();

  if (!canEditDistributionRules()) {
    throw new Error("当前账号没有规则编辑权限");
  }

  const payload = {
    enabled: toBoolean(nodes.ruleEnabled.value),
    levelOneRate: toNumber(nodes.ruleLevelOneRate.value, 8),
    levelTwoRate: toNumber(nodes.ruleLevelTwoRate.value, 3),
    bindDays: Math.max(1, Math.round(toNumber(nodes.ruleBindDays.value, 15))),
    minWithdrawalAmount: Math.max(0, toNumber(nodes.ruleMinWithdrawalAmount.value, 0)),
    serviceFeeRate: Math.max(0, toNumber(nodes.ruleServiceFeeRate.value, 0)),
    serviceFeeFixed: Math.max(0, toNumber(nodes.ruleServiceFeeFixed.value, 0)),
    ruleDesc: nodes.ruleDesc.value.trim()
  };

  await request("/admin/v1/distribution/rule-versions", {
    method: "POST",
    body: payload
  });

  await refreshDistributionRuleVersions();
  await refreshDistributionRuleChangeLogs();
  scrollToSection("distribution-rules");
}

async function publishRuleVersion(ruleVersionId) {
  if (!canEditDistributionRules()) {
    throw new Error("当前账号没有规则编辑权限");
  }

  const effectiveInput = document.querySelector('[data-rule-effective-at="' + ruleVersionId + '"]');
  const effectiveAt = effectiveInput ? effectiveInput.value.trim() : nodes.ruleEffectiveAt.value.trim();

  await request("/admin/v1/distribution/rule-versions/" + encodeURIComponent(ruleVersionId) + "/publish", {
    method: "POST",
    body: {
      effectiveAt: effectiveAt || undefined
    }
  });

  await refreshDistributionRules();
  await refreshDistributionRuleVersions();
  await refreshDistributionRuleChangeLogs();
  scrollToSection("distribution-rules");
}

async function toggleDistributorDetail(distributorId) {
  if (state.distributorDetails.has(distributorId)) {
    state.distributorDetails.delete(distributorId);
    renderDistributors();
    return;
  }

  const detail = await request("/admin/v1/distributors/" + encodeURIComponent(distributorId));
  state.distributorDetails.set(distributorId, detail);
  renderDistributors();
}

async function updateDistributorStatus(distributorId, nextStatus) {
  await request("/admin/v1/distributors/" + encodeURIComponent(distributorId) + "/status", {
    method: "POST",
    body: {
      status: nextStatus
    }
  });

  state.distributorDetails.delete(distributorId);
  await refreshDistributors();
  if (canViewDistribution()) {
    await refreshWithdrawals();
  }
  renderDistributionOverview();
}

async function toggleOrderDetail(orderId) {
  if (state.orderDetails.has(orderId)) {
    state.orderDetails.delete(orderId);
    renderOrders();
    return;
  }

  const detail = await request("/admin/v1/orders/" + encodeURIComponent(orderId));
  state.orderDetails.set(orderId, detail);
  renderOrders();
}

async function shipOrder(orderId) {
  const companyName = document.querySelector('[data-ship-company-name="' + orderId + '"]').value.trim();
  const trackingNo = document.querySelector('[data-ship-tracking-no="' + orderId + '"]').value.trim();
  const companyCode = document.querySelector('[data-ship-company-code="' + orderId + '"]').value.trim();

  await request("/admin/v1/orders/" + encodeURIComponent(orderId) + "/ship", {
    method: "POST",
    body: {
      companyName,
      trackingNo,
      companyCode
    }
  });

  await refreshOrders();
  await refreshSummary();
}

async function cancelOrder(orderId) {
  await request("/admin/v1/orders/" + encodeURIComponent(orderId) + "/cancel", {
    method: "POST"
  });

  await refreshOrders();
  await refreshSummary();
}

async function reviewAfterSale(afterSaleId, action) {
  const remarkNode = document.querySelector('[data-review-remark="' + afterSaleId + '"]');

  await request("/admin/v1/aftersales/" + encodeURIComponent(afterSaleId) + "/review", {
    method: "POST",
    body: {
      action,
      remark: remarkNode ? remarkNode.value.trim() : ""
    }
  });

  await refreshAfterSales();
  await refreshSummary();
}

async function toggleWithdrawalDetail(withdrawalId) {
  if (state.withdrawalDetails.has(withdrawalId)) {
    state.withdrawalDetails.delete(withdrawalId);
    renderWithdrawals();
    return;
  }

  const detail = await request("/admin/v1/distribution/withdrawals/" + encodeURIComponent(withdrawalId));
  state.withdrawalDetails.set(withdrawalId, detail);
  renderWithdrawals();
}

async function reviewWithdrawal(withdrawalId, action) {
  const remarkNode = document.querySelector('[data-review-withdrawal-remark="' + withdrawalId + '"]');

  await request("/admin/v1/distribution/withdrawals/" + encodeURIComponent(withdrawalId) + "/review", {
    method: "POST",
    body: {
      action,
      remark: remarkNode ? remarkNode.value.trim() : ""
    }
  });

  state.withdrawalDetails.delete(withdrawalId);
  await refreshWithdrawals();
  if (hasPermission("dashboard.view")) {
    await refreshSummary();
  }
}

async function payoutWithdrawal(withdrawalId, result) {
  const billNode = document.querySelector('[data-payout-bill="' + withdrawalId + '"]');
  const remarkNode = document.querySelector('[data-payout-remark="' + withdrawalId + '"]');

  await request("/admin/v1/distribution/withdrawals/" + encodeURIComponent(withdrawalId) + "/payout", {
    method: "POST",
    body: {
      result,
      channel: "manual_bank",
      channelBillNo: billNode ? billNode.value.trim() : "",
      remark: remarkNode ? remarkNode.value.trim() : ""
    }
  });

  state.withdrawalDetails.delete(withdrawalId);
  await refreshWithdrawals();
  if (hasPermission("dashboard.view")) {
    await refreshSummary();
  }
}

nodes.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(nodes.loginStatus, "正在登录...");
  nodes.loginSubmit.disabled = true;

  try {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    await login(username, password);
    setStatus(nodes.loginStatus, "登录成功。", "success");
  } catch (error) {
    setStatus(nodes.loginStatus, error.message || "登录失败", "error");
  } finally {
    nodes.loginSubmit.disabled = false;
  }
});

// ── Coupon Template Functions ──────────────────────────────────────

async function refreshCouponTemplates() {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  const keyword = nodes.couponFilterKeyword.value.trim();
  const status = nodes.couponFilterStatus.value;

  if (keyword) { params.set("keyword", keyword); }
  if (status) { params.set("status", status); }

  const data = await request("/admin/v1/coupon-templates?" + params.toString());
  state.couponTemplates = (data && data.list) || [];
  renderCouponTemplates();
}

function renderCouponTemplates() {
  if (!state.couponTemplates.length) {
    nodes.couponTemplatesList.innerHTML = '<div class="empty">还没有优惠券，先新建一张。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.couponTemplatesList.innerHTML = state.couponTemplates.map((item) => {
    const nextStatus = String(item.status) === "enabled" ? "disabled" : "enabled";
    const nextStatusText = String(item.status) === "enabled" ? "停用" : "启用";
    const currentCouponId = nodes.couponId.value.trim();
    const isSelected = currentCouponId === String(item.templateId || item.id);
    const issueTypeText = String(item.issueType) === "center_claim" ? "领券中心" : "手动发放";

    return [
      '<article class="card' + (isSelected ? " selected-card" : "") + '">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.title || "未命名优惠券") + "</strong>",
      '<span class="muted">券码 ' + escapeHtml(item.code || "-") + " · 更新时间 " + escapeHtml(item.updatedAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.statusText || item.status) + "</span>",
      '<span class="tag">' + escapeHtml(issueTypeText) + "</span>",
      (item.badge ? '<span class="tag">' + escapeHtml(item.badge) + "</span>" : ""),
      "</div>",
      "</div>",
      '<div class="metrics-grid">',
      '<div class="metric-card"><span>面额</span><strong>' + escapeHtml(String(item.amount || 0)) + '</strong><small>单位：元</small></div>',
      '<div class="metric-card"><span>使用门槛</span><strong>' + escapeHtml(String(item.threshold || 0)) + '</strong><small>满减条件（元）</small></div>',
      '<div class="metric-card"><span>有效天数</span><strong>' + escapeHtml(String(item.validDays || "-")) + '</strong><small>领取后计算</small></div>',
      "</div>",
      (item.description ? '<p class="product-copy">' + escapeHtml(item.description) + "</p>" : ""),
      '<div class="card-actions">',
      (canEditCoupons()
        ? '<button class="secondary" data-action="edit-coupon" data-coupon-id="' + escapeHtml(String(item.templateId || item.id)) + '">编辑优惠券</button>'
        : ""),
      (canToggleCouponStatus()
        ? '<button class="' + (String(item.status) === "enabled" ? "danger" : "success") + '" data-action="toggle-coupon-status" data-coupon-id="' + escapeHtml(String(item.templateId || item.id)) + '" data-next-status="' + escapeHtml(nextStatus) + '">' + escapeHtml(nextStatusText) + "</button>"
        : ""),
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function resetCouponForm() {
  nodes.couponId.value = "";
  nodes.couponTitle.value = "";
  nodes.couponCode.value = "";
  nodes.couponAmount.value = "0";
  nodes.couponThreshold.value = "0";
  nodes.couponIssueType.value = "center_claim";
  nodes.couponValidDays.value = "30";
  nodes.couponBadge.value = "";
  nodes.couponStatus.value = "enabled";
  nodes.couponDescription.value = "";
}

function populateCouponForm(record) {
  nodes.couponId.value = String(record.templateId || record.id || "");
  nodes.couponTitle.value = record.title || "";
  nodes.couponCode.value = record.code || "";
  nodes.couponAmount.value = String(record.amount || 0);
  nodes.couponThreshold.value = String(record.threshold || 0);
  nodes.couponIssueType.value = record.issueType || "center_claim";
  nodes.couponValidDays.value = String(record.validDays || 30);
  nodes.couponBadge.value = record.badge || "";
  nodes.couponStatus.value = record.status || "enabled";
  nodes.couponDescription.value = record.description || "";
  scrollToSection("coupon-templates");
}

async function saveCouponTemplate(event) {
  event.preventDefault();

  const templateId = nodes.couponId.value.trim();
  const payload = {
    title: nodes.couponTitle.value.trim(),
    amount: toNumber(nodes.couponAmount.value, 0),
    threshold: toNumber(nodes.couponThreshold.value, 0),
    issueType: nodes.couponIssueType.value,
    validDays: toNumber(nodes.couponValidDays.value, 30),
    status: nodes.couponStatus.value
  };

  const code = nodes.couponCode.value.trim();
  if (code) { payload.code = code; }

  const badge = nodes.couponBadge.value.trim();
  if (badge) { payload.badge = badge; }

  const description = nodes.couponDescription.value.trim();
  if (description) { payload.description = description; }

  if (templateId) {
    await request("/admin/v1/coupon-templates/" + encodeURIComponent(templateId), {
      method: "PUT",
      body: payload
    });
  } else {
    await request("/admin/v1/coupon-templates", {
      method: "POST",
      body: payload
    });
  }

  resetCouponForm();
  await refreshCouponTemplates();
}

async function toggleCouponStatus(couponId, nextStatus) {
  await request("/admin/v1/coupon-templates/" + encodeURIComponent(couponId) + "/status", {
    method: "POST",
    body: { status: nextStatus }
  });
  await refreshCouponTemplates();
}

function resetCouponFilters() {
  nodes.couponFilterKeyword.value = "";
  nodes.couponFilterStatus.value = "";
  refreshCouponTemplates();
}

nodes.couponForm.addEventListener("submit", async (event) => {
  try {
    await saveCouponTemplate(event);
    setStatus(nodes.sessionStatus, "优惠券已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "优惠券保存失败", "error");
  }
});

nodes.couponReset.addEventListener("click", resetCouponForm);
nodes.couponFilterSubmit.addEventListener("click", refreshCouponTemplates);
document.getElementById("coupon-filter-reset").addEventListener("click", resetCouponFilters);

// ── Sales Statistics Functions ──────────────────────────────────────

async function refreshSalesStatistics() {
  const days = nodes.salesTrendDays.value || "7";
  const data = await request("/admin/v1/statistics/sales?days=" + encodeURIComponent(days));
  state.salesStatistics = Array.isArray(data) ? data : [];
  renderSalesTrend();
}

function renderSalesTrend() {
  const items = state.salesStatistics;

  if (!items.length) {
    nodes.salesTrendChart.innerHTML = '<div class="empty">暂无销售数据。</div>';
    return;
  }

  const maxSales = Math.max(...items.map((item) => toNumber(item.salesAmount, 0)), 1);

  nodes.salesTrendChart.innerHTML = [
    '<div class="trend-bars">',
    items.map((item) => {
      const heightPercent = Math.round((toNumber(item.salesAmount, 0) / maxSales) * 100);
      const barHeight = Math.max(heightPercent, 2);
      const label = item.date.slice(5);

      return [
        '<div class="trend-bar-col">',
        '<div class="trend-bar-value">' + escapeHtml(String(item.orderCount)) + ' 单</div>',
        '<div class="trend-bar" data-height="' + barHeight + '"></div>',
        '<div class="trend-bar-label">' + escapeHtml(label) + '</div>',
        '</div>'
      ].join("");
    }).join(""),
    '</div>'
  ].join("");

  var bars = nodes.salesTrendChart.querySelectorAll(".trend-bar[data-height]");
  for (var i = 0; i < bars.length; i++) {
    bars[i].style.height = bars[i].getAttribute("data-height") + "%";
  }
}

nodes.salesTrendRefresh.addEventListener("click", refreshSalesStatistics);

// ── User Management Functions ──────────────────────────────────────

async function refreshUsers() {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  const keyword = nodes.usersFilterKeyword.value.trim();
  const status = nodes.usersFilterStatus.value;

  if (keyword) { params.set("keyword", keyword); }
  if (status) { params.set("status", status); }

  const data = await request("/admin/v1/users?" + params.toString());
  state.users = (data && data.list) || [];
  renderUsers();
}

function renderUsers() {
  if (!state.users.length) {
    nodes.usersList.innerHTML = '<div class="empty">没有符合条件的用户。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.usersList.innerHTML = state.users.map((item) => {
    const detail = state.userDetails.get(item.userId);
    const nextStatus = item.status === "disabled" ? "active" : "disabled";
    const nextStatusText = item.status === "disabled" ? "启用" : "禁用";
    const placeholder = String(item.nickname || "?").trim().slice(0, 1) || "?";

    return [
      '<article class="card">',
      '<div class="product-layout">',
      (item.avatarUrl
        ? '<div class="product-visual compact"><img src="' + escapeHtml(item.avatarUrl) + '" alt="" loading="lazy" /></div>'
        : '<div class="product-visual compact">' + escapeHtml(placeholder) + "</div>"),
      '<div class="product-body">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.nickname || "未命名用户") + "</strong>",
      '<span class="muted">' + escapeHtml(item.mobile || "未绑定手机") + " · 注册时间 " + escapeHtml(item.createdAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.statusText) + "</span>",
      (item.isDistributor ? '<span class="tag">分销员</span>' : ""),
      '<span class="tag">' + escapeHtml(String(item.orderCount)) + " 笔订单</span>",
      '<span class="tag">' + escapeHtml(String(item.couponCount)) + " 张优惠券</span>",
      "</div>",
      "</div>",
      '<div class="card-actions">',
      '<button class="secondary" data-action="toggle-user-detail" data-user-id="' + escapeHtml(item.userId) + '">' + (detail ? "收起详情" : "查看详情") + "</button>",
      (canEditUserStatus()
        ? '<button class="' + (item.status === "disabled" ? "success" : "danger") + '" data-action="update-user-status" data-user-id="' + escapeHtml(item.userId) + '" data-next-status="' + escapeHtml(nextStatus) + '">' + escapeHtml(nextStatusText) + "</button>"
        : ""),
      "</div>",
      (detail
        ? [
            '<div class="detail-grid">',
            '<div class="detail-box"><p><strong>用户 ID</strong></p><p class="muted">' + escapeHtml(detail.userId || "-") + "</p></div>",
            '<div class="detail-box"><p><strong>OpenID</strong></p><p class="muted">' + escapeHtml(detail.openId || "-") + "</p></div>",
            '<div class="detail-box"><p><strong>注册时间</strong></p><p>' + escapeHtml(detail.createdAt || "-") + "</p></div>",
            "</div>",
            (detail.distributor
              ? '<div class="detail-box detail-box-spaced"><p><strong>分销员信息</strong></p><p class="muted">状态 ' + escapeHtml(detail.distributor.statusText || detail.distributor.status || "-") + " · 累计佣金 " + escapeHtml(detail.distributor.totalCommissionText || "0.00") + " 元</p></div>"
              : ""),
            (detail.recentOrders && detail.recentOrders.length
              ? [
                  '<div class="order-items">',
                  '<p class="section-label"><strong>最近订单</strong></p>',
                  detail.recentOrders.map((order) => {
                    return '<div class="order-item"><strong>' + escapeHtml(order.orderNo || "-") + '</strong><p class="muted">' + escapeHtml(order.statusText || order.status) + " · " + escapeHtml(order.payableAmountText || "0.00") + " 元 · " + escapeHtml(order.createdAt || "-") + "</p></div>";
                  }).join(""),
                  "</div>"
                ].join("")
              : ""),
            (detail.coupons && detail.coupons.length
              ? [
                  '<div class="order-items">',
                  '<p class="section-label"><strong>持有优惠券</strong></p>',
                  detail.coupons.map((c) => {
                    return '<div class="order-item"><strong>' + escapeHtml(c.title || "优惠券") + '</strong><p class="muted">' + escapeHtml(c.statusText) + " · 满 " + escapeHtml(String(c.threshold)) + " 减 " + escapeHtml(String(c.amount)) + (c.expiresAt ? " · 有效期至 " + escapeHtml(c.expiresAt) : "") + "</p></div>";
                  }).join(""),
                  "</div>"
                ].join("")
              : "")
          ].join("")
        : ""),
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

async function toggleUserDetail(userId) {
  if (state.userDetails.has(userId)) {
    state.userDetails.delete(userId);
    renderUsers();
    return;
  }

  const detail = await request("/admin/v1/users/" + encodeURIComponent(userId));
  state.userDetails.set(userId, detail);
  renderUsers();
}

async function updateUserStatus(userId, nextStatus) {
  await request("/admin/v1/users/" + encodeURIComponent(userId) + "/status", {
    method: "POST",
    body: { status: nextStatus }
  });
  await refreshUsers();
}

function resetUserFilters() {
  nodes.usersFilterKeyword.value = "";
  nodes.usersFilterStatus.value = "";
  refreshUsers();
}

nodes.usersFilterSubmit.addEventListener("click", refreshUsers);
document.getElementById("users-filter-reset").addEventListener("click", resetUserFilters);

// ── Review Management Functions ──────────────────────────────────────

async function refreshReviews() {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  const status = nodes.reviewsFilterStatus.value;
  const minRating = nodes.reviewsFilterRating.value;

  if (status) { params.set("status", status); }
  if (minRating) { params.set("minRating", minRating); }

  const data = await request("/admin/v1/reviews?" + params.toString());
  state.reviews = (data && data.list) || [];
  renderReviews();
}

function renderReviews() {
  if (!state.reviews.length) {
    nodes.reviewsList.innerHTML = '<div class="empty">没有符合条件的评价。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.reviewsList.innerHTML = state.reviews.map((item) => {
    const rating = toNumber(item.rating, 0);
    const stars = Array.from({ length: 5 }, (_, i) => i < rating ? "★" : "☆").join("");
    const nextStatus = item.status === "hidden" ? "visible" : "hidden";
    const nextStatusText = item.status === "hidden" ? "显示评价" : "隐藏评价";

    return [
      '<article class="card">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.userNickname || "匿名用户") + " · " + stars + "</strong>",
      '<span class="muted">' + escapeHtml(item.productName || "-") + " · " + escapeHtml(item.createdAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.statusText || item.status || "-") + "</span>",
      '<span class="tag">' + escapeHtml(String(rating)) + " 星</span>",
      "</div>",
      "</div>",
      '<p class="product-copy">' + escapeHtml(item.content || "无评价内容") + "</p>",
      (item.reply
        ? '<div class="detail-box detail-box-spaced"><p><strong>商家回复</strong></p><p class="muted">' + escapeHtml(item.reply) + "</p></div>"
        : ""),
      '<div class="card-actions">',
      (canEditReviewStatus()
        ? '<button class="' + (item.status === "hidden" ? "success" : "danger") + '" data-action="toggle-review-status" data-review-id="' + escapeHtml(item.reviewId) + '" data-next-status="' + escapeHtml(nextStatus) + '">' + escapeHtml(nextStatusText) + "</button>"
        : ""),
      (canReplyReviews()
        ? '<button class="secondary" data-action="reply-review" data-review-id="' + escapeHtml(item.reviewId) + '">回复</button>'
        : ""),
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

async function toggleReviewStatus(reviewId, nextStatus) {
  await request("/admin/v1/reviews/" + encodeURIComponent(reviewId) + "/status", {
    method: "POST",
    body: { status: nextStatus }
  });
  await refreshReviews();
}

async function replyReview(reviewId) {
  const existing = document.querySelector('[data-reply-content="' + reviewId + '"]');

  if (existing) {
    const content = existing.value.trim();
    if (!content) {
      return;
    }

    await request("/admin/v1/reviews/" + encodeURIComponent(reviewId) + "/reply", {
      method: "POST",
      body: { reply: content }
    });
    await refreshReviews();
    return;
  }

  const card = document.querySelector('[data-action="reply-review"][data-review-id="' + reviewId + '"]');
  if (!card) {
    return;
  }

  const article = card.closest("article");
  if (!article) {
    return;
  }

  const form = document.createElement("div");
  form.className = "review-form";
  form.innerHTML = [
    '<label>回复内容<textarea data-reply-content="' + escapeHtml(reviewId) + '" placeholder="输入回复内容"></textarea></label>',
    '<div class="action-row"><button class="primary" data-action="reply-review" data-review-id="' + escapeHtml(reviewId) + '">提交回复</button></div>'
  ].join("");
  article.appendChild(form);
}

function resetReviewFilters() {
  nodes.reviewsFilterStatus.value = "";
  nodes.reviewsFilterRating.value = "";
  refreshReviews();
}

nodes.reviewsFilterSubmit.addEventListener("click", refreshReviews);
document.getElementById("reviews-filter-reset").addEventListener("click", resetReviewFilters);

// ── Notification Functions ──────────────────────────────────────

async function refreshNotifications() {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  const isRead = nodes.notificationsFilterRead.value;

  if (isRead === "unread") { params.set("isRead", "false"); }
  if (isRead === "read") { params.set("isRead", "true"); }

  const data = await request("/admin/v1/notifications?" + params.toString());
  state.notifications = (data && data.list) || [];
  renderNotifications();
}

function renderNotifications() {
  if (!state.notifications.length) {
    nodes.notificationsList.innerHTML = '<div class="empty">没有符合条件的通知。</div>';
    renderWorkspaceChrome();
    return;
  }

  var typeIcons = {
    order: "📦",
    aftersale: "🔄",
    withdrawal: "💰",
    review: "⭐",
    system: "⚙️"
  };

  nodes.notificationsList.innerHTML = state.notifications.map((item) => {
    var icon = typeIcons[String(item.type || "")] || "📢";
    var isUnread = !item.isRead;

    return [
      '<article class="card' + (isUnread ? " selected-card" : "") + '">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + icon + " " + escapeHtml(item.title || "系统通知") + "</strong>",
      '<span class="muted">' + escapeHtml(item.time || item.createdAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.type || "通知") + "</span>",
      (isUnread ? '<span class="tag">未读</span>' : '<span class="tag">已读</span>'),
      "</div>",
      "</div>",
      '<p class="product-copy">' + escapeHtml(item.content || item.summary || "") + "</p>",
      (isUnread
        ? '<div class="card-actions"><button class="secondary" data-action="mark-notification-read" data-notification-id="' + escapeHtml(item.notificationId || item.id) + '">标为已读</button></div>'
        : ""),
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

async function markNotificationRead(id) {
  await request("/admin/v1/notifications/" + encodeURIComponent(id) + "/read", {
    method: "POST"
  });
  await refreshNotifications();
  await pollUnreadCount();
}

async function markAllNotificationsRead() {
  await request("/admin/v1/notifications/read-all", {
    method: "POST"
  });
  await refreshNotifications();
  await pollUnreadCount();
}

async function pollUnreadCount() {
  try {
    var count = await request("/admin/v1/notifications/unread-count");
    state.unreadNotificationCount = toNumber(count, 0);

    if (state.unreadNotificationCount > 0) {
      nodes.notificationBadge.textContent = String(state.unreadNotificationCount);
      nodes.notificationBadge.classList.remove("hidden");
    } else {
      nodes.notificationBadge.classList.add("hidden");
    }
  } catch (error) {
    console.warn("轮询未读通知数失败:", error.message);
  }
}

function startNotificationPolling() {
  stopNotificationPolling();
  pollUnreadCount();
  state.notificationPollingTimer = setInterval(pollUnreadCount, 60000);
}

function stopNotificationPolling() {
  if (state.notificationPollingTimer) {
    clearInterval(state.notificationPollingTimer);
    state.notificationPollingTimer = null;
  }
}

nodes.notificationsMarkAllRead.addEventListener("click", async () => {
  try {
    await markAllNotificationsRead();
    setStatus(nodes.sessionStatus, "全部通知已标为已读。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "操作失败", "error");
  }
});

nodes.notificationBell.addEventListener("click", () => {
  scrollToSection("notifications");
});

nodes.notificationsFilterSubmit.addEventListener("click", refreshNotifications);

// ── System Accounts Functions ──────────────────────────────────────

async function refreshAdminUsers() {
  var data = await request("/admin/v1/admin-users");
  state.adminUsers = (data && data.list) || [];
  renderAdminUsers();
}

function renderAdminUsers() {
  if (!state.adminUsers.length) {
    nodes.systemAccountsList.innerHTML = '<div class="empty">暂无管理员账号。</div>';
    renderWorkspaceChrome();
    return;
  }

  var currentAdminUserId = nodes.adminUserId.value.trim();

  nodes.systemAccountsList.innerHTML = state.adminUsers.map((item) => {
    var roles = Array.isArray(item.roles) ? item.roles : (String(item.roles || "").split(",").filter(Boolean));
    var isSelected = currentAdminUserId === String(item.adminUserId || item.id);

    return [
      '<article class="card' + (isSelected ? " selected-card" : "") + '">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.username || "-") + "（" + escapeHtml(item.realName || "-") + "）</strong>",
      '<span class="muted">' + escapeHtml(item.mobile || "未填手机号") + " · 最后登录 " + escapeHtml(item.lastLogin || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.statusText || item.status || "-") + "</span>",
      roles.map(function (role) { return '<span class="tag">' + escapeHtml(role.trim()) + "</span>"; }).join(""),
      "</div>",
      "</div>",
      '<div class="card-actions">',
      (canEditSystemAccounts()
        ? '<button class="secondary" data-action="edit-admin-user" data-admin-user-id="' + escapeHtml(String(item.adminUserId || item.id)) + '">编辑账号</button>'
        : ""),
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function resetAdminUserForm() {
  nodes.adminUserId.value = "";
  nodes.adminUserUsername.value = "";
  nodes.adminUserRealname.value = "";
  nodes.adminUserMobile.value = "";
  nodes.adminUserPassword.value = "";
  nodes.adminUserRoles.value = "";
  nodes.adminUserStatus.value = "enabled";
  renderAdminUsers();
}

function populateAdminUserForm(record) {
  nodes.adminUserId.value = String(record.adminUserId || record.id || "");
  nodes.adminUserUsername.value = record.username || "";
  nodes.adminUserRealname.value = record.realName || "";
  nodes.adminUserMobile.value = record.mobile || "";
  nodes.adminUserPassword.value = "";
  var roles = Array.isArray(record.roles) ? record.roles.join(",") : String(record.roles || "");
  nodes.adminUserRoles.value = roles;
  nodes.adminUserStatus.value = record.status || "enabled";
  renderAdminUsers();
  scrollToSection("system-accounts");
}

async function saveAdminUser(event) {
  event.preventDefault();

  var adminUserId = nodes.adminUserId.value.trim();
  var payload = {
    username: nodes.adminUserUsername.value.trim(),
    realName: nodes.adminUserRealname.value.trim(),
    mobile: nodes.adminUserMobile.value.trim(),
    roles: nodes.adminUserRoles.value.trim(),
    status: nodes.adminUserStatus.value
  };

  var password = nodes.adminUserPassword.value;
  if (password) {
    payload.password = password;
  }

  if (adminUserId) {
    await request("/admin/v1/admin-users/" + encodeURIComponent(adminUserId), {
      method: "PUT",
      body: payload
    });
  } else {
    await request("/admin/v1/admin-users", {
      method: "POST",
      body: payload
    });
  }

  resetAdminUserForm();
  await refreshAdminUsers();
}

nodes.adminUserForm.addEventListener("submit", async (event) => {
  try {
    await saveAdminUser(event);
    setStatus(nodes.sessionStatus, "账号已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "账号保存失败", "error");
  }
});

nodes.adminUserReset.addEventListener("click", resetAdminUserForm);

// ── Operation Logs Functions ──────────────────────────────────────

async function refreshOperationLogs() {
  var params = new URLSearchParams({ page: "1", pageSize: "100" });
  var module = nodes.logsFilterModule.value;

  if (module) { params.set("module", module); }

  var data = await request("/admin/v1/operation-logs?" + params.toString());
  state.operationLogs = (data && data.list) || [];
  renderOperationLogs();
}

function renderOperationLogs() {
  if (!state.operationLogs.length) {
    nodes.operationLogsList.innerHTML = '<div class="empty">没有符合条件的操作日志。</div>';
    renderWorkspaceChrome();
    return;
  }

  nodes.operationLogsList.innerHTML = state.operationLogs.map((item) => {
    return [
      '<article class="card">',
      '<div class="card-top">',
      '<div class="meta">',
      '<strong>' + escapeHtml(item.summary || item.action || "-") + "</strong>",
      '<span class="muted">操作人 ' + escapeHtml(item.adminName || "-") + " · " + escapeHtml(item.timestamp || item.createdAt || "-") + "</span>",
      "</div>",
      '<div class="tag-row">',
      '<span class="tag">' + escapeHtml(item.module || "-") + "</span>",
      '<span class="tag">' + escapeHtml(item.action || "-") + "</span>",
      "</div>",
      "</div>",
      "</article>"
    ].join("");
  }).join("");
  renderWorkspaceChrome();
}

function resetLogFilters() {
  nodes.logsFilterModule.value = "";
  refreshOperationLogs();
}

nodes.logsFilterSubmit.addEventListener("click", refreshOperationLogs);
document.getElementById("logs-filter-reset").addEventListener("click", resetLogFilters);

nodes.categoryForm.addEventListener("submit", async (event) => {
  try {
    await saveCategory(event);
    setStatus(nodes.sessionStatus, "分类已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "分类保存失败", "error");
  }
});

nodes.productForm.addEventListener("submit", async (event) => {
  try {
    await saveProduct(event);
    setStatus(nodes.sessionStatus, "商品已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "商品保存失败", "error");
  }
});

nodes.ruleVersionForm.addEventListener("submit", async (event) => {
  try {
    await createRuleVersion(event);
    setStatus(nodes.sessionStatus, "规则草稿已创建。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "规则草稿创建失败", "error");
  }
});

document.getElementById("refresh-all").addEventListener("click", refreshAll);
document.getElementById("orders-filter-submit").addEventListener("click", refreshOrders);
document.getElementById("orders-filter-reset").addEventListener("click", resetOrderFilters);
document.getElementById("aftersales-filter-submit").addEventListener("click", refreshAfterSales);
document.getElementById("aftersales-filter-reset").addEventListener("click", resetAfterSaleFilters);
nodes.ruleVersionsFilterSubmit.addEventListener("click", refreshDistributionRuleVersions);
document.getElementById("rule-versions-filter-reset").addEventListener("click", resetRuleVersionFilters);
nodes.ruleLogsFilterSubmit.addEventListener("click", refreshDistributionRuleChangeLogs);
document.getElementById("rule-logs-filter-reset").addEventListener("click", resetRuleLogFilters);
nodes.distributorsFilterSubmit.addEventListener("click", refreshDistributors);
document.getElementById("distributors-filter-reset").addEventListener("click", resetDistributorFilters);
nodes.withdrawalsFilterSubmit.addEventListener("click", refreshWithdrawals);
document.getElementById("withdrawals-filter-reset").addEventListener("click", resetWithdrawalFilters);
nodes.productsFilterSubmit.addEventListener("click", refreshProducts);
document.getElementById("products-filter-reset").addEventListener("click", resetProductFilters);
nodes.categoryReset.addEventListener("click", resetCategoryForm);
nodes.productReset.addEventListener("click", resetProductForm);
nodes.gotoSkuBtn.addEventListener("click", function () { scrollToSection("sku"); });
nodes.wizardPrev.addEventListener("click", function () { setWizardStep(state.wizardStep - 1); });
nodes.wizardNext.addEventListener("click", function () { setWizardStep(state.wizardStep + 1); });
nodes.wizardSteps.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-wizard-step]");
  if (btn) {
    setWizardStep(Number(btn.dataset.wizardStep));
  }
});
nodes.ruleVersionReset.addEventListener("click", resetRuleVersionForm);
nodes.skuAddRow.addEventListener("click", addSkuRow);
nodes.skuSave.addEventListener("click", async () => {
  try {
    await saveSkus();
    setStatus(nodes.sessionStatus, "SKU 已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "SKU 保存失败", "error");
  }
});

nodes.bannerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await saveBanner();
    setStatus(nodes.sessionStatus, "轮播图已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "轮播图保存失败", "error");
  }
});

nodes.bannerReset.addEventListener("click", resetBannerForm);
nodes.bannerUploadBtn.addEventListener("click", uploadBannerImage);

nodes.productCoverUploadBtn.addEventListener("click", uploadProductCoverImage);
nodes.productImageGallery.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-remove-image]");
  if (!btn) { return; }
  var index = parseInt(btn.getAttribute("data-remove-image"), 10);
  if (index >= 0 && index < state.productImages.length) {
    state.productImages.splice(index, 1);
    renderProductImageGallery();
    updateCoverPreview();
    updatePhonePreview();
  }
});

nodes.detailImageUploadBtn.addEventListener("click", uploadDetailImage);
nodes.detailImageGallery.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-remove-detail-image]");
  if (!btn) { return; }
  var index = parseInt(btn.getAttribute("data-remove-detail-image"), 10);
  if (index >= 0 && index < state.detailImages.length) {
    state.detailImages.splice(index, 1);
    renderDetailImageGallery();
    updatePhonePreview();
  }
});
nodes.productTitle.addEventListener("input", updatePhonePreview);
nodes.productShortDesc.addEventListener("input", updatePhonePreview);
nodes.productSubTitle.addEventListener("input", updatePhonePreview);
nodes.productPrice.addEventListener("input", updatePhonePreview);
nodes.productMarketPrice.addEventListener("input", updatePhonePreview);
nodes.productStatus.addEventListener("change", updatePhonePreview);
nodes.productDetailContent.addEventListener("input", updatePhonePreview);
nodes.productCategoryId.addEventListener("change", updatePhonePreview);

nodes.themeSave.addEventListener("click", async () => {
  nodes.themeSave.disabled = true;
  try {
    await saveTheme();
    setStatus(nodes.sessionStatus, "主题已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "主题保存失败", "error");
  } finally {
    nodes.themeSave.disabled = false;
  }
});

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await request("/admin/v1/auth/logout", {
      method: "POST"
    });
  } catch (error) {
    console.warn(error);
  }

  clearSession();
  setStatus(nodes.loginStatus, "已退出登录。");
});

document.body.addEventListener("input", (event) => {
  const target = event.target;

  if (!target.matches("[data-sku-index][data-sku-field]")) {
    return;
  }

  updateSkuDraft(target);
});

document.body.addEventListener("change", (event) => {
  const target = event.target;

  if (!target.matches("[data-sku-index][data-sku-field]")) {
    return;
  }

  updateSkuDraft(target);
});

document.body.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");

  if (!target) {
    return;
  }

  const action = target.dataset.action;
  const sectionKey = target.dataset.sectionKey;
  const orderId = target.dataset.orderId;
  const afterSaleId = target.dataset.aftersaleId;
  const categoryId = target.dataset.categoryId;
  const productId = target.dataset.productId;
  const withdrawalId = target.dataset.withdrawalId;
  const ruleVersionId = target.dataset.ruleVersionId;
  const distributorId = target.dataset.distributorId;
  const nextStatus = target.dataset.nextStatus;
  const skuIndex = Number(target.dataset.skuIndex || -1);
  const bannerId = target.dataset.bannerId;
  const couponId = target.dataset.couponId;
  const userId = target.dataset.userId;
  const sectionVisibilityKey = target.dataset.sectionKey;
  const reviewId = target.dataset.reviewId;
  const notificationId = target.dataset.notificationId;
  const adminUserId = target.dataset.adminUserId;

  target.disabled = true;

  try {
    if (action === "jump-section") {
      scrollToSection(sectionKey);
    } else if (action === "edit-category") {
      const record = state.categories.find((item) => item.categoryId === categoryId);

      if (record) {
        populateCategoryForm(record);
        scrollToSection("categories");
      }
    } else if (action === "delete-category") {
      await deleteCategory(categoryId);
    } else if (action === "edit-product" || action === "manage-skus") {
      await loadProductEditor(productId);
      scrollToSection(action === "manage-skus" ? "sku" : "products");
    } else if (action === "toggle-product-status") {
      await toggleProductStatus(productId, nextStatus);
    } else if (action === "remove-sku-row") {
      removeSkuRow(skuIndex);
    } else if (action === "toggle-order-detail") {
      await toggleOrderDetail(orderId);
    } else if (action === "ship") {
      await shipOrder(orderId);
    } else if (action === "cancel-order") {
      await cancelOrder(orderId);
    } else if (action === "approve-aftersale") {
      await reviewAfterSale(afterSaleId, "approve");
    } else if (action === "reject-aftersale") {
      await reviewAfterSale(afterSaleId, "reject");
    } else if (action === "fill-rule-form") {
      const record = state.distributionRuleVersions.find((item) => item.versionId === ruleVersionId);
      if (record) {
        populateRuleVersionForm(record);
        scrollToSection("distribution-rules");
      }
    } else if (action === "publish-rule-version") {
      await publishRuleVersion(ruleVersionId);
    } else if (action === "toggle-distributor-detail") {
      await toggleDistributorDetail(distributorId);
    } else if (action === "update-distributor-status") {
      await updateDistributorStatus(distributorId, nextStatus);
      scrollToSection("distributors");
    } else if (action === "toggle-withdrawal-detail") {
      await toggleWithdrawalDetail(withdrawalId);
    } else if (action === "approve-withdrawal") {
      await reviewWithdrawal(withdrawalId, "approve");
    } else if (action === "reject-withdrawal") {
      await reviewWithdrawal(withdrawalId, "reject");
    } else if (action === "payout-withdrawal") {
      await payoutWithdrawal(withdrawalId, "paid");
    } else if (action === "payout-withdrawal-failed") {
      await payoutWithdrawal(withdrawalId, "failed");
    } else if (action === "edit-banner") {
      const record = state.banners.find((item) => (item.bannerId || item.id) === bannerId);
      if (record) {
        populateBannerForm(record);
        scrollToSection("decoration");
      }
    } else if (action === "delete-banner") {
      await deleteBanner(bannerId);
    } else if (action === "edit-coupon") {
      const record = state.couponTemplates.find((item) => String(item.templateId || item.id) === couponId);
      if (record) {
        populateCouponForm(record);
      }
    } else if (action === "toggle-coupon-status") {
      await toggleCouponStatus(couponId, nextStatus);
    } else if (action === "toggle-user-detail") {
      await toggleUserDetail(userId);
    } else if (action === "update-user-status") {
      await updateUserStatus(userId, nextStatus);
    } else if (action === "toggle-review-status") {
      await toggleReviewStatus(reviewId, nextStatus);
    } else if (action === "reply-review") {
      await replyReview(reviewId);
    } else if (action === "mark-notification-read") {
      await markNotificationRead(notificationId);
    } else if (action === "edit-admin-user") {
      var adminRecord = state.adminUsers.find(function (item) {
        return String(item.adminUserId || item.id) === adminUserId;
      });
      if (adminRecord) {
        populateAdminUserForm(adminRecord);
      }
    } else if (action === "toggle-section-visibility") {
      const currentVisible = target.dataset.visible === "true";
      await updateSectionVisibility(sectionVisibilityKey, !currentVisible);
    } else if (action === "update-section-sort") {
      const newSortOrder = toNumber(target.value, 0);
      await request("/admin/v1/page-sections/" + encodeURIComponent(sectionVisibilityKey), {
        method: "PUT",
        body: { sortOrder: newSortOrder }
      });
      await loadPageSections();
    }

    setStatus(nodes.sessionStatus, "操作已完成。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "操作失败", "error");
  } finally {
    target.disabled = false;
  }
});

renderSession();
renderSummary();
renderCategorySelects();
renderCategories();
renderProducts();
renderSkuEditor();
renderOrders();
renderAfterSales();
resetRuleVersionForm();
renderDistributionOverview();
renderDistributionRules();
renderDistributors();
renderWithdrawals();
renderBannersList();
renderPageSectionsList();
renderCouponTemplates();
renderSalesTrend();
renderUsers();
renderReviews();
renderNotifications();
renderAdminUsers();
renderOperationLogs();
renderProductImageGallery();
updateSkuHintVisibility();
updatePhonePreview();
validateSession();
