const example = require('./example.js')

Page({
  onShareAppMessage() {
    return {
      title: '创建画布',
      path: 'packageAPI/pages/page/canvas/canvas'
    }
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
    this.context = wx.createContext()

    const methods = Object.keys(example)
    this.setData({
      methods
    })

    const that = this
    methods.forEach(function (method) {
      that[method] = function () {
        example[method](that.context)
        const actions = that.context.getActions()

        wx.drawCanvas({
          canvasId: 'canvas',
          actions
        })
      }
    })
  },

  toTempFilePath() {
    wx.canvasToTempFilePath({
      canvasId: 'canvas',
      success(res) {
        console.log(res)
      },

      fail(res) {
        console.log(res)
      }
    })
  }
})
