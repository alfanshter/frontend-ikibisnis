<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { Search, Plus, Wrench, User, Calendar, X, Pencil, Trash2, RefreshCw, AlertCircle } from '@lucide/vue'
import {
  proyeksApi,
  type ProyekResponse, type StatusProyek, type ProyekPayload,
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
const search       = ref('')
const activeFilter = ref<'Semua' | StatusProyek>('Semua')
const filterOptions: Array<'Semua' | StatusProyek> = ['Semua', 'Belum Dimulai', 'Berjalan', 'QC', 'Serah Terima', 'Selesai', 'Hold']

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

const emptyForm = () => ({
  nama:          '',
  client_nama:   '',
  perusahaan:    '',
  kategori:      '',
  divisi:        '',
  tanggal:       new Date().toISOString().slice(0, 10),
  target_selesai:new Date().toISOString().slice(0, 10),
  deskripsi:     '',
  nilai:         0,
  progress:      0,
  status:        'Belum Dimulai' as StatusProyek,
})

const form    = ref(emptyForm())
const formErr = ref<string | null>(null)

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
    nama:          p.nama,
    client_nama:   p.client_nama ?? '',
    perusahaan:    p.perusahaan ?? '',
    kategori:      p.kategori ?? '',
    divisi:        p.divisi ?? '',
    tanggal:       p.tanggal ?? new Date().toISOString().slice(0, 10),
    target_selesai:p.target_selesai ?? new Date().toISOString().slice(0, 10),
    deskripsi:     p.deskripsi ?? '',
    nilai:         p.nilai ?? 0,
    progress:      p.progress ?? 0,
    status:        p.status ?? 'Berjalan',
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
      nama:           form.value.nama,
      client_nama:    form.value.client_nama || undefined,
      perusahaan:     form.value.perusahaan || undefined,
      kategori:       form.value.kategori || undefined,
      divisi:         form.value.divisi || undefined,
      tanggal:        form.value.tanggal || undefined,
      target_selesai: form.value.target_selesai || undefined,
      deskripsi:      form.value.deskripsi || undefined,
      nilai:          Number(form.value.nilai) || 0,
      progress:       Number(form.value.progress) || 0,
      status:         form.value.status,
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
</script>


<template>
  <AdminLayout>
    <!-- ── Toolbar ─────────────────────────────────────── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Database Proyek</h1>
        <p>Monitoring seluruh proyek yang berjalan</p>
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
          placeholder="Cari proyek atau client..."
        />
      </div>
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
        @click="openDetail(p)"
      >
        <div class="project-card-header">
          <span class="project-card-id">{{ p.kode }}</span>
          <span :class="badgeClass(p.status)">{{ p.status }}</span>
        </div>
        <div>
          <div class="project-card-title">{{ p.nama }}</div>
          <div class="project-card-client">{{ p.client_nama || p.perusahaan }}</div>
        </div>
        <div class="project-card-meta">
          <span class="meta-tag"><Wrench :size="11" />{{ p.kategori }}</span>
          <span class="meta-pic"><User :size="12" />{{ p.pic || p.divisi }}</span>
          <span class="meta-date"><Calendar :size="12" />{{ p.tanggal }}</span>
        </div>
        <div class="project-card-footer">
          <div class="project-value-row">
            <span class="project-card-value">{{ p.nilai_format }}</span>
            <span class="project-card-pct">{{ p.progress }}%</span>
          </div>
          <div class="proj-bar">
            <div :class="barClass(p.status)" :style="{ width: p.progress + '%' }"></div>
          </div>
        </div>
        <!-- action buttons -->
        <div class="card-actions" @click.stop>
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
        <div class="modal-box">
          <div class="modal-header">
            <h2>{{ editId !== null ? 'Edit Proyek' : 'Tambah Proyek Baru' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Row 1: Nama Proyek | Client -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Nama Proyek *</label>
                <input v-model="form.nama" class="form-input" placeholder="Nama proyek" />
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

            <!-- Row 2: Nilai | Divisi -->
            <div class="form-row">
              <div class="form-field">
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

            <!-- Row 3: Tanggal | Target -->
            <div class="form-row">
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
</style>
