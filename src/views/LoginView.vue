<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Eye, EyeOff, LogIn, Loader2 } from '@lucide/vue'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  if (!email.value || !password.value) {
    errorMsg.value = 'Email dan password wajib diisi.'
    return
  }
  try {
    await auth.login(email.value, password.value)
    router.push('/admin')
  } catch (e) {
    errorMsg.value = e instanceof Error ? e.message : 'Login gagal.'
  }
}
</script>

<template>
  <div class="login-page">
    <!-- Background orbs -->
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="orb orb-3"></div>

    <div class="login-card">
      <!-- Brand -->
      <div class="login-brand">
        <div class="brand-icon">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="url(#lg)" />
            <path d="M16 9L22 12.5V19.5L16 23L10 19.5V12.5L16 9Z" fill="rgba(255,255,255,0.3)" />
            <defs>
              <linearGradient id="lg" x1="2" y1="2" x2="30" y2="30">
                <stop stop-color="#6366f1"/>
                <stop offset="1" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div class="brand-text">
          <h1>Ikibisnis</h1>
          <p>Sistem Manajemen Internal</p>
        </div>
      </div>

      <!-- Heading -->
      <div class="login-heading">
        <h2>Selamat Datang</h2>
        <p>Masuk dengan akun Anda untuk melanjutkan</p>
      </div>

      <!-- Error -->
      <div v-if="errorMsg" class="login-error" role="alert">
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            placeholder="nama@contoh.com"
            autocomplete="email"
            :disabled="auth.loading"
          />
        </div>

        <div class="form-group">
          <label for="login-password">Password</label>
          <div class="password-wrap">
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
              :disabled="auth.loading"
            />
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
            >
              <EyeOff v-if="showPassword" :size="16" />
              <Eye v-else :size="16" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="btn-login"
          :disabled="auth.loading"
          id="btn-login-submit"
        >
          <Loader2 v-if="auth.loading" :size="18" class="spinner" />
          <LogIn v-else :size="18" />
          <span>{{ auth.loading ? 'Memproses...' : 'Masuk' }}</span>
        </button>
      </form>

      <p class="login-footer">© {{ new Date().getFullYear() }} Ikibisnis &middot; Semua hak dilindungi</p>
    </div>
  </div>
</template>

<style scoped>
/* ── Page ─────────────────────────────────────────────── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d1117;
  position: relative;
  overflow: hidden;
  padding: 20px;
}

/* ── Animated background orbs ─────────────────────────── */
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  animation: orb-float 8s ease-in-out infinite alternate;
}
.orb-1 {
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%);
  top: -80px; left: -80px;
  animation-delay: 0s;
}
.orb-2 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%);
  bottom: -60px; right: -60px;
  animation-delay: -3s;
}
.orb-3 {
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%);
  bottom: 30%; left: 20%;
  animation-delay: -6s;
}
@keyframes orb-float {
  from { transform: scale(1) translate(0, 0); }
  to   { transform: scale(1.12) translate(20px, -20px); }
}

/* ── Card ─────────────────────────────────────────────── */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  background: rgba(22, 27, 41, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 40px 36px 32px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

/* ── Brand ────────────────────────────────────────────── */
.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 32px;
}
.brand-icon {
  width: 52px; height: 52px;
  border-radius: 14px;
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.2);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.brand-text h1 {
  font-size: 20px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0;
  line-height: 1.2;
}
.brand-text p {
  font-size: 12px;
  color: #64748b;
  margin: 2px 0 0;
}

/* ── Heading ──────────────────────────────────────────── */
.login-heading {
  margin-bottom: 24px;
}
.login-heading h2 {
  font-size: 22px;
  font-weight: 700;
  color: #f1f5f9;
  margin: 0 0 4px;
}
.login-heading p {
  font-size: 13.5px;
  color: #94a3b8;
  margin: 0;
}

/* ── Error ────────────────────────────────────────────── */
.login-error {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.28);
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 13px;
  color: #fca5a5;
  margin-bottom: 20px;
}

/* ── Form ─────────────────────────────────────────────── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
}

.form-group input {
  width: 100%;
  padding: 11px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  color: #f1f5f9;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
  font-family: inherit;
}
.form-group input::placeholder { color: #475569; }
.form-group input:focus {
  outline: none;
  border-color: rgba(99,102,241,0.6);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
.form-group input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Password toggle ──────────────────────────────────── */
.password-wrap {
  position: relative;
}
.password-wrap input {
  padding-right: 44px;
}
.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}
.password-toggle:hover { color: #94a3b8; }

/* ── Submit button ────────────────────────────────────── */
.btn-login {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(99,102,241,0.35);
  font-family: inherit;
}
.btn-login:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(99,102,241,0.45);
}
.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ── Spinner ──────────────────────────────────────────── */
.spinner {
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Footer ───────────────────────────────────────────── */
.login-footer {
  text-align: center;
  font-size: 12px;
  color: #475569;
  margin: 24px 0 0;
}
</style>
