<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { Plus, X, Settings2, Trash2 } from '@lucide/vue'
import { documentNumberingApi, type DocumentNumbering } from '@/services/api'
import { useToast } from 'vue-toastification'

const toast = useToast()

const items = ref<DocumentNumbering[]>([])
const loading = ref(true)

// ─── Pagination ──────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(15)

const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize.value)))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return items.value.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

const showModal = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)
const saving = ref(false)

const form = ref({
  module: '',
  module_label: '',
  format: '',
  starting_number: 1,
  digit: 4,
  current_number: 0
})

function updateModuleLabel() {
  const map: Record<string, string> = {
    'proyek': 'Penomoran Proyek Baru',
    'penawaran': 'Penomoran Quotation',
    'invoice': 'Penomoran Invoice',
    'bast': 'Penomoran Dokumen BAST',
    'crm': 'Penomoran CRM (Lead)'
  }
  if (form.value.module && map[form.value.module]) {
    form.value.module_label = map[form.value.module]
  }
}

const formBuilder = ref({
  posisi_nomor: 'awal',
  teks_1: '',
  teks_2: '',
  format_waktu: 'romawi_tahun',
  separator: '/'
})

// Auto-sync builder to format
watch(formBuilder, (newVal, oldVal) => {
  let parts = []
  if (newVal.posisi_nomor === 'awal') parts.push('[SEQ]')
  if (newVal.teks_1) parts.push(newVal.teks_1)
  if (newVal.teks_2) parts.push(newVal.teks_2)
  
  if (newVal.format_waktu === 'romawi_tahun') {
      parts.push('[ROMAN_MONTH]')
      parts.push('[YYYY]')
  } else if (newVal.format_waktu === 'tahun_bulan') {
      parts.push('[YYYY]')
      parts.push('[MM]')
  }
  if (newVal.posisi_nomor === 'akhir') parts.push('[SEQ]')

  form.value.format = parts.join(newVal.separator || '/')
}, { deep: true })

function parseFormatToBuilder(formatStr: string) {
  let state = {
    posisi_nomor: 'awal',
    teks_1: '',
    teks_2: '',
    format_waktu: 'none',
    separator: '/'
  }
  if (!formatStr) return state

  if (formatStr.includes('-')) state.separator = '-'
  else state.separator = '/'

  let parts = formatStr.split(state.separator)
  
  if (parts[0] === '[SEQ]') {
     state.posisi_nomor = 'awal'
     parts.shift()
  } else if (parts[parts.length - 1] === '[SEQ]') {
     state.posisi_nomor = 'akhir'
     parts.pop()
  }

  let hasRoman = false, hasYYYY = false, hasMM = false
  parts = parts.filter(p => {
    if (p === '[ROMAN_MONTH]') { hasRoman = true; return false }
    if (p === '[YYYY]') { hasYYYY = true; return false }
    if (p === '[MM]') { hasMM = true; return false }
    return true
  })

  if (hasRoman && hasYYYY) state.format_waktu = 'romawi_tahun'
  else if (hasMM && hasYYYY) state.format_waktu = 'tahun_bulan'
  
  if (parts.length > 0) state.teks_1 = parts[0]
  if (parts.length > 1) state.teks_2 = parts[1]

  return state
}

async function fetchItems() {
  loading.value = true
  try {
    items.value = await documentNumberingApi.list()
  } catch (e: any) {
    toast.error('Gagal mengambil data pengaturan')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchItems()
})

function openAdd() {
  isEdit.value = false
  editId.value = null
  form.value = {
    module: '',
    module_label: '',
    format: '',
    starting_number: 1,
    digit: 4,
    current_number: 0
  }
  formBuilder.value = {
    posisi_nomor: 'awal',
    teks_1: '',
    teks_2: '',
    format_waktu: 'romawi_tahun',
    separator: '/'
  }
  showModal.value = true
}

