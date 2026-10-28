<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { ArrowLeft, Trash2, Building2, User, Phone, Mail, Users, ChevronRight, Clock, ClipboardCheck, Handshake, CheckCircle2, PauseCircle, ShoppingCart, Package, DollarSign, Wallet, Receipt, FileText, AlertCircle, RefreshCw, Repeat, Sparkles, X, Plus, UserCircle, Shield, Globe } from '@lucide/vue'
import {
  proyeksApi,
  proyekTimApi,
  usersApi,
  type ProyekResponse, type StatusProyek, type UserResponse
} from '@/services/api'
import { getWaWebLink } from '@/utils/whatsapp'
import WhatsAppIcon from '@/components/WhatsAppIcon.vue'

const route = useRoute()
const router = useRouter()
const proyekId = Number(route.params.id)

const statusFlow: StatusProyek[] = ['Belum Dimulai', 'Berjalan', 'QC', 'Serah Terima', 'Selesai']

interface StatusCard {
  key: StatusProyek
  label: string
  desc: string
  icon: any
  color: string
  bg: string
  border: string
  route?: string  // null if not clickable (Belum Dimulai / Selesai don't have sub-pages yet)
  subLabel: string
}

const statusCards: StatusCard[] = [
  {
    key: 'Belum Dimulai',
    label: 'Belum Dimulai',
    desc: 'Proyek terdaftar, menunggu kickoff lapangan.',
    icon: PauseCircle,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.2)',
    subLabel: '—',
  },
  {
    key: 'Berjalan',
    label: 'Berjalan',
    desc: 'Catatan aktivitas harian tim lapangan.',
    icon: Clock,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    route: 'pekerjaan',
    subLabel: 'Lihat Log Pekerjaan →',
  },
  {
    key: 'QC',
    label: 'QC / Pengujian',
    desc: 'Checklist quality control sebelum serah terima.',
    icon: ClipboardCheck,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    route: 'qc',
    subLabel: 'Lihat QC Sheet →',
  },
  {
    key: 'Serah Terima',
    label: 'Serah Terima',
    desc: 'Proses serah terima dan tanda tangan klien.',
    icon: Handshake,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.25)',
    route: 'serah-terima',
    subLabel: 'Lihat Detail Serah Terima →',
  },
  {
    key: 'Selesai',
    label: 'Selesai',
    desc: 'Proyek telah selesai dan diterima klien.',
    icon: CheckCircle2,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    subLabel: '—',
  },
]

const detailProyek = ref<ProyekResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const updating = ref(false)

async function fetchProyekDetail() {
  loading.value = true
  error.value = null
  try {
    const res = await proyeksApi.show(proyekId)
    detailProyek.value = res.data
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat detail proyek'
  } finally {
    loading.value = false
  }
}

const usersList = ref<UserResponse[]>([])
const showAddMemberModal = ref(false)
const memberForm = ref({ user_id: null as number | null, nama: '', role: 'Teknisi Lapangan' })
const memberSaving = ref(false)

const onSelectUserMember = () => {
  if (memberForm.value.user_id) {
    const u = usersList.value.find(user => user.id === memberForm.value.user_id)
    if (u) {
      memberForm.value.nama = u.name
    }
  }
}

const handleAddMember = async () => {
  if (!memberForm.value.nama.trim()) {
    alert('Nama personil / teknisi wajib diisi.')
    return
  }
  memberSaving.value = true
  try {
    await proyekTimApi.add(proyekId, {
      user_id: memberForm.value.user_id,
      nama: memberForm.value.nama.trim(),
      role: memberForm.value.role || 'Teknisi Lapangan',
    })
    showAddMemberModal.value = false
    memberForm.value = { user_id: null, nama: '', role: 'Teknisi Lapangan' }
    await fetchProyekDetail()
  } catch (e: any) {
    alert(e.message || 'Gagal menambahkan anggota tim.')
  } finally {
    memberSaving.value = false
  }
}

const handleRemoveMember = async (timId: number) => {
  if (!confirm('Hapus personil ini dari tim proyek?')) return
  try {
    await proyekTimApi.remove(proyekId, timId)
    await fetchProyekDetail()
  } catch (e: any) {
    alert(e.message || 'Gagal menghapus anggota tim.')
  }
}

onMounted(() => {
  fetchProyekDetail()
  usersApi.list().then(res => {
    usersList.value = res.data
  }).catch(() => {})
})

// ── Status helpers ────────────────────────────────────────────────────────────
const currentStepIdx = computed(() => {
  if (!detailProyek.value) return -1
  return statusFlow.indexOf(detailProyek.value.status)
})

const stepState = (cardKey: StatusProyek) => {
  const p = detailProyek.value
  if (!p) return 'pending'
  if (p.status === 'Hold') return 'hold'
  const cur = statusFlow.indexOf(p.status)
  const step = statusFlow.indexOf(cardKey)
  if (step < cur) return 'done'
  if (step === cur) return 'active'
  return 'pending'
}

const navigateToPhase = (card: StatusCard) => {
  if (!card.route) return
  router.push(`/admin/proyek/${proyekId}/${card.route}`)
}

const advanceStatus = async () => {
  if (!detailProyek.value) return
  const idx = statusFlow.indexOf(detailProyek.value.status)
  if (idx >= 0 && idx < statusFlow.length - 1) {
    const newStatus = statusFlow[idx + 1]
    await setStatus(newStatus)
  }
}

