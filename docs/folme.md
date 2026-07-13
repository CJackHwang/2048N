# Folme 动画接口

## 接口声明
```json
{ "name": "@system.folme" }
```

## 导入模块
```javascript
import folme from '@system.folme'
// 或
const folme = require('@system.folme')
```

## 接口定义

### folme.to(OBJECT)
直接运动到目标状态

#### 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 动画节点ID |
| toState | Object | 是 | 目标状态属性 |
| config | Object | 否 | 动画配置 |
| onUpdate | Function | 否 | 动画更新回调 |
| onComplete | Function | 否 | 动画完成回调 |

#### toState结构
```typescript
{
  [key: string]: number | string | {
    value?: number | string;
    ease?: (string | number)[];
    delay?: number;
  }
}
```

#### config结构
```typescript
{
  delay?: number;
  ease?: (string | number)[];
}
```
#### 示例代码
当前 2048N 不在移动时测量布局，而是用小米手环 10 的固定棋盘几何参数计算位移。
```javascript
const CELL_STEP_X = 48
const CELL_STEP_Y = 49

function queueAnimation(id1, id2) {
  const dx = (id2 % 4 - id1 % 4) * CELL_STEP_X
  const dy = (Math.floor(id2 / 4) - Math.floor(id1 / 4)) * CELL_STEP_Y

  folme.fromTo({
    id: String(id1),
    fromState: { translateX: "0px", translateY: "0px" },
    toState: { translateX: dx + "px", translateY: dy + "px" },
    config: { duration: 0.1 }
  })
}
```
---

### folme.setTo(OBJECT)
直接设置到目标状态（中断当前动画）

#### 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 动画节点ID |
| toState | Object | 是 | 目标状态属性 |
| config | Object | 否 | 动画配置（仅delay有效） |

#### 示例代码
2048N 只 reset 本轮实际移动过的格子，避免无意义的桥调用。
```javascript
function clearani(ids) {
  const targets = ids && ids.length ? ids : CELL_IDS
  for (let i = 0; i < targets.length; i++) {
    folme.setTo({
      id: targets[i],
      toState: { translateX: "0px", translateY: "0px" }
    })
  }
}
```
---

### folme.fromTo(OBJECT)
从起始状态运动到目标状态

#### 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 动画节点ID |
| fromState | Object | 是 | 起始状态属性 |
| toState | Object | 是 | 目标状态属性 |
| config | Object | 否 | 动画配置 |
| onUpdate | Function | 否 | 动画更新回调 |
| onComplete | Function | 否 | 动画完成回调 |

---

### folme.cancel(OBJECT)
取消动画

#### 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 动画节点ID |
| attrs | string[] | 否 | 要取消的属性列表（默认取消所有） |

#### 示例代码
2048N 当前主要使用 `setTo()` 清理 transform；如果后续切回 `cancel()`，也应只处理本轮实际移动过的格子。
```javascript
function cancelActiveAnimations(ids) {
  for (let i = 0; i < ids.length; i++) {
    folme.cancel({ id: ids[i] })
  }
}
```

---

### folme.getState(OBJECT)
获取动画状态

#### 参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 动画节点ID |
| attr | string | 是 | 要获取的属性名 |

#### 返回值
```typescript
{
  value: string | number;
  isFinished: boolean;
  speed?: number;
}
```

---

### folme.startGroup(OBJECT_ARRAY)
执行动画序列（Vela特有）

#### 参数
数组元素结构：
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 是 | 动画节点ID |
| toState | Object | 是 | 目标状态属性 |
| config | Object | 否 | 动画配置 |

## 2048N 1.0.3 使用规则

2048N 的最终动画策略以 `v1.0.1` 真机体感为基准，并在 1.0.3 中保留：

```javascript
const MOVE_DURATION = 110
const RESET_TRANSFORM_DELAY = 16
const ANIMATION_CONFIG = { duration: 0.1 }
```

核心规则：

1. 只使用单层真实棋盘节点，不增加 overlay 动画层。
2. 动画属性只使用 `translateX` / `translateY`。
3. 棋盘格间距使用固定常量计算，不在移动时调用 `getBoundingClientRect()`。
4. 使用 `folme.startGroup()` 批量启动动画，降低 JS 到原生动画接口的调用次数。
5. 内部动画槽位可以复用，但传给 Folme 的数组元素和 `toState` 必须创建一次性快照。
6. 动画结束后先提交最终棋盘 UI，再延迟 16ms reset transform。
7. reset 只处理本轮实际动过的格子；如果没有传入 id 列表，才 fallback 到 16 格全 reset。

当前清理逻辑：

```javascript
function clearani(ids) {
  const targets = ids && ids.length ? ids : CELL_IDS
  for (let i = 0; i < targets.length; i++) {
    folme.setTo({
      id: targets[i],
      toState: { translateX: "0px", translateY: "0px" }
    })
  }
}
```

当前启动逻辑：

```javascript
function startAnimations() {
  if (!pendingAnimationCount) return
  if (typeof folme.startGroup === "function") {
    const animationFrame = new Array(pendingAnimationCount)
    for (let i = 0; i < pendingAnimationCount; i++) {
      const frame = animationFrames[i]
      animationFrame[i] = {
        id: frame.id,
        toState: { translateX: frame.translateX, translateY: frame.translateY },
        config: ANIMATION_CONFIG
      }
    }
    folme.startGroup(animationFrame)
    return
  }
  for (let i = 0; i < pendingAnimationCount; i++) {
    const frame = animationFrames[i]
    folme.fromTo({
      id: frame.id,
      fromState: { translateX: "0px", translateY: "0px" },
      toState: { translateX: frame.translateX, translateY: frame.translateY },
      config: ANIMATION_CONFIG
    })
  }
}
```

