# 2048N 开发记录

本文记录 2048N 对小米手环 9、9 Pro、10、10 Pro、11 的适配约定。9 与 10/11 共用胶囊屏方案并按屏幕尺寸区分，10 与 11 的屏幕布局相同；9 Pro 与 10 Pro 共用矩形屏方案。Band9、Band10、BandPro 已在 Vela 5 模拟器完成命令行启动验证，Band11 与 10 共用布局但仍需真机验收。后续开发优先参考这里，不要只按桌面浏览器或模拟器直觉改动画。

## 最佳实践

1. 构建配置
   - `npm run build` 默认执行 `aiot release --enable-jsc`，不启用 Protobuf 二进制模板。
   - `npm run build:compat` 生成不含 JSC 的兼容包；只有目标设备运行时不支持 JSC 时才使用。
   - `npm run build:debug` 才生成 debug 包。
   - `manifest.config.logLevel` 设为 `off`。
   - `designWidth` 以 212 作为胶囊屏基准；`system.device.getInfo()` 用屏宽区分 Band9 与 Band10/11 的胶囊屏布局、用屏幕形状重排 Band9 Pro/10 Pro 矩形屏。Band9 棋盘与移动动画按背景素材逐行对齐，操作区沿用随屏宽缩放的原始位置；Pro 使用居中棋盘和等尺寸底部按钮。
   - 移除未使用的 `system.router` feature，保留页面 router 配置。
2. 响应式状态
   - 不直接驱动 UI 的状态移出页面 `private`。
   - `canUndo`、`saveDirty` 等使用模块级变量。
   - `md`、`tileClass`、分数、主题、动画开关、计分模式保留在 `private`。
3. 存储 I/O
   - 普通保存使用 debounce。
   - `onHide()` / `onDestroy()` 只有脏状态才立即写入。
   - 保存 payload 对象复用，写入前原地更新字段。
   - 兼容旧 `game_data.json` 结构。
4. 移动热路径
   - 手势方向使用 `switch`，不创建方向数组。
   - 不再做 `toLowerCase()`。
   - 无效移动不提前复制撤销棋盘。
   - `checkGameOver()` 只在新方块生成后棋盘已满时进入。
5. 核心算法
   - 四方向移动统一为固定 4 格的读、压缩、合并、写回流程。
   - 删除 `added` 矩阵。
   - 删除 `noBlockHorizontal()` / `noBlockVertical()`。
   - 合成时增量维护分数和最大方块。
   - 读档、撤销、新游戏等非热路径才全盘重算最大方块。
6. 模板与资源
   - 亮/暗背景和按钮使用动态 `src`。
   - 关于菜单继续使用 `if`，关闭后从 VDOM 移除。
   - 方块由 `<text>` + CSS 绘制，不使用方块图片素材。
7. 动画基准
   - `MOVE_DURATION = 110`。
   - `ANIMATION_CONFIG = { duration: 0.1 }`。
   - `RESET_TRANSFORM_DELAY = 32`；先提交最终棋盘 UI，再清理 Folme 位移。
   - 使用单层真实棋盘节点，不增加 overlay 节点。
   - `folme.startGroup()` 批量启动动画。
   - 传给 Folme 的参数使用一次性快照。
   - 只 reset 本轮实际动过的格子。
   - 不要仅凭“理论上更干净”改成全 16 格 reset；真机体感以 active id reset 为准。

## 模拟器命令行启动

```bash
npm run emulator -- --device band9 --once
npm run emulator -- --device band10 --once
npm run emulator -- --device bandpro --once
```

脚本会自动选择当前局域网 IPv4，写入并推送 `/tmp/quickapp_debug_cfg.json`，再用 `pushAndInstall` 安装 RPK 后启动应用。直接执行 `adb shell am start` 而不推送这份配置，`vappxms` 会停在等待调试服务，画面表现为黑屏。当前 Vela 5 模拟器支持 JSC，但加载 Protobuf 二进制模板会在样式初始化阶段触发断言，因此默认 release 保留 JSC、关闭 Protobuf。

## 已踩坑

### 屏幕布局与资源适配

- Band9 的背景素材行距不是可安全交给 flex 自动分配的等距网格；累计取整会让方块逐行漂移。使用预计算的屏幕专用行偏移，动画位移和静态背景必须共用同一组坐标。
- Band9/10/11 胶囊屏与 Band9 Pro/10 Pro 矩形屏不能只靠统一缩放解决。Pro 需要独立的居中棋盘、统一按钮尺寸和顶部双分数布局；设备分组通过 `screenShape` / `screenWidth` 判断。
- 官方 manifest 文档允许提供 `192×192` 图标；本项目正式手环包采用 `108×108`、RGB、无 alpha、全出血图标，避免启动器对透明画布和尺寸的兼容差异。
- 启动加载屏没有独立的 UX 页面，桌面图标和加载屏都读取 `manifest.icon`。公开 Vela 加载屏实现直接把图标放入 LVGL 容器，没有独立的缩放尺寸配置。历史 `96×96` 仅用于诊断；Band11 已验证 108 方案同时适配桌面和加载屏，Band9/10 沿用同一胶囊屏资源策略。

### Pro 动画层级

