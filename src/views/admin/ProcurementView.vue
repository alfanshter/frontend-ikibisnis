<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { formatRp } from '@/utils/currency'
import {
  ShoppingCart, Package, Clock, CheckCircle2, X,
  Plus, Search, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle,
  Truck, DollarSign, Filter, ArrowUpRight,
  Edit3, Trash2, FileText, Layers, Image as ImageIcon
} from '@lucide/vue'

const router = useRouter()

type StatusProcurement = 'Pending' | 'Disetujui' | 'Dipesan' | 'Diterima' | 'Dibatalkan'
type KategoriItem = 'Hardware' | 'Kabel' | 'Aksesoris' | 'Tools' | 'Lainnya'

interface ProcurementItem {
  id: number
  namaItem: string
  kategori: KategoriItem
  qty: number
  satuan: string
  hargaSatuan: number
  supplier: string
  tanggalRequest: string
  tanggalDiterima?: string
  status: StatusProcurement
  catatan: string
  requestBy: string
  proyekId: number
  proyekNama: string
  proyekKode: string
  buktiTransfer?: string
  buktiDiterima?: string
}

// ── Mock data — semua proyek ──
const allItems = ref<ProcurementItem[]>([
  {
    id: 1, namaItem: 'IP Camera Hikvision DS-2CD2T47G2-L', kategori: 'Hardware',
    qty: 32, satuan: 'pcs', hargaSatuan: 850000, supplier: 'PT Hikvision Indonesia',
    tanggalRequest: '2024-06-18', tanggalDiterima: '2024-06-25',
    status: 'Diterima', catatan: 'Sudah cek kardus, semua oke.', requestBy: 'Rizal Firmansyah',
    proyekId: 1, proyekNama: 'CCTV Warehouse Surabaya', proyekKode: 'P#S-2024-031',
    buktiTransfer: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
  },
  {
    id: 2, namaItem: 'NVR Hikvision DS-7732NI-I4 32CH', kategori: 'Hardware',
    qty: 1, satuan: 'unit', hargaSatuan: 4500000, supplier: 'PT Hikvision Indonesia',
    tanggalRequest: '2024-06-18', tanggalDiterima: '2024-06-25',
    status: 'Diterima', catatan: '', requestBy: 'Rizal Firmansyah',
    proyekId: 1, proyekNama: 'CCTV Warehouse Surabaya', proyekKode: 'P#S-2024-031',
    buktiTransfer: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=400&q=80',
  },
  {
    id: 3, namaItem: 'Kabel UTP Cat6 Belden', kategori: 'Kabel',
    qty: 500, satuan: 'm', hargaSatuan: 8500, supplier: 'CV Elek Jaya',
    tanggalRequest: '2024-06-20', status: 'Dipesan', catatan: 'ETA 3 hari.', requestBy: 'Joko Susilo',
    proyekId: 1, proyekNama: 'CCTV Warehouse Surabaya', proyekKode: 'P#S-2024-031',
  },
  {
    id: 4, namaItem: 'HDD Surveillance 4TB WD Purple', kategori: 'Hardware',
    qty: 2, satuan: 'pcs', hargaSatuan: 1350000, supplier: 'Toko IT Surabaya',
    tanggalRequest: '2024-07-01', status: 'Pending', catatan: 'Menunggu approval PM.', requestBy: 'Rizal Firmansyah',
    proyekId: 1, proyekNama: 'CCTV Warehouse Surabaya', proyekKode: 'P#S-2024-031',
  },
  {
    id: 5, namaItem: 'Fingerprint Access Control ZKTeco F22', kategori: 'Hardware',
    qty: 3, satuan: 'unit', hargaSatuan: 1800000, supplier: 'PT ZKTeco Distributor',
    tanggalRequest: '2024-05-20', tanggalDiterima: '2024-05-28',
    status: 'Diterima', catatan: '', requestBy: 'Ahmad Yusuf',
    proyekId: 2, proyekNama: 'Access Control Office CBD', proyekKode: 'P#S-2024-032',
  },
  {
    id: 6, namaItem: 'Magnetic Lock 280kg', kategori: 'Hardware',
    qty: 5, satuan: 'pcs', hargaSatuan: 650000, supplier: 'PT ZKTeco Distributor',
    tanggalRequest: '2024-05-22', tanggalDiterima: '2024-05-29',
    status: 'Diterima', catatan: '', requestBy: 'Deny Setiawan',
    proyekId: 2, proyekNama: 'Access Control Office CBD', proyekKode: 'P#S-2024-032',
  },
  {
    id: 7, namaItem: 'Smoke Detector Optical Conventional', kategori: 'Hardware',
    qty: 60, satuan: 'pcs', hargaSatuan: 185000, supplier: 'PT Fire Safety Indonesia',
    tanggalRequest: '2024-07-15', status: 'Disetujui', catatan: '', requestBy: 'Budi Santoso',
    proyekId: 3, proyekNama: 'Fire Alarm RS Medika', proyekKode: 'P#S-2024-033',
  },
  {
    id: 8, namaItem: 'Fire Alarm Control Panel 10 Zone', kategori: 'Hardware',
    qty: 2, satuan: 'unit', hargaSatuan: 4200000, supplier: 'PT Fire Safety Indonesia',
    tanggalRequest: '2024-07-15', status: 'Dipesan', catatan: 'Import dari Singapore, ETA 2 minggu.', requestBy: 'Hendra Saputra',
    proyekId: 3, proyekNama: 'Fire Alarm RS Medika', proyekKode: 'P#S-2024-033',
  },
  {
    id: 9, namaItem: 'Kabel NYM 3x2.5mm Fire Resistant', kategori: 'Kabel',
    qty: 1000, satuan: 'm', hargaSatuan: 14500, supplier: 'CV Supreme Kabel',
    tanggalRequest: '2024-07-18', status: 'Pending', catatan: '', requestBy: 'Anton Wicaksono',
    proyekId: 3, proyekNama: 'Fire Alarm RS Medika', proyekKode: 'P#S-2024-033',
  },
  {
    id: 10, namaItem: 'Speaker Horn 30W Outdoor', kategori: 'Hardware',
    qty: 20, satuan: 'pcs', hargaSatuan: 320000, supplier: 'CV Audio Pro',
    tanggalRequest: '2024-07-30', status: 'Disetujui', catatan: '', requestBy: 'Gilang Ramadhan',
    proyekId: 4, proyekNama: 'PA System Gedung A Pemkab', proyekKode: 'P#S-2024-035',
  },
  {
    id: 11, namaItem: 'Amplifier 240W 4CH', kategori: 'Hardware',
    qty: 3, satuan: 'unit', hargaSatuan: 2100000, supplier: 'CV Audio Pro',
    tanggalRequest: '2024-07-30', status: 'Pending', catatan: 'Menunggu konfirmasi spesifikasi dari klien.', requestBy: 'Dewi Lestari',
    proyekId: 4, proyekNama: 'PA System Gedung A Pemkab', proyekKode: 'P#S-2024-035',
  },
  {
    id: 12, namaItem: 'Conduit PVC 20mm', kategori: 'Aksesoris',
    qty: 80, satuan: 'batang', hargaSatuan: 18000, supplier: 'Toko Bangunan Raya',
    tanggalRequest: '2024-06-22', status: 'Disetujui', catatan: '', requestBy: 'Bayu Pradana',
    proyekId: 1, proyekNama: 'CCTV Warehouse Surabaya', proyekKode: 'P#S-2024-031',
  },
])

