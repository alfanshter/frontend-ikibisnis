<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  ArrowLeft, Plus, X, Trash2, Edit3, Search, ChevronDown,
  Receipt, FileText, Image as ImageIcon, Paperclip,
  Fuel, Utensils, Wrench, Package, Truck, ShieldCheck,
  AlertCircle, CheckCircle2, Clock, MoreHorizontal, RefreshCw
} from '@lucide/vue'
import {
  proyeksApi,
  proyekBiayaLainApi,
  type ProyekResponse,
  type ProyekBiayaLainResponse,
  type KategoriBiaya,
  type StatusBiayaLain
} from '@/services/api'

const route    = useRoute()
const router   = useRouter()
const proyekId = Number(route.params.id)

// ── State ──
const proyek = ref<ProyekResponse | null>(null)
const biayaList = ref<ProyekBiayaLainResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [pRes, bRes] = await Promise.all([
      proyeksApi.show(proyekId),
      proyekBiayaLainApi.list(proyekId)
    ])
    proyek.value = pRes.data
    biayaList.value = bRes.data
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

// ── Kategori config ──
const kategoriCfg: Record<KategoriBiaya, { color: string; bg: string; border: string; icon: any }> = {
  'BBM / Transportasi':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  icon: Fuel },
  'Konsumsi / Makan':     { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',   icon: Utensils },
  'Alat & Perkakas':      { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.25)',  icon: Wrench },
  'Bahan Pendukung':      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',   border: 'rgba(139,92,246,0.25)', icon: Package },
  'Pengiriman / Ekspedisi':{ color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)',  icon: Truck },
  'Parkir & Tol':         { color: '#64748b', bg: 'rgba(100,116,139,0.1)',  border: 'rgba(100,116,139,0.25)',icon: ShieldCheck },
  'Komunikasi':           { color: '#ec4899', bg: 'rgba(236,72,153,0.1)',   border: 'rgba(236,72,153,0.25)', icon: MoreHorizontal },
  'Lain-lain':            { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)',icon: Receipt },
}

const statusCfg: Record<StatusBiayaLain, { color: string; bg: string; border: string; icon: any }> = {
  'Belum Direimburse': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  icon: AlertCircle },
  'Sudah Direimburse': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',  icon: CheckCircle2 },
}

const kategoriList: KategoriBiaya[] = [
  'BBM / Transportasi', 'Konsumsi / Makan', 'Alat & Perkakas',
  'Bahan Pendukung', 'Pengiriman / Ekspedisi', 'Parkir & Tol',
  'Komunikasi', 'Lain-lain',
]

// ── Filter & Search ──
const searchQ       = ref('')
const filterKategori= ref<KategoriBiaya | 'Semua'>('Semua')
const filterStatus  = ref<StatusBiayaLain | 'Semua'>('Semua')

const filteredList = computed(() => biayaList.value.filter(b => {
  const q = searchQ.value.toLowerCase()
  const matchQ   = !q || b.nama.toLowerCase().includes(q) || (b.dibayarOleh || '').toLowerCase().includes(q)
  const matchKat  = filterKategori.value === 'Semua' || b.kategori === filterKategori.value
  const matchStat = filterStatus.value  === 'Semua' || b.status   === filterStatus.value
  return matchQ && matchKat && matchStat
}))

// ── Summary stats ──
const totalBiaya      = computed(() => biayaList.value.reduce((s, b) => s + b.nominal, 0))
const totalBelumReimburse = computed(() => biayaList.value.filter(b => b.status === 'Belum Direimburse').reduce((s, b) => s + b.nominal, 0))
const totalSudahReimburse = computed(() => biayaList.value.filter(b => b.status === 'Sudah Direimburse').reduce((s, b) => s + b.nominal, 0))

const fmtRp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID')

// ── Modal CRUD ──
const showModal  = ref(false)
const editingId  = ref<number | null>(null)

