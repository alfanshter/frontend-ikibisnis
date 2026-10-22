<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { Building2, Wallet, BarChart3, ChevronDown, ChevronUp, RefreshCw, AlertCircle, Plus, Pencil, Trash2, X, Save } from '@lucide/vue'
import { reportsApi, financialEntriesApi, type NeracaResponse, type FinancialEntryResponse } from '@/services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRp = (n: number) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  return sign + 'Rp' + abs.toLocaleString('id-ID')
}
const fmtRpShort = (n: number) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return sign + 'Rp' + (abs / 1_000_000_000).toFixed(2) + 'M'
  if (abs >= 1_000_000) return sign + 'Rp' + (abs / 1_000_000).toFixed(0) + ' Jt'
  return sign + 'Rp' + abs.toLocaleString('id-ID')
}

// ─── Date picker ──────────────────────────────────────────────────────────────
const now = new Date()
const selectedDate = ref(now.toISOString().slice(0, 10))

// ─── Neraca State ─────────────────────────────────────────────────────────────
const loading = ref(false)
const error   = ref<string | null>(null)
const data    = ref<NeracaResponse | null>(null)

// Expand/collapse
const expandAsetLancar  = ref(true)
const expandAsetTetap   = ref(true)
const expandLiabPendek  = ref(true)
const expandLiabPanjang = ref(true)
const expandEkuitas     = ref(true)

// ─── Computed from API ────────────────────────────────────────────────────────
const totalAsetLancar  = computed(() => data.value?.aset.lancar.total ?? 0)
const totalAsetTetap   = computed(() => data.value?.aset.tetap.total ?? 0)
const totalAset        = computed(() => data.value?.aset.total ?? 0)
const totalLiabPendek  = computed(() => data.value?.liabilitas.jangka_pendek.total ?? 0)
const totalLiabPanjang = computed(() => data.value?.liabilitas.jangka_panjang.total ?? 0)
const totalLiab        = computed(() => data.value?.liabilitas.total ?? 0)
const totalEkuitas     = computed(() => data.value?.ekuitas.total ?? 0)
const totalLiabEkuitas = computed(() => data.value?.total_liab_ekuitas ?? 0)
const isBalanced       = computed(() => data.value?.is_balanced ?? false)
const currentRatio     = computed(() => data.value?.rasio.current_ratio ?? 0)
const debtRatio        = computed(() => data.value?.rasio.debt_ratio ?? 0)
const equityRatio      = computed(() => data.value?.rasio.equity_ratio ?? 0)

const donutData = computed(() => [
  { label: 'Aset Lancar', value: totalAsetLancar.value, color: '#22c55e' },
  { label: 'Aset Tetap',  value: Math.max(0, totalAsetTetap.value), color: '#3b82f6' },
])