// ── Status config ──
const statusCfg: Record<StatusProcurement, { color: string; bg: string; border: string; icon: any }> = {
  'Pending':    { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)', icon: Clock },
  'Disetujui':  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.25)',  icon: CheckCircle2 },
  'Dipesan':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  icon: Truck },
  'Diterima':   { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',   icon: Package },
  'Dibatalkan': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',   icon: X },
}

// ── Filter & Search ──
const searchQ = ref('')
const filterStatus = ref<StatusProcurement | 'Semua'>('Semua')
const filterKategori = ref<KategoriItem | 'Semua'>('Semua')
const filterProyek = ref<number | 'Semua'>('Semua')

const statusOptions: (StatusProcurement | 'Semua')[] = ['Semua', 'Pending', 'Disetujui', 'Dipesan', 'Diterima', 'Dibatalkan']
const kategoriOptions: (KategoriItem | 'Semua')[] = ['Semua', 'Hardware', 'Kabel', 'Aksesoris', 'Tools', 'Lainnya']

const proyekList = computed(() => {
  const seen = new Set<number>()
  return allItems.value.filter(i => { if (seen.has(i.proyekId)) return false; seen.add(i.proyekId); return true })
    .map(i => ({ id: i.proyekId, nama: i.proyekNama, kode: i.proyekKode }))
})

