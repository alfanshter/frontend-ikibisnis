<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { TrendingUp, TrendingDown, DollarSign, Percent, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from '@lucide/vue'
import { reportsApi, type LabaRugiResponse } from '@/services/api'
import { formatRp, formatRupiahShort } from '@/utils/currency'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRp = (n: number | string | null | undefined) => formatRp(n)
const fmtRpShort = (n: number | string | null | undefined) => formatRupiahShort(n)
const fmtPct = (v: number) => v.toFixed(1) + '%'

// ─── Period picker ────────────────────────────────────────────────────────────
const now = new Date()
const selectedMonth = ref(now.getMonth() + 1)
const selectedYear  = ref(now.getFullYear())

const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: monthNames[i] }))
const years  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

// ─── State ───────────────────────────────────────────────────────────────────
const loading = ref(false)
const error   = ref<string | null>(null)
const data    = ref<LabaRugiResponse | null>(null)

// ─── Computed ─────────────────────────────────────────────────────────────────
const summary           = computed(() => data.value?.summary)
const totalPendapatan   = computed(() => data.value?.pendapatan.total ?? 0)
const totalHPP          = computed(() => data.value?.hpp.total ?? 0)
const totalBeban        = computed(() => data.value?.beban_opex.total ?? 0)
const labaKotor         = computed(() => summary.value?.laba_kotor ?? 0)
const labaOperasional   = computed(() => summary.value?.laba_operasional ?? 0)
const labaSebelumPajak  = computed(() => summary.value?.laba_sebelum_pajak ?? 0)
const pajak             = computed(() => summary.value?.pajak ?? 0)
const labaBersih        = computed(() => summary.value?.laba_bersih ?? 0)
const marginKotor       = computed(() => summary.value?.margin_kotor ?? 0)
const marginBersih      = computed(() => summary.value?.margin_bersih ?? 0)
const hppRatio          = computed(() => summary.value?.hpp_ratio ?? 0)
const totalNonOp        = computed(() => data.value?.non_operasional.total ?? 0)

