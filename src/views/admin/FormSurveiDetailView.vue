<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useSurveiStore } from '@/stores/survei'
import { auditLogsApi } from '@/services/api'
import type { SurveiResponse, AuditLogResponse } from '@/services/api'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, FileText, Activity, Clock,
  User, Ban, Edit3, Save, GripVertical, Plus, Trash2, X, ClipboardList
} from '@lucide/vue'

const store  = useSurveiStore()
const route  = useRoute()
const router = useRouter()

const isEditMode = ref(false)
const detailTab  = ref<'Form' | 'Catatan' | 'AuditLog'>('Form')
const surveiAuditLogs = ref<AuditLogResponse[]>([])

interface LocalQuestion {
  _localId: string
  id: number | null
  label: string
  answer: string
  notes: string
  urutan: number
}

interface LocalCategory {
  _localId: string
  id: number | null
  name: string
  isOpen: boolean
  urutan: number
  questions: LocalQuestion[]
}

const localCategories = ref<LocalCategory[]>([])

function makeLocalId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function buildLocalCategories(survei: SurveiResponse): LocalCategory[] {
  if (!survei.categories) return []
  return survei.categories.map((cat, ci) => ({
    _localId:  cat.id ? `cat_${cat.id}` : makeLocalId(),
    id:        cat.id,
    name:      cat.name,
    isOpen:    true,
    urutan:    cat.urutan ?? ci,
    questions: cat.questions.map((q, qi) => ({
      _localId: q.id ? `q_${q.id}` : makeLocalId(),
      id:       q.id,
      label:    q.label,
      answer:   q.answer ?? '',
      notes:    q.notes ?? '',
      urutan:   q.urutan ?? qi,
    })),
  }))
}

watch(() => store.selectedData, async (val) => {
  if (val) {
    localCategories.value = buildLocalCategories(val)
    try {
      const logsRes = await auditLogsApi.list({ survei_id: val.id })
      surveiAuditLogs.value = logsRes.data
    } catch (e) {
      console.error(e)
    }
  }
}, { deep: false, immediate: true })

function calcProgress(cats: LocalCategory[]) {
  let total = 0, answered = 0
  for (const cat of cats) {
    for (const q of cat.questions) {
      total++
      if (q.answer.trim()) answered++
    }
  }
  return { total, answered, percent: total > 0 ? Math.round((answered / total) * 100) : 0 }
}

function addCategory() {
  localCategories.value.push({
    _localId:  makeLocalId(),
    id:        null,
    name:      'Kategori Baru',
    isOpen:    true,
    urutan:    localCategories.value.length,
    questions: [],
  })
}

function addQuestion(cat: LocalCategory) {
  cat.questions.push({
    _localId: makeLocalId(),
    id:       null,
    label:    'Pertanyaan Baru',
    answer:   '',
    notes:    '',
    urutan:   cat.questions.length,
  })
}

function removeCategory(localId: string) {
  showConfirm(
    'Hapus Kategori',
    'Apakah Anda yakin ingin menghapus kategori ini beserta seluruh pertanyaannya?',
    'danger',
    () => { localCategories.value = localCategories.value.filter(c => c._localId !== localId) }
  )
}

function removeQuestion(cat: LocalCategory, localId: string) {
  showConfirm(
    'Hapus Pertanyaan',
    'Apakah Anda yakin ingin menghapus pertanyaan ini?',
    'danger',
    () => { cat.questions = cat.questions.filter(q => q._localId !== localId) }
  )
}

async function saveForm() {
  if (!store.selectedData) return
  const cats = localCategories.value.map((cat, ci) => ({
    id:       cat.id,
    name:     cat.name,
    urutan:   ci,
    questions: cat.questions.map((q, qi) => ({
      id:     q.id,
      label:  q.label,
      answer: q.answer,
      notes:  q.notes,
      urutan: qi,
    })),
  }))

  const ok = await store.syncForm(store.selectedData.id, {
    categories: cats,
    estimasi:   Number(editEstimasi.value) || 0,
    catatan:    store.selectedData.catatan ?? '',
    rekomendasi: store.selectedData.rekomendasi ?? '',
  })

  if (ok) {
    isEditMode.value = false
    toast('Form survei berhasil disimpan', 'success')
  } else {
    toast(store.error ?? 'Terjadi kesalahan', 'error')
  }
}