// ─── Fetch Neraca ─────────────────────────────────────────────────────────────
async function fetchData() {
  loading.value = true
  error.value   = null
  try {
    data.value = await reportsApi.neraca({ date: selectedDate.value })
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat neraca.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
watch(selectedDate, fetchData)

// ─── Financial Entry Modal ─────────────────────────────────────────────────────
const showModal   = ref(false)
const modalTitle  = ref('')
const modalSaving = ref(false)
const modalError  = ref<string | null>(null)
const editingId   = ref<number | null>(null)
const allEntries  = ref<FinancialEntryResponse[]>([])
const entriesLoading = ref(false)

const typeLabels: Record<string, string> = {
  aset_lancar:       'Aset Lancar',
  aset_tetap:        'Aset Tetap',
  liabilitas_pendek: 'Liabilitas Jk. Pendek',
  liabilitas_panjang:'Liabilitas Jk. Panjang',
  ekuitas:           'Ekuitas',
}

const form = ref({
  type: 'aset_tetap' as FinancialEntryResponse['type'],
  label: '',
  amount: 0,
  date: now.toISOString().slice(0, 10),
  notes: '',
})

async function loadEntries() {
  entriesLoading.value = true
  try {
    const res = await financialEntriesApi.list()
    allEntries.value = res.data
  } catch { /* ignore */ }
  finally { entriesLoading.value = false }
}

function openAddModal() {
  editingId.value = null
  form.value = { type: 'aset_tetap', label: '', amount: 0, date: now.toISOString().slice(0, 10), notes: '' }
  modalTitle.value = 'Tambah Entri Neraca'
  modalError.value = null
  showModal.value = true
  loadEntries()
}

function openEditModal(entry: FinancialEntryResponse) {
  editingId.value = entry.id
  form.value = {
    type: entry.type,
    label: entry.label,
    amount: entry.amount,
    date: entry.date,
    notes: entry.notes ?? '',
  }
  modalTitle.value = 'Edit Entri Neraca'
  modalError.value = null
  // showModal already open if we came from the list
}

async function saveEntry() {
  modalSaving.value = true
  modalError.value  = null
  try {
    const payload = { ...form.value, amount: Number(form.value.amount) }
    if (editingId.value) {
      await financialEntriesApi.update(editingId.value, payload)
    } else {
      await financialEntriesApi.create(payload)
    }
    editingId.value = null
    form.value = { type: 'aset_tetap', label: '', amount: 0, date: now.toISOString().slice(0, 10), notes: '' }
    await loadEntries()
    await fetchData()
  } catch (e: any) {
    modalError.value = e.message || 'Gagal menyimpan entri.'
  } finally {
    modalSaving.value = false
  }
}

async function deleteEntry(id: number) {
  if (!confirm('Hapus entri ini?')) return
  try {
    await financialEntriesApi.delete(id)
    await loadEntries()
    await fetchData()
  } catch (e: any) {
    alert(e.message || 'Gagal menghapus entri.')
  }
}

function closeModal() {
  showModal.value   = false
  editingId.value   = null
  modalError.value  = null
}
</script>

<template>
  <AdminLayout>
    <!-- Header -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Neraca</h1>
        <p>Posisi keuangan perusahaan (Balance Sheet)</p>
      </div>
      <div class="nr-toolbar-right">
        <input type="date" v-model="selectedDate" class="nr-date-input" />
        <button class="nr-btn-secondary" @click="openAddModal">
          <Plus :size="14" /> Kelola Entri
        </button>
        <button class="nr-refresh-btn" @click="fetchData" :disabled="loading">
          <RefreshCw :size="14" :class="{ spin: loading }" />
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="nr-error-box">
      <AlertCircle :size="16" />
      <span>{{ error }}</span>
    </div>

    <!-- Loading skeleton -->
    <template v-if="loading && !data">
      <div class="nr-stat-grid">
        <div v-for="i in 4" :key="i" class="nr-stat-card sk-card" />
      </div>
    </template>

    <template v-else-if="data">
      <!-- Summary Cards -->
      <div class="nr-stat-grid">
        <div class="nr-stat-card">
          <div class="nr-stat-icon" style="background: rgba(34,197,94,0.12); color: #22c55e;">
            <BarChart3 :size="18" />
          </div>
          <div>
            <div class="nr-stat-label">Total Aset</div>
            <div class="nr-stat-val" style="color: #22c55e;">{{ fmtRpShort(totalAset) }}</div>
          </div>
        </div>
        <div class="nr-stat-card">
          <div class="nr-stat-icon" style="background: rgba(239,68,68,0.12); color: #ef4444;">
            <Wallet :size="18" />
          </div>
          <div>
            <div class="nr-stat-label">Total Liabilitas</div>
            <div class="nr-stat-val" style="color: #ef4444;">{{ fmtRpShort(totalLiab) }}</div>
          </div>
        </div>
        <div class="nr-stat-card">
          <div class="nr-stat-icon" style="background: rgba(245,158,11,0.12); color: var(--accent-orange);">
            <Building2 :size="18" />
          </div>
          <div>
            <div class="nr-stat-label">Total Ekuitas</div>
            <div class="nr-stat-val" style="color: var(--accent-orange);">{{ fmtRpShort(totalEkuitas) }}</div>
          </div>
        </div>
        <div class="nr-stat-card" :class="{ 'nr-balanced': isBalanced }">
          <div class="nr-stat-icon" :style="{ background: isBalanced ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: isBalanced ? '#22c55e' : '#ef4444' }">
            <BarChart3 :size="18" />
          </div>
          <div>
            <div class="nr-stat-label">Status Neraca</div>
            <div class="nr-stat-val" :style="{ color: isBalanced ? '#22c55e' : '#ef4444', fontSize: '14px' }">
              {{ isBalanced ? '✓ Seimbang' : '✗ Tidak Seimbang' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Rasio Keuangan -->
      <div class="nr-ratio-grid">
        <div class="card nr-ratio-card">
          <div class="nr-ratio-label">Current Ratio</div>
          <div class="nr-ratio-val" :style="{ color: currentRatio >= 1.5 ? '#22c55e' : currentRatio >= 1 ? 'var(--accent-orange)' : '#ef4444' }">
            {{ currentRatio.toFixed(2) }}x
          </div>
          <div class="nr-ratio-desc">{{ currentRatio >= 1.5 ? 'Likuiditas Baik' : currentRatio >= 1 ? 'Cukup' : 'Rendah' }}</div>
          <div class="nr-ratio-bar-wrap">
            <div class="nr-ratio-bar" :style="{ width: Math.min(currentRatio / 3 * 100, 100) + '%', background: currentRatio >= 1.5 ? '#22c55e' : 'var(--accent-orange)' }" />
          </div>
        </div>
        <div class="card nr-ratio-card">
          <div class="nr-ratio-label">Debt Ratio</div>
          <div class="nr-ratio-val" :style="{ color: debtRatio <= 40 ? '#22c55e' : debtRatio <= 60 ? 'var(--accent-orange)' : '#ef4444' }">
            {{ debtRatio.toFixed(1) }}%
          </div>
          <div class="nr-ratio-desc">{{ debtRatio <= 40 ? 'Aman' : debtRatio <= 60 ? 'Moderat' : 'Tinggi' }}</div>
          <div class="nr-ratio-bar-wrap">
            <div class="nr-ratio-bar" :style="{ width: Math.min(debtRatio, 100) + '%', background: debtRatio <= 40 ? '#22c55e' : '#ef4444' }" />
          </div>
        </div>
        <div class="card nr-ratio-card">
          <div class="nr-ratio-label">Equity Ratio</div>
          <div class="nr-ratio-val" style="color: #3b82f6;">{{ equityRatio.toFixed(1) }}%</div>
          <div class="nr-ratio-desc">Proporsi modal sendiri</div>
          <div class="nr-ratio-bar-wrap">
            <div class="nr-ratio-bar" :style="{ width: Math.min(equityRatio, 100) + '%', background: '#3b82f6' }" />
          </div>
        </div>
      </div>

      <!-- Two Column Layout -->
      <div class="nr-two-col">
        <!-- KIRI: ASET -->
        <div class="nr-col">
          <div class="card" style="padding: 0; overflow: hidden;">
            <div class="nr-col-title" style="background: rgba(34,197,94,0.06); border-color: rgba(34,197,94,0.2);">
              <span style="color: #22c55e;">ASET</span>
              <span style="color: #22c55e; font-family: monospace;">{{ fmtRp(totalAset) }}</span>
            </div>

            <!-- Aset Lancar -->
            <div class="nr-group-header" @click="expandAsetLancar = !expandAsetLancar">
              <span>Aset Lancar</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 12px;">{{ fmtRp(totalAsetLancar) }}</span>
                <component :is="expandAsetLancar ? ChevronUp : ChevronDown" :size="14" />
              </div>
            </div>
            <template v-if="expandAsetLancar">
              <div v-for="(item, i) in data.aset.lancar.items" :key="'al'+i" class="nr-item">
                <span class="nr-item-label">{{ item.label }}</span>
                <span class="nr-item-val">{{ fmtRp(item.amount) }}</span>
              </div>
              <div class="nr-subtotal">
                <span>Jumlah Aset Lancar</span>
                <span>{{ fmtRp(totalAsetLancar) }}</span>
              </div>
            </template>

            <!-- Aset Tetap -->
            <div class="nr-group-header" @click="expandAsetTetap = !expandAsetTetap">
              <span>Aset Tidak Lancar</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 12px;">{{ fmtRp(totalAsetTetap) }}</span>
                <component :is="expandAsetTetap ? ChevronUp : ChevronDown" :size="14" />
              </div>
            </div>
            <template v-if="expandAsetTetap">
              <div v-if="data.aset.tetap.items.length === 0" class="nr-item-empty">
                Belum ada entri — gunakan tombol "Kelola Entri"
              </div>
              <div v-for="(item, i) in data.aset.tetap.items" :key="'at'+i" class="nr-item">
                <span class="nr-item-label" :style="{ color: item.amount < 0 ? '#ef4444' : '' }">{{ item.label }}</span>
                <span class="nr-item-val" :style="{ color: item.amount < 0 ? '#ef4444' : '' }">
                  {{ item.amount < 0 ? '(' + fmtRp(Math.abs(item.amount)) + ')' : fmtRp(item.amount) }}
                </span>
              </div>
              <div class="nr-subtotal">
                <span>Jumlah Aset Tidak Lancar</span>
                <span>{{ fmtRp(totalAsetTetap) }}</span>
              </div>
            </template>

            <div class="nr-total">
              <span>TOTAL ASET</span>
              <span style="color: #22c55e;">{{ fmtRp(totalAset) }}</span>
            </div>
          </div>
        </div>

        <!-- KANAN: LIABILITAS + EKUITAS -->
        <div class="nr-col">
          <div class="card" style="padding: 0; overflow: hidden;">
            <div class="nr-col-title" style="background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.2);">
              <span style="color: #ef4444;">LIABILITAS &amp; EKUITAS</span>
              <span style="color: var(--text-primary); font-family: monospace;">{{ fmtRp(totalLiabEkuitas) }}</span>
            </div>

            <!-- Liabilitas Jangka Pendek -->
            <div class="nr-group-header" @click="expandLiabPendek = !expandLiabPendek">
              <span>Liabilitas Jangka Pendek</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 12px;">{{ fmtRp(totalLiabPendek) }}</span>
                <component :is="expandLiabPendek ? ChevronUp : ChevronDown" :size="14" />
              </div>
            </div>
            <template v-if="expandLiabPendek">
              <div v-if="data.liabilitas.jangka_pendek.items.length === 0" class="nr-item-empty">Belum ada entri</div>
              <div v-for="(item, i) in data.liabilitas.jangka_pendek.items" :key="'lp'+i" class="nr-item">
                <span class="nr-item-label">{{ item.label }}</span>
                <span class="nr-item-val" style="color: #ef4444;">{{ fmtRp(item.amount) }}</span>
              </div>
              <div class="nr-subtotal">
                <span>Jumlah Liabilitas Jk. Pendek</span>
                <span>{{ fmtRp(totalLiabPendek) }}</span>
              </div>
            </template>

            <!-- Liabilitas Jangka Panjang -->
            <div class="nr-group-header" @click="expandLiabPanjang = !expandLiabPanjang">
              <span>Liabilitas Jangka Panjang</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 12px;">{{ fmtRp(totalLiabPanjang) }}</span>
                <component :is="expandLiabPanjang ? ChevronUp : ChevronDown" :size="14" />
              </div>
            </div>
            <template v-if="expandLiabPanjang">
              <div v-if="data.liabilitas.jangka_panjang.items.length === 0" class="nr-item-empty">Belum ada entri</div>
              <div v-for="(item, i) in data.liabilitas.jangka_panjang.items" :key="'lpp'+i" class="nr-item">
                <span class="nr-item-label">{{ item.label }}</span>
                <span class="nr-item-val" style="color: #ef4444;">{{ fmtRp(item.amount) }}</span>
              </div>
              <div class="nr-subtotal">
                <span>Jumlah Liabilitas Jk. Panjang</span>
                <span>{{ fmtRp(totalLiabPanjang) }}</span>
              </div>
            </template>

            <div class="nr-subtotal" style="font-weight: 700; color: #ef4444;">
              <span>TOTAL LIABILITAS</span>
              <span>{{ fmtRp(totalLiab) }}</span>
            </div>

            <!-- Ekuitas -->
            <div class="nr-group-header" @click="expandEkuitas = !expandEkuitas">
              <span>Ekuitas</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: monospace; font-size: 12px;">{{ fmtRp(totalEkuitas) }}</span>
                <component :is="expandEkuitas ? ChevronUp : ChevronDown" :size="14" />
              </div>
            </div>
            <template v-if="expandEkuitas">
              <div v-if="data.ekuitas.items.length === 0" class="nr-item-empty">Belum ada entri</div>
              <div v-for="(item, i) in data.ekuitas.items" :key="'e'+i" class="nr-item">
                <span class="nr-item-label">{{ item.label }}</span>
                <span class="nr-item-val" style="color: var(--accent-orange);">{{ fmtRp(item.amount) }}</span>
              </div>
              <div class="nr-subtotal">
                <span>Jumlah Ekuitas</span>
                <span>{{ fmtRp(totalEkuitas) }}</span>
              </div>
            </template>

            <div class="nr-total">
              <span>TOTAL LIABILITAS + EKUITAS</span>
              <span :style="{ color: isBalanced ? 'var(--accent-orange)' : '#ef4444' }">
                {{ fmtRp(totalLiabEkuitas) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Komposisi Aset -->
      <div class="card" style="padding: 20px 24px; margin-top: 16px;">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px;">Komposisi Aset</div>
        <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
          <div v-for="d in donutData" :key="d.label" style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 180px;">
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                <span style="color: var(--text-secondary);">{{ d.label }}</span>
                <span :style="{ color: d.color, fontFamily: 'monospace', fontWeight: '700' }">
                  {{ totalAset > 0 ? (d.value / totalAset * 100).toFixed(1) : 0 }}%
                </span>
              </div>
              <div style="background: rgba(255,255,255,0.06); border-radius: 6px; height: 8px; overflow: hidden;">
                <div :style="{ width: totalAset > 0 ? (d.value / totalAset * 100) + '%' : '0%', height: '100%', background: d.color, borderRadius: '6px', transition: 'width 0.6s' }" />
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">{{ fmtRp(d.value) }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══ Modal Kelola Entri Neraca ════════════════════════════════════════ -->
    <Teleport to="body">
      <div v-if="showModal" class="nr-modal-backdrop" @click.self="closeModal">
        <div class="nr-modal">
          <!-- Modal Header -->
          <div class="nr-modal-header">
            <span class="nr-modal-title">Kelola Entri Neraca</span>
            <button class="nr-modal-close" @click="closeModal"><X :size="16" /></button>
          </div>

          <!-- Add Form -->
          <div class="nr-modal-form">
            <div class="nr-form-title">{{ editingId ? 'Edit Entri' : 'Tambah Entri Baru' }}</div>
            <div class="nr-form-grid">
              <div class="nr-form-group">
                <label>Tipe</label>
                <select v-model="form.type" class="nr-form-select">
                  <option v-for="(label, key) in typeLabels" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div class="nr-form-group">
                <label>Keterangan</label>
                <input v-model="form.label" type="text" class="nr-form-input" placeholder="Nama aset / liabilitas" />
              </div>
              <div class="nr-form-group">
                <label>Jumlah (Rp)</label>
                <input v-model="form.amount" type="number" class="nr-form-input" placeholder="Masukkan nominal" />
              </div>
              <div class="nr-form-group">
                <label>Tanggal Efektif</label>
                <input v-model="form.date" type="date" class="nr-form-input" />
              </div>
              <div class="nr-form-group nr-form-full">
                <label>Catatan (opsional)</label>
                <input v-model="form.notes" type="text" class="nr-form-input" placeholder="Contoh: dibeli 2023, masa guna 5 tahun" />
              </div>
            </div>
            <div v-if="modalError" class="nr-modal-error">{{ modalError }}</div>
            <div class="nr-modal-actions">
              <button v-if="editingId" class="nr-btn-ghost" @click="editingId = null">Batal Edit</button>
              <button class="nr-btn-save" @click="saveEntry" :disabled="modalSaving">
                <Save :size="13" />{{ modalSaving ? 'Menyimpan...' : editingId ? 'Update Entri' : 'Tambah Entri' }}
              </button>
            </div>
          </div>

          <!-- Entries List -->
          <div class="nr-modal-list">
            <div class="nr-form-title" style="margin-bottom: 12px;">Daftar Entri Tersimpan</div>
            <div v-if="entriesLoading" class="nr-modal-empty">Memuat data...</div>
            <div v-else-if="allEntries.length === 0" class="nr-modal-empty">Belum ada entri. Tambahkan di atas.</div>
            <div v-else class="nr-entry-list">
              <div v-for="entry in allEntries" :key="entry.id" class="nr-entry-row">
                <div class="nr-entry-type-badge" :class="'badge-' + entry.type">{{ typeLabels[entry.type] }}</div>
                <div class="nr-entry-label">{{ entry.label }}</div>
                <div class="nr-entry-amount" :style="{ color: entry.amount < 0 ? '#ef4444' : '#22c55e' }">
                  {{ fmtRp(entry.amount) }}
                </div>
                <div class="nr-entry-date">{{ entry.date }}</div>
                <div class="nr-entry-actions">
                  <button class="nr-icon-btn" @click="openEditModal(entry)" title="Edit">
                    <Pencil :size="12" />
                  </button>
                  <button class="nr-icon-btn nr-icon-del" @click="deleteEntry(entry.id)" title="Hapus">
                    <Trash2 :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
.nr-toolbar-right { display: flex; align-items: center; gap: 8px; }
.nr-refresh-btn {
  width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.nr-refresh-btn:hover { color: var(--accent-orange); border-color: var(--accent-orange); }
.nr-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.nr-btn-secondary {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-secondary); font-size: 13px; cursor: pointer;
  transition: all 0.15s;
}
.nr-btn-secondary:hover { border-color: var(--accent-orange); color: var(--accent-orange); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.nr-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
@media (max-width: 800px) { .nr-stat-grid { grid-template-columns: repeat(2, 1fr); } }
.nr-stat-card {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;
  padding: 18px 20px; display: flex; align-items: flex-start; gap: 14px; transition: border-color 0.2s;
}
.nr-balanced { border-color: rgba(34,197,94,0.3); }
.nr-stat-icon { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.nr-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
.nr-stat-val { font-size: 20px; font-weight: 800; font-family: monospace; }

.nr-error-box {
  display: flex; align-items: center; gap: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; color: #ef4444; font-size: 13px;
}

.nr-date-input {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;
  color: var(--text-primary); font-size: 13px; padding: 8px 12px; outline: none;
}
.nr-date-input:focus { border-color: var(--accent-orange); }

/* Ratio cards */
.nr-ratio-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 16px; }
@media (max-width: 700px) { .nr-ratio-grid { grid-template-columns: 1fr; } }
.nr-ratio-card { padding: 18px 20px; }
.nr-ratio-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.nr-ratio-val { font-size: 26px; font-weight: 800; font-family: monospace; }
.nr-ratio-desc { font-size: 11px; color: var(--text-muted); margin: 3px 0 10px; }
.nr-ratio-bar-wrap { background: rgba(255,255,255,0.06); border-radius: 6px; height: 6px; overflow: hidden; }
.nr-ratio-bar { height: 100%; border-radius: 6px; transition: width 0.6s; }

/* Two col */
.nr-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 800px) { .nr-two-col { grid-template-columns: 1fr; } }
.nr-col-title {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; font-size: 13px; font-weight: 800; letter-spacing: 0.04em;
  border-bottom: 1px solid;
}
.nr-group-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; font-size: 12px; font-weight: 700; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.05em;
  background: rgba(255,255,255,0.02); border-top: 1px solid var(--border-color);
  cursor: pointer; transition: background 0.15s;
}
.nr-group-header:hover { background: rgba(255,255,255,0.04); }
.nr-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 9px 20px 9px 28px; border-top: 1px solid rgba(255,255,255,0.03);
  transition: background 0.12s;
}
.nr-item:hover { background: rgba(255,255,255,0.02); }
.nr-item-empty { padding: 10px 28px; font-size: 12px; color: var(--text-muted); border-top: 1px solid rgba(255,255,255,0.03); font-style: italic; }
.nr-item-label { font-size: 12.5px; color: var(--text-secondary); }
.nr-item-val { font-family: monospace; font-size: 12.5px; color: var(--text-primary); font-weight: 600; }
.nr-subtotal {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; font-size: 12px; font-weight: 600; color: var(--text-secondary);
  background: rgba(255,255,255,0.03); border-top: 1px solid var(--border-color); font-family: monospace;
}
.nr-total {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; font-size: 13px; font-weight: 800; color: var(--text-primary);
  background: rgba(255,255,255,0.04); border-top: 2px solid var(--border-color); font-family: monospace;
}

/* Skeleton */
.sk-card { min-height: 80px; animation: pulse 1.5s ease infinite; }
@keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }

/* ── Modal ── */
.nr-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  z-index: 1000; display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; overflow-y: auto;
}
.nr-modal {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px;
  width: 100%; max-width: 720px; overflow: hidden;
}
.nr-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px; border-bottom: 1px solid var(--border-color);
}
.nr-modal-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.nr-modal-close {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.nr-modal-close:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }

.nr-modal-form { padding: 20px 24px; border-bottom: 1px solid var(--border-color); }
.nr-form-title { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
.nr-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.nr-form-full { grid-column: 1 / -1; }
.nr-form-group { display: flex; flex-direction: column; gap: 5px; }
.nr-form-group label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.nr-form-input, .nr-form-select {
  background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-primary); font-size: 13px; padding: 9px 12px; outline: none;
  width: 100%; appearance: none;
}
.nr-form-input:focus, .nr-form-select:focus { border-color: var(--accent-orange); }

.nr-modal-error { margin-top: 10px; color: #ef4444; font-size: 12px; }
.nr-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
.nr-btn-ghost {
  padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-muted); font-size: 13px; cursor: pointer;
}
.nr-btn-save {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 18px; border-radius: 8px; border: none;
  background: var(--accent-orange); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s;
}
.nr-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

.nr-modal-list { padding: 20px 24px; }
.nr-modal-empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 20px; }
.nr-entry-list { display: flex; flex-direction: column; gap: 6px; }
.nr-entry-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color);
  background: rgba(255,255,255,0.02); font-size: 13px;
}
.nr-entry-type-badge {
  font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px;
  white-space: nowrap; flex-shrink: 0;
}
.badge-aset_lancar        { background: rgba(34,197,94,0.12);  color: #22c55e; }
.badge-aset_tetap         { background: rgba(59,130,246,0.12); color: #3b82f6; }
.badge-liabilitas_pendek  { background: rgba(239,68,68,0.12);  color: #ef4444; }
.badge-liabilitas_panjang { background: rgba(239,68,68,0.08);  color: #f87171; }
.badge-ekuitas            { background: rgba(245,158,11,0.12); color: var(--accent-orange); }
.nr-entry-label  { flex: 1; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nr-entry-amount { font-family: monospace; font-weight: 700; flex-shrink: 0; }
.nr-entry-date   { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
.nr-entry-actions { display: flex; gap: 4px; flex-shrink: 0; }
.nr-icon-btn {
  width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--border-color);
  background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.12s;
}
.nr-icon-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
.nr-icon-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }
</style>
