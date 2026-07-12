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
来自 2048N 中的使用，用于实现方块从一个位置平滑移动到另一个位置的动画效果。
```javascript
function fromTo(id1, id2) {
  id1 = id1.toString()
  id2 = id2.toString()
  
  that.$element(id1).getBoundingClientRect({
    success: (data1) => {
      that.$element(id2).getBoundingClientRect({
        success: (data2) => {
          const dx = data2.left - data1.left
          const dy = data2.top - data1.top
          
          folme.fromTo({
            id: id1,
            fromState: {translateX: "0px", translateY: "0px"},
            toState: {translateX: dx + "px", translateY: dy + "px"},
            config: {duration: 0.1}
          })
        }
      })
    }
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
来自 2048N 中的使用，用于将方块重置到初始位置。
```javascript
function clearani() {
  for (let i = 0; i < 16; i++) {
    let id = i.toString()
    // ...
    folme.setTo({
      id: id,
      toState: {translateX: "0px", translateY: "0px"}
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
来自 2048N 中的使用，用于取消正在进行的动画。
```javascript
function clearani() {
  for (let i = 0; i < 16; i++) {
    let id = i.toString()
    folme.cancel({id: id})
    // ...
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
