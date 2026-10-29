<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as AdminLayoutModule from '../../layouts/AdminLayout.vue'
import { usePenawaranStore } from '../../stores/penawaran'
import { leadsApi, penawaransApi, documentNumberingApi } from '../../services/api'
import type { LeadResponse } from '../../services/api'
import { Search, Plus, FileText, Trash2, X } from '@lucide/vue'
import { useToast } from 'vue-toastification'
import { formatRp } from '@/utils/currency'

const AdminLayout = (AdminLayoutModule as unknown as { default: Component }).default

const router = useRouter()
const route = useRoute()
const store = usePenawaranStore()
const toast = useToast()

const formatCurrency = (n: number | string | null | undefined) => formatRp(n)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: { message?: string } } }).response
    if (maybeResponse?.data?.message) return maybeResponse.data.message
  }
  return fallback
}

// ─── State ────────────────────────────────────────────────────────────────
const leads = ref<LeadResponse[]>([])
const deletingId = ref<number | null>(null)
const autoNomorPreview = ref('')

const showAddModal = ref(false)
const addForm = ref({
  lead_id: null as number | null,
  nomor_penawaran: '',
  tanggal: new Date().toISOString().split('T')[0],
  valid_until: '',
  catatan: ''
})

let searchTimer: ReturnType<typeof setTimeout>

// ─── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(() => {
  store.fetchAll()
  leadsApi.list({}).then(res => {
    leads.value = res.data.filter(l => l.status === 'Prospek' || l.status === 'Survey' || l.status === 'Penawaran')

    const leadIdFromQuery = Number(route.query.lead_id)
    if (leadIdFromQuery && leads.value.some(l => l.id === leadIdFromQuery)) {
      addForm.value.lead_id = leadIdFromQuery
      openAddModal(leadIdFromQuery)
    }
  }).catch(() => { })
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(15)

const totalPages = computed(() => Math.max(1, Math.ceil(store.penawarans.length / pageSize.value)))

const paginatedPenawarans = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return store.penawarans.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch(() => [store.filters.search, store.filters.status], () => {
  currentPage.value = 1
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => store.fetchAll(), 350)
}, { deep: true })

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

// ─── Navigation ────────────────────────────────────────────────────────────
const goToDetail = (id: number) => router.push(`/admin/penawaran/${id}`)

// ─── Add Modal ─────────────────────────────────────────────────────────────
async function openAddModal(preselectedLeadId?: number | null) {
  const timestamp = new Date().getTime().toString().slice(-4)
  let defaultNumber = `PNW-${new Date().getFullYear()}${new Date().getMonth() + 1}-${timestamp}`

  try {
    const numberings = await documentNumberingApi.list()
    const pnwNum = numberings.find(n => n.module === 'penawaran')
    if (pnwNum && pnwNum.next_preview) {
      defaultNumber = pnwNum.next_preview
    }
  } catch (e) {
    console.error('Gagal mengambil format penomoran', e)
  }

  const leadId = preselectedLeadId ?? (Number(route.query.lead_id) || null)

  autoNomorPreview.value = defaultNumber

  addForm.value = {
    lead_id: leadId,
    nomor_penawaran: '',
    tanggal: new Date().toISOString().split('T')[0],
    valid_until: '',
    catatan: ''
  }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function submitAdd() {
  const finalNomor = addForm.value.nomor_penawaran.trim()
  store.saving = true
  try {
    const payload = {
      ...addForm.value,
      nomor_penawaran: finalNomor || 'AUTO',
      subtotal: 0,
      pajak: 0,
      diskon: 0,
      total_harga: 0,
      items: [{
        jenis_item: 'jasa',
        nama_item: 'Layanan / Jasa',
        qty: 1,
        harga_satuan: 0,
        total_harga: 0
      }]
    }
    const createRes = await penawaransApi.create(payload)
    toast.success('Penawaran berhasil dibuat')
    closeAddModal()
    goToDetail(createRes.data.id)
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, 'Gagal membuat penawaran'))
  } finally {
    store.saving = false
  }
}

