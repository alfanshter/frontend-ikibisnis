<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  ArrowLeft, Plus, ShoppingCart, Package, CheckCircle2,
  Clock, Truck, X, AlertTriangle, Search, ChevronDown,
  DollarSign, FileText, Edit3, Trash2, Paperclip, Image as ImageIcon
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const proyekId = Number(route.params.id)

// ── Proyek header ──
const proyekInfo: Record<number, { kode: string; nama: string }> = {
  1: { kode: 'P#S-2024-031', nama: 'CCTV Warehouse Surabaya' },
  2: { kode: 'P#S-2024-032', nama: 'Access Control Office CBD' },
  3: { kode: 'P#S-2024-033', nama: 'Fire Alarm RS Medika' },
  4: { kode: 'P#S-2024-035', nama: 'PA System Gedung A Pemkab' },
  5: { kode: 'P#S-2024-028', nama: 'CCTV Perumahan Grand' },
  6: { kode: 'P#S-2024-027', nama: 'Jaringan LAN Kantor Pusat' },
  7: { kode: 'P#S-2024-036', nama: 'CCTV Terminal Pelabuhan' },
  8: { kode: 'P#S-2024-034', nama: 'Security System Hotel Bali' },
}
const proyek = computed(() => proyekInfo[proyekId] ?? { kode: '—', nama: 'Proyek tidak ditemukan' })

// ── Types ──
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
  buktiTransfer?: string
  buktiDiterima?: string
}

// ── Mock data ──
const items = ref<ProcurementItem[]>([
  {
    id: 1, namaItem: 'IP Camera Hikvision DS-2CD2T47G2-L', kategori: 'Hardware',
    qty: 32, satuan: 'pcs', hargaSatuan: 850000, supplier: 'PT Hikvision Indonesia',
    tanggalRequest: '2024-06-18', tanggalDiterima: '2024-06-25',
    status: 'Diterima', catatan: 'Sudah cek kardus, semua oke.', requestBy: 'Rizal Firmansyah',
    buktiTransfer: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80',
  },
  {
    id: 2, namaItem: 'NVR Hikvision DS-7732NI-I4 32CH', kategori: 'Hardware',
    qty: 1, satuan: 'unit', hargaSatuan: 4500000, supplier: 'PT Hikvision Indonesia',
    tanggalRequest: '2024-06-18', tanggalDiterima: '2024-06-25',
    status: 'Diterima', catatan: '', requestBy: 'Rizal Firmansyah',
    buktiTransfer: 'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=400&q=80',
  },
  {
    id: 3, namaItem: 'Kabel UTP Cat6 Belden', kategori: 'Kabel',
    qty: 500, satuan: 'm', hargaSatuan: 8500, supplier: 'CV Elek Jaya',
    tanggalRequest: '2024-06-20', tanggalDiterima: undefined,
    status: 'Dipesan', catatan: 'ETA 3 hari dari tgl pesan.', requestBy: 'Joko Susilo',
    buktiTransfer: 'https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?w=400&q=80',
  },
  {
    id: 4, namaItem: 'Conduit PVC 20mm', kategori: 'Aksesoris',
    qty: 80, satuan: 'batang', hargaSatuan: 18000, supplier: 'Toko Bangunan Raya',
    tanggalRequest: '2024-06-22', tanggalDiterima: undefined,
    status: 'Disetujui', catatan: '', requestBy: 'Bayu Pradana',
  },
  {
    id: 5, namaItem: 'HDD Surveillance 4TB WD Purple', kategori: 'Hardware',
    qty: 2, satuan: 'pcs', hargaSatuan: 1350000, supplier: 'Toko IT Surabaya',
    tanggalRequest: '2024-07-01', tanggalDiterima: undefined,
    status: 'Pending', catatan: 'Menunggu approval PM.', requestBy: 'Rizal Firmansyah',
  },
  {
    id: 6, namaItem: 'Cable Tray 200x50mm 3m', kategori: 'Aksesoris',
    qty: 20, satuan: 'batang', hargaSatuan: 95000, supplier: 'CV Elek Jaya',
    tanggalRequest: '2024-06-19', tanggalDiterima: '2024-06-24',
    status: 'Diterima', catatan: '', requestBy: 'Joko Susilo',
  },
])

// ── Filter & Search ──
const searchQ = ref('')
const filterStatus = ref<StatusProcurement | 'Semua'>('Semua')
const filterKategori = ref<KategoriItem | 'Semua'>('Semua')

