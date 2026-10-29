<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { TrendingUp, TrendingDown, DollarSign, Activity, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, RefreshCw, Plus, AlertCircle } from '@lucide/vue'
import { reportsApi, type ArusKasResponse, type ArusKasSection } from '@/services/api'
import { formatRp, formatRupiahShort } from '@/utils/currency'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRp = (n: number | string | null | undefined) => formatRp(n)
const fmtRpShort = (n: number | string | null | undefined) => formatRupiahShort(n)

// ─── Period picker ────────────────────────────────────────────────────────────
const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear  = ref(now.getFullYear())

const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthNames[i] }))
const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

// ─── State ───────────────────────────────────────────────────────────────────
const loading  = ref(false)
const error    = ref<string | null>(null)
const data     = ref<ArusKasResponse | null>(null)

// Expand/collapse
const expanded = ref<Record<string, boolean>>({ operasional: true, investasi: true, pendanaan: true })
const toggle = (key: string) => { expanded.value[key] = !expanded.value[key] }

// ─── Computed from API data ───────────────────────────────────────────────────
const sections   = computed<ArusKasSection[]>(() => data.value?.sections ?? [])
const netCashFlow = computed(() => data.value?.net_cash_flow ?? 0)
const saldoAwal  = computed(() => data.value?.saldo_awal ?? 0)
const saldoAkhir = computed(() => data.value?.saldo_akhir ?? 0)
const totalMasuk = computed(() =>
  sections.value.flatMap(s => s.items).filter(i => i.amount > 0).reduce((s, i) => s + i.amount, 0)
)
const totalKeluar = computed(() =>
  sections.value.flatMap(s => s.items).filter(i => i.amount < 0).reduce((s, i) => s + Math.abs(i.amount), 0)
)