// ─── Delete ────────────────────────────────────────────────────────────────
async function deletePenawaran(id: number) {
  if (!confirm('Apakah Anda yakin ingin menghapus penawaran ini?')) return
  deletingId.value = id
  try {
    await penawaransApi.delete(id)
    toast.success('Penawaran dihapus')
    store.fetchAll()
  } catch {
    toast.error('Gagal menghapus penawaran')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <AdminLayout>
    <!-- ── Toolbar ── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Penawaran Harga</h1>
        <p>Kelola quotation / penawaran harga untuk klien</p>
      </div>
      <button class="btn-primary" @click="openAddModal">
        <Plus :size="16" /> Buat Baru
      </button>
    </div>

    <!-- ── Search Bar ── -->
    <div class="search-wrap">
      <Search class="search-icon" :size="16" />
      <input v-model="store.filters.search" class="search-input" type="text" placeholder="Cari nomor atau klien..." />
    </div>

    <!-- ── Table ── -->
    <div class="table-card">
      <template v-if="store.loadingList && store.penawarans.length === 0">
        <div v-for="i in 5" :key="i" class="sk-row" />
      </template>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nomor Penawaran</th>
            <th>Klien</th>
            <th>Tanggal</th>
            <th>Berlaku Sampai</th>
            <th>Total</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.penawarans.length === 0">
            <td colspan="7" style="text-align:center; color:var(--text-muted); padding:40px;">
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                <FileText :size="28" style="color:var(--text-muted);" />
                <span>{{ store.filters.search ? 'Tidak ada penawaran ditemukan' : 'Belum ada data penawaran. Klik "Buat Baru" untuk mulai.' }}</span>
              </div>
            </td>
          </tr>

          <tr v-for="p in paginatedPenawarans" :key="p.id" class="clickable-row" @click="goToDetail(p.id)">
            <td class="pnw-nomor">{{ p.nomor_penawaran }}</td>
            <td>
              <div class="pnw-client">{{ p.client_name }}</div>
              <div class="pnw-perusahaan" v-if="p.perusahaan && p.perusahaan !== '-'">{{ p.perusahaan }}</div>
            </td>
            <td style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">{{ p.tanggal }}</td>
            <td style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">{{ p.valid_until || '-' }}</td>
            <td class="pnw-total">{{ formatCurrency(p.total_harga) }}</td>
            <td>
              <span class="badge status" :class="p.status.toLowerCase()">{{ p.status }}</span>
            </td>
            <td @click.stop>
              <button class="btn-del" @click="deletePenawaran(p.id)"
                :disabled="deletingId === p.id || p.status !== 'Draft'"
                :title="p.status !== 'Draft' ? 'Hanya penawaran Draft yang bisa dihapus' : 'Hapus penawaran'">
                <Trash2 :size="13" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="store.penawarans.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ store.penawarans.length }} penawaran
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

    <!-- MODAL BUAT BARU -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Buat Penawaran Baru</h3>
              <button class="btn-icon" @click="closeAddModal">
                <X :size="20" />
              </button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label class="form-label">Nomor Penawaran</label>
                <input
                  type="text"
                  v-model="addForm.nomor_penawaran"
                  class="input-modern"
                  :placeholder="autoNomorPreview || 'Nomor otomatis'"
                />
                <div v-if="autoNomorPreview" style="margin-top:6px; font-size:11px; color:var(--text-muted);">
                  Nomor otomatis terdekat dari database penomoran: <strong style="color:var(--text-primary);">{{ autoNomorPreview }}</strong>
                </div>
              </div>
              <div class="form-group">
                <label>Klien (Lead)</label>
                <select v-model="addForm.lead_id" class="input-modern">
                  <option :value="null">-- Pilih Lead --</option>
                  <option v-for="l in leads" :key="l.id" :value="l.id">{{ l.nama }} - {{ l.perusahaan }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Tanggal</label>
                <input type="date" v-model="addForm.tanggal" class="input-modern" />
              </div>
              <div class="form-group">
                <label>Catatan Singkat</label>
                <textarea v-model="addForm.catatan" class="input-modern" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="closeAddModal">Batal</button>
              <button class="btn-primary" @click="submitAdd" :disabled="store.saving">Buat Penawaran</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
.clickable-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.clickable-row:hover td {
  background: rgba(255, 255, 255, 0.015);
}

.pnw-nomor {
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.pnw-client {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.pnw-perusahaan {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.pnw-total {
  font-weight: 600;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: var(--accent-orange);
  white-space: nowrap;
}

.badge.status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  display: inline-block;
}

.badge.status.draft {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.badge.status.dikirim {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.badge.status.disetujui {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.badge.status.ditolak {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
}

.btn-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-del:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.btn-del:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sk-row {
  height: 52px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

/* ── Modal (shared) ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 16px;
  width: 480px;
  max-width: 90vw;
  border: 1px solid var(--border-color);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 500;
}

.input-modern {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-base);
  color: var(--text-primary);
  font-size: 14px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  transition: background 0.2s;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
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