const defaultForm = (): Partial<ProyekBiayaLainResponse> => ({
  tanggal: new Date().toISOString().slice(0, 10),
  nama: '',
  kategori: 'Lain-lain',
  nominal: 0,
  dibayar_oleh: '',
  status: 'Belum Direimburse',
  keterangan: '',
  bukti: '',
  bukti_tipe: null,
})

const form      = ref(defaultForm())
const buktiFile = ref<File | null>(null)
const buktiType = ref<'image' | 'pdf' | null>(null)
const buktiPrev = ref<string>('')

const handleBuktiUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    buktiFile.value = file
    if (file.type === 'application/pdf') {
      buktiType.value = 'pdf'
      buktiPrev.value = file.name
      form.value.bukti = file.name
      form.value.bukti_tipe = 'pdf'
    } else {
      buktiType.value = 'image'
      const url = URL.createObjectURL(file)
      buktiPrev.value = url
      form.value.bukti = url
      form.value.bukti_tipe = 'image'
    }
  }
}

const clearBukti = () => {
  buktiFile.value = null
  buktiType.value = null
  buktiPrev.value = ''
  form.value.bukti = ''
  form.value.bukti_tipe = null
}

const openModal = (item?: ProyekBiayaLainResponse) => {
  if (item) {
    editingId.value = item.id
    form.value = { ...item, dibayar_oleh: item.dibayarOleh, bukti_tipe: item.buktiTipe }
    buktiType.value = item.buktiTipe ?? null
    buktiPrev.value = item.bukti ?? ''
  } else {
    editingId.value = null
    form.value = defaultForm()
    buktiFile.value = null
    buktiType.value = null
    buktiPrev.value = ''
  }
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const submitForm = async () => {
  if (!form.value.nama?.trim() || (form.value.nominal || 0) <= 0) return
  saving.value = true
  try {
    if (editingId.value !== null) {
      await proyekBiayaLainApi.update(proyekId, editingId.value, form.value)
    } else {
      await proyekBiayaLainApi.create(proyekId, form.value)
    }
    await fetchData()
    closeModal()
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan biaya lain')
  } finally {
    saving.value = false
  }
}

// ── Delete ──
const showDeleteModal = ref(false)
const deleteId        = ref<number | null>(null)

const requestDelete = (id: number) => {
  deleteId.value = id
  showDeleteModal.value = true
}
const closeDeleteModal = () => { showDeleteModal.value = false; deleteId.value = null }
const confirmDelete = async () => {
  if (deleteId.value !== null) {
    saving.value = true
    try {
      await proyekBiayaLainApi.delete(proyekId, deleteId.value)
      await fetchData()
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus biaya')
    } finally {
      saving.value = false
      closeDeleteModal()
    }
  }
}

// ── Toggle reimburse ──
const toggleReimburse = async (item: ProyekBiayaLainResponse) => {
  const newStatus = item.status === 'Belum Direimburse' ? 'Sudah Direimburse' : 'Belum Direimburse'
  try {
    await proyekBiayaLainApi.updateStatus(proyekId, item.id, newStatus)
    item.status = newStatus
  } catch (e: any) {
    alert(e.message || 'Gagal mengubah status')
  }
}

const goBack = () => router.push(`/admin/proyek/${proyekId}`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 960px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Header ── -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <button class="btn-ghost" style="padding:8px; border-radius:8px;" @click="goBack">
            <ArrowLeft :size="20" />
          </button>
          <div v-if="loading" style="display:flex; align-items:center; gap:10px; color:var(--text-muted);">
            <RefreshCw :size="16" class="spin-icon" /> Memuat data...
          </div>
          <div v-else-if="error" style="color:#ef4444; display:flex; align-items:center; gap:8px;">
            <AlertCircle :size="16" /> {{ error }}
          </div>
          <div v-else>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:2px; text-transform:uppercase; letter-spacing:0.06em;">
              {{ proyek?.kode }} · Biaya Lain-lain
            </div>
            <h1 style="font-size:20px; color:var(--text-primary); margin:0; font-weight:700;">{{ proyek?.nama }}</h1>
          </div>
        </div>
        <button class="btn-primary" @click="openModal()">
          <Plus :size="14" style="margin-right:6px;" /> Tambah Biaya
        </button>
      </div>

      <!-- ── Summary Cards ── -->
      <div class="bl-stats">
        <div class="bl-stat-card">
          <div class="bl-stat-icon" style="background:rgba(245,158,11,0.12); color:var(--accent-orange);">
            <Receipt :size="18" />
          </div>
          <div>
            <div class="bl-stat-num">{{ fmtRp(totalBiaya) }}</div>
            <div class="bl-stat-label">Total Biaya</div>
          </div>
        </div>
        <div class="bl-stat-card">
          <div class="bl-stat-icon" style="background:rgba(239,68,68,0.12); color:#ef4444;">
            <AlertCircle :size="18" />
          </div>
          <div>
            <div class="bl-stat-num" style="color:#ef4444;">{{ fmtRp(totalBelumReimburse) }}</div>
            <div class="bl-stat-label">Belum Direimburse</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">{{ biayaList.filter(b => b.status === 'Belum Direimburse').length }} item</div>
          </div>
        </div>
        <div class="bl-stat-card">
          <div class="bl-stat-icon" style="background:rgba(34,197,94,0.12); color:#22c55e;">
            <CheckCircle2 :size="18" />
          </div>
          <div>
            <div class="bl-stat-num" style="color:#22c55e;">{{ fmtRp(totalSudahReimburse) }}</div>
            <div class="bl-stat-label">Sudah Direimburse</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">{{ biayaList.filter(b => b.status === 'Sudah Direimburse').length }} item</div>
          </div>
        </div>
        <div class="bl-stat-card">
          <div class="bl-stat-icon" style="background:rgba(59,130,246,0.12); color:#3b82f6;">
            <Clock :size="18" />
          </div>
          <div>
            <div class="bl-stat-num" style="color:#3b82f6; font-size:20px;">{{ biayaList.length }}</div>
            <div class="bl-stat-label">Total Transaksi</div>
          </div>
        </div>
      </div>

      <!-- ── Filter Bar ── -->
      <div class="bl-filter-bar">
        <div class="ft-search-wrap">
          <Search :size="15" class="ft-search-icon" />
          <input v-model="searchQ" class="ft-search-input" placeholder="Cari nama biaya atau penanggung jawab..." />
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <div class="ft-select-wrap">
            <select v-model="filterKategori" class="ft-select">
              <option value="Semua">Semua Kategori</option>
              <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
            </select>
            <ChevronDown :size="13" class="ft-select-arrow" />
          </div>
          <div class="ft-select-wrap">
            <select v-model="filterStatus" class="ft-select">
              <option value="Semua">Semua Status</option>
              <option value="Belum Direimburse">Belum Direimburse</option>
              <option value="Sudah Direimburse">Sudah Direimburse</option>
            </select>
            <ChevronDown :size="13" class="ft-select-arrow" />
          </div>
        </div>
      </div>

      <!-- ── Empty State ── -->
      <div v-if="filteredList.length === 0" class="card" style="padding:50px 20px; text-align:center;">
        <Receipt :size="40" style="color:var(--text-muted); margin-bottom:12px;" />
        <div style="color:var(--text-muted); font-size:14px; margin-bottom:12px;">Belum ada biaya lain-lain tercatat.</div>
        <button class="btn-primary" @click="openModal()">
          <Plus :size="14" style="margin-right:6px;" /> Tambah Biaya
        </button>
      </div>

      <!-- ── Biaya List ── -->
      <div v-else class="bl-list">
        <div v-for="item in filteredList" :key="item.id" class="bl-card">

          <!-- Kategori icon strip -->
          <div class="bl-kategori-strip"
            :style="{ background: kategoriCfg[item.kategori].bg, borderColor: kategoriCfg[item.kategori].border }">
            <component :is="kategoriCfg[item.kategori].icon" :size="16" :style="{ color: kategoriCfg[item.kategori].color }" />
          </div>

          <!-- Main content -->
          <div class="bl-card-body">
            <!-- Row 1: Nama + nominal -->
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px;">
              <div>
                <div style="font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:3px;">{{ item.nama }}</div>
                <div class="bl-kategori-badge"
                  :style="{ color: kategoriCfg[item.kategori].color, background: kategoriCfg[item.kategori].bg }">
                  <component :is="kategoriCfg[item.kategori].icon" :size="10" />
                  {{ item.kategori }}
                </div>
              </div>
              <div style="text-align:right; flex-shrink:0;">
                <div style="font-size:18px; font-weight:800; font-family:monospace; color:var(--text-primary);">
                  {{ fmtRp(item.nominal) }}
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">{{ item.tanggal }}</div>
              </div>
            </div>

            <!-- Row 2: Meta info -->
            <div class="bl-meta-row">
              <span class="bl-meta-chip">
                👤 {{ item.dibayarOleh }}
              </span>
              <span v-if="item.keterangan" class="bl-meta-note">{{ item.keterangan }}</span>
            </div>

            <!-- Row 3: Actions -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:12px; flex-wrap:wrap; gap:8px;">
              <!-- Status badge + toggle -->
              <button
                class="bl-status-btn"
                :style="{
                  color: statusCfg[item.status].color,
                  background: statusCfg[item.status].bg,
                  borderColor: statusCfg[item.status].border
                }"
                @click="toggleReimburse(item)"
                :title="item.status === 'Belum Direimburse' ? 'Klik untuk tandai sudah direimburse' : 'Klik untuk batalkan reimburse'"
              >
                <component :is="statusCfg[item.status].icon" :size="12" />
                {{ item.status }}
              </button>

              <!-- Right actions -->
              <div style="display:flex; align-items:center; gap:6px;">
                <a v-if="item.bukti" href="#" class="bl-bukti-link" @click.prevent>
                  <Paperclip :size="11" />
                  {{ item.buktiTipe === 'pdf' ? 'Lihat PDF' : 'Lihat Bukti' }}
                </a>
                <button class="ft-btn-icon" title="Edit" @click="openModal(item)">
                  <Edit3 :size="13" />
                </button>
                <button class="ft-btn-icon ft-btn-del" title="Hapus" @click="requestDelete(item.id)">
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Footer total ── -->
      <div v-if="filteredList.length > 0" class="bl-total-row">
        <span>{{ filteredList.length }} transaksi</span>
        <span>Total: <strong style="color:var(--accent-orange); font-family:monospace; margin-left:4px;">{{ fmtRp(filteredList.reduce((s, b) => s + b.nominal, 0)) }}</strong></span>
      </div>

    </div>

    <!-- ══ Modal Tambah / Edit ══ -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width:560px;">
          <div class="modal-header">
            <h2>{{ editingId ? 'Edit Biaya' : 'Tambah Biaya Lain-lain' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">

            <!-- Nama biaya + tanggal -->
            <div class="form-row">
              <div class="form-field" style="flex:2;">
                <label class="form-label">Nama / Deskripsi Biaya *</label>
                <input v-model="form.nama" class="form-input" placeholder="Misal: Bensin perjalanan ke lokasi" />
              </div>
              <div class="form-field">
                <label class="form-label">Tanggal *</label>
                <input v-model="form.tanggal" type="date" class="form-input" />
              </div>
            </div>

            <!-- Kategori + Nominal -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Kategori</label>
                <select v-model="form.kategori" class="form-input">
                  <option v-for="k in kategoriList" :key="k" :value="k">{{ k }}</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Nominal (Rp) *</label>
                <input v-model.number="form.nominal" type="number" min="0" class="form-input" placeholder="0" />
              </div>
            </div>

            <!-- Dibayar oleh + Status -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Dibayar Oleh</label>
                <input v-model="form.dibayar_oleh" class="form-input" placeholder="Nama tim yang membayar duluan" />
              </div>
              <div class="form-field">
                <label class="form-label">Status Reimburse</label>
                <select v-model="form.status" class="form-input">
                  <option value="Belum Direimburse">Belum Direimburse</option>
                  <option value="Sudah Direimburse">Sudah Direimburse</option>
                </select>
              </div>
            </div>

            <!-- Bukti pengeluaran -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">
                  Bukti Pengeluaran
                  <span style="color:var(--text-muted); font-weight:400; font-size:11px;"> (Foto / PDF – Opsional)</span>
                </label>
                <div class="pc-upload-box" :style="buktiType ? 'height: 110px;' : 'height: 80px;'">
                  <input type="file" accept="image/*,application/pdf" @change="handleBuktiUpload" class="pc-file-input" />
                  <!-- Empty -->
                  <div class="pc-upload-placeholder" v-if="!buktiType">
                    <div style="display:flex; gap:10px; margin-bottom:6px; color:var(--text-muted);">
                      <ImageIcon :size="20" />
                      <span style="font-size:13px; color:var(--text-muted);">|</span>
                      <FileText :size="20" />
                    </div>
                    <span>Klik untuk pilih foto atau PDF nota/struk</span>
                    <span style="font-size:10.5px; margin-top:2px; color:var(--text-muted);">JPG, PNG, PDF didukung</span>
                  </div>
                  <!-- Image preview -->
                  <img v-else-if="buktiType === 'image'" :src="buktiPrev" style="object-fit:contain; width:100%; height:100%; border-radius:6px;" />
                  <!-- PDF preview -->
                  <div v-else class="pc-pdf-preview">
                    <FileText :size="32" style="color:var(--accent-orange);" />
                    <span class="pc-pdf-name">{{ buktiPrev }}</span>
                    <button class="pc-pdf-clear" type="button" @click.stop="clearBukti"><X :size="12" /></button>
                  </div>
                </div>
                <button v-if="buktiType === 'image'" type="button" class="pc-clear-btn" @click="clearBukti">
                  <X :size="11" /> Hapus
                </button>
              </div>
            </div>

            <!-- Keterangan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Keterangan (Opsional)</label>
                <textarea v-model="form.keterangan" class="form-textarea" placeholder="Catatan tambahan, tujuan pengeluaran, dsb." style="min-height:64px;"></textarea>
              </div>
            </div>

          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm">
              {{ editingId ? 'Simpan Perubahan' : 'Tambah Biaya' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ══ Modal Konfirmasi Hapus ══ -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
        <div class="modal-box" style="max-width:400px; text-align:center; padding-top:32px;">
          <div style="margin-bottom:20px;">
            <div style="width:64px; height:64px; border-radius:50%; background:rgba(239,68,68,0.1); color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto;">
              <Trash2 :size="32" />
            </div>
          </div>
          <h2 style="margin-bottom:12px; font-size:18px; color:var(--text-primary);">Hapus Biaya</h2>
          <p style="color:var(--text-secondary); font-size:14px; margin-bottom:28px; line-height:1.6; padding:0 10px;">
            Apakah Anda yakin ingin menghapus catatan biaya ini?
          </p>
          <div class="modal-footer modal-footer-split" style="border-top:none; padding:0;">
            <button class="btn-ghost btn-half" @click="closeDeleteModal">Batal</button>
            <button class="btn-primary btn-half" style="background:#ef4444; border-color:#ef4444;" @click="confirmDelete">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

  </AdminLayout>
</template>

<style scoped>
/* ── Spin animation ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { animation: spin 1s linear infinite; }

/* ── Stats ── */
.bl-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 700px) { .bl-stats { grid-template-columns: repeat(2, 1fr); } }
.bl-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.bl-stat-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.bl-stat-num {
  font-size: 15px; font-weight: 800;
  color: var(--text-primary);
  font-family: monospace; line-height: 1.2;
}
.bl-stat-label {
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;
}

/* ── Filter bar ── */
.bl-filter-bar {
  display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
}

/* ── List ── */
.bl-list { display: flex; flex-direction: column; gap: 10px; }
.bl-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  display: flex;
  overflow: hidden;
  transition: all 0.2s;
}
.bl-card:hover {
  border-color: rgba(245,158,11,0.25);
  box-shadow: 0 2px 16px rgba(0,0,0,0.1);
}
.bl-kategori-strip {
  width: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid;
  border-radius: 0;
}
.bl-card-body {
  flex: 1;
  padding: 16px 18px;
  min-width: 0;
}
.bl-kategori-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.bl-meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.bl-meta-chip {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 3px 10px;
  white-space: nowrap;
}
.bl-meta-note {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bl-status-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.bl-status-btn:hover { filter: brightness(1.1); }
.bl-bukti-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--accent-orange);
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  padding: 4px 10px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  transition: all 0.15s;
}
.bl-bukti-link:hover { background: rgba(245,158,11,0.15); }

/* ── Footer ── */
.bl-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  font-size: 13px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  margin-top: 8px;
}

/* ── Reuse from FeeTimView ── */
.ft-search-wrap { position: relative; flex: 1; min-width: 200px; }
.ft-search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);
}
.ft-search-input {
  width: 100%; padding: 9px 12px 9px 36px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-primary); font-size: 13.5px;
  outline: none; box-sizing: border-box; transition: border-color 0.2s;
}
.ft-search-input:focus { border-color: var(--accent-orange); }
.ft-select-wrap { position: relative; }
.ft-select {
  appearance: none; background: var(--bg-card);
  border: 1px solid var(--border-color); border-radius: 8px;
  color: var(--text-primary); font-size: 13px; padding: 8px 30px 8px 12px;
  outline: none; cursor: pointer; transition: border-color 0.2s;
}
.ft-select:focus { border-color: var(--accent-orange); }
.ft-select-arrow {
  position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); pointer-events: none;
}
.ft-btn-icon {
  background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 6px 8px; color: var(--text-muted);
  cursor: pointer; display: flex; align-items: center; transition: all 0.15s;
}
.ft-btn-icon:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.ft-btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

