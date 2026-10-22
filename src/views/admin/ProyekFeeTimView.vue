<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  ArrowLeft, Plus, X, Wallet, User, UserCheck,
  DollarSign, CheckCircle2, Clock, AlertCircle,
  Edit3, Trash2, ChevronDown, Search, Banknote,
  BadgeCheck, Star, UserX, Paperclip, Image as ImageIcon, FileText, RefreshCw
} from '@lucide/vue'
import {
  proyeksApi,
  proyekFeeTimApi,
  proyekTimApi,
  type ProyekResponse,
  type ProyekFeeTimResponse,
  type FeeRiwayatResponse,
  type TipeKaryawan,
  type StatusBayar
} from '@/services/api'

const route  = useRoute()
const router = useRouter()
const proyekId = Number(route.params.id)

// ── State ──
const proyek = ref<ProyekResponse | null>(null)
const feeList = ref<ProyekFeeTimResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)

// Karyawan list for dropdown (from proyekTim)
const mockUsers = ref<any[]>([])

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [pRes, fRes, tRes] = await Promise.all([
      proyeksApi.show(proyekId),
      proyekFeeTimApi.list(proyekId),
      proyekTimApi.list(proyekId)
    ])
    proyek.value = pRes.data
    feeList.value = fRes.data
    mockUsers.value = tRes.data.map(t => ({
      id: t.id,
      nama: t.nama_anggota,
      role: t.peran,
      tipe: 'Karyawan Tetap', // Default fallback
      bank: '',
      rekening: ''
    }))
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

// ── Status config ──
const statusCfg: Record<StatusBayar, { color: string; bg: string; border: string; icon: any }> = {
  'Belum Dibayar': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',   icon: AlertCircle  },
  'Sebagian':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  icon: Clock        },
  'Lunas':         { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',   icon: CheckCircle2 },
}

const tipeCfg: Record<TipeKaryawan, { color: string; bg: string; icon: any }> = {
  'Karyawan Tetap': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: BadgeCheck },
  'Freelance':      { color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  icon: Star       },
}

// ── Filter ──
const searchQ       = ref('')
const filterStatus  = ref<StatusBayar | 'Semua'>('Semua')
const filterTipe    = ref<TipeKaryawan | 'Semua'>('Semua')

const filteredList = computed(() => feeList.value.filter(f => {
  const q = searchQ.value.toLowerCase()
  const matchSearch = !q || f.nama.toLowerCase().includes(q) || (f.role || '').toLowerCase().includes(q)
  const matchStatus = filterStatus.value === 'Semua' || f.statusBayar === filterStatus.value
  const matchTipe   = filterTipe.value   === 'Semua' || f.tipe        === filterTipe.value
  return matchSearch && matchStatus && matchTipe
}))

// ── Stats ──
const totalFee      = computed(() => feeList.value.reduce((s, f) => s + f.feeTotal, 0))
const totalDibayar  = computed(() => feeList.value.reduce((s, f) => s + f.feeDibayar, 0))
const totalSisa     = computed(() => totalFee.value - totalDibayar.value)
const countLunas    = computed(() => feeList.value.filter(f => f.statusBayar === 'Lunas').length)
const countPending  = computed(() => feeList.value.filter(f => f.statusBayar !== 'Lunas').length)

const fmtRp = (n: number) => 'Rp' + Math.round(n).toLocaleString('id-ID')
const pctDibayar = computed(() => totalFee.value > 0 ? ((totalDibayar.value / totalFee.value) * 100).toFixed(0) : '0')

const getInitials = (name: string) => {
  if (!name) return 'U'
  const p = name.split(' ')
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
}

// ── Modal ──
const showModal  = ref(false)
const editingId  = ref<number | null>(null)

const defaultForm = (): Partial<ProyekFeeTimResponse> => ({
  nama: '', tipe: 'Karyawan Tetap', role: '', no_rekening: '', nama_bank: '',
  fee_total: 0, fee_dibayar: 0, statusBayar: 'Belum Dibayar',
  metodeBayar: 'Transfer Bank', tanggalBayar: '', keterangan: '', buktiBayar: '',
})
const form = ref(defaultForm())

// Bukti bayar file upload (modal tambah/edit)
const buktiBayarFile  = ref<File | null>(null)
const buktiBayarType  = ref<'image' | 'pdf' | null>(null)  // untuk preview
const buktiBayarPreview = ref<string>('')

const handleBuktiBayarUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    buktiBayarFile.value  = file
    if (file.type === 'application/pdf') {
      buktiBayarType.value    = 'pdf'
      buktiBayarPreview.value = file.name
      form.value.buktiBayar   = file.name
    } else {
      buktiBayarType.value    = 'image'
      const url = URL.createObjectURL(file)
      buktiBayarPreview.value = url
      form.value.buktiBayar   = url
    }
  }
}

const clearBuktiBayar = () => {
  buktiBayarFile.value    = null
  buktiBayarType.value    = null
  buktiBayarPreview.value = ''
  form.value.buktiBayar   = ''
}

const showUserDropdown = ref(false)
const filteredMockUsers = computed(() => {
  if (!form.value.nama) return mockUsers.value
  return mockUsers.value.filter(u => u.nama.toLowerCase().includes(form.value.nama!.toLowerCase()))
})

