#!/usr/bin/env node
/**
 * 咪爱编程 · 网页版本地服务
 * ------------------------------------------------------------
 * 两个职责：
 *   1. POST /api/run —— 代码判题：spawn 本机编译器/解释器，带超时、输出截断。
 *      对应桌面端主进程的 runner:run，渲染层 window.miai.runCode 走这里。
 *   2. 静态托管 dist/ —— 构建后的网页。
 *
 * 运行： node server.mjs
 * 依赖： 仅 Node 内置模块 + 本机 gcc/g++/javac/python（缺哪个不影响启动）
 * 安全： ⚠️ 运行的是用户自己写的代码，权限等同于本机终端。别把来路不明的代码粘进来跑。
 */
import http from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(__dirname, 'dist')
const PORT = Number(process.env.PORT || 8787)

const MAX_OUTPUT = 64 * 1024      // stdout/stderr 各截断到 64KB
const MAX_CODE = 200 * 1024       // 代码上限 200KB
const DEFAULT_TIMEOUT = 5         // 秒

// ------------------------------------------------------------------ 编译器配置
const COMPILERS = {
  c:     { bin: 'gcc',   check: ['--version'] },
  cpp:   { bin: 'g++',   check: ['--version'] },
  java:  { bin: 'javac', check: ['-version'] },
  python:{ bin: 'python3', check: ['--version'] }
}

/** 检测某个编译器是否可用 */
function hasBin(bin) {
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', ''] : ['']
  const dirs = (process.env.PATH || '').split(path.delimiter)
  for (const d of dirs) {
    for (const e of exts) {
      try { if (fs.existsSync(path.join(d, bin + e))) return true } catch {}
    }
  }
  try {
    const r = spawnSyncSafe(bin, ['--version'])
    return r
  } catch { return false }
}
function spawnSyncSafe(bin, args) {
  try {
    const r = spawnSync(bin, args, { timeout: 3000 })
    return !r.error && r.status === 0
  } catch { return false }
}

const availability = {}
for (const [lang, cfg] of Object.entries(COMPILERS)) {
  availability[lang] = hasBin(cfg.bin)
}

// ------------------------------------------------------------------ 单任务队列
let queue = Promise.resolve()
function enqueue(fn) {
  const next = queue.then(fn, fn)
  queue = next.catch(() => {})
  return next
}

// ------------------------------------------------------------------ 运行核心
function runProcess(bin, args, opts = {}) {
  return new Promise((resolve) => {
    let stdout = '', stderr = '', truncated = false, timedOut = false
    let settled = false
    const timeoutMs = (opts.timeoutSec || DEFAULT_TIMEOUT) * 1000
    const child = spawn(bin, args, {
      cwd: opts.cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })
    const timer = setTimeout(() => {
      timedOut = true
      try { child.kill('SIGKILL') } catch {}
    }, timeoutMs)
    child.stdout.on('data', (b) => {
      if (stdout.length < MAX_OUTPUT) stdout += b.toString('utf8')
      else truncated = true
    })
    child.stderr.on('data', (b) => {
      if (stderr.length < MAX_OUTPUT) stderr += b.toString('utf8')
      else truncated = true
    })
    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ ok: false, stdout, stderr: stderr + '\n' + String(err.message), exitCode: null, timedOut: false, truncated, spawnError: String(err.message) })
    })
    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ ok: true, stdout, stderr, exitCode: code, timedOut, truncated })
    })
    if (opts.stdin !== undefined && opts.stdin !== null && opts.stdin !== '') {
      try { child.stdin.write(opts.stdin) } catch {}
    }
    try { child.stdin.end() } catch {}
  })
}

function result(phase, r, extra = {}) {
  return {
    ok: r.exitCode === 0 && !r.timedOut && !r.spawnError,
    phase,
    stdout: r.stdout,
    stderr: r.stderr,
    exitCode: r.exitCode,
    timedOut: r.timedOut,
    truncated: r.truncated,
    durationMs: extra.durationMs || 0,
    ...(r.timedOut ? { message: '运行超时了喵～（可能是死循环）' } : {}),
    ...(r.spawnError ? { message: '翻译官喵不在岗：' + r.spawnError, envIssue: true } : {}),
    ...extra
  }
}

