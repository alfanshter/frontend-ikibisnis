<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  Search, Plus, Building2, X, ChevronDown, RefreshCw,
  AlertCircle, Trash2, MessageSquare, Settings, Repeat
} from '@lucide/vue'
import WhatsAppIcon from '@/components/WhatsAppIcon.vue'
import {
  leadsApi, usersApi, clientsApi, documentNumberingApi,
  type LeadResponse, type LeadStatus, type LeadSumber, type LeadStatsResponse, type ClientResponse, type DocumentNumbering
} from '@/services/api'
import { getWaWebLink } from '@/utils/whatsapp'

const router = useRouter()

// ─── Types ────────────────────────────────────────────────────────────────────
const statusList: LeadStatus[] = ['Prospek', 'Survey', 'Penawaran', 'Deal', 'Pending', 'Batal']
const sumberList: LeadSumber[] = ['WhatsApp', 'Referensi', 'Website', 'Instagram', 'Langsung', 'Telepon']

const statusColors: Record<LeadStatus, string> = {
  Prospek:   '#6b7280',
  Survey:    '#3b82f6',
  Penawaran: '#a78bfa',
  Deal:      '#22c55e',
  Pending:   '#f59e0b',
  Batal:     '#ef4444',
}

// ─── State ────────────────────────────────────────────────────────────────────
const leads        = ref<LeadResponse[]>([])
const stats        = ref<LeadStatsResponse | null>(null)
const loading      = ref(false)
const statsLoading = ref(false)
const error        = ref<string | null>(null)
const saving       = ref(false)
const saveError    = ref<string | null>(null)
const deletingId   = ref<number | null>(null)

// Pagination
const currentPage = ref(1)
const lastPage    = ref(1)
const total       = ref(0)

// Filters
const search            = ref('')
const filterStatus      = ref('')
const filterTipeKontrak = ref('')
let   searchTimer: ReturnType<typeof setTimeout>

// PIC users list
const usersList    = ref<string[]>([])
const picSearch    = ref('')
const showPicDrop  = ref(false)
const filteredPics = computed(() => {
  const q = picSearch.value.toLowerCase()
  return usersList.value.filter(u => u.toLowerCase().includes(q))
})

// ─── Modal ────────────────────────────────────────────────────────────────────
const showModal = ref(false)
const editId    = ref<number | null>(null)

const clients   = ref<ClientResponse[]>([])
const clientSearch = ref('')
const showClientDrop = ref(false)

const filteredClients = computed(() => {
  const q = clientSearch.value.toLowerCase()
  return clients.value.filter(c =>
    c.nama.toLowerCase().includes(q) ||
    (c.perusahaan && c.perusahaan.toLowerCase().includes(q))
  )
})

const addMonthsToDate = (dateStr: string, months: number) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const emptyForm = () => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    kode_lead:         '' as string | null,
    tanggal:           today,
    nama:              '',
    pic:               '',
    perusahaan:        '',
    kebutuhan:         '',
    sumber:            'WhatsApp' as LeadSumber,
    estimasi:          null as number | null,
    status:            'Prospek' as LeadStatus,
    phone:             '',
    email:             '',
    lokasi:            '',
    catatan:           '',
    tipe_proyek:       '',
    skala:             '',
    intensitas:        '',
    tipe_kontrak:      'Langsung' as 'Langsung' | 'Sewa',
    sewa_durasi_bulan: 12,
    skema_pembayaran:  'Bulanan' as 'Bulanan' | 'Sekaligus',
    sewa_mulai:        today,
    sewa_selesai:      addMonthsToDate(today, 12),
    nominal_per_bulan: null as number | null,
  }
}

const form = ref(emptyForm())