const selectUser = (u: any) => {
  form.value.nama = u.nama
  form.value.role = u.role
  form.value.tipe = u.tipe as TipeKaryawan
  form.value.nama_bank = u.bank
  form.value.no_rekening = u.rekening
  showUserDropdown.value = false
}

// Auto-update statusBayar berdasarkan fee
const updateStatusBayar = () => {
  if ((form.value.fee_dibayar || 0) <= 0) {
    form.value.statusBayar = 'Belum Dibayar'
  } else if ((form.value.fee_dibayar || 0) >= (form.value.fee_total || 0)) {
    form.value.statusBayar = 'Lunas'
    form.value.fee_dibayar  = form.value.fee_total
  } else {
    form.value.statusBayar = 'Sebagian'
  }
}

const openModal = (item?: ProyekFeeTimResponse) => {
  if (item) {
    editingId.value = item.id
    form.value = { ...item, fee_total: item.feeTotal, fee_dibayar: item.feeDibayar, no_rekening: item.noRekening, nama_bank: item.namaBank }
    // Tentukan tipe preview dari buktiBayar yang sudah ada
    if (item.buktiBayar) {
      const isPdf = item.buktiBayar.endsWith('.pdf') || item.buktiBayar.toLowerCase().includes('.pdf')
      buktiBayarType.value    = isPdf ? 'pdf' : 'image'
      buktiBayarPreview.value = isPdf ? item.buktiBayar : item.buktiBayar
    } else {
      buktiBayarType.value    = null
      buktiBayarPreview.value = ''
    }
  } else {
    editingId.value = null
    form.value = defaultForm()
    buktiBayarFile.value    = null
    buktiBayarType.value    = null
    buktiBayarPreview.value = ''
  }
  showModal.value = true
}
const closeModal = () => { showModal.value = false }

const submitForm = async () => {
  if (!form.value.nama?.trim() || (form.value.fee_total || 0) <= 0) return
  saving.value = true
  updateStatusBayar()
  try {
    if (editingId.value !== null) {
      await proyekFeeTimApi.update(proyekId, editingId.value, form.value)
    } else {
      await proyekFeeTimApi.create(proyekId, form.value)
    }
    await fetchData()
    closeModal()
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan fee tim')
  } finally {
    saving.value = false
  }
}

// Tambah Pembayaran Modal
const showPaymentModal = ref(false)
const paymentItem = ref<FeeItem | null>(null)
const paymentForm = ref({
  tanggal: new Date().toISOString().slice(0, 10),
  nominal: 0,
  metode: 'Transfer Bank',
  keterangan: '',
  bukti: ''
})

// Untuk modal tambah/edit pembayaran
const paymentBuktiType    = ref<'image' | 'pdf' | null>(null)
const paymentBuktiPreview = ref<string>('')
const editingPaymentId    = ref<number | null>(null)

const openPaymentModal = (item: FeeItem) => {
  paymentItem.value = item
  editingPaymentId.value = null
  paymentForm.value = {
    tanggal: new Date().toISOString().slice(0, 10),
    nominal: Math.max(0, item.feeTotal - item.feeDibayar),
    metode: 'Transfer Bank',
    keterangan: '',
    bukti: ''
  }
  paymentBuktiType.value    = null
  paymentBuktiPreview.value = ''
  showPaymentModal.value = true
}

const openEditPayment = (rw: RiwayatPembayaran, item: FeeItem) => {
  paymentItem.value     = item
  editingPaymentId.value = rw.id
  paymentForm.value = {
    tanggal: rw.tanggal,
    nominal: rw.nominal,
    metode: rw.metode,
    keterangan: rw.keterangan,
    bukti: rw.bukti || ''
  }
  // Tentukan tipe preview dari bukti yang sudah ada
  if (rw.bukti) {
    const isPdf = rw.bukti.toLowerCase().endsWith('.pdf')
    paymentBuktiType.value    = isPdf ? 'pdf' : 'image'
    paymentBuktiPreview.value = rw.bukti
  } else {
    paymentBuktiType.value    = null
    paymentBuktiPreview.value = ''
  }
  showPaymentModal.value = true
}

const closePaymentModal = () => {
  showPaymentModal.value   = false
  paymentItem.value        = null
  editingPaymentId.value   = null
  paymentBuktiType.value   = null
  paymentBuktiPreview.value = ''
}

const handlePaymentUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    if (file.type === 'application/pdf') {
      paymentBuktiType.value    = 'pdf'
      paymentBuktiPreview.value = file.name
      paymentForm.value.bukti   = file.name
    } else {
      paymentBuktiType.value    = 'image'
      const url = URL.createObjectURL(file)
      paymentBuktiPreview.value = url
      paymentForm.value.bukti   = url
    }
  }
}

const clearPaymentBukti = () => {
  paymentBuktiType.value    = null
  paymentBuktiPreview.value = ''
  paymentForm.value.bukti   = ''
}

const submitPayment = async () => {
  if (!paymentItem.value || paymentForm.value.nominal <= 0) return
  saving.value = true

  if (editingPaymentId.value !== null) {
    alert('Edit riwayat belum didukung oleh API saat ini.')
    saving.value = false
    return
  }

  try {
    await proyekFeeTimApi.addRiwayat(proyekId, paymentItem.value.id, {
      tanggal: paymentForm.value.tanggal,
      nominal: paymentForm.value.nominal,
      metode: paymentForm.value.metode,
      keterangan: paymentForm.value.keterangan,
      bukti: paymentForm.value.bukti
    })
    await fetchData()
    closePaymentModal()
  } catch (e: any) {
    alert(e.message || 'Gagal menambah pembayaran')
  } finally {
    saving.value = false
  }
}

