<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  ArrowLeft, Trash2, Building2, User, Phone, Mail, Users, ChevronRight,
  Clock, ClipboardCheck, Handshake, CheckCircle2, PauseCircle, ShoppingCart,
  Package, DollarSign, Wallet, Receipt, FileText, AlertCircle, RefreshCw,
  Repeat, Sparkles, X, Plus, UserCircle, Shield, Globe, BookOpen, CreditCard, Eye
} from '@lucide/vue'
import {
  proyeksApi,
  proyekTimApi,
  proyekPembayaransApi,
  usersApi,
  type ProyekResponse, type StatusProyek, type UserResponse,
  type SewaJadwalItem, type SewaJadwalSummary, type ProyekPembayaranResponse
} from '@/services/api'
import { getWaWebLink } from '@/utils/whatsapp'
import { formatRp } from '@/utils/currency'
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
    if (res.data.tipe_kontrak === 'Sewa') {
      fetchSewaJadwal()
    }
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
    await fetchSewaJadwal()
  } catch (e: any) {
    alert(e.message || 'Gagal mengubah model proyek')
  }
}

// ─── Sewa Jadwal & Pembayaran (Otomatis ke Pembukuan) ────────────────────────
const sewaJadwalList    = ref<SewaJadwalItem[]>([])
const sewaSummary       = ref<SewaJadwalSummary | null>(null)
const loadingSewaJadwal = ref(false)

async function fetchSewaJadwal() {
  if (detailProyek.value?.tipe_kontrak !== 'Sewa') return
  loadingSewaJadwal.value = true
  try {
    const res = await proyekPembayaransApi.sewaJadwal(proyekId)
    sewaJadwalList.value = res.data.jadwal
    sewaSummary.value = res.data.summary
  } catch (e: any) {
    console.error('Gagal memuat jadwal sewa:', e)
  } finally {
    loadingSewaJadwal.value = false
  }
}

// ─── Modal Catat Pembayaran Sewa ─────────────────────────────────────────────
const showBayarModal       = ref(false)
const savingBayar          = ref(false)
const errorBayar           = ref<string | null>(null)
const selectedJadwalItem   = ref<SewaJadwalItem | null>(null)

const metodeOptions = [
  'Transfer Bank BCA',
  'Transfer Bank Mandiri',
  'Transfer Bank BRI',
  'Transfer Bank BNI',
  'Transfer Bank Lainnya',
  'Tunai / Cash',
  'QRIS',
  'Lainnya',
]

const formBayar = ref({
  bulan_ke:          1,
  periode_bulan:     '',
  tanggal_bayar:     new Date().toISOString().slice(0, 10),
  nominal:           0,
  metode_pembayaran: 'Transfer Bank BCA',
  catatan:           '',
  masuk_pembukuan:   true,
})

const openBayarModal = (item: SewaJadwalItem) => {
  selectedJadwalItem.value = item
  errorBayar.value = null
  formBayar.value = {
    bulan_ke:          item.bulan_ke,
    periode_bulan:     item.periode_bulan,
    tanggal_bayar:     new Date().toISOString().slice(0, 10),
    nominal:           item.nominal_tagihan,
    metode_pembayaran: 'Transfer Bank BCA',
    catatan:           `Pembayaran sewa ${item.periode_bulan} - ${detailProyek.value?.nama}`,
    masuk_pembukuan:   true,
  }
  showBayarModal.value = true
}

const submitBayar = async () => {
  if (!formBayar.value.nominal || formBayar.value.nominal <= 0) {
    errorBayar.value = 'Nominal pembayaran wajib diisi dan lebih dari 0'
    return
  }
  savingBayar.value = true
  errorBayar.value = null
  try {
    const res = await proyekPembayaransApi.create(proyekId, formBayar.value)
    showBayarModal.value = false
    alert(res.message || 'Pembayaran berhasil dicatat dan otomatis masuk ke Pembukuan!')
    await fetchSewaJadwal()
  } catch (e: any) {
    errorBayar.value = e.message || 'Gagal mencatat pembayaran'
  } finally {
    savingBayar.value = false
  }
}

const deletePembayaran = async (pembayaranId: number) => {
  if (!confirm('Hapus riwayat pembayaran ini? Catatan transaksi kas masuk di Pembukuan juga akan otomatis dihapus.')) return
  try {
    const res = await proyekPembayaransApi.delete(proyekId, pembayaranId)
    alert(res.message || 'Pembayaran berhasil dihapus')
    await fetchSewaJadwal()
  } catch (e: any) {
    alert(e.message || 'Gagal menghapus pembayaran')
  }
}

// ─── Modal Detail Pembayaran ─────────────────────────────────────────────────
const showDetailBayarModal     = ref(false)
const activePembayaranDetail   = ref<ProyekPembayaranResponse | null>(null)