// Chart
const trend      = computed(() => data.value?.trend ?? [])
const chartMax   = computed(() => Math.max(...trend.value.map(d => Math.abs(d.net_jt)), 10) + 5)
const barH = (v: number) => (Math.abs(v) / chartMax.value) * 110

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  error.value   = null
  try {
    data.value = await reportsApi.arusKas({ month: selectedMonth.value, year: selectedYear.value })
    // Initialize expanded state for each section
    data.value?.sections.forEach(s => {
      if (!(s.key in expanded.value)) expanded.value[s.key] = true
    })
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat laporan arus kas.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch([selectedMonth, selectedYear], fetchData)
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Arus Kas</h1>
        <p>Laporan cashflow masuk dan keluar perusahaan</p>
      </div>
      <div class="ak-toolbar-right">
        <!-- Period Selectors -->
        <div class="ak-period-wrap">
          <select v-model="selectedMonth" class="ak-period-select">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <ChevronDown :size="13" class="ak-period-arrow" />
        </div>
        <div class="ak-period-wrap">
          <select v-model="selectedYear" class="ak-period-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <ChevronDown :size="13" class="ak-period-arrow" />
        </div>
        <button class="ak-refresh-btn" @click="fetchData" :disabled="loading" title="Refresh">
          <RefreshCw :size="14" :class="{ 'spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="ak-error-box">
      <AlertCircle :size="16" />
      <span>{{ error }}</span>
    </div>

    <!-- Loading Skeleton -->
    <template v-if="loading && !data">
      <div class="ak-stat-grid">
        <div v-for="i in 4" :key="i" class="ak-stat-card sk-card"><div class="sk-line sk-h20 sk-w60" /><div class="sk-line sk-h12 sk-w40 sk-mt6" /></div>
      </div>
      <div class="card sk-chart-block" />
    </template>

    <template v-else-if="data">
      <!-- Stat Cards -->
      <div class="ak-stat-grid">
        <div class="ak-stat-card">
          <div class="ak-stat-icon" style="background: rgba(34,197,94,0.12); color: #22c55e;">
            <TrendingUp :size="18" />
          </div>
          <div>
            <div class="ak-stat-label">Total Kas Masuk</div>
            <div class="ak-stat-val" style="color: #22c55e;">{{ fmtRp(totalMasuk) }}</div>
          </div>
        </div>
        <div class="ak-stat-card">
          <div class="ak-stat-icon" style="background: rgba(239,68,68,0.12); color: #ef4444;">
            <TrendingDown :size="18" />
          </div>
          <div>
            <div class="ak-stat-label">Total Kas Keluar</div>
            <div class="ak-stat-val" style="color: #ef4444;">{{ fmtRp(totalKeluar) }}</div>
          </div>
        </div>
        <div class="ak-stat-card">
          <div class="ak-stat-icon" :style="{ background: netCashFlow >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: netCashFlow >= 0 ? '#22c55e' : '#ef4444' }">
            <Activity :size="18" />
          </div>
          <div>
            <div class="ak-stat-label">Net Cash Flow</div>
            <div class="ak-stat-val" :style="{ color: netCashFlow >= 0 ? '#22c55e' : '#ef4444' }">
              {{ netCashFlow >= 0 ? '+' : '' }}{{ fmtRp(netCashFlow) }}
            </div>
          </div>
        </div>
        <div class="ak-stat-card">
          <div class="ak-stat-icon" style="background: rgba(245,158,11,0.12); color: var(--accent-orange);">
            <DollarSign :size="18" />
          </div>
          <div>
            <div class="ak-stat-label">Saldo Akhir</div>
            <div class="ak-stat-val" style="color: var(--accent-orange);">{{ fmtRp(saldoAkhir) }}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Awal: {{ fmtRp(saldoAwal) }}</div>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="card" style="padding: 20px 24px; margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px;">
          Tren Net Cash Flow (6 Bulan)
        </div>
        <div class="ak-chart">
          <div class="ak-chart-bars">
            <div v-for="d in trend" :key="d.month + d.raw_year" class="ak-chart-col">
              <div class="ak-bar-wrap">
                <div
                  class="ak-bar"
                  :style="{
                    height: barH(d.net_jt) + 'px',
                    background: d.net >= 0 ? 'linear-gradient(180deg,#22c55e,#16a34a)' : 'linear-gradient(180deg,#ef4444,#dc2626)',
                    opacity: 0.85,
                  }"
                  :title="fmtRp(d.net)"
                />
              </div>
              <div class="ak-chart-label">{{ d.month }}</div>
              <div class="ak-chart-val" :style="{ color: d.net >= 0 ? '#22c55e' : '#ef4444' }">
                {{ d.net_jt > 0 ? '+' : '' }}{{ d.net_jt }}jt
              </div>
            </div>
          </div>
        </div>
        <!-- Empty trend placeholder -->
        <div v-if="trend.length === 0" class="ak-empty">
          <Activity :size="24" style="color: var(--text-muted);" />
          <span>Belum ada data transaksi</span>
        </div>
      </div>

      <!-- Sections -->
      <div class="ak-sections">
        <div v-for="section in sections" :key="section.key" class="card ak-section">
          <!-- Section Header -->
          <div class="ak-section-header" @click="toggle(section.key)">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="ak-section-dot" :style="{ background: section.color }" />
              <span class="ak-section-title">{{ section.title }}</span>
              <span class="ak-section-count">({{ section.items.length }} transaksi)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="ak-section-total" :style="{ color: section.subtotal >= 0 ? '#22c55e' : '#ef4444' }">
                {{ section.subtotal >= 0 ? '+' : '' }}{{ fmtRp(section.subtotal) }}
              </div>
              <component :is="expanded[section.key] ? ChevronUp : ChevronDown" :size="16" style="color: var(--text-muted);" />
            </div>
          </div>

          <!-- Items -->
          <div v-if="expanded[section.key]" class="ak-section-items">
            <div v-if="section.items.length === 0" class="ak-section-empty">
              <span>Tidak ada transaksi di periode ini</span>
            </div>
            <div v-for="(item, ii) in section.items" :key="ii" class="ak-item">
              <div class="ak-item-icon" :class="item.amount >= 0 ? 'ak-in' : 'ak-out'">
                <component :is="item.amount >= 0 ? ArrowUpRight : ArrowDownRight" :size="13" />
              </div>
              <div class="ak-item-label">{{ item.label }}</div>
              <div class="ak-item-cat" v-if="item.category">{{ item.category }}</div>
              <div class="ak-item-amount" :class="item.amount >= 0 ? 'color-in' : 'color-out'">
                {{ item.amount >= 0 ? '+' : '' }}{{ fmtRp(item.amount) }}
              </div>
            </div>
            <!-- Subtotal -->
            <div class="ak-subtotal">
              <span>Subtotal {{ section.title }}</span>
              <span :style="{ color: section.subtotal >= 0 ? '#22c55e' : '#ef4444', fontWeight: '700' }">
                {{ section.subtotal >= 0 ? '+' : '' }}{{ fmtRp(section.subtotal) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Empty state if no sections have items -->
        <div v-if="sections.every(s => s.items.length === 0)" class="ak-no-data card">
          <Plus :size="28" style="color: var(--text-muted);" />
          <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Belum ada transaksi</div>
          <div style="font-size: 12px; color: var(--text-muted);">Tambahkan transaksi di menu Pembukuan untuk periode ini</div>
        </div>
      </div>

      <!-- Bottom Summary -->
      <div class="card ak-summary-box">
        <div class="ak-summary-row">
          <span>Saldo Kas Awal Periode</span>
          <span style="font-family: monospace;">{{ fmtRp(saldoAwal) }}</span>
        </div>
        <div class="ak-summary-row">
          <span>Net Cash Flow</span>
          <span :style="{ color: netCashFlow >= 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', fontWeight: '700' }">
            {{ netCashFlow >= 0 ? '+' : '' }}{{ fmtRp(netCashFlow) }}
          </span>
        </div>
        <div class="ak-summary-divider" />
        <div class="ak-summary-row ak-summary-final">
          <span>Saldo Kas Akhir Periode</span>
          <span style="color: var(--accent-orange); font-family: monospace; font-size: 18px; font-weight: 800;">
            {{ fmtRp(saldoAkhir) }}
          </span>
        </div>
      </div>
    </template>
  </AdminLayout>
</template>

<style scoped>
.ak-toolbar-right { display: flex; align-items: center; gap: 8px; }
.ak-refresh-btn {
  width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.ak-refresh-btn:hover { color: var(--accent-orange); border-color: var(--accent-orange); }
.ak-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.ak-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
@media (max-width: 800px) { .ak-stat-grid { grid-template-columns: repeat(2, 1fr); } }
.ak-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
}
.ak-stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ak-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.ak-stat-val { font-size: 20px; font-weight: 800; font-family: monospace; }

.ak-period-wrap { position: relative; }
.ak-period-select {
  appearance: none; background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-primary); font-size: 13px;
  padding: 8px 30px 8px 12px; outline: none; cursor: pointer;
}
.ak-period-select:focus { border-color: var(--accent-orange); }
.ak-period-arrow {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); pointer-events: none;
}