/* ── File Upload ── */
.pc-upload-box {
  position: relative; width: 100%;
  border: 1px dashed var(--border-color);
  border-radius: 8px; background: rgba(255,255,255,0.02);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; transition: all 0.2s;
}
.pc-upload-box:hover { border-color: var(--accent-orange); background: rgba(245,158,11,0.05); }
.pc-file-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; z-index: 2; }
.pc-upload-placeholder {
  display: flex; flex-direction: column; align-items: center;
  color: var(--text-muted); font-size: 11px;
}
.pc-pdf-preview {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px; padding: 8px; width: 100%; position: relative;
}
.pc-pdf-name {
  font-size: 11px; color: var(--text-secondary);
  max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;
}
.pc-pdf-clear {
  position: absolute; top: 4px; right: 8px;
  background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #ef4444;
  border-radius: 50%; width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s; z-index: 3;
}
.pc-pdf-clear:hover { background: rgba(239,68,68,0.25); }
.pc-clear-btn {
  display: inline-flex; align-items: center; gap: 4px; margin-top: 6px;
  font-size: 11px; color: #ef4444; background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2); border-radius: 6px;
  padding: 3px 10px; cursor: pointer; transition: all 0.15s;
}
.pc-clear-btn:hover { background: rgba(239,68,68,0.16); }
</style>