const openDetailBayarModal = (pmt: ProyekPembayaranResponse | null) => {
  if (!pmt) return
  activePembayaranDetail.value = pmt
  showDetailBayarModal.value = true
}

// ─── Pembayaran Proyek Langsung (Otomatis ke Pembukuan) ──────────────────────
const showDirectPayModal = ref(false)
const directPaySaving    = ref(false)
const directPayForm      = ref({
  nominal: 0,
  tanggal_bayar: new Date().toISOString().slice(0, 10),
  metode_pembayaran: 'Transfer Bank BCA',
  catatan: '',
  masuk_pembukuan: true,
})

const payPercent = computed(() => {
  if (!detailProyek.value) return 0
  if (detailProyek.value.status_pembayaran === 'Lunas') return 100
  const nilai = detailProyek.value.nilai || 0
  const paid = detailProyek.value.total_dibayar || 0
  if (nilai <= 0) return paid > 0 ? 100 : 0
  return Math.min(100, Math.round((paid / nilai) * 100))
})

const formatRupiah = (val?: number | string | null) => formatRp(val)

const openDirectPayModal = () => {
  if (!detailProyek.value) return
  const sisa = (detailProyek.value.sisa_pembayaran !== undefined && detailProyek.value.sisa_pembayaran > 0)
    ? detailProyek.value.sisa_pembayaran
    : (detailProyek.value.nilai || 0)
  directPayForm.value = {
    nominal: sisa > 0 ? sisa : (detailProyek.value.nilai || 0),
    tanggal_bayar: new Date().toISOString().slice(0, 10),
    metode_pembayaran: 'Transfer Bank BCA',
    catatan: `Pelunasan proyek ${detailProyek.value.nama}`,
    masuk_pembukuan: true,
  }
  showDirectPayModal.value = true
}

const submitDirectPayment = async () => {
  if (!detailProyek.value) return
  if (!directPayForm.value.nominal || directPayForm.value.nominal <= 0) {
    alert('Masukkan nominal pembayaran yang valid')
    return
  }
  directPaySaving.value = true
  try {
    const res = await proyeksApi.bayarLangsung(proyekId, directPayForm.value)
    detailProyek.value = res.data
    showDirectPayModal.value = false
    alert(res.message || 'Pembayaran berhasil dicatat dan otomatis masuk ke Pembukuan!')
  } catch (e: any) {
    alert(e.message || 'Gagal mencatat pembayaran')
  } finally {
    directPaySaving.value = false
  }
}

