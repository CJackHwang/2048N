# 2048N

2048N 是我CJackHwang基于上游项目进行深度性能优化与拓展完善版本，面向小米 Vela 快应用/RPK 环境适配。

## 应用信息

- 应用名：2048N
- 包名：me.cjack.b2048n.rpk
- 当前版本：1.0.3
- 应用说明：由CJackHwang基于上游B2048项目进行深度性能优化与拓展完善的版本

## 功能特性

1. 游戏核心
   - 经典 2048 合成逻辑
   - 当前分数与历史最高记录
   - 一步撤销
   - 自动保存游戏状态
2. 拓展完善
   - 支持更高数值方块显示
   - 支持传统分数与最高方块计分模式切换
   - 亮色/暗色主题切换
   - 实验性动画开关
3. 性能优化
   - 固定棋盘几何参数，减少移动时的布局测量
   - 移动后按需更新方块内容和样式
   - 文件保存使用真正防抖与脏标记，降低频繁写入开销
   - 默认使用 release/JSC/Protobuf 打包，面向真机运行性能

## CJackHwang 优化说明（截止目前）

本项目由我（CJackHwang）在上游版本基础上继续优化与完善，重点围绕 Vela 快应用/RPK 环境下的实际运行体验进行调整：

- 动画流畅性优化：优化方块移动、合成与状态刷新过程，降低动画卡顿和视觉跳变。
- 性能深度优化：减少不必要的布局测量、样式重算和重复渲染，让棋盘在连续滑动时保持更稳定的响应。
- 存储写入优化：通过保存防抖减少频繁落盘，降低游戏过程中不必要的 I/O 开销。

## 1.0.3 相较于 1.0.1 的优化

1. 运行与打包
   - `npm run build` 默认生成 release 包，并启用 JSC 与 Protobuf。
   - 保留 `npm run build:debug` 作为显式 debug 构建命令。
   - `manifest` 关闭运行日志，移除未使用的 `system.router` feature。
2. 状态与存储
   - 撤销标记等非 UI 状态移出页面 `private`，减少响应式代理和观察成本。
   - 保存改为 debounce + `saveDirty` 脏标记，降低连续滑动时的文件 I/O。
   - 复用保存 payload 对象，减少保存时的临时对象分配。
   - 保持旧 `game_data.json` 字段兼容。
3. 移动热路径
   - 四方向移动改为固定 4 格的“读、压缩、合并、写回”算法。
   - 删除 `added` 矩阵和 `noBlockHorizontal()` / `noBlockVertical()` 扫描路径。
   - 无效移动不再提前备份撤销棋盘。
   - 合成时增量维护分数、当前最大方块和历史最大方块。
4. 模板与资源
   - 亮/暗背景与按钮使用动态 `src`，减少重复条件节点。
   - 关于菜单继续使用 `if`，关闭时从 VDOM 移除长图和菜单节点。
   - 方块仍由 `<text>` + CSS 绘制，不使用方块图片素材。
5. 动画策略
   - 保留 1.0.1 真机体感最顺的动画节奏：`MOVE_DURATION = 110ms`、Folme `duration = 0.1`、reset 延迟 `16ms`。
   - 保留单层真实棋盘动画，不使用双层 overlay。
   - 使用 `startGroup()` 批量启动动画，但传入 Folme 的动画参数保持一次性快照。
   - 只 reset 本轮实际动过的格子，避免全 16 格 reset 带来的额外桥调用和体感下降。

## 性能优化记录

当前版本围绕小米手环 10 的低内存和低功耗环境做了以下优化：

1. 打包与运行配置
   - `npm run build` 默认执行 `aiot release --enable-jsc --enable-protobuf`，真机调试默认生成 release 包。
   - 保留 `npm run build:debug` 用于显式生成 debug 包。
   - `manifest` 中关闭运行日志输出，降低发布包运行时干扰。
   - 移除未使用的 `system.router` feature，仅保留实际使用的 `system.prompt`、`system.file`、`system.folme`。
2. 响应式状态裁剪
   - 只把真正驱动 UI 的数据放在页面 `private` 中。
   - 撤销状态等非 UI 数据移到模块变量，减少 viewModel observer 和数据代理开销。
   - 方块文本和样式数组原地更新，避免每步移动替换整组数组。
3. 存储写入优化
   - 保存逻辑改为真正 debounce：连续操作期间会不断延后写入，只在操作稳定后落盘。
   - 增加 `saveDirty` 脏标记，`onHide` / `onDestroy` 只有状态变化时才立即写入。
   - 复用保存 payload 对象，减少保存时临时对象创建。
   - 保持旧版 `game_data.json` 字段兼容，不破坏已有存档。
4. 移动热路径优化
   - 去掉每次滑动时创建方向数组的 `includes` 判断，改用 `switch`。
   - 去掉手势方向的 `toLowerCase()`，直接按 Vela swipe 事件方向处理。
   - 无效移动不再提前备份棋盘，确认棋盘会变化后才复制撤销状态。
   - `checkGameOver()` 只在新方块生成后棋盘已满时执行。
5. 核心合成算法优化
   - 四方向移动改为固定 4 格的“读取、压缩、合并、写回”流程。
   - 删除 `added` 合并标记矩阵。
   - 删除 `noBlockHorizontal()` / `noBlockVertical()` 路径扫描函数。
   - 合成时增量维护分数、历史最高分、当前最大方块和历史最大方块。
   - 只有读档、撤销、新游戏等非热路径保留全盘最大值重算。
