<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  ArrowLeft, Plus, Clock, CheckCircle, AlertTriangle, X, Edit3, Trash2,
  Image as ImageIcon, ChevronLeft, ChevronRight, Camera, AlertCircle, RefreshCw,
  User, ShieldCheck, Check, MessageSquare
} from '@lucide/vue'
import {
  proyeksApi,
  logPekerjaanApi,
  proyekTimApi,
  usersApi,
  type ProyekResponse,
  type LogPekerjaanResponse,
  type ProyekTimResponse,
  type UserResponse
} from '@/services/api'

const route = useRoute()
const router = useRouter()
const proyekId = Number(route.params.id)

// ── State ──
const proyek = ref<ProyekResponse | null>(null)
const logs = ref<LogPekerjaanResponse[]>([])
const proyekTims = ref<ProyekTimResponse[]>([])
const allUsers = ref<UserResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)

// ── Status Filter ──
const filterStatus = ref<'all' | 'Sesuai' | 'Perlu Revisi' | 'Menunggu Review'>('all')

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [pRes, lRes, tRes, uRes] = await Promise.all([
      proyeksApi.show(proyekId),
      logPekerjaanApi.list(proyekId),
      proyekTimApi.list(proyekId),
      usersApi.list()
    ])
    proyek.value = pRes.data
    logs.value = lRes.data
    proyekTims.value = tRes.data
    allUsers.value = uRes.data
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

const sortedLogs = computed(() => {
  const list = [...logs.value].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.id - a.id)
  if (filterStatus.value === 'all') return list
  return list.filter(l => (l.status_verifikasi || 'Menunggu Review') === filterStatus.value)
})

// ── Date Formatting Helpers ──
function formatDisplayDate(dateStr: string) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatDisplayDateTime(dateStr?: string | null) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// ── Modal Add / Edit Log ──
const showModal = ref(false)
const editingLogId = ref<number | null>(null)

interface FormFoto {
  url: string
  label: string
  keterangan: string
  isNew?: boolean
  file?: File
  id?: number
}

const logForm = ref({
  tanggal: '',
  aktivitas: '',
  tim: [] as string[],
  durasi: 8 as number | null,
  kendala: '',
  fotos: [] as FormFoto[],
})

// Multi-select user state
const searchUserText = ref('')
const isUserDropdownOpen = ref(false)

const allMembers = computed(() => {
  const members = new Set(proyekTims.value.map(t => t.nama_anggota))
  allUsers.value.forEach(u => members.add(u.name))
  return Array.from(members)
})

const filteredUsers = computed(() => {
  const q = searchUserText.value.toLowerCase()
  return allMembers.value.filter(u =>
    !logForm.value.tim.includes(u) && u.toLowerCase().includes(q)
  )
})

const selectUser = (u: string) => {
  if (!logForm.value.tim.includes(u)) logForm.value.tim.push(u)
  searchUserText.value = ''
}

const removeUser = (u: string) => {
  logForm.value.tim = logForm.value.tim.filter(x => x !== u)
}

const onUserInputBlur = () => {
  setTimeout(() => { isUserDropdownOpen.value = false }, 150)
}

// ── Foto Upload & Caption ──
const fotoLabels = ['Dokumentasi', 'Before', 'After', 'Progres', 'Kendala']

const handleFotoUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files) return
  Array.from(target.files).forEach(file => {
    logForm.value.fotos.push({
      url: URL.createObjectURL(file),
      label: 'Dokumentasi',
      keterangan: '',
      isNew: true,
      file
    })
  })
  target.value = ''
}

const removeFoto = (idx: number) => {
  logForm.value.fotos.splice(idx, 1)
}

// ── Lightbox ──
const showLightbox = ref(false)
const lightboxFotos = ref<{ url: string; label: string | null; keterangan?: string | null }[]>([])
const lightboxIndex = ref(0)

const openLightbox = (fotos: any[], startIdx: number) => {
  lightboxFotos.value = fotos.map(f => ({
    url: f.url,
    label: f.label || null,
    keterangan: f.keterangan || null
  }))
  lightboxIndex.value = startIdx
  showLightbox.value = true
}

const lightboxPrev = () => { if (lightboxIndex.value > 0) lightboxIndex.value-- }
const lightboxNext = () => { if (lightboxIndex.value < lightboxFotos.value.length - 1) lightboxIndex.value++ }

// ── Modal Open / Close ──
const openModal = () => {
  editingLogId.value = null
  logForm.value = {
    tanggal: new Date().toISOString().slice(0, 10),
    aktivitas: '',
    tim: [],
    durasi: 8,
    kendala: '',
    fotos: []
  }
  searchUserText.value = ''
  isUserDropdownOpen.value = false
  showModal.value = true
}

const openEditModal = (log: LogPekerjaanResponse) => {
  editingLogId.value = log.id
  logForm.value = {
    tanggal: log.tanggal,
    aktivitas: log.aktivitas,
    tim: log.tim ? [...log.tim] : [],
    durasi: log.durasi ? (parseFloat(log.durasi) || 8) : 8,
    kendala: log.kendala || '',
    fotos: log.fotos?.map(f => ({
      url: f.url,
      label: f.label || 'Dokumentasi',
      keterangan: f.keterangan || '',
      id: f.id
    })) || [],
  }
  searchUserText.value = ''
  isUserDropdownOpen.value = false
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingLogId.value = null
}

