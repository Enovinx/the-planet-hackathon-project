import { execSync, spawn } from 'node:child_process'
import net from 'node:net'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const children = []

function killPort(port) {
  try {
    if (process.platform === 'win32') {
      let out = ''
      try {
        out = execSync(`netstat -ano | findstr :${port}`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
      } catch {
        return
      }
      const pids = new Set()
      for (const line of out.split('\n')) {
        // TCP    127.0.0.1:3210    0.0.0.0:0    LISTENING    1234
        const m = line.trim().match(/(\d+)\s*$/)
        if (m && m[1] !== '0') pids.add(m[1])
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
        } catch {
          // already gone
        }
      }
    } else {
      try {
        const out = execSync(`lsof -ti :${port}`, {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        })
        for (const pid of out.split(/\s+/)) {
          if (/^\d+$/.test(pid.trim())) {
            try {
              execSync(`kill -9 ${pid.trim()}`, { stdio: 'ignore' })
            } catch {
              // already gone
            }
          }
        }
      } catch {
        try {
          execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' })
        } catch {
          // nothing listening
        }
      }
    }
  } catch {
    // never fail dev startup because of cleanup
  }
}

function freeConvexPorts() {
  // Convex local backend binds 3210 (and 3211 for the dashboard proxy).
  // A previous `convex dev` that didn't shut down cleanly leaves these
  // bound, causing: "A local backend is still running on port 3210".
  // Clear them automatically instead of asking the user to stop it.
  killPort(3210)
  killPort(3211)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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
  freeConvexPorts()
  await sleep(500)
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