6. 动画与渲染优化
   - 棋盘位置使用固定几何参数，不在移动时调用布局测量。
   - Folme 动画只使用 `translateX` / `translateY`，不动画 `left`、`top`、尺寸或颜色。
   - 使用 `folme.startGroup()` 批量启动动画，减少逐个启动动画的桥调用。
   - 内部动画队列复用轻量槽位，减少移动计算阶段分配。
   - 传给 Folme 的动画参数使用一次性快照，避免运行时保留或改写复用对象导致动画错位。
   - 动画节奏对齐 1.0.1：`110ms` 动画、`0.1` Folme duration、`16ms` reset 延迟。
   - 动画结束后先提交最终棋盘 UI，再 reset 本轮实际动过的格子，避免无意义的全棋盘 reset。
7. 模板与节点优化
   - 亮/暗背景和按钮使用动态 `src`，减少重复 `if/else` 节点。
   - 关于菜单继续使用 `if`，关闭后从 VDOM 移除长图和菜单节点。
   - 菜单滚动关闭 bounce，减少小屏设备上不必要的滚动物理开销。
   - 方块仍使用 `<text>` + CSS 绘制，不使用方块图片素材，降低资源解码和内存成本。

## Vela / Folme 注意事项

本项目在真机调试中记录到一些 Vela 快应用环境下需要特别注意的行为：

1. `@system.folme` 是 Vela 运行时提供的扩展动画接口，当前构建工具会提示 `system.folme unknown feature`，但不影响已适配设备上的 release 打包和运行。
2. `folme.startGroup()` 的参数生命周期不要假设为同步拷贝。传入后仍会被复用或修改的对象，可能导致方块位移错误或动画中消失。
3. `folme.setTo()` 也不要过度复用参数对象。动画结束清理 transform 时，应使用一次性对象，确保运行时拿到的是独立状态。
4. `clearani()` 只 reset 本轮实际动过的格子。全 16 格 reset 在理论上更干净，但真机体感不如 1.0.1 的 active id reset。
5. transform reset 不能放在最终棋盘 UI 提交之前。真机上如果先 reset，再更新最终方块文本和样式，可能出现方块回弹、错位或类似消失的观感。当前实现会先提交最终棋盘 UI，再短延迟 reset transform。
6. 单层棋盘动画存在天然交接点：同一批 16 个节点既承担移动动画，也承担最终棋盘显示。后续优化不要用复杂 handoff 去强行遮盖闪烁，容易把目标位置闪烁转移成原位置闪烁。
7. `startGroup` 仍优先于逐个 `fromTo`，因为它能减少 JS 到系统动画接口的调用次数；但参数对象必须用安全快照。
8. 如果后续设备或系统版本上 `startGroup` 再出现兼容问题，可以退回逐个 `folme.fromTo({ fromState, toState })` 的保守实现。

这些注意事项属于真机调试中踩出的运行时边界，后续继续优化动画时不要为了零临时对象分配而复用传给 Folme 的对象。

## 已验证不采用的动画实验

- 双层 overlay 棋盘：增加 16 个响应式节点，真机上闪烁和卡顿都更明显。
- 动画前等待 overlay 渲染一帧：会给每次滑动增加可感知延迟。
- 动画结束 handoff：能遮住目标位置错字闪烁，但 reset 回源位置时会出现新的原位闪烁。
- `95ms` / `0.09` 短动画：少滑块时更利落，但整体不如 1.0.1 的 `110ms` / `0.1` 稳。
- 合并只动画一个滑块：能减少动画数量，但视觉反馈弱于 1.0.1，最终不保留。
- 每次 reset 全 16 格：理论上减少 transform 残留风险，但桥调用更多，真机流畅度不如 active id reset。

## 原型协作

[即时设计原型共享链接：2048N](https://js.design/f/4xc3eq?p=r9Y24jEK59&mode=design)

邀请您查看「2048N」，点击链接开启协作，方便继续修改和完善设计原型。

## 上游致谢

本项目基于上游 2048 项目继续二次开发与适配完善。感谢上游开源代码与早期移植工作，为 2048N 的优化和扩展提供了基础。

- [lst 开源的 B2048 代码](https://github.com/leset0ng/B2048)

- [CheongSzesuen 基于 B2048 的环10移植版本](https://github.com/CheongSzesuen/B2048)

## 开发说明

### 构建

```bash
npm run build
```

`npm run build` 默认生成 release 包，并启用 JSC 和 Protobuf。构建产物会输出到 `dist/` 目录，RPK 文件名会使用当前 manifest 中的包名和版本号。

如需生成 debug 包：

```bash
npm run build:debug
```

### 签名证书

release 打包需要项目根目录存在以下文件：

```text
sign/private.pem
sign/certificate.pem
```

可用 OpenSSL 生成本地测试证书：

```bash
mkdir -p sign
openssl req -newkey rsa:2048 -nodes -keyout sign/private.pem -x509 -days 3650 -out sign/certificate.pem -subj /CN=2048N
```

`sign/` 已被忽略，私钥不要提交到仓库。

### 颜色

方块颜色在 [src/pages/index/index.ux](src/pages/index/index.ux) 的样式区维护，可以按数值分别调整亮色和暗色主题。

### Folme 动画

[Folme 动画接口文档](docs/folme.md) 中记录了动画接口与 2048N 中的使用方式。

### 开发记录

[2048N 开发记录](docs/development.md) 记录了 1.0.3 相比 1.0.1 的优化、真机踩坑和后续优化原则。

## 许可证

AGPL-3.0-only
