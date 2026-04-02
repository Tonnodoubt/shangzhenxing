const state = {
  adminToken: window.localStorage.getItem("mall_admin_token") || "",
  session: null,
  repositoryMode: "-",
  activeSection: "summary",
  summary: null,
  categories: [],
  products: [],
  productDetail: null,
  skuDrafts: [],
  orders: [],
  afterSales: [],
  orderDetails: new Map()
};

const summaryLabels = [
  { key: "pendingShipmentCount", label: "待发货", suffix: "单" },
  { key: "pendingAftersaleCount", label: "待审核售后", suffix: "笔" },
  { key: "shippingOrderCount", label: "待收货", suffix: "单" },
  { key: "todayPaidAmountText", label: "今日成交", suffix: "元" }
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
  productShortDesc: document.getElementById("product-short-desc"),
  productSubTitle: document.getElementById("product-sub-title"),
  productDetailContent: document.getElementById("product-detail-content"),
  productSave: document.getElementById("product-save"),
  productReset: document.getElementById("product-reset"),
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
  aftersalesList: document.getElementById("aftersales-list")
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

  return {
    todoCount,
    categoryCount: state.categories.length,
    productCount: state.products.length,
    onSaleCount,
    lowStockCount,
    skuCount: state.skuDrafts.length,
    orderCount: state.orders.length,
    aftersaleCount: state.afterSales.length
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
    { label: "分类数", value: String(stats.categoryCount) },
    { label: "在售商品", value: String(stats.onSaleCount) },
    { label: "低库存", value: String(stats.lowStockCount) }
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
  const target = getVisibleSections().find((item) => item.key === sectionKey);

  if (!target || !target.node) {
    return;
  }

  state.activeSection = sectionKey;
  renderWorkspaceChrome();
  target.node.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function request(url, options = {}) {
  const headers = Object.assign(
    {
      "Content-Type": "application/json"
    },
    options.headers || {}
  );

  if (options.auth !== false && state.adminToken) {
    headers.Authorization = "Bearer " + state.adminToken;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: typeof options.body === "undefined" ? undefined : JSON.stringify(options.body)
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.code) {
    const error = new Error(payload.message || "请求失败");
    error.statusCode = response.status;
    throw error;
  }

  return payload.data;
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
  nodes.productShortDesc.value = "";
  nodes.productSubTitle.value = "";
  nodes.productDetailContent.value = "";
  renderCategorySelects();
  nodes.productCategoryId.value = getFirstCategoryId();
  resetProductSelection();
  renderProducts();
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
  nodes.productShortDesc.value = detail.shortDesc || "";
  nodes.productSubTitle.value = detail.subTitle || "";
  nodes.productDetailContent.value = detail.detailContent || "";
  renderCategorySelects();
  nodes.productCategoryId.value = detail.categoryId || getFirstCategoryId();
  renderProducts();
}

function renderSession() {
  const loggedIn = !!(state.session && state.adminToken);

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

  nodes.categorySave.disabled = !loggedIn || !canEditCategories();
  nodes.categoryReset.disabled = !loggedIn || !canEditCategories();
  nodes.productSave.disabled = !loggedIn || !canEditProducts();
  nodes.productReset.disabled = !loggedIn || !canEditProducts();
  nodes.skuAddRow.disabled = !loggedIn || !canEditSkus();
  nodes.skuSave.disabled = !loggedIn || !canEditSkus();
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

async function login(username, password) {
  const payload = await request("/admin/v1/auth/login", {
    method: "POST",
    auth: false,
    body: {
      username,
      password
    }
  });

  state.adminToken = payload.adminToken;
  state.session = payload;
  window.localStorage.setItem("mall_admin_token", state.adminToken);
  await ensureRepositoryMode();
  renderSession();
  await refreshAll();
}

async function validateSession() {
  if (!state.adminToken) {
    return;
  }

  try {
    state.session = await request("/admin/v1/auth/me");
    await ensureRepositoryMode();
    renderSession();
    await refreshAll();
  } catch (error) {
    clearSession();
  }
}

function clearSession() {
  state.adminToken = "";
  state.session = null;
  state.activeSection = "summary";
  state.summary = null;
  state.categories = [];
  state.products = [];
  state.productDetail = null;
  state.skuDrafts = [];
  state.orders = [];
  state.afterSales = [];
  state.orderDetails = new Map();
  window.localStorage.removeItem("mall_admin_token");
  renderSession();
  renderSummary();
  renderCategorySelects();
  renderCategories();
  renderProducts();
  renderSkuEditor();
  renderOrders();
  renderAfterSales();
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

async function refreshAll() {
  setStatus(nodes.sessionStatus, "正在刷新控制台数据...");

  try {
    if (hasPermission("dashboard.view")) {
      await refreshSummary();
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

  const productId = nodes.productId.value.trim();
  const payload = {
    title: nodes.productTitle.value.trim(),
    categoryId: nodes.productCategoryId.value,
    status: nodes.productStatus.value,
    distributionEnabled: toBoolean(nodes.productDistributionEnabled.value),
    price: toNumber(nodes.productPrice.value, 0),
    marketPrice: toNumber(nodes.productMarketPrice.value, toNumber(nodes.productPrice.value, 0)),
    sortOrder: toNumber(nodes.productSortOrder.value, 0),
    coverImage: nodes.productCoverImage.value.trim(),
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

document.getElementById("refresh-all").addEventListener("click", refreshAll);
document.getElementById("orders-filter-submit").addEventListener("click", refreshOrders);
document.getElementById("orders-filter-reset").addEventListener("click", resetOrderFilters);
document.getElementById("aftersales-filter-submit").addEventListener("click", refreshAfterSales);
document.getElementById("aftersales-filter-reset").addEventListener("click", resetAfterSaleFilters);
nodes.productsFilterSubmit.addEventListener("click", refreshProducts);
document.getElementById("products-filter-reset").addEventListener("click", resetProductFilters);
nodes.categoryReset.addEventListener("click", resetCategoryForm);
nodes.productReset.addEventListener("click", resetProductForm);
nodes.skuAddRow.addEventListener("click", addSkuRow);
nodes.skuSave.addEventListener("click", async () => {
  try {
    await saveSkus();
    setStatus(nodes.sessionStatus, "SKU 已保存。", "success");
  } catch (error) {
    setStatus(nodes.sessionStatus, error.message || "SKU 保存失败", "error");
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
  const nextStatus = target.dataset.nextStatus;
  const skuIndex = Number(target.dataset.skuIndex || -1);

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
validateSession();