// History delete logic
const showDeleteHistoryModal = ref(false)
const deleteHistoryId = ref<number | null>(null)
const deleteHistoryItem = ref<ProyekFeeTimResponse | null>(null)

const requestDeleteHistory = (riwayatId: number, item: ProyekFeeTimResponse) => {
  deleteHistoryId.value = riwayatId
  deleteHistoryItem.value = item
  showDeleteHistoryModal.value = true
}

const closeDeleteHistoryModal = () => {
  showDeleteHistoryModal.value = false
  deleteHistoryId.value = null
  deleteHistoryItem.value = null
}

const confirmDeleteHistory = () => {
  alert('Hapus riwayat belum didukung oleh API saat ini.')
  closeDeleteHistoryModal()
}

const showHistoryModal = ref(false)
const selectedHistoryItem = ref<ProyekFeeTimResponse | null>(null)

const openHistory = (item: ProyekFeeTimResponse) => {
  selectedHistoryItem.value = item
  showHistoryModal.value = true
}

const closeHistory = () => {
  showHistoryModal.value = false
  selectedHistoryItem.value = null
}

const showDeleteModal = ref(false)
const deleteId = ref<number | null>(null)

const requestDelete = (id: number) => {
  deleteId.value = id
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteId.value = null
}

const confirmDelete = async () => {
  if (deleteId.value !== null) {
    saving.value = true
    try {
      await proyekFeeTimApi.delete(proyekId, deleteId.value)
      await fetchData()
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus fee tim')
    } finally {
      saving.value = false
      closeDeleteModal()
    }
  }
}