function openEdit(item: DocumentNumbering) {
  isEdit.value = true
  editId.value = item.id
  form.value = {
    module: item.module,
    module_label: item.module_label,
    format: item.format || '',
    starting_number: item.starting_number,
    digit: item.digit,
    current_number: item.current_number
  }
  formBuilder.value = parseFormatToBuilder(item.format || '')
  showModal.value = true
}

async function submitForm() {
  if (!form.value.module.trim() || !form.value.module_label.trim()) {
    toast.warning('Kode Modul dan Label Modul wajib diisi')
    return
  }
  
  saving.value = true
  try {
    if (isEdit.value && editId.value !== null) {
      await documentNumberingApi.update(editId.value, form.value)
      toast.success('Pengaturan berhasil diperbarui')
    } else {
      await documentNumberingApi.create(form.value)
      toast.success('Pengaturan berhasil dibuat')
    }
    showModal.value = false
    fetchItems()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan pengaturan')
  } finally {
    saving.value = false
  }
}

async function deleteItem(id: number) {
  if (!confirm('Apakah Anda yakin ingin menghapus format penomoran ini? Jika modul ini masih digunakan oleh aplikasi, aplikasi bisa error.')) return
  try {
    await documentNumberingApi.delete(id)
    toast.success('Format penomoran dihapus')
    fetchItems()
  } catch (e: any) {
    toast.error('Gagal menghapus')
  }
}

const formatPreview = (item: any) => {
  // If it's already generated by backend (in items list), we can just use next_preview
  if (item.next_preview) return item.next_preview

  // For the frontend realtime preview during Edit/Add
  const next = Math.max((item.current_number || 0) + 1, item.starting_number || 1)
  const padded = String(next).padStart(item.digit || 4, '0')
  const now = new Date()
  
  const yyyy = now.getFullYear().toString()
  const yy = yyyy.slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const romans = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII']
  const romanMonth = romans[now.getMonth()]

  let result = item.format || '[SEQ]'
  result = result.replace(/\[YYYY\]/g, yyyy)
  result = result.replace(/\[YY\]/g, yy)
  result = result.replace(/\[MM\]/g, mm)
  result = result.replace(/\[DD\]/g, dd)
  result = result.replace(/\[ROMAN_MONTH\]/g, romanMonth)
  result = result.replace(/\[SEQ\]/g, padded)

  return result
}
</script>

