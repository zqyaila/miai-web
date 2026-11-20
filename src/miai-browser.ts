/**
 * 浏览器端 window.miai 适配层
 * ------------------------------------------------------------
 * 原应用是 Electron 桌面端，渲染层通过 preload 暴露的 window.miai
 * 调用主进程能力（文件存储、编译运行、壁纸、桌宠、云同步……）。
 * 网页版没有主进程，这里用浏览器能力复刻同一份接口：
 *   - 存储类：localStorage（带 atom 读写戳，语义对齐主进程的 json-store）
 *   - 代码运行：POST /api/run 转发给本地判题服务（Node + gcc/g++/javac/python）
 *   - 壁纸 / 桌宠 / IDE / 云 / AI：桌面专属或无后端，返回安全的空值 / 失败值
 * 渲染层组件一行都不用改，拿到的数据形状与桌面端一致。
 */
import {
  DEFAULT_PROFILE,
  DEFAULT_APP_CONFIG,
  DEFAULT_CHALLENGE_RECORD
} from './shared/types'

const PREFIX = 'miai-web:'

/** 通用 JSON 文档读写（带戳，模拟主进程 doc-write 协议） */
function readDoc<T>(key: string, fallback: T): { data: T; stamp: { epoch: number; rev: number } } {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw) {
      const box = JSON.parse(raw)
      if (box && typeof box === 'object' && 'data' in box && 'stamp' in box) {
        return { data: box.data as T, stamp: box.stamp }
      }
    }
  } catch { /* 坏档按不存在处理 */ }
  return { data: fallback, stamp: { epoch: Date.now(), rev: 0 } }
}

function writeDoc<T>(key: string, data: T, stamp?: { epoch: number; rev: number } | null): { ok: true; stamp: { epoch: number; rev: number } } {
  const cur = readDoc<T>(key, data)
  // 无条件下写（stamp 不传）或戳匹配时才写；网页端单用户单标签，冲突极少，
  // 这里宽松处理：总是接受，用新 rev 返回，避免防抖保存被假冲突卡住。
  const next = { epoch: cur.stamp.epoch, rev: cur.stamp.rev + 1 }
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, stamp: next }))
  } catch { /* 配额满等：静默，数据仍在内存 */ }
  return { ok: true, stamp: next }
}

/** 只取纯数据的便捷函数 */
function dataOf<T>(key: string, fallback: T): T {
  return readDoc<T>(key, fallback).data
}

function okCloud<T>(data: T) { return { ok: true as const, data } }
function failCloud(reason = '网页版暂未开启此功能') {
  return { ok: false as const, failure: { code: 'UNSUPPORTED', message: reason } }
}

/** 每天一局的挑战存档：按 dayKey 存整份 ChallengeRecord */
const CHALLENGE_KEY = 'challenge'

