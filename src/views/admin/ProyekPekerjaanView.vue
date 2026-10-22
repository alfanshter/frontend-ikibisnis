<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { ArrowLeft, Plus, Clock, CheckCircle, AlertTriangle, X, Edit3, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Camera, AlertCircle, RefreshCw } from '@lucide/vue'
import {
  proyeksApi,
  logPekerjaanApi,
  proyekTimApi,
  usersApi,
  type ProyekResponse,
  type LogPekerjaanResponse,
  type LogPekerjaanPayload,
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

const sortedLogs = computed(() => [...logs.value].sort((a, b) => b.tanggal.localeCompare(a.tanggal)))

// ── Modal ──
const showModal = ref(false)
const editingLogId = ref<number | null>(null)

interface FormFoto { url: string; label: string; isNew?: boolean; file?: File, id?: number }
const logForm = ref({
  tanggal: '',
  aktivitas: '',
  tim: [] as string[],
  durasi: '8 jam',
  kendala: '',
  fotos: [] as FormFoto[],
})

// Multi-select state
const searchUserText = ref('')
const isUserDropdownOpen = ref(false)

const allMembers = computed(() => {
  // Combine proyek team and all users from system
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

// ── Foto upload ──
const fotoLabels = ['', 'Before', 'After', 'Dokumentasi']

const handleFotoUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target.files) return
  Array.from(target.files).forEach(file => {
    logForm.value.fotos.push({
      url: URL.createObjectURL(file),
      label: 'Dokumentasi',
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
const lightboxFotos = ref<{ url: string; label: string | null }[]>([])
const lightboxIndex = ref(0)

const openLightbox = (fotos: any[], startIdx: number) => {
  lightboxFotos.value = fotos.map(f => ({ url: f.url, label: f.label }))
  lightboxIndex.value = startIdx
  showLightbox.value = true
}

const lightboxPrev = () => { if (lightboxIndex.value > 0) lightboxIndex.value-- }
const lightboxNext = () => { if (lightboxIndex.value < lightboxFotos.value.length - 1) lightboxIndex.value++ }

// ── Modal open/close ──
const openModal = () => {
  editingLogId.value = null
  logForm.value = {
    tanggal: new Date().toISOString().slice(0, 10),
    aktivitas: '', tim: [], durasi: '8 jam', kendala: '', fotos: []
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
    durasi: log.durasi ? log.durasi + ' jam' : '',
    kendala: log.kendala || '',
    fotos: log.fotos?.map(f => ({ url: f.url, label: f.label || '', id: f.id })) || [],
  }
  searchUserText.value = ''
  isUserDropdownOpen.value = false
  showModal.value = true
}

const closeModal = () => { showModal.value = false; editingLogId.value = null }

const submitLog = async () => {
  if (!logForm.value.aktivitas.trim()) return
  saving.value = true

  const durasiNum = parseInt(logForm.value.durasi) || 8

  try {
    const payload = new FormData()
    payload.append('tanggal', logForm.value.tanggal)
    payload.append('aktivitas', logForm.value.aktivitas)
    logForm.value.tim.forEach((t, i) => payload.append(`tim[${i}]`, t))
    payload.append('durasi', durasiNum.toString())
    if (logForm.value.kendala) payload.append('kendala', logForm.value.kendala)

    // Existing fotos (keep them or update label)
    const existingFotos = logForm.value.fotos.filter(f => !f.isNew && f.id)
    existingFotos.forEach((f, i) => {
      payload.append(`existing_fotos[${i}][id]`, f.id!.toString())
      if (f.label) payload.append(`existing_fotos[${i}][label]`, f.label)
    })

    // New fotos (upload file)
    const newFotos = logForm.value.fotos.filter(f => f.isNew && f.file)
    newFotos.forEach((f, i) => {
      payload.append(`new_fotos[${i}]`, f.file as Blob)
      if (f.label) payload.append(`new_foto_keterangans[${i}]`, f.label)
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

// ── Delete ──
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

const goBack = () => router.push(`/admin/proyek/${proyekId}`)

const normalCount = computed(() => logs.value.filter(l => !l.kendala).length)
const kendalaCount = computed(() => logs.value.filter(l => !!l.kendala).length)
const totalDurasi = computed(() => logs.value.reduce((s, l) => s + (Number(l.durasi) || 0), 0))
const totalFotos = computed(() => logs.value.reduce((s, l) => s + (l.fotos?.length || 0), 0))
</script>

<template>
  <AdminLayout>
    <div style="max-width: 860px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Header ── -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button class="btn-ghost" style="padding: 8px; border-radius: 8px;" @click="goBack">
            <ArrowLeft :size="20" />
          </button>
          <div v-if="loading" style="display:flex; align-items:center; gap:10px; color:var(--text-muted);">
            <RefreshCw :size="16" class="spin-icon" /> Memuat data...
          </div>
          <div v-else-if="error" style="color:#ef4444; display:flex; align-items:center; gap:8px;">
            <AlertCircle :size="16" /> {{ error }}
          </div>
          <div v-else>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.06em;">
              {{ proyek?.kode }} · Log Pekerjaan
            </div>
            <h1 style="font-size: 20px; color: var(--text-primary); margin: 0; font-weight: 700;">{{ proyek?.nama }}</h1>
          </div>
        </div>
        <button class="btn-primary" @click="openModal">
          <Plus :size="14" style="margin-right: 6px;" /> Tambah Log
        </button>
      </div>

      <!-- ── Summary stats ── -->
      <div class="lp-stats">
        <div class="lp-stat-card">
          <div class="lp-stat-num">{{ logs.length }}</div>
          <div class="lp-stat-label">Total Log</div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-num" style="color: #22c55e;">{{ normalCount }}</div>
          <div class="lp-stat-label">Normal</div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-num" style="color: var(--accent-orange);">{{ kendalaCount }}</div>
          <div class="lp-stat-label">Ada Kendala</div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-num" style="color: #3b82f6;">{{ totalDurasi }} jam</div>
          <div class="lp-stat-label">Total Jam Kerja</div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-num" style="color: #a78bfa;">{{ totalFotos }}</div>
          <div class="lp-stat-label">Foto Dokumentasi</div>
        </div>
      </div>

      <!-- ── Log Timeline ── -->
      <div v-if="sortedLogs.length === 0" class="lp-empty">
        <Clock :size="36" style="color: var(--text-muted); margin-bottom: 10px;" />
        <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 12px;">Belum ada log pekerjaan untuk proyek ini.</div>
        <button class="btn-primary" @click="openModal">
          <Plus :size="14" style="margin-right: 6px;" /> Catat Aktivitas Pertama
        </button>
      </div>

      <div v-else class="lp-timeline">
        <div v-for="log in sortedLogs" :key="log.id" class="lp-item">
          <!-- Dot -->
          <div class="lp-dot" :class="log.kendala ? 'lp-dot-warn' : 'lp-dot-ok'">
            <AlertTriangle v-if="log.kendala" :size="11" />
            <CheckCircle v-else :size="11" />
          </div>
          <!-- Card -->
          <div class="lp-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div class="lp-card-meta" style="margin-bottom: 0;">
                <span class="lp-date">{{ log.tanggal }}</span>
                <span class="lp-dur"><Clock :size="12" /> {{ log.durasi || 8 }} jam</span>
                <span v-if="log.kendala" class="lp-badge-warn">Ada Kendala</span>
                <span v-else class="lp-badge-ok">Normal</span>
                <span v-if="log.fotos && log.fotos.length > 0" class="lp-badge-foto">
                  <Camera :size="11" /> {{ log.fotos.length }} Foto
                </span>
              </div>
              <div style="display: flex; gap: 6px;">
                <button class="ft-btn-icon" title="Edit" @click="openEditModal(log)">
                  <Edit3 :size="12" />
                </button>
                <button class="ft-btn-icon ft-btn-del" title="Hapus" @click="requestDelete(log.id)">
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
            <p class="lp-activity">{{ log.aktivitas }}</p>
            <div v-if="log.kendala" class="lp-kendala">
              <AlertTriangle :size="12" />
              <span><strong>Kendala:</strong> {{ log.kendala }}</span>
            </div>

            <!-- ── Foto Grid ── -->
            <div v-if="log.fotos && log.fotos.length > 0" class="lp-foto-grid">
              <div
                v-for="(foto, fi) in log.fotos"
                :key="fi"
                class="lp-foto-thumb"
                @click="openLightbox(log.fotos, fi)"
              >
                <img :src="foto.url" :alt="foto.label || 'Foto'" />
                <div v-if="foto.label" class="lp-foto-label" :class="{
                  'label-before': foto.label === 'Before',
                  'label-after': foto.label === 'After',
                  'label-dok': foto.label === 'Dokumentasi'
                }">{{ foto.label }}</div>
              </div>
            </div>

            <div class="lp-tim" v-if="log.tim && log.tim.length > 0">
              <span class="lp-tim-label">Tim:</span>
              <span v-for="m in log.tim" :key="m" class="lp-pill">{{ m }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Modal Tambah/Edit Log ── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width: 600px;">
          <div class="modal-header">
            <h2>{{ editingLogId ? 'Edit Log Pekerjaan' : 'Tambah Log Pekerjaan' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal</label>
                <input v-model="logForm.tanggal" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Durasi</label>
                <input v-model="logForm.durasi" class="form-input" placeholder="8 jam" />
              </div>
            </div>
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Aktivitas Pekerjaan *</label>
                <textarea v-model="logForm.aktivitas" class="form-textarea" style="min-height: 90px;" placeholder="Deskripsi aktivitas hari ini..."></textarea>
              </div>
            </div>
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Personel</label>
                <div class="multi-select-container" @click="isUserDropdownOpen = true">
                  <div class="selected-pills">
                    <span v-for="u in logForm.tim" :key="u" class="selected-pill">
                      {{ u }}
                      <button type="button" @click.stop="removeUser(u)"><X :size="12" /></button>
                    </span>
                    <input
                      v-model="searchUserText"
                      class="multi-search-input"
                      placeholder="Cari dan pilih user..."
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
                      <li v-if="filteredUsers.length === 0" class="combo-empty">Tidak ada user ditemukan</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Kendala (opsional)</label>
                <textarea v-model="logForm.kendala" class="form-textarea" placeholder="Kendala yang ditemukan di lapangan..."></textarea>
              </div>
            </div>

            <!-- ── Foto Upload ── -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label" style="display: flex; align-items: center; gap: 6px;">
                  <Camera :size="14" style="color: #a78bfa;" />
                  Foto Dokumentasi (Opsional)
                </label>

                <!-- Upload trigger -->
                <label class="lp-upload-trigger">
                  <input type="file" accept="image/*" multiple @change="handleFotoUpload" style="display: none;" />
                  <ImageIcon :size="16" />
                  <span>Upload Foto (Before / After / Dokumentasi)</span>
                </label>

                <!-- Preview grid -->
                <div v-if="logForm.fotos.length > 0" class="lp-form-foto-grid">
                  <div v-for="(foto, fi) in logForm.fotos" :key="fi" class="lp-form-foto-item">
                    <img :src="foto.url" :alt="'Foto ' + (fi+1)" />
                    <button class="lp-form-foto-remove" @click="removeFoto(fi)" title="Hapus foto">
                      <X :size="12" />
                    </button>
                    <select v-model="foto.label" class="lp-form-foto-label-select">
                      <option v-for="lb in fotoLabels" :key="lb" :value="lb">{{ lb || '— Label —' }}</option>
                    </select>
                  </div>
                </div>
                <div v-else style="font-size: 12px; color: var(--text-muted); margin-top: 6px; text-align: center; padding: 8px 0;">
                  Belum ada foto ditambahkan
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal">Batal</button>
            <button class="btn-primary btn-half" @click="submitLog">{{ editingLogId ? 'Simpan Perubahan' : 'Simpan Log' }}</button>
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
            Apakah Anda yakin ingin menghapus log pekerjaan ini? Data tidak dapat dikembalikan.
          </p>
          <div class="modal-footer modal-footer-split" style="border-top: none; padding: 0;">
            <button class="btn-ghost btn-half" @click="closeDeleteModal">Batal</button>
            <button class="btn-primary btn-half" style="background: #ef4444; border-color: #ef4444;" @click="confirmDelete">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Lightbox ── -->
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
          <div v-if="lightboxFotos[lightboxIndex].label" class="lp-lightbox-label" :class="{
            'label-before': lightboxFotos[lightboxIndex].label === 'Before',
            'label-after': lightboxFotos[lightboxIndex].label === 'After',
            'label-dok': lightboxFotos[lightboxIndex].label === 'Dokumentasi'
          }">
            {{ lightboxFotos[lightboxIndex].label }}
          </div>
          <div class="lp-lightbox-counter">{{ lightboxIndex + 1 }} / {{ lightboxFotos.length }}</div>
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

/* Stats */
.lp-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}
@media (max-width: 700px) { .lp-stats { grid-template-columns: repeat(2, 1fr); } }
.lp-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}
.lp-stat-num {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: monospace;
}
.lp-stat-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Empty */
.lp-empty {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Timeline */
.lp-timeline { display: flex; flex-direction: column; gap: 0; }
.lp-item {
  display: flex;
  gap: 16px;
  padding-bottom: 20px;
  position: relative;
}
.lp-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
}
.lp-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
}
.lp-dot-ok {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
  border: 2px solid rgba(34,197,94,0.3);
}
.lp-dot-warn {
  background: rgba(245,158,11,0.15);
  color: var(--accent-orange);
  border: 2px solid rgba(245,158,11,0.3);
}
.lp-card {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 18px;
}
.lp-card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.lp-date { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.lp-dur {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
.lp-badge-ok {
  font-size: 11px; padding: 2px 9px; border-radius: 20px;
  background: rgba(34,197,94,0.1); color: #22c55e;
  border: 1px solid rgba(34,197,94,0.2);
}
.lp-badge-warn {
  font-size: 11px; padding: 2px 9px; border-radius: 20px;
  background: rgba(245,158,11,0.1); color: var(--accent-orange);
  border: 1px solid rgba(245,158,11,0.2);
}
.lp-badge-foto {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 2px 9px; border-radius: 20px;
  background: rgba(167,139,250,0.1); color: #a78bfa;
  border: 1px solid rgba(167,139,250,0.25);
}
.lp-activity {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 10px;
}
.lp-kendala {
  background: rgba(245,158,11,0.07);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
  color: var(--accent-orange);
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 10px;
  line-height: 1.5;
}
.lp-tim {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.lp-tim-label { color: var(--text-muted); font-size: 12px; }
.lp-pill {
  background: rgba(255,255,255,0.06);
  color: var(--text-secondary);
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
}

/* ── Foto grid (timeline card) ── */
.lp-foto-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.lp-foto-thumb {
  position: relative;
  width: 90px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border-color);
  transition: transform 0.15s, box-shadow 0.15s;
}
.lp-foto-thumb:hover { transform: scale(1.04); box-shadow: 0 4px 16px rgba(0,0,0,0.4); }
.lp-foto-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.lp-foto-label {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  font-size: 10px;
  font-weight: 700;
  text-align: center;
  padding: 2px 4px;
  letter-spacing: 0.04em;
}
.label-before { background: rgba(239,68,68,0.75); color: #fff; }
.label-after  { background: rgba(34,197,94,0.75); color: #fff; }
.label-dok    { background: rgba(59,130,246,0.75); color: #fff; }

/* ── Upload trigger ── */
.lp-upload-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px dashed var(--border-color);
  border-radius: 8px;
  padding: 10px 16px;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 6px;
}
.lp-upload-trigger:hover {
  border-color: #a78bfa;
  color: #a78bfa;
  background: rgba(167,139,250,0.05);
}

/* ── Form foto preview grid ── */
.lp-form-foto-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}
.lp-form-foto-item {
  position: relative;
  width: 100px;
  flex-shrink: 0;
}
.lp-form-foto-item img {
  width: 100px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  display: block;
}
.lp-form-foto-remove {
  position: absolute;
  top: 4px; right: 4px;
  width: 20px; height: 20px;
  background: rgba(0,0,0,0.65);
  color: #fff;
  border: none;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.lp-form-foto-remove:hover { background: #ef4444; }
.lp-form-foto-label-select {
  width: 100%;
  margin-top: 5px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
}
.lp-form-foto-label-select:focus { border-color: #a78bfa; }

/* ── Lightbox ── */
.lp-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.92);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lp-lightbox-close {
  position: absolute;
  top: 20px; right: 20px;
  background: rgba(255,255,255,0.1);
  border: none;
  color: #fff;
  width: 44px; height: 44px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: background 0.15s;
}
.lp-lightbox-close:hover { background: rgba(255,255,255,0.2); }
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
.lp-lightbox-nav:hover { background: rgba(255,255,255,0.2); }
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
  max-height: 80vh;
  border-radius: 10px;
  object-fit: contain;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
}
.lp-lightbox-label {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 16px;
  border-radius: 20px;
  letter-spacing: 0.05em;
}
.lp-lightbox-counter {
  font-size: 12px;
  color: rgba(255,255,255,0.5);
}

/* Multi-select */
.multi-select-container { position: relative; width: 100%; }
.selected-pills {
  display: flex; flex-wrap: wrap; gap: 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 12px;
  min-height: 42px;
  cursor: text;
  transition: all 0.2s;
}
.selected-pills:focus-within {
  border-color: var(--accent-orange);
  background: rgba(255,255,255,0.02);
}
.selected-pill {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(245,158,11,0.15); color: var(--accent-orange);
  font-size: 12px; padding: 4px 10px; border-radius: 20px;
  border: 1px solid rgba(245,158,11,0.3);
}
.selected-pill button {
  background: transparent; border: none; color: inherit;
  padding: 0; margin: 0; cursor: pointer; display: flex; align-items: center; opacity: 0.7;
}
.selected-pill button:hover { opacity: 1; }
.multi-search-input {
  flex: 1; min-width: 120px; background: transparent; border: none;
  color: var(--text-primary); font-size: 14px; outline: none; padding: 4px 0;
}

/* Action Buttons */
.ft-btn-icon {
  background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 5px 7px; color: var(--text-muted);
  cursor: pointer; display: flex; align-items: center; transition: all 0.15s;
}
.ft-btn-icon:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.ft-btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }
</style>
