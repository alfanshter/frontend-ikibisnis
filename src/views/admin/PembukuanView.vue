<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { Plus, TrendingUp, TrendingDown, DollarSign, X, ChevronDown, Loader2, Pencil, Trash2 } from '@lucide/vue'
import { useTransactionsStore } from '@/stores/transactions'
import { leadsApi, type LeadResponse } from '@/services/api'

// ─── Store ─────────────────────────────────────────────────────────────────
const store = useTransactionsStore()

onMounted(async () => {
  await Promise.all([
    store.fetchStats(),
    store.fetchTransactions(),
    loadLeads(),
  ])
})

// ─── Data ──────────────────────────────────────────────────────────────────
const barMax = computed(() => {
  if (!store.stats?.chart_data) return 20
  const maxVal = Math.max(...store.stats.chart_data.map(d => Math.max(d.masuk, d.keluar)))
  return maxVal > 0 ? maxVal + (maxVal * 0.1) : 20 // Add 10% headroom
})

function barHeight(val: number) {
  if (barMax.value === 0) return 0
  return (val / barMax.value) * 140
}

// ─── Tabs ──────────────────────────────────────────────────────────────────
const activeTab = ref<'semua' | 'masuk' | 'keluar'>('semua')

const filteredTx = computed(() => {
  if (activeTab.value === 'masuk')  return store.transactions.filter(t => t.type === 'masuk')
  if (activeTab.value === 'keluar') return store.transactions.filter(t => t.type === 'keluar')
  return store.transactions
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(15)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTx.value.length / pageSize.value)))

const paginatedTx = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredTx.value.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch(activeTab, () => {
  currentPage.value = 1
})

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

// ─── Stats ─────────────────────────────────────────────────────────────────
const totalMasuk  = computed(() => store.stats?.current_period.total_masuk || 0)
const totalKeluar = computed(() => store.stats?.current_period.total_keluar || 0)
const saldoBersih = computed(() => store.stats?.current_period.saldo_bersih || 0)

function formatRp(val: number) {
  return 'Rp' + val.toLocaleString('id-ID')
}

// ─── Modal ─────────────────────────────────────────────────────────────────
const showModal      = ref(false)
const isDropdownOpen = ref(false)
const saving         = ref(false)
const isEditMode     = ref(false)
const editingId      = ref<number | null>(null)

// ─── CRM Lead Options (from API) ──────────────────────────────────────────
const leadList        = ref<LeadResponse[]>([])
const leadListLoading = ref(false)

async function loadLeads() {
  leadListLoading.value = true
  try {
    const res = await leadsApi.list({ page: 1 })
    leadList.value = res.data
    const last = res.meta?.last_page || 1
    if (last > 1) {
      const rest = await Promise.all(
        Array.from({ length: last - 1 }, (_, i) => leadsApi.list({ page: i + 2 }))
      )
      rest.forEach(r => leadList.value.push(...r.data))
    }
  } catch (e) {
    console.error('Gagal memuat daftar CRM leads', e)
  } finally {
    leadListLoading.value = false
  }
}

const categories = ['Pembayaran Client', 'Material', 'Fee Tim', 'Operasional', 'Lain-lain']

const emptyForm = () => ({
  type: 'masuk',
  name: '',
  date: new Date().toISOString().slice(0, 10),
  category: 'Pembayaran Client',
  proyekId: '',
  amount: '',
})
const form = ref(emptyForm())

const openModal = () => {
  isEditMode.value = false
  editingId.value = null
  form.value = emptyForm()
  searchLeadText.value = ''
  showModal.value = true
}

const openEditModal = (tx: { id: number; type: string; name: string; date: string; category: string | null; proyekId: string | null; amount: number }) => {
  isEditMode.value = true
  editingId.value = tx.id
  // Reconstruct display label from stored CRM ref
  const matchedLead = leadList.value.find(l => (l.kode_lead || `LEAD-${l.id}`) === tx.proyekId)
  const displayLabel = matchedLead
    ? `${matchedLead.kode_lead || 'CRM'} – ${matchedLead.nama}`
    : (tx.proyekId || '')
  form.value = {
    type: tx.type,
    name: tx.name,
    date: tx.date,
    category: tx.category || 'Pembayaran Client',
    proyekId: tx.proyekId || '',
    amount: String(tx.amount),
  }
  searchLeadText.value = displayLabel
  showModal.value = true
}