const goBack = () => router.push(`/admin/proyek/${proyekId}`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 960px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Header ── -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <button class="btn-ghost" style="padding:8px; border-radius:8px;" @click="goBack">
            <ArrowLeft :size="20" />
          </button>
          <div v-if="loading" style="display:flex; align-items:center; gap:10px; color:var(--text-muted);">
            <RefreshCw :size="16" class="spin-icon" /> Memuat data...
          </div>
          <div v-else-if="error" style="color:#ef4444; display:flex; align-items:center; gap:8px;">
            <AlertCircle :size="16" /> {{ error }}
          </div>
          <div v-else>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:2px; text-transform:uppercase; letter-spacing:0.06em;">
              {{ proyek?.kode }} · Fee & Pengeluaran Tim
            </div>
            <h1 style="font-size:20px; color:var(--text-primary); margin:0; font-weight:700;">{{ proyek?.nama }}</h1>
          </div>
        </div>
        <button class="btn-primary" @click="openModal()">
          <Plus :size="14" style="margin-right:6px;" /> Tambah Penerima Fee
        </button>
      </div>

      <!-- ── Summary Cards ── -->
      <div class="ft-stats">
        <div class="ft-stat-card">
          <div class="ft-stat-icon" style="background:rgba(245,158,11,0.12); color:var(--accent-orange);">
            <Wallet :size="18" />
          </div>
          <div>
            <div class="ft-stat-num">{{ fmtRp(totalFee) }}</div>
            <div class="ft-stat-label">Total Fee Tim</div>
          </div>
        </div>
        <div class="ft-stat-card">
          <div class="ft-stat-icon" style="background:rgba(34,197,94,0.12); color:#22c55e;">
            <Banknote :size="18" />
          </div>
          <div>
            <div class="ft-stat-num" style="color:#22c55e;">{{ fmtRp(totalDibayar) }}</div>
            <div class="ft-stat-label">Sudah Dibayar</div>
          </div>
        </div>
        <div class="ft-stat-card">
          <div class="ft-stat-icon" style="background:rgba(239,68,68,0.12); color:#ef4444;">
            <Clock :size="18" />
          </div>
          <div>
            <div class="ft-stat-num" style="color:#ef4444;">{{ fmtRp(totalSisa) }}</div>
            <div class="ft-stat-label">Sisa Belum Dibayar</div>
          </div>
        </div>
        <div class="ft-stat-card">
          <div class="ft-stat-icon" style="background:rgba(59,130,246,0.12); color:#3b82f6;">
            <User :size="18" />
          </div>
          <div>
            <div class="ft-stat-num" style="color:#3b82f6;">{{ feeList.length }}</div>
            <div class="ft-stat-label">Anggota Tim</div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
              {{ countLunas }} lunas · {{ countPending }} pending
            </div>
          </div>
        </div>
      </div>

      <!-- ── Realisasi Bar ── -->
      <div class="card" style="padding:18px 24px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
          <span style="font-size:13px; font-weight:600; color:var(--text-primary);">Realisasi Pembayaran Fee Tim</span>
          <span style="font-size:12px; color:var(--text-muted);">
            <span style="color:#22c55e; font-weight:700;">{{ fmtRp(totalDibayar) }}</span>
            &nbsp;/&nbsp;{{ fmtRp(totalFee) }}
            &nbsp;·&nbsp;
            <span style="color:var(--accent-orange); font-weight:700;">{{ pctDibayar }}%</span>
          </span>
        </div>
        <div style="background:rgba(255,255,255,0.06); border-radius:8px; height:10px; overflow:hidden;">
          <div
            style="height:100%; border-radius:8px; background:linear-gradient(90deg,#22c55e,#16a34a); transition:width 0.5s ease;"
            :style="{ width: pctDibayar + '%' }"
          ></div>
        </div>
        <div style="display:flex; gap:16px; margin-top:10px; flex-wrap:wrap;">
          <div v-for="f in feeList" :key="f.id" style="display:flex; align-items:center; gap:6px;">
            <div
              class="ft-mini-avatar"
              :style="{ background: tipeCfg[f.tipe].bg, color: tipeCfg[f.tipe].color }"
            >{{ getInitials(f.nama) }}</div>
            <div>
              <div style="font-size:11.5px; font-weight:600; color:var(--text-primary);">{{ f.nama.split(' ')[0] }}</div>
              <div style="font-size:10.5px; color:var(--text-muted);">{{ fmtRp(f.feeDibayar) }} / {{ fmtRp(f.feeTotal) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Filter Bar ── -->
      <div class="ft-filter-bar">
        <div class="ft-search-wrap">
          <Search :size="15" class="ft-search-icon" />
          <input v-model="searchQ" class="ft-search-input" placeholder="Cari nama atau role..." />
        </div>
        <div style="display:flex; gap:8px;">
          <div class="ft-select-wrap">
            <select v-model="filterStatus" class="ft-select">
              <option value="Semua">Semua Status</option>
              <option value="Belum Dibayar">Belum Dibayar</option>
              <option value="Sebagian">Sebagian</option>
              <option value="Lunas">Lunas</option>
            </select>
            <ChevronDown :size="13" class="ft-select-arrow" />
          </div>
          <div class="ft-select-wrap">
            <select v-model="filterTipe" class="ft-select">
              <option value="Semua">Semua Tipe</option>
              <option value="Karyawan Tetap">Karyawan Tetap</option>
              <option value="Freelance">Freelance</option>
            </select>
            <ChevronDown :size="13" class="ft-select-arrow" />
          </div>
        </div>
      </div>

      <!-- ── Fee Cards ── -->
      <div v-if="filteredList.length === 0" class="card" style="padding:50px 20px; text-align:center;">
        <UserX :size="40" style="color:var(--text-muted); margin-bottom:12px;" />
        <div style="color:var(--text-muted); font-size:14px; margin-bottom:12px;">Tidak ada data fee ditemukan.</div>
        <button class="btn-primary" @click="openModal()">
          <Plus :size="14" style="margin-right:6px;" /> Tambah Penerima Fee
        </button>
      </div>

      <div v-else class="ft-list">
        <div v-for="item in filteredList" :key="item.id" class="ft-card" @click="openHistory(item)" style="cursor: pointer; transition: transform 0.2s;">

          <!-- Left: Avatar + Info ──────── -->
          <div class="ft-card-left">
            <div
              class="ft-avatar"
              :style="{ background: tipeCfg[item.tipe].bg, color: tipeCfg[item.tipe].color }"
            >{{ getInitials(item.nama) }}</div>
            <div>
              <div style="font-size:15px; font-weight:700; color:var(--text-primary); margin-bottom:3px;">{{ item.nama }}</div>
              <div style="font-size:12.5px; color:var(--text-muted); margin-bottom:6px;">{{ item.role }}</div>
              <div class="ft-tipe-badge"
                :style="{ color: tipeCfg[item.tipe].color, background: tipeCfg[item.tipe].bg }"
              >
                <component :is="tipeCfg[item.tipe].icon" :size="11" />
                {{ item.tipe }}
              </div>
            </div>
          </div>

          <!-- Center: Fee detail ──────── -->
          <div class="ft-card-center">
            <!-- Fee total & dibayar -->
            <div style="margin-bottom:10px;">
              <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px;">Fee Proyek</div>
              <div style="font-size:20px; font-weight:800; font-family:monospace; color:var(--text-primary);">{{ fmtRp(item.feeTotal) }}</div>
            </div>

            <!-- Progress pembayaran -->
            <div style="margin-bottom:8px;">
              <div style="background:rgba(255,255,255,0.06); border-radius:6px; height:6px; overflow:hidden;">
                <div
                  style="height:100%; border-radius:6px; transition:width 0.4s ease;"
                  :style="{
                    width: item.feeTotal > 0 ? ((item.feeDibayar/item.feeTotal)*100) + '%' : '0%',
                    background: item.statusBayar === 'Lunas' ? '#22c55e' : item.statusBayar === 'Sebagian' ? '#f59e0b' : '#ef4444'
                  }"
                ></div>
              </div>
              <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:11.5px;">
                <span style="color:var(--text-muted);">Dibayar: <strong style="color:var(--text-secondary);">{{ fmtRp(item.feeDibayar) }}</strong></span>
                <span style="color:var(--text-muted);">Sisa: <strong style="color:#ef4444;">{{ fmtRp(item.feeTotal - item.feeDibayar) }}</strong></span>
              </div>
            </div>

            <!-- Rekening & metode -->
            <div class="ft-rekening">
              <Banknote :size="12" style="color:var(--text-muted); flex-shrink:0;" />
              <span v-if="item.noRekening">
                {{ item.namaBank }} · {{ item.noRekening }}
              </span>
              <span v-else style="font-style:italic; color:var(--text-muted);">Rekening belum diisi</span>
              <span class="ft-metode">{{ item.metodeBayar }}</span>
            </div>

            <div v-if="item.keterangan" class="ft-note">
              {{ item.keterangan }}
            </div>
          </div>

          <!-- Right: Status + Actions ── -->
          <div class="ft-card-right">
            <div
              class="ft-status-badge"
              :style="{
                color: statusCfg[item.statusBayar].color,
                background: statusCfg[item.statusBayar].bg,
                border: `1px solid ${statusCfg[item.statusBayar].border}`
              }"
            >
              <component :is="statusCfg[item.statusBayar].icon" :size="12" />
              {{ item.statusBayar }}
            </div>

            <div v-if="item.tanggalBayar" style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:4px;">
              {{ item.tanggalBayar }}
            </div>

            <a v-if="item.buktiBayar" href="#" class="ft-bukti-link" @click.prevent.stop>
              <Paperclip :size="12" /> Bukti Bayar
            </a>

            <div class="ft-actions">
              <button
                class="ft-btn-lunas"
                @click.stop="openPaymentModal(item)"
                title="Tambah Pembayaran"
              >
                <Plus :size="13" /> Pembayaran
              </button>
              <button class="ft-btn-icon" title="Edit" @click.stop="openModal(item)">
                <Edit3 :size="13" />
              </button>
              <button class="ft-btn-icon ft-btn-del" title="Hapus" @click.stop="requestDelete(item.id)">
                <Trash2 :size="13" />
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Footer total ── -->
      <div v-if="filteredList.length > 0" class="ft-total-row">
        <span>{{ filteredList.length }} anggota</span>
        <div style="display:flex; gap:24px; align-items:center;">
          <span>Total Fee: <strong style="color:var(--accent-orange); font-family:monospace; margin-left:4px;">{{ fmtRp(filteredList.reduce((s,f) => s + f.feeTotal, 0)) }}</strong></span>
          <span>Dibayar: <strong style="color:#22c55e; font-family:monospace; margin-left:4px;">{{ fmtRp(filteredList.reduce((s,f) => s + f.feeDibayar, 0)) }}</strong></span>
        </div>
      </div>

    </div>

    <!-- ── Modal Tambah Pembayaran ── -->
    <Teleport to="body">
      <div v-if="showPaymentModal" class="modal-overlay" style="z-index: 110;" @click.self="closePaymentModal">
        <div class="modal-box" style="max-width: 450px;">
          <div class="modal-header">
            <h2>{{ editingPaymentId ? 'Edit Pembayaran' : 'Tambah Pembayaran' }}</h2>
            <button class="modal-close" @click="closePaymentModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">{{ paymentItem?.nama }}</div>
              <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
                <span>Sisa Tagihan:</span>
                <strong style="color: #ef4444; font-size: 13px;">{{ fmtRp((paymentItem?.feeTotal || 0) - (paymentItem?.feeDibayar || 0)) }}</strong>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal Bayar *</label>
                <input v-model="paymentForm.tanggal" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Nominal (Rp) *</label>
                <input v-model.number="paymentForm.nominal" type="number" min="1" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Metode Pembayaran</label>
                <select v-model="paymentForm.metode" class="form-input">
                  <option>Transfer Bank</option>
                  <option>Tunai</option>
                  <option>Dompet Digital</option>
                </select>
              </div>
            </div>

            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Bukti Pembayaran <span style="color:var(--text-muted); font-weight:400;">(Foto / PDF – Opsional)</span></label>
                <div class="pc-upload-box" :style="paymentBuktiType ? 'height: 100px;' : 'height: 72px;'">
                  <input type="file" accept="image/*,application/pdf" @change="handlePaymentUpload" class="pc-file-input" />
                  <!-- Empty state -->
                  <div class="pc-upload-placeholder" v-if="!paymentBuktiType">
                    <div style="display:flex; gap:8px; margin-bottom:6px;">
                      <ImageIcon :size="16" />
                      <FileText :size="16" />
                    </div>
                    <span>Pilih foto atau PDF bukti bayar</span>
                  </div>
                  <!-- Image preview -->
                  <img v-else-if="paymentBuktiType === 'image'" :src="paymentBuktiPreview" style="object-fit:contain; width:100%; height:100%;" />
                  <!-- PDF preview -->
                  <div v-else class="pc-pdf-preview">
                    <FileText :size="28" style="color:var(--accent-orange);" />
                    <span class="pc-pdf-name">{{ paymentBuktiPreview }}</span>
                    <button class="pc-pdf-clear" type="button" @click.stop="clearPaymentBukti"><X :size="12" /></button>
                  </div>
                </div>
                <!-- Clear image -->
                <button v-if="paymentBuktiType === 'image'" type="button" class="pc-clear-btn" @click="clearPaymentBukti">
                  <X :size="11" /> Hapus
                </button>
              </div>
            </div>

            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Keterangan (Opsional)</label>
                <input v-model="paymentForm.keterangan" class="form-input" placeholder="Misal: DP 50%, Cicilan ke-2" />
              </div>
            </div>

          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closePaymentModal">Batal</button>
            <button class="btn-primary btn-half" @click="submitPayment">{{ editingPaymentId ? 'Simpan Perubahan' : 'Simpan Pembayaran' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Riwayat Pembayaran ── -->
    <Teleport to="body">
      <div v-if="showHistoryModal" class="modal-overlay" style="z-index: 100;" @click.self="closeHistory">
        <div class="modal-box" style="max-width: 450px;">
          <div class="modal-header">
            <div>
              <h2 style="margin-bottom: 4px;">Riwayat Pembayaran</h2>
              <div style="font-size: 13px; color: var(--text-muted);">{{ selectedHistoryItem?.nama }} - {{ selectedHistoryItem?.role }}</div>
            </div>
            <button class="modal-close" @click="closeHistory"><X :size="16" /></button>
          </div>
          <div class="modal-body" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border: 1px solid var(--border-color);">
              <div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Total Fee</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">{{ fmtRp(selectedHistoryItem?.feeTotal || 0) }}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Sudah Dibayar</div>
                <div style="font-size: 14px; font-weight: 700; color: #22c55e;">{{ fmtRp(selectedHistoryItem?.feeDibayar || 0) }}</div>
              </div>
            </div>

            <div v-if="!selectedHistoryItem?.riwayat || selectedHistoryItem.riwayat.length === 0" style="text-align: center; color: var(--text-muted); padding: 30px 0; font-size: 13px;">
              Belum ada riwayat pembayaran.
            </div>
            <div v-else style="display: flex; flex-direction: column; gap: 16px;">
              <div v-for="(rw, idx) in selectedHistoryItem.riwayat" :key="rw.id" style="display: flex; gap: 12px;">
                <div style="display: flex; flex-direction: column; align-items: center;">
                  <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--accent-orange); margin-top: 6px;"></div>
                  <div v-if="idx !== selectedHistoryItem.riwayat.length - 1" style="width: 2px; flex: 1; background: var(--border-color); margin-top: 4px;"></div>
                </div>
                <div style="flex: 1; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items:flex-start;">
                    <div>
                      <span style="font-size: 12px; font-weight: 600; color: var(--text-primary); display:block; margin-bottom:2px;">{{ rw.tanggal }}</span>
                      <div style="font-size: 12px; color: var(--text-muted);">{{ rw.metode }}</div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 13px; font-weight: 700; color: #22c55e; font-family: monospace;">+{{ fmtRp(rw.nominal) }}</span>
                      <div style="display:flex; gap:6px; margin-top:6px; justify-content:flex-end;">
                        <button class="ft-btn-icon" title="Edit" @click.stop="openEditPayment(rw, selectedHistoryItem!)" style="padding: 4px 6px;">
                          <Edit3 :size="12" />
                        </button>
                        <button class="ft-btn-icon ft-btn-del" title="Hapus" @click.stop="requestDeleteHistory(rw.id, selectedHistoryItem!)" style="padding: 4px 6px;">
                          <Trash2 :size="12" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div v-if="rw.keterangan" style="font-size: 12px; color: var(--text-secondary); font-style: italic;">"{{ rw.keterangan }}"</div>
                  <div v-if="rw.bukti" style="margin-top: 8px;">
                    <a href="#" style="font-size: 11px; color: var(--accent-orange); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;" @click.prevent.stop>
                      <Paperclip :size="10" /> Bukti Transfer
                    </a>
                  </div>
                </div>
              </div>
            </div>
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
          <h2 style="margin-bottom: 12px; font-size: 18px; color: var(--text-primary);">Hapus Data Fee</h2>
          <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 28px; line-height: 1.6; padding: 0 10px;">
            Apakah Anda yakin ingin menghapus data fee ini? Data yang dihapus tidak dapat dikembalikan.
          </p>
          <div class="modal-footer modal-footer-split" style="border-top: none; padding: 0;">
            <button class="btn-ghost btn-half" @click="closeDeleteModal">Batal</button>
            <button class="btn-primary btn-half" style="background: #ef4444; border-color: #ef4444;" @click="confirmDelete">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Konfirmasi Hapus Riwayat ── -->
    <Teleport to="body">
      <div v-if="showDeleteHistoryModal" class="modal-overlay" style="z-index: 120;" @click.self="closeDeleteHistoryModal">
        <div class="modal-box" style="max-width: 400px; text-align: center; padding-top: 32px;">
          <div style="margin-bottom: 20px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(239,68,68,0.1); color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
              <Trash2 :size="32" />
            </div>
          </div>
          <h2 style="margin-bottom: 12px; font-size: 18px; color: var(--text-primary);">Hapus Riwayat Pembayaran</h2>
          <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 28px; line-height: 1.6; padding: 0 10px;">
            Apakah Anda yakin ingin menghapus riwayat pembayaran ini? Nominal yang sudah dibayar akan disesuaikan kembali.
          </p>
          <div class="modal-footer modal-footer-split" style="border-top: none; padding: 0;">
            <button class="btn-ghost btn-half" @click="closeDeleteHistoryModal">Batal</button>
            <button class="btn-primary btn-half" style="background: #ef4444; border-color: #ef4444;" @click="confirmDeleteHistory">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Tambah/Edit ── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width:560px;">
          <div class="modal-header">
            <h2>{{ editingId ? 'Edit Fee Anggota' : 'Tambah Penerima Fee' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">

            <!-- Nama & Tipe -->
            <div class="form-row">
              <div class="form-field" style="position: relative;">
                <label class="form-label">Nama *</label>
                <input
                  v-model="form.nama"
                  class="form-input"
                  placeholder="Cari atau ketik nama..."
                  @focus="showUserDropdown = true"
                  @blur="setTimeout(() => showUserDropdown = false, 200)"
                />
                <div v-if="showUserDropdown && filteredMockUsers.length > 0" class="ft-autocomplete">
                  <div
                    v-for="u in filteredMockUsers"
                    :key="u.id"
                    class="ft-autocomplete-item"
                    @click="selectUser(u)"
                  >
                    <div style="font-weight: 600; color: var(--text-primary);">{{ u.nama }}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">{{ u.role }} · {{ u.tipe }}</div>
                  </div>
                </div>
              </div>
              <div class="form-field">
                <label class="form-label">Tipe</label>
                <select v-model="form.tipe" class="form-input">
                  <option value="Karyawan Tetap">Karyawan Tetap</option>
                  <option value="Freelance">Freelance</option>
                </select>
              </div>
            </div>

            <!-- Role & Metode Bayar -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Role / Jabatan</label>
                <input v-model="form.role" class="form-input" placeholder="Project Manager, Teknisi, dll." />
              </div>
              <div class="form-field">
                <label class="form-label">Metode Pembayaran</label>
                <select v-model="form.metodeBayar" class="form-input">
                  <option>Transfer Bank</option>
                  <option>Tunai</option>
                  <option>Dompet Digital</option>
                </select>
              </div>
            </div>

            <!-- Rekening -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Bank</label>
                <input v-model="form.namaBank" class="form-input" placeholder="BCA / Mandiri / BRI ..." />
              </div>
              <div class="form-field">
                <label class="form-label">No. Rekening / Akun</label>
                <input v-model="form.noRekening" class="form-input" placeholder="Nomor rekening" />
              </div>
            </div>

            <!-- Fee total & dibayar -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Fee Total (Rp) *</label>
                <input v-model.number="form.feeTotal" type="number" min="0" class="form-input" placeholder="0"
                  @input="updateStatusBayar" />
              </div>
              <div class="form-field">
                <label class="form-label">Sudah Dibayar (Rp)</label>
                <input v-model.number="form.feeDibayar" type="number" min="0" class="form-input" placeholder="0"
                  @input="updateStatusBayar" />
              </div>
            </div>

            <!-- Preview status pembayaran -->
            <div v-if="form.feeTotal > 0" class="ft-status-preview"
              :style="{ background: statusCfg[form.statusBayar].bg, borderColor: statusCfg[form.statusBayar].border }"
            >
              <component :is="statusCfg[form.statusBayar].icon" :size="14" :style="{ color: statusCfg[form.statusBayar].color }" />
              <span :style="{ color: statusCfg[form.statusBayar].color, fontWeight: 600 }">{{ form.statusBayar }}</span>
              <span style="color:var(--text-muted); font-size:12px; margin-left:auto;">
                Sisa: {{ fmtRp(Math.max(0, form.feeTotal - form.feeDibayar)) }}
              </span>
            </div>

            <!-- Tanggal Bayar & Bukti -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal Pembayaran (terakhir)</label>
                <input v-model="form.tanggalBayar" type="date" class="form-input" />
              </div>
            </div>

            <!-- Bukti Pembayaran: file galeri (foto / PDF) -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">
                  Bukti Pembayaran
                  <span style="color:var(--text-muted); font-weight:400; font-size:11px;"> (Foto / PDF – Opsional)</span>
                </label>
                <div class="pc-upload-box" :style="buktiBayarType ? 'height: 110px;' : 'height: 80px;'">
                  <input type="file" accept="image/*,application/pdf" @change="handleBuktiBayarUpload" class="pc-file-input" />
                  <!-- Empty state -->
                  <div class="pc-upload-placeholder" v-if="!buktiBayarType">
                    <div style="display:flex; gap:10px; margin-bottom:6px; color:var(--text-muted);">
                      <ImageIcon :size="20" />
                      <span style="font-size:13px; color:var(--text-muted);">|</span>
                      <FileText :size="20" />
                    </div>
                    <span>Klik untuk pilih foto atau PDF</span>
                    <span style="font-size:10.5px; margin-top:2px; color:var(--text-muted);">JPG, PNG, PDF didukung</span>
                  </div>
                  <!-- Image preview -->
                  <img v-else-if="buktiBayarType === 'image'" :src="buktiBayarPreview" style="object-fit:contain; width:100%; height:100%; border-radius:6px;" />
                  <!-- PDF preview -->
                  <div v-else class="pc-pdf-preview">
                    <FileText :size="32" style="color:var(--accent-orange);" />
                    <span class="pc-pdf-name">{{ buktiBayarPreview }}</span>
                    <button class="pc-pdf-clear" type="button" @click.stop="clearBuktiBayar"><X :size="12" /></button>
                  </div>
                </div>
                <!-- Clear image -->
                <button v-if="buktiBayarType === 'image'" type="button" class="pc-clear-btn" @click="clearBuktiBayar">
                  <X :size="11" /> Hapus
                </button>
              </div>
            </div>

            <!-- Keterangan -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Keterangan (opsional)</label>
                <textarea v-model="form.keterangan" class="form-textarea" placeholder="Catatan khusus, syarat pembayaran, dll." style="min-height:70px;"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm">
              {{ editingId ? 'Simpan Perubahan' : 'Tambah Fee' }}
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

/* ── Layout & Card base ── */
.ft-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 700px) { .ft-stats { grid-template-columns: repeat(2, 1fr); } }
.ft-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.ft-stat-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.ft-stat-num {
  font-size: 16px; font-weight: 800;
  color: var(--text-primary);
  font-family: monospace; line-height: 1.2;
}
.ft-stat-label {
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;
}

/* ── Mini avatar (realisasi bar) ── */
.ft-mini-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}

/* ── Filter bar ── */
.ft-filter-bar {
  display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
}
.ft-search-wrap { position: relative; flex: 1; min-width: 200px; }
.ft-search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);
}
.ft-search-input {
  width: 100%; padding: 9px 12px 9px 36px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-primary); font-size: 13.5px;
  outline: none; box-sizing: border-box; transition: border-color 0.2s;
}
.ft-search-input:focus { border-color: var(--accent-orange); }
.ft-select-wrap { position: relative; }
.ft-select {
  appearance: none; background: var(--bg-card);
  border: 1px solid var(--border-color); border-radius: 8px;
  color: var(--text-primary); font-size: 13px; padding: 8px 30px 8px 12px;
  outline: none; cursor: pointer; transition: border-color 0.2s;
}
.ft-select:focus { border-color: var(--accent-orange); }
.ft-select-arrow {
  position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); pointer-events: none;
}

