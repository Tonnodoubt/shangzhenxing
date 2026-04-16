function confirmAction(options = {}) {
  return new Promise((resolve) => {
    wx.showModal({
      title: options.title || "请确认",
      content: options.content || "",
      confirmText: options.confirmText || "确定",
      cancelText: options.cancelText || "取消",
      success(result) {
        resolve(!!result.confirm);
      },
      fail() {
        resolve(false);
      }
    });
  });
}

module.exports = {
  confirmAction
};
