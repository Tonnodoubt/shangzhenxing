const mallService = require("../../services/mall-client");

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function buildLevelPlan(distributor = {}) {
  const currentLevel = distributor.level || "普通分销员";
  const teamCount = Number(distributor.teamCount || 0);
  const pendingCommission = Number(distributor.pendingCommission || 0);
  const todayInviteCount = Number(distributor.todayInviteCount || 0);
  const isAdvanced = currentLevel.indexOf("高级") > -1 || currentLevel.indexOf("合伙人") > -1;
  const nextLevel = isAdvanced ? "合伙人" : "高级分销员";
  const teamTarget = isAdvanced ? 20 : 8;
  const commissionTarget = isAdvanced ? 200 : 80;
  const teamProgress = Math.min(teamCount / teamTarget, 1);
  const commissionProgress = Math.min(pendingCommission / commissionTarget, 1);
  const progressPercent = Math.min(100, Math.round(((teamProgress + commissionProgress) / 2) * 100));
  const gapTeam = Math.max(teamTarget - teamCount, 0);
  const gapCommission = Math.max(commissionTarget - pendingCommission, 0);
  let progressCopy = "";

  if (!gapTeam && !gapCommission) {
    progressCopy = `升级目标已经达成，继续分享商品并维护团队活跃度就可以了。`;
  } else if (gapTeam && gapCommission) {
    progressCopy = `距离 ${nextLevel} 还差 ${gapTeam} 位新成员，待结算佣金再增加 ¥${formatMoney(gapCommission)}。`;
  } else if (gapTeam) {
    progressCopy = `距离 ${nextLevel} 还差 ${gapTeam} 位新成员。`;
  } else {
    progressCopy = `距离 ${nextLevel} 还差 ¥${formatMoney(gapCommission)} 待结算佣金。`;
  }

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    progressTitle: `升级到 ${nextLevel}`,
    progressCopy,
    todayTip: todayInviteCount
      ? `今天已新增 ${todayInviteCount} 位成员，继续分享海报更容易放大转化。`
      : "今天还没有新增成员，可以先分享海报把第一波流量拉进来。"
  };
}

function buildMetrics(distributor = {}) {
  const todayInviteCount = Number(distributor.todayInviteCount || 0);

  return [
    {
      id: "total",
      value: `¥${formatMoney(distributor.totalCommission || 0)}`,
      label: "累计佣金",
      hint: "历史累计"
    },
    {
      id: "pending",
      value: `¥${formatMoney(distributor.pendingCommission || 0)}`,
      label: "待结算佣金",
      hint: "待发放"
    },
    {
      id: "settled",
      value: `¥${formatMoney(distributor.settledCommission || 0)}`,
      label: "已结算佣金",
      hint: "已到账"
    },
    {
      id: "team",
      value: String(distributor.teamCount || 0),
      label: "团队人数",
      hint: todayInviteCount ? `今日 +${todayInviteCount}` : "继续邀请"
    }
  ];
}

function buildActionCards(distributor = {}) {
  const teamCount = Number(distributor.teamCount || 0);
  const pendingCommission = Number(distributor.pendingCommission || 0);

  return [
    {
      id: "poster",
      title: "分享海报",
      subtitle: "把新人券和主推商品一起分享给好友，首单转化更直接。",
      value: "去生成",
      action: "poster"
    },
    {
      id: "team",
      title: "我的团队",
      subtitle: teamCount ? `当前已沉淀 ${teamCount} 位成员，适合继续跟进下单转化。` : "先从第一位成员开始积累团队关系。",
      value: teamCount ? `${teamCount} 人` : "去查看",
      action: "team"
    },
    {
      id: "commissions",
      title: "佣金账单",
      subtitle: pendingCommission ? `当前还有 ¥${formatMoney(pendingCommission)} 待结算佣金。` : "完成第一笔推广成交后，就能在这里看到账单。",
      value: "去查看",
      action: "commissions"
    }
  ];
}

function buildGuideSteps(levelPlan = {}) {
  return [
    {
      id: "step-1",
      title: "先分享海报或商品卡",
      copy: "优先分享带优惠券的主推商品，新用户更容易下第一单。"
    },
    {
      id: "step-2",
      title: "跟进新邀请和团队成员",
      copy: levelPlan.todayTip || "新邀请用户会展示在团队列表，便于持续跟进成交。"
    },
    {
      id: "step-3",
      title: "回看佣金账单和结算进度",
      copy: "把成交商品、邀请关系和佣金状态串起来，分销节奏会更清楚。"
    }
  ];
}

function buildDistributionViewModel(payload = {}) {
  const user = payload.user || {};
  const distributor = payload.distributor || {};
  const hasData = Object.keys(user).length > 0 || Object.keys(distributor).length > 0;
  const levelPlan = buildLevelPlan(distributor);

  return {
    user,
    distributor,
    levelPlan,
    metrics: buildMetrics(distributor),
    actionCards: buildActionCards(distributor),
    guideSteps: buildGuideSteps(levelPlan),
    pageState: hasData ? "success" : "empty",
    errorMessage: ""
  };
}

Page({
  data: {
    user: {},
    distributor: {},
    levelPlan: {},
    metrics: [],
    actionCards: [],
    guideSteps: [],
    pageState: "loading",
    errorMessage: ""
  },
  async onShow() {
    try {
      this.setData({
        pageState: "loading",
        errorMessage: ""
      });

      this.setData(buildDistributionViewModel(await mallService.getDistributionData()));
    } catch (error) {
      this.setData({
        pageState: "error",
        errorMessage: error.message || "分销中心加载失败"
      });
    }
  },
  openTeam() {
    wx.navigateTo({
      url: "/pages/team/index"
    });
  },
  openCommissions() {
    wx.navigateTo({
      url: "/pages/commissions/index"
    });
  },
  showPoster() {
    wx.navigateTo({
      url: "/pages/poster/index"
    });
  },
  handleActionTap(event) {
    const { action } = event.currentTarget.dataset;

    if (action === "poster") {
      this.showPoster();
      return;
    }

    if (action === "team") {
      this.openTeam();
      return;
    }

    this.openCommissions();
  },
  retryLoad() {
    this.onShow();
  },
  backProfile() {
    wx.switchTab({
      url: "/pages/profile/index"
    });
  }
});