// Trend chart
const trend    = computed(() => data.value?.trend ?? [])
const trendMax = computed(() => Math.max(...trend.value.map(d => Math.abs(d.laba_jt)), 1) + 5)
const trendH   = (v: number) => (Math.abs(v) / trendMax.value) * 80

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  error.value   = null
  try {
    data.value = await reportsApi.labaRugi({ month: selectedMonth.value, year: selectedYear.value })
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat laporan laba rugi.'
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
        <h1>Laba Rugi</h1>
        <p>Laporan Laba / Rugi periode berjalan</p>
      </div>
      <div class="lr-toolbar-right">
        <div class="lr-period-wrap">
          <select v-model="selectedMonth" class="lr-period-select">
            <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <ChevronDown :size="13" class="lr-period-arrow" />
        </div>
        <div class="lr-period-wrap">
          <select v-model="selectedYear" class="lr-period-select">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <ChevronDown :size="13" class="lr-period-arrow" />
        </div>
        <button class="lr-refresh-btn" @click="fetchData" :disabled="loading">
          <RefreshCw :size="14" :class="{ spin: loading }" />
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="lr-error-box">
      <AlertCircle :size="16" />
      <span>{{ error }}</span>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading && !data">
      <div class="lr-stat-grid">
        <div v-for="i in 4" :key="i" class="lr-stat-card sk-card" />
      </div>
    </template>

    <template v-else-if="data">
      <!-- Stat Cards -->
      <div class="lr-stat-grid">
        <div class="lr-stat-card">
          <div class="lr-stat-icon" style="background: rgba(34,197,94,0.12); color: #22c55e;">
            <TrendingUp :size="18" />
          </div>
          <div>
            <div class="lr-stat-label">Total Pendapatan</div>
            <div class="lr-stat-val" style="color: #22c55e;">{{ fmtRp(totalPendapatan) }}</div>
          </div>
        </div>
        <div class="lr-stat-card">
          <div class="lr-stat-icon" style="background: rgba(239,68,68,0.12); color: #ef4444;">
            <TrendingDown :size="18" />
          </div>
          <div>
            <div class="lr-stat-label">Total HPP + Beban</div>
            <div class="lr-stat-val" style="color: #ef4444;">{{ fmtRp(totalHPP + totalBeban) }}</div>
          </div>
        </div>
        <div class="lr-stat-card">
          <div class="lr-stat-icon" :style="{ background: labaBersih >= 0 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: labaBersih >= 0 ? 'var(--accent-orange)' : '#ef4444' }">
            <DollarSign :size="18" />
          </div>
          <div>
            <div class="lr-stat-label">Laba Bersih</div>
            <div class="lr-stat-val" :style="{ color: labaBersih >= 0 ? 'var(--accent-orange)' : '#ef4444' }">
              {{ fmtRp(labaBersih) }}
            </div>
          </div>
        </div>
        <div class="lr-stat-card">
          <div class="lr-stat-icon" style="background: rgba(59,130,246,0.12); color: #3b82f6;">
            <Percent :size="18" />
          </div>
          <div>
            <div class="lr-stat-label">Margin Bersih</div>
            <div class="lr-stat-val" style="color: #3b82f6;">{{ fmtPct(marginBersih) }}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Gross: {{ fmtPct(marginKotor) }}</div>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="card" style="padding: 20px 24px; margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 16px;">
          Tren Laba Bersih (6 Bulan)
        </div>
        <div class="lr-trend">
          <div v-for="d in trend" :key="d.month + d.raw_year" class="lr-trend-col">
            <div class="lr-trend-bar-wrap">
              <div
                class="lr-trend-bar"
                :style="{
                  height: trendH(d.laba_jt) + 'px',
                  background: d.laba >= 0 ? 'linear-gradient(180deg,#f59e0b,#d97706)' : 'linear-gradient(180deg,#ef4444,#dc2626)'
                }"
                :title="fmtRp(d.laba)"
              />
            </div>
            <div class="lr-trend-label">{{ d.month }}</div>
            <div class="lr-trend-val" :style="{ color: d.laba >= 0 ? 'var(--accent-orange)' : '#ef4444' }">
              {{ d.laba_jt > 0 ? '+' : '' }}{{ d.laba_jt }}jt
            </div>
          </div>
        </div>
      </div>

      <!-- Laporan Laba Rugi Table -->
      <div class="card" style="padding: 0; overflow: hidden; margin-bottom: 20px;">

        <!-- A. Pendapatan -->
        <div class="lr-section-header" style="border-top: none;">
          <span>A. PENDAPATAN</span>
          <span style="color: #22c55e;">{{ fmtRp(totalPendapatan) }}</span>
        </div>
        <div v-if="data.pendapatan.items.length === 0" class="lr-row-empty">Tidak ada data pendapatan</div>
        <div v-for="(item, i) in data.pendapatan.items" :key="'p'+i" class="lr-row">
          <span class="lr-row-label">{{ item.label }}</span>
          <span class="lr-row-amount">{{ fmtRp(item.amount) }}</span>
        </div>

        <!-- B. HPP -->
        <div class="lr-section-header">
          <span>B. HARGA POKOK PENJUALAN (HPP)</span>
          <span style="color: #ef4444;">({{ fmtRp(totalHPP) }})</span>
        </div>
        <div v-if="data.hpp.items.length === 0" class="lr-row-empty">Tidak ada data HPP</div>
        <div v-for="(item, i) in data.hpp.items" :key="'h'+i" class="lr-row">
          <span class="lr-row-label">{{ item.label }}</span>
          <span class="lr-row-amount color-out">({{ fmtRp(item.amount) }})</span>
        </div>

        <!-- Laba Kotor -->
        <div class="lr-subtotal">
          <span>LABA KOTOR (A - B)</span>
          <span :style="{ color: labaKotor >= 0 ? '#22c55e' : '#ef4444' }">{{ fmtRp(labaKotor) }}</span>
        </div>

        <!-- C. Beban Operasional -->
        <div class="lr-section-header">
          <span>C. BEBAN OPERASIONAL</span>
          <span style="color: #ef4444;">({{ fmtRp(totalBeban) }})</span>
        </div>
        <div v-if="data.beban_opex.items.length === 0" class="lr-row-empty">Tidak ada data beban operasional</div>
        <div v-for="(item, i) in data.beban_opex.items" :key="'b'+i" class="lr-row">
          <span class="lr-row-label">{{ item.label }}</span>
          <span class="lr-row-amount color-out">({{ fmtRp(item.amount) }})</span>
        </div>

        <!-- Laba Operasional -->
        <div class="lr-subtotal">
          <span>LABA OPERASIONAL</span>
          <span :style="{ color: labaOperasional >= 0 ? '#22c55e' : '#ef4444' }">{{ fmtRp(labaOperasional) }}</span>
        </div>

        <!-- D. Non-Operasional -->
        <div class="lr-section-header">
          <span>D. PENDAPATAN / BEBAN NON-OPERASIONAL</span>
          <span :style="{ color: totalNonOp >= 0 ? '#22c55e' : '#ef4444' }">
            {{ totalNonOp >= 0 ? '' : '(' }}{{ fmtRp(Math.abs(totalNonOp)) }}{{ totalNonOp < 0 ? ')' : '' }}
          </span>
        </div>
        <div v-if="data.non_operasional.items.length === 0" class="lr-row-empty">Tidak ada data non-operasional</div>
        <div v-for="(item, i) in data.non_operasional.items" :key="'n'+i" class="lr-row">
          <span class="lr-row-label">{{ item.label }}</span>
          <span class="lr-row-amount" :class="(item.signed_amount ?? 0) >= 0 ? '' : 'color-out'">
            {{ (item.signed_amount ?? 0) < 0 ? '(' + fmtRp(Math.abs(item.signed_amount ?? 0)) + ')' : fmtRp(item.signed_amount ?? 0) }}
          </span>
        </div>

        <!-- Laba Sebelum Pajak -->
        <div class="lr-subtotal">
          <span>LABA SEBELUM PAJAK</span>
          <span :style="{ color: labaSebelumPajak >= 0 ? '#22c55e' : '#ef4444' }">{{ fmtRp(labaSebelumPajak) }}</span>
        </div>

        <!-- Pajak -->
        <div class="lr-row">
          <span class="lr-row-label">Pajak Penghasilan (PPh Badan 11%)</span>
          <span class="lr-row-amount color-out">({{ fmtRp(pajak) }})</span>
        </div>

        <!-- Laba Bersih Final -->
        <div class="lr-final">
          <span>LABA BERSIH</span>
          <span :style="{ color: labaBersih >= 0 ? 'var(--accent-orange)' : '#ef4444' }">
            {{ fmtRp(labaBersih) }}
          </span>
        </div>
      </div>

      <!-- Margin Summary -->
      <div class="lr-margin-grid">
        <div class="card lr-margin-card">
          <div class="lr-margin-label">Gross Profit Margin</div>
          <div class="lr-margin-bar-wrap">
            <div class="lr-margin-bar" :style="{ width: Math.min(marginKotor, 100) + '%', background: '#22c55e' }" />
          </div>
          <div class="lr-margin-pct" style="color: #22c55e;">{{ fmtPct(marginKotor) }}</div>
        </div>
        <div class="card lr-margin-card">
          <div class="lr-margin-label">Net Profit Margin</div>
          <div class="lr-margin-bar-wrap">
            <div class="lr-margin-bar" :style="{ width: Math.min(marginBersih, 100) + '%', background: 'var(--accent-orange)' }" />
          </div>
          <div class="lr-margin-pct" style="color: var(--accent-orange);">{{ fmtPct(marginBersih) }}</div>
        </div>
        <div class="card lr-margin-card">
          <div class="lr-margin-label">HPP Ratio</div>
          <div class="lr-margin-bar-wrap">
            <div class="lr-margin-bar" :style="{ width: Math.min(hppRatio, 100) + '%', background: '#ef4444' }" />
          </div>
          <div class="lr-margin-pct" style="color: #ef4444;">{{ fmtPct(hppRatio) }}</div>
        </div>
      </div>
    </template>
  </AdminLayout>
