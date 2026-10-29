<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { Search, Plus, Wrench, User, Calendar, X, Pencil, Trash2, RefreshCw, AlertCircle, Repeat, Clock, DollarSign, CheckCircle2, CreditCard } from '@lucide/vue'
import {
  proyeksApi,
  type ProyekResponse, type StatusProyek, type ProyekPayload,
  type TipeKontrakProyek, type SkemaPembayaranSewa
} from '@/services/api'

const router = useRouter()

// ─── Divisi Options ───────────────────────────────────────────────────────────
const divisiOptions = ['CCTV', 'Access Control', 'Fire Alarm', 'PA System', 'Networking', 'Security System', 'Lainnya']

// ─── State ────────────────────────────────────────────────────────────────────
const proyeks      = ref<ProyekResponse[]>([])
const loading      = ref(false)
const error        = ref<string | null>(null)
const saving       = ref(false)
const deletingId   = ref<number | null>(null)

// ─── Filters & Pagination ────────────────────────────────────────────────────
const search             = ref('')
const activeFilter       = ref<'Semua' | StatusProyek>('Semua')
const filterOptions: Array<'Semua' | StatusProyek> = ['Semua', 'Belum Dimulai', 'Berjalan', 'QC', 'Serah Terima', 'Selesai', 'Hold']

const activeTipeKontrak  = ref<'Semua' | 'Reguler' | 'Sewa'>('Semua')

const currentPage  = ref(1)
const lastPage     = ref(1)
const totalItems   = ref(0)
const itemsPerPage = 6

let searchTimer: ReturnType<typeof setTimeout>

// ─── Fetch Data ───────────────────────────────────────────────────────────────
async function fetchProyeks() {
  loading.value = true
  error.value   = null
  try {
    const res = await proyeksApi.list({
      search: search.value || undefined,
      status: activeFilter.value !== 'Semua' ? activeFilter.value : undefined,
      tipe_kontrak: activeTipeKontrak.value !== 'Semua' ? activeTipeKontrak.value : undefined,
      page:   currentPage.value,
    })
    proyeks.value    = res.data
    lastPage.value   = res.meta.last_page
    totalItems.value = res.meta.total
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data proyek'
  } finally {
    loading.value = false
  }
}

onMounted(fetchProyeks)

watch(activeFilter, () => {
  currentPage.value = 1
  fetchProyeks()
})

watch(activeTipeKontrak, () => {
  currentPage.value = 1
  fetchProyeks()
})

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchProyeks()
  }, 350)
})

// ─── Pagination ───────────────────────────────────────────────────────────────
const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; fetchProyeks() } }
const nextPage = () => { if (currentPage.value < lastPage.value) { currentPage.value++; fetchProyeks() } }
const setPage  = (p: number) => { currentPage.value = p; fetchProyeks() }

// computed aliases for template
const filtered    = computed(() => proyeks.value)
const paginatedList = computed(() => proyeks.value)
const totalPages    = computed(() => lastPage.value)

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusList: StatusProyek[] = ['Belum Dimulai', 'Berjalan', 'QC', 'Serah Terima', 'Selesai', 'Hold']

const badgeClass = (s: StatusProyek) => {
  const map: Record<StatusProyek, string> = {
    'Belum Dimulai': 'badge badge-pending',
    'Berjalan':      'badge badge-berjalan',
    'QC':            'badge badge-qc',
    'Serah Terima':  'badge badge-penawaran',
    'Selesai':       'badge badge-selesai',
    'Hold':          'badge badge-pending',
  }
  return map[s] ?? 'badge'
}

const barClass = (s: StatusProyek) => {
  const map: Record<StatusProyek, string> = {
    'Belum Dimulai': 'proj-bar-fill bar-hold',
    'Berjalan':      'proj-bar-fill bar-berjalan',
    'QC':            'proj-bar-fill bar-qc',
    'Serah Terima':  'proj-bar-fill bar-serahterima',
    'Selesai':       'proj-bar-fill bar-selesai',
    'Hold':          'proj-bar-fill bar-hold',
  }
  return map[s] ?? 'proj-bar-fill bar-hold'
}

