Page({
  data: {
    url: '',
    loadError: false,
  },

  onLoad(options: Record<string, string>) {
    const url = options.url ? decodeURIComponent(options.url) : '';
    if (!url) {
      wx.showToast({ title: '链接无效', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 800);
      return;
    }
    this.setData({ url });
    if (options.title) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(options.title) });
    }
  },

  onError(e: WechatMiniprogram.WebviewError) {
    console.error('web-view 加载失败:', e.detail);
    this.setData({ loadError: true });
  },

  onCopyLink() {
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },
});