const onSewaDurasiChange = (months: number) => {
  form.value.sewa_durasi_bulan = months
  if (form.value.sewa_mulai) {
    form.value.sewa_selesai = addMonthsToDate(form.value.sewa_mulai, months)
  }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function fetchLeads(page = 1) {
  loading.value = true
  error.value   = null
  try {
    const res = await leadsApi.list({
      search:       search.value || undefined,
      status:       filterStatus.value || undefined,
      tipe_kontrak: filterTipeKontrak.value || undefined,
      page,
    })
    leads.value       = res.data
    currentPage.value = res.meta.current_page
    lastPage.value    = res.meta.last_page
    total.value       = res.meta.total
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data lead.'
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  statsLoading.value = true
  try {
    stats.value = await leadsApi.stats()
  } catch { /* silent */ }
  finally { statsLoading.value = false }
}

async function fetchUsers() {
  try {
    const res = await usersApi.list({ status: 'aktif' })
    usersList.value = res.data.map(u => u.name)
  } catch { /* silent */ }
}

onMounted(() => {
  fetchLeads()
  fetchStats()
  fetchUsers()
})

// Debounced search
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1; fetchLeads(1) }, 350)
})
watch(filterStatus, () => { currentPage.value = 1; fetchLeads(1) })
watch(filterTipeKontrak, () => { currentPage.value = 1; fetchLeads(1) })

// ─── Format helpers ───────────────────────────────────────────────────────────
const fmtRp = (n: number | null) => {
  if (!n) return '—'
  if (n >= 1_000_000_000) return 'Rp' + (n / 1_000_000_000).toFixed(1) + 'M'
  if (n >= 1_000_000) return 'Rp' + (n / 1_000_000).toFixed(0) + ' Jt'
  return 'Rp' + n.toLocaleString('id-ID')
}

const waLink = (lead: LeadResponse) => {
  if (!lead.phone) return '#'
  const msg = `Halo ${lead.nama}, kami dari PT Putra Wisanggeni Satu ingin menindaklanjuti mengenai kebutuhan ${lead.kebutuhan ?? ''}. Apakah ada waktu untuk berdiskusi lebih lanjut?`
  return getWaWebLink(lead.phone, msg)
}

// ─── Inline Status Update ─────────────────────────────────────────────────────
async function updateStatus(lead: LeadResponse, newStatus: string) {
  try {
    const res = await leadsApi.updateStatus(lead.id, newStatus as LeadStatus)
    const idx = leads.value.findIndex(l => l.id === lead.id)
    if (idx !== -1) leads.value[idx] = res.data
    fetchStats()
  } catch (e: any) {
    alert('Gagal update status: ' + (e.message || ''))
  }
}

// ─── Modal helpers ────────────────────────────────────────────────────────────
const selectPic = (name: string) => {
  form.value.pic = name
  picSearch.value = name
  showPicDrop.value = false
}
const hidePicDrop = () => setTimeout(() => { showPicDrop.value = false }, 200)

const selectClient = (client: ClientResponse) => {
  form.value.nama = client.nama
  form.value.perusahaan = client.perusahaan ?? ''
  form.value.phone = client.telepon ?? ''
  form.value.email = client.email ?? ''
  form.value.lokasi = client.alamat ?? ''
  clientSearch.value = client.nama
  showClientDrop.value = false
}
const hideClientDrop = () => setTimeout(() => { showClientDrop.value = false }, 200)

async function openAdd() {
  editId.value = null
  form.value   = emptyForm()
  picSearch.value = ''
  clientSearch.value = ''
  saveError.value = null
  showModal.value = true
  
  if (clients.value.length === 0) {
    try {
      clients.value = await clientsApi.list()
    } catch { /* silent */ }
  }
}

async function openEdit(lead: LeadResponse) {
  editId.value = lead.id
  form.value = {
    kode_lead:         lead.kode_lead ?? '',
    tanggal:           lead.tanggal,
    nama:              lead.nama,
    pic:               lead.pic ?? '',
    perusahaan:        lead.perusahaan,
    kebutuhan:         lead.kebutuhan ?? '',
    sumber:            lead.sumber,
    estimasi:          lead.estimasi,
    status:            lead.status,
    phone:             lead.phone ?? '',
    email:             lead.email ?? '',
    lokasi:            lead.lokasi ?? '',
    catatan:           lead.catatan ?? '',
    tipe_proyek:       lead.tipe_proyek ?? '',
    skala:             lead.skala ?? '',
    intensitas:        lead.intensitas ?? '',
    tipe_kontrak:      lead.tipe_kontrak ?? 'Langsung',
    sewa_durasi_bulan: lead.sewa_durasi_bulan ?? 12,
    skema_pembayaran:  lead.skema_pembayaran ?? 'Bulanan',
    sewa_mulai:        lead.sewa_mulai ?? lead.tanggal,
    sewa_selesai:      lead.sewa_selesai ?? addMonthsToDate(lead.tanggal, lead.sewa_durasi_bulan ?? 12),
    nominal_per_bulan: lead.nominal_per_bulan ?? null,
  }
  picSearch.value = lead.pic ?? ''
  clientSearch.value = lead.nama
  saveError.value = null
  showModal.value = true
  
  if (clients.value.length === 0) {
    try {
      clients.value = await clientsApi.list()
    } catch { /* silent */ }
  }
}