const filteredItems = computed(() => {
  return allItems.value.filter(item => {
    const q = searchQ.value.toLowerCase()
    const matchSearch = !q
      || item.namaItem.toLowerCase().includes(q)
      || item.supplier.toLowerCase().includes(q)
      || item.proyekNama.toLowerCase().includes(q)
      || item.proyekKode.toLowerCase().includes(q)
    const matchStatus = filterStatus.value === 'Semua' || item.status === filterStatus.value
    const matchKategori = filterKategori.value === 'Semua' || item.kategori === filterKategori.value
    const matchProyek = filterProyek.value === 'Semua' || item.proyekId === filterProyek.value
    return matchSearch && matchStatus && matchKategori && matchProyek
  })
})

// ── Pagination ──
const currentPage = ref(1)
const itemsPerPage = ref(10) // Tampilkan 10 item per halaman

const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage.value))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredItems.value.slice(start, start + itemsPerPage.value)
})

const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const setPage = (p: number) => { currentPage.value = p }

watch([searchQ, filterStatus, filterKategori, filterProyek], () => {
  currentPage.value = 1
})

// ── Summary stats ──
const totalNilai    = computed(() => allItems.value.reduce((s, i) => s + i.qty * i.hargaSatuan, 0))
const nilaiDiterima = computed(() => allItems.value.filter(i => i.status === 'Diterima').reduce((s, i) => s + i.qty * i.hargaSatuan, 0))
const countPending  = computed(() => allItems.value.filter(i => i.status === 'Pending').length)
const countDipesan  = computed(() => allItems.value.filter(i => i.status === 'Dipesan').length)
const countDiterima = computed(() => allItems.value.filter(i => i.status === 'Diterima').length)

// Status breakdown untuk chart mini
const statusBreakdown = computed(() => {
  const total = allItems.value.length
  return (['Pending', 'Disetujui', 'Dipesan', 'Diterima', 'Dibatalkan'] as StatusProcurement[]).map(s => ({
    status: s,
    count: allItems.value.filter(i => i.status === s).length,
    pct: total > 0 ? (allItems.value.filter(i => i.status === s).length / total * 100).toFixed(0) : '0',
    ...statusCfg[s],
  }))
})

const fmtRp = (n: number | string | null | undefined) => formatRp(n)
const fmtRpFull = (n: number | string | null | undefined) => formatRp(n)

// ── Status advance ──
const showConfirmModal = ref(false)
const confirmItem = ref<ProcurementItem | null>(null)
const confirmNextStatus = ref<StatusProcurement | null>(null)
const confirmBuktiDiterima = ref('')

const requestAdvanceStatus = (item: ProcurementItem) => {
  const flow: StatusProcurement[] = ['Pending', 'Disetujui', 'Dipesan', 'Diterima']
  const idx = flow.indexOf(item.status)
  if (idx >= 0 && idx < flow.length - 1) {
    confirmItem.value = item
    confirmNextStatus.value = flow[idx + 1]
    showConfirmModal.value = true
  }
}

const handleBuktiDiterimaUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    confirmBuktiDiterima.value = URL.createObjectURL(target.files[0])
  }
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  confirmItem.value = null
  confirmNextStatus.value = null
  confirmBuktiDiterima.value = ''
}

const confirmAdvanceStatus = () => {
  if (confirmItem.value && confirmNextStatus.value) {
    confirmItem.value.status = confirmNextStatus.value
    if (confirmItem.value.status === 'Diterima') {
      confirmItem.value.tanggalDiterima = new Date().toISOString().slice(0, 10)
      if (confirmBuktiDiterima.value) {
        confirmItem.value.buktiDiterima = confirmBuktiDiterima.value
      }
    }
  }
  closeConfirmModal()
}

// ── Delete modal ──
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

const confirmDelete = () => {
  if (deleteId.value !== null) {
    allItems.value = allItems.value.filter(i => i.id !== deleteId.value)
  }
  closeDeleteModal()
}

// ── Lightbox Gallery ──
const showGallery = ref(false)
const galleryImage = ref('')
const openGallery = (img: string) => {
  galleryImage.value = img
  showGallery.value = true
}

