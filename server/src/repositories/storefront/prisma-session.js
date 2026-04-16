const {
  resolveStorefrontSessionLoginType
} = require("./session-login");

function createStorefrontPrismaSessionModule({
  buildSessionToken,
  createStorefrontError,
  createUnauthorizedError,
  demoOpenId,
  exchangeMiniProgramCode,
  getPrisma,
  mapSession,
  mapUser,
  sessionDurationMs
}) {
  function normalizeSourceScene(value, fallback = "share") {
    const normalized = String(value || "").trim();

    return normalized || fallback;
  }

  async function ensureDemoUser(prisma) {
    return prisma.user.upsert({
      where: {
        openId: demoOpenId
      },
      update: {},
      create: {
        openId: demoOpenId,
        nickname: "微信用户",
        mobile: "未授权手机号",
        isAuthorized: false
      }
    });
  }

  async function getActiveSession(prisma, sessionToken) {
    const normalizedToken = String(sessionToken || "").trim();

    if (!normalizedToken) {
      return null;
    }

    const session = await prisma.userSession.findUnique({
      where: {
        sessionToken: normalizedToken
      },
      include: {
        user: true
      }
    });

    if (!session || session.status !== "active") {
      return null;
    }

    if (!(session.expiresAt instanceof Date) || session.expiresAt.getTime() <= Date.now()) {
      await prisma.userSession.update({
        where: {
          id: session.id
        },
        data: {
          status: "expired"
        }
      }).catch(() => null);

      return null;
    }

    return session;
  }

  async function requireCurrentAuth(prisma, sessionToken) {
    const session = await getActiveSession(prisma, sessionToken);

    if (!session) {
      throw createUnauthorizedError();
    }

    if (!session.user || session.user.status !== "active") {
      throw createUnauthorizedError("当前账号不可用，请重新登录");
    }

    return {
      session,
      user: session.user
    };
  }

  async function getCurrentUserContext(sessionToken) {
    const prisma = await getPrisma();
    const auth = await requireCurrentAuth(prisma, sessionToken);

    return {
      prisma,
      user: auth.user,
      session: auth.session
    };
  }

  async function createSessionForUser(prisma, user) {
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: buildSessionToken(),
        expiresAt: new Date(Date.now() + sessionDurationMs),
        status: "active"
      }
    });

    return {
      sessionToken: session.sessionToken,
      expiresAt: mapSession(session).expiresAt,
      status: session.status,
      user: mapUser(user)
    };
  }

  async function ensureWechatUser(prisma, authPayload = {}) {
    const openId = String(authPayload.openId || "").trim();
    const unionId = String(authPayload.unionId || "").trim();

    if (!openId) {
      throw createStorefrontError("微信登录返回异常，缺少 openid", 502, "WECHAT_LOGIN_OPENID_MISSING");
    }

    const existingByOpenId = await prisma.user.findUnique({
      where: {
        openId
      }
    });

    if (existingByOpenId) {
      if (unionId && existingByOpenId.unionId !== unionId) {
        return prisma.user.update({
          where: {
            id: existingByOpenId.id
          },
          data: {
            unionId
          }
        });
      }

      return existingByOpenId;
    }

    if (unionId) {
      const existingByUnionId = await prisma.user.findUnique({
        where: {
          unionId
        }
      });

      if (existingByUnionId) {
        return prisma.user.update({
          where: {
            id: existingByUnionId.id
          },
          data: {
            openId
          }
        });
      }
    }

    return prisma.user.create({
      data: {
        openId,
        unionId: unionId || null,
        nickname: "微信用户",
        mobile: null,
        isAuthorized: false,
        status: "active"
      }
    });
  }

  async function getReferralBindingByInvitee(prisma, inviteeUserId) {
    if (!inviteeUserId) {
      return null;
    }

    return prisma.referralBinding.findUnique({
      where: {
        inviteeUserId
      },
      include: {
        inviter: true,
        invitee: true
      }
    });
  }

  async function bindInviterForUserIfNeeded(prisma, user, payload = {}) {
    if (!user || !user.id) {
      return null;
    }

    const inviterUserId = String(payload.inviterUserId || "").trim();

    if (!inviterUserId || inviterUserId === user.id) {
      return getReferralBindingByInvitee(prisma, user.id);
    }

    const existingBinding = await getReferralBindingByInvitee(prisma, user.id);

    if (existingBinding) {
      return existingBinding;
    }

    const existingOrderCount = await prisma.order.count({
      where: {
        userId: user.id
      }
    });

    if (existingOrderCount > 0) {
      return null;
    }

    const inviter = await prisma.user.findFirst({
      where: {
        id: inviterUserId,
        status: "active"
      }
    });

    if (!inviter) {
      return null;
    }

    return prisma.referralBinding.create({
      data: {
        inviterUserId: inviter.id,
        inviteeUserId: user.id,
        sourceScene: normalizeSourceScene(payload.sourceScene)
      },
      include: {
        inviter: true,
        invitee: true
      }
    });
  }

  async function createDemoSession(prisma, payload = {}) {
    const user = await ensureDemoUser(prisma);

    await bindInviterForUserIfNeeded(prisma, user, payload);

    return createSessionForUser(prisma, user);
  }

  return {
    helpers: {
      bindInviterForUserIfNeeded,
      getCurrentUserContext,
      getReferralBindingByInvitee,
      mapSession,
      mapUser,
      normalizeSourceScene,
      requireCurrentAuth
    },
    methods: {
      async createSession(payload = {}) {
        const prisma = await getPrisma();
        const loginType = resolveStorefrontSessionLoginType(payload, createStorefrontError);

        if (loginType === "mock_wechat") {
          return createDemoSession(prisma, payload);
        }

        let user = null;

        if (loginType === "wechat_miniprogram") {
          const authPayload = await exchangeMiniProgramCode(payload.code);

          user = await ensureWechatUser(prisma, authPayload);
        }

        await bindInviterForUserIfNeeded(prisma, user, payload);

        return createSessionForUser(prisma, user);
      },
      async getMe(sessionToken) {
        const { user, session } = await getCurrentUserContext(sessionToken);

        return {
          user: mapUser(user),
          session: mapSession(session)
        };
      },
      async logout(sessionToken) {
        const { prisma, session } = await getCurrentUserContext(sessionToken);

        await prisma.userSession.update({
          where: {
            id: session.id
          },
          data: {
            status: "revoked"
          }
        });

        return {
          ok: true
        };
      }
    }
  };
}

module.exports = {
  createStorefrontPrismaSessionModule
};