/* ── Fee cards ── */
.ft-list { display: flex; flex-direction: column; gap: 12px; }
.ft-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 20px 22px;
  display: grid;
  grid-template-columns: 200px 1fr auto;
  gap: 20px;
  align-items: start;
  transition: all 0.2s;
}
.ft-card:hover {
  border-color: rgba(245,158,11,0.25);
  box-shadow: 0 2px 16px rgba(0,0,0,0.12);
}
@media (max-width: 720px) {
  .ft-card { grid-template-columns: 1fr; }
}

.ft-card-left {
  display: flex; align-items: flex-start; gap: 12px;
}
.ft-avatar {
  width: 46px; height: 46px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 800; flex-shrink: 0;
}
.ft-tipe-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11.5px; font-weight: 600;
}

.ft-card-center { min-width: 0; }
.ft-rekening {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text-secondary);
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border-color);
  border-radius: 8px; padding: 6px 10px; margin-bottom: 6px;
  flex-wrap: wrap;
}
.ft-metode {
  margin-left: auto; font-size: 11px; color: var(--text-muted);
  background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 20px;
}
.ft-note {
  font-size: 12px; color: var(--text-muted); font-style: italic;
  background: rgba(245,158,11,0.05); border-left: 2px solid rgba(245,158,11,0.3);
  padding: 6px 10px; border-radius: 0 6px 6px 0; margin-top: 4px;
}

