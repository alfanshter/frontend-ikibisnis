<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useSurveiStore } from '@/stores/survei'
import { leadsApi, clientsApi } from '@/services/api'
import type { LeadResponse, SurveiResponse, ClientResponse } from '@/services/api'
import {
  Search, Plus, CheckCircle2, ChevronDown, MapPin, Calendar, User,
  X, Trash2, ClipboardList, RefreshCw, AlertCircle, Building2
} from '@lucide/vue'

const store = useSurveiStore()
const router = useRouter()
const route = useRoute()

// ─── Filters & State ───────────────────────────────────────────────────────────
type TabStatus = 'Semua' | 'Dijadwalkan' | 'Selesai' | 'Batal'
const activeTab = ref<TabStatus>('Semua')
const search = ref('')

const statusList = ['Dijadwalkan', 'Selesai', 'Batal']

const filteredSurvei = computed(() => {
  let list = store.surveis
  if (activeTab.value !== 'Semua') {
    list = list.filter(s => s.status === activeTab.value)
  }
  const q = search.value.toLowerCase().trim()
  if (q) {
    list = list.filter(s =>
      s.client.toLowerCase().includes(q) ||
      (s.lokasi ?? '').toLowerCase().includes(q) ||
      (s.perusahaan ?? '').toLowerCase().includes(q)
    )
  }
  return list
})

const countStatus = (s: 'Dijadwalkan' | 'Selesai' | 'Batal') =>
  store.surveis.filter(x => x.status === s).length

// ─── Pagination ──────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(15)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSurvei.value.length / pageSize.value)))

const paginatedSurvei = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredSurvei.value.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch([search, activeTab], () => {
  currentPage.value = 1
})

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatRupiah = (val: number | string | null | undefined) => {
  const n = Number(val)
  if (val === null || val === undefined || val === '' || Number.isNaN(n)) return '—'
  if (n === 0) return 'Rp0'
  if (n >= 1_000_000_000) return 'Rp' + (n / 1_000_000_000).toFixed(1) + 'M'
  if (n >= 1_000_000) return 'Rp' + (n / 1_000_000).toFixed(0) + ' Jt'
  return 'Rp' + n.toLocaleString('id-ID')
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const statusBadgeClass = (s: string) => ({
  'fs-badge-selesai': s === 'Selesai',
  'fs-badge-dijadwalkan': s === 'Dijadwalkan',
  'fs-badge-batal': s === 'Batal',
})

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
const toasts = ref<Toast[]>([])

function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = Date.now().toString()
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3500)
}

// ─── Add Survei Modal ─────────────────────────────────────────────────────────
const showAddModal = ref(false)
const crmLeads = ref<LeadResponse[]>([])
const clients = ref<ClientResponse[]>([])
const clientSearch = ref('')
const showDropdown = ref(false)
const addLoading = ref(false)

const newForm = ref({
  client: '',
  perusahaan: '',
  kebutuhan: '',
  surveyor: '',
  tanggal: new Date().toISOString().slice(0, 10),
  waktu: '09:00',
  lokasi: '',
  lead_id: null as number | null,
})

const filteredLeads = computed(() => {
  const q = clientSearch.value.toLowerCase()
  return crmLeads.value.filter(l =>
    l.nama.toLowerCase().includes(q) ||
    (l.perusahaan && l.perusahaan.toLowerCase().includes(q)) ||
    (l.kode_lead && l.kode_lead.toLowerCase().includes(q))
  )
})

function selectClient(client: ClientResponse) {
  newForm.value.client = client.nama
  newForm.value.perusahaan = client.perusahaan ?? ''
  newForm.value.kebutuhan = ''
  newForm.value.lead_id = null
  clientSearch.value = client.nama
  showDropdown.value = false
}

function selectLead(lead: LeadResponse) {
  newForm.value.client = lead.nama
  newForm.value.perusahaan = lead.perusahaan
  newForm.value.kebutuhan = lead.kebutuhan ?? ''
  newForm.value.lead_id = lead.id
  clientSearch.value = lead.nama
  showDropdown.value = false
}