</template>

<style scoped>
.lr-toolbar-right { display: flex; align-items: center; gap: 8px; }
.lr-refresh-btn {
  width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.lr-refresh-btn:hover { color: var(--accent-orange); border-color: var(--accent-orange); }
.lr-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.lr-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
@media (max-width: 800px) { .lr-stat-grid { grid-template-columns: repeat(2, 1fr); } }
.lr-stat-card {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;
  padding: 18px 20px; display: flex; align-items: flex-start; gap: 14px;
}
.lr-stat-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.lr-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.lr-stat-val { font-size: 20px; font-weight: 800; font-family: monospace; }

.lr-period-wrap { position: relative; }
.lr-period-select {
  appearance: none; background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-primary); font-size: 13px;
  padding: 8px 30px 8px 12px; outline: none; cursor: pointer;
}
.lr-period-select:focus { border-color: var(--accent-orange); }
.lr-period-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

.lr-error-box {
  display: flex; align-items: center; gap: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;
  color: #ef4444; font-size: 13px;
}

/* Trend */
.lr-trend { display: flex; gap: 12px; align-items: flex-end; justify-content: space-around; }
.lr-trend-col { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.lr-trend-bar-wrap { display: flex; align-items: flex-end; height: 90px; }
.lr-trend-bar { width: 28px; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s; }
.lr-trend-label { font-size: 11px; color: var(--text-muted); }
.lr-trend-val { font-size: 10px; font-weight: 600; }

/* Table rows */
.lr-section-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; font-size: 12px; font-weight: 700;
  color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
  background: rgba(255,255,255,0.025); border-top: 1px solid var(--border-color);
}
.lr-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px 10px 32px; border-top: 1px solid rgba(255,255,255,0.03);
  transition: background 0.12s;
}
.lr-row:hover { background: rgba(255,255,255,0.02); }
.lr-row-empty { padding: 10px 32px; font-size: 12px; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.03); }
.lr-row-label { font-size: 13px; color: var(--text-secondary); }
.lr-row-amount { font-family: monospace; font-size: 13px; color: var(--text-primary); font-weight: 600; }
.color-out { color: #ef4444; }
.lr-subtotal {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: rgba(255,255,255,0.04);
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  border-top: 1px solid var(--border-color); font-family: monospace;
}
.lr-final {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; background: rgba(245,158,11,0.06);
  font-size: 16px; font-weight: 800; color: var(--text-primary);
  border-top: 2px solid rgba(245,158,11,0.3); font-family: monospace;
}

/* Margin cards */
.lr-margin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
@media (max-width: 700px) { .lr-margin-grid { grid-template-columns: 1fr; } }
.lr-margin-card { padding: 18px 20px; }
.lr-margin-label { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
.lr-margin-bar-wrap { background: rgba(255,255,255,0.06); border-radius: 6px; height: 8px; overflow: hidden; margin-bottom: 8px; }
.lr-margin-bar { height: 100%; border-radius: 6px; transition: width 0.6s ease; }
.lr-margin-pct { font-size: 22px; font-weight: 800; font-family: monospace; }

/* Skeleton */
.sk-card { min-height: 80px; animation: pulse 1.5s ease infinite; }
@keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
</style>