.ft-card-right {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; min-width: 110px;
}
.ft-status-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700;
  white-space: nowrap;
}
.ft-actions { display: flex; gap: 6px; align-items: center; }
.ft-btn-lunas {
  display: flex; align-items: center; gap: 5px;
  background: rgba(34,197,94,0.12); color: #22c55e;
  border: 1px solid rgba(34,197,94,0.3); border-radius: 8px;
  padding: 6px 12px; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.ft-btn-lunas:hover { background: rgba(34,197,94,0.22); }
.ft-btn-icon {
  background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 6px 8px; color: var(--text-muted);
  cursor: pointer; display: flex; align-items: center; transition: all 0.15s;
}
.ft-btn-icon:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.ft-btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

.ft-bukti-link {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--accent-orange);
  margin-top: 4px; cursor: pointer;
  background: rgba(245,158,11,0.08);
  padding: 4px 8px; border-radius: 6px;
  text-decoration: none; font-weight: 600;
  transition: all 0.15s;
}
.ft-bukti-link:hover {
  background: rgba(245,158,11,0.15);
}

/* ── Footer total ── */
.ft-total-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; font-size: 13px; color: var(--text-muted);
  border-top: 1px solid var(--border-color); margin-top: 8px;
}

/* ── Autocomplete / Searchable Dropdown ── */
.ft-autocomplete {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
.ft-autocomplete-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ft-autocomplete-item:last-child {
  border-bottom: none;
}
.ft-autocomplete-item:hover {
  background: rgba(255,255,255,0.05);
}

/* ── Status preview in modal ── */
.ft-status-preview {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid; border-radius: 8px; padding: 10px 14px;
  font-size: 13.5px; margin-bottom: 12px;
}
/* ── File Upload Box ── */
.pc-upload-box {
  position: relative;
  width: 100%;
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  background: rgba(255,255,255,0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.2s;
}
.pc-upload-box:hover {
  border-color: var(--accent-orange);
  background: rgba(245,158,11,0.05);
}
.pc-file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}
.pc-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-muted);
  font-size: 11px;
}
/* ── PDF Preview inside upload box ── */
.pc-pdf-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  width: 100%;
  position: relative;
}
.pc-pdf-name {
  font-size: 11px;
  color: var(--text-secondary);
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
.pc-pdf-clear {
  position: absolute;
  top: 4px;
  right: 8px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.3);
  color: #ef4444;
  border-radius: 50%;
  width: 20px; height: 20px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  z-index: 3;
}
.pc-pdf-clear:hover {
  background: rgba(239,68,68,0.25);
}
/* ── Clear button below upload box ── */
.pc-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 11px;
  color: #ef4444;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 6px;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.pc-clear-btn:hover {
  background: rgba(239,68,68,0.16);
}
</style>
