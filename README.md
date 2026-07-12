# B2048-更好的2048
![headImg](https://raw.githubusercontent.com/CheongSzesuen/B2048_AstroBox_Release/refs/heads/main/head/head.png)
更好的2048，环10移植版本

[环10适配米坛链接](https://www.bandbbs.cn/resources/3833/)，自定义工具分享链接。
```
【表盘分享：更好的2048 @WaiJade】https://api.bandbbs.cn/wftools/bandbbs.html?code=A&state=1836739 点击链接，再选择浏览器咑閞；或椱ァ製这段描述₳MTgzNjczOQ==₳后到👉◇表盘自定义工具👈
```

# 珠玉在前
感谢[lst开源的2048代码](https://github.com/leset0ng/B2048)，才有适配10的希望，而不是从头开始重做。

## 内容
1. 游戏核心
  - 经典2048游戏逻辑实现
  - 分数计算与最高分记录
  - 撤销功能(一步回退)
2. UI特性
  - 亮色/暗色主题切换
  - 支持实验性动画
3. 数据持久化
  - 游戏状态自动保存
  - 最高分记录保存

## 二次开发建议

### 设计部分

lst没有开源设计，只有背景图。所以在适配的时候我用即时设计重绘了背景，按钮部分不打算重绘，因为按钮可以直接复用现有图片，如果你一定需要重绘，可以参考无源流沙的手环公开设计。

我将我使用即时设计重绘和设计的页面公开了。[设计公开链接](https://js.design/f/6896a1be8675811d8c8c6fb1?p=r9Y24jEK59&mode=design)包含有：
- 圆形图标和圆角矩形图标
- 头图
- 游戏背景
- 关于页面

你可以自由修改除了**头图**以外的部分，对于头图我有限制，**禁止将修改后类似的头图上传AstroBox**，astrobox目前头图同质化严重，原因是有很多人使用了我的头图模板，这种一味地套图行为需要遏制。只有好的设计才能打动人心。如果你不会设计，欢迎联系下方推荐的米坛其他善于设计的开发者寻求帮助（付费）。
- [zaona](https://www.bandbbs.cn/members/157218/)
- [hrsthrt74](https://www.bandbbs.cn/members/296762/)

### 代码部分

#### 颜色

你可以快速的修改颜色列表来修改不同等级方块的颜色。


#### folme的实验性动画

<a href="docs/folme.md">folme接口文档和类型文件</a>，内部有详细说明和B2048+是如何使用folme的。

## ToDo

- [ ] 重置二次确认，可以开关。
- [ ] 自定义字体大小
- [ ] 使用两个模式计分，自己选择
- [x] 改用file保存

## 许可证
AGPL-3.0