const miai = {
  getVersion: async (): Promise<string> => '0.1.0-web',

  // ---- 档案
  getProfile: async () => readDoc('profile', structuredClone(DEFAULT_PROFILE)),
  saveProfile: async (profile: unknown, stamp?: { epoch: number; rev: number } | null) =>
    writeDoc('profile', profile, stamp),

  // ---- 错题本
  getWrongbook: async () => dataOf<unknown[]>('wrongbook', []),
  recordWrongbook: async (_items: unknown[]): Promise<string[]> => [],
  clearWrongbook: async (_keys: string[]): Promise<void> => {
    const cur = dataOf<{ key: string }[]>('wrongbook', [])
    writeDoc('wrongbook', cur.filter((e) => !_keys.includes(e.key)))
  },
  updateWrongbook: async (updates: { key: string; patch: Record<string, unknown> }[]) => {
    let cur = dataOf<Record<string, unknown>[]>('wrongbook', [])
    for (const u of updates) {
      cur = cur.map((e) => (e.key === u.key ? { ...e, ...u.patch } : e))
    }
    writeDoc('wrongbook', cur)
    return cur
  },

  // ---- 收藏（题）
  getFavorites: async () => readDoc('favorites', { version: 1, items: [] }),
  saveFavorites: async (file: unknown, stamp?: { epoch: number; rev: number } | null) =>
    writeDoc('favorites', file, stamp),

  // ---- 备忘录
  memo: {
    get: async () => readDoc('memo', { version: 1, notes: [] }),
    save: async (file: unknown, stamp?: { epoch: number; rev: number } | null) =>
      writeDoc('memo', file, stamp)
  },

  // ---- 练习史
  recordPractice: async (input: { items: { key: string; ok: boolean }[] }) => {
    const cur = dataOf<{ version: number; records: unknown[] }>('practice', { version: 1, records: [] })
    const next = {
      ...cur,
      records: [...(cur.records || []), ...input.items.map((it) => ({ ...it, at: Date.now() }))]
    }
    writeDoc('practice', next)
    return next
  },
  getPractice: async () => dataOf('practice', { version: 1, records: [] }),

  // ---- 奖励 / 签到（主进程合并逻辑的浏览器简化版）
  grantReward: async () => {
    const profile = readDoc<typeof DEFAULT_PROFILE>('profile', structuredClone(DEFAULT_PROFILE))
    const rewards = profile.data.rewards
    const stamp = writeDoc('profile', profile.data).stamp
    return { rewards, stamp, kind: 'granted' as const }
  },
  checkinSubmit: async (day: string) => {
    const profile = readDoc<typeof DEFAULT_PROFILE>('profile', structuredClone(DEFAULT_PROFILE))
    const checkin = profile.data.checkin
    const awarded = checkin.lastDate !== day
    if (awarded) {
      profile.data.checkin = {
        ...checkin,
        lastDate: day,
        totalDays: (checkin.totalDays || 0) + 1,
        streakDays: (checkin.streakDays || 0) + 1
      }
      writeDoc('profile', profile.data)
    }
    return { awarded, riceGranted: false, riceCredited: 0, streakReset: false }
  },
  saveRewardImage: async () => ({ ok: false as const, reason: 'unsupported' }),
  rewardOverrides: async () => ({ dir: '', images: {} }),
  openRewardFolder: async () => ({ ok: false, reason: 'unsupported' }),

  // ---- 设置
  getConfig: async () => {
    const full = dataOf<Record<string, unknown>>('config', structuredClone(DEFAULT_APP_CONFIG) as unknown as Record<string, unknown>)
    return { ...full, hasKey: false, ai: { ...(full.ai as object), hasKey: false } }
  },
  saveConfig: async (config: unknown) => {
    const cur = dataOf<Record<string, unknown>>('config', {})
    writeDoc('config', { ...cur, ...(config as object) })
  },
  detectEnv: async () => ({
    checkedAt: Date.now(),
    gcc: true, gpp: true, javac: true, java: true, python: true,
    available: ['c', 'cpp', 'java', 'python'],
    versions: {}
  }),

  // ---- 代码运行（网页版核心：转发到本地判题服务）
  runCode: async (req: { lang: string; code: string; stdin?: string; timeoutSec?: number }) => {
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    } catch (e) {
      return {
        ok: false,
        phase: 'compile' as const,
        stdout: '',
        stderr: '',
        exitCode: null,
        timedOut: false,
        truncated: false,
        durationMs: 0,
        message: '判题服务未连接。请在项目目录运行 `node server.mjs` 后再试（选择题/填空题无需此服务）。',
        envIssue: true
      }
    }
  },

  // ---- AI（网页版无密钥，返回失败值，界面有兜底）
  aiExplain: async () => failCloud(),
  aiGenerateQuestions: async () => failCloud(),
  aiTestConnection: async () => failCloud(),
  aiBalance: async () => failCloud(),
  aiPoolModels: async () => failCloud(),
  aiProviderModels: async () => failCloud(),
  aiCancel: async () => {},

  // ---- 每日挑战
  getChallenge: async (dateKey: string) => {
    const rec = dataOf<{ days: Record<string, unknown> }>('challenge', structuredClone(DEFAULT_CHALLENGE_RECORD) as unknown as { days: Record<string, unknown> })
    return { dateKey, day: rec.days?.[dateKey] ?? null, excludeKeys: [] }
  },
  saveChallenge: async (day: { dateKey: string }) => {
    const rec = dataOf<{ version: number; days: Record<string, unknown> }>('challenge', structuredClone(DEFAULT_CHALLENGE_RECORD) as unknown as { version: number; days: Record<string, unknown> })
    rec.days[day.dateKey] = day
    writeDoc(CHALLENGE_KEY, rec)
  },

  // ---- 本地 IDE / 导出（网页版不支持）
  pickExePath: async () => ({ ok: false, reason: 'cancelled' }),
  openInIde: async () => ({ ok: false, reason: 'unconfigured' }),
  exportCode: async () => ({ ok: false, reason: 'unsupported' }),
  detectIde: async () => ({ found: [] }),

  // ---- 壁纸（网页版用 CSS 渐变背景，全部返回空）
  listWallpapers: async () => ({ available: false, items: [] }),
  readWallpaperProps: async () => ({ project: null }),
  importWallpaper: async () => ({ ok: false, reason: 'cancelled' }),
  cursor: {
    get: async () => ({ normal: null, click: null }),
    import: async () => ({ ok: false, reason: 'unsupported' }),
    clear: async () => ({ ok: false }),
    updateHotspot: async () => ({ ok: false })
  },
  onWallpaperState: (_cb: (s: unknown) => void) => () => {},
  getWallpaperState: async () => ({ focused: true, minimized: false, hidden: false }),
  onAppNav: (_cb: (p: unknown) => void) => () => {},
  onAppCloseRequest: (_cb: () => void) => () => {},
  ackAppClose: () => {},
  confirmAppClose: () => {},
  cancelAppClose: () => {},
  onSplashStats: (_cb: (s: unknown) => void) => () => {},
  getSplashStats: async () => null,
  listSplashMaterials: async () => [],
  importSplash: async () => ({ ok: false, reason: 'cancelled' }),

  // ---- 桌宠（网页版不做独立窗口，返回未启用态）
  petInit: async () => null,
  petAct: async (action: unknown) => ({ enabled: false, action }),
  petReportRun: () => {},
  petEvent: () => {},
  petPlead: async () => {},
  petReportWorkRect: () => {},
  onPetState: (_cb: (s: unknown) => void) => () => {},
  onConfigExternal: (_cb: (cfg: unknown) => void) => () => {},

  // ---- 云账号 / 同步（无后端，统一失败；离线本地功能完全可用）
  cloud: {
    register: async () => failCloud(),
    login: async () => failCloud(),
    logout: async () => failCloud(),
    logoutLocal: async () => okCloud(null),
    session: async () => okCloud(null),
    recoverQuestion: async () => failCloud(),
    recoverVerify: async () => failCloud(),
    recoverReset: async () => failCloud(),
    settleChallenge: async () => ({ queued: false }),
    activate: async () => failCloud(),
    activatePreview: async () => failCloud(),
    state: async () => ({ signedIn: false, activated: false }),
    syncNow: async () => ({ sync: { skipped: true }, uplink: { skipped: true } }),
    syncCancel: async () => {},
    leaderboard: async () => failCloud(),
    leaderboardOptIn: async () => failCloud(),
    updateUsername: async () => failCloud(),
    pickAvatar: async () => okCloud(null),
    uploadAvatar: async () => failCloud(),
    getAvatars: async () => ({ images: {}, dead: [] })
  }
}

// 挂到 window，供渲染层调用
;(window as unknown as { miai: typeof miai }).miai = miai

export default miai