const statusOptions: (StatusProcurement | 'Semua')[] = ['Semua', 'Pending', 'Disetujui', 'Dipesan', 'Diterima', 'Dibatalkan']
const kategoriOptions: (KategoriItem | 'Semua')[] = ['Semua', 'Hardware', 'Kabel', 'Aksesoris', 'Tools', 'Lainnya']

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const matchSearch = !searchQ.value || item.namaItem.toLowerCase().includes(searchQ.value.toLowerCase())
      || item.supplier.toLowerCase().includes(searchQ.value.toLowerCase())
    const matchStatus = filterStatus.value === 'Semua' || item.status === filterStatus.value
    const matchKategori = filterKategori.value === 'Semua' || item.kategori === filterKategori.value
    return matchSearch && matchStatus && matchKategori
  })
})

// ── Summary stats ──
const totalNilai = computed(() => items.value.reduce((s, i) => s + i.qty * i.hargaSatuan, 0))
const nilaiDiterima = computed(() => items.value.filter(i => i.status === 'Diterima').reduce((s, i) => s + i.qty * i.hargaSatuan, 0))
const nilaiPending = computed(() => items.value.filter(i => i.status === 'Pending').reduce((s, i) => s + i.qty * i.hargaSatuan, 0))
const countPending = computed(() => items.value.filter(i => i.status === 'Pending').length)
const countDiterima = computed(() => items.value.filter(i => i.status === 'Diterima').length)

const fmtRp = (n: number) => 'Rp' + n.toLocaleString('id-ID')

// ── Status config ──
const statusCfg: Record<StatusProcurement, { color: string; bg: string; border: string; icon: any }> = {
  'Pending':     { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)', icon: Clock },
  'Disetujui':   { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.25)',  icon: CheckCircle2 },
  'Dipesan':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  icon: ShoppingCart },
  'Diterima':    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',   icon: Package },
  'Dibatalkan':  { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',   icon: X },
}

// ── Modal Tambah ──
const showModal = ref(false)
const editingId = ref<number | null>(null)
const defaultForm = (): Omit<ProcurementItem, 'id'> => ({
  namaItem: '', kategori: 'Hardware', qty: 1, satuan: 'pcs',
  hargaSatuan: 0, supplier: '', tanggalRequest: new Date().toISOString().slice(0, 10),
  tanggalDiterima: undefined, status: 'Pending', catatan: '', requestBy: '', buktiTransfer: '', buktiDiterima: ''
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
    const idx = items.value.findIndex(i => i.id === editingId.value)
    if (idx !== -1) items.value[idx] = { ...form.value, id: editingId.value }
  } else {
    items.value.unshift({ ...form.value, id: Date.now() })
  }
  closeModal()
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    form.value.buktiTransfer = URL.createObjectURL(target.files[0])
  }
}

