const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vmModule = require('node:vm')

const sourcePath = path.join(__dirname, '..', 'src', 'pages', 'index', 'index.ux')

function loadRuntime(options = {}) {
  const source = fs.readFileSync(sourcePath, 'utf8')
  const script = source.slice(source.indexOf('<script>') + 8, source.indexOf('</script>'))
    .replace(/^\s*import .*$/gm, '')
    .replace('export default {', 'globalThis.__page = {') + `
globalThis.__test = {
  copyBoard,
  getBoard: () => board.map(row => row.slice()),
  getCanUndo: () => canUndo,
  getLocked: () => inputLocked,
  getOver: () => over,
  getPendingScore: () => pendingMoveScore,
  isValidBoard,
  moveleft,
  movedown,
  moveright,
  moveup,
  resetPending: () => {
    pendingMoveScore = 0
    pendingMoveMaxMerged = 0
    moveBackedUp = false
  },
  restoreGame,
  setBoard: value => copyBoard(board, value)
}
`
  const timers = new Map()
  const reads = []
  const writeRequests = []
  const writes = []
  let timerId = 0
  const context = {
    Array,
    Boolean,
    Date,
    JSON,
    Math: Object.create(Math),
    Number,
    Object,
    String,
    console,
    global: {},
    isFinite,
    clearTimeout(id) {
      timers.delete(id)
    },
    device: {
      getInfo(request) {
        request.success({screenShape: 'circle', screenWidth: 212})
        request.complete()
      }
    },
    file: {
      access(request) {
        request.success()
      },
      mkdir(request) {
        request.success()
      },
      readText(request) {
        reads.push(request)
      },
      writeText(request) {
        writeRequests.push(request)
        writes.push(JSON.parse(request.text))
        if (options.autoWrite !== false) {
          request.success()
          request.complete()
        }
      }
    },
    folme: {
      fromTo() {},
      getState() {
        return {isFinished: true}
      },
      setTo() {},
      startGroup() {}
    },
    prompt: {
      showToast() {}
    },
    setTimeout(callback, delay) {
      const id = ++timerId
      timers.set(id, {callback, delay})
      return id
    }
  }
  vmModule.createContext(context)
  vmModule.runInContext(script, context)

  const page = context.__page
  const createApp = () => {
    const app = Object.assign({
      $app: {exit() {}},
      $nextTick(callback) {
        callback()
      },
      $valid: true
    }, page.private)
    for (const key of Object.keys(page)) {
      if (key !== 'private') app[key] = page[key]
    }
    return app
  }

  return {
    completeRead(index, text) {
      assert.ok(reads[index], '缺少读档请求')
      reads[index].success({text})
    },
    context,
    createApp,
    reads,
    timers,
    writeRequests,
    writes
  }
}

function saved(map, extra = {}) {
  return JSON.stringify(Object.assign({
    ani: true,
    hs: 0,
    map,
    sc: 0,
    scoreMode: true
  }, extra))
}