const editEstimasi = ref('0')
const editSurveyor = ref('')
const editStatus   = ref<'Dijadwalkan' | 'Selesai' | 'Batal'>('Dijadwalkan')

watch(() => store.selectedData, (val) => {
  if (val) {
    editEstimasi.value = String(val.estimasi ?? 0)
    editSurveyor.value = val.surveyor ?? ''
    editStatus.value   = val.status
  }
}, { immediate: true })

function cancelEdit() {
  isEditMode.value = false
  if (store.selectedData) {
    localCategories.value = buildLocalCategories(store.selectedData)
  }
}

function markAsSelesai(survei: SurveiResponse) {
  showConfirm(
    'Tandai Selesai',
    'Apakah Anda yakin ingin menandai survei ini sebagai Selesai?',
    'success',
    async () => {
      const ok = await store.updateStatus(survei.id, 'Selesai')
      if (ok) toast('Status survei diperbarui: Selesai', 'success')
      else toast(store.error ?? 'Gagal', 'error')
    }
  )
}

function markAsBatal(survei: SurveiResponse) {
  showConfirm(
    'Batalkan Survei',
    'Apakah Anda yakin ingin membatalkan survei ini?',
    'danger',
    async () => {
      const ok = await store.updateStatus(survei.id, 'Batal')
      if (ok) toast('Survei dibatalkan', 'success')
      else toast(store.error ?? 'Gagal', 'error')
    }
  )
}

const formatRupiah = (val: number | string) => {
  const n = Number(val)
  if (!n) return 'Rp -'
  return 'Rp' + n.toLocaleString('id-ID')
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const confirmModal = ref({
  show: false, title: '', message: '',
  type: 'danger' as 'danger' | 'warning' | 'success',
  onConfirm: () => {},
})

function showConfirm(title: string, message: string, type: 'danger' | 'warning' | 'success', onConfirm: () => void) {
  confirmModal.value = { show: true, title, message, type, onConfirm }
}

function closeConfirm() { confirmModal.value.show = false }
function executeConfirm() { confirmModal.value.onConfirm(); closeConfirm() }

interface Toast { id: string; message: string; type: 'success' | 'error' | 'info' }
const toasts = ref<Toast[]>([])

function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = makeLocalId()
  toasts.value.push({ id, message, type })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 3500)
}