async function judgeCode(req) {
  const started = Date.now()
  const lang = String(req.lang || '')
  const code = String(req.code || '')
  const stdin = req.stdin
  const timeoutSec = Math.min(Math.max(Number(req.timeoutSec) || DEFAULT_TIMEOUT, 1), 20)

  if (!(lang in COMPILERS)) {
    return { ok: false, phase: 'compile', stdout: '', stderr: '', exitCode: null, timedOut: false, truncated: false, durationMs: 0, message: '不认识的语言喵', envIssue: true }
  }
  if (code.length > MAX_CODE) {
    return { ok: false, phase: 'compile', stdout: '', stderr: '', exitCode: null, timedOut: false, truncated: false, durationMs: 0, message: '代码太长了喵（上限 200KB）', envIssue: false }
  }
  if (!availability[lang]) {
    return { ok: false, phase: 'compile', stdout: '', stderr: '', exitCode: null, timedOut: false, truncated: false, durationMs: 0, message: `没找到 ${COMPILERS[lang].bin}，代码题需要本机装好工具链喵～（选择题/填空题不受影响）`, envIssue: true }
  }

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'miai-web-'))
  const dur = () => Date.now() - started
  try {
    if (lang === 'python') {
      const file = path.join(work, 'main.py')
      fs.writeFileSync(file, code, 'utf8')
      const r = await runProcess('python3', [file], { cwd: work, stdin, timeoutSec })
      return result('run', r, { durationMs: dur() })
    }
    if (lang === 'c' || lang === 'cpp') {
      const isC = lang === 'c'
      const src = path.join(work, isC ? 'main.c' : 'main.cpp')
      const exe = path.join(work, 'main' + (process.platform === 'win32' ? '.exe' : ''))
      fs.writeFileSync(src, code, 'utf8')
      const compile = await runProcess(isC ? 'gcc' : 'g++', [src, '-o', exe, '-O2', '-std=' + (isC ? 'c11' : 'c++17')], { cwd: work, timeoutSec: Math.min(timeoutSec, 10) })
      if (compile.exitCode !== 0 || compile.spawnError) {
        return result('compile', compile, { durationMs: dur() })
      }
      const run = await runProcess(exe, [], { cwd: work, stdin, timeoutSec })
      return result('run', run, { durationMs: dur(), compileStderr: compile.stderr })
    }
    if (lang === 'java') {
      const file = path.join(work, 'Main.java')
      fs.writeFileSync(file, code, 'utf8')
      const compile = await runProcess('javac', ['Main.java'], { cwd: work, timeoutSec: Math.min(timeoutSec, 10) })
      if (compile.exitCode !== 0 || compile.spawnError) {
        return result('compile', compile, { durationMs: dur() })
      }
      const run = await runProcess('java', ['-cp', work, 'Main'], { cwd: work, stdin, timeoutSec })
      return result('run', run, { durationMs: dur(), compileStderr: compile.stderr })
    }
  } catch (e) {
    return { ok: false, phase: 'compile', stdout: '', stderr: '', exitCode: null, timedOut: false, truncated: false, durationMs: dur(), message: '运行服务出了点岔子喵：' + String(e.message), envIssue: false }
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }) } catch {}
  }
  return { ok: false, phase: 'compile', stdout: '', stderr: '', exitCode: null, timedOut: false, truncated: false, durationMs: dur(), message: '未知错误', envIssue: true }
}

// ------------------------------------------------------------------ HTTP 服务
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.map': 'application/json'
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  if (urlPath === '/') urlPath = '/index.html'
  let file = path.join(DIST, urlPath)
  // 防目录穿越
  if (!file.startsWith(DIST)) { res.writeHead(403); res.end('forbidden'); return }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    // SPA fallback
    file = path.join(DIST, 'index.html')
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('网页还没构建。请先运行 npm run build')
    return
  }
  const ext = path.extname(file)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST,GET,OPTIONS' })
    res.end()
    return
  }
  if (req.method === 'POST' && (req.url === '/api/run' || req.url.startsWith('/api/run?'))) {
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > MAX_CODE + 4096) req.destroy()
    })
    req.on('end', async () => {
      let parsed
      try { parsed = JSON.parse(body) } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'bad json' })); return
      }
      try {
        const out = await enqueue(() => judgeCode(parsed))
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
        res.end(JSON.stringify(out))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: String(e.message) }))
      }
    })
    return
  }
  if (req.url === '/api/env') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' })
    res.end(JSON.stringify(availability))
    return
  }
  serveStatic(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`咪爱编程 · 网页版服务已启动`)
  console.log(`  网页:   http://localhost:${PORT}`)
  console.log(`  判题:   POST http://localhost:${PORT}/api/run`)
  console.log(`  工具链: ${Object.entries(availability).map(([k, v]) => `${k}=${v ? '✓' : '✗'}`).join('  ')}`)
})