const submitLog = async () => {
  if (!logForm.value.aktivitas.trim()) {
    alert('Aktivitas pekerjaan wajib diisi!')
    return
  }
  saving.value = true

  const durasiNum = Number(logForm.value.durasi) || 8

  try {
    const payload = new FormData()
    payload.append('tanggal', logForm.value.tanggal)
    payload.append('aktivitas', logForm.value.aktivitas)
    logForm.value.tim.forEach((t, i) => payload.append(`tim[${i}]`, t))
    payload.append('durasi', durasiNum.toString())
    if (logForm.value.kendala) payload.append('kendala', logForm.value.kendala)

    // Existing fotos (keep them or update label & keterangan)
    const existingFotos = logForm.value.fotos.filter(f => !f.isNew && f.id)
    existingFotos.forEach((f, i) => {
      payload.append(`existing_fotos[${i}][id]`, f.id!.toString())
      if (f.label) payload.append(`existing_fotos[${i}][label]`, f.label)
      if (f.keterangan) payload.append(`existing_fotos[${i}][keterangan]`, f.keterangan)
    })

    // New fotos (upload file with label & keterangan)
    const newFotos = logForm.value.fotos.filter(f => f.isNew && f.file)
    newFotos.forEach((f, i) => {
      payload.append(`new_fotos[${i}]`, f.file as Blob)
      if (f.label) payload.append(`new_foto_labels[${i}]`, f.label)
      if (f.keterangan) payload.append(`new_foto_keterangans[${i}]`, f.keterangan)
    })

    if (editingLogId.value !== null) {
      payload.append('_method', 'PUT')
      await logPekerjaanApi.update(proyekId, editingLogId.value, payload)
    } else {
      await logPekerjaanApi.create(proyekId, payload)
    }

    closeModal()
    await fetchData()
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan log')
  } finally {
    saving.value = false
  }
}

// ── Delete Log ──
const showDeleteModal = ref(false)
const deleteId = ref<number | null>(null)

const requestDelete = (id: number) => { deleteId.value = id; showDeleteModal.value = true }
const closeDeleteModal = () => { showDeleteModal.value = false; deleteId.value = null }
const confirmDelete = async () => {
  if (deleteId.value !== null) {
    try {
      await logPekerjaanApi.delete(proyekId, deleteId.value)
      await fetchData()
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus log')
    }
  }
  closeDeleteModal()
}

// ── Cross Check / Verifikasi Modal ──
const showReviewModal = ref(false)
const reviewingLog = ref<LogPekerjaanResponse | null>(null)
const reviewForm = ref({
  status_verifikasi: 'Sesuai' as 'Menunggu Review' | 'Sesuai' | 'Perlu Revisi',
  catatan_revisi: ''
})
const savingReview = ref(false)

const openReviewModal = (log: LogPekerjaanResponse) => {
  reviewingLog.value = log
  reviewForm.value = {
    status_verifikasi: (log.status_verifikasi === 'Perlu Revisi' ? 'Perlu Revisi' : (log.status_verifikasi === 'Sesuai' ? 'Sesuai' : 'Sesuai')),
    catatan_revisi: log.catatan_revisi || ''
  }
  showReviewModal.value = true
}

const closeReviewModal = () => {
  showReviewModal.value = false
  reviewingLog.value = null
}

const submitReview = async () => {
  if (!reviewingLog.value) return
  if (reviewForm.value.status_verifikasi === 'Perlu Revisi' && !reviewForm.value.catatan_revisi.trim()) {
    alert('Harap berikan komentar atau catatan kesalahan untuk pekerjaan yang perlu revisi!')
    return
  }

  savingReview.value = true
  try {
    await logPekerjaanApi.verifikasi(proyekId, reviewingLog.value.id, {
      status_verifikasi: reviewForm.value.status_verifikasi,
      catatan_revisi: reviewForm.value.catatan_revisi
    })
    closeReviewModal()
    await fetchData()
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan hasil verifikasi')
  } finally {
    savingReview.value = false
  }
}

const goBack = () => router.push(`/admin/proyek/${proyekId}`)