const showGallery = ref(false)
const galleryImage = ref('')
const openGallery = (img: string) => {
  galleryImage.value = img
  showGallery.value = true
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

const confirmDelete = () => {
  if (deleteId.value !== null) {
    items.value = items.value.filter(i => i.id !== deleteId.value)
  }
  closeDeleteModal()
}

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

const goBack = () => router.push(`/admin/proyek/${proyekId}`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 1000px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Header ── -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button class="btn-ghost" style="padding: 8px; border-radius: 8px;" @click="goBack">
            <ArrowLeft :size="20" />
          </button>
          <div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.06em;">
              {{ proyek.kode }} · Procurement
            </div>
            <h1 style="font-size: 20px; color: var(--text-primary); margin: 0; font-weight: 700;">{{ proyek.nama }}</h1>
          </div>
        </div>
        <button class="btn-primary" @click="openModal()">
          <Plus :size="14" style="margin-right: 6px;" /> Tambah Item
        </button>
      </div>

      <!-- ── Summary Stats ── -->
      <div class="pc-stats">
        <div class="pc-stat-card">
          <div class="pc-stat-icon" style="background: rgba(245,158,11,0.12); color: var(--accent-orange);">
            <ShoppingCart :size="18" />
          </div>
          <div>
            <div class="pc-stat-num">{{ items.length }}</div>
            <div class="pc-stat-label">Total Item</div>
          </div>
        </div>
        <div class="pc-stat-card">
          <div class="pc-stat-icon" style="background: rgba(148,163,184,0.12); color: #94a3b8;">
            <Clock :size="18" />
          </div>
          <div>
            <div class="pc-stat-num" style="color: #94a3b8;">{{ countPending }}</div>
            <div class="pc-stat-label">Pending</div>
          </div>
        </div>
        <div class="pc-stat-card">
          <div class="pc-stat-icon" style="background: rgba(34,197,94,0.12); color: #22c55e;">
            <Package :size="18" />
          </div>
          <div>
            <div class="pc-stat-num" style="color: #22c55e;">{{ countDiterima }}</div>
            <div class="pc-stat-label">Diterima</div>
          </div>
        </div>
        <div class="pc-stat-card">
          <div class="pc-stat-icon" style="background: rgba(245,158,11,0.12); color: var(--accent-orange);">
            <DollarSign :size="18" />
          </div>
          <div>
            <div class="pc-stat-num pc-stat-rp">{{ fmtRp(totalNilai) }}</div>
            <div class="pc-stat-label">Total Nilai</div>
          </div>
        </div>
      </div>

      <!-- ── Budget Bar ── -->
      <div class="card" style="padding: 18px 24px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">Realisasi Penerimaan Barang</span>
          <span style="font-size: 12px; color: var(--text-muted);">
            <span style="color: #22c55e; font-weight: 700;">{{ fmtRp(nilaiDiterima) }}</span>
            &nbsp;/&nbsp;{{ fmtRp(totalNilai) }}
          </span>
        </div>
        <div style="background: rgba(255,255,255,0.06); border-radius: 8px; height: 8px; overflow: hidden;">
          <div
            style="height: 100%; border-radius: 8px; background: linear-gradient(90deg, #22c55e, #16a34a); transition: width 0.5s ease;"
            :style="{ width: totalNilai > 0 ? ((nilaiDiterima / totalNilai) * 100).toFixed(1) + '%' : '0%' }"
          ></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 6px;">
          <span style="font-size: 11px; color: var(--text-muted);">Pending: <strong style="color: #94a3b8;">{{ fmtRp(nilaiPending) }}</strong></span>
          <span style="font-size: 11px; color: var(--text-muted);">
            {{ totalNilai > 0 ? ((nilaiDiterima / totalNilai) * 100).toFixed(0) : 0 }}% diterima
          </span>
        </div>
      </div>

      <!-- ── Filter Bar ── -->
      <div class="pc-filter-bar">
        <div class="pc-search-wrap">
          <Search :size="15" class="pc-search-icon" />
          <input v-model="searchQ" class="pc-search-input" placeholder="Cari item atau supplier..." />
        </div>
        <div class="pc-selects">
          <div class="pc-select-wrap">
            <select v-model="filterStatus" class="pc-select">
              <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <ChevronDown :size="14" class="pc-select-arrow" />
          </div>
          <div class="pc-select-wrap">
            <select v-model="filterKategori" class="pc-select">
              <option v-for="k in kategoriOptions" :key="k" :value="k">{{ k }}</option>
            </select>
            <ChevronDown :size="14" class="pc-select-arrow" />
          </div>
        </div>
      </div>

      <!-- ── Table ── -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div v-if="filteredItems.length === 0" class="pc-empty">
          <Package :size="40" style="color: var(--text-muted); margin-bottom: 12px;" />
          <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 12px;">Tidak ada item procurement ditemukan.</div>
          <button class="btn-primary" @click="openModal()">
            <Plus :size="14" style="margin-right: 6px;" /> Tambah Item Pertama
          </button>
        </div>

        <div v-else>
          <table class="pc-table">
            <thead>
              <tr>
                <th>Item / Supplier</th>
                <th>Kategori</th>
                <th>Qty</th>
                <th>Harga Satuan</th>
                <th>Total</th>
                <th>Status</th>
                <th>Tgl Request</th>
                <th style="width: 100px;">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="item.id" class="pc-row">
                <td>
                  <div class="pc-item-name">{{ item.namaItem }}</div>
                  <div class="pc-item-sub">{{ item.supplier }}</div>
                  <div v-if="item.catatan" class="pc-item-note">
                    <FileText :size="11" /> {{ item.catatan }}
                  </div>
                  <div v-if="item.buktiTransfer" style="margin-top: 8px;">
                    <button class="pc-btn-bukti" @click="openGallery(item.buktiTransfer)">
                      <ImageIcon :size="12" /> Bukti Transfer
                    </button>
                  </div>
                  <div v-if="item.buktiDiterima" style="margin-top: 4px;">
                    <button class="pc-btn-bukti" style="color: #22c55e; border-color: rgba(34,197,94,0.2); background: rgba(34,197,94,0.08);" @click="openGallery(item.buktiDiterima)">
                      <Package :size="12" /> Bukti Terima
                    </button>
                  </div>
                </td>
                <td>
                  <span class="pc-badge-kategori">{{ item.kategori }}</span>
                </td>
                <td>
                  <span style="font-weight: 600; color: var(--text-primary);">{{ item.qty }}</span>
                  <span style="font-size: 12px; color: var(--text-muted); margin-left: 4px;">{{ item.satuan }}</span>
                </td>
                <td style="font-family: monospace; font-size: 13px; color: var(--text-secondary);">
                  {{ fmtRp(item.hargaSatuan) }}
                </td>
                <td style="font-family: monospace; font-size: 13px; font-weight: 700; color: var(--accent-orange);">
                  {{ fmtRp(item.qty * item.hargaSatuan) }}
                </td>
                <td>
                  <div class="pc-status-badge"
                    :style="{
                      color: statusCfg[item.status].color,
                      background: statusCfg[item.status].bg,
                      border: `1px solid ${statusCfg[item.status].border}`
                    }"
                  >
                    <component :is="statusCfg[item.status].icon" :size="11" />
                    {{ item.status }}
                  </div>
                </td>
                <td style="font-size: 12px; color: var(--text-muted);">
                  <div>{{ item.tanggalRequest }}</div>
                  <div v-if="item.tanggalDiterima" style="color: #22c55e; font-size: 11px; margin-top: 2px;">
                    ✓ {{ item.tanggalDiterima }}
                  </div>
                </td>
                <td>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <button
                      v-if="item.status !== 'Diterima' && item.status !== 'Dibatalkan'"
                      class="pc-btn-advance"
                      :title="'Lanjut ke: ' + (['Pending','Disetujui','Dipesan','Diterima'][(['Pending','Disetujui','Dipesan','Diterima'].indexOf(item.status) + 1)])"
                      @click="requestAdvanceStatus(item)"
                    >
                      →
                    </button>
                    <button class="pc-btn-icon" title="Edit" @click="openModal(item)">
                      <Edit3 :size="13" />
                    </button>
                    <button class="pc-btn-icon pc-btn-del" title="Hapus" @click="requestDelete(item.id)">
                      <Trash2 :size="13" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Total row ── -->
      <div v-if="filteredItems.length > 0" class="pc-total-row">
        <span>Total {{ filteredItems.length }} item</span>
        <span>
          Grand Total:
          <strong style="color: var(--accent-orange); font-family: monospace; font-size: 15px; margin-left: 8px;">
            {{ fmtRp(filteredItems.reduce((s, i) => s + i.qty * i.hargaSatuan, 0)) }}
          </strong>
        </span>
      </div>

    </div>

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
            Apakah Anda yakin ingin mengubah status <strong>{{ confirmItem?.namaItem }}</strong> menjadi <strong v-if="confirmNextStatus" :style="{ color: statusCfg[confirmNextStatus].color }">{{ confirmNextStatus }}</strong>?
          </p>

          <div v-if="confirmNextStatus === 'Diterima'" style="text-align: left; padding: 0 20px; margin-bottom: 24px;">
            <label class="form-label" style="text-align: left;">Foto Bukti Diterima (Opsional)</label>
            <div class="pc-upload-box" style="height: 60px;">
              <input type="file" accept="image/*" @change="handleBuktiDiterimaUpload" class="pc-file-input" />
              <div class="pc-upload-placeholder" v-if="!confirmBuktiDiterima">
                <ImageIcon :size="18" style="margin-bottom: 4px;" />
                <span>Upload Foto Barang</span>
              </div>
              <img v-else :src="confirmBuktiDiterima" class="pc-upload-preview" />
            </div>
          </div>

          <div class="modal-footer modal-footer-split" style="border-top: none; padding: 0;">
            <button class="btn-ghost btn-half" @click="closeConfirmModal">Batal</button>
            <button class="btn-primary btn-half" @click="confirmAdvanceStatus">Ya, Ubah Status</button>
          </div>
        </div>
      </div>
    </Teleport>

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
                <input v-model="form.namaItem" class="form-input" placeholder="Contoh: IP Camera Hikvision DS-2CD2T47..." />
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Kategori</label>
                <select v-model="form.kategori" class="form-input">
                  <option v-for="k in ['Hardware','Kabel','Aksesoris','Tools','Lainnya']" :key="k" :value="k">{{ k }}</option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Status</label>
                <select v-model="form.status" class="form-input">
                  <option v-for="s in ['Pending','Disetujui','Dipesan','Diterima','Dibatalkan']" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Qty *</label>
                <input v-model.number="form.qty" type="number" min="1" class="form-input" placeholder="1" />
              </div>
              <div class="form-field">
                <label class="form-label">Satuan</label>
                <input v-model="form.satuan" class="form-input" placeholder="pcs / m / unit / batang" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Harga Satuan (Rp) *</label>
                <input v-model.number="form.hargaSatuan" type="number" min="0" class="form-input" placeholder="0" />
              </div>
              <div class="form-field">
                <label class="form-label">Supplier *</label>
                <input v-model="form.supplier" class="form-input" placeholder="Nama supplier / toko" />
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
                <label class="form-label">Bukti Pembelian/Transfer (Foto)</label>
                <div class="pc-upload-box">
                  <input type="file" accept="image/*" @change="handleFileUpload" class="pc-file-input" />
                  <div class="pc-upload-placeholder" v-if="!form.buktiTransfer">
                    <ImageIcon :size="20" style="margin-bottom: 4px;" />
                    <span>Upload Foto</span>
                  </div>
                  <img v-else :src="form.buktiTransfer" class="pc-upload-preview" />
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Request By</label>
                <input v-model="form.requestBy" class="form-input" placeholder="Nama teknisi / PM" />
              </div>
            </div>
            <!-- Preview total -->
            <div v-if="form.qty && form.hargaSatuan" class="pc-total-preview">
              <span>Total Estimasi:</span>
              <strong style="color: var(--accent-orange); font-family: monospace;">
                {{ fmtRp(form.qty * form.hargaSatuan) }}
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
  </AdminLayout>
</template>

<style scoped>
/* ── Stats ── */
.pc-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 700px) { .pc-stats { grid-template-columns: repeat(2, 1fr); } }
.pc-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.pc-stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pc-stat-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: monospace;
  line-height: 1.2;
}
.pc-stat-rp { font-size: 14px; }
.pc-stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}

