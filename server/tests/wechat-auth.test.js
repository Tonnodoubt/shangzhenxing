const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getWechatPhoneNumber,
  setGetWechatPhoneNumberOverrideForTest,
  resetGetWechatPhoneNumberOverrideForTest,
  resetWechatAccessTokenCacheForTest
} = require("../src/lib/wechat-auth");

test.afterEach(() => {
  resetGetWechatPhoneNumberOverrideForTest();
  resetWechatAccessTokenCacheForTest();
});

test("wechat phone helper validates phone auth code", async () => {
  await assert.rejects(
    () => getWechatPhoneNumber(""),
    (error) => {
      assert.equal(error.code, "WECHAT_PHONE_CODE_REQUIRED");
      assert.match(error.message, /手机号授权 code/);
      return true;
    }
  );
});

test("wechat phone helper can be overridden in tests", async () => {
  let receivedCode = "";

  setGetWechatPhoneNumberOverrideForTest(async (code) => {
    receivedCode = code;

    return {
      phoneNumber: "13800001111",
      purePhoneNumber: "13800001111",
      countryCode: "86"
    };
  });

  const result = await getWechatPhoneNumber("phone-code-001");

  assert.equal(receivedCode, "phone-code-001");
  assert.deepEqual(result, {
    phoneNumber: "13800001111",
    purePhoneNumber: "13800001111",
    countryCode: "86"
  });
});
