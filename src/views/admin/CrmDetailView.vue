<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as AdminLayoutModule from '../../layouts/AdminLayout.vue'
import {
  User, Pencil, Rocket, MessageSquare, Mail, Share2,
  UserCircle, CheckCircle2, FileText, Calendar, LogIn,
  Video, Sliders, Gauge, MapPin, Building2, ChevronRight, Plus, X, Save, ExternalLink,
  ClipboardList, Activity, Clock, FileBadge2, Repeat, Shield, Globe, Users, Trash2
} from '@lucide/vue'
import WhatsAppIcon from '@/components/WhatsAppIcon.vue'
import { getWaLink } from '@/utils/whatsapp'
import {
  leadsApi,
  leadActivitiesApi,
  usersApi,
  rolesApi,
  auditLogsApi,
  proyeksApi,
  type LeadResponse,
  type LeadActivityResponse,
  type UserResponse,
  type RoleResponse,
  type AuditLogResponse,
  type LeadStatus,
  type LeadSumber,
} from '../../services/api'

const AdminLayout = (AdminLayoutModule as unknown as { default: Component }).default

const route = useRoute()
const router = useRouter()
const leadId = Number(route.params.id)

// ─── State ────────────────────────────────────────────────────────────────────
const lead       = ref<LeadResponse | null>(null)
const activities = ref<LeadActivityResponse[]>([])
const loading    = ref(true)
const error      = ref<string | null>(null)
const usersList  = ref<UserResponse[]>([])
const auditLogs  = ref<AuditLogResponse[]>([])

// Editing state
const isEditing  = ref(false)
const saving     = ref(false)
const saveError  = ref<string | null>(null)

// Draft object for editing
type LeadDraft = {
  nama: string
  perusahaan: string
  status: LeadStatus
  sumber: LeadSumber
  phone: string
  email: string
  notes: string
  tipe_proyek: string
  skala: string
  intensitas: string
  estimasi: number | null
  lokasi: string
  pic_id: number | null
}

const emptyDraft = () => ({
  nama:        '',
  perusahaan:  '',
  status:      'Prospek' as LeadStatus,
  sumber:      'WhatsApp' as LeadSumber,
  phone:       '',
  email:       '',
  notes:       '',
  tipe_proyek: '',
  skala:       '',
  intensitas:  '',
  estimasi:    null as number | null,
  lokasi:      '',
  pic_id:      null as number | null,
})
const draft = ref<LeadDraft>(emptyDraft())

// Activity Modal state
const showActivityModal = ref(false)
const activitySaving    = ref(false)
const activityError     = ref<string | null>(null)
const activityForm      = ref({ title: 'Prospek', desc: '', date: new Date().toISOString().slice(0, 10) })

// Timeline Steps defined by SOP
const sopSteps = [
  { label: 'Prospek',   icon: 'LogIn',         color: '#6b7280', link: null },
  { label: 'Survei',    icon: 'Calendar',      color: '#60a5fa', link: '/admin/form-survei' },
  { label: 'Penawaran', icon: 'FileText',      color: '#34d399', link: '/admin/penawaran' },
  { label: 'Follow Up', icon: 'MessageSquare', color: '#a78bfa', link: null },
  { label: 'Deal',      icon: 'CheckCircle2',  color: 'var(--accent-orange)', link: null },
]