## 真机踩坑记录

1. 复用传给 Folme 的对象会出问题。
   - `startGroup()` 的参数不要假设为同步拷贝。
   - 复用对象可能导致方块错位、消失或拿到上一轮状态。
2. 双层 overlay 棋盘不采用。
   - 额外 16 个节点会增加响应式更新和渲染压力。
   - 动画前等待 overlay 渲染一帧会让滑动变钝。
   - 真机上闪烁更明显。
3. handoff 遮盖策略不采用。
   - 源格子临时显示目标格数字，会在 reset 回源位置时闪一下。
4. 过短动画不采用。
   - `95ms` / `0.09` 少滑块时看起来更快，但整体不如 `110ms` / `0.1` 稳。
5. 全 16 格 reset 不作为常规路径。
   - 理论上能减少残留担心，但桥调用更多，真机流畅度不如 active id reset。
6. reset 时机不能提前。
   - 先 reset 再提交最终棋盘 UI，会出现回弹、错位或类似消失的观感。
   - 32ms reset 延迟会让错字闪烁暴露更久。

## 示例代码

```javascript
// 基础动画
folme.to({
  id: 'box1',
  toState: {
    opacity: 0.5,
    translateX: '100px',
    scale: {
      value: 1.2,
      ease: ['ease-in', 0.5],
      delay: 200
    }
  },
  config: {
    delay: 100,
    ease: ['linear']
  },
  onComplete: () => console.log('动画完成')
});

// 状态切换
folme.setTo({
  id: 'box1', 
  toState: {
    rotate: '45deg'
  }
});

// 动画序列
folme.startGroup([
  {
    id: 'box1',
    toState: { x: '100px' },
    config: { duration: 300 }
  },
  {
    id: 'box2', 
    toState: { y: '50px' }
  }
]);
```

## 支持设备
| 设备类型 | 支持情况 |
|---------|---------|
| 小米手环9 | ✔️ 支持 |
| 小米手环10 | ✔️ 支持 |
| 其他设备 | 暂不清楚 |

## 接口类型文件

``` typescript
/**
 * Amaml Folme动画接口
 *
 * @OnlyVela
 */
declare module "@system.folme" {
  /**
   * 忽略对象当前状态，通知对象直接运动到目标状态
   * @param obj
   */
  function to(obj: {
    /**
     * 动画节点
     */
    id: string;
    /**
     * 动画属性。支持 参考：动画状态
     */
    toState: {
      [key: string]:
        | number
        | string
        | {
            value?: number | string;
            ease?: (string | number)[];
            delay?: number;
          };
    };
    /**
     * 动画选项
     */
    config?: {
      delay?: number;
      ease?: (string | number)[];
    };
    /**
     * 动画更新触发
     */
    onUpdate?: () => void;
    /**
     * 动画执行完成触发
     */
    onComplete?: () => void;
  }): void;

  /**
   * 将对象直接设置到某个状态，如果对象正在动画中会停止当前动画
   * @param obj
   */
  function setTo(obj: {
    /**
     * 动画节点
     */
    id: string;
    /**
     * 动画属性。支持 参考：动画状态
     */
    toState: {
      [key: string]:
        | number
        | string
        | {
            value?: number | string;
            ease?: (string | number)[];
            delay?: number;
          };
    };
    /**
     * 动画选项 ease 不生效
     */
    config?: {
      delay?: number;
    };
  }): void;

  /**
   * 将对象从某个状态运动到另一个状态(实现上可先执行setTo，再执行to)
   * @param obj
   */
  function fromTo(obj: {
    /**
     * 动画节点
     */
    id: string;
    /**
     * 开始动画属性。支持 参考：动画状态
     */
    fromState: {
      [key: string]:
        | number
        | string
        | {
            value?: number | string;
            ease?: (string | number)[];
            delay?: number;
          };
    };
    /**
     * 结束动画属性。支持 参考：动画状态
     */
    toState: {
      [key: string]:
        | number
        | string
        | {
            value?: number | string;
            ease?: (string | number)[];
            delay?: number;
          };
    };
    /**
     * 动画选项
     */
    config?: {
      delay?: number;
      ease?: (string | number)[];
    };
    /**
     * 动画更新触发
     */
    onUpdate?: () => void;
    /**
     * 动画执行完成触发
     */
    onComplete?: () => void;
  }): void;

  /**
   * 取消动画
   * @param obj
   */
  function cancel(obj: {
    /**
     * 动画节点
     */
    id: string;
    /**
     * 需要取消的动画属性。默认去取消所有
     */
    attrs?: string[];
  }): void;

  /**
   * 获取指定属性的状态
   * @param obj
   */
  function getState(obj: {
    /**
     * 动画节点
     */
    id: string;
    /**
     * 需要获取动画属性
     */
    attr: string;
  }): {
    value: string | number;
    isFinished: boolean;
    speed?: number;
  };

  /**
   * Vela新增，设置一组动画序列
   * @param objArray
   */
  function startGroup(
    objArray: Array<{
      /**
       * 动画节点
       */
      id: string;
      /**
       * 动画属性。支持 参考：动画状态
       */
      toState: {
        [key: string]:
          | number
          | string
          | {
              value?: number | string;
              ease?: (string | number)[];
              delay?: number;
            };
      };
      /**
       * 动画选项
       */
      config?: {
        delay?: number;
        ease?: (string | number)[];
      };
    }>
  ): void;
}
```