// ─── Detail Navigation ────────────────────────────────────────────────────────
const openDetail = (p: ProyekResponse) => {
  router.push('/admin/proyek/' + p.id)
}

// ─── Modal Add / Edit ─────────────────────────────────────────────────────────
const showModal = ref(false)
const editId    = ref<number | null>(null)

const computeEndDateFromMonths = (startStr: string, months: number) => {
  if (!startStr) return ''
  const d = new Date(startStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const emptyForm = () => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    nama:              '',
    client_nama:       '',
    perusahaan:        '',
    kategori:          '',
    divisi:            '',
    tipe_kontrak:      'Reguler' as TipeKontrakProyek,
    sewa_mulai:        today,
    sewa_selesai:      computeEndDateFromMonths(today, 12),
    sewa_durasi_bulan: 12,
    skema_pembayaran:  'Bulanan' as SkemaPembayaranSewa,
    nominal_per_bulan: 0,
    tanggal:           today,
    target_selesai:    today,
    deskripsi:         '',
    nilai:             0,
    progress:          0,
    status:            'Belum Dimulai' as StatusProyek,
  }
}

const form    = ref(emptyForm())
const formErr = ref<string | null>(null)

const onSewaDurasiChange = (months: number) => {
  form.value.sewa_durasi_bulan = months
  if (form.value.sewa_mulai) {
    form.value.sewa_selesai = computeEndDateFromMonths(form.value.sewa_mulai, months)
  }
}

const estimasiPerBulan = computed(() => {
  const n = Number(form.value.nilai) || 0
  const d = Number(form.value.sewa_durasi_bulan) || 1
  return d > 0 ? Math.round(n / d) : 0
})

const openAdd = () => {
  editId.value = null
  form.value   = emptyForm()
  formErr.value = null
  showModal.value = true
}