// ── Computed Stats ──
const totalDurasi = computed(() => logs.value.reduce((s, l) => s + (Number(l.durasi) || 0), 0))
const totalFotos = computed(() => logs.value.reduce((s, l) => s + (l.fotos?.length || 0), 0))
const sesuaiCount = computed(() => logs.value.filter(l => l.status_verifikasi === 'Sesuai').length)
const revisiCount = computed(() => logs.value.filter(l => l.status_verifikasi === 'Perlu Revisi').length)
const pendingCount = computed(() => logs.value.filter(l => !l.status_verifikasi || l.status_verifikasi === 'Menunggu Review').length)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 900px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Header ── -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <button class="btn-ghost" style="padding: 8px; border-radius: 8px;" @click="goBack" title="Kembali ke Detail Proyek">
            <ArrowLeft :size="20" />
          </button>
          <div v-if="loading" style="display:flex; align-items:center; gap:10px; color:var(--text-muted);">
            <RefreshCw :size="16" class="spin-icon" /> Memuat log pekerjaan...
          </div>
          <div v-else-if="error" style="color:#ef4444; display:flex; align-items:center; gap:8px;">
            <AlertCircle :size="16" /> {{ error }}
          </div>
          <div v-else>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.06em;">
              {{ proyek?.kode }} · Log Pekerjaan Harian
            </div>
            <h1 style="font-size: 20px; color: var(--text-primary); margin: 0; font-weight: 700;">{{ proyek?.nama }}</h1>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="btn-ghost" style="padding: 8px 12px; font-size: 13px;" @click="fetchData" title="Refresh">
            <RefreshCw :size="14" :class="{ 'spin-icon': loading }" />
          </button>
          <button class="btn-primary" @click="openModal">
            <Plus :size="14" style="margin-right: 6px;" /> Tambah Log
          </button>
        </div>
      </div>

      <!-- ── Summary Stats ── -->
      <div class="lp-stats">
        <div class="lp-stat-card">
          <div class="lp-stat-num">{{ logs.length }}</div>
          <div class="lp-stat-label">Total Log</div>
        </div>
        <div class="lp-stat-card stat-sesuai">
          <div class="lp-stat-num" style="color: #22c55e;">{{ sesuaiCount }}</div>
          <div class="lp-stat-label">✓ Sesuai (Approved)</div>
        </div>
        <div class="lp-stat-card stat-revisi" :class="{ 'has-revisi': revisiCount > 0 }">
          <div class="lp-stat-num" style="color: #ef4444;">{{ revisiCount }}</div>
          <div class="lp-stat-label">⚠️ Perlu Revisi</div>
        </div>
        <div class="lp-stat-card stat-pending">
          <div class="lp-stat-num" style="color: #f59e0b;">{{ pendingCount }}</div>
          <div class="lp-stat-label">⏳ Menunggu Review</div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-num" style="color: #3b82f6;">{{ totalDurasi }}</div>
          <div class="lp-stat-label">Total Jam Kerja</div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-num" style="color: #a78bfa;">{{ totalFotos }}</div>
          <div class="lp-stat-label">Foto Dokumentasi</div>
        </div>
      </div>

      <!-- ── Filter Tabs ── -->
      <div class="lp-filter-tabs">
        <button
          type="button"
          class="filter-tab"
          :class="{ active: filterStatus === 'all' }"
          @click="filterStatus = 'all'"
        >
          Semua Log ({{ logs.length }})
        </button>
        <button
          type="button"
          class="filter-tab tab-revisi"
          :class="{ active: filterStatus === 'Perlu Revisi' }"
          @click="filterStatus = 'Perlu Revisi'"
        >
          ⚠️ Perlu Revisi ({{ revisiCount }})
        </button>
        <button
          type="button"
          class="filter-tab tab-pending"
          :class="{ active: filterStatus === 'Menunggu Review' }"
          @click="filterStatus = 'Menunggu Review'"
        >
          ⏳ Menunggu Review ({{ pendingCount }})
        </button>
        <button
          type="button"
          class="filter-tab tab-sesuai"
          :class="{ active: filterStatus === 'Sesuai' }"
          @click="filterStatus = 'Sesuai'"
        >
          ✓ Sesuai ({{ sesuaiCount }})
        </button>
      </div>

      <!-- ── Log Timeline ── -->
      <div v-if="sortedLogs.length === 0" class="lp-empty">
        <Clock :size="36" style="color: var(--text-muted); margin-bottom: 10px;" />
        <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 12px;">
          {{ filterStatus === 'all' ? 'Belum ada log pekerjaan untuk proyek ini.' : 'Tidak ada log dengan filter status ini.' }}
        </div>
        <button v-if="filterStatus === 'all'" class="btn-primary" @click="openModal">
          <Plus :size="14" style="margin-right: 6px;" /> Catat Aktivitas Pertama
        </button>
        <button v-else class="btn-secondary" @click="filterStatus = 'all'">
          Tampilkan Semua Log
        </button>
      </div>

      <div v-else class="lp-timeline">
        <div v-for="log in sortedLogs" :key="log.id" class="lp-item">
          <!-- Timeline Indicator Dot -->
          <div
            class="lp-dot"
            :class="{
              'lp-dot-revisi': log.status_verifikasi === 'Perlu Revisi',
              'lp-dot-sesuai': log.status_verifikasi === 'Sesuai',
              'lp-dot-pending': !log.status_verifikasi || log.status_verifikasi === 'Menunggu Review'
            }"
          >
            <AlertTriangle v-if="log.status_verifikasi === 'Perlu Revisi'" :size="13" />
            <CheckCircle v-else-if="log.status_verifikasi === 'Sesuai'" :size="13" />
            <Clock v-else :size="13" />
          </div>

          <!-- Log Card -->
          <div
            class="lp-card"
            :class="{
              'card-is-revisi': log.status_verifikasi === 'Perlu Revisi',
              'card-is-sesuai': log.status_verifikasi === 'Sesuai'
            }"
          >
            <!-- Card Header Meta -->
            <div class="lp-card-header">
              <div class="lp-card-meta">
                <span class="lp-date">{{ formatDisplayDate(log.tanggal) }}</span>
                <span class="lp-dur"><Clock :size="12" /> {{ log.durasi || 8 }} Jam</span>

                <!-- Status Verifikasi Badge -->
                <span
                  v-if="log.status_verifikasi === 'Perlu Revisi'"
                  class="lp-badge-verif badge-revisi"
                  title="Pekerjaan perlu diperbaiki berdasarkan cross check reviewer"
                >
                  <AlertTriangle :size="11" /> Perlu Revisi
                </span>
                <span
                  v-else-if="log.status_verifikasi === 'Sesuai'"
                  class="lp-badge-verif badge-sesuai"
                  title="Pekerjaan telah diverifikasi dan disetujui"
                >
                  <CheckCircle :size="11" /> Sesuai
                </span>
                <span
                  v-else
                  class="lp-badge-verif badge-pending"
                  title="Menunggu cross check / review supervisor"
                >
                  <Clock :size="11" /> Menunggu Review
                </span>

                <!-- Normal / Kendala Badge -->
                <span v-if="log.kendala" class="lp-badge-warn">Ada Kendala</span>
                <span v-else class="lp-badge-ok">Lancar</span>

                <!-- Foto Count Badge -->
                <span v-if="log.fotos && log.fotos.length > 0" class="lp-badge-foto">
                  <Camera :size="11" /> {{ log.fotos.length }} Foto
                </span>
              </div>

              <!-- Action Buttons -->
              <div class="lp-card-actions">
                <button
                  type="button"
                  class="btn-crosscheck"
                  @click="openReviewModal(log)"
                  title="Cross check dan verifikasi kebenaran pekerjaan"
                >
                  <ShieldCheck :size="13" />
                  <span>Cross Check</span>
                </button>
                <button class="ft-btn-icon" title="Edit Log" @click="openEditModal(log)">
                  <Edit3 :size="13" />
                </button>
                <button class="ft-btn-icon ft-btn-del" title="Hapus Log" @click="requestDelete(log.id)">
                  <Trash2 :size="13" />
                </button>
              </div>
            </div>

            <!-- Creator Bar: Siapa user yang menambahkan log -->
            <div class="lp-creator-bar">
              <div class="lp-creator-left">
                <div class="lp-user-avatar">
                  <User :size="12" />
                </div>
                <span class="lp-creator-text">
                  Dibuat oleh: <strong>{{ log.creator?.name || 'Staf Lapangan' }}</strong>
                </span>
                <span v-if="log.creator?.role" class="lp-creator-role">
                  {{ log.creator.role }}
                </span>
                <span class="lp-created-time">
                  • {{ formatDisplayDateTime(log.created_at) }}
                </span>
              </div>
            </div>

            <!-- Aktivitas Body -->
            <p class="lp-activity">{{ log.aktivitas }}</p>

            <!-- Box Kendala Lapangan -->
            <div v-if="log.kendala" class="lp-kendala">
              <AlertTriangle :size="14" style="flex-shrink: 0; margin-top: 2px;" />
              <div>
                <strong>Kendala di Lapangan:</strong>
                <div>{{ log.kendala }}</div>
              </div>
            </div>

            <!-- Box Catatan Revisi (Jika status Perlu Revisi) -->
            <div v-if="log.status_verifikasi === 'Perlu Revisi'" class="lp-revisi-box">
              <div class="lp-revisi-header">
                <div style="display:flex; align-items:center; gap:6px;">
                  <AlertTriangle :size="15" style="color: #ef4444;" />
                  <strong>Catatan Revisi / Kesalahan Pekerjaan:</strong>
                </div>
                <span v-if="log.verified_at" class="lp-revisi-meta">
                  {{ formatDisplayDateTime(log.verified_at) }}
                </span>
              </div>
              <div class="lp-revisi-content">
                {{ log.catatan_revisi || 'Ada bagian pekerjaan yang belum sesuai spesifikasi atau standar.' }}
              </div>
              <div class="lp-revisi-footer">
                <span class="lp-revisi-by">
                  Direview oleh: <strong>{{ log.verifier?.name || 'Supervisor' }}</strong>
                  <span v-if="log.verifier?.role">({{ log.verifier.role }})</span>
                </span>
                <button type="button" class="btn-quick-edit-revisi" @click="openEditModal(log)">
                  <Edit3 :size="12" /> Perbaiki &amp; Update Log
                </button>
              </div>
            </div>

            <!-- Box Catatan Sesuai (Jika Disetujui) -->
            <div v-else-if="log.status_verifikasi === 'Sesuai' && (log.verifier || log.catatan_revisi)" class="lp-sesuai-box">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <CheckCircle :size="14" style="color: #22c55e;" />
                <span style="font-size: 12.5px; color: #86efac;">
                  Diverifikasi <strong>Sesuai Standar</strong> oleh
                  <strong>{{ log.verifier?.name || 'Supervisor' }}</strong>
                  <span v-if="log.verified_at">• {{ formatDisplayDateTime(log.verified_at) }}</span>
                </span>
              </div>
              <div v-if="log.catatan_revisi" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; padding-left: 20px;">
                "{{ log.catatan_revisi }}"
              </div>
            </div>

            <!-- ── Foto Dokumentasi Grid dengan Keterangan ── -->
            <div v-if="log.fotos && log.fotos.length > 0" style="margin-top: 14px; margin-bottom: 12px;">
              <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px; display:flex; align-items:center; gap:5px;">
                <Camera :size="12" /> Foto Dokumentasi Pekerjaan:
              </div>
              <div class="lp-foto-grid">
                <div
                  v-for="(foto, fi) in log.fotos"
                  :key="fi"
                  class="lp-foto-card"
                  @click="openLightbox(log.fotos, fi)"
                >
                  <div class="lp-foto-thumb">
                    <img :src="foto.url" :alt="foto.label || 'Foto ' + (fi+1)" />
                    <span
                      v-if="foto.label"
                      class="lp-foto-label"
                      :class="{
                        'label-before': foto.label === 'Before',
                        'label-after': foto.label === 'After',
                        'label-progres': foto.label === 'Progres',
                        'label-kendala': foto.label === 'Kendala',
                        'label-dok': foto.label === 'Dokumentasi'
                      }"
                    >
                      {{ foto.label }}
                    </span>
                  </div>
                  <!-- Keterangan per Foto (Opsional) -->
                  <div v-if="foto.keterangan" class="lp-foto-caption" :title="foto.keterangan">
                    {{ foto.keterangan }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Personel Tim Pelaksana -->
            <div v-if="log.tim && log.tim.length > 0" class="lp-tim">
              <span class="lp-tim-label">Tim Pelaksana:</span>
              <span v-for="m in log.tim" :key="m" class="lp-pill">{{ m }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Modal Tambah / Edit Log Pekerjaan ── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width: 660px;">
          <div class="modal-header">
            <div>
              <h2 style="font-size: 17px; margin: 0;">{{ editingLogId ? 'Edit Log Pekerjaan' : 'Tambah Log Pekerjaan' }}</h2>
              <span style="font-size: 12px; color: var(--text-muted);">Catat aktivitas harian, durasi kerja, dan upload foto dokumentasi</span>
            </div>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <!-- Row 1: Tanggal & Durasi -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal Pekerjaan *</label>
                <input v-model="logForm.tanggal" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Durasi Kerja (Jam) *</label>
                <div class="number-input-group">
                  <input
                    v-model.number="logForm.durasi"
                    type="number"
                    min="0.5"
                    step="0.5"
                    max="24"
                    class="form-input"
                    placeholder="8"
                  />
                  <span class="number-addon">Jam</span>
                </div>
                <!-- Quick Duration Chips -->
                <div class="quick-durasi-chips">
                  <button type="button" class="chip-durasi" :class="{ active: logForm.durasi === 4 }" @click="logForm.durasi = 4">4 Jam</button>
                  <button type="button" class="chip-durasi" :class="{ active: logForm.durasi === 8 }" @click="logForm.durasi = 8">8 Jam (Standar)</button>
                  <button type="button" class="chip-durasi" :class="{ active: logForm.durasi === 12 }" @click="logForm.durasi = 12">12 Jam (Lembur)</button>
                </div>
              </div>
            </div>

            <!-- Row 2: Aktivitas Pekerjaan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Aktivitas Pekerjaan *</label>
                <textarea
                  v-model="logForm.aktivitas"
                  class="form-textarea"
                  style="min-height: 95px;"
                  placeholder="Jelaskan secara rinci pekerjaan yang dilakukan hari ini..."
                ></textarea>
              </div>
            </div>

            <!-- Row 3: Personel Tim -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Personel Lapangan yang Terlibat</label>
                <div class="multi-select-container" @click="isUserDropdownOpen = true">
                  <div class="selected-pills">
                    <span v-for="u in logForm.tim" :key="u" class="selected-pill">
                      {{ u }}
                      <button type="button" @click.stop="removeUser(u)"><X :size="12" /></button>
                    </span>
                    <input
                      v-model="searchUserText"
                      class="multi-search-input"
                      placeholder="Ketik &amp; pilih personel..."
                      @focus="isUserDropdownOpen = true"
                      @blur="onUserInputBlur"
                      @keydown.enter.prevent="filteredUsers.length > 0 && selectUser(filteredUsers[0])"
                    />
                  </div>
                  <div v-if="isUserDropdownOpen" class="combo-dropdown" style="top: calc(100% + 4px);">
                    <ul class="combo-list">
                      <li
                        v-for="u in filteredUsers"
                        :key="u"
                        class="combo-item"
                        @mousedown.prevent="selectUser(u)"
                      >{{ u }}</li>
                      <li v-if="filteredUsers.length === 0" class="combo-empty">Tidak ada personel ditemukan</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- Row 4: Kendala Lapangan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Kendala di Lapangan (Opsional)</label>
                <textarea
                  v-model="logForm.kendala"
                  class="form-textarea"
                  style="min-height: 65px;"
                  placeholder="Kendala teknis, material kurang, cuaca, dll (kosongkan jika tidak ada)..."
                ></textarea>
              </div>
            </div>

            <!-- Row 5: Foto Dokumentasi + Keterangan Tiap Foto -->
            <div class="form-row single">
              <div class="form-field">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
                  <label class="form-label" style="display: flex; align-items: center; gap: 6px; margin: 0;">
                    <Camera :size="14" style="color: #a78bfa;" />
                    Foto Dokumentasi &amp; Keterangan (Opsional)
                  </label>
                  <span style="font-size: 11px; color: var(--text-muted);">Setiap foto bisa diberi keterangan</span>
                </div>

                <!-- Upload trigger button -->
                <label class="lp-upload-trigger">
                  <input type="file" accept="image/*" multiple @change="handleFotoUpload" style="display: none;" />
                  <ImageIcon :size="18" />
                  <span><strong>Pilih / Upload Foto</strong> (Before / After / Dokumentasi)</span>
                </label>

                <!-- List foto upload with keterangan -->
                <div v-if="logForm.fotos.length > 0" class="lp-form-foto-list">
                  <div v-for="(foto, fi) in logForm.fotos" :key="fi" class="lp-form-foto-row">
                    <!-- Thumbnail preview -->
                    <div class="lp-form-foto-thumb">
                      <img :src="foto.url" :alt="'Foto ' + (fi+1)" />
                      <button type="button" class="lp-form-foto-remove" @click="removeFoto(fi)" title="Hapus foto">
                        <X :size="12" />
                      </button>
                    </div>

                    <!-- Foto Tag & Keterangan -->
                    <div class="lp-form-foto-inputs">
                      <div style="display:flex; gap: 8px; align-items:center;">
                        <select v-model="foto.label" class="form-select lp-foto-tag-select">
                          <option v-for="lb in fotoLabels" :key="lb" :value="lb">{{ lb }}</option>
                        </select>
                        <span style="font-size: 11px; color: var(--text-muted);">Foto #{{ fi + 1 }}</span>
                      </div>
                      <input
                        v-model="foto.keterangan"
                        type="text"
                        class="form-input lp-foto-keterangan-input"
                        placeholder="Keterangan foto ini (opsional, misal: Pemasangan pipa lantai 2)..."
                      />
                    </div>
                  </div>
                </div>
                <div v-else class="lp-form-no-foto">
                  Belum ada foto ditambahkan. Klik tombol di atas untuk upload.
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal" :disabled="saving">Batal</button>
            <button class="btn-primary btn-half" @click="submitLog" :disabled="saving">
              {{ saving ? 'Menyimpan...' : (editingLogId ? 'Simpan Perubahan' : 'Simpan Log Pekerjaan') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Cross Check / Verifikasi (Sesuai / Revisi) ── -->
    <Teleport to="body">
      <div v-if="showReviewModal" class="modal-overlay" @click.self="closeReviewModal">
        <div class="modal-box" style="max-width: 540px;">
          <div class="modal-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <ShieldCheck :size="18" style="color: var(--accent-orange);" />
              <div>
                <h2 style="font-size: 16px; margin: 0;">Cross Check Hasil Pekerjaan</h2>
                <span style="font-size: 11.5px; color: var(--text-muted);">Verifikasi apakah pekerjaan sudah benar atau perlu perbaikan</span>
              </div>
            </div>
            <button class="modal-close" @click="closeReviewModal"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Mini summary of target log -->
            <div class="lp-review-preview" v-if="reviewingLog">
              <div style="display:flex; justify-content:space-between; margin-bottom: 4px; font-size: 12px;">
                <span style="color: var(--text-muted);">Tanggal: <strong>{{ formatDisplayDate(reviewingLog.tanggal) }}</strong> ({{ reviewingLog.durasi || 8 }} Jam)</span>
                <span style="color: var(--text-muted);">Oleh: <strong>{{ reviewingLog.creator?.name || 'Staf Lapangan' }}</strong></span>
              </div>
              <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.4;">
                "{{ reviewingLog.aktivitas }}"
              </div>
            </div>

            <!-- Status Selector Segment -->
            <label class="form-label" style="margin-bottom: 8px;">Pilih Status Cross Check:</label>
            <div class="review-status-selector">
              <!-- Sesuai -->
              <div
                class="review-choice-card choice-sesuai"
                :class="{ active: reviewForm.status_verifikasi === 'Sesuai' }"
                @click="reviewForm.status_verifikasi = 'Sesuai'"
              >
                <div class="choice-radio">
                  <div v-if="reviewForm.status_verifikasi === 'Sesuai'" class="choice-radio-inner"></div>
                </div>
                <div class="choice-body">
                  <div class="choice-title" style="color: #4ade80;">
                    <CheckCircle :size="14" /> ✓ Pekerjaan Sesuai (Disetujui)
                  </div>
                  <div class="choice-desc">Pekerjaan telah diperiksa, hasil tepat, rapi, dan sesuai spesifikasi.</div>
                </div>
              </div>

              <!-- Perlu Revisi -->
              <div
                class="review-choice-card choice-revisi"
                :class="{ active: reviewForm.status_verifikasi === 'Perlu Revisi' }"
                @click="reviewForm.status_verifikasi = 'Perlu Revisi'"
              >
                <div class="choice-radio">
                  <div v-if="reviewForm.status_verifikasi === 'Perlu Revisi'" class="choice-radio-inner radio-red"></div>
                </div>
                <div class="choice-body">
                  <div class="choice-title" style="color: #f87171;">
                    <AlertTriangle :size="14" /> ⚠️ Perlu Revisi (Ada Kesalahan)
                  </div>
                  <div class="choice-desc">Ditemukan kekurangan/kesalahan yang harus diperbaiki oleh teknisi.</div>
                </div>
              </div>

              <!-- Reset / Menunggu Review -->
              <div
                class="review-choice-card choice-pending"
                :class="{ active: reviewForm.status_verifikasi === 'Menunggu Review' }"
                @click="reviewForm.status_verifikasi = 'Menunggu Review'"
              >
                <div class="choice-radio">
                  <div v-if="reviewForm.status_verifikasi === 'Menunggu Review'" class="choice-radio-inner radio-amber"></div>
                </div>
                <div class="choice-body">
                  <div class="choice-title" style="color: #fbbf24;">
                    <Clock :size="14" /> ⏳ Reset ke Menunggu Review
                  </div>
                  <div class="choice-desc">Kembalikan ke status awal (belum diperiksa).</div>
                </div>
              </div>
            </div>

            <!-- Komentar / Catatan Revisi Field -->
            <div class="form-row single" style="margin-top: 14px;">
              <div class="form-field">
                <label class="form-label" style="display:flex; justify-content:space-between;">
                  <span>
                    {{ reviewForm.status_verifikasi === 'Perlu Revisi' ? 'Komentar / Catatan Revisi *' : 'Catatan Verifikasi (Opsional)' }}
                  </span>
                  <span v-if="reviewForm.status_verifikasi === 'Perlu Revisi'" style="color: #ef4444; font-size: 11px;">
                    Wajib diisi jika minta revisi
                  </span>
                </label>
                <textarea
                  v-model="reviewForm.catatan_revisi"
                  class="form-textarea"
                  style="min-height: 90px;"
                  :placeholder="reviewForm.status_verifikasi === 'Perlu Revisi'
                    ? 'Jelaskan apa yang salah dan apa yang harus diperbaiki teknisi (misal: kabel belum dirapikan di tray, foto panel belum ada)...'
                    : 'Catatan apresiasi atau instruksi lanjutan (opsional)...'"
                ></textarea>
              </div>
            </div>

          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeReviewModal" :disabled="savingReview">Batal</button>
            <button
              class="btn-primary btn-half"
              :class="{ 'btn-save-revisi': reviewForm.status_verifikasi === 'Perlu Revisi' }"
              @click="submitReview"
              :disabled="savingReview"
            >
              {{ savingReview ? 'Menyimpan...' : (reviewForm.status_verifikasi === 'Perlu Revisi' ? 'Kirim Permintaan Revisi' : 'Simpan Verifikasi') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Konfirmasi Hapus ── -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="closeDeleteModal">
        <div class="modal-box" style="max-width: 400px; text-align: center; padding-top: 32px;">
          <div style="margin-bottom: 20px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239,68,68,0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
              <Trash2 :size="32" />
            </div>
          </div>
          <h2 style="margin-bottom: 12px; font-size: 18px; color: var(--text-primary);">Hapus Log Pekerjaan</h2>
          <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 28px; line-height: 1.6; padding: 0 10px;">
            Apakah Anda yakin ingin menghapus log pekerjaan ini? Data dan foto terkait akan dihapus permanen.
          </p>
          <div class="modal-footer modal-footer-split" style="border-top: none; padding: 0;">
            <button class="btn-ghost btn-half" @click="closeDeleteModal">Batal</button>
            <button class="btn-primary btn-half" style="background: #ef4444; border-color: #ef4444;" @click="confirmDelete">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Lightbox Foto & Keterangan ── -->
    <Teleport to="body">
      <div v-if="showLightbox" class="lp-lightbox" @click.self="showLightbox = false">
        <button class="lp-lightbox-close" @click="showLightbox = false"><X :size="24" /></button>

        <button
          v-if="lightboxIndex > 0"
          class="lp-lightbox-nav lp-lightbox-prev"
          @click="lightboxPrev"
        >
          <ChevronLeft :size="28" />
        </button>

        <div class="lp-lightbox-content">
          <img :src="lightboxFotos[lightboxIndex].url" :alt="lightboxFotos[lightboxIndex].label || 'Foto'" />
          
          <!-- Lightbox Caption & Info -->
          <div class="lp-lightbox-info-box">
            <div style="display:flex; align-items:center; justify-content:center; gap: 8px;">
              <span
                v-if="lightboxFotos[lightboxIndex].label"
                class="lp-lightbox-label"
                :class="{
                  'label-before': lightboxFotos[lightboxIndex].label === 'Before',
                  'label-after': lightboxFotos[lightboxIndex].label === 'After',
                  'label-progres': lightboxFotos[lightboxIndex].label === 'Progres',
                  'label-kendala': lightboxFotos[lightboxIndex].label === 'Kendala',
                  'label-dok': lightboxFotos[lightboxIndex].label === 'Dokumentasi'
                }"
              >
                {{ lightboxFotos[lightboxIndex].label }}
              </span>
              <span class="lp-lightbox-counter">
                Foto {{ lightboxIndex + 1 }} dari {{ lightboxFotos.length }}
              </span>
            </div>

            <!-- Keterangan detail foto -->
            <div v-if="lightboxFotos[lightboxIndex].keterangan" class="lp-lightbox-keterangan">
              {{ lightboxFotos[lightboxIndex].keterangan }}
            </div>
          </div>
        </div>

        <button
          v-if="lightboxIndex < lightboxFotos.length - 1"
          class="lp-lightbox-nav lp-lightbox-next"
          @click="lightboxNext"
        >
          <ChevronRight :size="28" />
        </button>
      </div>
    </Teleport>

  </AdminLayout>
</template>

<style scoped>
/* ── Spin animation ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { animation: spin 1s linear infinite; }

/* ── Stats ── */
.lp-stats {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 860px) {
  .lp-stats { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 560px) {
  .lp-stats { grid-template-columns: repeat(2, 1fr); }
}
.lp-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  transition: transform 0.15s, border-color 0.15s;
}
.lp-stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.18);
}
.lp-stat-num {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: monospace;
  line-height: 1.1;
}
.lp-stat-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 5px;
  letter-spacing: 0.02em;
}
.stat-revisi.has-revisi {
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.06);
}

/* ── Filter Tabs ── */
.lp-filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.filter-tab {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.filter-tab:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
.filter-tab.active {
  background: var(--accent-orange);
  color: #fff;
  border-color: var(--accent-orange);
  font-weight: 600;
}
.filter-tab.tab-revisi.active {
  background: #ef4444;
  border-color: #ef4444;
}
.filter-tab.tab-sesuai.active {
  background: #22c55e;
  border-color: #22c55e;
}
.filter-tab.tab-pending.active {
  background: #f59e0b;
  border-color: #f59e0b;
  color: #000;
}

/* ── Empty ── */
.lp-empty {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: 12px;
}

/* ── Timeline ── */
.lp-timeline { display: flex; flex-direction: column; gap: 0; }
.lp-item {
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
  position: relative;
}
.lp-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 36px;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
}
.lp-dot {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}
.lp-dot-sesuai {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
  border: 2px solid rgba(34,197,94,0.4);
}
.lp-dot-revisi {
  background: rgba(239,68,68,0.18);
  color: #ef4444;
  border: 2px solid rgba(239,68,68,0.45);
  box-shadow: 0 0 12px rgba(239,68,68,0.25);
}
.lp-dot-pending {
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  border: 2px solid rgba(245,158,11,0.35);
}

.lp-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.lp-card:hover {
  border-color: rgba(255, 255, 255, 0.18);
}
.card-is-revisi {
  border-left: 4px solid #ef4444 !important;
}
.card-is-sesuai {
  border-left: 4px solid #22c55e !important;
}

.lp-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 10px;
}
.lp-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.lp-date { font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
.lp-dur {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  background: rgba(255,255,255,0.04);
  padding: 2px 7px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

/* ── Badges ── */
.lp-badge-verif {
  font-size: 11.5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.badge-sesuai {
  background: rgba(34,197,94,0.15);
  color: #4ade80;
  border: 1px solid rgba(34,197,94,0.35);
}
.badge-revisi {
  background: rgba(239,68,68,0.18);
  color: #f87171;
  border: 1px solid rgba(239,68,68,0.35);
}
.badge-pending {
  background: rgba(245,158,11,0.15);
  color: #fbbf24;
  border: 1px solid rgba(245,158,11,0.35);
}

.lp-badge-ok {
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: rgba(34,197,94,0.1); color: #22c55e;
  border: 1px solid rgba(34,197,94,0.2);
}
.lp-badge-warn {
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: rgba(245,158,11,0.1); color: var(--accent-orange);
  border: 1px solid rgba(245,158,11,0.2);
}
.lp-badge-foto {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: rgba(167,139,250,0.12); color: #c084fc;
  border: 1px solid rgba(167,139,250,0.25);
}

/* ── Action Buttons ── */
.lp-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-crosscheck {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-crosscheck:hover {
  background: rgba(99, 102, 241, 0.25);
  color: #e0e7ff;
  border-color: #818cf8;
}

/* ── Creator Row ── */
.lp-creator-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.lp-creator-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-muted);
}
.lp-user-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.lp-creator-text strong {
  color: var(--text-primary);
  font-weight: 600;
}
.lp-creator-role {
  font-size: 10.5px;
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}
.lp-created-time {
  font-size: 11.5px;
  color: var(--text-muted);
}

.lp-activity {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 10px;
  white-space: pre-line;
}

.lp-kendala {
  background: rgba(245,158,11,0.07);
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  color: var(--accent-orange);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  line-height: 1.5;
}

/* ── Revisi & Sesuai Banner Boxes ── */
.lp-revisi-box {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
}
.lp-revisi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12.5px;
  color: #f87171;
}
.lp-revisi-meta {
  font-size: 11px;
  color: rgba(248, 113, 113, 0.8);
}
.lp-revisi-content {
  font-size: 13px;
  color: #fecaca;
  line-height: 1.5;
  background: rgba(0, 0, 0, 0.2);
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
}
.lp-revisi-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: var(--text-muted);
  flex-wrap: wrap;
  gap: 8px;
}
.lp-revisi-by strong {
  color: var(--text-secondary);
}
.btn-quick-edit-revisi {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.4);
  font-size: 11.5px;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}