// ── Modal ──
const showModal = ref(false)
const editingId = ref<number | null>(null)
const defaultForm = () => ({
  namaItem: '', kategori: 'Hardware' as KategoriItem, qty: 1, satuan: 'pcs',
  hargaSatuan: 0, supplier: '', tanggalRequest: new Date().toISOString().slice(0, 10),
  tanggalDiterima: undefined as string | undefined, status: 'Pending' as StatusProcurement,
  catatan: '', requestBy: '', proyekId: 1,
  proyekNama: 'CCTV Warehouse Surabaya', proyekKode: 'P#S-2024-031',
  buktiTransfer: '' as string | undefined, buktiDiterima: '' as string | undefined,
})
const form = ref(defaultForm())

const openModal = (item?: ProcurementItem) => {
  if (item) {
    editingId.value = item.id
    form.value = { ...item }
  } else {
    editingId.value = null
    form.value = defaultForm()
  }
  showModal.value = true
}
const closeModal = () => { showModal.value = false }

const submitForm = () => {
  if (!form.value.namaItem.trim() || !form.value.supplier.trim()) return
  if (editingId.value !== null) {
    const idx = allItems.value.findIndex(i => i.id === editingId.value)
    if (idx !== -1) allItems.value[idx] = { ...form.value, id: editingId.value }
  } else {
    allItems.value.unshift({ ...form.value, id: Date.now() })
  }
  closeModal()
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    form.value.buktiTransfer = URL.createObjectURL(target.files[0])
  }
}

