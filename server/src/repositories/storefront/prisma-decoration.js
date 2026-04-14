const DEFAULT_BANNERS = [
  {
    title: "新人福利专区",
    subtitle: "首单立享优惠",
    imageUrl: null,
    linkType: "none",
    linkValue: null,
    sortOrder: 0,
    status: "enabled"
  },
  {
    title: "分享爆款赚佣金",
    subtitle: "推荐有礼",
    imageUrl: null,
    linkType: "none",
    linkValue: null,
    sortOrder: 1,
    status: "enabled"
  }
];

const DEFAULT_PAGE_SECTIONS = [
  { sectionKey: "hero", sortOrder: 0, visible: true },
  { sectionKey: "categories", sortOrder: 1, visible: true },
  { sectionKey: "benefit", sortOrder: 2, visible: true },
  { sectionKey: "feature", sortOrder: 3, visible: true },
  { sectionKey: "products", sortOrder: 4, visible: true }
];

const DEFAULT_THEME = {
  primary_color: "#6ea893"
};

function mapBanner(record) {
  return {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle || "",
    imageUrl: record.imageUrl || "",
    linkType: record.linkType || "none",
    linkValue: record.linkValue || "",
    sortOrder: record.sortOrder || 0,
    status: record.status || "enabled"
  };
}

function mapPageSection(record) {
  let config = {};

  if (record.config) {
    try {
      config = JSON.parse(record.config);
    } catch (_) {
      config = {};
    }
  }

  return {
    sectionKey: record.sectionKey,
    sortOrder: record.sortOrder || 0,
    visible: record.visible !== false,
    config
  };
}

function createStorefrontPrismaDecorationModule({ getPrisma }) {
  async function getBanners() {
    const prisma = await getPrisma();
    const records = await prisma.banner.findMany({
      where: { status: "enabled" },
      orderBy: { sortOrder: "asc" }
    });

    if (records.length === 0) {
      return DEFAULT_BANNERS.map((b, index) => ({
        ...b,
        id: `default-${index}`
      }));
    }

    return records.map(mapBanner);
  }

  async function getAdminBanners() {
    const prisma = await getPrisma();
    const records = await prisma.banner.findMany({
      orderBy: { sortOrder: "asc" }
    });

    return records.map(mapBanner);
  }

  async function saveBanner(payload) {
    const prisma = await getPrisma();
    const data = {
      title: String(payload.title || "").trim(),
      subtitle: String(payload.subtitle || "").trim() || null,
      imageUrl: String(payload.imageUrl || "").trim() || null,
      linkType: String(payload.linkType || "none"),
      linkValue: String(payload.linkValue || "").trim() || null,
      sortOrder: Number(payload.sortOrder || 0),
      status: String(payload.status || "enabled")
    };

    if (!data.title) {
      return null;
    }

    if (payload.bannerId || payload.id) {
      const bannerId = payload.bannerId || payload.id;
      const existing = await prisma.banner.findUnique({ where: { id: bannerId } });

      if (!existing) {
        return null;
      }

      return mapBanner(await prisma.banner.update({
        where: { id: bannerId },
        data
      }));
    }

    return mapBanner(await prisma.banner.create({ data }));
  }

  async function deleteBanner(bannerId) {
    const prisma = await getPrisma();
    const record = await prisma.banner.delete({ where: { id: bannerId } }).catch(() => null);

    return record ? { success: true } : null;
  }

  async function reorderBanners(items) {
    const prisma = await getPrisma();

    await prisma.$transaction(
      items.map((item) => prisma.banner.update({
        where: { id: item.id },
        data: { sortOrder: Number(item.sortOrder || 0) }
      }))
    );

    return { success: true };
  }

  async function getPageSections() {
    const prisma = await getPrisma();
    const records = await prisma.pageSection.findMany({
      orderBy: { sortOrder: "asc" }
    });

    if (records.length === 0) {
      return DEFAULT_PAGE_SECTIONS;
    }

    return records.map(mapPageSection);
  }

  async function updatePageSection(sectionKey, payload) {
    const prisma = await getPrisma();
    const data = {};

    if (payload.visible !== undefined) {
      data.visible = Boolean(payload.visible);
    }

    if (payload.sortOrder !== undefined) {
      data.sortOrder = Number(payload.sortOrder);
    }

    if (payload.config !== undefined) {
      data.config = typeof payload.config === "string"
        ? payload.config
        : JSON.stringify(payload.config);
    }

    const record = await prisma.pageSection.update({
      where: { sectionKey },
      data
    }).catch(() => null);

    return record ? mapPageSection(record) : null;
  }

  async function reorderPageSections(items) {
    const prisma = await getPrisma();

    await prisma.$transaction(
      items.map((item) => prisma.pageSection.update({
        where: { sectionKey: item.sectionKey },
        data: { sortOrder: Number(item.sortOrder || 0) }
      }))
    );

    return { success: true };
  }

  async function getStoreTheme() {
    const prisma = await getPrisma();
    const records = await prisma.storeTheme.findMany();
    const theme = {};

    for (const record of records) {
      theme[record.themeKey] = record.themeValue;
    }

    return { ...DEFAULT_THEME, ...theme };
  }

  async function updateStoreTheme(themeKey, themeValue) {
    const prisma = await getPrisma();
    const value = String(themeValue || "").trim();

    if (!value) {
      return null;
    }

    const record = await prisma.storeTheme.upsert({
      where: { themeKey },
      update: { themeValue: value },
      create: { themeKey, themeValue: value }
    });

    return { themeKey: record.themeKey, themeValue: record.themeValue };
  }

  return {
    methods: {
      getBanners,
      getAdminBanners,
      saveBanner,
      deleteBanner,
      reorderBanners,
      getPageSections,
      updatePageSection,
      reorderPageSections,
      getStoreTheme,
      updateStoreTheme
    }
  };
}

module.exports = {
  createStorefrontPrismaDecorationModule
};
