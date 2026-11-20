<script setup lang="ts">
/**
 * 壁纸层 —— 网页版桩组件。
 * 桌面版的视频/WebGL 壁纸依赖 Electron 的 miai-wall:// 协议与独立渲染进程，
 * 浏览器无法使用。这里退化为一层柔和的 CSS 渐变背景，保证布局门控成立，
 * 其余组件无需改动。
 */
</script>

<template>
  <div class="web-wallpaper" aria-hidden="true">
    <div class="web-wallpaper__orb web-wallpaper__orb--a" />
    <div class="web-wallpaper__orb web-wallpaper__orb--b" />
    <div class="web-wallpaper__orb web-wallpaper__orb--c" />
  </div>
</template>

<style scoped>
.web-wallpaper {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background:
    radial-gradient(1200px 800px at 12% -10%, #ffe9f2 0%, transparent 60%),
    radial-gradient(1000px 700px at 100% 0%, #e8f0ff 0%, transparent 55%),
    linear-gradient(180deg, #fffaf7 0%, #f7f3ef 100%);
}
:global(:root[data-theme='dark']) .web-wallpaper {
  background:
    radial-gradient(1200px 800px at 12% -10%, #2a1f2b 0%, transparent 60%),
    radial-gradient(1000px 700px at 100% 0%, #1b2233 0%, transparent 55%),
    linear-gradient(180deg, #14131a 0%, #0f0e14 100%);
}
.web-wallpaper__orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.5;
  animation: web-orb 18s ease-in-out infinite alternate;
}
.web-wallpaper__orb--a {
  width: 380px; height: 380px; left: 8%; top: 18%;
  background: radial-gradient(circle, #ffb6d5, transparent 70%);
}
.web-wallpaper__orb--b {
  width: 320px; height: 320px; right: 12%; top: 8%;
  background: radial-gradient(circle, #a9c8ff, transparent 70%);
  animation-delay: -6s;
}
.web-wallpaper__orb--c {
  width: 300px; height: 300px; right: 28%; bottom: 6%;
  background: radial-gradient(circle, #ffe2a9, transparent 70%);
  animation-delay: -12s;
}
:global(:root[data-theme='dark']) .web-wallpaper__orb { opacity: 0.22; }
@keyframes web-orb {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(40px, -30px, 0) scale(1.15); }
}
@media (prefers-reduced-motion: reduce) {
  .web-wallpaper__orb { animation: none; }
}
</style>