const goToProyek = (proyekId: number) => router.push(`/admin/proyek/${proyekId}/procurement`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 1100px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Page Header ── -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <div class="pv-page-icon">
              <ShoppingCart :size="20" />
            </div>
            <h1 style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin: 0;">Procurement</h1>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); margin: 0; padding-left: 50px;">
            Manajemen pembelian material &amp; barang lintas semua proyek
          </p>
        </div>
        <button class="btn-primary" @click="openModal()">
          <Plus :size="14" style="margin-right: 6px;" /> Tambah Item
        </button>
      </div>

      <!-- ── Summary Cards ── -->
      <div class="pv-stats">
        <div class="pv-stat-card">
          <div class="pv-stat-icon" style="background: rgba(245,158,11,0.12); color: var(--accent-orange);">
            <Layers :size="18" />
          </div>
          <div>
            <div class="pv-stat-num">{{ allItems.length }}</div>
            <div class="pv-stat-label">Total Item</div>
          </div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-icon" style="background: rgba(148,163,184,0.12); color: #94a3b8;">
            <Clock :size="18" />
          </div>
          <div>
            <div class="pv-stat-num" style="color: #94a3b8;">{{ countPending }}</div>
            <div class="pv-stat-label">Perlu Approval</div>
          </div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-icon" style="background: rgba(245,158,11,0.12); color: #f59e0b;">
            <Truck :size="18" />
          </div>
          <div>
            <div class="pv-stat-num" style="color: #f59e0b;">{{ countDipesan }}</div>
            <div class="pv-stat-label">Dalam Pengiriman</div>
          </div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-icon" style="background: rgba(34,197,94,0.12); color: #22c55e;">
            <Package :size="18" />
          </div>
          <div>
            <div class="pv-stat-num" style="color: #22c55e;">{{ countDiterima }}</div>
            <div class="pv-stat-label">Diterima</div>
          </div>
        </div>
        <div class="pv-stat-card pv-stat-wide">
          <div class="pv-stat-icon" style="background: rgba(245,158,11,0.12); color: var(--accent-orange);">
            <DollarSign :size="18" />
          </div>
          <div style="flex: 1;">
            <div class="pv-stat-num pv-stat-rp">{{ fmtRp(totalNilai) }}</div>
            <div class="pv-stat-label">Total Nilai Procurement</div>
            <div style="margin-top: 8px;">
              <div style="background: rgba(255,255,255,0.06); border-radius: 6px; height: 5px; overflow: hidden;">
                <div
                  style="height: 100%; border-radius: 6px; background: linear-gradient(90deg, #22c55e, #16a34a); transition: width 0.5s;"
                  :style="{ width: totalNilai > 0 ? ((nilaiDiterima / totalNilai) * 100).toFixed(1) + '%' : '0%' }"
                ></div>
              </div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                <span style="color: #22c55e;">{{ fmtRp(nilaiDiterima) }}</span> sudah diterima
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Status Breakdown ── -->
      <div class="card" style="padding: 18px 24px; margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
          <Filter :size="14" style="color: var(--accent-orange);" /> Breakdown Status
        </div>
        <div class="pv-breakdown">
          <div v-for="s in statusBreakdown" :key="s.status" class="pv-breakdown-item">
            <div class="pv-breakdown-bar-wrap">
              <div
                class="pv-breakdown-bar"
                :style="{ width: s.pct + '%', background: s.color, opacity: 0.85 }"
              ></div>
            </div>
            <div class="pv-breakdown-label">
              <span :style="{ color: s.color }">{{ s.status }}</span>
              <span class="pv-breakdown-count">{{ s.count }} item · {{ s.pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Per-Proyek Quick Links ── -->
      <div class="pv-proyek-links">
        <div
          v-for="p in proyekList"
          :key="p.id"
          class="pv-proyek-chip"
          @click="goToProyek(p.id)"
        >
          <div>
            <div style="font-size: 11px; color: var(--accent-orange); font-weight: 700;">{{ p.kode }}</div>
            <div style="font-size: 13px; color: var(--text-primary); font-weight: 600;">{{ p.nama }}</div>
          </div>
          <ArrowUpRight :size="14" style="color: var(--text-muted); flex-shrink: 0;" />
        </div>
      </div>

      <!-- ── Filter Bar ── -->
      <div class="pv-filter-bar">
        <div class="pv-search-wrap">
          <Search :size="15" class="pv-search-icon" />
          <input v-model="searchQ" class="pv-search-input" placeholder="Cari item, supplier, atau proyek..." />
        </div>
        <div class="pv-selects">
          <div class="pv-select-wrap">
            <select v-model="filterStatus" class="pv-select">
              <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <ChevronDown :size="13" class="pv-select-arrow" />
          </div>
          <div class="pv-select-wrap">
            <select v-model="filterKategori" class="pv-select">
              <option v-for="k in kategoriOptions" :key="k" :value="k">{{ k }}</option>
            </select>
            <ChevronDown :size="13" class="pv-select-arrow" />
          </div>
          <div class="pv-select-wrap">
            <select v-model="filterProyek" class="pv-select">
              <option value="Semua">Semua Proyek</option>
              <option v-for="p in proyekList" :key="p.id" :value="p.id">{{ p.kode }}</option>
            </select>
            <ChevronDown :size="13" class="pv-select-arrow" />
          </div>
        </div>
      </div>

      <!-- ── Table ── -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div v-if="filteredItems.length === 0" class="pv-empty">
          <Package :size="40" style="color: var(--text-muted); margin-bottom: 12px;" />
          <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 12px;">Tidak ada item ditemukan.</div>
          <button class="btn-primary" @click="openModal()">
            <Plus :size="14" style="margin-right: 6px;" /> Tambah Item
          </button>
        </div>

        <div v-else>
          <table class="pv-table">
            <thead>
              <tr>
                <th>Item / Proyek</th>
                <th>Kategori</th>
                <th>Qty</th>
                <th>Harga Satuan</th>
                <th>Total</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Tgl</th>
                <th style="width: 90px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedItems" :key="item.id" class="pv-row">
                <td>
                  <div class="pv-item-name">{{ item.namaItem }}</div>
                  <div
                    class="pv-item-proyek"
                    @click="goToProyek(item.proyekId)"
                    :title="'Buka procurement ' + item.proyekNama"
                  >
                    <ArrowUpRight :size="10" />
                    {{ item.proyekKode }} · {{ item.proyekNama }}
                  </div>
                  <div v-if="item.catatan" class="pv-item-note">
                    <FileText :size="11" /> {{ item.catatan }}
                  </div>
                  <div v-if="item.buktiTransfer" style="margin-top: 8px;">
                    <button class="pv-btn-bukti" @click="openGallery(item.buktiTransfer!)">
                      <ImageIcon :size="11" /> Bukti Transfer
                    </button>
                  </div>
                  <div v-if="item.buktiDiterima" style="margin-top: 4px;">
                    <button class="pv-btn-bukti" style="color: #22c55e; border-color: rgba(34,197,94,0.2); background: rgba(34,197,94,0.08);" @click="openGallery(item.buktiDiterima!)">
                      <Package :size="11" /> Bukti Terima
                    </button>
                  </div>
                </td>
                <td>
                  <span class="pv-badge-kategori">{{ item.kategori }}</span>
                </td>
                <td>
                  <span style="font-weight: 600; color: var(--text-primary);">{{ item.qty }}</span>
                  <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">{{ item.satuan }}</span>
                </td>
                <td style="font-family: monospace; font-size: 12.5px; color: var(--text-secondary);">
                  {{ fmtRpFull(item.hargaSatuan) }}
                </td>
                <td style="font-family: monospace; font-size: 12.5px; font-weight: 700; color: var(--accent-orange);">
                  {{ fmtRp(item.qty * item.hargaSatuan) }}
                </td>
                <td style="font-size: 12.5px; color: var(--text-secondary);">{{ item.supplier }}</td>
                <td>
                  <div
                    class="pv-status-badge"
                    :style="{
                      color: statusCfg[item.status].color,
                      background: statusCfg[item.status].bg,
                      border: `1px solid ${statusCfg[item.status].border}`
                    }"
                  >
                    <component :is="statusCfg[item.status].icon" :size="10" />
                    {{ item.status }}
                  </div>
                </td>
                <td style="font-size: 11.5px; color: var(--text-muted);">
                  <div>{{ item.tanggalRequest }}</div>
                  <div v-if="item.tanggalDiterima" style="color: #22c55e; font-size: 10.5px; margin-top: 2px;">
                    ✓ {{ item.tanggalDiterima }}
                  </div>
                </td>
                <td>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <button
                      v-if="item.status !== 'Diterima' && item.status !== 'Dibatalkan'"
                      class="pv-btn-advance"
                      :title="'Lanjut ke: ' + (['Pending','Disetujui','Dipesan','Diterima'][(['Pending','Disetujui','Dipesan','Diterima'].indexOf(item.status) + 1)])"
                      @click="requestAdvanceStatus(item)"
                    >→</button>
                    <button class="pv-btn-icon" title="Edit" @click="openModal(item)">
                      <Edit3 :size="12" />
                    </button>
                    <button class="pv-btn-icon pv-btn-del" title="Hapus" @click="requestDelete(item.id)">
                      <Trash2 :size="12" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Footer total ── -->
      <!-- ── Footer total & Pagination ── -->
      <div v-if="filteredItems.length > 0" class="pv-total-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="font-size: 13px; color: var(--text-muted);">
          Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredItems.length) }} dari {{ filteredItems.length }} item
        </div>

        <div v-if="totalPages > 1" class="pagination-wrapper">
          <button class="page-btn" :disabled="currentPage === 1" @click="prevPage">
            <ChevronLeft :size="14" />
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="p in totalPages" 
              :key="p" 
              class="page-num-btn"
              :class="{ active: p === currentPage }"
              @click="setPage(p)"
            >
              {{ p }}
            </button>
          </div>

          <button class="page-btn" :disabled="currentPage === totalPages" @click="nextPage">
            <ChevronRight :size="14" />
          </button>
        </div>

        <div style="font-size: 13px; color: var(--text-secondary);">
          Total Nilai Filter:
          <strong style="color: var(--accent-orange); font-family: monospace; font-size: 15px; margin-left: 8px;">
            {{ fmtRpFull(filteredItems.reduce((s, i) => s + i.qty * i.hargaSatuan, 0)) }}
          </strong>
        </div>
      </div>

    </div>

    <!-- ── Modal Tambah/Edit ── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width: 580px;">
          <div class="modal-header">
            <h2>{{ editingId ? 'Edit Item Procurement' : 'Tambah Item Procurement' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Nama Item / Material *</label>
                <input v-model="form.namaItem" class="form-input" placeholder="Contoh: IP Camera Hikvision..." />
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Proyek</label>
                <select v-model="form.proyekId" class="form-input"
                  @change="() => { const p = proyekList.find(x => x.id === form.proyekId); if(p){ form.proyekNama = p.nama; form.proyekKode = p.kode } }">
                  <option v-for="p in proyekList" :key="p.id" :value="p.id">{{ p.kode }} · {{ p.nama }}</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Kategori</label>
                <select v-model="form.kategori" class="form-input">
                  <option v-for="k in ['Hardware','Kabel','Aksesoris','Tools','Lainnya']" :key="k" :value="k">{{ k }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Qty *</label>
                <input v-model.number="form.qty" type="number" min="1" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Satuan</label>
                <input v-model="form.satuan" class="form-input" placeholder="pcs / m / unit" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Harga Satuan (Rp) *</label>
                <input v-model.number="form.hargaSatuan" type="number" min="0" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Supplier *</label>
                <input v-model="form.supplier" class="form-input" placeholder="Nama supplier" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Status</label>
                <select v-model="form.status" class="form-input">
                  <option v-for="s in ['Pending','Disetujui','Dipesan','Diterima','Dibatalkan']" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Request By</label>
                <input v-model="form.requestBy" class="form-input" placeholder="Nama PM / Teknisi" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal Request</label>
                <input v-model="form.tanggalRequest" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Tanggal Diterima</label>
                <input v-model="form.tanggalDiterima" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Bukti Pembelian/Transfer (Opsional)</label>
                <div class="pv-upload-box">
                  <input type="file" accept="image/*" @change="handleFileUpload" class="pv-file-input" />
                  <div class="pv-upload-placeholder" v-if="!form.buktiTransfer">
                    <ImageIcon :size="20" style="margin-bottom: 4px;" />
                    <span>Upload Foto</span>
                  </div>
                  <img v-else :src="form.buktiTransfer" class="pv-upload-preview" />
                </div>
              </div>
            </div>
            <div v-if="form.qty && form.hargaSatuan" class="pv-total-preview">
              <span>Total Estimasi:</span>
              <strong style="color: var(--accent-orange); font-family: monospace;">
                {{ fmtRpFull(form.qty * form.hargaSatuan) }}
              </strong>
            </div>
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Catatan (opsional)</label>
                <textarea v-model="form.catatan" class="form-textarea" placeholder="Catatan tambahan..." style="min-height: 70px;"></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm">
              {{ editingId ? 'Simpan Perubahan' : 'Tambah Item' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Lightbox Gallery ── -->
    <Teleport to="body">
      <div v-if="showGallery" class="modal-overlay" style="background: rgba(0,0,0,0.85); z-index: 9999;" @click.self="showGallery = false">
        <button style="position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; cursor: pointer; padding: 10px;" @click="showGallery = false">
          <X :size="32" />
        </button>
        <img :src="galleryImage" style="max-width: 90vw; max-height: 90vh; border-radius: 8px; object-fit: contain; box-shadow: 0 4px 30px rgba(0,0,0,0.5);" />
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
          <h2 style="margin-bottom: 12px; font-size: 18px; color: var(--text-primary);">Hapus Item</h2>
          <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 28px; line-height: 1.6; padding: 0 10px;">
            Apakah Anda yakin ingin menghapus item ini? Data yang dihapus tidak dapat dikembalikan.
          </p>
          <div class="modal-footer modal-footer-split" style="border-top: none; padding: 0;">
            <button class="btn-ghost btn-half" @click="closeDeleteModal">Batal</button>
            <button class="btn-primary btn-half" style="background: #ef4444; border-color: #ef4444;" @click="confirmDelete">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Konfirmasi Status ── -->
    <Teleport to="body">
      <div v-if="showConfirmModal" class="modal-overlay" @click.self="closeConfirmModal">
        <div class="modal-box" style="max-width: 420px; text-align: center; padding-top: 32px;">
          <div style="margin-bottom: 20px;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(245,158,11,0.1); color: var(--accent-orange); display: flex; align-items: center; justify-content: center; margin: 0 auto;">
              <AlertTriangle :size="32" />
            </div>
          </div>
          <h2 style="margin-bottom: 12px; font-size: 18px; color: var(--text-primary);">Konfirmasi Ubah Status</h2>
          <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 20px; line-height: 1.6; padding: 0 10px;">
            Apakah Anda yakin ingin mengubah status <strong>{{ confirmItem?.namaItem }}</strong> menjadi
            <strong v-if="confirmNextStatus" :style="{ color: statusCfg[confirmNextStatus].color }">{{ confirmNextStatus }}</strong>?
          </p>

          <div v-if="confirmNextStatus === 'Diterima'" style="text-align: left; padding: 0 20px; margin-bottom: 24px;">
            <label class="form-label" style="text-align: left;">Foto Bukti Diterima (Opsional)</label>
            <div class="pv-upload-box" style="height: 60px;">
              <input type="file" accept="image/*" @change="handleBuktiDiterimaUpload" class="pv-file-input" />
              <div class="pv-upload-placeholder" v-if="!confirmBuktiDiterima">
                <ImageIcon :size="18" style="margin-bottom: 4px;" />
                <span>Upload Foto Barang</span>
              </div>
              <img v-else :src="confirmBuktiDiterima" class="pv-upload-preview" />
            </div>
          </div>

          <div class="modal-footer modal-footer-split" style="border-top: none; padding: 0;">
            <button class="btn-ghost btn-half" @click="closeConfirmModal">Batal</button>
            <button class="btn-primary btn-half" @click="confirmAdvanceStatus">Ya, Ubah Status</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Page icon ── */
.pv-page-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(245,158,11,0.12);
  color: var(--accent-orange);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Stats ── */
.pv-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 1.6fr;
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 900px) { .pv-stats { grid-template-columns: repeat(2, 1fr); } }
.pv-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.pv-stat-wide { grid-column: span 1; }
.pv-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pv-stat-num {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: monospace;
  line-height: 1.2;
}
.pv-stat-rp { font-size: 18px; }
.pv-stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}

/* ── Breakdown ── */
.pv-breakdown {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pv-breakdown-item { display: flex; align-items: center; gap: 12px; }
.pv-breakdown-bar-wrap {
  flex: 1;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  height: 7px;
  overflow: hidden;
}
.pv-breakdown-bar {
  height: 100%;
  border-radius: 4px;
  min-width: 4px;
  transition: width 0.5s ease;
}
.pv-breakdown-label {
  display: flex;
  justify-content: space-between;
  width: 240px;
  flex-shrink: 0;
  font-size: 12px;
}
.pv-breakdown-count { color: var(--text-muted); }

/* ── Proyek quick links ── */
.pv-proyek-links {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.pv-proyek-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 180px;
}
.pv-proyek-chip:hover {
  border-color: rgba(245,158,11,0.4);
  background: rgba(245,158,11,0.04);
  transform: translateY(-1px);
}

/* ── Filter bar ── */
.pv-filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.pv-search-wrap { position: relative; flex: 1; min-width: 200px; }
.pv-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}
.pv-search-input {
  width: 100%;
  padding: 9px 12px 9px 36px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13.5px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.pv-search-input:focus { border-color: var(--accent-orange); }
.pv-selects { display: flex; gap: 8px; flex-wrap: wrap; }
.pv-select-wrap { position: relative; }
.pv-select {
  appearance: none;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  padding: 8px 30px 8px 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.pv-select:focus { border-color: var(--accent-orange); }
.pv-select-arrow {
  position: absolute;
  right: 9px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

/* ── Table ── */
.pv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pv-table th {
  text-align: left;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255,255,255,0.02);
  white-space: nowrap;
}
.pv-row {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}
.pv-row:last-child { border-bottom: none; }
.pv-row:hover { background: rgba(255,255,255,0.025); }
.pv-row td { padding: 11px 14px; vertical-align: top; }

.pv-item-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 13px;
  margin-bottom: 3px;
}
.pv-item-proyek {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--accent-orange);
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.15s;
}
.pv-item-proyek:hover { opacity: 1; text-decoration: underline; }
.pv-item-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 3px;
  font-style: italic;
}

.pv-badge-kategori {
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 2px 9px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.pv-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

/* ── Action buttons ── */
.pv-btn-advance {
  background: rgba(245,158,11,0.12);
  color: var(--accent-orange);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}
.pv-btn-advance:hover { background: rgba(245,158,11,0.25); }
.pv-btn-icon {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.pv-btn-icon:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.pv-btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

/* ── Footer total ── */
.pv-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  margin-top: 4px;
  border-top: 1px solid var(--border-color);
}

/* ── Empty ── */
.pv-empty {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Total preview in modal ── */
.pv-total-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(245,158,11,0.07);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

/* ── Upload box ── */
.pv-upload-box {
  position: relative;
  border: 1.5px dashed var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  height: 80px;
  transition: border-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-upload-box:hover { border-color: var(--accent-orange); }
.pv-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.pv-upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-muted);
  font-size: 12px;
  pointer-events: none;
}
.pv-upload-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

/* ── Bukti button ── */
.pv-btn-bukti {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(245,158,11,0.25);
  background: rgba(245,158,11,0.08);
  color: var(--accent-orange);
  cursor: pointer;
  transition: all 0.15s;
}
.pv-btn-bukti:hover { background: rgba(245,158,11,0.18); }

/* ── Pagination ── */
.pagination-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  padding: 6px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
}
.page-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.05);
  color: var(--text-primary);
}
.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}
.page-num-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  min-width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.page-num-btn:hover:not(.active) {
  background: rgba(255,255,255,0.05);
}
.page-num-btn.active {
  background: rgba(245,158,11,0.1);
  color: var(--accent-orange);
  border-color: rgba(245,158,11,0.3);
}
</style>
