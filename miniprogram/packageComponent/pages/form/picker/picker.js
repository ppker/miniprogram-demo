Page({
  onShareAppMessage() {
    return {
      title: 'picker',
      path: 'packageComponent/pages/form/picker/picker'
    }
  },

  data: {
    theme: 'light',
    array: ['中国', '美国', '巴西', '日本'],
    index: 0,
    date: '2016-09-01',
    time: '12:01'
  },

  bindPickerChange(e) {
    console.log('picker发送选择改变，携带值为', e.detail.value)
    this.setData({
      index: e.detail.value
    })
  },

  bindDateChange(e) {
    this.setData({
      date: e.detail.value
    })
  },

  bindTimeChange(e) {
    this.setData({
      time: e.detail.value
    })
  },
  onUnload() {
    if (wx.offThemeChange) {
      wx.offThemeChange()
    }
  },
  onLoad() {
    this.setData({
      theme: getApp().globalData.theme || 'light'
    })

    if (wx.onThemeChange) {
      wx.onThemeChange(({ theme }) => {
        this.setData({ theme })
      })
    }
  }
})