function closeModal() {
  showModal.value = false
  editId.value    = null
  saveError.value = null
}

async function submitForm() {
  if (!form.value.nama.trim() || !form.value.perusahaan.trim()) {
    saveError.value = 'Nama dan Perusahaan wajib diisi.'
    return
  }
  saving.value    = true
  saveError.value = null
  
  // Auto-save new client if it doesn't exist
  const exists = clients.value.find(c => c.nama.toLowerCase() === form.value.nama.trim().toLowerCase())
  if (!exists) {
    try {
      const newClient = await clientsApi.create({
        nama: form.value.nama.trim(),
        perusahaan: form.value.perusahaan.trim() || null,
        telepon: form.value.phone.trim() || null,
        email: form.value.email.trim() || null,
        alamat: form.value.lokasi.trim() || null,
      })
      clients.value.push(newClient)
    } catch (e) {
      console.error('Failed to auto-save client', e)
    }
  }

  try {
    const isSewa = form.value.tipe_kontrak === 'Sewa'
    const durasi = isSewa ? Number(form.value.sewa_durasi_bulan || 12) : undefined
    const estimasiVal = form.value.estimasi ? Number(form.value.estimasi) : null
    const nominalPerBln = (isSewa && estimasiVal && durasi) ? Math.round(estimasiVal / durasi) : undefined

    const payload = {
      ...form.value,
      estimasi:          estimasiVal,
      tipe_kontrak:      form.value.tipe_kontrak,
      sewa_durasi_bulan: durasi,
      skema_pembayaran:  isSewa ? form.value.skema_pembayaran : undefined,
      sewa_mulai:        isSewa ? form.value.sewa_mulai : undefined,
      sewa_selesai:      isSewa ? form.value.sewa_selesai : undefined,
      nominal_per_bulan: nominalPerBln,
    }
    if (editId.value !== null) {
      await leadsApi.update(editId.value, payload)
    } else {
      await leadsApi.create(payload)
    }
    closeModal()
    fetchLeads(currentPage.value)
    fetchStats()
  } catch (e: any) {
    saveError.value = e.message || 'Terjadi kesalahan, coba lagi.'
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteLead(id: number) {
  if (!confirm('Hapus lead ini? Semua aktivitas terkait juga akan dihapus.')) return
  deletingId.value = id
  try {
    await leadsApi.delete(id)
    leads.value = leads.value.filter(l => l.id !== id)
    fetchStats()
  } catch (e: any) {
    alert('Gagal menghapus: ' + (e.message || ''))
  } finally {
    deletingId.value = null
  }
}

// ─── CSS helpers ─────────────────────────────────────────────────────────────
const selectClass = (s: LeadStatus) => `status-select sel-${s.toLowerCase()}`
const sourceClass = (s: LeadSumber) => `source-${s.toLowerCase().replace(/\s+/g, '')}`
</script>

<template>
  <AdminLayout>
    <!-- ── Toolbar ──────────────────────────────────────────────────────── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>CRM Client</h1>
        <p>Manajemen lead dan calon client</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button class="crm-refresh-btn" @click="router.push('/admin/document-numberings')" title="Pengaturan Numbering" style="color:var(--text-primary)">
          <Settings :size="14" />
        </button>
        <button class="crm-refresh-btn" @click="fetchLeads(currentPage); fetchStats()" :disabled="loading">
          <RefreshCw :size="14" :class="{ spin: loading }" />
        </button>
        <button class="btn-primary" @click="openAdd">
          <Plus :size="16" /> Tambah Lead
        </button>
      </div>
    </div>

    <!-- ── Error Bar ──────────────────────────────────────────────────────── -->
    <div v-if="error" class="crm-error-box">
      <AlertCircle :size="15" /> {{ error }}
    </div>

    <!-- ── Stat Summary ───────────────────────────────────────────────────── -->
    <div class="crm-stats">
      <template v-if="statsLoading">
        <div v-for="i in 6" :key="i" class="crm-stat-card sk-block" />
      </template>
      <template v-else-if="stats">
        <div
          v-for="s in stats.by_status" :key="s.status"
          class="crm-stat-card"
          :class="{ 'crm-stat-active': filterStatus === s.status }"
          @click="filterStatus = filterStatus === s.status ? '' : s.status"
          style="cursor:pointer;"
        >
          <div class="crm-stat-num" :style="{ color: statusColors[s.status as LeadStatus] }">{{ s.count }}</div>
          <div class="crm-stat-label" :class="s.status.toLowerCase()">{{ s.status }}</div>
        </div>
      </template>
    </div>

    <!-- ── Search + Filter Bar ───────────────────────────────────────────── -->
    <div class="crm-filter-row">
      <div class="search-wrap" style="flex:1;">
        <Search class="search-icon" :size="16" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Cari nama, perusahaan, kebutuhan, sumber..."
        />
      </div>
      <!-- Tipe Kontrak Tabs -->
      <div class="crm-contract-tabs">
        <button
          type="button"
          class="crm-contract-tab"
          :class="{ active: filterTipeKontrak === '' }"
          @click="filterTipeKontrak = ''"
        >
          Semua
        </button>
        <button
          type="button"
          class="crm-contract-tab"
          :class="{ active: filterTipeKontrak === 'Langsung' }"
          @click="filterTipeKontrak = 'Langsung'"
        >
          Langsung
        </button>
        <button
          type="button"
          class="crm-contract-tab"
          :class="{ active: filterTipeKontrak === 'Sewa' }"
          @click="filterTipeKontrak = 'Sewa'"
        >
          <Repeat :size="12" /> Sewa IT
        </button>
      </div>
      <div class="crm-status-filter-wrap">
        <select v-model="filterStatus" class="crm-status-filter">
          <option value="">Semua Status</option>
          <option v-for="s in statusList" :key="s" :value="s">{{ s }}</option>
        </select>
        <ChevronDown :size="13" class="crm-filter-arrow" />
      </div>
      <div class="crm-total-badge">
        {{ total }} lead
      </div>
    </div>

    <!-- ── Table ─────────────────────────────────────────────────────────── -->
    <div class="table-card">
      <!-- Loading skeleton rows -->
      <template v-if="loading && leads.length === 0">
        <div v-for="i in 5" :key="i" class="sk-row" />
      </template>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>No. Registrasi</th>
            <th>Client &amp; Perusahaan</th>
            <th>Kebutuhan</th>
            <th>Sumber</th>
            <th>Estimasi</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <!-- Empty state -->
          <tr v-if="leads.length === 0">
            <td colspan="7" style="text-align:center; color:var(--text-muted); padding:40px;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                <Plus :size="28" style="color:var(--text-muted);" />
                <span>{{ search || filterStatus ? 'Tidak ada lead ditemukan' : 'Belum ada lead. Klik "Tambah Lead" untuk mulai.' }}</span>
              </div>
            </td>
          </tr>

          <tr
            v-for="lead in leads"
            :key="lead.id"
            class="clickable-row"
            @click="router.push(`/admin/crm/${lead.id}`)"
          >
            <!-- Tanggal -->
            <td style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">
              {{ lead.tanggal }}
            </td>

            <!-- Kode / No -->
            <td style="font-family:monospace;font-weight:600;font-size:13px;color:var(--accent-orange)">
              {{ lead.kode_lead || '(Belum ada)' }}
            </td>

            <!-- Client & Perusahaan -->
            <td class="client-cell">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <div class="client-name">{{ lead.nama }}</div>
                <span v-if="lead.tipe_kontrak === 'Sewa'" class="badge-sewa-mini" title="Kontrak Sewa IT">
                  <Repeat :size="10" /> Sewa {{ lead.sewa_durasi_bulan ? lead.sewa_durasi_bulan + ' Bln' : '' }}
                </span>
                <span v-else class="badge-langsung-mini">Langsung</span>
              </div>
              <div class="client-company">
                <Building2 :size="11" style="color:var(--text-muted)" />
                {{ lead.perusahaan }}
              </div>
              <div v-if="lead.pic" class="client-pic">PIC: {{ lead.pic }}</div>
            </td>

            <!-- Kebutuhan -->
            <td class="kebutuhan-cell" style="font-size:13px;">{{ lead.kebutuhan ?? '—' }}</td>

            <!-- Sumber -->
            <td>
              <span :class="sourceClass(lead.sumber)">{{ lead.sumber }}</span>
            </td>

            <!-- Estimasi -->
            <td class="estimasi-cell">
              <div>{{ fmtRp(lead.estimasi) }}</div>
              <div v-if="lead.tipe_kontrak === 'Sewa' && (lead.nominal_per_bulan || (lead.estimasi && lead.sewa_durasi_bulan))" style="font-size: 11px; color: #c084fc; font-weight: normal; margin-top: 2px;">
                ≈ Rp {{ (lead.nominal_per_bulan || Math.round((lead.estimasi || 0) / (lead.sewa_durasi_bulan || 12))).toLocaleString('id-ID') }}/bln
              </div>
            </td>

            <!-- Status -->
            <td>
              <span class="status-badge" :class="'sel-' + lead.status.toLowerCase()">
                {{ lead.status }}
              </span>
            </td>

            <!-- Aksi -->
            <td @click.stop>
              <div class="action-btns">
                <button class="btn-edit" @click="openEdit(lead)">Edit</button>
                <a
                  v-if="lead.phone"
                  class="btn-wa"
                  :href="waLink(lead)"
                  target="_blank"
                  rel="noopener"
                >
                  <WhatsAppIcon :size="13" /> WA
                </a>
               
                <button
                  class="btn-del"
                  @click="deleteLead(lead.id)"
                  :disabled="deletingId === lead.id"
                  title="Hapus lead"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="leads.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ total }} lead
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <button
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="fetchLeads(currentPage - 1)"
        >&lt;</button>
        <span class="page-info">{{ currentPage }} / {{ lastPage || 1 }}</span>
      <button
        class="page-btn"
        :disabled="currentPage >= lastPage"
        @click="fetchLeads(currentPage + 1)"
      >&gt;</button>
      </div>
    </div>

    <!-- ── Modal Tambah / Edit Lead ───────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box modal-box-lg">
          <!-- Header -->
          <div class="modal-header">
            <h2>{{ editId !== null ? 'Edit Lead' : 'Tambah Lead Baru' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>

          <!-- Body -->
          <div class="modal-body">

            <!-- Model Kontrak: Langsung vs Sewa -->
            <div class="contract-type-selector">
              <label class="form-label" style="margin-bottom: 8px;">Model Kontrak / Penjualan</label>
              <div class="type-segment">
                <button
                  type="button"
                  class="type-btn"
                  :class="{ active: form.tipe_kontrak === 'Langsung' }"
                  @click="form.tipe_kontrak = 'Langsung'"
                >
                  💼 Langsung (Beli Putus / Standar)
                </button>
                <button
                  type="button"
                  class="type-btn"
                  :class="{ active: form.tipe_kontrak === 'Sewa' }"
                  @click="form.tipe_kontrak = 'Sewa'"
                >
                  <Repeat :size="13" style="display:inline; margin-right:4px;" /> Sewa (Rental IT / Layanan Berkala)
                </button>
              </div>
            </div>

            <!-- Sewa Configuration Box (If Sewa) -->
            <div v-if="form.tipe_kontrak === 'Sewa'" class="sewa-box">
              <div class="sewa-box-title">
                <Repeat :size="16" style="color: #a855f7;" />
                Pengaturan Sewa &amp; Pembayaran
              </div>

              <!-- Periode Sewa -->
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Tanggal Mulai Sewa</label>
                  <input v-model="form.sewa_mulai" type="date" class="form-input" @change="onSewaDurasiChange(form.sewa_durasi_bulan)" />
                </div>
                <div class="form-field">
                  <label class="form-label">Tanggal Selesai Sewa</label>
                  <input v-model="form.sewa_selesai" type="date" class="form-input" />
                </div>
              </div>

              <!-- Durasi & Skema -->
              <div class="form-row">
                <div class="form-field">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <label class="form-label" style="margin: 0;">Durasi Sewa (Bulan) *</label>
                    <div style="display: flex; gap: 4px;">
                      <button type="button" class="btn-quick-durasi" @click="onSewaDurasiChange(6)">6 Bln</button>
                      <button type="button" class="btn-quick-durasi" @click="onSewaDurasiChange(12)">12 Bln (1 Thn)</button>
                      <button type="button" class="btn-quick-durasi" @click="onSewaDurasiChange(24)">24 Bln (2 Thn)</button>
                    </div>
                  </div>
                  <input v-model.number="form.sewa_durasi_bulan" type="number" min="1" class="form-input" @input="onSewaDurasiChange(form.sewa_durasi_bulan)" />
                </div>
                <div class="form-field">
                  <label class="form-label">Skema Pembayaran</label>
                  <select v-model="form.skema_pembayaran" class="form-select">
                    <option value="Bulanan">Bulanan (Cicil per bulan)</option>
                    <option value="Sekaligus">Sekaligus (Lunas di muka)</option>
                  </select>
                </div>
              </div>

              <!-- Simulasi Cicilan Bulanan -->
              <div v-if="form.estimasi && form.estimasi > 0 && form.sewa_durasi_bulan > 0" class="sewa-sim-banner">
                <span style="font-size: 12px; color: #d8b4fe;">Simulasi Cicilan Sewa:</span>
                <strong style="color: #4ade80; font-family: monospace; font-size: 13.5px; margin: 0 6px;">
                  Rp {{ Math.round(form.estimasi / form.sewa_durasi_bulan).toLocaleString('id-ID') }} / bulan
                </strong>
                <span style="font-size: 11px; color: var(--text-muted);">
                  ({{ form.sewa_durasi_bulan }}x bayar dari estimasi total Rp {{ Number(form.estimasi).toLocaleString('id-ID') }})
                </span>
              </div>
            </div>

            <!-- Row 1: Tanggal | Sumber -->
            <div class="form-row form-row-2">
              <div class="form-field">
                <label class="form-label">No. Registrasi / Kode</label>
                <input :value="isEdit ? (form.kode_lead || '(Otomatis / Kosong)') : '(Otomatis dibuat sistem)'" class="form-input" style="font-family:monospace;background:rgba(255,255,255,0.02)" disabled />
              </div>
              <div class="form-field">
                <label class="form-label">Tanggal Masuk *</label>
                <input v-model="form.tanggal" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Sumber Lead *</label>
                <select v-model="form.sumber" class="form-select">
                  <option v-for="s in sumberList" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>

            <!-- Row 2: Nama | PIC -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Nama Client *</label>
                <div class="custom-combo-box">
                  <input
                    v-model="clientSearch"
                    @focus="showClientDrop = true"
                    @blur="hideClientDrop"
                    @input="form.nama = clientSearch"
                    class="form-input combo-input"
                    placeholder="Cari client atau ketik manual..."
                  />
                  <ChevronDown class="combo-icon" :size="14" />
                  <div v-if="showClientDrop && filteredClients.length > 0" class="combo-dropdown">
                    <ul class="combo-list">
                      <li
                        v-for="c in filteredClients"
                        :key="'client_'+c.id"
                        class="combo-item"
                        @mousedown.prevent="selectClient(c)"
                      >
                        <div style="font-weight:500;">{{ c.nama }}</div>
                        <div style="font-size:11px; color:var(--text-muted);">{{ c.perusahaan || '-' }}</div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="form-field">
                <label class="form-label">Nama PIC (Sales)</label>
                <div class="custom-combo-box">
                  <input
                    v-model="picSearch"
                    @focus="showPicDrop = true"
                    @blur="hidePicDrop"
                    @input="form.pic = picSearch"
                    class="form-input combo-input"
                    placeholder="Cari atau ketik nama PIC..."
                  />
                  <ChevronDown class="combo-icon" :size="14" />
                  <div v-if="showPicDrop && filteredPics.length > 0" class="combo-dropdown">
                    <ul class="combo-list">
                      <li
                        v-for="u in filteredPics"
                        :key="u"
                        class="combo-item"
                        :class="{ 'combo-item-active': form.pic === u }"
                        @mousedown.prevent="selectPic(u)"
                      >{{ u }}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Row 3: Phone | Perusahaan -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Nomor WhatsApp</label>
                <input v-model="form.phone" class="form-input" placeholder="08xx-xxxx-xxxx" />
              </div>
              <div class="form-field">
                <label class="form-label">Nama Perusahaan *</label>
                <input v-model="form.perusahaan" class="form-input" placeholder="PT / CV / ..." />
              </div>
            </div>

            <!-- Row 4: Email | Lokasi -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Email</label>
                <input v-model="form.email" type="email" class="form-input" placeholder="email@domain.com" />
              </div>
              <div class="form-field">
                <label class="form-label">Lokasi Proyek</label>
                <input v-model="form.lokasi" class="form-input" placeholder="Kota, Provinsi" />
              </div>
            </div>

            <!-- Row 5: Kebutuhan (full width) -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Kebutuhan Client</label>
                <textarea v-model="form.kebutuhan" class="form-textarea" placeholder="Deskripsi kebutuhan..." />
              </div>
            </div>

            <!-- Row 6: Estimasi | Status -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Estimasi Nilai (Rp)</label>
                <input v-model.number="form.estimasi" type="number" min="0" step="1000000" class="form-input" placeholder="0" />
              </div>
              <div class="form-field">
                <label class="form-label">Status</label>
                <select v-model="form.status" class="form-select">
                  <option v-for="s in statusList" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>

            <!-- Row 7: Tipe | Skala | Intensitas -->
            <div class="form-row form-row-3">
              <div class="form-field">
                <label class="form-label">Tipe Proyek</label>
                <input v-model="form.tipe_proyek" class="form-input" placeholder="CCTV, Fire Alarm..." />
              </div>
              <div class="form-field">
                <label class="form-label">Skala</label>
                <input v-model="form.skala" class="form-input" placeholder="Kecil / Menengah / Besar" />
              </div>
              <div class="form-field">
                <label class="form-label">Intensitas</label>
                <input v-model="form.intensitas" class="form-input" placeholder="Residensial / Komersial" />
              </div>
            </div>

            <!-- Row 8: Catatan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Catatan Internal</label>
                <textarea v-model="form.catatan" class="form-textarea" placeholder="Catatan tambahan (internal)..." />
              </div>
            </div>

            <div v-if="saveError" class="crm-save-error">{{ saveError }}</div>
          </div>

          <!-- Footer -->
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal">Batal</button>
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
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.crm-refresh-btn {
  width: 36px; height: 36px; border-radius: 8px;
  border: 1px solid var(--border-color); background: var(--bg-card);
  color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.crm-refresh-btn:hover { color: var(--accent-orange); border-color: var(--accent-orange); }
.crm-refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.crm-error-box {
  display: flex; align-items: center; gap: 8px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px; padding: 12px 16px; margin-bottom: 14px;
  color: #ef4444; font-size: 13px;
}

/* ── Stats ── */
.crm-stats {
  display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
}
.crm-stat-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 10px; padding: 14px 20px;
  min-width: 100px; flex: 1; transition: border-color 0.2s, background 0.2s;
}
.crm-stat-card:hover { border-color: rgba(245,158,11,0.3); }
.crm-stat-active { border-color: var(--accent-orange) !important; background: rgba(245,158,11,0.06); }
.crm-stat-num { font-size: 28px; font-weight: 800; font-family: monospace; line-height: 1; }
.crm-stat-label {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; margin-top: 4px;
}
/* Status label colors */
.prospek   { color: #6b7280; }
.survey    { color: #3b82f6; }
.penawaran { color: #a78bfa; }
.deal      { color: #22c55e; }
.pending   { color: #f59e0b; }
.batal     { color: #ef4444; }

/* ── Filter row ── */
.crm-filter-row { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; }
.crm-status-filter-wrap { position: relative; }
.crm-status-filter {
  appearance: none; background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-primary); font-size: 13px;
  padding: 8px 32px 8px 12px; outline: none; cursor: pointer;
}
.crm-status-filter:focus { border-color: var(--accent-orange); }
.crm-filter-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }
.crm-total-badge {
  font-size: 12px; color: var(--text-muted);
  background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 6px 12px; white-space: nowrap;
}

/* ── Table ── */
.clickable-row { cursor: pointer; transition: background var(--transition-fast); }
.clickable-row:hover td { background: rgba(255,255,255,0.015); }

.client-cell { min-width: 180px; }
.client-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.client-company {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: var(--text-muted); margin-top: 3px;
}
.client-pic { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.kebutuhan-cell { max-width: 260px; color: var(--text-secondary); }
.estimasi-cell { font-family: monospace; font-size: 13px; color: var(--accent-orange); white-space: nowrap; }

/* Status select & badges */
.status-select, .status-badge {
  display: inline-block;
  appearance: none; border: none; border-radius: 6px;
  font-size: 11px; font-weight: 700; padding: 4px 10px; outline: none;
}
.status-select { cursor: pointer; }
.sel-prospek   { background: rgba(107,114,128,0.15); color: #9ca3af; }
.sel-survey    { background: rgba(59,130,246,0.15);  color: #60a5fa; }
.sel-penawaran { background: rgba(167,139,250,0.15); color: #a78bfa; }
.sel-deal      { background: rgba(34,197,94,0.15);   color: #4ade80; }
.sel-pending   { background: rgba(245,158,11,0.15);  color: #fbbf24; }
.sel-batal     { background: rgba(239,68,68,0.15);   color: #f87171; }

/* Source badges */
.source-whatsapp  { background: rgba(37,211,102,0.12);  color: #25d366;  font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; white-space:nowrap; }
.source-referensi { background: rgba(245,158,11,0.12);  color: #fbbf24;  font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; white-space:nowrap; }
.source-website   { background: rgba(59,130,246,0.12);  color: #60a5fa;  font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; white-space:nowrap; }
.source-instagram { background: rgba(236,72,153,0.12);  color: #f472b6;  font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; white-space:nowrap; }
.source-langsung  { background: rgba(167,139,250,0.12); color: #a78bfa;  font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; white-space:nowrap; }
.source-telepon   { background: rgba(34,197,94,0.12);   color: #4ade80;  font-size:11px; font-weight:700; padding:3px 8px; border-radius:4px; white-space:nowrap; }

/* Action buttons */
.action-btns { display: flex; gap: 5px; align-items: center; }
.btn-edit {
  font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px;
  border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary);
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-edit:hover { border-color: var(--accent-orange); color: var(--accent-orange); }
.btn-wa {
  font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px;
  background: rgba(37,211,102,0.12); color: #25d366; text-decoration: none;
  border: 1px solid transparent; transition: all 0.15s; white-space: nowrap;
  display: flex; align-items: center; gap: 4px;
}
.btn-wa:hover { background: rgba(37,211,102,0.2); }
.btn-survei {
  font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 6px;
  border: 1px solid var(--border-color); background: transparent; color: var(--text-muted);
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.btn-survei:hover { background: var(--bg-sidebar); color: var(--text-primary); }
.btn-del {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid transparent;
  background: transparent; color: var(--text-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }
.btn-del:disabled { opacity: 0.5; cursor: not-allowed; }

/* Pagination */
.crm-pagination {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px; font-size: 13px; color: var(--text-secondary);
}
.page-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent-orange); color: var(--accent-orange); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-weight: 600; }

/* Modal */
.modal-box-lg { max-width: 680px; }
.form-row-3 { grid-template-columns: 1fr 1fr 1fr !important; }
.crm-save-error { color: #ef4444; font-size: 12px; margin-top: 8px; }

/* Skeleton */
.sk-block { animation: pulse 1.5s ease infinite; min-height: 72px; }
.sk-row { height: 52px; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02); animation: pulse 1.5s ease infinite; }
@keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }

/* ── Contract Type Tabs ── */
.crm-contract-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  gap: 2px;
}
.crm-contract-tab {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}
.crm-contract-tab:hover {
  color: var(--text-primary);
}
.crm-contract-tab.active {
  background: rgba(168, 85, 247, 0.2);
  color: #e9d5ff;
}

/* ── Badges ── */
.badge-sewa-mini {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.badge-langsung-mini {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.2);
  font-size: 10.5px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 10px;
}

/* ── Contract Modal Selectors ── */
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
  padding: 9px;
  font-size: 12.5px;
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
  background: rgba(168, 85, 247, 0.18);
  border-color: #a855f7;
  color: #f3e8ff;
}
.sewa-box {
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 16px;
}
.sewa-box-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #d8b4fe;
  margin-bottom: 12px;
}
.btn-quick-durasi {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 4px;
  padding: 2px 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-quick-durasi:hover {
  background: rgba(168, 85, 247, 0.2);
  color: #e9d5ff;
  border-color: #a855f7;
}
.sewa-sim-banner {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 10px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
