<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useClientStore } from '@/stores/client'
import type { ClientPayload, ClientResponse } from '@/services/api'
import {
  Users, Search, Plus, Trash2, Edit3, Save, X, Building2, MapPin, Phone, Mail, CheckCircle2, AlertTriangle, FileText
} from '@lucide/vue'
import WhatsAppIcon from '@/components/WhatsAppIcon.vue'
import { getWaLink } from '@/utils/whatsapp'

const store = useClientStore()
const router = useRouter()

const search = ref('')

const filteredClients = computed(() => {
  if (!search.value) return store.clients
  const lower = search.value.toLowerCase()
  return store.clients.filter(
    (c) =>
      c.nama.toLowerCase().includes(lower) ||
      (c.perusahaan && c.perusahaan.toLowerCase().includes(lower))
  )
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(15)

const totalPages = computed(() => Math.max(1, Math.ceil(filteredClients.value.length / pageSize.value)))

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredClients.value.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

watch(search, () => {
  currentPage.value = 1
})

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

const showAddModal = ref(false)
const isEditMode = ref(false)
const selectedClient = ref<ClientResponse | null>(null)

const form = ref<ClientPayload>({
  nama: '',
  perusahaan: '',
  telepon: '',
  email: '',
  alamat: '',
  catatan: ''
})

function openAddModal() {
  isEditMode.value = false
  selectedClient.value = null
  form.value = { nama: '', perusahaan: '', telepon: '', email: '', alamat: '', catatan: '' }
  store.clearError()
  showAddModal.value = true
}

function openEditModal(client: ClientResponse) {
  isEditMode.value = true
  selectedClient.value = client
  form.value = {
    nama: client.nama,
    perusahaan: client.perusahaan ?? '',
    telepon: client.telepon ?? '',
    email: client.email ?? '',
    alamat: client.alamat ?? '',
    catatan: client.catatan ?? ''
  }
  store.clearError()
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function submitAddModal() {
  if (!form.value.nama) {
    toast('Nama klien wajib diisi', 'error')
    return
  }

  if (isEditMode.value && selectedClient.value) {
    const res = await store.update(selectedClient.value.id, form.value)
    if (res) {
      toast('Client berhasil diperbarui', 'success')
      closeAddModal()
    } else {
      toast(store.error ?? 'Gagal memperbarui', 'error')
    }
  } else {
    const res = await store.create(form.value)
    if (res) {
      toast('Client baru berhasil ditambahkan', 'success')
      closeAddModal()
    } else {
      toast(store.error ?? 'Gagal menambahkan', 'error')
    }
  }
}

async function handleDelete(id: number) {
  if (!confirm('Apakah Anda yakin ingin menghapus data client ini?')) return
  const success = await store.destroy(id)
  if (success) {
    toast('Client berhasil dihapus', 'success')
  } else {
    toast(store.error ?? 'Gagal menghapus', 'error')
  }
}

// ─── Toasts ──────────────────────────────────────────────────────────────────
interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
const toasts = ref<Toast[]>([])
function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = Math.random().toString(36).slice(2, 7)
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3500)
}

onMounted(() => {
  store.fetchAll()
})
</script>

<template>
  <AdminLayout>
    <Teleport to="body">
      <div class="toast-container">
        <TransitionGroup name="toast">
          <div v-for="t in toasts" :key="t.id" class="toast-item" :class="`toast-${t.type}`">
            <CheckCircle2 v-if="t.type === 'success'" :size="16" />
            <AlertTriangle v-else-if="t.type === 'error'" :size="16" />
            {{ t.message }}
          </div>
        </TransitionGroup>
      </div>
    </Teleport>

    <!-- Toolbar -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Database Client</h1>
        <p>Kelola data profil dan daftar seluruh client Anda</p>
      </div>
      <div>
        <button class="btn-primary" @click="openAddModal">
          <Plus :size="16" /> Tambah Client
        </button>
      </div>
    </div>

    <!-- Search bar -->
    <div class="crm-filter-row">
      <div class="search-wrap" style="flex:1;">
        <Search class="search-icon" :size="16" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          placeholder="Cari berdasarkan nama atau perusahaan..."
        />
      </div>
      <div class="crm-total-badge">
        {{ filteredClients.length }} client
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Klien / PIC</th>
            <th>Perusahaan</th>
            <th>Kontak</th>
            <th>Lokasi</th>
            <th>Catatan</th>
            <th width="80" style="text-align:right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading && filteredClients.length === 0">
            <td colspan="6" style="padding:40px;text-align:center;">
              <span class="spinner-xs" style="border-top-color:var(--accent-orange)"></span> Loading...
            </td>
          </tr>
          <tr v-else-if="filteredClients.length === 0">
            <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted)">
              <Users :size="32" style="opacity:0.5; margin-bottom:10px;" />
              <div>Belum ada data client</div>
            </td>
          </tr>
          <tr v-for="c in paginatedClients" :key="c.id" class="client-row">
            <td>
              <div class="client-name">{{ c.nama }}</div>
            </td>
            <td>
              <div v-if="c.perusahaan" class="client-company">
                <Building2 :size="13" /> {{ c.perusahaan }}
              </div>
              <span v-else class="text-null">-</span>
            </td>
            <td>
              <div v-if="c.telepon || c.email" class="client-contact">
                <a
                  v-if="c.telepon"
                  :href="getWaLink(c.telepon)"
                  target="_blank"
                  rel="noopener"
                  class="client-wa-link"
                  title="Buka WhatsApp"
                  @click.stop
                >
                  <WhatsAppIcon :size="13" /> {{ c.telepon }}
                </a>
                <div v-if="c.email"><Mail :size="12" /> {{ c.email }}</div>
              </div>
              <span v-else class="text-null">-</span>
            </td>
            <td>
              <div v-if="c.alamat" class="client-lokasi">
                <MapPin :size="12" style="flex-shrink:0;margin-top:2px;" />
                <span>{{ c.alamat }}</span>
              </div>
              <span v-else class="text-null">-</span>
            </td>
            <td>
              <div v-if="c.catatan" class="client-catatan" :title="c.catatan">
                <FileText :size="12" style="flex-shrink:0" />
                <span>{{ c.catatan.length > 50 ? c.catatan.substring(0, 50) + '...' : c.catatan }}</span>
              </div>
              <span v-else class="text-null">-</span>
            </td>
            <td style="text-align:right">
              <div class="action-btns" style="justify-content:flex-end">
                <button class="btn-icon" @click="openEditModal(c)"><Edit3 :size="14" /></button>
                <button class="btn-icon btn-del" @click="handleDelete(c.id)"><Trash2 :size="14" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="filteredClients.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ filteredClients.length }} client
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

    <!-- Modal Form -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
          <div class="modal-box">
            <div class="modal-header">
              <h2>{{ isEditMode ? 'Edit Data Client' : 'Tambah Client Baru' }}</h2>
              <button class="modal-close" @click="closeAddModal"><X :size="16" /></button>
            </div>
            
            <div class="modal-body">
              <div class="form-row single">
                <div class="form-field">
                  <label class="form-label">Nama Client / PIC <span style="color:var(--accent-red)">*</span></label>
                  <input v-model="form.nama" class="form-input" placeholder="Masukkan nama..." />
                </div>
              </div>
              <div class="form-row single">
                <div class="form-field">
                  <label class="form-label">Perusahaan</label>
                  <input v-model="form.perusahaan" class="form-input" placeholder="Nama instansi atau PT/CV..." />
                </div>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">No. Telepon / WA</label>
                  <input v-model="form.telepon" class="form-input" placeholder="08..." />
                </div>
                <div class="form-field">
                  <label class="form-label">Email</label>
                  <input v-model="form.email" class="form-input" placeholder="email@contoh.com" />
                </div>
              </div>
              <div class="form-row single">
                <div class="form-field">
                  <label class="form-label">Alamat / Lokasi</label>
                  <input v-model="form.alamat" class="form-input" placeholder="Alamat lengkap..." />
                </div>
              </div>
              <div class="form-row single">
                <div class="form-field">
                  <label class="form-label">Catatan Tambahan</label>
                  <textarea v-model="form.catatan" class="form-input" placeholder="Catatan opsional..." rows="3"></textarea>
                </div>
              </div>
            </div>

            <div class="modal-footer modal-footer-split">
              <button class="btn-ghost btn-half" @click="closeAddModal" :disabled="store.saving">Batal</button>
              <button class="btn-primary btn-half" @click="submitAddModal" :disabled="store.saving">
                <span v-if="store.saving" class="spinner-xs"></span>
                <Save v-else :size="14" />
                {{ store.saving ? 'Menyimpan...' : 'Simpan Client' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
.crm-filter-row { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; }
.crm-total-badge {
  font-size: 12px; color: var(--text-muted);
  background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 6px 12px; white-space: nowrap;
}
.client-row:hover td { background: rgba(255,255,255,0.015); }
.client-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.client-company { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); }
.client-contact { display: flex; flex-direction: column; gap: 4px; font-size: 12.5px; color: var(--text-secondary); }
.client-contact div { display: flex; align-items: center; gap: 6px; }
.client-lokasi { display: flex; align-items: flex-start; gap: 6px; font-size: 12.5px; color: var(--text-secondary); max-width: 200px; line-height: 1.4; }
.client-catatan { display: flex; align-items: flex-start; gap: 6px; font-size: 12px; color: var(--text-muted); max-width: 200px; line-height: 1.4; font-style: italic; }
.text-null { color: var(--text-muted); font-style: italic; font-size: 12.5px; opacity: 0.5; }

.action-btns { display: flex; gap: 6px; align-items: center; }
.btn-icon {
  width: 32px; height: 32px; border-radius: 6px; border: 1px solid transparent;
  background: transparent; color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all 0.15s;
}
.btn-icon:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); border-color: var(--border-color); }
.btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

/* Toasts & Spinner (shared styling) */
.toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; }
.toast-item { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; min-width: 260px; max-width: 360px; backdrop-filter: blur(10px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); border: 1px solid; }
.toast-success { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #10b981; }
.toast-error { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #ef4444; }
.toast-enter-active, .toast-leave-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(60px) scale(0.9); }
.spinner-xs { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin-xs 0.6s linear infinite; display: inline-block; flex-shrink: 0; }
@keyframes spin-xs { to { transform: rotate(360deg); } }

/* Modal specific styles */
.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box { transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1); }
.modal-enter-from .modal-box { transform: scale(0.92) translateY(-20px); }
.modal-leave-to .modal-box  { transform: scale(0.92) translateY(-20px); }

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

.client-wa-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #25d366;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.15s ease;
}
.client-wa-link:hover {
  color: #4ade80;
  text-decoration: underline;
}
.client-wa-link .wa-icon {
  color: #25d366;
  flex-shrink: 0;
}
</style>