function hideDropdown() {
  setTimeout(() => { showDropdown.value = false }, 200)
}

async function openAddModal() {
  showAddModal.value = true
  newForm.value = {
    client: '', perusahaan: '', kebutuhan: '', surveyor: '',
    tanggal: new Date().toISOString().slice(0, 10),
    waktu: '09:00', lokasi: '', lead_id: null,
  }
  clientSearch.value = ''

  // Load CRM Leads for dropdown
  if (crmLeads.value.length === 0) {
    try {
      const res = await leadsApi.list()
      crmLeads.value = res.data
    } catch { /* silent */ }
  }
}

function closeAddModal() { showAddModal.value = false }

async function submitAddModal() {
  if (!newForm.value.client || !newForm.value.lokasi) {
    toast('Client dan Lokasi wajib diisi', 'error')
    return
  }

  addLoading.value = true

  // Auto-save new lead if it doesn't exist
  if (!newForm.value.lead_id) {
    const exists = crmLeads.value.find(l => l.nama.toLowerCase() === newForm.value.client.toLowerCase())
    if (!exists) {
      try {
        const res = await leadsApi.create({
          tanggal: new Date().toISOString().slice(0, 10),
          nama: newForm.value.client,
          perusahaan: newForm.value.perusahaan || '-',
          sumber: 'Langsung',
          status: 'Survey',
        })
        newForm.value.lead_id = res.data.id
      } catch (e) {
        console.error('Failed to auto-save lead', e)
      }
    }
  }

  const created = await store.create({
    client: newForm.value.client,
    perusahaan: newForm.value.perusahaan,
    surveyor: newForm.value.surveyor,
    lokasi: newForm.value.lokasi,
    tanggal: newForm.value.tanggal,
    waktu: newForm.value.waktu,
    kebutuhan: newForm.value.kebutuhan,
    lead_id: newForm.value.lead_id,
    status: 'Dijadwalkan',
  })

  addLoading.value = false

  if (created) {
    closeAddModal()
    toast('Survei berhasil dijadwalkan!', 'success')
    router.push(`/admin/form-survei/${created.id}`)
  } else {
    toast(store.error ?? 'Gagal', 'error')
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
async function deleteSurvei(id: number) {
  if (!confirm('Hapus form survei ini? Data tidak bisa dikembalikan.')) return
  try {
    const success = await store.deleteSurvei(id)
    if (success) {
      toast('Form survei berhasil dihapus', 'success')
    } else {
      toast(store.error ?? 'Gagal menghapus survei', 'error')
    }
  } catch (e: any) {
    toast('Gagal menghapus survei', 'error')
  }
}

// ─── Inline Status Update ─────────────────────────────────────────────────────
async function updateStatus(id: number, newStatus: string) {
  try {
    const ok = await store.updateStatus(id, newStatus as any)
    if (ok) {
      toast('Status survei diperbarui', 'success')
    } else {
      toast(store.error ?? 'Gagal', 'error')
    }
  } catch (e: any) {
    toast('Gagal update status', 'error')
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await store.fetchAll()

  const leadIdQuery = route.query.lead_id
  if (leadIdQuery) {
    await openAddModal()
    const targetLeadId = Number(leadIdQuery)
    let targetLead = crmLeads.value.find(l => l.id === targetLeadId)

    if (!targetLead) {
      try {
        const res = await leadsApi.show(targetLeadId)
        if (res && res.data) {
          targetLead = res.data
          crmLeads.value.push(targetLead)
        }
      } catch (e) {
        console.error('Failed to fetch target lead:', e)
      }
    }

    if (targetLead) selectLead(targetLead)
    router.replace({ query: {} })
  }
})
</script>

<template>
  <AdminLayout>
    <!-- ── Toast Notifications ──────────────────────────────────── -->
    <Teleport to="body">
      <div class="toast-container">
        <TransitionGroup name="toast">
          <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`toast-${t.type}`">
            <CheckCircle2 v-if="t.type === 'success'" :size="16" />
            <AlertCircle v-else-if="t.type === 'error'" :size="16" />
            {{ t.message }}
          </div>
        </TransitionGroup>
      </div>
    </Teleport>

    <!-- ── Toolbar ───────────────────────────────────────────────── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Form Survei</h1>
        <p>Dokumentasi dan analisa kebutuhan lapangan</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button class="crm-refresh-btn" @click="store.fetchAll()" :disabled="store.loading">
          <RefreshCw :size="14" :class="{ spin: store.loading }" />
        </button>
        <button class="btn-primary" @click="openAddModal">
          <Plus :size="16" />
          Jadwalkan Survei
        </button>
      </div>
    </div>

    <!-- ── Stat Summary ───────────────────────────────────────────────────── -->
    <div class="crm-stats">
      <div class="crm-stat-card" :class="{ 'crm-stat-active': activeTab === 'Semua' }" @click="activeTab = 'Semua'"
        style="cursor:pointer;">
        <div class="crm-stat-num" style="color: var(--text-primary)">{{ store.surveis.length }}</div>
        <div class="crm-stat-label">Semua</div>
      </div>
      <div class="crm-stat-card" :class="{ 'crm-stat-active': activeTab === 'Dijadwalkan' }"
        @click="activeTab = 'Dijadwalkan'" style="cursor:pointer;">
        <div class="crm-stat-num" style="color: #f59e0b">{{ countStatus('Dijadwalkan') }}</div>
        <div class="crm-stat-label" style="color: #f59e0b">Dijadwalkan</div>
      </div>
      <div class="crm-stat-card" :class="{ 'crm-stat-active': activeTab === 'Selesai' }" @click="activeTab = 'Selesai'"
        style="cursor:pointer;">
        <div class="crm-stat-num" style="color: #10b981">{{ countStatus('Selesai') }}</div>
        <div class="crm-stat-label" style="color: #10b981">Selesai</div>
      </div>
      <div class="crm-stat-card" :class="{ 'crm-stat-active': activeTab === 'Batal' }" @click="activeTab = 'Batal'"
        style="cursor:pointer;">
        <div class="crm-stat-num" style="color: #ef4444">{{ countStatus('Batal') }}</div>
        <div class="crm-stat-label" style="color: #ef4444">Batal</div>
      </div>
    </div>

    <!-- ── Search + Filter Bar ───────────────────────────────────────────── -->
    <div class="crm-filter-row">
      <div class="search-wrap" style="flex:1;">
        <Search class="search-icon" :size="16" />
        <input v-model="search" class="search-input" type="text"
          placeholder="Cari client, perusahaan, atau lokasi..." />
      </div>
      <div class="crm-total-badge">
        {{ filteredSurvei.length }} survei
      </div>
    </div>

    <!-- ── Table ─────────────────────────────────────────────────────────── -->
    <div class="table-card">
      <template v-if="store.loading && store.surveis.length === 0">
        <div v-for="i in 5" :key="i" class="sk-row" />
      </template>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Jadwal</th>
            <th>Client & Perusahaan</th>
            <th>Lokasi</th>
            <th>Kelengkapan</th>
            <th>Estimasi</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredSurvei.length === 0">
            <td colspan="7" style="text-align:center; color:var(--text-muted); padding:40px;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                <ClipboardList :size="28" style="color:var(--text-muted); opacity: 0.5;" />
                <span>Tidak ada survei ditemukan</span>
              </div>
            </td>
          </tr>

          <tr v-for="item in paginatedSurvei" :key="item.id" class="clickable-row"
            @click="router.push(`/admin/form-survei/${item.id}`)">
            <!-- Jadwal -->
            <td style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">
              <div>{{ formatDate(item.tanggal) }}</div>
              <div style="font-size: 11px; margin-top: 2px;">{{ item.waktu }}</div>
            </td>

            <!-- Client -->
            <td class="client-cell">
              <div class="client-name">{{ item.client }}</div>
              <div class="client-company">
                <Building2 :size="11" style="color:var(--text-muted)" />
                {{ item.perusahaan }}
              </div>
              <div v-if="item.surveyor" class="client-pic">Surveyor: {{ item.surveyor }}</div>
            </td>

            <!-- Lokasi -->
            <td style="font-size: 13px; color: var(--text-secondary); max-width: 200px; line-height: 1.4;">
              <div style="display:flex; gap:4px; align-items:flex-start;">
                <MapPin :size="12" style="margin-top:2px; flex-shrink:0;" />
                <span>{{ item.lokasi }}</span>
              </div>
            </td>

            <!-- Progress -->
            <td style="min-width: 140px;">
              <div class="fs-card-progress-wrap" style="margin-top:0;">
                <div class="fs-card-progress">
                  <div class="fs-card-progress-fill" :style="{ width: item.progress.percent + '%' }"></div>
                </div>
                <div class="fs-card-progress-text">{{ item.progress.answered }}/{{ item.progress.total }}</div>
              </div>
            </td>

            <!-- Estimasi -->
            <td class="estimasi-cell">{{ formatRupiah(item.estimasi) }}</td>

            <!-- Status -->
            <td @click.stop>
              <select class="status-select" :class="statusBadgeClass(item.status)" :value="item.status"
                @change="updateStatus(item.id, ($event.target as HTMLSelectElement).value)">
                <option v-for="s in statusList" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>

            <!-- Aksi -->
            <td @click.stop>
              <div class="action-btns">
                <button class="btn-edit" @click="router.push(`/admin/form-survei/${item.id}`)">Detail</button>
                <button class="btn-del" @click="deleteSurvei(item.id)" title="Hapus survei">
                  <Trash2 :size="12" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="filteredSurvei.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ filteredSurvei.length }} survei
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

    <!-- ── Modal: Jadwalkan Survei ──────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
          <div class="modal-box">
            <div class="modal-header">
              <h2>Jadwalkan Survei Baru</h2>
              <button class="modal-close" @click="closeAddModal">
                <X :size="16" />
              </button>
            </div>

            <div class="modal-body">
              <div class="form-row">
                <!-- Client search -->
                <div class="form-field">
                  <label class="form-label">Client / Lead *</label>
                  <div class="custom-combo-box">
                    <input v-model="clientSearch" @focus="showDropdown = true" @blur="hideDropdown"
                      @input="newForm.client = clientSearch; newForm.lead_id = null" class="form-input combo-input"
                      placeholder="Cari dari CRM atau ketik nama..." />
                    <ChevronDown class="combo-icon" :size="14" />
                    <div v-if="showDropdown && filteredLeads.length > 0" class="combo-dropdown">
                      <ul class="combo-list">
                        <li v-for="l in filteredLeads" :key="'lead_' + l.id" class="combo-item"
                          @mousedown.prevent="selectLead(l)">
                          <div style="font-weight:500;">
                            <span v-if="l.kode_lead"
                              style="font-family:monospace;font-size:11px;color:var(--accent-orange);margin-right:6px;">
                              [{{ l.kode_lead }}]
                            </span>
                            {{ l.nama }}
                          </div>
                          <div v-if="l.perusahaan" style="font-size:11px; color:var(--text-muted);">{{ l.perusahaan }}
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="form-field">
                  <label class="form-label">Perusahaan</label>
                  <input v-model="newForm.perusahaan" class="form-input" placeholder="PT / CV..." />
                </div>
              </div>

              <div class="form-row single">
                <div class="form-field">
                  <label class="form-label">Lokasi Survei *</label>
                  <input v-model="newForm.lokasi" class="form-input" placeholder="Alamat atau nama gedung..." />
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Tanggal Survei</label>
                  <input type="date" v-model="newForm.tanggal" class="form-input" />
                </div>
                <div class="form-field">
                  <label class="form-label">Waktu Survei</label>
                  <input type="time" v-model="newForm.waktu" class="form-input" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Surveyor</label>
                  <input v-model="newForm.surveyor" class="form-input" placeholder="Nama surveyor..." />
                </div>
                <div class="form-field">
                  <label class="form-label">Kebutuhan Utama</label>
                  <input v-model="newForm.kebutuhan" class="form-input" placeholder="Misal: Instalasi CCTV..." />
                </div>
              </div>
            </div>

            <div class="modal-footer modal-footer-split">
              <button class="btn-ghost btn-half" @click="closeAddModal" :disabled="addLoading">Batal</button>
              <button class="btn-primary btn-half" @click="submitAddModal" :disabled="addLoading">
                <span v-if="addLoading" class="spinner-xs"></span>
                {{ addLoading ? 'Menyimpan...' : 'Jadwalkan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </AdminLayout>
</template>

<style scoped>
/* ── UI Components ─────────────────────────────────────────────────────────── */
.crm-refresh-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.crm-refresh-btn:hover {
  color: var(--accent-orange);
  border-color: var(--accent-orange);
}

.crm-refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* ── Stats ── */
.crm-stats {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.crm-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 20px;
  min-width: 100px;
  flex: 1;
  transition: border-color 0.2s, background 0.2s;
}

.crm-stat-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.crm-stat-active {
  border-color: var(--accent-orange) !important;
  background: rgba(245, 158, 11, 0.06);
}

.crm-stat-num {
  font-size: 28px;
  font-weight: 800;
  font-family: monospace;
  line-height: 1;
}

.crm-stat-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 4px;
  color: var(--text-muted);
}

/* ── Filter row ── */
.crm-filter-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.crm-total-badge {
  font-size: 12px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px 12px;
  white-space: nowrap;
}

/* ── Table ── */
.clickable-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.clickable-row:hover td {
  background: rgba(255, 255, 255, 0.015);
}

.client-cell {
  min-width: 180px;
}

.client-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.client-company {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 3px;
}

.client-pic {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.estimasi-cell {
  font-family: monospace;
  font-size: 13px;
  color: var(--accent-orange);
  white-space: nowrap;
}

/* Progress */
.fs-card-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.fs-card-progress {
  flex: 1;
  height: 5px;
  background: var(--border-color);
  border-radius: 99px;
  overflow: hidden;
}

.fs-card-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-orange), #f59e0b88);
  border-radius: 99px;
  transition: width 0.4s ease;
}

.fs-card-progress-text {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
}

/* Status select */
.status-select {
  appearance: none;
  border: none;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
  outline: none;
}

.fs-badge-selesai {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.fs-badge-dijadwalkan {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.fs-badge-batal {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* Action buttons */
.action-btns {
  display: flex;
  gap: 5px;
  align-items: center;
}

.btn-edit {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.btn-edit:hover {
  border-color: var(--accent-orange);
  color: var(--accent-orange);
}

.btn-del {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.btn-del:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-del:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal styles from form survei */
.custom-combo-box {
  position: relative;
}

.combo-input {
  padding-right: 30px;
}

.combo-icon {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.combo-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 999;
  max-height: 220px;
  overflow-y: auto;
}

.combo-list {
  list-style: none;
  padding: 4px;
}

.combo-item {
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 6px;
  font-size: 12.5px;
  transition: background var(--transition-fast);
}

.combo-item:hover,
.combo-item-active {
  background: rgba(255, 255, 255, 0.05);
}

/* Toast */
.toast-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  min-width: 260px;
  max-width: 360px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border: 1px solid;
}

.toast-success {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.toast-error {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.toast-info {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(60px) scale(0.9);
}

/* Skeleton */
.sk-row {
  height: 52px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 0.5
  }

  50% {
    opacity: 1
  }
}

.spinner-xs {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin-xs 0.6s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

@keyframes spin-xs {
  to {
    transform: rotate(360deg);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.22s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-box,
.modal-leave-active .modal-box {
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from .modal-box {
  transform: scale(0.92) translateY(-20px);
}

.modal-leave-to .modal-box {
  transform: scale(0.92) translateY(-20px);
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
