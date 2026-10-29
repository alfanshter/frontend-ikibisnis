<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  Package, Search, Plus, ChevronDown, ChevronUp,
  Edit3, Trash2, X, Check, Zap, Cable, Shield,
  Wrench, Box, Tag, Building2, Phone, Clock, StickyNote,
  AlertTriangle, Star, FileUp, Download,
} from '@lucide/vue'
import { partsApi, type PartResponse, type PartSupplierResponse } from '@/services/api'
import { formatRp as formatCurrencyRp } from '@/utils/currency'

// ─── Types ───────────────────────────────────────────────────────────────────
type Kategori = 'Elektrikal' | 'Kabel & Koneksi' | 'Hardware Keamanan' | 'Aksesoris' | 'Tools & Alat' | 'Lainnya'

// ─── Kategori Config ──────────────────────────────────────────────────────────
const kategoriConfig: Record<string, { icon: any; color: string; bg: string }> = {
  'Elektrikal':        { icon: Zap,    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Kabel & Koneksi':   { icon: Cable,  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  'Hardware Keamanan': { icon: Shield, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'Aksesoris':         { icon: Box,    color: '#06b6d4', bg: 'rgba(6,182,212,0.12)'  },
  'Tools & Alat':      { icon: Wrench, color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  'Lainnya':           { icon: Tag,    color: '#94a3b8', bg: 'rgba(148,163,184,0.12)'},
}

const allKategori: string[] = [
  'Elektrikal', 'Kabel & Koneksi', 'Hardware Keamanan',
  'Aksesoris', 'Tools & Alat', 'Lainnya',
]

// ─── State ────────────────────────────────────────────────────────────────────
const parts = ref<PartResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const filterKategori = ref<string>('')
const expandedId = ref<number | null>(null)
const showModal = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const deleteConfirmId = ref<number | null>(null)
const saving = ref(false)
const saveError = ref<string | null>(null)
const isImporting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const emptyPart = (): Omit<PartResponse, 'id'> => ({
  nama: '',
  sku: '',
  kategori: 'Elektrikal',
  merek: '',
  spesifikasi: '',
  satuan: 'pcs',
  stokMin: 1,
  suppliers: [{ id: 0, nama: '', kontak: '', harga: 0, leadTime: '', catatan: '', isPrimary: true }],
})

// draft can optionally have id for editing purposes
const draft = ref<Omit<PartResponse, 'id'> & { id?: number }>(emptyPart())

// ─── Fetching ─────────────────────────────────────────────────────────────────
async function fetchParts() {
  loading.value = true
  error.value = null
  try {
    const res = await partsApi.list()
    parts.value = res.data
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat master part.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchParts()
})

// ─── Computed ─────────────────────────────────────────────────────────────────
const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return parts.value.filter(p => {
    const matchQ = !q || [p.nama, p.sku, p.merek, p.spesifikasi, ...p.suppliers.map(s => s.nama)]
      .some(v => v?.toLowerCase().includes(q))
    const matchK = !filterKategori.value || p.kategori === filterKategori.value
    return matchQ && matchK
  })
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(15)

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const paginatedParts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch([searchQuery, filterKategori], () => {
  currentPage.value = 1
})

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

const hargaTerendah = (p: PartResponse) => p.suppliers.length > 0 ? Math.min(...p.suppliers.map(s => s.harga)) : 0
const supplierUtama = (p: PartResponse) => p.suppliers.find(s => s.isPrimary) ?? p.suppliers[0]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRp(n: number | string | null | undefined) {
  if (!n && n !== 0) return '-'
  return formatCurrencyRp(n)
}

function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

function getIcon(kat: string) {
  return kategoriConfig[kat]?.icon || Tag
}
function getColor(kat: string) {
  return kategoriConfig[kat]?.color || '#94a3b8'
}
function getBg(kat: string) {
  return kategoriConfig[kat]?.bg || 'rgba(148,163,184,0.12)'
}

// ─── CRUD Handlers ────────────────────────────────────────────────────────────
function openAdd() {
  modalMode.value = 'add'
  draft.value = emptyPart()
  saveError.value = null
  showModal.value = true
}

function openEdit(p: PartResponse) {
  modalMode.value = 'edit'
  draft.value = JSON.parse(JSON.stringify(p))
  saveError.value = null
  showModal.value = true
}

function addSupplierRow() {
  draft.value.suppliers.push({
    id: 0,
    nama: '', kontak: '', harga: 0, leadTime: '', catatan: '', isPrimary: false,
  })
}

function removeSupplierRow(idx: number) {
  draft.value.suppliers.splice(idx, 1)
}

function setPrimary(idx: number) {
  draft.value.suppliers.forEach((s, i) => { s.isPrimary = i === idx })
}

async function savePart() {
  if (!draft.value.nama || !draft.value.sku) {
    saveError.value = 'Nama part dan SKU wajib diisi.'
    return
  }
  saving.value = true
  saveError.value = null
  try {
    if (modalMode.value === 'add') {
      await partsApi.create(draft.value)
    } else if (draft.value.id) {
      await partsApi.update(draft.value.id, draft.value)
    }
    showModal.value = false
    fetchParts()
  } catch (e: any) {
    saveError.value = e.message || 'Gagal menyimpan part.'
  } finally {
    saving.value = false
  }
}

function confirmDelete(id: number) { deleteConfirmId.value = id }
function cancelDelete() { deleteConfirmId.value = null }
async function deletePart() {
  if (deleteConfirmId.value === null) return
  try {
    await partsApi.destroy(deleteConfirmId.value)
    if (expandedId.value === deleteConfirmId.value) expandedId.value = null
    deleteConfirmId.value = null
    fetchParts()
  } catch (e: any) {
    alert(e.message || 'Gagal menghapus part.')
  }
}

// ─── Import Excel ─────────────────────────────────────────────────────────────
function triggerFilePicker() {
  fileInput.value?.click()
}

async function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  isImporting.value = true
  try {
    await partsApi.importExcel(file)
    alert('Import berhasil!')
    fetchParts()
  } catch (err: any) {
    alert(err.message || 'Gagal import file.')
  } finally {
    isImporting.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function downloadTemplate() {
  try {
    await partsApi.downloadTemplate()
  } catch (err: any) {
    alert(err.message || 'Gagal mengunduh template')
  }
}
</script>

<template>
  <AdminLayout>
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <h1>Master Database Part</h1>
        <p>Katalog material & komponen beserta data supplier dan harga</p>
      </div>
      <div class="header-actions">
        <button class="btn-outline" @click="downloadTemplate" title="Download Template CSV">
          <Download :size="15" />
        </button>
        <input type="file" ref="fileInput" accept=".xlsx,.csv" style="display: none" @change="handleFileUpload" />
        <button class="btn-outline" @click="triggerFilePicker" :disabled="isImporting">
          <FileUp :size="15" />
          {{ isImporting ? 'Mengimpor...' : 'Import Excel' }}
        </button>
        <button class="btn-primary" @click="openAdd">
          <Plus :size="15" />
          Tambah Part
        </button>
      </div>
    </div>

    <!-- Search & Filter Bar -->
    <div class="filter-bar">
      <div class="search-wrap">
        <Search :size="16" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama part, SKU, merek, atau supplier..."
          class="search-input"
        />
      </div>
      <div class="kategori-tabs">
        <button
          class="ktab"
          :class="{ active: filterKategori === '' }"
          @click="filterKategori = ''"
        >Semua</button>
        <button
          v-for="k in allKategori"
          :key="k"
          class="ktab"
          :class="{ active: filterKategori === k }"
          @click="filterKategori = filterKategori === k ? '' : k"
        >
          <component :is="getIcon(k)" :size="13" />
          {{ k }}
        </button>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-chip">
        <Package :size="14" />
        <span><strong>{{ parts.length }}</strong> Total Part</span>
      </div>
      <div class="stat-chip">
        <Search :size="14" />
        <span><strong>{{ filtered.length }}</strong> Ditampilkan</span>
      </div>
      <div class="stat-chip" v-for="k in allKategori" :key="k">
        <component :is="getIcon(k)" :size="13" :style="{ color: getColor(k) }" />
        <span :style="{ color: getColor(k) }">
          <strong>{{ parts.filter(p => p.kategori === k).length }}</strong> {{ k }}
        </span>
      </div>
    </div>

    <!-- Part Table -->
    <div class="part-table-wrap">
      <div v-if="loading" class="empty-state" style="padding: 40px;">
        <Package :size="40" class="spin-anim" />
        <p>Memuat data part...</p>
      </div>

      <div v-else-if="filtered.length === 0" class="empty-state">
        <Package :size="40" />
        <p>Tidak ada part ditemukan</p>
        <span>Coba ubah kata kunci atau filter kategori</span>
      </div>

      <template v-else>
        <div class="part-table-head">
          <span>Nama Part & SKU</span>
          <span>Kategori</span>
          <span>Merek</span>
          <span>Satuan</span>
          <span>Supplier Utama</span>
          <span>Harga Terendah</span>
          <span>Aksi</span>
        </div>

        <div
          v-for="p in paginatedParts"
          :key="p.id"
          class="part-row-wrap"
          :class="{ expanded: expandedId === p.id }"
        >
          <!-- Main Row -->
          <div class="part-row" @click="toggleExpand(p.id)">
            <!-- Nama & SKU -->
            <div class="cell-name">
              <span class="part-name">{{ p.nama }}</span>
              <span class="part-sku">{{ p.sku }}</span>
            </div>

            <!-- Kategori Badge -->
            <div class="cell-kategori">
              <span
                class="badge-kategori"
                :style="{ background: getBg(p.kategori), color: getColor(p.kategori) }"
              >
                <component :is="getIcon(p.kategori)" :size="11" />
                {{ p.kategori }}
              </span>
            </div>

            <!-- Merek -->
            <div class="cell-text">{{ p.merek }}</div>

            <!-- Satuan -->
            <div class="cell-text muted">{{ p.satuan }}</div>

            <!-- Supplier Utama -->
            <div class="cell-text">{{ supplierUtama(p)?.nama ?? '-' }}</div>

            <!-- Harga Terendah -->
            <div class="cell-harga">{{ formatRp(hargaTerendah(p)) }}</div>

            <!-- Aksi -->
            <div class="cell-aksi" @click.stop>
              <button class="btn-icon edit" title="Edit" @click="openEdit(p)">
                <Edit3 :size="14" />
              </button>
              <button class="btn-icon del" title="Hapus" @click="confirmDelete(p.id)">
                <Trash2 :size="14" />
              </button>
              <button class="btn-icon expand-btn" :title="expandedId === p.id ? 'Tutup' : 'Lihat Supplier'" @click="toggleExpand(p.id)">
                <ChevronDown :size="14" :class="{ rotated: expandedId === p.id }" />
              </button>
            </div>
          </div>

          <!-- Expanded: Spesifikasi + Supplier List -->
          <transition name="expand">
            <div v-if="expandedId === p.id" class="part-detail">
              <!-- Spesifikasi -->
              <div class="detail-spec">
                <span class="detail-label">Spesifikasi:</span>
                <span class="detail-spec-text">{{ p.spesifikasi }}</span>
              </div>

              <!-- Supplier Table -->
              <div class="supplier-section">
                <div class="supplier-title">
                  <Building2 :size="13" />
                  Daftar Supplier ({{ p.suppliers.length }})
                </div>
                <div class="supplier-table">
                  <div class="sup-head">
                    <span>Supplier</span>
                    <span>Kontak</span>
                    <span>Harga/{{ p.satuan }}</span>
                    <span>Lead Time</span>
                    <span>Catatan</span>
                    <span>Status</span>
                  </div>
                  <div
                    v-for="s in p.suppliers"
                    :key="s.id"
                    class="sup-row"
                    :class="{ primary: s.isPrimary }"
                  >
                    <span class="sup-nama">{{ s.nama }}</span>
                    <span class="sup-kontak">
                      <Phone :size="11" /> {{ s.kontak }}
                    </span>
                    <span class="sup-harga">{{ formatRp(s.harga) }}</span>
                    <span class="sup-lead">
                      <Clock :size="11" /> {{ s.leadTime || '-' }}
                    </span>
                    <span class="sup-catatan muted">{{ s.catatan || '-' }}</span>
                    <span class="sup-badge">
                      <span v-if="s.isPrimary" class="badge-primary">
                        <Star :size="10" /> Utama
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </template>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="filtered.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ filtered.length }} part
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

    <!-- ─── Delete Confirm ────────────────────────────────────────────── -->
    <div v-if="deleteConfirmId !== null" class="modal-overlay" @click.self="cancelDelete">
      <div class="modal-box modal-confirm">
        <div class="confirm-icon">
          <AlertTriangle :size="28" />
        </div>
        <h3>Hapus Part?</h3>
        <p>Data part dan seluruh supplier akan dihapus permanen.</p>
        <div class="confirm-actions">
          <button class="btn-ghost" @click="cancelDelete">Batal</button>
          <button class="btn-danger" @click="deletePart">Ya, Hapus</button>
        </div>
      </div>
    </div>

    <!-- ─── Add / Edit Modal ──────────────────────────────────────────── -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box modal-form">
        <div class="modal-header">
          <h2>{{ modalMode === 'add' ? 'Tambah Part Baru' : 'Edit Part' }}</h2>
          <button class="btn-icon" @click="showModal = false"><X :size="18" /></button>
        </div>

        <div class="modal-body">
          <!-- Row 1 -->
          <div class="form-row">
            <div class="form-group flex2">
              <label>Nama Part <span class="req">*</span></label>
              <input v-model="draft.nama" type="text" class="form-input" placeholder="Contoh: MCB 1 Phase 6A Schneider" />
            </div>
            <div class="form-group">
              <label>Kode SKU <span class="req">*</span></label>
              <input v-model="draft.sku" type="text" class="form-input" placeholder="EL-MCB-6A-SCH" />
            </div>
          </div>

          <!-- Row 2 -->
          <div class="form-row">
            <div class="form-group">
              <label>Kategori</label>
              <select v-model="draft.kategori" class="form-input">
                <option v-for="k in allKategori" :key="k" :value="k">{{ k }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Merek</label>
              <input v-model="draft.merek" type="text" class="form-input" placeholder="Schneider, Hikvision, dll" />
            </div>
            <div class="form-group" style="max-width:130px">
              <label>Satuan</label>
              <select v-model="draft.satuan" class="form-input">
                <option v-for="s in ['pcs','unit','meter','roll','batang','set','buah','kg','liter']" :key="s">{{ s }}</option>
              </select>
            </div>
          </div>

          <!-- Spesifikasi -->
          <div class="form-group">
            <label>Spesifikasi Teknis</label>
            <textarea v-model="draft.spesifikasi" class="form-input" rows="2" placeholder="Detail teknis produk..."></textarea>
          </div>

          <!-- Suppliers -->
          <div class="supplier-form-section">
            <div class="sup-form-title">
              <Building2 :size="14" />
              Supplier & Harga
            </div>

            <div v-for="(s, i) in draft.suppliers" :key="i" class="sup-form-row">
              <div class="sup-form-fields">
                <div class="form-group flex2">
                  <label>Nama Supplier</label>
                  <input v-model="s.nama" type="text" class="form-input" placeholder="PT / CV / Toko..." />
                </div>
                <div class="form-group">
                  <label>Kontak</label>
                  <input v-model="s.kontak" type="text" class="form-input" placeholder="021-xxx / 08xx" />
                </div>
                <div class="form-group" style="max-width:160px">
                  <label>Harga (Rp)</label>
                  <input v-model.number="s.harga" type="number" class="form-input" placeholder="0" />
                </div>
                <div class="form-group" style="max-width:140px">
                  <label>Lead Time</label>
                  <input v-model="s.leadTime" type="text" class="form-input" placeholder="1-2 hari" />
                </div>
              </div>
              <div class="sup-form-actions">
                <button
                  type="button"
                  class="btn-primary-badge"
                  :class="{ active: s.isPrimary }"
                  @click="setPrimary(i)"
                  title="Set sebagai supplier utama"
                >
                  <Star :size="12" />
                  {{ s.isPrimary ? 'Utama' : 'Set Utama' }}
                </button>
                <button
                  v-if="draft.suppliers.length > 1"
                  type="button"
                  class="btn-icon del"
                  @click="removeSupplierRow(i)"
                >
                  <X :size="13" />
                </button>
              </div>
            </div>

            <button type="button" class="btn-add-supplier" @click="addSupplierRow">
              <Plus :size="13" /> Tambah Supplier
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" @click="showModal = false">Batal</button>
          <button class="btn-primary" @click="savePart">
            <Check :size="15" />
            {{ modalMode === 'add' ? 'Simpan Part' : 'Update Part' }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
/* ── Page Header ─────────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.page-header p {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}
.header-left { flex: 1; }
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ── Buttons ─────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s, transform 0.15s;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: var(--text-primary);
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-outline:hover { background: rgba(255,255,255,0.05); }
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-primary);
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
}
.btn-ghost:hover { background: rgba(255,255,255,0.08); }

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.05);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.btn-icon.edit:hover { background: rgba(99,102,241,0.15); color: #818cf8; }
.btn-icon.del:hover  { background: rgba(248,113,113,0.15); color: #f87171; }
.btn-icon.expand-btn { background: transparent; }
.btn-icon.expand-btn:hover { background: rgba(255,255,255,0.06); }

.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-danger:hover { background: #dc2626; }

/* ── Filter Bar ──────────────────────────────────────────────────── */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.search-wrap {
  position: relative;
  max-width: 520px;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 10px 14px 10px 42px;
  background: var(--surface-card, #1e2535);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.search-input:focus { border-color: rgba(99,102,241,0.5); }
.search-input::placeholder { color: var(--text-muted); }

.kategori-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ktab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.08);
  background: var(--surface-card, #1e2535);
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.18s;
}
.ktab:hover { border-color: rgba(255,255,255,0.15); color: var(--text-primary); }
.ktab.active {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.4);
  color: #818cf8;
}

/* ── Stats Row ───────────────────────────────────────────────────── */
.stats-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--surface-card, #1e2535);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.stat-chip strong { color: var(--text-primary); }

/* ── Table ───────────────────────────────────────────────────────── */
.part-table-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.part-table-head {
  display: grid;
  grid-template-columns: 2.5fr 1.4fr 1fr 0.7fr 1.6fr 1.2fr 0.8fr;
  gap: 12px;
  padding: 8px 18px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.part-row-wrap {
  background: var(--surface-card, #1e2535);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.part-row-wrap:hover,
.part-row-wrap.expanded {
  border-color: rgba(99,102,241,0.3);
}

.part-row {
  display: grid;
  grid-template-columns: 2.5fr 1.4fr 1fr 0.7fr 1.6fr 1.2fr 0.8fr;
  gap: 12px;
  padding: 14px 18px;
  align-items: center;
  cursor: pointer;
}

.cell-name { display: flex; flex-direction: column; gap: 3px; }
.part-name { font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 1.3; }
.part-sku  { font-size: 11px; color: var(--text-muted); font-family: monospace; }

.badge-kategori {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.cell-text { font-size: 13px; color: var(--text-primary); }
.cell-text.muted { color: var(--text-muted); }
.cell-harga { font-size: 13px; font-weight: 700; color: #34d399; }

.cell-aksi {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.expand-btn svg {
  transition: transform 0.25s ease;
}
.expand-btn svg.rotated {
  transform: rotate(180deg);
}

/* ── Expanded Detail ─────────────────────────────────────────────── */
.part-detail {
  padding: 0 18px 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
  animation: none;
}

.detail-spec {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 14px;
  padding-top: 14px;
  font-size: 13px;
}
.detail-label {
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 600;
  min-width: 100px;
}
.detail-spec-text { color: var(--text-primary); }

.supplier-section { }
.supplier-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

.supplier-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}
.sup-head {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.2fr 1fr 1.5fr 0.8fr;
  gap: 10px;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: rgba(255,255,255,0.02);
}
.sup-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1.2fr 1fr 1.5fr 0.8fr;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-primary);
  border-top: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.sup-row:hover { background: rgba(255,255,255,0.02); }
.sup-row.primary { background: rgba(99,102,241,0.05); }

.sup-nama { font-weight: 600; }
.sup-kontak, .sup-lead {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-muted);
  font-size: 12px;
}
.sup-harga { color: #34d399; font-weight: 700; }
.sup-catatan { color: var(--text-muted); font-size: 12px; }

.badge-primary {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(99,102,241,0.15);
  color: #818cf8;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}

/* ── Expand Transition ───────────────────────────────────────────── */
.expand-enter-active, .expand-leave-active {
  transition: max-height 0.3s ease, opacity 0.25s ease;
  max-height: 600px;
  overflow: hidden;
}
.expand-enter-from, .expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Empty State ─────────────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 20px;
  color: var(--text-muted);
}
.empty-state p { font-size: 15px; font-weight: 600; margin: 0; }
.empty-state span { font-size: 13px; }

/* ── Modal ───────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 20px;
}

.modal-box {
  background: var(--surface-card, #1e2535);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.5);
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-confirm {
  max-width: 380px;
  padding: 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.confirm-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(239,68,68,0.12);
  color: #f87171;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.modal-confirm h3 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0; }
.modal-confirm p  { font-size: 14px; color: var(--text-muted); margin: 0; }
.confirm-actions  { display: flex; gap: 10px; margin-top: 8px; }

.modal-form { max-width: 780px; }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.modal-header h2 { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0; }

.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255,255,255,0.07);
}

/* ── Form ────────────────────────────────────────────────────────── */
.form-row { display: flex; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.form-group.flex2 { flex: 2; }
.form-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.req { color: #f87171; }
.form-input {
  width: 100%;
  padding: 9px 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.form-input:focus { border-color: rgba(99,102,241,0.5); }
select.form-input { cursor: pointer; }
select.form-input option { background: #1e2535; }
textarea.form-input { resize: vertical; min-height: 60px; }

/* ── Supplier Form ───────────────────────────────────────────────── */
.supplier-form-section {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sup-form-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.sup-form-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
}
.sup-form-fields {
  display: flex;
  gap: 10px;
  flex: 1;
  flex-wrap: wrap;
}
.sup-form-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding-bottom: 2px;
}

.btn-primary-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.btn-primary-badge.active {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.4);
  color: #818cf8;
}
.btn-primary-badge:hover { border-color: rgba(255,255,255,0.2); color: var(--text-primary); }

.btn-add-supplier {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px dashed rgba(255,255,255,0.12);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}
.btn-add-supplier:hover {
  background: rgba(99,102,241,0.1);
  border-color: rgba(99,102,241,0.3);
  color: #818cf8;
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
</style>
