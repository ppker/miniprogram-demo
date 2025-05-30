import arBehavior from '../behavior/behavior-ar'
import xrFrameBehavior from '../behavior/behavior-xrframe'

// VK 投影矩阵参数定义
const NEAR = 0.01
const FAR = 1000

const loggerOnce = false

Component({
  behaviors: [arBehavior, xrFrameBehavior],
  data: {
    theme: 'light',
    widthScale: 1, // canvas宽度缩放值
    heightScale: 0.8, // canvas高度缩放值
    hintBoxList: [], // 显示提示盒子列表
  },
  markerIndex: 0, // 使用的 marker 索引
  hintInfo: undefined, // 提示框信息
  lifetimes: {
    /**
      * 生命周期函数--监听页面加载
      */
    detached() {
      console.log('页面detached')
      if (wx.offThemeChange) {
        wx.offThemeChange()
      }
    },
    ready() {
      console.log('页面准备完全')
      this.setData({
        theme: getApp().globalData.theme || 'light'
      })

      if (wx.onThemeChange) {
        wx.onThemeChange(({ theme }) => {
          this.setData({ theme })
        })
      }
    },
  },

  methods: {
    // 对应案例的初始化逻辑，由统一的 behavior 触发
    init() {
      // 初始化VK
      // start完毕后，进行更新渲染循环
      this.initVK()
    },
    initVK() {
      // VKSession 配置
      const session = this.session = wx.createVKSession({
        track: {
          hand: {
            mode: 1
          }
        },
        version: 'v1',
        gl: this.gl
      })

      try {
        session.start(err => {
          if (err) return console.error('VK error: ', err)

          console.log('@@@@@@@@ VKSession.version', session.version)

          //  VKSession EVENT resize
          session.on('resize', () => {
            this.calcCanvasSize()
          })

          // 开启三维识别
          session.update3DMode({ open3d: true })

          // VKSession EVENT addAnchors
          session.on('addAnchors', anchors => {
            console.log('addAnchor', anchors)
          })

          // VKSession EVENT updateAnchors
          session.on('updateAnchors', anchors => {
            // console.log("updateAnchors", anchors);

            const anchor = anchors[0]
            // 目前只处理一个返回的手
            if (anchor) {
              // console.log('id', anchor.id);
              // console.log('type', anchor.type);
              // console.log('transform', anchor.transform);
              // console.log('mesh', anchor.mesh);
              // console.log('origin', anchor.origin);
              // console.log('size', anchor.size);
              // console.log('detectId', anchor.detectId);
              // console.log('confidence', anchor.confidence);
              // console.log('points3d', anchor.points3d);

              this.wrapTransform = anchor.transform
              this.position3D = anchor.points3d

              this.updateHintBoxVisble(this.hintBoxList, true)
            }
          })

          // VKSession removeAnchors
          // 识别目标丢失时不断触发
          session.on('removeAnchors', anchors => {
            // console.log("removeAnchors");

            this.updateHintBoxVisble(this.hintBoxList, false)
          })

          console.log('ready to initloop')
          // start 初始化完毕后，进行更新渲染循环
          this.initLoop()
        })
      } catch (e) {
        console.error(e)
      }
    },
    // 针对 xr-frame 的初始化逻辑
    async initXRFrame() {
      const xrFrameSystem = wx.getXrFrameSystem()
      const scene = this.xrScene
      const { rootShadow } = scene

      // 缓存主相机
      this.xrCameraMain = this.xrCamera
      this.xrCameraMainTrs = this.xrCameraTrs

      // 初始化YUV相机配置
      this.initXRYUVCamera()

      // === 初始s手挂载点 ===
      this.handWrap = scene.createElement(xrFrameSystem.XRNode)
      this.handWrapTrs = this.handWrap.getComponent(xrFrameSystem.Transform)
      rootShadow.addChild(this.handWrap)

      // 加载提示点
      this.hintBoxList = this.getHintBox(xrFrameSystem, scene, this.handWrap)
    },
    loop() {
      // console.log('loop')

      // 获取 VKFrame
      const frame = this.session.getVKFrame(this.data.width, this.data.height)

      // 成功获取 VKFrame 才进行
      if (!frame) { return }

      // 更新相机 YUV 数据
      this.updataXRYUV(frame)

      // 获取 VKCamera
      const VKCamera = frame.camera

      // 更新 xrFrame 相机矩阵
      this.updataXRCameraMatrix(VKCamera, NEAR, FAR)

      // 存在handWrap，执行信息同步逻辑
      if (this.handWrap && this.wrapTransform) {
        const xrFrameSystem = wx.getXrFrameSystem()

        if (!this.DT) { this.DT = new xrFrameSystem.Matrix4() }
        if (!this.DT2) { this.DT2 = new xrFrameSystem.Matrix4() }

        // 目前VK返回的是行主序矩阵
        // xrframe 矩阵存储为列主序
        this.DT.setArray(this.wrapTransform)
        this.DT.transpose(this.DT2)
        this.handWrapTrs.setLocalMatrix(this.DT2)

        // 更新提示点位置
        this.updateHintBoxPosition(this.hintBoxList, this.position3D)
      }
    },
    getHintBox(xrFrameSystem, scene, wrap) {
      // 初始化提示点
      const geometryHint = scene.assets.getAsset('geometry', 'sphere')
      const effectCube = scene.assets.getAsset('effect', 'standard')
      const boxScale = 0.006
      const hintBoxList = []
      for (let i = 0; i < 16; i++) {
        const colorFloat = i / 16
        const el = scene.createElement(xrFrameSystem.XRNode, {
          position: '0 0 0',
          scale: `${boxScale} ${boxScale} ${boxScale}`,
        })
        const elTrs = el.getComponent(xrFrameSystem.Transform)
        const mat = scene.createMaterial(effectCube)

        const colorR = 1.0 - colorFloat
        mat.setVector('u_baseColorFactor', xrFrameSystem.Vector4.createFromNumber(1.0, colorR, colorR, 1.0))

        const mesh = el.addComponent(xrFrameSystem.Mesh, {
          geometry: geometryHint,
          material: mat,
        })

        wrap.addChild(el)
        elTrs.visible = false

        hintBoxList.push(elTrs)
      }

      return hintBoxList
    },
    updateHintBoxPosition(hintBoxList, points3d) {
      if (hintBoxList && hintBoxList.length > 0) {
        // console.log('ready to set', hintBoxList);
        // 存在提示列表，则更新点信息
        for (let i = 0; i < hintBoxList.length; i++) {
          const hintBox = hintBoxList[i]
          hintBox.position.x = points3d[i].x
          hintBox.position.y = points3d[i].y
          hintBox.position.z = points3d[i].z
        }
      }
    },
    updateHintBoxVisble(hintBoxList, visible) {
      if (hintBoxList && hintBoxList.length > 0) {
        // console.log('ready to set', hintBoxList);
        // 存在提示列表，则更新点信息
        for (let i = 0; i < hintBoxList.length; i++) {
          const hintBox = hintBoxList[i]
          if (hintBox.visible !== visible) {
            hintBox.visible = visible
          }
        }
      }
    }

  },
})