- 原 Pro 棋盘固定保留 16 个格子，空格也会渲染成有背景的占位节点；这些节点不能当作透明背景处理。
- 移动源格如果没有明确层级，会按 DOM 顺序被路径上的占位格盖住，表现为方块经过空位时短暂落到下层；Vela 5 运行时还会拒绝 `z-index`（日志为 `Unknown style - zIndex`）。
- Pro 空格背景使用一张静态网格底图，16 个 `<text>` 只绘制实际方块并位于底图之后；这样不依赖未支持的层级属性，不增加第二套动画方块，也不改变 Folme 时序。

### Band10 模拟器滑动崩溃

2026-10-04 的 Band10 模拟器日志确认这是运行时崩溃，不是棋盘合并算法报错：

- NuttX 报告 `arm_dataabort.c:161`，进程为 `vappxms me.cjack.b2048n`。
- 故障栈落在 `jse_free_value()`，调用链为 `invokeNextTick()` → `addMapPending()` → `UVTaskQueue`；寄存器中出现 `0xffffffff`，属于 JS 回调释放阶段的非法指针访问。
- `system_folme_wrap_to` 出现在任务转储中，说明 Folme 调度参与了触发时序，但日志没有把 `folme.getState()` 指到故障栈。
- `coredump device not found` 表示模拟器没有保存完整 core，不能把它当作根因。

触发组合是 Folme 移动动画和嵌套 `vm.$nextTick()`。1.0.3 使用单层 `nextTick`，没有出现这类崩溃；当前实现也必须保持单层 `nextTick`，再延迟 32ms 清理位移。

修复原则：

1. `rm0()` 提交最终棋盘后只等待一次 `vm.$nextTick()`。
2. 通过 32ms 定时器调用 `folme.setTo()` 清理本轮实际动过的格子。
3. `folme.getState()` 对全系列统一启用；接口不存在或抛错时回退到固定时长，不根据“模拟器”型号做未经日志证明的永久分支。

### 模拟器输入与日志边界

- Vela NuttX 模拟器不支持常规 `adb shell input` / `logcat` 路径；自动 gRPC 触摸也可能没有送到 QuickApp 页面，因此自动化“未崩溃”不能替代 IDE 手动滑动验收。
- `npm run emulator -- --device <name> --once` 会在安装、启动、截图后主动停止模拟器；退出码 0 只说明脚本收尾成功，不能据此判断手势稳定性。
- 模拟器启动日志中的 D-Bus、RIL、LVGL stack、QEMU 权限等错误是环境噪声；只有和 `vappxms` 的断言/回溯同一时间段出现时才进入崩溃根因分析。
- IDE 黑屏时先确认 `/tmp/quickapp_debug_cfg.json` 已推送，再启动应用；直接 `adb shell am start` 可能让 `vappxms` 等待调试服务。

### 复用 Folme 参数对象

试图做到零临时对象分配时，复用传给 `folme.startGroup()` / `folme.setTo()` 的对象会导致真机上方块消失、位移错乱或状态串用。

结论：内部队列可以复用，但传进 Folme 的对象要用一次性快照。

### 双层 overlay 棋盘

曾尝试增加一层动画棋盘：底层显示真实状态，上层显示移动中的旧方块。理论上可以隔离动画节点和真实节点，但真机上更差：

- 棋盘节点从 16 个变 32 个。
- 一次移动需要多轮 UI 更新。
- 动画前为了等待 overlay 渲染而增加一帧延迟。
- 滑块更多时闪烁和卡顿都更明显。

结论：不采用双层 overlay。

### handoff 遮盖错字闪烁

曾尝试在动画结束后，让移动中的源格子临时显示目标格最终数字，reset 后再恢复源位置数字。

结果：目标位置错字闪烁减少了，但 reset 回源位置时出现新的原位闪烁。

结论：单层节点无法同时完美伪装目标位和源位，handoff 不采用。

### 缩短动画

`95ms` / `0.09` 在滑块少时更利落，但整体稳定性和顺滑感不如当前真机基准的 `110ms` / `0.1`。

结论：保留 `110ms` / `0.1` 的时长。

### 合并只动画一个滑块

该方案能减少合并时的动画数量，但合并反馈变弱，整体观感不如当前真机基准。

结论：不采用，保持所有实际移动源格参与动画。

### reset 时机

- reset 早于最终棋盘 UI 提交：容易出现回弹或错位。
- 只使用一次 `vm.$nextTick()` 后延迟 32ms：当前全系列动画基线，位置回跳已消失；样式刷新产生的短暂闪烁属于正常刷新。
- 嵌套两个 `vm.$nextTick()`：Band10 模拟器会在 JS 回调释放阶段触发 data abort。

结论：先提交最终棋盘 UI，再延迟 32ms reset；不要嵌套 `nextTick`。

## 后续优化原则

- 优先减少运行时工作量，不为源码整洁引入组件层级。
- 不拆棋盘为子组件，避免增加组件实例、props 和响应式边界。
- 不新增动画层，除非真机测试明确证明收益。
- 动画优化必须真机验证，不能只看构建成功或理论分配量。
- 如需继续压榨性能，优先优化非动画路径；动画的最强性能开关仍是用户设置中的动画开关。
- 小屏棋盘的位置类名以及 16 个文本/样式绑定键在模块初始化时预计算，刷新时只复用缓存；不要在 `rm0()` 中恢复逐格字符串拼接。