test('拒绝不可玩的存档，并恢复结束状态和最高分约束', () => {
  const runtime = loadRuntime()
  const app = runtime.createApp()
  const empty = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  const nonPowerOfTwo = [[3, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  const full = [[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]
  const normal = [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

  assert.equal(runtime.context.__test.restoreGame(app, saved(empty)), false)
  assert.equal(runtime.context.__test.restoreGame(app, saved(nonPowerOfTwo)), false)
  assert.equal(runtime.context.__test.restoreGame(app, saved(full)), true)
  assert.equal(runtime.context.__test.getOver(), 1)
  assert.equal(runtime.context.__test.restoreGame(app, saved(normal, {hs: 1, lhs: 2, ls: 50, sc: 100})), true)
  assert.deepEqual({current: app.sco, high: app.hsc}, {current: 100, high: 100})
  assert.equal(runtime.context.__test.restoreGame(app, saved(normal, {ch: 1, lm: full})), true)
  app.hydrated = true
  app.chcb()
  assert.equal(runtime.context.__test.getOver(), 1)
})

test('切后台会结算动画中的手势并持久化最终棋盘', () => {
  const runtime = loadRuntime()
  const app = runtime.createApp()
  const movable = [[0, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

  app.onReady()
  runtime.completeRead(0, saved(movable))
  app.move({direction: 'left'})
  assert.equal(runtime.context.__test.getLocked(), true)

  app.onHide()

  const board = runtime.context.__test.getBoard()
  assert.equal(runtime.context.__test.getLocked(), false)
  assert.equal(board.flat().filter(Boolean).length, 2)
  assert.equal(runtime.writes.length, 1)
  assert.deepEqual(runtime.writes[0].map, board)
})

test('销毁页面会结算动画中的手势并持久化最终棋盘', () => {
  const runtime = loadRuntime()
  const app = runtime.createApp()
  const movable = [[0, 2, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

  app.onReady()
  runtime.completeRead(0, saved(movable))
  app.move({direction: 'left'})
  app.onDestroy()

  assert.equal(runtime.context.__test.getLocked(), false)
  assert.equal(runtime.context.__test.getBoard().flat().filter(Boolean).length, 2)
  assert.equal(runtime.writes.length, 1)
})

test('损坏存档会新开一局并在离开前写入', () => {
  const runtime = loadRuntime()
  const app = runtime.createApp()

  app.onReady()
  runtime.completeRead(0, '{')
  assert.equal(app.hydrated, true)
  app.onHide()

  assert.equal(runtime.writes.length, 1)
  assert.equal(runtime.writes[0].map.flat().filter(Boolean).length, 2)
})

test('存档写入串行，并始终保留最新快照', () => {
  const runtime = loadRuntime({autoWrite: false})
  const app = runtime.createApp()
  const board = [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

  app.onReady()
  runtime.completeRead(0, saved(board))
  app.save(true)
  app.sco = 8
  app.save(true)
  assert.equal(runtime.writeRequests.length, 1)

  runtime.writeRequests[0].success()
  assert.equal(runtime.writeRequests.length, 2)
  assert.equal(runtime.writes[1].sc, 8)
  runtime.writeRequests[1].success()
})

test('过期读档回调不能覆盖新页面状态', () => {
  const runtime = loadRuntime()
  const oldApp = runtime.createApp()
  const newApp = runtime.createApp()
  const expected = [[2, 4, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]

  oldApp.onReady()
  oldApp.onDestroy()
  newApp.onReady()
  runtime.completeRead(1, saved(expected))
  runtime.completeRead(0, saved([[0, 0, 0, 8], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]))

  assert.deepEqual(runtime.context.__test.getBoard(), expected)
})

function collapse(line, reverse) {
  const ordered = reverse ? line.slice().reverse() : line.slice()
  const nonzero = ordered.filter(Boolean)
  const output = []
  let score = 0
  for (let i = 0; i < nonzero.length; i++) {
    if (nonzero[i] === nonzero[i + 1]) {
      const merged = nonzero[i] * 2
      output.push(merged)
      score += merged
      i++
    } else {
      output.push(nonzero[i])
    }
  }
  while (output.length < 4) output.push(0)
  return {line: reverse ? output.reverse() : output, score}
}

function boardFor(line, direction) {
  const board = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
  if (direction === 'left' || direction === 'right') {
    board[0] = line.slice()
  } else {
    for (let i = 0; i < 4; i++) board[i][0] = line[i]
  }
  return board
}

test('四方向合并在 2500 组棋盘行上与参考规则一致', () => {
  const runtime = loadRuntime()
  const values = [0, 2, 4, 8, 16]
  const move = {
    down: runtime.context.__test.movedown,
    left: runtime.context.__test.moveleft,
    right: runtime.context.__test.moveright,
    up: runtime.context.__test.moveup
  }

  for (const a of values) {
    for (const b of values) {
      for (const c of values) {
        for (const d of values) {
          const line = [a, b, c, d]
          for (const direction of Object.keys(move)) {
            const expected = collapse(line, direction === 'right' || direction === 'down')
            runtime.context.__test.setBoard(boardFor(line, direction))
            runtime.context.__test.resetPending()
            const app = {ani: false, hsc: 0, maxTile: 2, maxTileHistory: 0, sco: 0}

            const moved = move[direction](app)

            assert.deepEqual(runtime.context.__test.getBoard(), boardFor(expected.line, direction), `${direction} ${line}`)
            assert.equal(moved, line.some((value, index) => value !== expected.line[index]), `${direction} ${line}`)
            assert.equal(runtime.context.__test.getPendingScore(), expected.score, `${direction} ${line}`)
          }
        }
      }
    }
  }
})