<template>
  <AdminLayout>
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Document Numbering</h1>
        <p>Kelola format penomoran otomatis untuk dokumen</p>
      </div>
      <button class="btn-primary" @click="openAdd">
        <Plus :size="16" /> Tambah Modul
      </button>
    </div>

    <div class="table-card">
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="sk-row" />
      </template>

      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Modul</th>
            <th>Format Lengkap</th>
            <th>Mulai | Digit</th>
            <th>Current Number</th>
            <th>Preview Selanjutnya</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="items.length === 0">
            <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted)">
              Belum ada pengaturan document numbering
            </td>
          </tr>
          <tr v-for="item in paginatedItems" :key="item.id">
            <td>
              <div style="font-weight:600; color:var(--text-primary)">{{ item.module_label }}</div>
              <div style="font-size:12px; color:var(--text-muted)">Code: {{ item.module }}</div>
            </td>
            <td>
              <span class="badge" style="background:rgba(255,255,255,0.05)">{{ item.format || '(kosong)' }}</span>
            </td>
            <td>
              <div style="font-size:12px; color:var(--text-secondary)">
                Start: {{ item.starting_number }} | Digit: {{ item.digit }}
              </div>
            </td>
            <td>
              <div style="font-weight:700; font-family:monospace">{{ item.current_number }}</div>
            </td>
            <td>
              <div style="color:var(--accent-orange); font-family:monospace; font-weight:700;">
                {{ item.next_preview || formatPreview(item) }}
              </div>
            </td>
            <td>
              <div style="display:flex; gap:8px;">
                <button class="btn-edit" @click="openEdit(item)"><Settings2 :size="14" /> Edit</button>
                <button class="btn-del" @click="deleteItem(item.id)"><Trash2 :size="14" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="items.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ items.length }} modul numbering
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
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-box modal-box-lg">
          <div class="modal-header">
            <h2>{{ isEdit ? 'Edit Format Numbering' : 'Tambah Modul Numbering' }}</h2>
            <button class="modal-close" @click="showModal = false"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Koneksi Fitur / Modul *</label>
                <select v-model="form.module" class="form-input" :disabled="isEdit" @change="updateModuleLabel">
                  <option value="" disabled>-- Pilih Fitur Aplikasi --</option>
                  <option value="proyek">Proyek Baru</option>
                  <option value="penawaran">Quotation (Penawaran)</option>
                  <option value="invoice">Invoice / Tagihan</option>
                  <option value="bast">BAST (Berita Acara Serah Terima)</option>
                  <option value="crm">CRM Lead (Prospek Klien)</option>
                </select>
                <span v-if="isEdit" style="font-size:11px; color:var(--text-muted)">Koneksi fitur tidak dapat diubah setelah dibuat.</span>
              </div>
              <div class="form-field">
                <label class="form-label">Nama Modul *</label>
                <input v-model="form.module_label" class="form-input" placeholder="contoh: Penomoran Quotation" />
              </div>
            </div>

            <div class="form-row form-row-2">
              <div class="form-field">
                <label class="form-label">Posisi Nomor Urut</label>
                <select v-model="formBuilder.posisi_nomor" class="form-input">
                  <option value="awal">Di Awal (Contoh: 015/PWS/...)</option>
                  <option value="akhir">Di Akhir (Contoh: .../PWS/015)</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Karakter Pemisah</label>
                <select v-model="formBuilder.separator" class="form-input">
                  <option value="/">Garis Miring ( / )</option>
                  <option value="-">Strip ( - )</option>
                </select>
              </div>
            </div>

            <div class="form-row form-row-2">
              <div class="form-field">
                <label class="form-label">Teks 1 (Kode Perusahaan)</label>
                <input v-model="formBuilder.teks_1" class="form-input" placeholder="Misal: PWS" />
              </div>
              <div class="form-field">
                <label class="form-label">Teks 2 (Kode Dokumen)</label>
                <input v-model="formBuilder.teks_2" class="form-input" placeholder="Misal: QUOT" />
              </div>
            </div>

            <div class="form-row form-row-2">
              <div class="form-field">
                <label class="form-label">Format Waktu (Bulan/Tahun)</label>
                <select v-model="formBuilder.format_waktu" class="form-input">
                  <option value="romawi_tahun">Romawi & Tahun (VIII/2026)</option>
                  <option value="tahun_bulan">Tahun & Angka (2026/08)</option>
                  <option value="none">Tidak Pakai Waktu</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Jumlah Digit Nol</label>
                <input v-model.number="form.digit" type="number" min="1" class="form-input" />
              </div>
            </div>

            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Hasil Pola Format</label>
                <div style="padding:10px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:6px; font-family:monospace; color:var(--text-secondary);">
                  {{ form.format || '(belum ada format)' }}
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Starting Number</label>
                <input v-model.number="form.starting_number" type="number" min="1" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Current Number</label>
                <input v-model.number="form.current_number" type="number" min="0" class="form-input" />
              </div>
            </div>
            
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Preview</label>
                <div style="padding:12px; background:rgba(255,255,255,0.03); border:1px dashed var(--border-color); border-radius:8px; font-family:monospace; font-size:16px; font-weight:700; color:var(--accent-orange); text-align:center;">
                  {{ formatPreview(form) }}
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="showModal = false">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
.btn-edit {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 6px;
  border: 1px solid var(--border-color); background: transparent; color: var(--text-primary);
  cursor: pointer; transition: all 0.15s;
}
.btn-edit:hover { border-color: var(--accent-orange); color: var(--accent-orange); }

.btn-del {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 6px; border: 1px solid transparent;
  background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.15s;
}
.btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

.badge {
  display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px;
  font-family: monospace; font-weight: 600;
}
.sk-row { height: 50px; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02); animation: pulse 1.5s ease infinite; }
@keyframes pulse { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }

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