const closeModal = () => { showModal.value = false; isDropdownOpen.value = false; store.error = null }

// Helper: get stored key for a lead
const leadKey = (l: LeadResponse) => l.kode_lead || `LEAD-${l.id}`
// Helper: get display label for a lead
const leadLabel = (l: LeadResponse) => `${l.kode_lead || ('LEAD-' + l.id)} – ${l.nama}`

const searchLeadText = ref('')
const filteredLeadOptions = computed(() => {
  const q = searchLeadText.value.toLowerCase().trim()
  if (!q) return leadList.value
  return leadList.value.filter(l =>
    (l.kode_lead || '').toLowerCase().includes(q) ||
    l.nama.toLowerCase().includes(q) ||
    l.perusahaan.toLowerCase().includes(q) ||
    l.status.toLowerCase().includes(q)
  )
})

const selectLead = (l: LeadResponse | null) => {
  if (!l) {
    form.value.proyekId = ''
    searchLeadText.value = ''
  } else {
    form.value.proyekId = leadKey(l)
    searchLeadText.value = leadLabel(l)
  }
  isDropdownOpen.value = false
}

const onLeadBlur = () => {
  setTimeout(() => {
    isDropdownOpen.value = false
    if (searchLeadText.value.trim() === '') {
      form.value.proyekId = ''
    }
    if (form.value.proyekId) {
      const matched = leadList.value.find(l => leadKey(l) === form.value.proyekId)
      if (matched) searchLeadText.value = leadLabel(matched)
    }
  }, 150)
}

// Status color map for badge
const statusColor: Record<string, string> = {
  'Prospek':   '#6366f1',
  'Survey':    '#f59e0b',
  'Penawaran': '#3b82f6',
  'Deal':      '#10b981',
  'Pending':   '#8b5cf6',
  'Batal':     '#6b7280',
}

const submitForm = async () => {
  if (!form.value.name || !form.value.amount) return
  saving.value = true
  try {
    const payload = {
      type: form.value.type,
      name: form.value.name,
      date: form.value.date,
      category: form.value.category,
      proyekId: form.value.proyekId,
      amount: Number(String(form.value.amount).replace(/\D/g, '')),
    }
    if (isEditMode.value && editingId.value !== null) {
      await store.updateTransaction(editingId.value, payload)
    } else {
      await store.addTransaction(payload)
    }
    closeModal()
  } catch (e) {
    // error is handled in store
  } finally {
    saving.value = false
  }
}

// ─── Delete Confirmation ────────────────────────────────────────────────────
const showDeleteModal  = ref(false)
const deletingId       = ref<number | null>(null)
const deletingName     = ref('')
const deleting         = ref(false)

const confirmDelete = (tx: { id: number; name: string }) => {
  deletingId.value   = tx.id
  deletingName.value = tx.name
  showDeleteModal.value = true
}

const cancelDelete = () => {
  showDeleteModal.value = false
  deletingId.value = null
  deletingName.value = ''
}