const setStatus = async (s: StatusProyek) => {
  if (!detailProyek.value) return
  updating.value = true
  try {
    const res = await proyeksApi.updateStatus(detailProyek.value.id, s)
    detailProyek.value.status = res.data.status
  } catch (e: any) {
    alert(e.message || 'Gagal mengupdate status')
  } finally {
    updating.value = false
  }
}

const onProgressChange = async (val: number) => {
  if (!detailProyek.value) return
  updating.value = true
  try {
    const res = await proyeksApi.updateProgress(detailProyek.value.id, val)
    detailProyek.value.progress = res.data.progress
  } catch (e: any) {
    alert(e.message || 'Gagal mengupdate progress')
  } finally {
    updating.value = false
  }
}

const nextStatusLabel = computed(() => {
  if (!detailProyek.value) return null
  const idx = statusFlow.indexOf(detailProyek.value.status)
  if (idx >= 0 && idx < statusFlow.length - 1) return statusFlow[idx + 1]
  return null
})

const goBack = () => router.push('/admin/proyek')

const hapusProyek = async () => {
  if (!detailProyek.value) return
  if (confirm(`Yakin ingin menghapus proyek ${detailProyek.value.nama}?`)) {
    try {
      await proyeksApi.delete(detailProyek.value.id)
      router.push('/admin/proyek')
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus proyek')
    }
  }
}

const waLink = (phone: string | null) => getWaWebLink(phone)

const getInitials = (name: string) => {
  if (!name) return 'U'
  const parts = name.split(' ')
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase()
}

// ─── Sewa Management & Modals ─────────────────────────────────────────────────
const showPerpanjangModal      = ref(false)
const showGenerateInvoiceModal = ref(false)
const savingPerpanjang         = ref(false)
const savingGenerate           = ref(false)
const errorPerpanjang          = ref<string | null>(null)
const errorGenerate            = ref<string | null>(null)

const addMonthsToDate = (dateStr: string, months: number) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const formPerpanjang = ref({
  durasi_bulan:      12,
  sewa_mulai_baru:   '',
  sewa_selesai_baru: '',
  nominal:           0,
  skema_pembayaran:  'Bulanan',
  catatan:           '',
  generate_invoices: true,
})

const onDurasiPerpanjangChange = (months: number) => {
  formPerpanjang.value.durasi_bulan = months
  if (formPerpanjang.value.sewa_mulai_baru) {
    formPerpanjang.value.sewa_selesai_baru = addMonthsToDate(formPerpanjang.value.sewa_mulai_baru, months)
  }
}

const openPerpanjangModal = () => {
  const p = detailProyek.value
  if (!p) return
  errorPerpanjang.value = null

  // Start date = next day after current sewa_selesai, or today
  let startStr = new Date().toISOString().slice(0, 10)
  if (p.sewa_selesai) {
    const curEnd = new Date(p.sewa_selesai)
    curEnd.setDate(curEnd.getDate() + 1)
    startStr = curEnd.toISOString().slice(0, 10)
  }

  formPerpanjang.value = {
    durasi_bulan:      12,
    sewa_mulai_baru:   startStr,
    sewa_selesai_baru: addMonthsToDate(startStr, 12),
    nominal:           p.nilai || 40000000,
    skema_pembayaran:  p.skema_pembayaran || 'Bulanan',
    catatan:           `Perpanjangan kontrak sewa ${p.nama}`,
    generate_invoices: true,
  }
  showPerpanjangModal.value = true
}

const submitPerpanjang = async () => {
  if (!formPerpanjang.value.durasi_bulan || !formPerpanjang.value.sewa_selesai_baru) {
    errorPerpanjang.value = 'Durasi dan tanggal selesai perpanjangan wajib diisi'
    return
  }
  savingPerpanjang.value = true
  errorPerpanjang.value  = null
  try {
    const res = await proyeksApi.perpanjangSewa(proyekId, formPerpanjang.value)
    detailProyek.value = res.data
    showPerpanjangModal.value = false
    alert('Masa sewa proyek berhasil diperpanjang!')
  } catch (e: any) {
    errorPerpanjang.value = e.message || 'Gagal memperpanjang sewa'
  } finally {
    savingPerpanjang.value = false
  }
}

const formGenerateInvoice = ref({
  skema:            'Bulanan' as 'Bulanan' | 'Sekaligus',
  ppn:              11,
  jatuh_tempo_hari: 14,
})

const openGenerateInvoiceModal = () => {
  const p = detailProyek.value
  if (!p) return
  errorGenerate.value = null
  formGenerateInvoice.value = {
    skema:            p.skema_pembayaran === 'Sekaligus' ? 'Sekaligus' : 'Bulanan',
    ppn:              11,
    jatuh_tempo_hari: 14,
  }
  showGenerateInvoiceModal.value = true
}

const submitGenerateInvoice = async () => {
  savingGenerate.value = true
  errorGenerate.value  = null
  try {
    const res = await proyeksApi.generateSewaInvoices(proyekId, formGenerateInvoice.value)
    showGenerateInvoiceModal.value = false
    alert(res.message || 'Invoice sewa berhasil digenerate!')
    router.push(`/admin/proyek/${proyekId}/invoice`)
  } catch (e: any) {
    errorGenerate.value = e.message || 'Gagal membuat invoice sewa'
  } finally {
    savingGenerate.value = false
  }
}