/* ── Filter bar ── */
.pc-filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.pc-search-wrap {
  position: relative;
  flex: 1;
  min-width: 200px;
}
.pc-search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}
.pc-search-input {
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
.pc-search-input:focus { border-color: var(--accent-orange); }
.pc-selects { display: flex; gap: 8px; }
.pc-select-wrap { position: relative; }
.pc-select {
  appearance: none;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  padding: 8px 32px 8px 12px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.pc-select:focus { border-color: var(--accent-orange); }
.pc-select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

/* ── Table ── */
.pc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pc-table th {
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(255,255,255,0.02);
  white-space: nowrap;
}
.pc-row {
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}
.pc-row:last-child { border-bottom: none; }
.pc-row:hover { background: rgba(255,255,255,0.025); }
.pc-row td { padding: 12px 16px; vertical-align: top; }

.pc-item-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 13.5px;
  margin-bottom: 2px;
}
.pc-item-sub {
  font-size: 12px;
  color: var(--text-muted);
}
.pc-item-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 4px;
  font-style: italic;
}

.pc-badge-kategori {
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 2px 10px;
  font-size: 11.5px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.pc-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

/* ── Action buttons ── */
.pc-btn-advance {
  background: rgba(245,158,11,0.12);
  color: var(--accent-orange);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.pc-btn-advance:hover { background: rgba(245,158,11,0.25); }
.pc-btn-icon {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 5px 7px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.pc-btn-icon:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.pc-btn-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

.pc-btn-bukti {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(245,158,11,0.08);
  color: var(--accent-orange);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.pc-btn-bukti:hover {
  background: rgba(245,158,11,0.15);
  border-color: rgba(245,158,11,0.3);
}

.pc-thumb {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  object-fit: cover;
  cursor: pointer;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}
.pc-thumb:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border-color: var(--accent-orange);
}

.pc-upload-box {
  position: relative;
  width: 100%;
  height: 70px;
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
.pc-upload-preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

/* ── Total row ── */
.pc-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  font-size: 13px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-color);
  margin-top: 4px;
}

/* ── Empty ── */
.pc-empty {
  text-align: center;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ── Total preview in modal ── */
.pc-total-preview {
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
</style>
