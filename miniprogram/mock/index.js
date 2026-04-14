const mockMallService = require("../shared/mall-core");
const mockFixtures = require("../shared/mock-data");

function getMockMallService() {
  return mockMallService;
}

function getMockFixtures() {
  return mockFixtures;
}

module.exports = {
  getMockMallService,
  getMockFixtures
};
