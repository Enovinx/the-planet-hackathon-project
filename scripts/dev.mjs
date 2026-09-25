import { spawn } from 'node:child_process'

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const children = [
  spawn(
    process.platform === 'win32'
      ? (process.env.ComSpec ?? 'cmd.exe')
      : pnpmCommand,
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm exec convex dev']
      : ['exec', 'convex', 'dev'],
    {
      env: process.env,
      stdio: 'inherit',
    },
  ),
  spawn(
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
  ),
]

let shuttingDown = false

function shutdown(exitCode) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    child.kill()
  }
  process.exit(exitCode)
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code ?? 1)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
