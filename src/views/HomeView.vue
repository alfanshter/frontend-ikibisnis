<script setup lang="ts">
import { useRouter } from 'vue-router'
import { LogIn, ArrowRight } from '@lucide/vue'

const router = useRouter()

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="landing-page">
    <!-- Navbar -->
    <nav class="navbar">
      <div class="nav-brand">
        <div class="brand-icon">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="url(#lg-nav)" />
            <path d="M16 9L22 12.5V19.5L16 23L10 19.5V12.5L16 9Z" fill="rgba(255,255,255,0.3)" />
            <defs>
              <linearGradient id="lg-nav" x1="2" y1="2" x2="30" y2="30">
                <stop stop-color="#6366f1"/>
                <stop offset="1" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="brand-text">Ikibisnis</span>
      </div>
      <div class="nav-actions">
        <button class="btn-nav-login" @click="goToLogin">
          Masuk <ArrowRight :size="16" />
        </button>
      </div>
    </nav>

    <!-- Hero Section -->
    <main class="hero">
      <div class="hero-content">
        <div class="badge">PT Putra Wisanggeni Satu</div>
        <h1 class="hero-title">
          Sistem Manajemen<br />
          <span class="text-gradient">Terintegrasi</span>
        </h1>
        <p class="hero-subtitle">
          Platform internal untuk mengelola operasional, keuangan, dan tim dengan lebih efisien, transparan, dan profesional.
        </p>
        <div class="hero-actions">
          <button class="btn-primary-large" @click="goToLogin">
            Masuk ke Dashboard
            <LogIn :size="18" />
          </button>
        </div>
      </div>

      <!-- Abstract Graphic -->
      <div class="hero-graphic">
        <div class="glass-card">
          <div class="glass-header">
            <div class="dot red"></div>
            <div class="dot yellow"></div>
            <div class="dot green"></div>
          </div>
          <div class="glass-body">
            <div class="line w-3/4"></div>
            <div class="line w-1/2"></div>
            <div class="line w-full"></div>
            <div class="line w-5/6"></div>
          </div>
        </div>
        
        <div class="floating-orb orb-purple"></div>
        <div class="floating-orb orb-blue"></div>
      </div>
    </main>

    <!-- Background Elements -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>
  </div>
</template>

<style scoped>
/* ── Base ─────────────────────────────────────────────── */
.landing-page {
  min-height: 100vh;
  background-color: #0f172a;
  color: #f8fafc;
  font-family: 'Inter', sans-serif;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Navbar ───────────────────────────────────────────── */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 48px;
  position: relative;
  z-index: 10;
}
@media (max-width: 768px) {
  .navbar { padding: 20px 24px; }
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
.brand-text {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.btn-nav-login {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 10px 20px;
  border-radius: 100px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-nav-login:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

/* ── Hero Section ─────────────────────────────────────── */
.hero {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 60px;
  padding: 40px 80px;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
}
@media (max-width: 992px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 40px 24px;
    gap: 40px;
  }
  .hero-content {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

.badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  color: #818cf8;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;
  letter-spacing: 0.02em;
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 24px;
  letter-spacing: -0.03em;
}
@media (max-width: 768px) {
  .hero-title { font-size: 42px; }
}

.text-gradient {
  background: linear-gradient(135deg, #a78bfa, #38bdf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 18px;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0 0 40px;
  max-width: 500px;
}

.btn-primary-large {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px -10px rgba(99, 102, 241, 0.5);
}
.btn-primary-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 15px 35px -10px rgba(99, 102, 241, 0.7);
}

/* ── Hero Graphic ─────────────────────────────────────── */
.hero-graphic {
  position: relative;
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glass-card {
  width: 320px;
  background: rgba(30, 41, 59, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 2;
  transform: rotate(-2deg);
  animation: float 6s ease-in-out infinite;
}

.glass-header {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }

.glass-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.line {
  height: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 100px;
}
.w-3\/4 { width: 75%; }
.w-1\/2 { width: 50%; }
.w-full { width: 100%; }
.w-5\/6 { width: 83%; }

.floating-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  z-index: 1;
}
.orb-purple {
  width: 250px;
  height: 250px;
  background: rgba(139, 92, 246, 0.4);
  top: -20px;
  right: 20px;
  animation: orb-move 8s ease-in-out infinite alternate;
}
.orb-blue {
  width: 200px;
  height: 200px;
  background: rgba(56, 189, 248, 0.4);
  bottom: 0;
  left: 40px;
  animation: orb-move 6s ease-in-out infinite alternate-reverse;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-15px) rotate(1deg); }
}
@keyframes orb-move {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 30px) scale(1.1); }
}

/* ── Background ───────────────────────────────────────── */
.bg-grid {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at center, black, transparent 80%);
  z-index: 0;
  pointer-events: none;
}

.bg-glow {
  position: absolute;
  top: -20%;
  left: -10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  filter: blur(100px);
  z-index: 0;
  pointer-events: none;
}
</style>