.ak-error-box {
  display: flex; align-items: center; gap: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;
  color: #ef4444; font-size: 13px;
}

/* Chart */
.ak-chart { overflow-x: auto; }
.ak-chart-bars { display: flex; gap: 14px; align-items: flex-end; justify-content: space-around; min-width: 300px; }
.ak-chart-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.ak-bar-wrap { display: flex; align-items: flex-end; height: 120px; }
.ak-bar { width: 28px; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; }
.ak-chart-label { font-size: 11px; color: var(--text-muted); }
.ak-chart-val { font-size: 10px; font-weight: 600; }
.ak-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px; color: var(--text-muted); font-size: 12px; }

/* Sections */
.ak-sections { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.ak-section { padding: 0; overflow: hidden; }
.ak-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; cursor: pointer; transition: background 0.15s;
}
.ak-section-header:hover { background: rgba(255,255,255,0.02); }
.ak-section-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.ak-section-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.ak-section-count { font-size: 11px; color: var(--text-muted); }
.ak-section-total { font-size: 14px; font-weight: 700; font-family: monospace; }
.ak-section-items { border-top: 1px solid var(--border-color); }
.ak-section-empty { padding: 12px 20px; font-size: 12px; color: var(--text-muted); text-align: center; }
.ak-item {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 20px; border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.12s;
}
.ak-item:hover { background: rgba(255,255,255,0.025); }
.ak-item-icon {
  width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.ak-in { background: rgba(34,197,94,0.12); color: #22c55e; }
.ak-out { background: rgba(239,68,68,0.12); color: #ef4444; }
.ak-item-label { flex: 1; font-size: 13px; color: var(--text-secondary); }
.ak-item-cat { font-size: 10px; color: var(--text-muted); background: rgba(255,255,255,0.05); border-radius: 4px; padding: 2px 6px; flex-shrink: 0; }
.ak-item-amount { font-family: monospace; font-size: 13px; font-weight: 700; flex-shrink: 0; }
.color-in { color: #22c55e; }
.color-out { color: #ef4444; }
.ak-subtotal {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px;
  background: rgba(255,255,255,0.025);
  font-size: 13px; color: var(--text-muted);
  border-top: 1px solid var(--border-color);
}
.ak-no-data {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 40px; text-align: center;
}

/* Summary */
.ak-summary-box { padding: 20px 24px; }
.ak-summary-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: var(--text-secondary); padding: 8px 0;
}
.ak-summary-divider { border-top: 1px solid var(--border-color); margin: 8px 0; }
.ak-summary-final { font-size: 15px; font-weight: 700; color: var(--text-primary); }

/* Skeleton */
.sk-card { height: 80px; }
.sk-chart-block { height: 180px; margin-bottom: 20px; }
.sk-line { background: rgba(255,255,255,0.06); border-radius: 4px; animation: pulse 1.5s ease infinite; }
.sk-h20 { height: 20px; }
.sk-h12 { height: 12px; }
.sk-w60 { width: 60%; }
.sk-w40 { width: 40%; }
.sk-mt6 { margin-top: 6px; }
@keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
</style>