const hapusDirectPayment = async (pembayaranId: number) => {
  if (!confirm('Hapus riwayat pembayaran ini? Catatan transaksi kas masuk di Pembukuan juga akan otomatis dihapus.')) return
  try {
    const res = await proyekPembayaransApi.delete(proyekId, pembayaranId)
    alert(res.message || 'Pembayaran berhasil dihapus')
    await fetchProyekDetail()
  } catch (e: any) {
    alert(e.message || 'Gagal menghapus pembayaran')
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
              <span v-else class="badge" style="background: rgba(59,130,246,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px;">
                Proyek Langsung
              </span>
              <!-- Status Pembayaran Badge -->
              <span
                class="badge"
                :class="detailProyek.status_pembayaran === 'Lunas' ? 'badge-bayar-lunas' : (detailProyek.status_pembayaran === 'Sebagian' ? 'badge-bayar-sebagian' : 'badge-bayar-belum')"
                style="font-size: 11.5px; font-weight: 600; padding: 2px 10px; border-radius: 999px; display: inline-flex; align-items: center; gap: 4px;"
              >
                <CheckCircle2 v-if="detailProyek.status_pembayaran === 'Lunas'" :size="12" />
                <Clock v-else :size="12" />
                {{ detailProyek.status_pembayaran || 'Belum Dibayar' }}
              </span>
            </div>
            <h1 style="font-size: 22px; color: var(--text-primary); margin: 4px 0 0; font-weight: 700;">{{ detailProyek.nama }}</h1>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button
            v-if="detailProyek.tipe_kontrak !== 'Sewa' && detailProyek.status_pembayaran !== 'Lunas'"
            class="btn-primary"
            style="background: linear-gradient(135deg, #16a34a, #15803d); border: none; font-weight: 600; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(22,163,74,0.3);"
            @click="openDirectPayModal"
          >
            <CheckCircle2 :size="15" /> Tandai Dibayar
          </button>
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

        <!-- ── Riwayat & Jadwal Pembayaran Sewa Bulanan (Otomatis ke Pembukuan) ── -->
        <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid rgba(168,85,247,0.25);">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
            <div>
              <h4 style="font-size: 15px; font-weight: 700; color: #f3e8ff; margin: 0 0 4px; display: flex; align-items: center; gap: 8px;">
                <Wallet :size="18" style="color: #c084fc;" />
                Riwayat &amp; Jadwal Pembayaran Sewa Bulanan
                <span class="pembukuan-sync-badge">
                  <BookOpen :size="12" /> Otomatis ke Pembukuan
                </span>
              </h4>
              <p style="font-size: 12.5px; color: #d8b4fe; margin: 0;">
                Pantau pembayaran sewa bulanan. Setiap pembayaran lunas akan otomatis dicatat sebagai kas masuk di Pembukuan.
              </p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <router-link to="/admin/pembukuan" class="btn-ghost-pembukuan" title="Buka buku kas / pembukuan">
                <BookOpen :size="14" /> Buka Pembukuan →
              </router-link>
            </div>
          </div>

          <!-- Summary Mini-Cards -->
          <div v-if="sewaSummary" class="sewa-pembayaran-summary-grid">
            <div class="sewa-sum-card">
              <div class="sewa-sum-label">Total Kontrak Sewa</div>
              <div class="sewa-sum-val">{{ sewaSummary.total_nilai_kontrak_format }}</div>
              <div class="sewa-sum-sub">{{ sewaSummary.total_bulan }} Bulan Kontrak</div>
            </div>
            <div class="sewa-sum-card highlight-green">
              <div class="sewa-sum-label">Sudah Dibayar</div>
              <div class="sewa-sum-val" style="color: #4ade80;">{{ sewaSummary.total_sudah_dibayar_format }}</div>
              <div class="sewa-sum-sub" style="color: #86efac;">{{ sewaSummary.bulan_terbayar }} Bulan Terbayar ({{ sewaSummary.persen_terbayar }}%)</div>
            </div>
            <div class="sewa-sum-card highlight-orange">
              <div class="sewa-sum-label">Sisa Tagihan Sewa</div>
              <div class="sewa-sum-val" style="color: #fb923c;">{{ sewaSummary.sisa_tagihan_format }}</div>
              <div class="sewa-sum-sub" style="color: #fdba74;">{{ sewaSummary.bulan_sisa }} Bulan Belum Dibayar</div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div v-if="sewaSummary" style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; color: #e9d5ff;">
              <span>Progress Pembayaran Sewa</span>
              <span style="font-weight: 700; color: #a7f3d0;">{{ sewaSummary.bulan_terbayar }} / {{ sewaSummary.total_bulan }} Bulan Terbayar ({{ sewaSummary.persen_terbayar }}%)</span>
            </div>
            <div class="sewa-progress-track">
              <div class="sewa-progress-fill" :style="{ width: `${sewaSummary.persen_terbayar}%` }"></div>
            </div>
          </div>

          <!-- Schedule Table -->
          <div v-if="loadingSewaJadwal" style="padding: 24px; text-align: center; color: #c084fc;">
            <RefreshCw :size="18" class="spin-icon" style="margin: 0 auto 8px;" />
            <div>Memuat jadwal pembayaran sewa...</div>
          </div>
          <div v-else class="sewa-history-table-wrap">
            <table class="sewa-history-table sewa-bayar-table">
              <thead>
                <tr>
                  <th>Periode / Bulan</th>
                  <th>Jatuh Tempo</th>
                  <th>Nominal Tagihan</th>
                  <th>Status Bayar</th>
                  <th>Riwayat Pembayaran</th>
                  <th>Sinkronisasi Pembukuan</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in sewaJadwalList" :key="item.bulan_ke" :class="{ 'row-lunas': item.is_paid }">
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="bulan-ke-pill">Bulan {{ item.bulan_ke }}</span>
                      <strong style="color: #fff; font-size: 13.5px;">{{ item.periode_bulan }}</strong>
                    </div>
                  </td>
                  <td>
                    <span style="font-size: 12.5px; color: var(--text-secondary);">{{ item.tanggal_jatuh_tempo }}</span>
                  </td>
                  <td>
                    <strong style="color: #38bdf8; font-family: monospace; font-size: 13.5px;">{{ item.nominal_tagihan_format }}</strong>
                  </td>
                  <td>
                    <span v-if="item.is_paid" class="status-bayar-badge lunas">
                      <CheckCircle2 :size="12" /> Lunas
                    </span>
                    <span v-else-if="item.is_overdue" class="status-bayar-badge overdue">
                      <AlertCircle :size="12" /> Jatuh Tempo
                    </span>
                    <span v-else class="status-bayar-badge pending">
                      <Clock :size="12" /> Menunggu Bayar
                    </span>
                  </td>
                  <td>
                    <div v-if="item.pembayaran" style="font-size: 12px; line-height: 1.4;">
                      <div style="color: #f3e8ff; font-weight: 600;">
                        Dibayar: {{ item.pembayaran.tanggal_bayar }}
                      </div>
                      <div style="color: #c084fc; font-size: 11px;">
                        {{ item.pembayaran.metode_pembayaran }} · <span style="font-family: monospace;">{{ item.pembayaran.nomor_pembayaran }}</span>
                      </div>
                    </div>
                    <div v-else style="color: var(--text-muted); font-size: 12px; font-style: italic;">
                      Belum ada pembayaran
                    </div>
                  </td>
                  <td>
                    <div v-if="item.pembayaran && item.pembayaran.masuk_pembukuan" class="pembukuan-tag">
                      <BookOpen :size="12" />
                      <span>Kas Masuk #{{ item.pembayaran.transaction_id }}</span>
                    </div>
                    <span v-else style="color: var(--text-muted); font-size: 12px;">—</span>
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; justify-content: flex-end; gap: 6px;">
                      <button
                        v-if="!item.is_paid"
                        class="btn-bayar-now"
                        @click="openBayarModal(item)"
                        title="Catat pembayaran untuk bulan ini"
                      >
                        <CreditCard :size="13" /> Bayar Bulan Ini
                      </button>
                      <template v-else>
                        <button
                          class="btn-icon-soft"
                          title="Lihat detail pembayaran"
                          @click="openDetailBayarModal(item.pembayaran)"
                        >
                          <Eye :size="14" />
                        </button>
                        <button
                          class="btn-icon-soft text-danger"
                          title="Hapus pembayaran & batalkan di Pembukuan"
                          @click="deletePembayaran(item.pembayaran.id)"
                        >
                          <Trash2 :size="14" />
                        </button>
                      </template>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── Status & Pembayaran Proyek Langsung (Non-Sewa) ── -->
      <div v-if="detailProyek.tipe_kontrak !== 'Sewa'" class="card card-direct-payment" style="padding: 24px; margin-bottom: 20px;">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="direct-pay-icon" :class="detailProyek.status_pembayaran === 'Lunas' ? 'icon-lunas' : 'icon-pending'">
              <CheckCircle2 v-if="detailProyek.status_pembayaran === 'Lunas'" :size="22" />
              <CreditCard v-else :size="22" />
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">
                  Status &amp; Pembayaran Proyek
                </h3>
                <span
                  class="badge"
                  :class="detailProyek.status_pembayaran === 'Lunas' ? 'badge-lunas-glow' : (detailProyek.status_pembayaran === 'Sebagian' ? 'badge-sebagian-glow' : 'badge-pending-glow')"
                >
                  {{ detailProyek.status_pembayaran === 'Lunas' ? '✓ LUNAS' : (detailProyek.status_pembayaran === 'Sebagian' ? 'SEBAGIAN' : 'BELUM DIBAYAR') }}
                </span>
              </div>
              <div style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                Pelunasan proyek langsung otomatis tersinkronisasi ke Buku Kas Pembukuan
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button
              v-if="detailProyek.status_pembayaran !== 'Lunas'"
              class="btn-primary btn-pay-direct"
              @click="openDirectPayModal"
            >
              <CheckCircle2 :size="15" style="margin-right: 6px;" /> Tandai Dibayar Sekarang
            </button>
            <button
              v-else
              class="btn-ghost"
              style="border: 1px solid rgba(34,197,94,0.4); color: #4ade80; font-weight: 600;"
              @click="openDirectPayModal"
            >
              <Plus :size="15" style="margin-right: 6px;" /> Tambah Pembayaran
            </button>
            <button
              class="btn-ghost"
              style="border: 1px solid var(--border-color); color: var(--text-secondary);"
              @click="router.push('/admin/pembukuan')"
              title="Buka Halaman Pembukuan"
            >
              <BookOpen :size="15" style="margin-right: 6px; color: var(--accent-orange);" /> Buka Pembukuan
            </button>
          </div>
        </div>

        <!-- 4 Stat Summary Cards -->
        <div class="dp-pay-grid">
          <div class="dp-pay-stat">
            <div class="dp-pay-stat-label">Total Nilai Proyek</div>
            <div class="dp-pay-stat-val val-total">{{ detailProyek.nilai_format || 'Rp 0' }}</div>
            <div class="dp-pay-stat-sub">Sesuai nilai kontrak proyek</div>
          </div>
          <div class="dp-pay-stat">
            <div class="dp-pay-stat-label">Total Sudah Dibayar</div>
            <div class="dp-pay-stat-val val-paid">{{ detailProyek.total_dibayar_format || 'Rp 0' }}</div>
            <div class="dp-pay-stat-sub" style="color: #4ade80; font-weight: 600;">
              {{ payPercent }}% Terpenuhi
            </div>
          </div>
          <div class="dp-pay-stat">
            <div class="dp-pay-stat-label">Sisa Tagihan</div>
            <div class="dp-pay-stat-val val-remaining">{{ detailProyek.sisa_pembayaran_format || 'Rp 0' }}</div>
            <div class="dp-pay-stat-sub">
              {{ detailProyek.status_pembayaran === 'Lunas' ? 'Lunas tanpa tunggakan' : 'Menunggu pelunasan klien' }}
            </div>
          </div>
          <div class="dp-pay-stat">
            <div class="dp-pay-stat-label">Sinkronisasi Pembukuan</div>
            <div class="dp-pay-stat-val" style="font-size: 14px; display: flex; align-items: center; gap: 6px;">
              <span v-if="(detailProyek.pembayarans || []).some(p => p.masuk_pembukuan)" style="color: #4ade80; display: inline-flex; align-items: center; gap: 5px; font-weight: 600;">
                <CheckCircle2 :size="16" /> Otomatis Masuk Kas
              </span>
              <span v-else style="color: var(--text-muted); font-size: 13px;">Belum ada kas masuk</span>
            </div>
            <div class="dp-pay-stat-sub">Kategori: Pembayaran Client</div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div style="margin: 18px 0 22px;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
            <span>Progress Pelunasan</span>
            <span style="font-weight: 600; color: var(--text-primary);">{{ payPercent }}%</span>
          </div>
          <div class="pay-prog-track">
            <div class="pay-prog-fill" :style="{ width: payPercent + '%' }"></div>
          </div>
        </div>

        <!-- Riwayat Pembayaran Table / List -->
        <div style="border-top: 1px solid var(--border-color); padding-top: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
              <Receipt :size="15" style="color: var(--accent-orange);" /> Riwayat Pembayaran &amp; Kas Masuk
            </h4>
            <span style="font-size: 12px; color: var(--text-muted);">
              {{ (detailProyek.pembayarans || []).length }} Transaksi
            </span>
          </div>

          <!-- Table if payments exist -->
          <div v-if="detailProyek.pembayarans && detailProyek.pembayarans.length > 0" class="pay-history-table-wrap">
            <table class="pay-history-table">
              <thead>
                <tr>
                  <th>No. Pembayaran</th>
                  <th>Tanggal</th>
                  <th>Metode</th>
                  <th>Nominal</th>
                  <th>Catatan</th>
                  <th>Status Pembukuan</th>
                  <th style="text-align: right;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="pmt in detailProyek.pembayarans" :key="pmt.id">
                  <td style="font-family: monospace; font-weight: 600; color: var(--accent-orange);">
                    {{ pmt.nomor_pembayaran }}
                  </td>
                  <td>{{ pmt.tanggal_bayar }}</td>
                  <td>
                    <span class="badge badge-metode">{{ pmt.metode_pembayaran }}</span>
                  </td>
                  <td style="font-family: monospace; font-weight: 700; color: #4ade80;">
                    {{ pmt.nominal_format }}
                  </td>
                  <td style="color: var(--text-secondary); max-width: 220px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    {{ pmt.catatan || '—' }}
                  </td>
                  <td>
                    <router-link
                      v-if="pmt.transaction_id"
                      to="/admin/pembukuan"
                      class="badge badge-tx-linked"
                      title="Lihat transaksi ini di Pembukuan"
                    >
                      <CheckCircle2 :size="11" /> Kas Masuk #TX-{{ pmt.transaction_id }}
                    </router-link>
                    <span v-else style="color: var(--text-muted); font-size: 11px;">Tidak masuk kas</span>
                  </td>
                  <td style="text-align: right;">
                    <button
                      class="btn-icon-soft text-danger"
                      @click="hapusDirectPayment(pmt.id)"
                      title="Hapus pembayaran & batalkan di Pembukuan"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State if no payments -->
          <div v-else class="pay-history-empty">
            <AlertCircle :size="18" style="color: var(--text-muted); flex-shrink: 0;" />
            <div style="flex: 1; font-size: 13px; color: var(--text-secondary);">
              Proyek ini belum memiliki riwayat pembayaran. Klik
              <button class="btn-link-action" @click="openDirectPayModal">Tandai Dibayar</button>
              untuk mencatat pelunasan dan langsung membuat transaksi kas masuk di Pembukuan.
            </div>
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
                  ≈ {{ formatRp(Math.round(formPerpanjang.nominal / formPerpanjang.durasi_bulan)) }} / bulan
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
                  {{ detailProyek?.nominal_per_bulan ? formatRp(detailProyek.nominal_per_bulan) + ' / bln' : '—' }}
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

    <!-- ── Modal Catat Pembayaran Sewa Bulanan ── -->
    <Teleport to="body">
      <div v-if="showBayarModal" class="modal-overlay" @click.self="showBayarModal = false">
        <div class="modal-box" style="max-width: 540px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <CreditCard :size="18" style="color: #c084fc;" />
              <h2 style="font-size: 16px; margin: 0;">Catat Pembayaran Sewa Bulanan</h2>
            </div>
            <button class="modal-close" @click="showBayarModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Period Header Banner -->
            <div class="sewa-modal-banner" style="margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 14px; font-weight: 700; color: #fff;">
                  Bulan ke-{{ formBayar.bulan_ke }} · {{ formBayar.periode_bulan }}
                </span>
                <span class="pembukuan-sync-badge">
                  <BookOpen :size="11" /> Kas Masuk Otomatis
                </span>
              </div>
              <div style="font-size: 12px; color: #d8b4fe;">
                Proyek: <strong>{{ detailProyek?.kode }} · {{ detailProyek?.nama }}</strong>
              </div>
            </div>

            <!-- Tanggal & Nominal -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal Pembayaran *</label>
                <input v-model="formBayar.tanggal_bayar" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Nominal Pembayaran (Rp) *</label>
                <input v-model.number="formBayar.nominal" type="number" min="1000" class="form-input" />
              </div>
            </div>

            <!-- Metode Pembayaran -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Metode Pembayaran *</label>
                <select v-model="formBayar.metode_pembayaran" class="form-input">
                  <option v-for="m in metodeOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>

            <!-- Catatan / Keterangan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Catatan / Keterangan Transfer</label>
                <input v-model="formBayar.catatan" type="text" class="form-input" placeholder="Misal: Bukti ref no 8837192 via m-BCA" />
              </div>
            </div>

            <!-- Auto sync checkbox info box -->
            <div class="sync-pembukuan-box">
              <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                <input type="checkbox" v-model="formBayar.masuk_pembukuan" style="margin-top: 3px; accent-color: #9333ea; width: 16px; height: 16px;" />
                <div>
                  <div style="font-weight: 600; color: #f3e8ff; font-size: 13px;">Otomatis catat ke Pembukuan (Kas Masuk)</div>
                  <div style="font-size: 12px; color: #c084fc; line-height: 1.4; margin-top: 2px;">
                    Sistem akan otomatis mencatat transaksi kas masuk di Pembukuan dengan kategori "Pembayaran Client" dan nominal yang sesuai.
                  </div>
                </div>
              </label>
            </div>

            <div v-if="errorBayar" style="color: #ef4444; font-size: 13px; margin-top: 10px;">{{ errorBayar }}</div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="showBayarModal = false" :disabled="savingBayar">Batal</button>
            <button class="btn-primary btn-half btn-sewa-accent" @click="submitBayar" :disabled="savingBayar">
              {{ savingBayar ? 'Menyimpan...' : 'Simpan & Masuk Pembukuan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Detail Pembayaran ── -->
    <Teleport to="body">
      <div v-if="showDetailBayarModal && activePembayaranDetail" class="modal-overlay" @click.self="showDetailBayarModal = false">
        <div class="modal-box" style="max-width: 500px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <CheckCircle2 :size="18" style="color: #22c55e;" />
              <h2 style="font-size: 16px; margin: 0;">Detail Pembayaran Sewa</h2>
            </div>
            <button class="modal-close" @click="showDetailBayarModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <div class="sewa-modal-banner" style="background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.25);">
              <div style="font-size: 12px; color: #86efac; margin-bottom: 2px;">Nomor Bukti Pembayaran</div>
              <div style="font-size: 16px; font-weight: 700; color: #4ade80; font-family: monospace;">
                {{ activePembayaranDetail.nomor_pembayaran || '—' }}
              </div>
            </div>

            <div class="dp-info-grid" style="margin-top: 16px;">
              <div class="dp-info-item">
                <div class="dp-info-label">Periode Sewa</div>
                <div class="dp-info-value">Bulan ke-{{ activePembayaranDetail.bulan_ke }} ({{ activePembayaranDetail.periode_bulan || '—' }})</div>
              </div>
              <div class="dp-info-item">
                <div class="dp-info-label">Tanggal Bayar</div>
                <div class="dp-info-value">{{ activePembayaranDetail.tanggal_bayar }}</div>
              </div>
              <div class="dp-info-item">
                <div class="dp-info-label">Nominal</div>
                <div class="dp-info-value" style="color: #4ade80; font-weight: 700; font-family: monospace;">
                  {{ activePembayaranDetail.nominal_format }}
                </div>
              </div>
              <div class="dp-info-item">
                <div class="dp-info-label">Metode Pembayaran</div>
                <div class="dp-info-value">{{ activePembayaranDetail.metode_pembayaran }}</div>
              </div>
              <div class="dp-info-item" style="grid-column: 1 / -1;">
                <div class="dp-info-label">Catatan</div>
                <div class="dp-info-value">{{ activePembayaranDetail.catatan || '—' }}</div>
              </div>
            </div>

            <div v-if="activePembayaranDetail.transaction_id" class="sync-pembukuan-box" style="margin-top: 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <BookOpen :size="16" style="color: #c084fc;" />
                  <span style="font-size: 13px; color: #f3e8ff;">Tercatat di Pembukuan (Kas Masuk #{{ activePembayaranDetail.transaction_id }})</span>
                </div>
                <router-link to="/admin/pembukuan" class="btn-ghost-pembukuan" style="font-size: 11px; padding: 4px 8px;">
                  Buka Pembukuan →
                </router-link>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost btn-half" style="width: 100%;" @click="showDetailBayarModal = false">Tutup</button>
          </div>
        </div>
      </div>

      <!-- ── Modal Tandai Proyek Langsung Dibayar ──────────────────────── -->
      <div v-if="showDirectPayModal" class="modal-overlay" @click.self="showDirectPayModal = false">
        <div class="modal-box" style="max-width: 540px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <CheckCircle2 :size="18" style="color: #4ade80;" />
              <h2 style="font-size: 16px; margin: 0;">Tandai Proyek Langsung Dibayar</h2>
            </div>
            <button class="modal-close" @click="showDirectPayModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Project Banner -->
            <div class="pay-modal-banner">
              <div style="font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px;">
                {{ detailProyek?.kode }} — {{ detailProyek?.nama }}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 16px; flex-wrap: wrap;">
                <span>Nilai Proyek: <strong style="color: var(--accent-orange);">{{ detailProyek?.nilai_format }}</strong></span>
                <span>Sudah Dibayar: <strong style="color: #4ade80;">{{ detailProyek?.total_dibayar_format || 'Rp 0' }}</strong></span>
                <span>Sisa Tagihan: <strong style="color: #ef4444;">{{ detailProyek?.sisa_pembayaran_format || 'Rp 0' }}</strong></span>
              </div>
            </div>

            <!-- Form -->
            <div class="form-row single" style="margin-top: 14px;">
              <div class="form-field">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin: 0;">Nominal Pembayaran (Rp) *</label>
                  <button
                    v-if="detailProyek && detailProyek.sisa_pembayaran && detailProyek.sisa_pembayaran > 0"
                    type="button"
                    class="btn-text-quick"
                    @click="directPayForm.nominal = detailProyek.sisa_pembayaran"
                  >
                    Set Sisa Tagihan ({{ detailProyek.sisa_pembayaran_format }})
                  </button>
                </div>
                <input
                  v-model.number="directPayForm.nominal"
                  type="number"
                  class="form-input"
                  min="1"
                  placeholder="Masukkan nominal bayar"
                  required
                />
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px;">
                  Terbilang format: <strong style="color: #4ade80;">{{ formatRupiah(directPayForm.nominal) }}</strong>
                </div>
              </div>
            </div>

            <div class="form-row" style="margin-top: 12px;">
              <div class="form-field">
                <label class="form-label">Tanggal Pembayaran *</label>
                <input
                  v-model="directPayForm.tanggal_bayar"
                  type="date"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-field">
                <label class="form-label">Metode Pembayaran *</label>
                <select v-model="directPayForm.metode_pembayaran" class="form-input">
                  <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                  <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                  <option value="Transfer Bank BRI">Transfer Bank BRI</option>
                  <option value="Transfer Bank BNI">Transfer Bank BNI</option>
                  <option value="Transfer Bank Lainnya">Transfer Bank Lainnya</option>
                  <option value="Tunai / Cash">Tunai / Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div class="form-row single" style="margin-top: 12px;">
              <div class="form-field">
                <label class="form-label">Catatan / Keterangan</label>
                <input
                  v-model="directPayForm.catatan"
                  type="text"
                  class="form-input"
                  placeholder="Contoh: Pelunasan 100% transfer BCA"
                />
              </div>
            </div>

            <!-- Checkbox Masuk Pembukuan -->
            <div class="pembukuan-checkbox-box">
              <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                <input
                  v-model="directPayForm.masuk_pembukuan"
                  type="checkbox"
                  style="margin-top: 2px; accent-color: #22c55e; width: 16px; height: 16px;"
                />
                <div>
                  <div style="font-size: 13px; font-weight: 600; color: #4ade80;">
                    Otomatis Catat ke Pembukuan (Buku Kas Masuk)
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px; line-height: 1.4;">
                    Sistem akan otomatis mencatat transaksi kas masuk di Pembukuan dengan kategori "Pembayaran Client" dan nominal yang sesuai, terhubung ke proyek {{ detailProyek?.kode }}.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost" @click="showDirectPayModal = false" :disabled="directPaySaving">Batal</button>
            <button
              class="btn-primary"
              style="background: linear-gradient(135deg, #16a34a, #15803d); border: none; font-weight: 600; box-shadow: 0 4px 12px rgba(22,163,74,0.35);"
              @click="submitDirectPayment"
              :disabled="directPaySaving"
            >
              <RefreshCw v-if="directPaySaving" :size="14" class="spin-icon" style="margin-right: 6px;" />
              <CheckCircle2 v-else :size="14" style="margin-right: 6px;" />
              {{ directPaySaving ? 'Menyimpan...' : 'Simpan &amp; Masuk ke Pembukuan' }}
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

/* ── Sewa Pembayaran & Sync Pembukuan ── */
.pembukuan-sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #34d399;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  letter-spacing: 0.02em;
}

.btn-ghost-pembukuan {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid rgba(168, 85, 247, 0.3);
  background: rgba(168, 85, 247, 0.08);
  color: #c084fc;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-ghost-pembukuan:hover {
  background: rgba(168, 85, 247, 0.2);
  border-color: #a855f7;
  color: #f3e8ff;
  transform: translateY(-1px);
}

.sewa-pembayaran-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.sewa-sum-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(168, 85, 247, 0.18);
  border-radius: 10px;
  padding: 14px 16px;
  transition: all 0.2s;
}
.sewa-sum-card.highlight-green {
  border-color: rgba(34, 197, 94, 0.25);
  background: rgba(34, 197, 94, 0.04);
}
.sewa-sum-card.highlight-orange {
  border-color: rgba(249, 115, 22, 0.25);
  background: rgba(249, 115, 22, 0.04);
}
.sewa-sum-label {
  font-size: 11.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.sewa-sum-val {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  font-family: monospace;
  margin-bottom: 2px;
}
.sewa-sum-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.sewa-progress-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}
.sewa-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9333ea, #38bdf8, #22c55e);
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.sewa-bayar-table th {
  background: rgba(147, 51, 234, 0.12);
  color: #d8b4fe;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 10px 14px;
}
.sewa-bayar-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}
.sewa-bayar-table tr.row-lunas {
  background: rgba(34, 197, 94, 0.03);
}

.bulan-ke-pill {
  display: inline-block;
  background: rgba(168, 85, 247, 0.18);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
}

.status-bayar-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
}
.status-bayar-badge.lunas {
  background: rgba(34, 197, 94, 0.14);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.status-bayar-badge.pending {
  background: rgba(245, 158, 11, 0.14);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.status-bayar-badge.overdue {
  background: rgba(239, 68, 68, 0.14);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.pembukuan-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(168, 85, 247, 0.12);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.25);
  padding: 3px 8px;
  border-radius: 5px;
}

.btn-bayar-now {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #9333ea, #7c3aed);
  border: none;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(147, 51, 234, 0.3);
}
.btn-bayar-now:hover {
  background: linear-gradient(135deg, #a855f7, #9333ea);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(147, 51, 234, 0.45);
}

.btn-icon-soft {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-icon-soft:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.btn-icon-soft.text-danger:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.sync-pembukuan-box {
  background: rgba(147, 51, 234, 0.08);
  border: 1px solid rgba(147, 51, 234, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
}

/* ── Direct Payment Styles (Proyek Langsung) ── */
.badge-bayar-lunas {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.35);
}
.badge-bayar-sebagian {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.35);
}
.badge-bayar-belum {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.badge-lunas-glow {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.4);
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
}
.badge-sebagian-glow {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.4);
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
}
.badge-pending-glow {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
}

.card-direct-payment {
  border: 1px solid rgba(34, 197, 94, 0.25);
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
  border-radius: 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.direct-pay-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.direct-pay-icon.icon-lunas {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.direct-pay-icon.icon-pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.btn-pay-direct {
  background: linear-gradient(135deg, #16a34a, #15803d);
  border: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  box-shadow: 0 3px 10px rgba(22, 163, 74, 0.35);
}
.btn-pay-direct:hover {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(22, 163, 74, 0.5);
}

.dp-pay-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}
.dp-pay-stat {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid var(--border-color);
  padding: 14px 16px;
  border-radius: 10px;
}
.dp-pay-stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.dp-pay-stat-val {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 2px;
}
.dp-pay-stat-val.val-total {
  color: var(--accent-orange);
  font-family: monospace;
}
.dp-pay-stat-val.val-paid {
  color: #4ade80;
  font-family: monospace;
}
.dp-pay-stat-val.val-remaining {
  color: #f87171;
  font-family: monospace;
}
.dp-pay-stat-sub {
  font-size: 11.5px;
  color: var(--text-muted);
}

.pay-prog-track {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  overflow: hidden;
}
.pay-prog-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #22c55e);
  border-radius: 999px;
  transition: width 0.4s ease;
}

.pay-history-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
.pay-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pay-history-table th {
  text-align: left;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border-color);
}
.pay-history-table td {
  padding: 11px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  vertical-align: middle;
}
.pay-history-table tr:last-child td {
  border-bottom: none;
}

.badge-metode {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
}

.badge-tx-linked {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 3px 8px;
  border-radius: 5px;
  text-decoration: none;
  transition: all 0.15s;
}
.badge-tx-linked:hover {
  background: rgba(34, 197, 94, 0.2);
  color: #fff;
}

.pay-history-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
}
.btn-link-action {
  background: none;
  border: none;
  color: #4ade80;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  font-size: 13px;
}
.btn-link-action:hover {
  color: #22c55e;
}

.pay-modal-banner {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05));
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
}
.pembukuan-checkbox-box {
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
  margin-top: 14px;
}
.btn-text-quick {
  background: none;
  border: none;
  color: #4ade80;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}
.btn-text-quick:hover {
  color: #22c55e;
}
</style>
