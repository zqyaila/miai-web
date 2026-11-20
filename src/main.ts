import './miai-browser' // 浏览器端 window.miai 适配层：必须在所有 store 之前加载
import { createApp, watch } from 'vue'
import { createPinia } from 'pinia'
import { createVAutoAnimate } from '@formkit/auto-animate/vue'
import App from './App.vue'
import router from './router'
import { useSettingsStore } from './stores/settings'
import { useZoomStore } from './stores/zoom'
import { useWallUiStore } from './stores/wall-ui'
import { wallUiOf, materialFadeOf } from './shared/wall-ui'
import { startDayClock } from './lib/day-clock'
import './styles/tokens.css'
import './styles/motion.css'
import './styles/md.css'
import './styles/zoom.css'
import './styles/wallpaper.css'
import './styles/web.css'

function motionTokenMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const ms = Number.parseFloat(raw)
  return Number.isFinite(ms) ? ms : fallback
}

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router)

app.directive(
  'auto-animate',
  createVAutoAnimate({
    duration: motionTokenMs('--mi-dur', 180),
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
  })
)

// 先读配置再挂载（splitpanes 的 size 只在挂载那一刻读一次）
const settings = useSettingsStore(pinia)
try {
  await settings.load()
} catch {
  // 读配置失败用默认值继续
}

// 主题：mount 之前铺好，避免深色用户开屏闪白
watch(
  () => settings.config.theme,
  (theme) => {
    document.documentElement.dataset.theme = theme
  },
  { immediate: true }
)

// 缩放
const zoom = useZoomStore(pinia)
watch(
  () => zoom.scale,
  (scale) => document.documentElement.style.setProperty('--mi-zoom', String(scale)),
  { immediate: true }
)

// 壁纸 UI 通透度变量（网页版壁纸关闭时退化为普通面板，这里保持默认值）
const wallUi = useWallUiStore(pinia)
watch(
  [() => wallUi.config, () => settings.config.theme],
  ([ui, theme]) => {
    const active = wallUiOf(ui, theme)
    document.documentElement.style.setProperty('--mi-panel-alpha', `${active.panelAlpha}%`)
    document.documentElement.style.setProperty('--mi-wall-veil', `${active.veil}%`)
    document.documentElement.style.setProperty('--mi-glass-depth', `${ui.glass.shadow}px`)
    document.documentElement.style.setProperty(
      '--mi-material-fade',
      `${(materialFadeOf(active.panelAlpha) * 100).toFixed(1)}%`
    )
    if (active.panelColor) {
      document.documentElement.style.setProperty('--mi-card', active.panelColor)
    } else {
      document.documentElement.style.removeProperty('--mi-card')
    }
  },
  { immediate: true }
)

// 跨零点刷新「今天」
startDayClock()

app.mount('#app')
