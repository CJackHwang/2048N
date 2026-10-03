'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { VvdManager } = require('@aiot-toolkit/emulator')
const adb = require('@miwt/adb')

const DEVICES = ['band9', 'band10', 'bandpro']
const SDK_HOME = path.join(os.homedir(), '.vela', 'sdk')
const DEBUG_CONFIG_PATH = '/tmp/quickapp_debug_cfg.json'

function parseArgs(argv) {
  const args = {
    device: 'band10',
    wait: 7000,
    once: false,
    screenshot: null,
    rpk: null
  }
  for (let i = 0; i < argv.length; i++) {
    const value = argv[i]
    if (value === '--device') args.device = argv[++i]
    else if (value === '--wait') args.wait = Number(argv[++i])
    else if (value === '--screenshot') args.screenshot = argv[++i]
    else if (value === '--rpk') args.rpk = argv[++i]
    else if (value === '--once') args.once = true
    else if (value === '--help' || value === '-h') return null
    else throw new Error(`未知参数: ${value}`)
  }
  if (!DEVICES.includes(args.device)) {
    throw new Error(`--device 必须是 ${DEVICES.join('、')} 之一`)
  }
  if (!Number.isFinite(args.wait) || args.wait < 0) {
    throw new Error('--wait 必须是非负毫秒数')
  }
  return args
}

function printUsage() {
  console.log('用法: npm run emulator -- --device band10 [--once] [--screenshot /tmp/band10.png]')
  console.log('设备: band9、band10、bandpro；默认 band10。')
  console.log('--once 启动、安装、截图后自动退出；不加时按 Ctrl-C 关闭模拟器。')
}

function findHostIp() {
  const networks = os.networkInterfaces()
  const addresses = Object.keys(networks).reduce((result, name) => {
    return result.concat(networks[name] || [])
  }, [])
  const address = addresses.find(item => {
    return item.family === 'IPv4' && !item.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(item.address)
  })
  if (!address) throw new Error('未找到局域网 IPv4，无法让模拟器连接本机 MQTT 调试服务')
  return address.address
}

function resolveRpk(customPath, packageName) {
  if (customPath) return path.resolve(customPath)
  const distPath = path.resolve('dist')
  const prefix = `${packageName}.release.`
  const candidates = fs.readdirSync(distPath)
    .filter(name => name.indexOf(prefix) === 0 && name.endsWith('.rpk'))
    .sort()
  if (!candidates.length) {
    throw new Error(`找不到 ${prefix}*.rpk，请先执行 npm run build`)
  }
  return path.join(distPath, candidates[candidates.length - 1])
}

function ensureVvdConfig(manager, device) {
  let info = null
  try {
    info = manager.getVvdInfo(device)
  } catch (error) {
    // 配置文件缺失时由 resetImageDir 统一恢复默认镜像路径。
  }
  if (!info || !info.imageDir) {
    manager.resetImageDir(device)
    info = manager.getVvdInfo(device)
  }
  if (!info || !info.imageDir) throw new Error(`${device} 未找到可用 Vela 镜像`)
  return info
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    printUsage()
    process.exitCode = 1
    return
  }
  if (!args) {
    printUsage()
    return
  }

  try {
    const manifest = require(path.resolve('src/manifest.json'))
    const packageName = manifest.package
    const rpkPath = resolveRpk(args.rpk, packageName)
    const hostIp = findHostIp()
    const manager = new VvdManager({ sdkHome: SDK_HOME })
    await runEmulator(manager, args, packageName, rpkPath, hostIp)
  } catch (error) {
    console.error(error.stack || error)
    process.exitCode = 1
  }
}

function registerShutdownHandlers(stop) {
  const shutdown = () => {
    stop().then(() => process.exit(0)).catch(error => {
      console.error(error.stack || error)
      process.exit(1)
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}

async function launchApp(manager, args, packageName, rpkPath, hostIp) {
  ensureVvdConfig(manager, args.device)
  const started = await manager.startVvd({
    vvdName: args.device,
    qtHideWindow: true,
    stdoutCallback: line => {
      const text = String(line).trim()
      if (text && /Launching App|Start main loop|Page ready|Failed|assert|Error/i.test(text)) {
        console.log(`[${args.device}] ${text}`)
      }
    },
    stderrCallback: line => {
      const text = String(line).trim()
      if (text && /Failed|assert|Error/i.test(text)) console.error(`[${args.device}] ${text}`)
    }
  })
  const instance = started.emulatorInstance
  const agent = await started.getAgent()
  fs.writeFileSync(DEBUG_CONFIG_PATH, JSON.stringify({
    mqttHost: hostIp,
    mqttPort: 1884,
    device: `vela_emulator_${args.device}`
  }))
  await instance.push(DEBUG_CONFIG_PATH, DEBUG_CONFIG_PATH)
  await instance.pushAndInstall(rpkPath, packageName)
  await adb.execAdbCmdAsync(`adb -s ${instance.sn} shell am start ${packageName}`)
  return { agent }
}

async function runEmulator(manager, args, packageName, rpkPath, hostIp) {
  let agent = null
  let deviceStopped = false

  const stop = async () => {
    if (deviceStopped) return
    deviceStopped = true
    if (agent && typeof agent.close === 'function') agent.close()
    await manager.stopVvd(args.device, 5000)
  }

  registerShutdownHandlers(stop)

  try {
    const launched = await launchApp(manager, args, packageName, rpkPath, hostIp)
    agent = launched.agent
    console.log(`已启动 ${packageName}，设备=${args.device}，MQTT=${hostIp}:1884`)

    await delay(args.wait)
    const screenshotPath = path.resolve(args.screenshot || `/tmp/2048n-${args.device}.png`)
    fs.writeFileSync(screenshotPath, await agent.getScreenshot())
    console.log(`截图已保存: ${screenshotPath}`)
    if (args.once) {
      await stop()
      return
    }
    await new Promise(() => {})
  } catch (error) {
    console.error(error.stack || error)
    try {
      await stop()
    } catch (stopError) {
      console.error(stopError.stack || stopError)
    }
    process.exitCode = 1
  }
}

main()