// ─── Fetch Data ───────────────────────────────────────────────────────────────
async function fetchLead() {
  loading.value = true
  error.value   = null
  try {
    const res = await leadsApi.show(leadId)
    lead.value       = res.data
    lead.value.surveis = res.surveis
    lead.value.penawarans = res.penawarans
    activities.value = res.activities

    // Fetch audit logs for this specific lead
    const logsRes = await auditLogsApi.list({ auditable_type: 'Lead', auditable_id: leadId })
    auditLogs.value = logsRes.data
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat detail lead.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (isNaN(leadId)) {
    error.value = 'ID Lead tidak valid'
    loading.value = false
    return
  }
  fetchLead()

  // Load users for PIC dropdown
  usersApi.list().then(res => {
    usersList.value = res.data
  }).catch(() => {})

  // Load roles for role access management
  rolesApi.list().then(res => {
    rolesList.value = res.data
  }).catch(() => {})
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtRp = (n: number | null) => {
  if (!n) return '—'
  return n.toLocaleString('id-ID') // Removed Rp prefix because currency is shown in UI label
}

const getIcon = (name: string) => {
  const map: Record<string, any> = {
    CheckCircle2, FileText, Calendar, LogIn, MessageSquare
  }
  return map[name] ?? CheckCircle2
}

const formatNotesWithLinks = (text: string | null | undefined): string => {
  if (!text) return 'Tidak ada catatan.'
  // Escape HTML first to prevent XSS
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
  
  // Replace URLs with anchor tags
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener" class="notes-link">$1</a>')
}

const goBack = () => router.push('/admin/crm')

const addMonthsToDate = (dateStr: string, months: number) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

// ─── Edit Handlers ────────────────────────────────────────────────────────────
const startEdit = () => {
  if (!lead.value) return
  draft.value = {
    nama:              lead.value.nama,
    perusahaan:        lead.value.perusahaan,
    status:            lead.value.status,
    sumber:            lead.value.sumber,
    pic_id:            lead.value.pic_id,
    phone:             lead.value.phone ?? '',
    email:             lead.value.email ?? '',
    notes:             lead.value.catatan ?? '',
    tipe_proyek:       lead.value.tipe_proyek ?? '',
    skala:             lead.value.skala ?? '',
    intensitas:        lead.value.intensitas ?? '',
    estimasi:          lead.value.estimasi,
    lokasi:            lead.value.lokasi ?? '',
    tipe_kontrak:      lead.value.tipe_kontrak ?? 'Langsung',
    sewa_durasi_bulan: lead.value.sewa_durasi_bulan ?? 12,
    skema_pembayaran:  lead.value.skema_pembayaran ?? 'Bulanan',
    sewa_mulai:        lead.value.sewa_mulai ?? lead.value.tanggal,
    sewa_selesai:      lead.value.sewa_selesai ?? addMonthsToDate(lead.value.tanggal, lead.value.sewa_durasi_bulan ?? 12),
  }
  saveError.value = null
  isEditing.value = true
}

const onDraftDurasiChange = (months: number) => {
  draft.value.sewa_durasi_bulan = months
  if (draft.value.sewa_mulai) {
    draft.value.sewa_selesai = addMonthsToDate(draft.value.sewa_mulai, months)
  }
}

const cancelEdit = () => {
  isEditing.value = false
}

const saveEdit = async () => {
  if (!draft.value.nama.trim() || !draft.value.perusahaan.trim()) {
    saveError.value = 'Nama dan Perusahaan wajib diisi.'
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const isSewa = draft.value.tipe_kontrak === 'Sewa'
    const durasi = isSewa ? Number(draft.value.sewa_durasi_bulan || 12) : undefined
    const estimasiVal = draft.value.estimasi ? Number(draft.value.estimasi) : null
    const nominalPerBln = (isSewa && estimasiVal && durasi) ? Math.round(estimasiVal / durasi) : undefined

    const payload = {
      nama:              draft.value.nama,
      perusahaan:        draft.value.perusahaan,
      status:            draft.value.status,
      sumber:            draft.value.sumber,
      pic_id:            draft.value.pic_id,
      phone:             draft.value.phone,
      email:             draft.value.email,
      catatan:           draft.value.notes,
      tipe_proyek:       draft.value.tipe_proyek,
      skala:             draft.value.skala,
      intensitas:        draft.value.intensitas,
      estimasi:          estimasiVal,
      lokasi:            draft.value.lokasi,
      tipe_kontrak:      draft.value.tipe_kontrak,
      sewa_durasi_bulan: durasi,
      skema_pembayaran:  isSewa ? draft.value.skema_pembayaran : undefined,
      sewa_mulai:        isSewa ? draft.value.sewa_mulai : undefined,
      sewa_selesai:      isSewa ? draft.value.sewa_selesai : undefined,
      nominal_per_bulan: nominalPerBln,
    }
    const res = await leadsApi.update(leadId, payload)
    lead.value = res.data
    isEditing.value = false
    await fetchAuditLogs()
  } catch (e: any) {
    saveError.value = e.message || 'Gagal menyimpan perubahan'
  } finally {
    saving.value = false
  }
}

// ── Convert to Proyek with Access Control ──
const rolesList        = ref<RoleResponse[]>([])
const showConvertModal = ref(false)
const isConverting     = ref(false)
const convertError     = ref<string | null>(null)
const newMemberUserId  = ref<number | null>(null)
const newMemberRole    = ref('Teknisi Lapangan')

const convertForm = ref({
  nama: '',
  pic_id: null as number | null,
  akses_tipe: 'personal' as 'personal' | 'role' | 'semua',
  allowed_roles: [] as string[],
  assigned_team: [] as Array<{ user_id: number | null; nama: string; role: string }>,
})

const openConvertModal = () => {
  if (!lead.value) return
  convertForm.value.nama = `Proyek - ${lead.value.perusahaan || lead.value.nama}`
  convertForm.value.pic_id = lead.value.pic_id || null
  convertForm.value.akses_tipe = 'personal'
  convertForm.value.allowed_roles = ['teknisi']
  convertForm.value.assigned_team = []
  convertError.value = null
  newMemberUserId.value = null
  newMemberRole.value = 'Teknisi Lapangan'

  // Pre-add PIC to team if set
  if (lead.value.pic_id) {
    const picUser = usersList.value.find(u => u.id === lead.value!.pic_id)
    if (picUser) {
      convertForm.value.assigned_team.push({
        user_id: picUser.id,
        nama: picUser.name,
        role: 'Penanggung Jawab (PIC)',
      })
    }
  }
  showConvertModal.value = true
}

const addTeamMember = () => {
  if (!newMemberUserId.value) return
  const user = usersList.value.find(u => u.id === newMemberUserId.value)
  if (!user) return
  if (convertForm.value.assigned_team.some(t => t.user_id === user.id)) {
    alert('Pengguna / personil ini sudah ada di dalam tim proyek.')
    return
  }
  convertForm.value.assigned_team.push({
    user_id: user.id,
    nama: user.name,
    role: newMemberRole.value || 'Teknisi Lapangan',
  })
  newMemberUserId.value = null
}

const removeTeamMember = (index: number) => {
  convertForm.value.assigned_team.splice(index, 1)
}

const toggleRole = (roleSlug: string) => {
  const idx = convertForm.value.allowed_roles.indexOf(roleSlug)
  if (idx >= 0) {
    convertForm.value.allowed_roles.splice(idx, 1)
  } else {
    convertForm.value.allowed_roles.push(roleSlug)
  }
}

const submitConvertProyek = async () => {
  if (!lead.value) return
  if (!convertForm.value.nama.trim()) {
    convertError.value = 'Nama proyek wajib diisi.'
    return
  }

  isConverting.value = true
  convertError.value = null
  try {
    const today = new Date().toISOString().slice(0, 10)
    const isSewa = lead.value.tipe_kontrak === 'Sewa'
    const durasi = lead.value.sewa_durasi_bulan || 12
    const skema  = lead.value.skema_pembayaran || 'Bulanan'

    const payload = {
      nama:              convertForm.value.nama.trim(),
      client_nama:       lead.value.nama,
      perusahaan:        lead.value.perusahaan,
      phone:             lead.value.phone,
      email:             lead.value.email,
      pic_id:            convertForm.value.pic_id,
      akses_tipe:        convertForm.value.akses_tipe,
      allowed_roles:     convertForm.value.akses_tipe === 'role' ? convertForm.value.allowed_roles : undefined,
      tim:               convertForm.value.akses_tipe === 'personal' ? convertForm.value.assigned_team : undefined,
      kategori:          lead.value.tipe_proyek,
      deskripsi:         lead.value.catatan,
      nilai:             lead.value.estimasi,
      lead_id:           lead.value.id,
      status:            'Belum Dimulai' as const,
      tipe_kontrak:      isSewa ? ('Sewa' as const) : ('Reguler' as const),
      sewa_durasi_bulan: isSewa ? durasi : undefined,
      skema_pembayaran:  isSewa ? skema : undefined,
      sewa_mulai:        isSewa ? (lead.value.sewa_mulai || today) : undefined,
      sewa_selesai:      isSewa ? (lead.value.sewa_selesai || addMonthsToDate(today, durasi)) : undefined,
      nominal_per_bulan: isSewa && lead.value.nominal_per_bulan ? lead.value.nominal_per_bulan : (isSewa && lead.value.estimasi ? Math.round(Number(lead.value.estimasi) / durasi) : undefined),
      status_sewa:       isSewa ? ('Aktif' as const) : undefined,
    }
    const res = await proyeksApi.create(payload)
    showConvertModal.value = false
    router.push(`/admin/proyek/${res.data.id}`)
  } catch (e: any) {
    convertError.value = e.message || 'Gagal mengonversi ke proyek.'
  } finally {
    isConverting.value = false
  }
}

// ─── Activity Handlers ────────────────────────────────────────────────────────
const openStepActivity = (title: string) => {
  activityForm.value = {
    title: title,
    desc: '',
    date: new Date().toISOString().slice(0, 10)
  }
  activityError.value = null
  showActivityModal.value = true
}

const addActivity = async () => {
  if (!activityForm.value.title) return
  activitySaving.value = true
  activityError.value = null
  try {
    await leadActivitiesApi.create(leadId, {
      title: activityForm.value.title,
      description: activityForm.value.desc,
      date: activityForm.value.date
    })
    // Reload full lead to get updated activities and possible auto-status update
    await fetchLead()
    showActivityModal.value = false
  } catch (e: any) {
    activityError.value = e.message || 'Gagal menyimpan aktivitas.'
  } finally {
    activitySaving.value = false
  }
}

// Build timeline based on SOP steps, highlighting reached steps and filling in actual activity data
const timeline = computed(() => {
  if (!lead.value) return []

  const statusMapping: Record<string, number> = {
    'PROSPEK': 1,
    'SURVEY': 2,
    'PENAWARAN': 3,
    'FOLLOW UP': 4,
    'DEAL': 5,
    'PENDING': 1,
    'BATAL': 1
  }
  const currentStatusLvl = statusMapping[lead.value.status.toUpperCase()] || 1

  return sopSteps.map((step, idx) => {
    const isReached = (idx + 1) <= currentStatusLvl
    const color = isReached ? 'var(--accent-orange)' : '#6b7280'

    // Find latest activity that matches this step title (approximate matching)
    // Note: Activity titles might be 'Survei' while status is 'Survey'
    const stepActs = activities.value.filter(a => {
      const aTitle = a.title.toUpperCase()
      const sTitle = step.label.toUpperCase()
      return aTitle === sTitle || (aTitle === 'SURVEI' && sTitle === 'SURVEY') || (aTitle === 'SURVEY' && sTitle === 'SURVEI')
    })

    // Get most recent activity for this step
    const latestAct = stepActs.length > 0 ? stepActs[stepActs.length - 1] : null

    return {
      id: idx + 1,
      title: step.label,
      date: latestAct ? latestAct.date : (isReached && idx + 1 === currentStatusLvl ? 'Hari ini' : '-'),
      desc: latestAct?.description || (isReached ? `Tahap ${step.label} telah dicapai.` : `Tahap ${step.label} belum dimulai.`),
      created_by_name: latestAct?.created_by_name,
      icon: step.icon,
      color: color,
      link: step.link ? `${step.link}?lead_id=${leadId}` : null,
      isReached
    }
  })
})

</script>

<template>
  <AdminLayout>
    <!-- ── Breadcrumb ── -->
    <div class="crm-breadcrumb">
      <span class="crumb-link" @click="goBack">CRM Leads</span>
      <ChevronRight :size="14" class="crumb-sep" />
      <span class="crumb-current">Profil Lead</span>
    </div>

    <!-- Error State -->
    <div v-if="error" class="crm-error-box" style="margin-bottom: 24px;">
      <CheckCircle2 :size="15" v-if="false" />
      <span style="color: #ef4444; font-weight: 600;">Error: {{ error }}</span>
    </div>

    <!-- Loading Skeleton -->
    <template v-if="loading">
      <div class="sk-header"></div>
      <div class="lead-grid">
        <div class="sk-col"></div>
        <div class="sk-col"></div>
        <div class="sk-col"></div>
      </div>
    </template>

    <template v-else-if="lead">
      <!-- ── Header Banner ── -->
      <div class="lead-header-card">
        <div class="lead-header-left">
          <div class="lead-avatar"><User :size="32" /></div>
          <div class="lead-info">
            <div class="lead-title-row">
              <h1 v-if="!isEditing">{{ lead.nama }}</h1>
              <input v-else v-model="draft.nama" class="inline-input inline-input-title" />
              <span class="lead-badge">{{ lead.status }}</span>
              <span v-if="lead.tipe_kontrak === 'Sewa'" class="badge-sewa-lg">
                <Repeat :size="12" /> Sewa ({{ lead.sewa_durasi_bulan || 12 }} Bln - {{ lead.skema_pembayaran || 'Bulanan' }})
              </span>
              <span v-else class="badge-langsung-lg">Langsung</span>
            </div>
            <div class="lead-subtitle">
              <Building2 :size="14" />
              <span v-if="!isEditing">{{ lead.perusahaan }}</span>
              <input v-else v-model="draft.perusahaan" class="inline-input inline-input-sm" placeholder="Nama Perusahaan" />
              <span v-if="lead.kode_lead" style="margin-left: 10px; opacity: 0.6; font-family: monospace;">| {{ lead.kode_lead }}</span>
            </div>
          </div>
        </div>
        <div class="lead-header-right">
          <!-- Mode normal: tampil tombol Edit -->
          <template v-if="!isEditing">
            <button class="btn-ghost" style="display:flex;align-items:center;gap:8px;border:1px solid var(--border-color);padding:10px 20px;" @click="startEdit">
              <Pencil :size="14" /> Edit
            </button>
            <template v-if="lead.proyek">
              <button class="btn-primary lead-btn-convert" @click="router.push(`/admin/proyek/${lead.proyek.id}`)" style="background: var(--accent-blue);">
                <ExternalLink :size="16" /> Lihat Proyek
              </button>
            </template>
            <template v-else-if="lead.status === 'Deal'">
              <button
                class="btn-primary lead-btn-convert"
                :class="{ 'btn-convert-sewa': lead.tipe_kontrak === 'Sewa' }"
                @click="openConvertModal"
                :disabled="isConverting"
                :title="lead.tipe_kontrak === 'Sewa' ? 'Atur hak akses & otomatis membuat Proyek Sewa IT (' + (lead.sewa_durasi_bulan || 12) + ' Bulan)' : 'Atur hak akses & buat Proyek baru'"
              >
                <Rocket :size="16" /> {{ isConverting ? 'Memproses...' : (lead.tipe_kontrak === 'Sewa' ? 'Jadikan Proyek Sewa' : 'Jadikan Proyek') }}
              </button>
            </template>
          </template>
          <!-- Mode edit: tampil Simpan & Batal -->
          <template v-else>
            <button class="btn-ghost" style="display:flex;align-items:center;gap:8px;border:1px solid var(--border-color);padding:10px 20px;" @click="cancelEdit">
              <X :size="14" /> Batal
            </button>
            <button class="btn-primary lead-btn-convert" @click="saveEdit" :disabled="saving">
              <Save :size="14" /> {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </template>
        </div>
      </div>

      <div v-if="saveError" style="color: #ef4444; font-size: 13px; margin-bottom: 16px; text-align: right;">
        {{ saveError }}
      </div>

      <!-- ── 3 Column Layout ── -->
      <div class="lead-grid">

        <!-- LEFT COLUMN -->
        <div class="lead-col lead-col-left">
          <!-- Contact Information -->
          <div class="lead-card">
            <h2 class="card-title">INFORMASI KONTAK</h2>
            <div class="contact-list">
              <div class="contact-item">
                <div class="contact-icon" style="color: #25d366;"><WhatsAppIcon :size="18" /></div>
                <div class="contact-text">
                  <label>WhatsApp</label>
                  <a
                    v-if="!isEditing && lead.phone"
                    :href="getWaLink(lead.phone, `Halo ${lead.nama}, kami dari PT Putra Wisanggeni Satu ingin menindaklanjuti kebutuhan ${lead.kebutuhan || ''}.`)"
                    target="_blank"
                    rel="noopener"
                    class="wa-detail-link"
                    title="Buka WhatsApp"
                  >
                    <span>{{ lead.phone }}</span>
                  </a>
                  <span v-else-if="!isEditing">—</span>
                  <input v-else v-model="draft.phone" class="inline-input" placeholder="08xx-xxxx-xxxx" />
                </div>
              </div>
              <div class="contact-item">
                <div class="contact-icon"><Mail :size="18" /></div>
                <div class="contact-text">
                  <label>Email</label>
                  <span v-if="!isEditing">{{ lead.email || '—' }}</span>
                  <input v-else v-model="draft.email" type="email" class="inline-input" placeholder="email@domain.com" />
                </div>
              </div>
              <div class="contact-item">
                <div class="contact-icon"><Share2 :size="18" /></div>
                <div class="contact-text">
                  <label>Sumber Lead</label>
                  <span v-if="!isEditing">{{ lead.sumber }}</span>
                  <select v-else v-model="draft.sumber" class="inline-select">
                    <option v-for="s in ['WhatsApp','Referensi','Website','Instagram','Langsung','Telepon']" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </div>
              <div class="contact-item">
                <div class="contact-icon"><UserCircle :size="18" /></div>
                <div class="contact-text">
                  <label>Nama PIC</label>
                  <span v-if="!isEditing">{{ lead.pic || '—' }}</span>
                  <template v-else>
                    <select v-model="draft.pic_id" class="inline-select">
                      <option :value="null">-- Pilih PIC --</option>
                      <option v-for="u in usersList" :key="u.id" :value="u.id">{{ u.name }}</option>
                    </select>
                  </template>
                </div>
              </div>
              <!-- Status edit inline -->
              <div v-if="isEditing" class="contact-item">
                <div class="contact-icon"><CheckCircle2 :size="18" /></div>
                <div class="contact-text">
                  <label>Status</label>
                  <select v-model="draft.status" class="inline-select">
                    <option v-for="s in ['Prospek','Survey','Penawaran','Deal','Pending','Batal']" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Internal Notes -->
          <div class="lead-card lead-card-notes">
            <h2 class="card-title">CATATAN INTERNAL</h2>
            <p v-if="!isEditing" class="notes-text" v-html="formatNotesWithLinks(lead.catatan)"></p>
            <textarea v-else v-model="draft.notes" class="inline-textarea" rows="4" placeholder="Tulis catatan internal di sini..."></textarea>
          </div>
        </div>

        <!-- CENTER COLUMN: Timeline -->
        <div class="lead-col lead-col-center">
          <div class="lead-card" style="height:100%;">
            <div class="timeline-header">
              <h2 class="card-title" style="margin:0;">PERJALANAN SOP & LINIMASA</h2>
              <button class="btn-ghost btn-activity" @click="showActivityModal = true">
                <Plus :size="12" /> Catat Aktivitas
              </button>
            </div>

            <div class="timeline-container">
              <div v-for="(item, idx) in timeline" :key="item.id" class="timeline-item" @click="openStepActivity(item.title)">
                <div class="timeline-line" v-if="idx !== timeline.length - 1">
                  <!-- Highlight line up to the current reached step -->
                  <div class="timeline-line-fill" :style="{ height: timeline[idx + 1]?.isReached ? '100%' : '0%' }"></div>
                </div>
                <div class="timeline-icon" :style="{ borderColor: item.color, color: item.color }">
                  <component :is="getIcon(item.icon)" :size="14" />
                </div>
                <div class="timeline-content">
                  <div class="timeline-top">
                    <h3>{{ item.title }}</h3>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span class="timeline-date">{{ item.date }}</span>
                      <!-- Link ke halaman terkait -->
                      <button v-if="item.link" class="timeline-link-btn" @click.stop="router.push(item.link)" :title="`Buka halaman ${item.title}`">
                        <ExternalLink :size="12" />
                      </button>
                    </div>
                  </div>
                  <p>{{ item.desc }}</p>
                  <div v-if="item.created_by_name" style="margin-top: 8px; font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                    <User :size="10" /> Dicatat oleh: <strong style="color: var(--text-secondary);">{{ item.created_by_name }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div class="lead-col lead-col-right">
          <div class="lead-card" style="display:flex;flex-direction:column; gap:24px;">
            <h2 class="card-title">LINGKUP PROYEK</h2>
            <div class="scope-list">
              <div class="scope-item">
                <div class="scope-icon"><Video :size="18" style="color:var(--accent-orange);" /></div>
                <div class="scope-text">
                  <label>Tipe</label>
                  <span v-if="!isEditing">{{ lead.tipe_proyek || '—' }}</span>
                  <input v-else v-model="draft.tipe_proyek" class="inline-input" placeholder="CCTV / Alarm / ..." />
                </div>
              </div>
              <div class="scope-item">
                <div class="scope-icon"><Sliders :size="18" style="color:var(--accent-orange);" /></div>
                <div class="scope-text">
                  <label>Skala</label>
                  <span v-if="!isEditing">{{ lead.skala || '—' }}</span>
                  <input v-else v-model="draft.skala" class="inline-input" placeholder="Kecil / Besar" />
                </div>
              </div>
              <div class="scope-item">
                <div class="scope-icon"><Gauge :size="18" style="color:var(--accent-orange);" /></div>
                <div class="scope-text">
                  <label>Intensitas</label>
                  <span v-if="!isEditing">{{ lead.intensitas || '—' }}</span>
                  <input v-else v-model="draft.intensitas" class="inline-input" placeholder="Komersial / Residensial" />
                </div>
              </div>
            </div>

            <div class="est-value-section">
              <h2 class="card-title" style="margin-bottom:8px;">ESTIMASI NILAI</h2>
              <div class="est-value">
                <span class="est-currency">IDR</span>
                <span v-if="!isEditing" class="est-amount">{{ fmtRp(lead.estimasi) }}</span>
                <input v-else v-model.number="draft.estimasi" type="number" class="inline-input inline-input-title" style="margin-left: 8px;" placeholder="0" />
              </div>
            </div>

            <!-- Model Kontrak & Sewa Section -->
            <div class="contract-model-card">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <h2 class="card-title" style="margin: 0;">MODEL KONTRAK</h2>
                <span v-if="!isEditing && lead.tipe_kontrak === 'Sewa'" class="badge-sewa-mini">
                  <Repeat :size="10" /> Sewa IT
                </span>
                <span v-else-if="!isEditing" class="badge-langsung-mini">Langsung</span>
              </div>

              <!-- View Mode -->
              <div v-if="!isEditing">
                <div v-if="lead.tipe_kontrak === 'Sewa'" class="detail-sewa-box">
                  <div class="dsb-row">
                    <span class="dsb-label">Tipe:</span>
                    <span class="dsb-val" style="color: #c084fc; font-weight: 600;">Sewa (Rental IT)</span>
                  </div>
                  <div class="dsb-row">
                    <span class="dsb-label">Durasi Kontrak:</span>
                    <span class="dsb-val">{{ lead.sewa_durasi_bulan || 12 }} Bulan</span>
                  </div>
                  <div class="dsb-row">
                    <span class="dsb-label">Skema Penagihan:</span>
                    <span class="dsb-val">{{ lead.skema_pembayaran || 'Bulanan' }}</span>
                  </div>
                  <div v-if="lead.sewa_mulai || lead.sewa_selesai" class="dsb-row">
                    <span class="dsb-label">Periode:</span>
                    <span class="dsb-val" style="font-size: 11.5px;">{{ lead.sewa_mulai || '—' }} s/d {{ lead.sewa_selesai || '—' }}</span>
                  </div>
                  <div class="dsb-cicilan-box">
                    <span style="font-size: 11px; color: #d8b4fe;">Estimasi Cicilan Sewa:</span>
                    <div style="font-size: 14px; font-weight: 700; color: #4ade80; font-family: monospace; margin: 2px 0;">
                      Rp {{ (lead.nominal_per_bulan || Math.round((lead.estimasi || 0) / (lead.sewa_durasi_bulan || 12))).toLocaleString('id-ID') }} / bulan
                    </div>
                    <span style="font-size: 10.5px; color: var(--text-muted);">
                      {{ lead.sewa_durasi_bulan || 12 }}x bayar dari total {{ fmtRp(lead.estimasi) }}
                    </span>
                  </div>
                </div>
                <div v-else style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; padding: 10px 12px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--border-color);">
                  💼 <strong>Proyek Standar / Beli Putus</strong>. Pembayaran bertahap (DP, termin, pelunasan) setelah deal.
                </div>
              </div>

              <!-- Edit Mode -->
              <div v-else class="edit-contract-box">
                <div class="type-segment" style="margin-bottom: 12px;">
                  <button
                    type="button"
                    class="type-btn"
                    :class="{ active: draft.tipe_kontrak === 'Langsung' }"
                    @click="draft.tipe_kontrak = 'Langsung'"
                  >
                    💼 Langsung
                  </button>
                  <button
                    type="button"
                    class="type-btn"
                    :class="{ active: draft.tipe_kontrak === 'Sewa' }"
                    @click="draft.tipe_kontrak = 'Sewa'"
                  >
                    <Repeat :size="12" style="display:inline; margin-right:3px;" /> Sewa
                  </button>
                </div>

                <div v-if="draft.tipe_kontrak === 'Sewa'" class="edit-sewa-fields">
                  <div style="margin-bottom: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                      <label style="font-size:11px; color:var(--text-muted);">Durasi (Bulan)</label>
                      <div style="display:flex; gap:3px;">
                        <button type="button" class="btn-quick-durasi-mini" @click="onDraftDurasiChange(6)">6B</button>
                        <button type="button" class="btn-quick-durasi-mini" @click="onDraftDurasiChange(12)">12B</button>
                        <button type="button" class="btn-quick-durasi-mini" @click="onDraftDurasiChange(24)">24B</button>
                      </div>
                    </div>
                    <input v-model.number="draft.sewa_durasi_bulan" type="number" min="1" class="inline-input" style="width: 100%; box-sizing: border-box;" @input="onDraftDurasiChange(draft.sewa_durasi_bulan)" />
                  </div>

                  <div style="margin-bottom: 8px;">
                    <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom: 4px;">Skema Pembayaran</label>
                    <select v-model="draft.skema_pembayaran" class="inline-input" style="width: 100%; box-sizing: border-box;">
                      <option value="Bulanan">Bulanan (Cicil per bulan)</option>
                      <option value="Sekaligus">Sekaligus (Lunas di muka)</option>
                    </select>
                  </div>

                  <div style="margin-bottom: 8px;">
                    <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom: 4px;">Mulai Sewa</label>
                    <input v-model="draft.sewa_mulai" type="date" class="inline-input" style="width: 100%; box-sizing: border-box;" @change="onDraftDurasiChange(draft.sewa_durasi_bulan)" />
                  </div>

                  <div style="margin-bottom: 8px;">
                    <label style="font-size:11px; color:var(--text-muted); display:block; margin-bottom: 4px;">Selesai Sewa</label>
                    <input v-model="draft.sewa_selesai" type="date" class="inline-input" style="width: 100%; box-sizing: border-box;" />
                  </div>

                  <div v-if="draft.estimasi && draft.sewa_durasi_bulan > 0" class="sewa-sim-banner" style="margin-top: 8px; padding: 6px 10px;">
                    <span style="font-size: 11px; color: #d8b4fe;">Simulasi:</span>
                    <strong style="color: #4ade80; font-family: monospace; font-size: 12.5px;">
                      Rp {{ Math.round(draft.estimasi / draft.sewa_durasi_bulan).toLocaleString('id-ID') }}/bln
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div class="map-placeholder">
              <div class="map-pin"><MapPin :size="16" /></div>
              <div class="map-info">
                <label>LOKASI PROYEK</label>
                <span v-if="!isEditing">{{ lead.lokasi || '—' }}</span>
                <input v-else v-model="draft.lokasi" class="inline-input" style="background:rgba(0,0,0,0.5); color:#fff; border-color:var(--border-color); font-size: 13px;" placeholder="Kota, Provinsi" />
              </div>
            </div>
            <!-- Survey History -->
            <div class="survei-history-section">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                <h2 class="card-title" style="margin:0;">RIWAYAT SURVEI ({{ lead.surveis?.length || 0 }})</h2>
                <div style="display:flex; gap:6px;">
                  <button class="btn-primary" style="padding:4px 8px; font-size:11px;" @click="router.push({ path: '/admin/form-survei', query: { lead_id: lead.id } })">
                    + Buat
                  </button>
                  <button class="btn-ghost" style="padding:4px 8px; font-size:11px;" @click="router.push('/admin/form-survei')">
                    Semua
                  </button>
                </div>
              </div>
              <div v-if="!lead.surveis || lead.surveis.length === 0" style="font-size:12px; color:var(--text-muted); font-style:italic; padding: 12px; border: 1px dashed var(--border-color); border-radius: 8px; text-align: center;">
                <ClipboardList :size="24" style="margin-bottom:8px; opacity:0.5;" />
                <div>Belum ada survei.</div>
              </div>
              <div v-else class="survei-list">
                <div v-for="s in lead.surveis" :key="s.id" class="survei-item" @click="router.push({ path: '/admin/form-survei', query: { survei_id: s.id } })">
                  <div class="survei-item-header">
                    <span class="survei-date"><Calendar :size="11" style="display:inline; margin-right:4px;" />{{ s.tanggal }}</span>
                    <span class="survei-status" :class="'status-' + (s.status || '').toLowerCase()">{{ s.status }}</span>
                  </div>
                  <div class="survei-lokasi"><MapPin :size="11" style="display:inline; margin-right:4px;" />{{ s.lokasi || 'Lokasi belum diset' }}</div>
                  <div class="survei-surveyor" v-if="s.surveyor"><User :size="11" style="display:inline; margin-right:4px;" />{{ s.surveyor }}</div>
                </div>
              </div>
            </div>

            <!-- Penawaran History -->
            <div class="penawaran-history-section">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                <h2 class="card-title" style="margin:0;">RIWAYAT PENAWARAN ({{ lead.penawarans?.length || 0 }})</h2>
                <div style="display:flex; gap:6px;">
                  <button class="btn-primary" style="padding:4px 8px; font-size:11px;" @click="router.push({ path: '/admin/penawaran', query: { lead_id: lead.id } })">
                    + Buat
                  </button>
                  <button class="btn-ghost" style="padding:4px 8px; font-size:11px;" @click="router.push('/admin/penawaran')">
                    Semua
                  </button>
                </div>
              </div>
              <div v-if="!lead.penawarans || lead.penawarans.length === 0" class="history-empty-box">
                <FileBadge2 :size="24" style="margin-bottom:8px; opacity:0.5;" />
                <div>Belum ada penawaran untuk client ini.</div>
              </div>
              <div v-else class="penawaran-list">
                <div v-for="p in lead.penawarans" :key="p.id" class="penawaran-item" @click="router.push(`/admin/penawaran/${p.id}`)">
                  <div class="penawaran-item-header">
                    <span class="penawaran-number">{{ p.nomor_penawaran }}</span>
                    <span class="penawaran-status">{{ p.status }}</span>
                  </div>
                  <div class="penawaran-meta-row">
                    <span><Calendar :size="11" style="display:inline; margin-right:4px;" />{{ p.tanggal || '-' }}</span>
                    <span>Berlaku s.d. {{ p.valid_until || '-' }}</span>
                  </div>
                  <div class="penawaran-total">Total: IDR {{ fmtRp(p.total_harga) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Footer ── -->
      <div class="lead-footer">
        <span>ID Lead: #{{ lead.id.toString().padStart(4, '0') }}</span>
        <div class="lead-footer-right">
          <span>Dibuat pada: {{ lead.created_at }}</span>
          <span style="margin-left:20px;">Update Terakhir: {{ lead.updated_at }}</span>
        </div>
      </div>

      <!-- ── Audit Log Section ── -->
      <div class="lead-card" style="margin-top: 24px;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom: 20px;">
          <Activity :size="18" style="color: var(--accent-orange);" />
          <h2 class="card-title" style="margin: 0;">RIWAYAT PERUBAHAN DATA (AUDIT LOG)</h2>
        </div>

        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
                <th style="padding: 10px 12px; font-weight: 600;"><Clock :size="11" style="display:inline; margin-right:4px;" /> Waktu</th>
                <th style="padding: 10px 12px; font-weight: 600;"><User :size="11" style="display:inline; margin-right:4px;" /> Pengguna</th>
                <th style="padding: 10px 12px; font-weight: 600;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="auditLogs.length === 0">
                <td colspan="3" style="text-align: center; padding: 24px; color: var(--text-muted); font-style: italic;">
                  Belum ada riwayat perubahan pada data lead ini.
                </td>
              </tr>
              <tr v-for="log in auditLogs" :key="log.id" style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                <td style="padding: 12px; color: var(--text-secondary);">{{ log.created_at }}</td>
                <td style="padding: 12px; font-weight: 500; color: var(--text-primary);">{{ log.user_name }}</td>
                <td style="padding: 12px;">
                  <span style="display:inline-flex; align-items:center; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-primary);">
                    {{ log.action.toUpperCase() }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ── Modal Catat Aktivitas ── -->
    <Teleport to="body">
      <div v-if="showActivityModal" class="modal-overlay" @click.self="showActivityModal = false">
        <div class="modal-box" style="max-width:480px;">
          <div class="modal-header">
            <h2>Catat Aktivitas Baru</h2>
            <button class="modal-close" @click="showActivityModal = false"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="form-field" style="margin-bottom:16px;">
              <label class="form-label">Tahap SOP</label>
              <select v-model="activityForm.title" class="form-select">
                <option v-for="s in sopSteps" :key="s.label" :value="s.label">{{ s.label }}</option>
              </select>
              <span style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Menyimpan aktivitas ini otomatis akan meng-update status Lead sesuai tahapan.</span>
            </div>
            <div class="form-field" style="margin-bottom:16px;">
              <label class="form-label">Tanggal</label>
              <input v-model="activityForm.date" type="date" class="form-input" />
            </div>
            <div class="form-field">
              <label class="form-label">Keterangan</label>
              <textarea
                v-model="activityForm.desc"
                class="form-textarea"
                rows="3"
                placeholder="Deskripsikan aktivitas yang dilakukan..."
              ></textarea>
            </div>

            <div v-if="activityError" style="color: #ef4444; font-size: 12px; margin-top: 12px;">
              {{ activityError }}
            </div>

            <!-- Quick link banner -->
            <div v-if="sopSteps.find(s => s.label === activityForm.title)?.link" class="activity-link-banner" @click="router.push(`${sopSteps.find(s => s.label === activityForm.title)?.link}?lead_id=${leadId}`)">
              <ExternalLink :size="14" />
              Buka halaman {{ activityForm.title }} sekarang
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="showActivityModal = false">Batal</button>
            <button class="btn-primary btn-half" @click="addActivity" :disabled="activitySaving">
              {{ activitySaving ? 'Menyimpan...' : 'Simpan Aktivitas' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Konfirmasi Jadikan Proyek & Hak Akses ── -->
    <Teleport to="body">
      <div v-if="showConvertModal" class="modal-overlay" @click.self="showConvertModal = false">
        <div class="modal-box convert-modal-box">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="convert-modal-icon">
                <Rocket :size="20" />
              </div>
              <div>
                <h2 style="font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0;">
                  {{ lead?.tipe_kontrak === 'Sewa' ? 'Konfirmasi Jadikan Proyek Sewa IT' : 'Konfirmasi Jadikan Proyek' }}
                </h2>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                  Tentukan penanggung jawab dan atur siapa saja yang boleh mengakses proyek ini.
                </div>
              </div>
            </div>
            <button class="modal-close" @click="showConvertModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body convert-modal-body">
            <!-- Alert Error -->
            <div v-if="convertError" class="crm-error-box" style="margin-bottom: 16px;">
              <span style="font-size: 13px; color: #ef4444;">{{ convertError }}</span>
            </div>

            <!-- Nama Proyek -->
            <div class="form-field" style="margin-bottom: 16px;">
              <label class="form-label" style="font-weight: 600;">Nama Proyek <span style="color: #ef4444;">*</span></label>
              <input v-model="convertForm.nama" type="text" class="form-input" placeholder="Masukkan nama proyek..." />
            </div>

            <!-- PIC Penanggung Jawab Proyek -->
            <div class="form-field" style="margin-bottom: 20px;">
              <label class="form-label" style="font-weight: 600;">
                PIC Penanggung Jawab Utama
                <span style="font-size: 11px; font-weight: normal; color: var(--text-muted); margin-left: 6px;">
                  (Teknisi / PIC yang memimpin &amp; bertanggung jawab atas proyek)
                </span>
              </label>
              <select v-model="convertForm.pic_id" class="form-select">
                <option :value="null">-- Pilih Penanggung Jawab --</option>
                <option v-for="u in usersList" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.role?.name || 'Staff' }})
                </option>
              </select>
            </div>

            <!-- Pilihan Hak Akses -->
            <div class="form-field" style="margin-bottom: 20px;">
              <label class="form-label" style="font-weight: 600;">
                Pengaturan Hak Akses Proyek
              </label>
              <div class="access-type-grid">
                <!-- Option 1: Personal -->
                <div
                  class="access-type-card"
                  :class="{ active: convertForm.akses_tipe === 'personal' }"
                  @click="convertForm.akses_tipe = 'personal'"
                >
                  <div class="access-type-header">
                    <UserCircle :size="18" style="color: var(--accent-orange);" />
                    <span class="access-type-title">Personal (Disarankan)</span>
                  </div>
                  <p class="access-type-desc">
                    Hanya teknisi/personil yang ditugaskan khusus yang dapat melihat &amp; mengelola proyek ini.
                  </p>
                </div>

                <!-- Option 2: Role Management -->
                <div
                  class="access-type-card"
                  :class="{ active: convertForm.akses_tipe === 'role' }"
                  @click="convertForm.akses_tipe = 'role'"
                >
                  <div class="access-type-header">
                    <Shield :size="18" style="color: #60a5fa;" />
                    <span class="access-type-title">Berdasarkan Role</span>
                  </div>
                  <p class="access-type-desc">
                    Akses diberikan ke seluruh pengguna dengan role yang dipilih (mis: Teknisi, IT Support).
                  </p>
                </div>

                <!-- Option 3: Semua Pengguna -->
                <div
                  class="access-type-card"
                  :class="{ active: convertForm.akses_tipe === 'semua' }"
                  @click="convertForm.akses_tipe = 'semua'"
                >
                  <div class="access-type-header">
                    <Globe :size="18" style="color: #34d399;" />
                    <span class="access-type-title">Semua (Publik)</span>
                  </div>
                  <p class="access-type-desc">
                    Dapat dilihat oleh semua pengguna internal yang memiliki hak modul proyek.
                  </p>
                </div>
              </div>
            </div>

            <!-- Conditional: Personal Access Selector (Personil & Teknisi) -->
            <div v-if="convertForm.akses_tipe === 'personal'" class="access-config-box" style="margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                <Users :size="15" style="color: var(--accent-orange);" />
                Personil / Teknisi yang Diberi Akses ke Proyek Ini
              </div>

              <!-- Add Member Input Row -->
              <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <select v-model="newMemberUserId" class="form-select" style="flex: 1; min-width: 170px;">
                  <option :value="null">-- Pilih Personil / Teknisi --</option>
                  <option v-for="u in usersList" :key="u.id" :value="u.id">
                    {{ u.name }} ({{ u.role?.name || 'Staff' }})
                  </option>
                </select>
                <input
                  v-model="newMemberRole"
                  type="text"
                  class="form-input"
                  placeholder="Peran (mis: Teknisi Lapangan)"
                  style="width: 160px;"
                />
                <button
                  type="button"
                  class="btn-primary"
                  style="padding: 0 14px; font-size: 12px; height: 38px; display: flex; align-items: center; gap: 6px;"
                  @click="addTeamMember"
                  :disabled="!newMemberUserId"
                >
                  <Plus :size="14" /> Tambah
                </button>
              </div>

              <!-- Members List -->
              <div v-if="convertForm.assigned_team.length === 0" style="font-size: 12px; color: var(--text-muted); font-style: italic; padding: 6px 0;">
                Belum ada anggota personil tambahan. (PIC utama otomatis memiliki akses).
              </div>
              <div v-else class="team-members-list">
                <div
                  v-for="(member, idx) in convertForm.assigned_team"
                  :key="idx"
                  class="team-member-item"
                >
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="team-member-avatar">{{ (member.nama || '?')[0].toUpperCase() }}</div>
                    <div>
                      <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">{{ member.nama }}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">{{ member.role }}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="btn-icon-danger"
                    @click="removeTeamMember(idx)"
                    title="Hapus dari tim"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Conditional: Role Management Selector -->
            <div v-if="convertForm.akses_tipe === 'role'" class="access-config-box" style="margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <Shield :size="15" style="color: var(--accent-orange);" />
                Pilih Role yang Memiliki Hak Akses Proyek
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 12px;">
                Role yang dipilih akan otomatis dapat melihat dan membuka detail proyek ini.
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <div
                  v-for="r in rolesList"
                  :key="r.id"
                  class="role-select-chip"
                  :class="{ selected: convertForm.allowed_roles.includes(r.slug) }"
                  @click="toggleRole(r.slug)"
                >
                  <span class="role-chip-indicator" :style="{ background: r.color || '#f59e0b' }"></span>
                  <span>{{ r.name }}</span>
                </div>
              </div>
            </div>

            <!-- Ringkasan Info Proyek / Kontrak -->
            <div class="convert-summary-box">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 12px; color: var(--text-muted);">Tipe Kontrak:</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">
                  {{ lead?.tipe_kontrak === 'Sewa' ? `Sewa IT (${lead.sewa_durasi_bulan || 12} Bulan - ${lead.skema_pembayaran || 'Bulanan'})` : 'Reguler (Langsung)' }}
                </span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: var(--text-muted);">Estimasi Nilai Proyek:</span>
                <span style="font-size: 13px; font-weight: 800; color: var(--accent-orange);">
                  IDR {{ fmtRp(lead?.estimasi ?? 0) }}
                </span>
              </div>
            </div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button type="button" class="btn-ghost btn-half" @click="showConvertModal = false" :disabled="isConverting">
              Batal
            </button>
            <button
              type="button"
              class="btn-primary btn-half"
              @click="submitConvertProyek"
              :disabled="isConverting"
              style="display: flex; align-items: center; justify-content: center; gap: 8px;"
            >
              <Rocket :size="15" /> {{ isConverting ? 'Memproses...' : 'Konfirmasi & Buat Proyek' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Typography ── */
.card-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 20px;
}

/* ── Breadcrumb ── */
.crm-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 24px;
  color: var(--text-secondary);
}
.crumb-link { cursor: pointer; font-weight: 500; transition: color 0.2s; }
.crumb-link:hover { color: var(--accent-orange); }
.crumb-sep { opacity: 0.5; }
.crumb-current { color: var(--text-primary); font-weight: 600; }

.crm-error-box {
  padding: 16px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; display: flex; align-items: center; gap: 8px;
}

/* ── Header Banner ── */
.lead-header-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 20px;
}
.lead-header-left { display: flex; align-items: center; gap: 20px; }
.lead-avatar {
  width: 72px; height: 72px;
  background: rgba(245,158,11,0.15);
  color: var(--accent-orange);
  border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.lead-info { display: flex; flex-direction: column; gap: 8px; }
.lead-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.lead-title-row h1 {
  font-size: 28px; font-weight: 800; color: var(--text-primary);
  margin: 0; line-height: 1;
}
.lead-badge {
  background: var(--accent-orange); color: #fff;
  font-size: 11px; font-weight: 800; padding: 4px 10px;
  border-radius: 6px; letter-spacing: 0.5px; white-space: nowrap;
}
.lead-subtitle {
  display: flex; align-items: center; gap: 6px;
  color: var(--text-secondary); font-size: 14px;
}
.lead-header-right { display: flex; align-items: center; gap: 12px; }
.lead-btn-convert {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px; font-size: 14px; font-weight: 700;
}

/* ── Inline Editing ── */
.inline-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--accent-orange);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  padding: 4px 10px;
  outline: none;
  width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.inline-input:focus {
  border-color: var(--accent-orange);
  box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
}
.inline-input-title {
  font-size: 24px;
  font-weight: 800;
  padding: 4px 12px;
}
.inline-input-sm {
  font-size: 14px;
  padding: 4px 10px;
}
.inline-select {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--accent-orange);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 14px;
  padding: 4px 10px;
  outline: none;
  width: 100%;
}
.inline-textarea {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--accent-orange);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-style: italic;
  line-height: 1.6;
  padding: 8px 12px;
  outline: none;
  width: 100%;
  resize: vertical;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.inline-textarea:focus {
  border-color: var(--accent-orange);
  box-shadow: 0 0 0 2px rgba(245,158,11,0.2);
}

/* ── Grid Layout ── */
.lead-grid {
  display: grid;
  grid-template-columns: 280px 1fr 300px;
  gap: 20px;
  margin-bottom: 24px;
}
@media (max-width: 1200px) {
  .lead-grid { grid-template-columns: 1fr; }
}
.lead-col { display: flex; flex-direction: column; gap: 20px; }
.lead-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 24px;
}

/* ── Left Column: Contact ── */
.contact-list { display: flex; flex-direction: column; gap: 24px; }
.contact-item { display: flex; align-items: flex-start; gap: 16px; }
.contact-icon { color: #60a5fa; margin-top: 2px; flex-shrink: 0; }
.contact-text { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.contact-text label { font-size: 11px; color: var(--text-muted); }
.contact-text span {
  font-size: 15px; color: var(--text-primary);
  font-weight: 500; line-height: 1.4; word-break: break-word;
}
.wa-detail-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #25d366 !important;
  text-decoration: none !important;
  font-weight: 600;
  transition: all 0.2s ease;
  width: fit-content;
}
.wa-detail-link:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.wa-pill-sm {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(37, 211, 102, 0.14);
  border: 1px solid rgba(37, 211, 102, 0.3);
  color: #25d366;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}
.wa-detail-link:hover .wa-pill-sm {
  background: rgba(37, 211, 102, 0.25);
  border-color: rgba(37, 211, 102, 0.6);
  color: #4ade80;
}

.lead-card-notes { background: rgba(255,255,255,0.02); }
.notes-text { font-size: 14px; color: var(--text-secondary); font-style: italic; line-height: 1.6; white-space: pre-wrap; }
:deep(.notes-link) { color: #60a5fa; text-decoration: underline; transition: opacity 0.2s; }
:deep(.notes-link:hover) { opacity: 0.8; }

/* ── Center Column: Timeline ── */
.timeline-header {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 24px;
}
.btn-activity {
  font-size: 12px; color: var(--accent-orange);
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 6px;
  border: 1px solid rgba(245,158,11,0.3);
  transition: background 0.2s;
}
.btn-activity:hover { background: rgba(245,158,11,0.1); }

.timeline-container { position: relative; padding-left: 12px; }
.timeline-item {
  position: relative;
  padding-bottom: 32px;
  padding-left: 36px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.timeline-item:last-child { padding-bottom: 0; }
.timeline-item:hover .timeline-content {
  border-color: var(--accent-orange);
  background: rgba(245,158,11,0.05);
}
.timeline-line {
  position: absolute; left: 10px; top: 24px; bottom: -4px;
  width: 2px; background: #6b7280;
}
.timeline-line-fill {
  width: 100%;
  background: var(--accent-orange);
  transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}
.timeline-icon {
  position: absolute; left: -2px; top: 0;
  width: 24px; height: 24px; border-radius: 50%;
  border: 2px solid; display: flex; align-items: center;
  justify-content: center; background: var(--bg-card); z-index: 1;
  transition: border-color 0.5s ease, color 0.5s ease, background-color 0.5s ease;
}
.timeline-content {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-color);
  border-radius: 10px; padding: 16px 20px;
  transition: border-color 0.3s ease, background-color 0.3s ease;
}
.timeline-top {
  display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 8px;
}
.timeline-top h3 {
  font-size: 15px; font-weight: 700;
  color: var(--text-primary); margin: 0;
}
.timeline-date { font-size: 11px; color: var(--text-muted); }
.timeline-content p {
  font-size: 13px; color: var(--text-secondary);
  line-height: 1.5; margin: 0;
}
.timeline-link-btn {
  background: rgba(245,158,11,0.12);
  border: none; border-radius: 4px;
  color: var(--accent-orange);
  padding: 3px 5px;
  cursor: pointer;
  display: flex; align-items: center;
  transition: background 0.2s;
}
.timeline-link-btn:hover { background: rgba(245,158,11,0.25); }

/* ── Activity Link Banner ── */
.activity-link-banner {
  margin-top: 12px;
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 8px;
  font-size: 13px; color: var(--accent-orange);
  cursor: pointer;
  transition: background 0.2s;
}
.activity-link-banner:hover { background: rgba(245,158,11,0.15); }

/* ── Right Column: Scope & Value ── */
.scope-list {
  display: flex; flex-direction: column; gap: 20px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 24px;
}
.scope-item { display: flex; align-items: center; gap: 16px; }
.scope-icon {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(245,158,11,0.1);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.scope-text { display: flex; flex-direction: column; gap: 4px; }
.scope-text label { font-size: 11px; color: var(--text-muted); }
.scope-text span { font-size: 15px; font-weight: 700; color: var(--text-primary); }

.est-value-section { margin-bottom: 32px; }
.est-value { display: flex; align-items: baseline; gap: 6px; }
.est-currency { font-size: 14px; font-weight: 800; color: var(--accent-orange); }
.est-amount { font-size: 32px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; }

.map-placeholder {
  margin-top: auto; height: 160px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.5) 100%);
  border: 1px solid var(--border-color);
  border-radius: 12px; position: relative; overflow: hidden;
}
.map-pin {
  position: absolute; top: 40%; left: 80%;
  width: 28px; height: 28px; background: var(--accent-orange);
  border-radius: 50%; display: flex; align-items: center;
  justify-content: center; color: #fff;
  transform: translate(-50%, -50%);
  box-shadow: 0 4px 12px rgba(245,158,11,0.4);
}
.map-info {
  position: absolute; bottom: 0; left: 0; right: 0;
  padding: 16px; display: flex; flex-direction: column; gap: 4px;
}
.map-info label { font-size: 10px; font-weight: 700; color: var(--accent-orange); letter-spacing: 0.1em; }
.map-info span { font-size: 13px; color: var(--text-primary); }

/* ── Footer ── */
.lead-footer {
  display: flex; justify-content: space-between;
  align-items: center; padding: 0 8px;
  font-size: 11px; color: var(--text-muted);
}
.lead-footer-right { display: flex; align-items: center; }

/* ── Survey History ── */
.survei-history-section {
  display: flex; flex-direction: column; gap: 8px;
}
.penawaran-history-section {
  display: flex; flex-direction: column; gap: 8px;
}
.history-empty-box {
  font-size: 12px;
  color: var(--text-muted);
  font-style: italic;
  padding: 12px;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  text-align: center;
}
.survei-list {
  display: flex; flex-direction: column; gap: 10px;
}
.penawaran-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.survei-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.penawaran-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.survei-item:hover {
  background: rgba(255,255,255,0.05);
  border-color: var(--accent-orange);
}
.penawaran-item:hover {
  background: rgba(255,255,255,0.05);
  border-color: var(--accent-orange);
}
.survei-item-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
}
.penawaran-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}
.penawaran-number {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}
.penawaran-status {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(59,130,246,0.14);
  color: #60a5fa;
}
.penawaran-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.penawaran-total {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 600;
}
.survei-date {
  font-size: 11px; color: var(--text-secondary); display: flex; align-items: center;
}
.survei-status {
  font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
}
.status-dijadwalkan { background: rgba(245,158,11,0.15); color: #f59e0b; }
.status-selesai { background: rgba(16,185,129,0.15); color: #10b981; }
.status-batal { background: rgba(239,68,68,0.15); color: #ef4444; }

.survei-lokasi, .survei-surveyor {
  font-size: 12px; color: var(--text-primary); display: flex; align-items: center; margin-bottom: 4px; line-height: 1.4;
}
.survei-surveyor {
  color: var(--text-secondary);
}

/* ── Skeletons ── */
.sk-header { height: 120px; background: rgba(255,255,255,0.03); border-radius: 12px; margin-bottom: 24px; animation: pulse 1.5s infinite ease-in-out; }
.sk-col { height: 400px; background: rgba(255,255,255,0.03); border-radius: 12px; animation: pulse 1.5s infinite ease-in-out; }
@keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }

/* ── Sewa & Contract Badges / Panels in CRM Detail ── */
.badge-sewa-lg {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.badge-langsung-lg {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 20px;
}
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
.btn-convert-sewa {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3);
}
.btn-convert-sewa:hover {
  background: linear-gradient(135deg, #9333ea 0%, #6d28d9 100%) !important;
}

/* ── Detail Sewa Box ── */
.contract-model-card {
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.detail-sewa-box {
  background: rgba(168, 85, 247, 0.05);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
}
.dsb-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
  margin-bottom: 6px;
}
.dsb-label {
  color: var(--text-muted);
}
.dsb-val {
  color: var(--text-primary);
  font-weight: 500;
}
.dsb-cicilan-box {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 6px;
  padding: 8px 10px;
  margin-top: 8px;
  text-align: center;
}
.edit-contract-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px;
}
.type-segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.type-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
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
.btn-quick-durasi-mini {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 10.5px;
  border-radius: 4px;
  padding: 2px 5px;
  cursor: pointer;
}
.btn-quick-durasi-mini:hover {
  background: rgba(168, 85, 247, 0.2);
  color: #e9d5ff;
  border-color: #a855f7;
}
.sewa-sim-banner {
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Convert to Proyek Modal Styles ── */
.convert-modal-box {
  max-width: 620px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}
.convert-modal-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.15);
  color: var(--accent-orange);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.access-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  margin-top: 6px;
}
.access-type-card {
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.access-type-card:hover {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.03);
}
.access-type-card.active {
  border-color: var(--accent-orange);
  background: rgba(245, 158, 11, 0.1);
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);
}
.access-type-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.access-type-desc {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}
.access-config-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 14px;
}
.team-members-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}
.team-member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.team-member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.2);
  color: var(--accent-orange);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.btn-icon-danger {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s, background 0.2s;
}
.btn-icon-danger:hover {
  opacity: 1;
  background: rgba(239, 68, 68, 0.15);
}
.role-select-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.role-select-chip:hover {
  border-color: rgba(245, 158, 11, 0.5);
}
.role-select-chip.selected {
  border-color: var(--accent-orange);
  background: rgba(245, 158, 11, 0.15);
  color: var(--text-primary);
  font-weight: 600;
}
.role-chip-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.convert-summary-box {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 14px;
}
</style>
