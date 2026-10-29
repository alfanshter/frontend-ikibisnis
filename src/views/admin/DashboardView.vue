<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import StatCard from '@/components/admin/StatCard.vue'
import CashFlowChart from '@/components/admin/CashFlowChart.vue'
import ProjectStatusChart from '@/components/admin/ProjectStatusChart.vue'
import ProjectTable from '@/components/admin/ProjectTable.vue'
import {
  Briefcase,
  CheckCircle,
  DollarSign,
  UserPlus,
  RefreshCw,
} from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { proyeksApi, transactionsApi, leadsApi } from '@/services/api'
import type { ProyekStatsResponse, TransactionStatsResponse, LeadStatsResponse } from '@/services/api'

const auth = useAuthStore()

const today = new Date().toLocaleDateString('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const loading = ref(true)
const error = ref<string | null>(null)

const proyekStats = ref<ProyekStatsResponse | null>(null)
const txStats = ref<TransactionStatsResponse | null>(null)
const leadStats = ref<LeadStatsResponse | null>(null)

// ── Computed stat values ────────────────────────────────────────────────────

const proyekAktif = computed(() => {
  if (!proyekStats.value) return '—'
  const berjalan   = proyekStats.value.by_status.find(s => s.status === 'Berjalan')?.count ?? 0
  const qc         = proyekStats.value.by_status.find(s => s.status === 'QC')?.count ?? 0
  const serahTerima = proyekStats.value.by_status.find(s => s.status === 'Serah Terima')?.count ?? 0
  return String(berjalan + qc + serahTerima)
})

const proyekSelesai = computed(() => {
  if (!proyekStats.value) return '—'
  return String(proyekStats.value.by_status.find(s => s.status === 'Selesai')?.count ?? 0)
})

const currentYear = new Date().getFullYear()

const pendapatanBulanIni = computed(() => {
  if (!txStats.value) return '—'
  const raw = txStats.value.current_period.total_masuk
  if (raw >= 1_000_000_000) return `Rp ${(raw / 1_000_000_000).toFixed(1)}M`
  if (raw >= 1_000_000) return `Rp ${(raw / 1_000_000).toFixed(0)}jt`
  if (raw >= 1_000) return `Rp ${(raw / 1_000).toFixed(0)}rb`
  return `Rp ${raw}`
})

const leadsBulanIni = computed(() => {
  if (!leadStats.value) return '—'
  return String(leadStats.value.total)
})

const pendapatanTrend = computed(() => {
  if (!txStats.value || txStats.value.chart_data.length < 2) {
    return { type: 'neutral' as const, text: 'Bulan ini' }
  }
  const data = txStats.value.chart_data
  const last = data[data.length - 1]
  const prev = data[data.length - 2]
  if (!prev || prev.masuk === 0) return { type: 'neutral' as const, text: 'Bulan ini' }
  const pct = ((last.masuk - prev.masuk) / prev.masuk) * 100
  const sign = pct >= 0 ? '+' : ''
  return {
    type: (pct >= 0 ? 'up' : 'down') as 'up' | 'down' | 'neutral',
    text: `${sign}${pct.toFixed(0)}% vs ${prev.month}`,
  }
})

// ── Fetch all ────────────────────────────────────────────────────────────────

async function fetchDashboard() {
  loading.value = true
  error.value = null
  const now = new Date()
  try {
    const [ps, ts, ls] = await Promise.all([
      proyeksApi.stats(),
      transactionsApi.stats({ month: now.getMonth() + 1, year: now.getFullYear() }),
      leadsApi.stats(),
    ])
    proyekStats.value = ps
    txStats.value = ts
    leadStats.value = ls
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gagal memuat data dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchDashboard)
</script>

<template>
  <AdminLayout>
    <!-- Page Header -->
    <div class="page-header">
      <div style="display:flex; align-items:center; gap:10px;">
        <h1>Selamat Datang, {{ auth.userName || 'Admin' }}</h1>
        <button
          @click="fetchDashboard"
          :disabled="loading"
          style="background:none;border:none;cursor:pointer;color:#8892a4;padding:4px;display:flex;align-items:center;opacity:0.7;transition:opacity .2s;"
          title="Refresh data"
        >
          <RefreshCw :size="15" :class="{ 'spin-icon': loading }" />
        </button>
      </div>
      <p>Ringkasan operasional PT Putra Wisanggeni Satu — {{ today }}</p>
      <p v-if="error" style="color:#ef4444;font-size:13px;margin-top:4px;">⚠ {{ error }}</p>
    </div>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <StatCard
        :value="loading ? '…' : proyekAktif"
        label="Proyek Aktif"
        :subtext="loading ? '' : 'Berjalan + QC + Serah Terima'"
        subtext-class="trend-up"
        trend-type="up"
        icon-bg-class="icon-orange"
      >
        <template #icon>
          <Briefcase :size="18" />
        </template>
      </StatCard>

      <StatCard
        :value="loading ? '…' : proyekSelesai"
        label="Proyek Selesai"
        :subtext="loading ? '' : `Tahun ${currentYear}`"
        subtext-class="trend-up"
        trend-type="up"
        icon-bg-class="icon-green"
      >
        <template #icon>
          <CheckCircle :size="18" />
        </template>
      </StatCard>

      <StatCard
        :value="loading ? '…' : pendapatanBulanIni"
        label="Pendapatan Bulan ini"
        :subtext="loading ? '' : pendapatanTrend.text"
        :subtext-class="pendapatanTrend.type === 'up' ? 'trend-up' : pendapatanTrend.type === 'down' ? 'trend-down' : 'trend-neutral'"
        :trend-type="pendapatanTrend.type"
        icon-bg-class="icon-blue"
      >
        <template #icon>
          <DollarSign :size="18" />
        </template>
      </StatCard>

      <StatCard
        :value="loading ? '…' : leadsBulanIni"
        label="Total Leads"
        :subtext="loading ? '' : 'Semua status lead'"
        subtext-class="trend-up"
        trend-type="up"
        icon-bg-class="icon-purple"
      >
        <template #icon>
          <UserPlus :size="18" />
        </template>
      </StatCard>
    </div>

    <!-- Charts -->
    <div class="charts-grid">
      <CashFlowChart :stats="txStats" :loading="loading" />
      <ProjectStatusChart :stats="proyekStats" :loading="loading" />
    </div>

    <!-- Project Table -->
    <ProjectTable />
  </AdminLayout>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.spin-icon {
  animation: spin 1s linear infinite;
}
</style>