onMounted(async () => {
  const id = Number(route.params.id)
  if (id) {
    store.selectId(id)
    await store.fetchOne(id)
  }
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
    <div class="page-toolbar" style="margin-bottom: 20px;">
      <div class="page-toolbar-left" style="display:flex; align-items:center; gap: 12px;">
        <button class="btn-back" @click="router.push('/admin/form-survei')">
          <ArrowLeft :size="18" />
        </button>
        <div>
          <h1>Detail Survei</h1>
          <p>Informasi dan form survei client</p>
        </div>
      </div>
    </div>

    <!-- Detail View -->
    <div class="fs-detail" style="max-width: 1000px; margin: 0 auto;">
      <div v-if="store.loadingDetail" class="fs-detail-skeleton">
        <div class="skel skel-h2"></div>
        <div class="skel skel-line" style="width:60%;margin-top:8px;"></div>
        <div style="margin-top:20px; display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="skel skel-line"></div>
          <div class="skel skel-line"></div>
        </div>
      </div>

      <template v-else-if="store.selectedData">
        <!-- Header Card -->
        <div class="fs-detail-header-card">
          <div class="fs-dh-top">
            <div class="fs-dh-titles">
              <h2>{{ store.selectedData.client }}</h2>
              <div class="fs-dh-company">{{ store.selectedData.perusahaan }}</div>
            </div>
            <div class="fs-dh-actions">
              <template v-if="!isEditMode">
                <button 
                  v-if="store.selectedData.lead_id" 
                  class="btn-ghost" 
                  style="padding:6px 10px; font-size:12.5px; display:flex; align-items:center; gap:6px; border:1px solid var(--border-color);" 
                  @click="router.push(`/admin/crm/${store.selectedData.lead_id}`)"
                >
                  <User :size="13" /> CRM
                </button>
                <button
                  v-if="store.selectedData.status === 'Dijadwalkan'"
                  class="btn-action btn-batal"
                  :disabled="store.saving"
                  @click="markAsBatal(store.selectedData!)"
                >
                  <Ban :size="13" /> Batalkan
                </button>
                <button
                  v-if="store.selectedData.status !== 'Selesai'"
                  class="btn-action btn-selesai"
                  :disabled="store.saving"
                  @click="markAsSelesai(store.selectedData!)"
                >
                  <CheckCircle2 :size="13" /> Selesai
                </button>
                <button class="btn-action btn-edit" @click="isEditMode = true">
                  <Edit3 :size="13" /> Edit
                </button>
              </template>
              <template v-else>
                <button class="btn-ghost" style="padding:6px 14px; font-size:12.5px;" @click="cancelEdit" :disabled="store.saving">
                  Batal
                </button>
                <button class="btn-action btn-save" @click="saveForm" :disabled="store.saving">
                  <span v-if="store.saving" class="spinner-xs"></span>
                  <Save v-else :size="13" />
                  {{ store.saving ? 'Menyimpan...' : 'Simpan' }}
                </button>
              </template>
            </div>
          </div>

          <div class="fs-dh-grid">
            <div class="fs-dh-col">
              <div class="fs-dh-meta">
                <span>Surveyor:</span>
                <span v-if="!isEditMode">{{ store.selectedData.surveyor ?? '-' }}</span>
                <input v-else v-model="editSurveyor" class="form-input fs-inline-input" />
              </div>
              <div class="fs-dh-meta">
                <span>Lokasi:</span> {{ store.selectedData.lokasi ?? '-' }}
              </div>
            </div>
            <div class="fs-dh-col">
              <div class="fs-dh-meta">
                <span>Tanggal:</span> {{ formatDate(store.selectedData.tanggal) }} · {{ store.selectedData.waktu }}
              </div>
              <div class="fs-dh-meta">
                <span>Kebutuhan:</span> {{ store.selectedData.kebutuhan ?? '-' }}
              </div>
            </div>
          </div>

          <div v-if="isEditMode" class="fs-dh-edit-row">
            <div class="form-field">
              <label class="form-label">Estimasi Nilai (Rp)</label>
              <input v-model="editEstimasi" type="number" class="form-input" placeholder="0" />
            </div>
            <div class="form-field">
              <label class="form-label">Status</label>
              <select v-model="editStatus" class="form-select fs-select">
                <option value="Dijadwalkan">Dijadwalkan</option>
                <option value="Selesai">Selesai</option>
                <option value="Batal">Batal</option>
              </select>
            </div>
          </div>

          <div class="fs-dh-progress-row">
            <span class="fs-dh-prog-label">Kelengkapan data survei</span>
            <span class="fs-dh-prog-value">
              {{ calcProgress(localCategories).answered }}/{{ calcProgress(localCategories).total }} pertanyaan &nbsp;·&nbsp;
              {{ calcProgress(localCategories).percent }}%
            </span>
          </div>
          <div class="fs-dh-prog-bar">
            <div class="fs-dh-prog-fill" :style="{ width: calcProgress(localCategories).percent + '%' }"></div>
          </div>
        </div>

        <div class="fs-detail-tabs">
          <button class="fs-dtab" :class="{ active: detailTab === 'Form' }" @click="detailTab = 'Form'">
            <FileText :size="14" /> Form Survei
          </button>
          <button class="fs-dtab" :class="{ active: detailTab === 'Catatan' }" @click="detailTab = 'Catatan'">
            <Edit3 :size="14" /> Catatan & Rekomendasi
          </button>
          <button class="fs-dtab" :class="{ active: detailTab === 'AuditLog' }" @click="detailTab = 'AuditLog'">
            <Activity :size="14" /> Riwayat (Audit Log)
          </button>
        </div>

        <!-- Tab: Form -->
        <div class="fs-detail-body" v-if="detailTab === 'Form'">
          <div v-if="localCategories.length === 0 && !isEditMode" class="fs-form-empty">
            <ClipboardList :size="36" />
            <p>Belum ada form survei.</p>
            <p style="font-size:12.5px; color:var(--text-muted);">Klik <strong>Edit</strong> untuk menambahkan kategori dan pertanyaan.</p>
          </div>

          <div v-else class="fs-table-wrapper">
            <table class="fs-table">
              <thead>
                <tr>
                  <th width="40" style="text-align: center;">No</th>
                  <th width="30%">Pertanyaan</th>
                  <th width="35%">Jawaban</th>
                  <th>Catatan</th>
                  <th v-if="isEditMode" width="60" style="text-align: center;">Aksi</th>
                </tr>
              </thead>
              <tbody v-for="(cat, catIndex) in localCategories" :key="cat._localId">
                <tr class="fs-table-category-row">
                  <td :colspan="isEditMode ? 5 : 4" class="fs-cat-cell">
                    <div class="fs-cat-header-content">
                      <GripVertical v-if="isEditMode" :size="14" class="fs-drag-icon" />
                      <span class="fs-acc-emoji">📋</span>
                      <span v-if="!isEditMode">{{ cat.name }}</span>
                      <input
                        v-else
                        v-model="cat.name"
                        class="form-input"
                        style="max-width:240px; padding:4px 8px; font-size:13px;"
                      />
                      <span class="fs-acc-count" style="margin-left: 8px;">
                        {{ cat.questions.filter(q => q.answer).length }}/{{ cat.questions.length }} dijawab
                      </span>
                      
                      <div style="margin-left:auto; display:flex; gap:8px;">
                         <button v-if="isEditMode" class="btn-add-question-small" @click="addQuestion(cat)">
                           <Plus :size="12" /> Tambah Pertanyaan
                         </button>
                         <button v-if="isEditMode" class="btn-icon-red" @click="removeCategory(cat._localId)" title="Hapus kategori">
                           <Trash2 :size="13" />
                         </button>
                      </div>
                    </div>
                  </td>
                </tr>

                <tr v-if="cat.questions.length === 0" class="fs-table-empty-row">
                  <td :colspan="isEditMode ? 5 : 4" style="text-align:center; color:var(--text-muted); font-size:12.5px; padding:20px;">
                    Belum ada pertanyaan di kategori ini.
                  </td>
                </tr>

                <tr v-for="(q, qIndex) in cat.questions" :key="q._localId" class="fs-table-q-row">
                  <td style="text-align:center; color:var(--text-muted); font-size: 12.5px;">{{ qIndex + 1 }}</td>
                  <td>
                    <span v-if="!isEditMode" class="fs-q-text">{{ q.label }}</span>
                    <textarea v-else v-model="q.label" class="form-input" placeholder="Pertanyaan..." rows="2" style="width:100%; font-size:12.5px; resize:vertical; min-height:42px;"></textarea>
                  </td>
                  <td>
                    <div v-if="!isEditMode" class="fs-q-answer" style="padding-left:0;">
                      <span v-if="q.answer">{{ q.answer }}</span>
                      <span v-else class="fs-q-unanswered">Belum dijawab</span>
                    </div>
                    <textarea v-else v-model="q.answer" class="form-input" placeholder="Jawaban..." rows="2" style="width:100%; font-size:12.5px; resize:vertical; min-height:42px;"></textarea>
                  </td>
                  <td>
                    <div v-if="!isEditMode" class="fs-q-answer" style="padding-left:0;">
                      <span v-if="q.notes" style="font-size:12px; color:var(--text-secondary);">{{ q.notes }}</span>
                      <span v-else style="color:var(--text-muted); font-size:12px;">-</span>
                    </div>
                    <textarea v-else v-model="q.notes" class="form-input fs-input-notes" placeholder="Catatan tambahan..." rows="2" style="width:100%; font-size:12px; resize:vertical; min-height:42px;"></textarea>
                  </td>
                  <td v-if="isEditMode" style="text-align:center; vertical-align:middle;">
                    <button class="btn-icon-red" style="margin: 0 auto;" @click="removeQuestion(cat, q._localId)" title="Hapus pertanyaan">
                      <X :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div v-if="isEditMode" style="margin-top:12px;">
            <button class="btn-add-category" @click="addCategory">
              <Plus :size="14" /> Tambah Kategori Baru
            </button>
          </div>
        </div>

        <!-- Tab: Catatan -->
        <div class="fs-detail-body" v-if="detailTab === 'Catatan'">
          <div class="fs-catatan-grid">
            <div class="fs-catatan-block">
              <div class="fs-catatan-label">
                <FileText :size="14" /> Catatan Lapangan
              </div>
              <textarea
                v-model="store.selectedData.catatan"
                class="fs-textarea"
                placeholder="Tambahkan catatan lapangan di sini..."
                rows="6"
                :disabled="!isEditMode"
              ></textarea>
            </div>
            <div class="fs-catatan-block">
              <div class="fs-catatan-label">
                <CheckCircle2 :size="14" /> Rekomendasi
              </div>
              <textarea
                v-model="store.selectedData.rekomendasi"
                class="fs-textarea"
                placeholder="Tambahkan rekomendasi untuk tim teknis..."
                rows="6"
                :disabled="!isEditMode"
              ></textarea>
            </div>
          </div>
          <div v-if="!isEditMode && !store.selectedData.catatan && !store.selectedData.rekomendasi" class="fs-form-empty">
            <Edit3 :size="36" />
            <p>Belum ada catatan.</p>
            <p style="font-size:12.5px; color:var(--text-muted);">Klik <strong>Edit</strong> untuk menambahkan catatan dan rekomendasi.</p>
          </div>
        </div>

        <!-- Tab: Audit Log -->
        <div class="fs-detail-body" v-if="detailTab === 'AuditLog'">
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.2); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 12px 16px; font-weight: 600;"><Clock :size="11" style="display:inline; margin-right:4px;" /> Waktu</th>
                  <th style="padding: 12px 16px; font-weight: 600;"><User :size="11" style="display:inline; margin-right:4px;" /> Pengguna</th>
                  <th style="padding: 12px 16px; font-weight: 600;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="surveiAuditLogs.length === 0">
                  <td colspan="3" style="text-align: center; padding: 32px; color: var(--text-muted); font-style: italic;">
                    Belum ada riwayat perubahan pada survei ini.
                  </td>
                </tr>
                <tr v-for="log in surveiAuditLogs" :key="log.id" style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                  <td style="padding: 14px 16px; color: var(--text-secondary);">{{ log.created_at }}</td>
                  <td style="padding: 14px 16px; font-weight: 500; color: var(--text-primary);">{{ log.user_name }}</td>
                  <td style="padding: 14px 16px;">
                    <span style="display:inline-flex; align-items:center; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary);">
                      {{ log.auditable_type }} - {{ log.action.toUpperCase() }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>

    </div>

    <!-- Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="confirmModal.show" class="modal-overlay" style="z-index:9999;" @click.self="closeConfirm">
          <div class="modal-box" style="max-width:400px; padding:24px; text-align:center;">
            <div style="display:flex; justify-content:center; margin-bottom:16px;">
              <div class="confirm-icon" :class="`confirm-icon-${confirmModal.type}`">
                <X v-if="confirmModal.type === 'danger'" :size="22" stroke-width="2.5" />
                <CheckCircle2 v-else-if="confirmModal.type === 'success'" :size="22" stroke-width="2.5" />
                <AlertTriangle v-else :size="22" stroke-width="2.5" />
              </div>
            </div>
            <h3 class="confirm-title">{{ confirmModal.title }}</h3>
            <p class="confirm-msg">{{ confirmModal.message }}</p>
            <div style="display:flex; gap:12px;">
              <button class="btn-ghost" style="flex:1; padding:10px; font-weight:600;" @click="closeConfirm">Batal</button>
              <button
                class="btn-primary"
                style="flex:1; padding:10px; font-weight:600; box-shadow:none;"
                :style="{ background: confirmModal.type === 'danger' ? 'var(--accent-red)' : confirmModal.type === 'success' ? 'var(--accent-green)' : 'var(--accent-orange)', color: '#fff' }"
                @click="executeConfirm"
              >
                {{ confirmModal.type === 'danger' ? 'Ya, Hapus' : confirmModal.type === 'success' ? 'Ya, Selesai' : 'Lanjutkan' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </AdminLayout>
</template>

<style scoped>
.btn-back {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 8px;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.btn-back:hover {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--accent-orange);
}
.fs-detail-skeleton {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24px;
}
.skel {
  background: linear-gradient(90deg, var(--bg-card) 25%, var(--bg-card-hover) 50%, var(--bg-card) 75%);
  background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 4px;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-line { height: 12px; width: 90%; margin-bottom: 6px; }
.skel-h2 { height: 24px; width: 55%; }
.fs-detail-header-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); padding: 20px 24px; margin-bottom: 20px;
}
.fs-dh-top {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px;
}
.fs-dh-titles h2 { font-size: 19px; font-weight: 700; color: var(--text-primary); }
.fs-dh-company { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
.fs-dh-actions { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
.btn-action {
  display: inline-flex; align-items: center; gap: 5px; padding: 6px 13px;
  border-radius: 7px; font-size: 12.5px; font-weight: 600; cursor: pointer;
  border: none; transition: all var(--transition-fast);
}
.btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-selesai { background: rgba(16,185,129,0.15); color: #10b981; }
.btn-selesai:hover { background: rgba(16,185,129,0.25); }
.btn-batal { background: rgba(239,68,68,0.10); color: #ef4444; }
.btn-batal:hover { background: rgba(239,68,68,0.2); }
.btn-edit { background: rgba(255,255,255,0.06); color: var(--text-primary); }
.btn-edit:hover { background: rgba(255,255,255,0.1); }
.btn-save { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
.btn-save:hover { filter: brightness(1.1); }
.fs-dh-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 14px;
}
.fs-dh-col { display: flex; flex-direction: column; gap: 4px; }
.fs-dh-meta { font-size: 12.5px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
.fs-dh-meta span:first-child { color: var(--text-muted); font-weight: 500; min-width: 72px; }
.fs-inline-input { padding: 3px 8px; font-size: 12.5px; max-width: 200px; height: 28px; }
.fs-dh-edit-row {
  display: flex; gap: 16px; margin-bottom: 14px; padding-top: 12px; border-top: 1px solid var(--border-color);
}
.fs-dh-edit-row .form-field { flex: 1; }
.fs-dh-progress-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.fs-dh-prog-label { font-size: 11.5px; color: var(--text-muted); }
.fs-dh-prog-value { font-size: 11.5px; color: var(--text-secondary); }
.fs-dh-prog-bar { height: 5px; background: var(--border-color); border-radius: 99px; overflow: hidden; }
.fs-dh-prog-fill { height: 100%; background: linear-gradient(90deg, var(--accent-orange), #f59e0b88); border-radius: 99px; transition: width 0.5s ease; }
.fs-detail-tabs {
  display: flex; gap: 4px; border-bottom: 1px solid var(--border-color); padding-bottom: 0; margin-bottom: 20px;
}
.fs-dtab {
  background: transparent; border: none; color: var(--text-secondary);
  font-size: 12.5px; font-weight: 500; padding: 12px 16px; cursor: pointer;
  transition: all var(--transition-fast); border-bottom: 2px solid transparent;
  margin-bottom: -1px; display: flex; align-items: center; gap: 6px;
}
.fs-dtab:hover { color: var(--text-primary); }
.fs-dtab.active { color: var(--accent-orange); border-bottom-color: var(--accent-orange); }
.fs-detail-body { display: flex; flex-direction: column; gap: 10px; }
.fs-form-empty {
  text-align: center; padding: 40px; color: var(--text-muted);
  font-size: 13.5px; display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.fs-table-wrapper {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); overflow: hidden; margin-bottom: 12px;
}
.fs-table { width: 100%; border-collapse: collapse; text-align: left; }
.fs-table th {
  background: rgba(255,255,255,0.02); padding: 12px 16px; font-size: 11.5px;
  font-weight: 600; text-transform: uppercase; color: var(--text-muted);
  border-bottom: 1px solid var(--border-color); letter-spacing: 0.05em;
}
.fs-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); vertical-align: top; }
.fs-table tbody:last-child tr:last-child td { border-bottom: none; }
.fs-table-category-row { background: rgba(255,255,255,0.015); }
.fs-cat-cell { padding: 12px 16px !important; border-bottom: 1px solid var(--border-color) !important; }
.fs-cat-header-content { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--text-primary); }
.fs-acc-emoji { font-size: 15px; }
.fs-drag-icon { color: var(--text-muted); cursor: grab; }
.fs-acc-count { font-size: 10.5px; color: var(--text-muted); background: var(--border-color); padding: 2px 7px; border-radius: 99px; }
.fs-table-q-row:hover { background: rgba(255,255,255,0.01); }
.fs-q-text { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
.fs-q-answer { font-size: 13px; color: var(--text-primary); }
.fs-q-unanswered { color: var(--text-muted); font-style: italic; font-size: 12px; }
.btn-icon-red {
  background: transparent; border: none; color: var(--accent-red);
  cursor: pointer; padding: 4px; border-radius: 4px; display: flex;
  align-items: center; transition: background var(--transition-fast); opacity: 0.6;
}
.btn-icon-red:hover { background: rgba(239,68,68,0.1); opacity: 1; }
.btn-add-question-small {
  background: transparent; border: 1px dashed var(--border-color);
  color: var(--accent-orange); font-size: 11px; font-weight: 500; padding: 4px 8px;
  border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center;
  gap: 4px; transition: all var(--transition-fast);
}
.btn-add-question-small:hover { border-color: var(--accent-orange); background: rgba(245,158,11,0.05); }
.btn-add-category {
  background: transparent; border: 1.5px dashed var(--border-color);
  color: var(--text-secondary); font-size: 13px; font-weight: 500;
  padding: 12px; border-radius: var(--radius-md); cursor: pointer;
  width: 100%; display: flex; align-items: center; justify-content: center;
  gap: 6px; transition: all var(--transition-fast);
}
.btn-add-category:hover { border-color: var(--accent-orange); color: var(--accent-orange); background: rgba(245,158,11,0.03); }
.fs-catatan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.fs-catatan-block { display: flex; flex-direction: column; gap: 8px; }
.fs-catatan-label { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 6px; }
.fs-textarea {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius-md); padding: 12px 14px; color: var(--text-primary);
  font-size: 13px; font-family: inherit; line-height: 1.6; resize: vertical; min-height: 140px;
}
.fs-textarea:focus { outline: none; border-color: var(--accent-orange); }
.fs-textarea:disabled { opacity: 0.6; cursor: default; background: rgba(255,255,255,0.01); }
.confirm-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.confirm-icon-danger { background: rgba(239,68,68,0.15); color: var(--accent-red); }
.confirm-icon-success { background: rgba(16,185,129,0.15); color: var(--accent-green); }
.confirm-icon-warning { background: rgba(245,158,11,0.15); color: var(--accent-orange); }
.confirm-title { font-size: 17px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
.confirm-msg { font-size: 13.5px; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6; }
.toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 99999; display: flex; flex-direction: column; gap: 8px; }
.toast-item { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; min-width: 260px; max-width: 360px; backdrop-filter: blur(10px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); border: 1px solid; }
.toast-success { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #10b981; }
.toast-error { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #ef4444; }
.toast-info { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.3); color: #3b82f6; }
.toast-enter-active, .toast-leave-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(60px) scale(0.9); }
.spinner-xs { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin-xs 0.6s linear infinite; display: inline-block; flex-shrink: 0; }
@keyframes spin-xs { to { transform: rotate(360deg); } }
.modal-enter-active, .modal-leave-active { transition: all 0.22s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .modal-box, .modal-leave-active .modal-box { transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1); }
.modal-enter-from .modal-box { transform: scale(0.92) translateY(-20px); }
.modal-leave-to .modal-box  { transform: scale(0.92) translateY(-20px); }
.fs-select { background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); padding: 7px 10px; border-radius: 7px; font-size: 13px; cursor: pointer; }
</style>