const openEdit = (p: ProyekResponse, e: Event) => {
  e.stopPropagation()
  editId.value = p.id
  form.value = {
    nama:              p.nama,
    client_nama:       p.client_nama ?? '',
    perusahaan:        p.perusahaan ?? '',
    kategori:          p.kategori ?? '',
    divisi:            p.divisi ?? '',
    tipe_kontrak:      p.tipe_kontrak ?? 'Reguler',
    sewa_mulai:        p.sewa_mulai ?? new Date().toISOString().slice(0, 10),
    sewa_selesai:      p.sewa_selesai ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    sewa_durasi_bulan: p.sewa_durasi_bulan ?? 12,
    skema_pembayaran:  (p.skema_pembayaran ?? 'Bulanan') as SkemaPembayaranSewa,
    nominal_per_bulan: p.nominal_per_bulan ?? 0,
    tanggal:           p.tanggal ?? new Date().toISOString().slice(0, 10),
    target_selesai:    p.target_selesai ?? new Date().toISOString().slice(0, 10),
    deskripsi:         p.deskripsi ?? '',
    nilai:             p.nilai ?? 0,
    progress:          p.progress ?? 0,
    status:            p.status ?? 'Berjalan',
  }
  formErr.value = null
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const submitForm = async () => {
  if (!form.value.nama) { formErr.value = 'Nama proyek wajib diisi'; return }
  saving.value  = true
  formErr.value = null
  try {
    const payload: ProyekPayload = {
      nama:              form.value.nama,
      client_nama:       form.value.client_nama || undefined,
      perusahaan:        form.value.perusahaan || undefined,
      kategori:          form.value.kategori || undefined,
      divisi:            form.value.divisi || undefined,
      tipe_kontrak:      form.value.tipe_kontrak,
      sewa_mulai:        form.value.tipe_kontrak === 'Sewa' ? form.value.sewa_mulai : undefined,
      sewa_selesai:      form.value.tipe_kontrak === 'Sewa' ? form.value.sewa_selesai : undefined,
      sewa_durasi_bulan: form.value.tipe_kontrak === 'Sewa' ? Number(form.value.sewa_durasi_bulan) : undefined,
      skema_pembayaran:  form.value.tipe_kontrak === 'Sewa' ? form.value.skema_pembayaran : undefined,
      nominal_per_bulan: form.value.tipe_kontrak === 'Sewa' ? (Number(form.value.nominal_per_bulan) || estimasiPerBulan.value) : undefined,
      tanggal:           form.value.tanggal || undefined,
      target_selesai:    form.value.target_selesai || undefined,
      deskripsi:         form.value.deskripsi || undefined,
      nilai:             Number(form.value.nilai) || 0,
      progress:          Number(form.value.progress) || 0,
      status:            form.value.status,
    }

    if (editId.value !== null) {
      await proyeksApi.update(editId.value, payload)
    } else {
      await proyeksApi.create(payload)
    }

    closeModal()
    currentPage.value = 1
    await fetchProyeks()
  } catch (e: any) {
    formErr.value = e.message || 'Gagal menyimpan'
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteProyek = async (p: ProyekResponse, e: Event) => {
  e.stopPropagation()
  if (!confirm(`Hapus proyek "${p.nama}"?`)) return
  deletingId.value = p.id
  try {
    await proyeksApi.delete(p.id)
    await fetchProyeks()
  } catch (e: any) {
    alert(e.message || 'Gagal menghapus')
  } finally {
    deletingId.value = null
  }
}

// ─── Quick Bayar Proyek Langsung ──────────────────────────────────────────────
const showQuickBayarModal = ref(false)
const quickBayarTarget    = ref<ProyekResponse | null>(null)
const quickBayarSaving    = ref(false)
const quickBayarForm      = ref({
  nominal: 0,
  tanggal_bayar: new Date().toISOString().slice(0, 10),
  metode_pembayaran: 'Transfer Bank BCA',
  catatan: '',
  masuk_pembukuan: true,
})

const openQuickBayar = (p: ProyekResponse, e: Event) => {
  e.stopPropagation()
  quickBayarTarget.value = p
  const sisa = (p.sisa_pembayaran !== undefined && p.sisa_pembayaran > 0)
    ? p.sisa_pembayaran
    : (p.nilai || 0)
  quickBayarForm.value = {
    nominal: sisa > 0 ? sisa : (p.nilai || 0),
    tanggal_bayar: new Date().toISOString().slice(0, 10),
    metode_pembayaran: 'Transfer Bank BCA',
    catatan: `Pelunasan proyek ${p.nama}`,
    masuk_pembukuan: true,
  }
  showQuickBayarModal.value = true
}

const submitQuickBayar = async () => {
  if (!quickBayarTarget.value) return
  if (!quickBayarForm.value.nominal || quickBayarForm.value.nominal <= 0) {
    alert('Masukkan nominal pembayaran yang valid')
    return
  }
  quickBayarSaving.value = true
  try {
    const res = await proyeksApi.bayarLangsung(quickBayarTarget.value.id, quickBayarForm.value)
    showQuickBayarModal.value = false
    alert(res.message || 'Pembayaran proyek berhasil dicatat dan masuk ke Pembukuan!')
    await fetchProyeks()
  } catch (e: any) {
    alert(e.message || 'Gagal mencatat pembayaran')
  } finally {
    quickBayarSaving.value = false
  }
}

const formatRupiah = (val?: number | null) => {
  if (!val && val !== 0) return 'Rp 0'
  return 'Rp ' + Number(val).toLocaleString('id-ID')
}
</script>


<template>
  <AdminLayout>
    <!-- ── Toolbar ─────────────────────────────────────── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Database Proyek</h1>
        <p>Monitoring seluruh proyek dan kontrak sewa yang berjalan</p>
      </div>
      <button class="btn-primary" @click="openAdd">
        <Plus :size="16" />
        Tambah Proyek
      </button>
    </div>

    <!-- ── Search + Filter ─────────────────────────────── -->
    <div class="search-filter-row">
      <div class="search-wrap">
        <Search class="search-icon" :size="16" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Cari proyek, client, atau sewa..."
        />
      </div>

      <!-- Contract Type Filter -->
      <div class="filter-tabs contract-tabs">
        <button
          class="filter-tab"
          :class="{ active: activeTipeKontrak === 'Semua' }"
          @click="activeTipeKontrak = 'Semua'"
        >Semua</button>
        <button
          class="filter-tab"
          :class="{ active: activeTipeKontrak === 'Reguler' }"
          @click="activeTipeKontrak = 'Reguler'"
        >Reguler</button>
        <button
          class="filter-tab"
          :class="{ active: activeTipeKontrak === 'Sewa' }"
          @click="activeTipeKontrak = 'Sewa'"
        >🔄 Sewa IT</button>
      </div>

      <!-- Status Filter Tabs -->
      <div class="filter-tabs">
        <button
          v-for="f in filterOptions"
          :key="f"
          class="filter-tab"
          :class="{ active: activeFilter === f }"
          @click="activeFilter = f"
        >{{ f }}</button>
      </div>
    </div>

    <!-- ── Loading / Error ───────────────────────────────── -->
    <div v-if="loading" class="empty-state" style="gap:10px;">
      <RefreshCw :size="20" class="spin-icon" />
      Memuat data proyek...
    </div>
    <div v-else-if="error" class="empty-state" style="color:var(--accent-red,#ef4444);gap:8px;">
      <AlertCircle :size="18" />{{ error }}
    </div>

    <!-- ── Project Grid ────────────────────────────────── -->
    <div v-else class="project-grid">
      <div v-if="paginatedList.length === 0" class="empty-state">
        Tidak ada proyek ditemukan.
      </div>

      <div
        v-for="p in paginatedList"
        :key="p.id"
        class="project-card"
        :class="{ 'card-is-sewa': p.tipe_kontrak === 'Sewa' }"
        @click="openDetail(p)"
      >
        <div class="project-card-header">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="project-card-id">{{ p.kode }}</span>
            <span v-if="p.tipe_kontrak === 'Sewa'" class="badge badge-sewa">
              <Repeat :size="11" /> Sewa {{ p.sewa_durasi_bulan ? p.sewa_durasi_bulan + ' Bln' : '' }}
            </span>
            <span
              v-else
              class="badge"
              :class="p.status_pembayaran === 'Lunas' ? 'badge-bayar-lunas' : (p.status_pembayaran === 'Sebagian' ? 'badge-bayar-sebagian' : 'badge-bayar-belum')"
              :title="p.status_pembayaran === 'Lunas' ? 'Lunas: ' + (p.total_dibayar_format || p.nilai_format) : 'Sisa: ' + (p.sisa_pembayaran_format || p.nilai_format)"
            >
              {{ p.status_pembayaran === 'Lunas' ? '✓ Lunas' : (p.status_pembayaran === 'Sebagian' ? 'Sebagian' : 'Belum Dibayar') }}
            </span>
          </div>
          <span :class="badgeClass(p.status)">{{ p.status }}</span>
        </div>
        <div>
          <div class="project-card-title">{{ p.nama }}</div>
          <div class="project-card-client">{{ p.client_nama || p.perusahaan }}</div>
        </div>
        <div class="project-card-meta">
          <span class="meta-tag"><Wrench :size="11" />{{ p.kategori || p.divisi || 'Umum' }}</span>
          <span class="meta-pic"><User :size="12" />{{ p.pic || p.divisi || 'Tim' }}</span>
          <span v-if="p.tipe_kontrak === 'Sewa'" class="meta-date sewa-meta" title="Periode Sewa">
            <Clock :size="12" />{{ p.sewa_mulai || p.tanggal }} s/d {{ p.sewa_selesai || '—' }}
          </span>
          <span v-else class="meta-date"><Calendar :size="12" />{{ p.tanggal }}</span>
        </div>
        <div class="project-card-footer">
          <div class="project-value-row">
            <div>
              <div class="project-card-value">
                {{ (p.tipe_kontrak === 'Sewa' && p.skema_pembayaran === 'Bulanan' && p.nominal_per_bulan) ? p.nominal_per_bulan_format + ' / bln' : p.nilai_format }}
              </div>
              <div v-if="p.tipe_kontrak === 'Sewa' && p.skema_pembayaran === 'Bulanan'" style="font-size: 11px; color: var(--text-muted);">
                Total Kontrak: {{ p.nilai_format }}
              </div>
            </div>
            <span class="project-card-pct">{{ p.progress }}%</span>
          </div>
          <div class="proj-bar">
            <div :class="barClass(p.status)" :style="{ width: p.progress + '%' }"></div>
          </div>
        </div>
        <!-- action buttons -->
        <div class="card-actions" @click.stop>
          <button
            v-if="p.tipe_kontrak !== 'Sewa' && p.status_pembayaran !== 'Lunas'"
            class="card-action-btn pay-btn"
            @click="openQuickBayar(p, $event)"
            title="Tandai Dibayar (Sinkron ke Pembukuan)"
          >
            <CheckCircle2 :size="12" /> Bayar
          </button>
          <button class="card-action-btn" @click="openEdit(p, $event)" title="Edit"><Pencil :size="13" /></button>
          <button class="card-action-btn danger" @click="deleteProyek(p, $event)" :disabled="deletingId === p.id" title="Hapus"><Trash2 :size="13" /></button>
        </div>
      </div>
    </div>

    <!-- ── Pagination ──────────────────────────────────── -->
    <div v-if="totalPages > 1" class="pagination-container">
      <div class="pagination-info">
        Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} – {{ Math.min(currentPage * itemsPerPage, totalItems) }} dari {{ totalItems }} proyek
      </div>
      <div class="pagination-controls">
        <button class="btn-page" :disabled="currentPage === 1" @click="prevPage">Prev</button>
        <button
          v-for="p in totalPages"
          :key="p"
          class="btn-page num"
          :class="{ active: p === currentPage }"
          @click="setPage(p)"
        >
          {{ p }}
        </button>
        <button class="btn-page" :disabled="currentPage === totalPages" @click="nextPage">Next</button>
      </div>
    </div>



    <!-- ── Modal Tambah / Edit ───────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width: 620px;">
          <div class="modal-header">
            <h2>{{ editId !== null ? 'Edit Proyek' : 'Tambah Proyek Baru' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Tipe Kontrak Switcher -->
            <div class="contract-type-selector">
              <label class="form-label" style="margin-bottom: 8px;">Model Kontrak Proyek</label>
              <div class="type-segment">
                <button
                  type="button"
                  class="type-btn"
                  :class="{ active: form.tipe_kontrak === 'Reguler' }"
                  @click="form.tipe_kontrak = 'Reguler'"
                >
                  💼 Proyek Reguler (Beli / Standar)
                </button>
                <button
                  type="button"
                  class="type-btn"
                  :class="{ active: form.tipe_kontrak === 'Sewa' }"
                  @click="form.tipe_kontrak = 'Sewa'"
                >
                  🔄 Proyek Sewa (Rental IT / Langganan)
                </button>
              </div>
            </div>

            <!-- Row 1: Nama Proyek | Client -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Nama Proyek *</label>
                <input v-model="form.nama" class="form-input" :placeholder="form.tipe_kontrak === 'Sewa' ? 'Contoh: Sewa Server IT & Maintenance' : 'Nama proyek'" />
              </div>
              <div class="form-field">
                <label class="form-label">Nama Client</label>
                <input v-model="form.client_nama" class="form-input" placeholder="Nama PIC client" />
              </div>
            </div>

            <!-- Row 1b: Perusahaan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Perusahaan / Instansi</label>
                <input v-model="form.perusahaan" class="form-input" placeholder="PT / CV / Dinas..." />
              </div>
            </div>

            <!-- ── Sewa Configuration Box (If Sewa) ── -->
            <div v-if="form.tipe_kontrak === 'Sewa'" class="sewa-box">
              <div class="sewa-box-title">
                <Repeat :size="16" style="color: #a855f7;" />
                Pengaturan Sewa &amp; Pembayaran
              </div>

              <!-- Periode Sewa -->
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Tanggal Mulai Sewa *</label>
                  <input v-model="form.sewa_mulai" type="date" class="form-input" @change="onSewaDurasiChange(form.sewa_durasi_bulan)" />
                </div>
                <div class="form-field">
                  <label class="form-label">Tanggal Selesai Sewa *</label>
                  <input v-model="form.sewa_selesai" type="date" class="form-input" />
                </div>
              </div>

              <!-- Durasi & Quick Buttons -->
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Durasi Sewa (Bulan)</label>
                  <div style="display:flex; gap:6px; align-items:center;">
                    <input v-model.number="form.sewa_durasi_bulan" type="number" min="1" max="120" class="form-input" style="width: 90px;" @input="onSewaDurasiChange(form.sewa_durasi_bulan)" />
                    <div style="display:flex; gap:4px;">
                      <button type="button" class="btn-quick-durasi" :class="{ active: form.sewa_durasi_bulan === 6 }" @click="onSewaDurasiChange(6)">6 Bln</button>
                      <button type="button" class="btn-quick-durasi" :class="{ active: form.sewa_durasi_bulan === 12 }" @click="onSewaDurasiChange(12)">12 Bln (1 Thn)</button>
                      <button type="button" class="btn-quick-durasi" :class="{ active: form.sewa_durasi_bulan === 24 }" @click="onSewaDurasiChange(24)">24 Bln</button>
                    </div>
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Skema Pembayaran</label>
                  <select v-model="form.skema_pembayaran" class="form-select">
                    <option value="Bulanan">Bulanan (Per Bulan)</option>
                    <option value="Sekaligus">Bayar Langsung (Sekaligus di Muka)</option>
                    <option value="Termin">Termin / Fleksibel</option>
                  </select>
                </div>
              </div>

              <!-- Total Nilai Sewa -->
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Total Nilai Sewa Kontrak (Rp) *</label>
                  <input v-model.number="form.nilai" type="number" min="0" step="500000" class="form-input" placeholder="Contoh: 40000000" />
                </div>
                <div class="form-field" v-if="form.skema_pembayaran === 'Bulanan'">
                  <label class="form-label">Nominal Per Bulan (Rp)</label>
                  <input v-model.number="form.nominal_per_bulan" type="number" min="0" class="form-input" :placeholder="String(estimasiPerBulan)" />
                </div>
              </div>

              <!-- Real-time Simulation Box -->
              <div class="sewa-sim-banner">
                <div v-if="form.skema_pembayaran === 'Bulanan'">
                  💡 <strong>Simulasi Bulanan:</strong> Total Rp {{ Number(form.nilai || 0).toLocaleString('id-ID') }} ÷ {{ form.sewa_durasi_bulan }} bulan =
                  <strong style="color: #a855f7;">Rp {{ (form.nominal_per_bulan || estimasiPerBulan).toLocaleString('id-ID') }} / bulan</strong>
                </div>
                <div v-else>
                  💡 <strong>Simulasi Sekaligus:</strong> Dibayarkan lunas <strong style="color: #a855f7;">Rp {{ Number(form.nilai || 0).toLocaleString('id-ID') }}</strong> di awal periode kontrak sewa.
                </div>
              </div>
            </div>

            <!-- Row 2: Nilai Reguler (If not Sewa) | Divisi -->
            <div class="form-row">
              <div class="form-field" v-if="form.tipe_kontrak !== 'Sewa'">
                <label class="form-label">Nilai Proyek (Rp)</label>
                <input v-model.number="form.nilai" type="number" min="0" step="1000000" class="form-input" placeholder="0" />
              </div>
              <div class="form-field">
                <label class="form-label">Divisi</label>
                <select v-model="form.divisi" class="form-select">
                  <option value="" disabled>Pilih Divisi</option>
                  <option v-for="d in divisiOptions" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
            </div>

            <!-- Row 3: Tanggal | Target (If Reguler) -->
            <div class="form-row" v-if="form.tipe_kontrak !== 'Sewa'">
              <div class="form-field">
                <label class="form-label">Tanggal Mulai</label>
                <input v-model="form.tanggal" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Target Selesai</label>
                <input v-model="form.target_selesai" type="date" class="form-input" />
              </div>
            </div>

            <!-- Row 4: Deskripsi -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Deskripsi Proyek</label>
                <textarea v-model="form.deskripsi" class="form-textarea" placeholder="Deskripsi singkat..."></textarea>
              </div>
            </div>

            <!-- Error msg -->
            <div v-if="formErr" style="color:#ef4444;font-size:13px;padding:4px 0;">{{ formErr }}</div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal" :disabled="saving">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Modal Quick Bayar Proyek Langsung ──────────────────────── -->
      <div v-if="showQuickBayarModal" class="modal-overlay" @click.self="showQuickBayarModal = false">
        <div class="modal-box" style="max-width: 520px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <CheckCircle2 :size="18" style="color: #4ade80;" />
              <h2 style="font-size: 16px; margin: 0;">Tandai Proyek Langsung Dibayar</h2>
            </div>
            <button class="modal-close" @click="showQuickBayarModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <div class="pay-modal-banner" style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px;">
              <div style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">
                {{ quickBayarTarget?.kode }} — {{ quickBayarTarget?.nama }}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 14px; flex-wrap: wrap;">
                <span>Nilai: <strong style="color: var(--accent-orange);">{{ quickBayarTarget?.nilai_format }}</strong></span>
                <span>Sudah Dibayar: <strong style="color: #4ade80;">{{ quickBayarTarget?.total_dibayar_format || 'Rp 0' }}</strong></span>
                <span>Sisa: <strong style="color: #ef4444;">{{ quickBayarTarget?.sisa_pembayaran_format || 'Rp 0' }}</strong></span>
              </div>
            </div>

            <!-- Form Fields -->
            <div class="form-row single">
              <div class="form-field">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin: 0;">Nominal Pembayaran (Rp) *</label>
                  <button
                    v-if="quickBayarTarget && quickBayarTarget.sisa_pembayaran && quickBayarTarget.sisa_pembayaran > 0"
                    type="button"
                    class="btn-text-quick"
                    style="background:none; border:none; color:#4ade80; font-size:11px; cursor:pointer; text-decoration:underline;"
                    @click="quickBayarForm.nominal = quickBayarTarget.sisa_pembayaran"
                  >
                    Set Sisa Tagihan ({{ quickBayarTarget.sisa_pembayaran_format }})
                  </button>
                </div>
                <input
                  v-model.number="quickBayarForm.nominal"
                  type="number"
                  class="form-input"
                  min="1"
                  placeholder="Masukkan nominal bayar"
                  required
                />
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
                  Terbilang format: <strong style="color: #4ade80;">{{ formatRupiah(quickBayarForm.nominal) }}</strong>
                </div>
              </div>
            </div>

            <div class="form-row" style="margin-top: 12px;">
              <div class="form-field">
                <label class="form-label">Tanggal Pembayaran *</label>
                <input v-model="quickBayarForm.tanggal_bayar" type="date" class="form-input" required />
              </div>
              <div class="form-field">
                <label class="form-label">Metode Pembayaran *</label>
                <select v-model="quickBayarForm.metode_pembayaran" class="form-select">
                  <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                  <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                  <option value="Transfer Bank BRI">Transfer Bank BRI</option>
                  <option value="Transfer Bank BNI">Transfer Bank BNI</option>
                  <option value="Transfer Bank Lainnya">Transfer Bank Lainnya</option>
                  <option value="Tunai / Cash">Tunai / Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div class="form-row single" style="margin-top: 12px;">
              <div class="form-field">
                <label class="form-label">Catatan / Keterangan</label>
                <input
                  v-model="quickBayarForm.catatan"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: Pelunasan via Transfer Bank"
                />
              </div>
            </div>

            <div style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 8px; padding: 12px 14px; margin-top: 14px;">
              <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                <input
                  v-model="quickBayarForm.masuk_pembukuan"
                  type="checkbox"
                  style="margin-top: 2px; accent-color: #22c55e; width: 16px; height: 16px;"
                />
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #4ade80;">
                    Otomatis Catat ke Pembukuan (Buku Kas Masuk)
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px; line-height: 1.4;">
                    Sistem akan otomatis mencatat kas masuk kategori "Pembayaran Client" di Pembukuan.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="showQuickBayarModal = false" :disabled="quickBayarSaving">Batal</button>
            <button
              class="btn-primary btn-half"
              style="background: linear-gradient(135deg, #16a34a, #15803d); border: none; font-weight: 600;"
              @click="submitQuickBayar"
              :disabled="quickBayarSaving"
            >
              <RefreshCw v-if="quickBayarSaving" :size="14" class="spin-icon" style="margin-right: 6px;" />
              <CheckCircle2 v-else :size="14" style="margin-right: 6px;" />
              {{ quickBayarSaving ? 'Menyimpan...' : 'Simpan &amp; Masuk Kas' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Pagination ── */
.pagination-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 16px;
}
.pagination-info {
  font-size: 13px;
  color: var(--text-muted);
}
.pagination-controls {
  display: flex;
  gap: 6px;
}
.btn-page {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-page:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
.btn-page:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-page.num {
  padding: 6px 10px;
  min-width: 32px;
}
.btn-page.active {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  color: var(--accent-orange);
}

/* ── Card action buttons ── */
.project-card { position: relative; }
.card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
.project-card:hover .card-actions { opacity: 1; }
.card-action-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  border-radius: 5px;
  padding: 5px 7px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.card-action-btn:hover { background: rgba(255,255,255,0.12); color: var(--text-primary); }
.card-action-btn.danger:hover { background: rgba(239,68,68,0.15); color: #ef4444; border-color: rgba(239,68,68,0.3); }

/* ── Spin animation ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { animation: spin 1s linear infinite; }

/* ── Empty state flex ── */
.empty-state { display: flex; align-items: center; justify-content: center; }

/* ── Sewa styles ── */
.badge-sewa {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 600;
}
.card-is-sewa {
  border-left: 3px solid #a855f7 !important;
}
.sewa-meta {
  color: #c084fc !important;
  font-weight: 500;
}
.contract-tabs {
  background: rgba(255, 255, 255, 0.03);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}
.contract-type-selector {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.type-segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.type-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.type-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
.type-btn.active {
  background: rgba(168, 85, 247, 0.16);
  border-color: #a855f7;
  color: #e9d5ff;
}
.sewa-box {
  background: rgba(168, 85, 247, 0.04);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}
.sewa-box-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 700;
  color: #d8b4fe;
  margin-bottom: 14px;
}
.btn-quick-durasi {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 11.5px;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  white-space: nowrap;
}
.btn-quick-durasi:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.btn-quick-durasi.active {
  background: #a855f7;
  color: #fff;
  border-color: #a855f7;
}
.sewa-sim-banner {
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(168, 85, 247, 0.08);
  border-left: 3px solid #a855f7;
  border-radius: 4px;
  font-size: 12.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* ── Payment Badges on Project Card ── */
.badge-bayar-lunas {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.35);
  font-weight: 600;
  font-size: 11px;
}
.badge-bayar-sebagian {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.35);
  font-weight: 600;
  font-size: 11px;
}
.badge-bayar-belum {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  font-weight: 600;
  font-size: 11px;
}

.card-action-btn.pay-btn {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}
.card-action-btn.pay-btn:hover {
  background: rgba(34, 197, 94, 0.25);
  color: #fff;
  border-color: #22c55e;
}
</style>