// Convert regular project to Sewa
const convertToSewa = async () => {
  if (!detailProyek.value) return
  if (!confirm('Ubah model proyek ini menjadi Kontrak Sewa?')) return
  const today = new Date().toISOString().slice(0, 10)
  try {
    const res = await proyeksApi.update(detailProyek.value.id, {
      tipe_kontrak:      'Sewa',
      sewa_mulai:        detailProyek.value.tanggal || today,
      sewa_selesai:      addMonthsToDate(detailProyek.value.tanggal || today, 12),
      sewa_durasi_bulan: 12,
      skema_pembayaran:  'Bulanan',
      status_sewa:       'Aktif',
    })
    detailProyek.value = res.data
    alert('Model proyek berhasil diubah menjadi Sewa!')
  } catch (e: any) {
    alert(e.message || 'Gagal mengubah model proyek')
  }
}
</script>

<template>
  <AdminLayout>
    <div v-if="loading" class="empty-state" style="padding: 40px; color: var(--text-muted); display:flex; gap:10px; align-items:center; justify-content:center;">
      <RefreshCw :size="20" class="spin-icon" />
      Memuat detail proyek...
    </div>

    <div v-else-if="error" class="empty-state" style="padding: 40px; color: #ef4444; display:flex; gap:10px; align-items:center; justify-content:center; flex-direction:column;">
      <div style="display:flex; align-items:center; gap:8px;"><AlertCircle :size="20" /> {{ error }}</div>
      <button class="btn-ghost" @click="goBack" style="margin-top:16px;">Kembali</button>
    </div>

    <div v-else-if="!detailProyek" style="padding: 20px; color: var(--text-secondary);">
      Proyek tidak ditemukan.
      <br><br>
      <button class="btn-ghost" @click="goBack">Kembali</button>
    </div>

    <div v-else style="max-width: 960px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Header ── -->
      <div class="dp-header">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button class="btn-ghost" style="padding: 8px; border-radius: 8px;" @click="goBack">
            <ArrowLeft :size="20" />
          </button>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 12px; color: var(--accent-orange); font-weight: 600; letter-spacing: 0.05em;">{{ detailProyek.kode }}</span>
              <span v-if="detailProyek.tipe_kontrak === 'Sewa'" class="badge badge-sewa">
                <Repeat :size="11" /> Sewa {{ detailProyek.sewa_durasi_bulan ? detailProyek.sewa_durasi_bulan + ' Bln' : '' }}
              </span>
            </div>
            <h1 style="font-size: 22px; color: var(--text-primary); margin: 4px 0 0; font-weight: 700;">{{ detailProyek.nama }}</h1>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" style="background: var(--bg-card); color: #ef4444; border: 1px solid var(--border-color); box-shadow: none;" @click="hapusProyek">
            <Trash2 :size="16" style="margin-right: 6px;" /> Hapus
          </button>
        </div>
      </div>

      <!-- ── Kontrak Sewa Card (If Sewa) ── -->
      <div v-if="detailProyek.tipe_kontrak === 'Sewa'" class="card card-sewa-panel" style="padding: 24px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="sewa-panel-icon"><Repeat :size="20" /></div>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f3e8ff;">Manajemen Kontrak Sewa</h3>
              <div style="font-size: 12.5px; color: #c084fc;">Layanan sewa IT berkala &amp; fleksibilitas tagihan</div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-primary" style="background: linear-gradient(135deg, #9333ea, #7c3aed); border: none; font-weight: 600;" @click="openPerpanjangModal">
              <Repeat :size="15" style="margin-right: 6px;" /> Perpanjang Sewa
            </button>
            <button class="btn-ghost" style="border: 1px solid rgba(168,85,247,0.4); color: #e9d5ff;" @click="openGenerateInvoiceModal">
              <Sparkles :size="15" style="margin-right: 6px; color: #c084fc;" /> Generate Invoice Sewa
            </button>
          </div>
        </div>

        <!-- Sewa Details Grid -->
        <div class="dp-info-grid sewa-info-grid">
          <div class="dp-info-item">
            <div class="dp-info-label">Periode Sewa Aktif</div>
            <div class="dp-info-value" style="font-weight: 600; color: #fff;">
              <Calendar :size="14" style="color: #c084fc;" />
              {{ detailProyek.sewa_mulai || '—' }} s/d {{ detailProyek.sewa_selesai || '—' }}
            </div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Durasi Kontrak</div>
            <div class="dp-info-value" style="font-weight: 600; display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              {{ detailProyek.sewa_durasi_bulan || 12 }} Bulan
              <span v-if="detailProyek.sisa_hari_sewa !== null" class="sewa-days-badge" :class="detailProyek.sisa_hari_sewa > 30 ? 'safe' : (detailProyek.sisa_hari_sewa > 0 ? 'warning' : 'danger')">
                {{ detailProyek.sisa_hari_sewa > 0 ? detailProyek.sisa_hari_sewa + ' hari tersisa' : 'Telah berakhir' }}
              </span>
            </div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Skema Pembayaran</div>
            <div class="dp-info-value">
              <span class="skema-pill">{{ detailProyek.skema_pembayaran || 'Bulanan' }}</span>
            </div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Total Nilai Kontrak</div>
            <div class="dp-info-value" style="color: #c084fc; font-weight: 700; font-family: monospace; font-size: 15px;">
              {{ detailProyek.nilai_format || 'Rp 0' }}
            </div>
          </div>
          <div class="dp-info-item" v-if="detailProyek.skema_pembayaran === 'Bulanan'">
            <div class="dp-info-label">Tagihan Per Bulan</div>
            <div class="dp-info-value" style="color: #38bdf8; font-weight: 700; font-family: monospace;">
              {{ detailProyek.nominal_per_bulan_format || '—' }} / bln
            </div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Status Masa Sewa</div>
            <div class="dp-info-value">
              <span class="status-sewa-badge">{{ detailProyek.status_sewa || 'Aktif' }}</span>
            </div>
          </div>
        </div>

        <!-- Riwayat Perpanjangan Sewa -->
        <div v-if="detailProyek.perpanjangan_sewas && detailProyek.perpanjangan_sewas.length > 0" style="margin-top: 20px;">
          <h4 style="font-size: 13.5px; font-weight: 700; color: #f3e8ff; margin: 0 0 10px; display: flex; align-items: center; gap: 6px;">
            <Clock :size="14" style="color: #a855f7;" /> Riwayat Perpanjangan Kontrak
          </h4>
          <div class="sewa-history-table-wrap">
            <table class="sewa-history-table">
              <thead>
                <tr>
                  <th>Tgl Perpanjang</th>
                  <th>Periode Baru</th>
                  <th>Durasi</th>
                  <th>Biaya</th>
                  <th>Skema</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="h in detailProyek.perpanjangan_sewas" :key="h.id">
                  <td>{{ h.tanggal_perpanjangan }}</td>
                  <td>{{ h.sewa_mulai_baru }} s/d {{ h.sewa_selesai_baru }}</td>
                  <td><strong style="color: #c084fc;">+{{ h.durasi_bulan }} Bln</strong></td>
                  <td style="color: #c084fc; font-family: monospace; font-weight: 600;">{{ h.nominal_format }}</td>
                  <td><span class="skema-pill-mini">{{ h.skema_pembayaran || 'Bulanan' }}</span></td>
                  <td>{{ h.catatan || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Status Phase Cards ── -->
      <div class="card" style="padding: 24px; margin-bottom: 20px;">
        <h3 class="dp-section-title">
          <CheckCircle2 :size="16" style="color: var(--accent-orange);" />
          Alur Status Proyek
        </h3>

        <!-- Hold banner -->
        <div v-if="detailProyek.status === 'Hold'" class="dp-hold-banner">
          ⚠️ Proyek sedang ditahan (Hold).
          <button class="dp-btn-resume" @click="setStatus('Berjalan')">Lanjutkan Proyek</button>
        </div>

        <!-- Status Cards Grid -->
        <div class="dp-phase-grid">
          <div
            v-for="(card, i) in statusCards"
            :key="card.key"
            class="dp-phase-card"
            :class="{
              'dp-phase-done': stepState(card.key) === 'done',
              'dp-phase-active': stepState(card.key) === 'active',
              'dp-phase-pending': stepState(card.key) === 'pending',
              'dp-phase-clickable': !!card.route && stepState(card.key) !== 'pending',
            }"
            :style="stepState(card.key) === 'active' ? { borderColor: card.border, background: card.bg } : {}"
            @click="stepState(card.key) !== 'pending' && card.route && navigateToPhase(card)"
          >
            <!-- Step number / done check -->
            <div class="dp-phase-num" :style="stepState(card.key) === 'active' ? { background: card.bg, borderColor: card.border, color: card.color } : {}">
              <CheckCircle2 v-if="stepState(card.key) === 'done'" :size="14" />
              <span v-else>{{ i + 1 }}</span>
            </div>

            <div class="dp-phase-body">
              <div class="dp-phase-label" :style="stepState(card.key) === 'active' ? { color: card.color } : {}">
                {{ card.label }}
              </div>
              <div class="dp-phase-desc">{{ card.desc }}</div>
              <div v-if="card.route && stepState(card.key) !== 'pending'" class="dp-phase-link" :style="{ color: card.color }">
                {{ card.subLabel }}
              </div>
            </div>

            <ChevronRight v-if="card.route && stepState(card.key) !== 'pending'" class="dp-phase-chevron" :size="16" :style="{ color: card.color }" />
          </div>
        </div>

        <!-- Progress + Actions -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 24px; flex-wrap: wrap; gap: 16px; padding-top: 20px; border-top: 1px solid var(--border-color);">
          <div style="flex: 1; min-width: 250px;">
            <div class="drawer-section-header" style="margin-bottom: 6px;">
              <span class="drawer-section-label">Progress Keseluruhan</span>
              <span class="drawer-pct">{{ detailProyek.progress }}%</span>
            </div>
            <input type="range" min="0" max="100" step="5" :value="detailProyek.progress" class="drawer-slider"
              @input="onProgressChange(Number(($event.target as HTMLInputElement).value))" />
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button v-if="detailProyek.status !== 'Hold' && detailProyek.status !== 'Selesai'" class="dp-btn-hold" @click="setStatus('Hold')">
              ⏸ Tahan (Hold)
            </button>
            <button v-if="nextStatusLabel && detailProyek.status !== 'Hold'" class="dp-btn-advance" @click="advanceStatus">
              → Lanjut: {{ nextStatusLabel }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Informasi Client ── -->
      <div class="card" style="padding: 24px; margin-bottom: 20px;">
        <h3 class="dp-section-title">
          <User :size="16" style="color: var(--accent-orange);" />
          Informasi Client
        </h3>
        <div class="dp-info-grid">
          <div class="dp-info-item">
            <div class="dp-info-label">Nama Perusahaan</div>
            <div class="dp-info-value">
              <Building2 :size="14" style="color: var(--text-muted);" />
              {{ detailProyek.perusahaan }}
            </div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Nama Client (PIC)</div>
            <div class="dp-info-value">{{ detailProyek.client_nama || '—' }}</div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">WhatsApp</div>
            <div class="dp-info-value">
              <WhatsAppIcon :size="14" style="color: #25d366; flex-shrink:0;" />
              <a v-if="detailProyek.phone" :href="waLink(detailProyek.phone)" target="_blank" rel="noopener" style="color: #25d366; text-decoration: none; font-weight: 500;" title="Buka WhatsApp Web">{{ detailProyek.phone }}</a>
              <span v-else>—</span>
            </div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Email</div>
            <div class="dp-info-value">
              <Mail :size="14" style="color: var(--text-muted);" />
              {{ detailProyek.email || '—' }}
            </div>
          </div>
        </div>
      </div>

      <!-- ── Informasi Internal ── -->
      <div class="card" style="padding: 24px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="dp-section-title" style="margin: 0;">Informasi Internal Proyek</h3>
          <button
            v-if="detailProyek.tipe_kontrak !== 'Sewa'"
            @click="convertToSewa"
            class="btn-subtle-sewa"
            title="Ubah model proyek menjadi Kontrak Sewa IT"
          >
            <Repeat :size="13" /> Jadikan Kontrak Sewa
          </button>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; font-size: 14px;">{{ detailProyek.deskripsi || '—' }}</p>
        <div class="dp-info-grid">
          <div class="dp-info-item">
            <div class="dp-info-label">PIC Internal</div>
            <div class="dp-info-value">{{ detailProyek.pic || '—' }}</div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Hak Akses Proyek</div>
            <div class="dp-info-value" style="display:flex; align-items:center; gap:6px;">
              <span v-if="detailProyek.akses_tipe === 'personal'" style="display:inline-flex; align-items:center; gap:4px; color:#f59e0b; font-weight:600;">
                <UserCircle :size="14" /> Personal (PIC &amp; Tim)
              </span>
              <span v-else-if="detailProyek.akses_tipe === 'role'" style="display:inline-flex; align-items:center; gap:4px; color:#60a5fa; font-weight:600;">
                <Shield :size="14" /> Berdasarkan Role ({{ (detailProyek.allowed_roles || []).join(', ') }})
              </span>
              <span v-else style="display:inline-flex; align-items:center; gap:4px; color:#34d399; font-weight:600;">
                <Globe :size="14" /> Semua Pengguna (Publik)
              </span>
            </div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Divisi</div>
            <div class="dp-info-value">{{ detailProyek.divisi || '—' }}</div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Kategori</div>
            <div class="dp-info-value">{{ detailProyek.kategori || '—' }}</div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Nilai Proyek</div>
            <div class="dp-info-value" style="color: var(--accent-orange); font-weight: 700; font-family: monospace;">{{ detailProyek.nilai_format || 'Rp 0' }}</div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Mulai</div>
            <div class="dp-info-value">{{ detailProyek.tanggal || '—' }}</div>
          </div>
          <div class="dp-info-item">
            <div class="dp-info-label">Target Selesai</div>
            <div class="dp-info-value">{{ detailProyek.target_selesai || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- ── Tim Proyek ── -->
      <div class="card" style="padding: 24px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 class="dp-section-title" style="margin: 0;">
            <Users :size="16" style="color: var(--accent-orange);" />
            Tim Proyek (Personil &amp; Teknisi)
          </h3>
          <button
            type="button"
            class="btn-primary"
            style="padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 6px;"
            @click="showAddMemberModal = true"
          >
            <Plus :size="14" /> Tambah Teknisi / Tim
          </button>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <div v-if="!detailProyek.tim || detailProyek.tim.length === 0" style="color: var(--text-muted); font-size: 13.5px;">
            Belum ada tim yang ditugaskan. Klik "Tambah Teknisi / Tim" untuk memberi hak akses personal.
          </div>
          <div v-else v-for="member in detailProyek.tim" :key="member.id" class="dp-member-card" style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px;">
            <div class="dp-member-avatar">{{ getInitials(member.nama_anggota || member.nama) }}</div>
            <div style="flex: 1;">
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">{{ member.nama_anggota || member.nama }}</div>
              <div style="font-size: 12px; color: var(--text-muted);">{{ member.role || 'Anggota Tim' }}</div>
            </div>
            <button
              type="button"
              class="btn-icon-danger"
              style="margin-left: 6px; padding: 4px; background: transparent; border: none; color: #ef4444; cursor: pointer;"
              @click="handleRemoveMember(member.id)"
              title="Hapus dari tim"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- ── Procurement ── -->
      <div
        class="card dp-procurement-card"
        style="padding: 20px 24px; cursor: pointer; margin-bottom: 12px;"
        @click="router.push(`/admin/proyek/${proyekId}/procurement`)"
      >
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="dp-proc-icon">
              <ShoppingCart :size="20" />
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px;">Procurement Material</div>
              <div style="font-size: 13px; color: var(--text-muted);">Kelola daftar pembelian barang &amp; material proyek</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;">Buka Halaman</div>
            <div style="font-size: 13px; color: var(--accent-orange); font-weight: 600;">Lihat Procurement →</div>
          </div>
        </div>
      </div>

      <!-- ── Fee Tim ── -->
      <div
        class="card dp-procurement-card"
        style="padding: 20px 24px; cursor: pointer; border-color: rgba(168,85,247,0.2);"
        @click="router.push(`/admin/proyek/${proyekId}/fee-tim`)"
      >
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="dp-proc-icon" style="background: rgba(168,85,247,0.12); color: #a855f7;">
              <Wallet :size="20" />
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px;">Fee &amp; Pengeluaran Tim</div>
              <div style="font-size: 13px; color: var(--text-muted);">Kelola pembayaran karyawan tetap &amp; freelance proyek ini</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;">Buka Halaman</div>
            <div style="font-size: 13px; color: #a855f7; font-weight: 600;">Lihat Fee Tim →</div>
          </div>
        </div>
      </div>

      <!-- ── Biaya Lain-lain ── -->
      <div
        class="card dp-procurement-card"
        style="padding: 20px 24px; cursor: pointer; border-color: rgba(239,68,68,0.2); margin-top: 12px;"
        @click="router.push(`/admin/proyek/${proyekId}/biaya-lain`)"
      >
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="dp-proc-icon" style="background: rgba(239,68,68,0.12); color: #ef4444;">
              <Receipt :size="20" />
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px;">Biaya Lain-lain</div>
              <div style="font-size: 13px; color: var(--text-muted);">Catat pengeluaran operasional, BBM, konsumsi, alat, dan biaya tidak terduga</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;">Buka Halaman</div>
            <div style="font-size: 13px; color: #ef4444; font-weight: 600;">Lihat Biaya →</div>
          </div>
        </div>
      </div>

      <!-- ── Invoice ── -->
      <div
        class="card dp-procurement-card"
        style="padding: 20px 24px; cursor: pointer; border-color: rgba(59,130,246,0.2); margin-top: 12px;"
        @click="router.push(`/admin/proyek/${proyekId}/invoice`)"
      >
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div class="dp-proc-icon" style="background: rgba(59,130,246,0.12); color: #3b82f6;">
              <FileText :size="20" />
            </div>
            <div>
              <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 3px;">Invoice & Penagihan</div>
              <div style="font-size: 13px; color: var(--text-muted);">Kelola invoice DP, termin, dan pelunasan kepada klien</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px;">Buka Halaman</div>
            <div style="font-size: 13px; color: #3b82f6; font-weight: 600;">Lihat Invoice →</div>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Modal Perpanjang Sewa ────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showPerpanjangModal" class="modal-overlay" @click.self="showPerpanjangModal = false">
        <div class="modal-box" style="max-width: 580px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <Repeat :size="18" style="color: #c084fc;" />
              <h2 style="font-size: 16px; margin: 0;">Perpanjang Kontrak Sewa</h2>
            </div>
            <button class="modal-close" @click="showPerpanjangModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <div class="sewa-modal-banner">
              <div style="font-size: 13px; font-weight: 600; color: #f3e8ff; margin-bottom: 3px;">
                {{ detailProyek?.nama }}
              </div>
              <div style="font-size: 12px; color: #d8b4fe;">
                Selesai saat ini: <strong>{{ detailProyek?.sewa_selesai || '—' }}</strong>
              </div>
            </div>

            <!-- Durasi Tambahan -->
            <div class="form-row single" style="margin-top: 14px;">
              <div class="form-field">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin: 0;">Durasi Perpanjangan (Bulan) *</label>
                  <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn-quick-durasi" @click="onDurasiPerpanjangChange(6)">+6 Bln</button>
                    <button type="button" class="btn-quick-durasi" @click="onDurasiPerpanjangChange(12)">+12 Bln (1 Thn)</button>
                    <button type="button" class="btn-quick-durasi" @click="onDurasiPerpanjangChange(24)">+24 Bln (2 Thn)</button>
                  </div>
                </div>
                <input
                  v-model.number="formPerpanjang.durasi_bulan"
                  type="number"
                  min="1"
                  class="form-input"
                  @input="onDurasiPerpanjangChange(formPerpanjang.durasi_bulan)"
                />
              </div>
            </div>

            <!-- Tanggal Mulai & Selesai Baru -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal Mulai Baru</label>
                <input v-model="formPerpanjang.sewa_mulai_baru" type="date" class="form-input" @change="onDurasiPerpanjangChange(formPerpanjang.durasi_bulan)" />
              </div>
              <div class="form-field">
                <label class="form-label">Tanggal Berakhir Baru *</label>
                <input v-model="formPerpanjang.sewa_selesai_baru" type="date" class="form-input" />
              </div>
            </div>

            <!-- Biaya Perpanjangan & Skema -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Biaya Perpanjangan (Rp) *</label>
                <input v-model.number="formPerpanjang.nominal" type="number" min="0" step="100000" class="form-input" />
                <span class="form-hint" v-if="formPerpanjang.nominal > 0 && formPerpanjang.durasi_bulan > 0">
                  ≈ Rp {{ Math.round(formPerpanjang.nominal / formPerpanjang.durasi_bulan).toLocaleString('id-ID') }} / bulan
                </span>
              </div>
              <div class="form-field">
                <label class="form-label">Skema Penagihan</label>
                <select v-model="formPerpanjang.skema_pembayaran" class="form-select">
                  <option value="Bulanan">Bulanan (Cicil per bulan)</option>
                  <option value="Sekaligus">Sekaligus (Bayar Lunas Awal)</option>
                </select>
              </div>
            </div>

            <!-- Catatan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Catatan Perpanjangan</label>
                <textarea v-model="formPerpanjang.catatan" class="form-textarea" placeholder="Contoh: Perpanjangan lisensi dan server untuk tahun berikutnya..."></textarea>
              </div>
            </div>

            <!-- Auto generate invoice checkbox -->
            <div style="margin-top: 8px; padding: 10px 12px; background: rgba(168, 85, 247, 0.06); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 6px; display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" id="chkAutoInvoice" v-model="formPerpanjang.generate_invoices" style="cursor: pointer;" />
              <label for="chkAutoInvoice" style="font-size: 13px; color: var(--text-primary); cursor: pointer; user-select: none;">
                Otomatis buat tagihan invoice baru untuk periode perpanjangan ini
              </label>
            </div>

            <div v-if="errorPerpanjang" style="color: #ef4444; font-size: 13px; margin-top: 10px;">{{ errorPerpanjang }}</div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="showPerpanjangModal = false" :disabled="savingPerpanjang">Batal</button>
            <button class="btn-primary btn-half btn-sewa-accent" @click="submitPerpanjang" :disabled="savingPerpanjang">
              {{ savingPerpanjang ? 'Memperpanjang...' : 'Perpanjang Sekarang' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Generate Invoice Sewa ──────────────────────── -->
    <Teleport to="body">
      <div v-if="showGenerateInvoiceModal" class="modal-overlay" @click.self="showGenerateInvoiceModal = false">
        <div class="modal-box" style="max-width: 540px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <Sparkles :size="18" style="color: #3b82f6;" />
              <h2 style="font-size: 16px; margin: 0;">Generate Tagihan Invoice Sewa</h2>
            </div>
            <button class="modal-close" @click="showGenerateInvoiceModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px;">
              Sistem akan otomatis mengenerate draft invoice berulang dengan nomor urut resmi untuk proyek sewa ini.
            </p>

            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Skema Pembayaran *</label>
                <div class="type-segment">
                  <button
                    type="button"
                    class="type-btn"
                    :class="{ active: formGenerateInvoice.skema === 'Bulanan' }"
                    @click="formGenerateInvoice.skema = 'Bulanan'"
                  >
                    📅 Bulanan ({{ detailProyek?.sewa_durasi_bulan || 12 }}x Invoice)
                  </button>
                  <button
                    type="button"
                    class="type-btn"
                    :class="{ active: formGenerateInvoice.skema === 'Sekaligus' }"
                    @click="formGenerateInvoice.skema = 'Sekaligus'"
                  >
                    💰 Sekaligus (1x Bayar Penuh)
                  </button>
                </div>
              </div>
            </div>

            <!-- Simulasi Invoice Box -->
            <div class="invoice-sim-box">
              <div style="font-size: 12.5px; color: var(--text-muted); margin-bottom: 6px;">Simulasi Nominal Tagihan:</div>
              <div v-if="formGenerateInvoice.skema === 'Bulanan'" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; color: var(--text-primary); font-weight: 600;">
                  {{ detailProyek?.sewa_durasi_bulan || 12 }} Invoice Bulanan
                </span>
                <span style="font-size: 15px; font-weight: 700; color: #10b981; font-family: monospace;">
                  {{ detailProyek?.nominal_per_bulan ? 'Rp ' + Number(detailProyek.nominal_per_bulan).toLocaleString('id-ID') + ' / bln' : '—' }}
                </span>
              </div>
              <div v-else style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 14px; color: var(--text-primary); font-weight: 600;">1 Invoice Penuh</span>
                <span style="font-size: 15px; font-weight: 700; color: #10b981; font-family: monospace;">
                  {{ detailProyek?.nilai_format || 'Rp 0' }}
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Jatuh Tempo (Hari dari terbit)</label>
                <input v-model.number="formGenerateInvoice.jatuh_tempo_hari" type="number" min="1" max="90" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">PPN (%)</label>
                <input v-model.number="formGenerateInvoice.ppn" type="number" min="0" max="100" class="form-input" />
              </div>
            </div>

            <div v-if="errorGenerate" style="color: #ef4444; font-size: 13px; margin-top: 10px;">{{ errorGenerate }}</div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="showGenerateInvoiceModal = false" :disabled="savingGenerate">Batal</button>
            <button class="btn-primary btn-half" @click="submitGenerateInvoice" :disabled="savingGenerate">
              {{ savingGenerate ? 'Mengenerate...' : 'Buat Invoice Sekarang' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Tambah Anggota / Teknisi Proyek ── -->
    <Teleport to="body">
      <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
        <div class="modal-box" style="max-width: 480px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <Users :size="20" style="color: var(--accent-orange);" />
              <div>
                <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 0;">Tambah Personil / Teknisi Proyek</h2>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Memberikan hak akses personal ke proyek ini</div>
              </div>
            </div>
            <button class="modal-close" @click="showAddMemberModal = false"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="form-field" style="margin-bottom: 16px;">
              <label class="form-label" style="font-weight: 600;">Pilih User Internal</label>
              <select v-model="memberForm.user_id" class="form-select" @change="onSelectUserMember">
                <option :value="null">-- Pilih Akun User (atau tulis manual di bawah) --</option>
                <option v-for="u in usersList" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.role?.name || 'Staff' }})
                </option>
              </select>
            </div>
            <div class="form-field" style="margin-bottom: 16px;">
              <label class="form-label" style="font-weight: 600;">Nama Personil / Teknisi *</label>
              <input v-model="memberForm.nama" type="text" class="form-input" placeholder="Masukkan nama..." />
            </div>
            <div class="form-field">
              <label class="form-label" style="font-weight: 600;">Peran / Tugas dalam Proyek</label>
              <input v-model="memberForm.role" type="text" class="form-input" placeholder="misal: Teknisi Lapangan, Drafter, QC..." />
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button type="button" class="btn-ghost btn-half" @click="showAddMemberModal = false" :disabled="memberSaving">Batal</button>
            <button type="button" class="btn-primary btn-half" @click="handleAddMember" :disabled="memberSaving">
              {{ memberSaving ? 'Menyimpan...' : 'Tambahkan ke Tim' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Spin animation ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin-icon { animation: spin 1s linear infinite; }

.dp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.dp-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Info grid ── */
.dp-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  background: rgba(255,255,255,0.02);
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}
.dp-info-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.dp-info-value {
  font-size: 14px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ── Phase cards ── */
.dp-phase-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dp-phase-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255,255,255,0.02);
  transition: all 0.2s ease;
  position: relative;
}
.dp-phase-clickable {
  cursor: pointer;
}
.dp-phase-clickable:hover {
  background: rgba(255,255,255,0.04);
  transform: translateX(4px);
}
.dp-phase-done {
  opacity: 0.75;
}
.dp-phase-pending {
  opacity: 0.45;
}
.dp-phase-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  border: 2px solid var(--border-color);
  background: rgba(255,255,255,0.04);
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all 0.25s;
}
.dp-phase-done .dp-phase-num {
  background: rgba(34,197,94,0.15);
  border-color: #22c55e;
  color: #22c55e;
}
.dp-phase-body {
  flex: 1;
}
.dp-phase-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.dp-phase-done .dp-phase-label {
  color: #22c55e;
}
.dp-phase-pending .dp-phase-label {
  color: var(--text-muted);
}
.dp-phase-desc {
  font-size: 12px;
  color: var(--text-muted);
}
.dp-phase-link {
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
  opacity: 0.85;
}
.dp-phase-chevron {
  opacity: 0.7;
  flex-shrink: 0;
}

/* ── Team member card ── */
.dp-member-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-sidebar);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  flex: 1;
  min-width: 200px;
}
.dp-member-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(245,158,11,0.15);
  color: var(--accent-orange);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

/* ── Buttons ── */
.dp-btn-advance {
  background: rgba(245,158,11,0.15);
  color: var(--accent-orange);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.dp-btn-advance:hover { background: rgba(245,158,11,0.25); }
.dp-btn-hold {
  background: rgba(239,68,68,0.1);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.dp-btn-hold:hover { background: rgba(239,68,68,0.2); }
.dp-btn-resume {
  background: rgba(59,130,246,0.15);
  color: #3b82f6;
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  margin-left: 12px;
}
.dp-hold-banner {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: 10px;
  padding: 12px 16px;
  color: #ef4444;
  font-size: 13.5px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ── Procurement card ── */
.dp-procurement-card {
  transition: all 0.2s ease;
}
.dp-procurement-card:hover {
  background: rgba(245,158,11,0.05);
  border-color: rgba(245,158,11,0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(245,158,11,0.08);
}
.dp-proc-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(245,158,11,0.12);
  color: var(--accent-orange);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Sewa Panel & Badge Styles ── */
.badge-sewa {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.35);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.card-sewa-panel {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%);
  border: 1px solid rgba(168, 85, 247, 0.3);
  position: relative;
  overflow: hidden;
}
.card-sewa-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(180deg, #a855f7, #3b82f6);
}
.sewa-panel-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(168, 85, 247, 0.18);
  color: #c084fc;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.btn-sewa-accent {
  background: linear-gradient(135deg, #a855f7, #9333ea) !important;
  color: #fff !important;
  border: none !important;
  display: inline-flex;
  align-items: center;
}
.btn-sewa-accent:hover {
  background: linear-gradient(135deg, #9333ea, #7e22ce) !important;
  box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
}
.btn-sewa-outline {
  background: rgba(168, 85, 247, 0.1);
  color: #e9d5ff;
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: all 0.2s;
}
.btn-sewa-outline:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
}
.btn-subtle-sewa {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
  border: 1px dashed rgba(168, 85, 247, 0.35);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}
.btn-subtle-sewa:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
  color: #f3e8ff;
}
.sewa-days-badge {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  margin-left: 8px;
  display: inline-block;
}
.sewa-days-badge.safe {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}
.sewa-days-badge.warning {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.sewa-days-badge.danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.skema-pill {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.25);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.status-sewa-badge {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.sewa-history-table-wrap {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.2);
}
.sewa-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.sewa-history-table th {
  padding: 9px 12px;
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.sewa-history-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
}

/* ── Modal Common Styles ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-box {
  background: var(--bg-card, #16181f);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 14px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 18px 24px;
  border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-header h2 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
}
.modal-close:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.06);
}
.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
}
.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.modal-footer-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.btn-half {
  width: 100%;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  justify-content: center;
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}
.btn-primary {
  background: var(--accent-orange, #f59e0b);
  border: none;
  color: #111;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary:hover {
  opacity: 0.9;
}
.btn-primary:disabled, .btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Modal Form Fields ── */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.form-row.single {
  grid-template-columns: 1fr;
}
.form-field {
  display: flex;
  flex-direction: column;
}
.form-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.form-input, .form-select, .form-textarea {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13.5px;
  color: var(--text-primary);
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: #a855f7;
  background: rgba(168, 85, 247, 0.03);
}
.form-textarea {
  min-height: 70px;
  resize: vertical;
}
.form-hint {
  font-size: 11.5px;
  color: #34d399;
  font-weight: 600;
  margin-top: 4px;
}
.sewa-modal-banner {
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
}
.btn-quick-durasi {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary);
  font-size: 11px;
  border-radius: 4px;
  padding: 3px 7px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-quick-durasi:hover {
  background: rgba(168, 85, 247, 0.2);
  color: #e9d5ff;
  border-color: #a855f7;
}
.invoice-sim-box {
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
}
.type-segment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.type-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
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
  background: rgba(59, 130, 246, 0.18);
  border-color: #3b82f6;
  color: #93c5fd;
}
</style>
