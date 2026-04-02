const test = require("node:test");
const assert = require("node:assert/strict");

const { createStorefrontPrismaSessionModule } = require("../src/repositories/storefront/prisma-session");

function createSessionModule(overrides = {}) {
  return createStorefrontPrismaSessionModule({
    buildSessionToken: () => "session-token-1",
    createStorefrontError: (message, statusCode, code) => {
      const error = new Error(message);
      error.statusCode = statusCode;
      error.code = code;
      return error;
    },
    createUnauthorizedError: (message = "unauthorized") => {
      const error = new Error(message);
      error.statusCode = 401;
      return error;
    },
    demoOpenId: "demo-openid",
    exchangeMiniProgramCode: async (code) => ({
      openId: `openid-${code || "demo"}`
    }),
    getPrisma: async () => ({
      order: {
        count: async () => 0
      },
      referralBinding: {
        create: async () => null,
        findUnique: async () => null
      },
      user: {
        create: async ({ data }) => ({
          id: "user-1",
          ...data
        }),
        findFirst: async () => null,
        findUnique: async () => null,
        update: async ({ data }) => ({
          id: "user-1",
          ...data
        }),
        upsert: async () => ({
          id: "user-1",
          nickname: "微信用户",
          mobile: "未授权手机号",
          isAuthorized: false,
          status: "active"
        })
      },
      userSession: {
        create: async ({ data }) => ({
          id: "session-1",
          ...data
        }),
        findUnique: async () => null,
        update: async () => null
      }
    }),
    mapSession: (session = {}) => ({
      sessionToken: session.sessionToken || "",
      expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : "",
      status: session.status || ""
    }),
    mapUser: (user = {}) => ({
      id: user.id || "",
      nickname: user.nickname || "",
      phone: user.mobile || "",
      isAuthorized: !!user.isAuthorized
    }),
    sessionDurationMs: 30 * 24 * 60 * 60 * 1000,
    ...overrides
  });
}

test("session method creates mock session and records inviter binding", async () => {
  let bindingPayload = null;
  const prisma = {
    order: {
      count: async () => 0
    },
    referralBinding: {
      findUnique: async () => null,
      create: async (payload) => {
        bindingPayload = payload;
        return payload;
      }
    },
    user: {
      findFirst: async () => ({
        id: "inviter-1",
        status: "active"
      }),
      upsert: async () => ({
        id: "user-1",
        nickname: "微信用户",
        mobile: "未授权手机号",
        isAuthorized: false,
        status: "active"
      })
    },
    userSession: {
      create: async ({ data }) => ({
        id: "session-1",
        ...data
      })
    }
  };
  const sessionModule = createSessionModule({
    getPrisma: async () => prisma
  });

  const result = await sessionModule.methods.createSession({
    loginType: "mock_wechat",
    inviterUserId: "inviter-1",
    sourceScene: "poster"
  });

  assert.equal(result.sessionToken, "session-token-1");
  assert.equal(result.user.id, "user-1");
  assert.deepEqual(bindingPayload.data, {
    inviterUserId: "inviter-1",
    inviteeUserId: "user-1",
    sourceScene: "poster"
  });
});

test("session method maps active me payload from current session", async () => {
  const sessionModule = createSessionModule({
    getPrisma: async () => ({
      userSession: {
        findUnique: async () => ({
          id: "session-2",
          sessionToken: "token-2",
          expiresAt: new Date("2026-05-01T00:00:00.000Z"),
          status: "active",
          user: {
            id: "user-2",
            nickname: "阿青",
            mobile: "13800000000",
            isAuthorized: true,
            status: "active"
          }
        }),
        update: async () => null
      }
    })
  });

  const result = await sessionModule.methods.getMe("token-2");

  assert.deepEqual(result, {
    user: {
      id: "user-2",
      nickname: "阿青",
      phone: "13800000000",
      isAuthorized: true
    },
    session: {
      sessionToken: "token-2",
      expiresAt: "2026-05-01T00:00:00.000Z",
      status: "active"
    }
  });
});

test("session helper rejects expired sessions and marks them expired", async () => {
  let updatedPayload = null;
  const sessionModule = createSessionModule({
    getPrisma: async () => ({
      userSession: {
        findUnique: async () => ({
          id: "session-3",
          sessionToken: "token-3",
          expiresAt: new Date("2025-01-01T00:00:00.000Z"),
          status: "active",
          user: {
            id: "user-3",
            status: "active"
          }
        }),
        update: async (payload) => {
          updatedPayload = payload;
          return payload;
        }
      }
    })
  });

  await assert.rejects(
    () => sessionModule.methods.getMe("token-3"),
    /unauthorized/
  );
  assert.deepEqual(updatedPayload, {
    where: {
      id: "session-3"
    },
    data: {
      status: "expired"
    }
  });
});