.btn-quick-edit-revisi:hover {
  background: rgba(239, 68, 68, 0.35);
  color: #fff;
}

.lp-sesuai-box {
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 8px;
  padding: 9px 12px;
  margin-bottom: 12px;
}

/* ── Foto Grid & Cards (Timeline Card) ── */
.lp-foto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
}
.lp-foto-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
}
.lp-foto-card:hover {
  transform: translateY(-2px);
  border-color: #a78bfa;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}
.lp-foto-thumb {
  position: relative;
  width: 100%;
  height: 88px;
  background: #000;
}
.lp-foto-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lp-foto-label {
  position: absolute;
  top: 5px;
  left: 5px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.label-before { background: rgba(239,68,68,0.85); color: #fff; }
.label-after  { background: rgba(34,197,94,0.85); color: #fff; }
.label-progres{ background: rgba(59,130,246,0.85); color: #fff; }
.label-kendala{ background: rgba(245,158,11,0.85); color: #fff; }
.label-dok    { background: rgba(147,51,234,0.85); color: #fff; }

.lp-foto-caption {
  padding: 6px 8px;
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.35;
  background: var(--bg-card);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Tim Pelaksana ── */
.lp-tim {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}
.lp-tim-label { color: var(--text-muted); font-size: 12px; }
.lp-pill {
  background: rgba(255,255,255,0.06);
  color: var(--text-secondary);
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

/* ── Form Modal Duration Input Group ── */
.number-input-group {
  position: relative;
  display: flex;
  align-items: center;
}
.number-addon {
  position: absolute;
  right: 12px;
  font-size: 12.5px;
  color: var(--text-muted);
  pointer-events: none;
  font-weight: 500;
}
.quick-durasi-chips {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}
.chip-durasi {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.chip-durasi:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
.chip-durasi.active {
  background: var(--accent-orange);
  color: #fff;
  border-color: var(--accent-orange);
}

/* ── Form Modal Upload Trigger & List ── */
.lp-upload-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1.5px dashed var(--border-color);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.02);
}
.lp-upload-trigger:hover {
  border-color: #a78bfa;
  color: #a78bfa;
  background: rgba(167,139,250,0.05);
}
.lp-form-foto-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
  max-height: 250px;
  overflow-y: auto;
  padding-right: 4px;
}
.lp-form-foto-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
}
.lp-form-foto-thumb {
  position: relative;
  width: 76px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}
.lp-form-foto-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lp-form-foto-remove {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  background: rgba(0,0,0,0.7);
  color: #fff;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.lp-form-foto-remove:hover { background: #ef4444; }
.lp-form-foto-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lp-foto-tag-select {
  width: 130px;
  font-size: 11.5px;
  padding: 4px 8px;
}
.lp-foto-keterangan-input {
  font-size: 12px;
  padding: 5px 8px;
}
.lp-form-no-foto {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  padding: 10px 0;
}

/* ── Cross Check Review Modal Styles ── */
.lp-review-preview {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
}
.review-status-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.review-choice-card {
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1.5px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition: all 0.15s;
}
.review-choice-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.2);
}
.choice-radio {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  margin-top: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.choice-radio-inner {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #22c55e;
}
.choice-radio-inner.radio-red { background: #ef4444; }
.choice-radio-inner.radio-amber { background: #f59e0b; }

.review-choice-card.active.choice-sesuai {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}
.review-choice-card.active.choice-sesuai .choice-radio {
  border-color: #22c55e;
}
.review-choice-card.active.choice-revisi {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
.review-choice-card.active.choice-revisi .choice-radio {
  border-color: #ef4444;
}
.review-choice-card.active.choice-pending {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.08);
}
.review-choice-card.active.choice-pending .choice-radio {
  border-color: #f59e0b;
}

.choice-body { flex: 1; }
.choice-title {
  font-size: 13.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.choice-desc {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.35;
}
.btn-save-revisi {
  background: #ef4444 !important;
  border-color: #ef4444 !important;
}

/* ── Lightbox ── */
.lp-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.94);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lp-lightbox-close {
  position: absolute;
  top: 20px; right: 20px;
  background: rgba(255,255,255,0.1);
  border: none; color: #fff;
  width: 44px; height: 44px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.lp-lightbox-close:hover { background: rgba(255,255,255,0.25); }
.lp-lightbox-nav {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,0.1);
  border: none; color: #fff;
  width: 50px; height: 50px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
  z-index: 1;
}
.lp-lightbox-nav:hover { background: rgba(255,255,255,0.25); }
.lp-lightbox-prev { left: 24px; }
.lp-lightbox-next { right: 24px; }

.lp-lightbox-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 90vw;
}
.lp-lightbox-content img {
  max-width: 85vw;
  max-height: 75vh;
  border-radius: 10px;
  object-fit: contain;
  box-shadow: 0 8px 40px rgba(0,0,0,0.6);
}
.lp-lightbox-info-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: 600px;
  text-align: center;
}
.lp-lightbox-label {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}
.lp-lightbox-counter {
  color: var(--text-muted);
  font-size: 12px;
}
.lp-lightbox-keterangan {
  color: #fff;
  font-size: 13.5px;
  line-height: 1.4;
  background: rgba(255,255,255,0.08);
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