const executeDelete = async () => {
  if (deletingId.value === null) return
  deleting.value = true
  try {
    await store.deleteTransaction(deletingId.value)
    cancelDelete()
  } catch (e) {
    // error handled in store
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <!-- ── Page Toolbar ─────────────────────────────────────────── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Pembukuan</h1>
        <p>Kas masuk dan kas keluar perusahaan</p>
      </div>
      <button class="btn-primary" @click="openModal">
        <Plus :size="16" /> Tambah Transaksi
      </button>
    </div>

    <!-- ── Stat Cards ────────────────────────────────────────────── -->
    <div class="pb-stat-grid">
      <div class="pb-stat-card">
        <div class="pb-stat-header">
          <div class="pb-stat-icon icon-green">
            <TrendingUp :size="18" />
          </div>
          <span class="pb-stat-label">Total Kas Masuk</span>
        </div>
        <div class="pb-stat-value trend-up">
          <Loader2 v-if="store.statsLoading" :size="24" class="spinner" />
          <template v-else>{{ formatRp(totalMasuk) }}</template>
        </div>
        <div class="pb-stat-sub">Bulan Ini</div>
      </div>

      <div class="pb-stat-card">
        <div class="pb-stat-header">
          <div class="pb-stat-icon icon-red">
            <TrendingDown :size="18" />
          </div>
          <span class="pb-stat-label">Total Kas Keluar</span>
        </div>
        <div class="pb-stat-value trend-down">
          <Loader2 v-if="store.statsLoading" :size="24" class="spinner" />
          <template v-else>{{ formatRp(totalKeluar) }}</template>
        </div>
        <div class="pb-stat-sub">Bulan Ini</div>
      </div>

      <div class="pb-stat-card">
        <div class="pb-stat-header">
          <div class="pb-stat-icon icon-orange">
            <DollarSign :size="18" />
          </div>
          <span class="pb-stat-label">Saldo Bersih</span>
        </div>
        <div class="pb-stat-value" :class="saldoBersih >= 0 ? 'trend-up' : 'trend-down'">
          <Loader2 v-if="store.statsLoading" :size="24" class="spinner" />
          <template v-else>{{ formatRp(saldoBersih) }}</template>
        </div>
        <div class="pb-stat-sub">Bulan Ini</div>
      </div>
    </div>

    <!-- ── Bar Chart ─────────────────────────────────────────────── -->
    <div class="chart-card" style="margin-bottom: 24px;">
      <div class="chart-card-header">
        <h3>Rekap 6 Bulan Terakhir</h3>
      </div>

      <div class="bar-chart-wrap">
        <!-- Y-axis labels -->
        <div class="bar-y-axis">
          <span>{{ Math.round(barMax / 1000000) }}jt</span>
          <span>{{ Math.round(barMax * 0.75 / 1000000) }}jt</span>
          <span>{{ Math.round(barMax * 0.5 / 1000000) }}jt</span>
          <span>{{ Math.round(barMax * 0.25 / 1000000) }}jt</span>
          <span>0</span>
        </div>

        <!-- Bars -->
        <div class="bar-chart-body">
          <!-- Grid lines -->
          <div class="bar-grid-lines">
            <div v-for="n in 5" :key="n" class="bar-grid-line"></div>
          </div>

          <div class="bar-groups">
            <template v-if="store.stats?.chart_data">
              <div class="bar-group" v-for="d in store.stats.chart_data" :key="d.month">
                <div class="bar-pair">
                  <div
                    class="bar bar-masuk"
                    :style="{ height: barHeight(d.masuk) + 'px' }"
                    :title="`Masuk: ${d.masuk_jt}jt`"
                  ></div>
                  <div
                    class="bar bar-keluar"
                    :style="{ height: barHeight(d.keluar) + 'px' }"
                    :title="`Keluar: ${d.keluar_jt}jt`"
                  ></div>
                </div>
                <div class="bar-label">{{ d.month }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="chart-legend" style="margin-top: 14px;">
        <div class="legend-item">
          <span class="legend-dot" style="background: var(--accent-green);"></span>
          Kas Masuk
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background: #e05f7e;"></span>
          Kas Keluar
        </div>
      </div>
    </div>

    <!-- ── Transaction List ──────────────────────────────────────── -->
    <div class="table-card">
      <!-- Tabs -->
      <div class="pb-tabs">
        <button
          class="pb-tab"
          :class="{ active: activeTab === 'semua' }"
          @click="activeTab = 'semua'"
        >Semua</button>
        <button
          class="pb-tab"
          :class="{ active: activeTab === 'masuk' }"
          @click="activeTab = 'masuk'"
        >Kas Masuk</button>
        <button
          class="pb-tab"
          :class="{ active: activeTab === 'keluar' }"
          @click="activeTab = 'keluar'"
        >Kas Keluar</button>
      </div>

      <!-- Transaction rows -->
      <div class="tx-list">
        <div v-if="store.loading" class="tx-loading">
          <Loader2 :size="24" class="spinner" />
          <span>Memuat data transaksi...</span>
        </div>
        <template v-else>
          <div class="tx-row" v-for="tx in paginatedTx" :key="tx.id">
            <!-- Icon -->
            <div class="tx-icon" :class="tx.type === 'masuk' ? 'tx-icon-masuk' : 'tx-icon-keluar'">
              <TrendingUp  v-if="tx.type === 'masuk'"  :size="15" />
              <TrendingDown v-else                       :size="15" />
            </div>

            <!-- Detail -->
            <div class="tx-detail">
              <div class="tx-name">{{ tx.name }}</div>
              <div class="tx-meta">
                {{ tx.date }}
                <span v-if="tx.category" class="tx-dot">·</span>
                {{ tx.category }}
                <span v-if="tx.proyekId" class="tx-dot">·</span>
                <span v-if="tx.proyekId" class="tx-proyek-id">{{ tx.proyekId }}</span>
              </div>
            </div>

            <!-- Amount -->
            <div class="tx-amount" :class="tx.type === 'masuk' ? 'tx-amount-masuk' : 'tx-amount-keluar'">
              {{ tx.type === 'masuk' ? '+' : '-' }}{{ formatRp(tx.amount) }}
            </div>

            <!-- Actions -->
            <div class="tx-actions">
              <button class="tx-action-btn tx-action-edit" @click.stop="openEditModal(tx)" title="Edit transaksi">
                <Pencil :size="13" />
              </button>
              <button class="tx-action-btn tx-action-delete" @click.stop="confirmDelete(tx)" title="Hapus transaksi">
                <Trash2 :size="13" />
              </button>
            </div>
          </div>

          <div v-if="filteredTx.length === 0" class="tx-empty">
            Tidak ada transaksi
          </div>
        </template>
      </div>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="filteredTx.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ filteredTx.length }} transaksi
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <button
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="prevPage"
        >&lt;</button>
        <span class="page-info">{{ currentPage }} / {{ totalPages || 1 }}</span>
        <button
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="nextPage"
        >&gt;</button>
      </div>
    </div>

    <!-- ── Modal Tambah Transaksi ────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box">
          <div class="modal-header">
            <h2>{{ isEditMode ? 'Edit Transaksi' : 'Tambah Transaksi' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Error State -->
            <div v-if="store.error" class="error-alert">
              {{ store.error }}
            </div>

            <!-- Tipe -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tipe *</label>
                <div class="tx-type-toggle">
                  <button
                    class="tx-type-btn"
                    :class="{ active: form.type === 'masuk' }"
                    @click="form.type = 'masuk'"
                  >
                    <TrendingUp :size="14" /> Kas Masuk
                  </button>
                  <button
                    class="tx-type-btn tx-type-btn-keluar"
                    :class="{ active: form.type === 'keluar' }"
                    @click="form.type = 'keluar'"
                  >
                    <TrendingDown :size="14" /> Kas Keluar
                  </button>
                </div>
              </div>
            </div>

            <!-- Keterangan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Keterangan *</label>
                <input v-model="form.name" class="form-input" placeholder="Deskripsi transaksi..." />
              </div>
            </div>

            <!-- Kategori & Proyek -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Kategori</label>
                <select v-model="form.category" class="form-input form-select">
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">CRM Lead <span style="color: var(--text-muted); font-weight: 400; font-size: 11px;">(Opsional)</span></label>
                <div class="custom-combo-box">
                  <input
                    v-model="searchLeadText"
                    class="form-input combo-input"
                    placeholder="Cari nama, perusahaan, atau status CRM..."
                    @focus="isDropdownOpen = true"
                    @blur="onLeadBlur"
                    @input="isDropdownOpen = true"
                  />
                  <Loader2 v-if="leadListLoading" class="combo-icon spinner" :size="14" />
                  <ChevronDown v-else class="combo-icon" :size="14" />

                  <div v-if="isDropdownOpen" class="combo-dropdown combo-dropdown-lead">
                    <ul class="combo-list">
                      <!-- None option -->
                      <li
                        class="combo-item combo-item-none"
                        :class="{ 'combo-item-active': form.proyekId === '' }"
                        @mousedown.prevent="selectLead(null)"
                      >
                        <span class="combo-none-label">— Tidak terkait CRM —</span>
                      </li>

                      <!-- Lead items -->
                      <li
                        v-for="l in filteredLeadOptions"
                        :key="l.id"
                        class="combo-item combo-item-lead"
                        :class="{ 'combo-item-active': form.proyekId === leadKey(l) }"
                        @mousedown.prevent="selectLead(l)"
                      >
                        <div class="combo-lead-top">
                          <span class="combo-lead-kode">{{ l.kode_lead || ('LEAD-' + l.id) }}</span>
                          <span class="combo-lead-badge" :style="{ background: statusColor[l.status] + '22', color: statusColor[l.status] }">
                            {{ l.status }}
                          </span>
                        </div>
                        <div class="combo-lead-nama">{{ l.nama }}</div>
                        <div class="combo-lead-perusahaan" v-if="l.perusahaan">{{ l.perusahaan }}</div>
                      </li>

                      <li v-if="filteredLeadOptions.length === 0 && !leadListLoading" class="combo-empty">
                        CRM lead tidak ditemukan
                      </li>
                      <li v-if="leadListLoading" class="combo-empty">
                        <Loader2 :size="13" class="spinner" style="margin-right:6px;" /> Memuat leads...
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Jumlah & Tanggal -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Jumlah (Rp) *</label>
                <input v-model="form.amount" type="number" class="form-input" placeholder="0" min="0" />
              </div>
              <div class="form-field">
                <label class="form-label">Tanggal</label>
                <input v-model="form.date" type="date" class="form-input" />
              </div>
            </div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal" :disabled="saving">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm" :disabled="saving" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <Loader2 v-if="saving" :size="16" class="spinner" />
              <span>{{ isEditMode ? 'Simpan Perubahan' : 'Simpan' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Konfirmasi Hapus ────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-box modal-box-sm">
          <div class="modal-header delete-modal-header">
            <div class="delete-icon-wrap">
              <Trash2 :size="20" />
            </div>
            <button class="modal-close" @click="cancelDelete"><X :size="16" /></button>
          </div>
          <div class="delete-modal-body">
            <h3 class="delete-modal-title">Hapus Transaksi?</h3>
            <p class="delete-modal-desc">
              Transaksi <strong>"{{ deletingName }}"</strong> akan dihapus secara permanen dan tidak dapat dikembalikan.
            </p>
            <div v-if="store.error" class="error-alert" style="margin-top: 12px;">
              {{ store.error }}
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="cancelDelete" :disabled="deleting">Batal</button>
            <button class="btn-danger btn-half" @click="executeDelete" :disabled="deleting" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <Loader2 v-if="deleting" :size="16" class="spinner" />
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Stat Cards ─────────────────── */
.pb-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.pb-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
  cursor: default;
}
.pb-stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.1);
}

.pb-stat-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.pb-stat-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-red { background: rgba(239,68,68,0.15); color: #ef4444; }

.pb-stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.pb-stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 6px;
  font-family: 'Courier New', monospace;
  letter-spacing: -0.02em;
}

.pb-stat-sub {
  font-size: 12px;
  color: var(--text-muted);
}

/* ── Bar Chart ───────────────────── */
.bar-chart-wrap {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  height: 180px;
}

.bar-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding-bottom: 20px;
  text-align: right;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.bar-chart-body {
  flex: 1;
  height: 100%;
  position: relative;
}

.bar-grid-lines {
  position: absolute;
  inset: 0 0 20px 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
}
.bar-grid-line {
  width: 100%;
  height: 1px;
  background: rgba(255,255,255,0.05);
}

.bar-groups {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: calc(100% - 20px);
  position: relative;
  z-index: 1;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.bar-pair {
  display: flex;
  gap: 4px;
  align-items: flex-end;
}

.bar {
  width: 22px;
  border-radius: 4px 4px 0 0;
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: default;
}
.bar:hover { opacity: 0.85; }

.bar-masuk  { background: var(--accent-green); }
.bar-keluar { background: #e05f7e; }

.bar-label {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

/* ── Tabs ────────────────────────── */
.pb-tabs {
  display: flex;
  gap: 4px;
  padding: 16px 24px 0;
  border-bottom: 1px solid var(--border-color);
}

.pb-tab {
  padding: 10px 18px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
  font-family: 'Inter', sans-serif;
}
.pb-tab:hover { color: var(--text-primary); }
.pb-tab.active {
  color: var(--text-primary);
  border-bottom-color: var(--accent-orange);
  font-weight: 600;
}

/* ── Transaction List ─────────────── */
.tx-list {
  display: flex;
  flex-direction: column;
}

.tx-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--transition-fast);
  cursor: default;
}
.tx-row:last-child { border-bottom: none; }
.tx-row:hover { background: var(--bg-table-row-hover); }

.tx-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tx-icon-masuk  { background: rgba(16,185,129,0.15); color: var(--accent-green); }
.tx-icon-keluar { background: rgba(239,68,68,0.15);  color: #ef4444; }

.tx-detail { flex: 1; min-width: 0; }
.tx-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tx-meta {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.tx-dot { opacity: 0.4; }
.tx-proyek-id {
  font-family: 'Courier New', monospace;
  font-size: 11.5px;
  color: var(--accent-blue);
  font-weight: 600;
}

.tx-amount {
  font-size: 14px;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  letter-spacing: -0.02em;
  white-space: nowrap;
  flex-shrink: 0;
}
.tx-amount-masuk  { color: var(--accent-green); }
.tx-amount-keluar { color: #ef4444; }

.tx-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13.5px;
}

/* ── Modal ───────────────────────── */
.tx-type-toggle {
  display: flex;
  gap: 8px;
}
.tx-type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--border-color);
  background: var(--bg-base);
  color: var(--text-secondary);
  transition: all var(--transition-fast);
  font-family: 'Inter', sans-serif;
}
.tx-type-btn.active {
  background: rgba(16,185,129,0.15);
  border-color: var(--accent-green);
  color: var(--accent-green);
}
.tx-type-btn-keluar.active {
  background: rgba(239,68,68,0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.form-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%234a5568'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
  cursor: pointer;
}

/* ── Custom Combo Box ─────────────────── */
.custom-combo-box {
  position: relative;
}
.combo-input {
  width: 100%;
  padding-right: 32px;
}
.combo-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.combo-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
}
.combo-list {
  list-style: none;
  padding: 4px 0;
  margin: 0;
}
.combo-item {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s;
}
.combo-item:hover {
  background: rgba(255,255,255,0.05);
}
.combo-item-active {
  background: rgba(245,158,11,0.1) !important;
  color: var(--accent-orange);
}
.combo-empty {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── CRM Lead combo item layout ── */
.combo-dropdown-lead {
  max-height: 260px;
}
.combo-item-lead {
  padding: 9px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.combo-lead-top {
  display: flex;
  align-items: center;
  gap: 7px;
}
.combo-lead-kode {
  font-family: 'Courier New', monospace;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--accent-blue);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}
.combo-item-active .combo-lead-kode {
  color: var(--accent-orange);
}
.combo-lead-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 99px;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
.combo-lead-nama {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.combo-lead-perusahaan {
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.combo-none-label {
  font-size: 12.5px;
  color: var(--text-muted);
  font-style: italic;
}

/* ── Utilities ────────────────────────── */
.tx-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--text-muted);
  gap: 12px;
  font-size: 13.5px;
}
.spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-alert {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* Pagination */
.crm-pagination {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px 4px; font-size: 13px; color: var(--text-secondary);
}
.page-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent-orange); color: var(--accent-orange); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-weight: 600; }

/* ── Transaction Action Buttons ─────── */
.tx-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}
.tx-row:hover .tx-actions {
  opacity: 1;
}
.tx-action-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}
.tx-action-edit:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.08);
}
.tx-action-delete:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

/* ── Delete Confirmation Modal ──────── */
.modal-box-sm {
  max-width: 420px;
}
.delete-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 0;
  border-bottom: none;
}
.delete-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.delete-modal-body {
  padding: 4px 0 8px;
}
.delete-modal-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}
.delete-modal-desc {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}
.btn-danger {
  flex: 1;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 13.5px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: #ef4444;
  color: #fff;
  transition: all var(--transition-fast);
  font-family: 'Inter', sans-serif;
}
.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
