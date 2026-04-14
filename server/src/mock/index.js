const mockStorefrontSource = require("../shared/mall");
const mockFixtures = require("../shared/mock");

function createMockStorefrontSource() {
  return mockStorefrontSource;
}

function getMockCatalogFixtures() {
  return {
    categories: mockFixtures.categories || [],
    products: mockFixtures.products || []
  };
}

function getMockQuickEntries() {
  return mockFixtures.quickEntries || [];
}

module.exports = {
  createMockStorefrontSource,
  getMockCatalogFixtures,
  getMockQuickEntries
};
