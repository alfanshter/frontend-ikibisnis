<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ShieldOff, Home, ArrowLeft } from '@lucide/vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const router = useRouter()
</script>

<template>
  <AdminLayout>
    <div class="forbidden-wrap">
      <div class="forbidden-icon-wrap">
        <ShieldOff :size="56" class="forbidden-icon" />
      </div>
      <h1 class="forbidden-code">403</h1>
      <h2 class="forbidden-title">Akses Ditolak</h2>
      <p class="forbidden-desc">
        Anda tidak memiliki izin untuk mengakses halaman ini.<br />
        Hubungi administrator jika Anda memerlukan akses.
      </p>
      <div class="forbidden-actions">
        <button class="btn-back" @click="router.back()">
          <ArrowLeft :size="16" />
          Kembali
        </button>
        <button class="btn-home" @click="router.push('/admin')">
          <Home :size="16" />
          Dashboard
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.forbidden-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 40px 20px;
}

.forbidden-icon-wrap {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}

.forbidden-icon {
  color: #ef4444;
}

.forbidden-code {
  font-size: 80px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #ef4444, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 8px;
  letter-spacing: -0.04em;
}

.forbidden-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.forbidden-desc {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 36px;
  max-width: 420px;
}

.forbidden-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-back,
.btn-home {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-back {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}
.btn-back:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.btn-home {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  color: #fff;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.3);
}
.btn-home:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}
</style>
