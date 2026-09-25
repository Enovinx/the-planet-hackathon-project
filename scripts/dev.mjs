import { spawn } from 'node:child_process'
import net from 'node:net'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const children = []

function startConvex() {
  const command =
    process.platform === 'win32'
      ? (process.env.ComSpec ?? 'cmd.exe')
      : pnpmCommand
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm exec convex dev']
      : ['exec', 'convex', 'dev']

  const child = spawn(command, args, {
    env: process.env,
    stdio: 'inherit',
  })
  children.push(child)
  return child
}

function waitForConvex(child) {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      child.removeListener('exit', onExit)
      callback(value)
    }
    const onExit = (code) => {
      finish(
        reject,
        new Error(`Convex exited before starting (code ${code ?? 1})`),
      )
    }
    const check = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port: 3210 })
      socket.once('connect', () => {
        socket.destroy()
        finish(resolve)
      })
      socket.once('error', () => {
        socket.destroy()
        if (!settled) setTimeout(check, 250)
      })
    }

    child.once('exit', onExit)
    check()
  })
}

function startVite() {
  const child = spawn(
    process.execPath,
    [
      './node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--clearScreen',
      'false',
    ],
    {
      env: process.env,
      stdio: 'inherit',
    },
  )
  children.push(child)
  return child
}

let shuttingDown = false

function shutdown(exitCode) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    child.kill()
  }
  process.exit(exitCode)
}

async function start() {
  const convex = startConvex()
  await waitForConvex(convex)
  const vite = startVite()
  for (const child of [convex, vite]) {
    child.on('exit', (code) => {
      if (!shuttingDown && code !== 0) shutdown(code ?? 1)
    })
  }
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start().catch((error) => {
  console.error(error.message)
  shutdown(1)
})
