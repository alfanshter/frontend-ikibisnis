<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  Plus, Search, FileText, ChevronDown, X, Trash2, Printer,
  CheckCircle2, Clock, AlertCircle, Building2, Calendar, DollarSign, Download, Send
} from '@lucide/vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Types ────────────────────────────────────────────────────────────────────
interface InvoiceItem {
  id: number
  nama: string
  satuan: string
  qty: number
  hargaSatuan: number
  diskon: number
}

interface Invoice {
  id: number
  nomorInvoice: string
  tanggal: string
  jatuhTempo: string
  proyekKode: string
  proyekNama: string
  client: string
  alamatClient: string
  perihal: string
  catatan: string
  ppn: number
  tipe: 'DP' | 'Termin' | 'Pelunasan' | 'Lainnya'
  nomorTermin?: number
  status: 'Draft' | 'Terkirim' | 'Lunas' | 'Jatuh Tempo'
  items: InvoiceItem[]
}

// ─── Proyek Data ──────────────────────────────────────────────────────────────
const proyekList = [
  { kode: 'P#S-2024-031', nama: 'CCTV Warehouse Surabaya',    client: 'PT Logistics Indo',   alamat: 'Jl. Raya Surabaya No. 12, Surabaya' },
  { kode: 'P#S-2024-032', nama: 'Access Control Office CBD',  client: 'CV Maju Bersama',     alamat: 'CBD Surabaya Tower B Lt. 5' },
  { kode: 'P#S-2024-033', nama: 'Fire Alarm RS Medika',       client: 'RS Medika Utama',     alamat: 'Jl. Medika No. 88, Sidoarjo' },
  { kode: 'P#S-2024-035', nama: 'PA System Gedung A Pemkab',  client: 'Pemkab Gresik',       alamat: 'Jl. Gubernur Suryo, Gresik' },
  { kode: 'P#S-2024-036', nama: 'CCTV Terminal Pelabuhan',    client: 'PT Pelindo III',      alamat: 'Jl. Tanjung Perak Barat, Surabaya' },
  { kode: 'P#S-2024-034', nama: 'Security System Hotel Bali', client: 'Bali Resort Group',   alamat: 'Jl. Pantai Kuta, Bali' },
]

// ─── Invoice List ─────────────────────────────────────────────────────────────
const invoiceList = ref<Invoice[]>([
  {
    id: 1,
    nomorInvoice: 'INV/2024/001',
    tanggal: '2024-06-01',
    jatuhTempo: '2024-06-15',
    proyekKode: 'P#S-2024-031',
    proyekNama: 'CCTV Warehouse Surabaya',
    client: 'PT Logistics Indo',
    alamatClient: 'Jl. Raya Surabaya No. 12, Surabaya',
    perihal: 'Invoice DP 30% - CCTV Warehouse Surabaya',
    catatan: 'Mohon pembayaran dilakukan sebelum tanggal jatuh tempo.',
    ppn: 11,
    tipe: 'DP',
    status: 'Lunas',
    items: [
      { id: 1, nama: 'CCTV IP Camera 4MP Hikvision', satuan: 'unit',  qty: 32,  hargaSatuan: 1200000, diskon: 5 },
      { id: 2, nama: 'NVR 32 Channel 4K',            satuan: 'unit',  qty: 1,   hargaSatuan: 8500000, diskon: 0 },
      { id: 3, nama: 'HDD 4TB Surveillance',         satuan: 'unit',  qty: 2,   hargaSatuan: 1850000, diskon: 0 },
    ],
  },
  {
    id: 2,
    nomorInvoice: 'INV/2024/002',
    tanggal: '2024-06-12',
    jatuhTempo: '2024-06-26',
    proyekKode: 'P#S-2024-031',
    proyekNama: 'CCTV Warehouse Surabaya',
    client: 'PT Logistics Indo',
    alamatClient: 'Jl. Raya Surabaya No. 12, Surabaya',
    perihal: 'Invoice Termin 1 - CCTV Warehouse Surabaya',
    catatan: 'Termin ke-1 sesuai kontrak pekerjaan.',
    ppn: 11,
    tipe: 'Termin',
    nomorTermin: 1,
    status: 'Lunas',
    items: [
      { id: 1, nama: 'Kabel UTP Cat6 (per meter)',  satuan: 'meter', qty: 300, hargaSatuan: 8500,   diskon: 0 },
      { id: 2, nama: 'Jasa Instalasi & Setting',    satuan: 'paket', qty: 1,   hargaSatuan: 7500000, diskon: 0 },
    ],
  },
  {
    id: 3,
    nomorInvoice: 'INV/2024/003',
    tanggal: '2024-07-10',
    jatuhTempo: '2024-07-24',
    proyekKode: 'P#S-2024-033',
    proyekNama: 'Fire Alarm RS Medika',
    client: 'RS Medika Utama',
    alamatClient: 'Jl. Medika No. 88, Sidoarjo',
    perihal: 'Invoice DP 30% - Fire Alarm RS Medika',
    catatan: 'Termasuk PPN 11%. Harap konfirmasi setelah transfer.',
    ppn: 11,
    tipe: 'DP',
    status: 'Terkirim',
    items: [
      { id: 1, nama: 'Panel Fire Alarm Addressable', satuan: 'unit', qty: 1,  hargaSatuan: 18000000, diskon: 0 },
      { id: 2, nama: 'Smoke Detector',               satuan: 'unit', qty: 60, hargaSatuan: 450000,   diskon: 5 },
    ],
  },
  {
    id: 4,
    nomorInvoice: 'INV/2024/004',
    tanggal: '2024-07-20',
    jatuhTempo: '2024-08-03',
    proyekKode: 'P#S-2024-033',
    proyekNama: 'Fire Alarm RS Medika',
    client: 'RS Medika Utama',
    alamatClient: 'Jl. Medika No. 88, Sidoarjo',
    perihal: 'Invoice Pelunasan - Fire Alarm RS Medika',
    catatan: 'Pelunasan setelah pekerjaan selesai dan berita acara ditandatangani.',
    ppn: 11,
    tipe: 'Pelunasan',
    status: 'Draft',
    items: [
      { id: 1, nama: 'Heat Detector',       satuan: 'unit',  qty: 20, hargaSatuan: 380000,   diskon: 5 },
      { id: 2, nama: 'Manual Call Point',   satuan: 'unit',  qty: 12, hargaSatuan: 250000,   diskon: 0 },
      { id: 3, nama: 'Alarm Bell',          satuan: 'unit',  qty: 15, hargaSatuan: 180000,   diskon: 0 },
      { id: 4, nama: 'Jasa Instalasi',      satuan: 'paket', qty: 1,  hargaSatuan: 12000000, diskon: 0 },
    ],
  },
])

// ─── Filters ──────────────────────────────────────────────────────────────────
const search       = ref('')
const activeFilter = ref<'Semua' | 'Draft' | 'Terkirim' | 'Lunas' | 'Jatuh Tempo'>('Semua')
const filterOptions = ['Semua', 'Draft', 'Terkirim', 'Lunas', 'Jatuh Tempo'] as const

const filtered = computed(() => {
  let list = invoiceList.value
  if (activeFilter.value !== 'Semua') list = list.filter(i => i.status === activeFilter.value)
  const q = search.value.toLowerCase().trim()
  if (q) list = list.filter(i =>
    i.nomorInvoice.toLowerCase().includes(q) ||
    i.client.toLowerCase().includes(q) ||
    i.proyekNama.toLowerCase().includes(q) ||
    i.perihal.toLowerCase().includes(q)
  )
  return list
})

// ─── Modal State ──────────────────────────────────────────────────────────────
const showModal  = ref(false)
const editId     = ref<number | null>(null)

// ─── Project Search Dropdown ──────────────────────────────────────────────────
const proyekSearch     = ref('')
const showProyekDrop   = ref(false)
const selectedProyek   = ref<typeof proyekList[0] | null>(null)

const proyekFiltered = computed(() => {
  const q = proyekSearch.value.toLowerCase().trim()
  if (!q) return proyekList
  return proyekList.filter(p =>
    p.nama.toLowerCase().includes(q) ||
    p.client.toLowerCase().includes(q) ||
    p.kode.toLowerCase().includes(q)
  )
})

const selectProyek = (p: typeof proyekList[0]) => {
  selectedProyek.value   = p
  proyekSearch.value     = p.nama
  showProyekDrop.value   = false
  form.value.proyekKode  = p.kode
  form.value.proyekNama  = p.nama
  form.value.client      = p.client
  form.value.alamatClient = p.alamat
  if (!form.value.perihal) {
    form.value.perihal = `Invoice ${form.value.tipe} - ${p.nama}`
  }
}

const hideProyekDrop = () => {
  setTimeout(() => { showProyekDrop.value = false }, 180)
}

// ─── Form ─────────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  nomorInvoice: `INV/${new Date().getFullYear()}/${String(invoiceList.value.length + 1).padStart(3, '0')}`,
  tanggal:      new Date().toISOString().slice(0, 10),
  jatuhTempo:   new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  proyekKode:   '',
  proyekNama:   '',
  client:       '',
  alamatClient: '',
  perihal:      '',
  catatan:      '',
  ppn:          11,
  tipe:         'DP' as Invoice['tipe'],
  nomorTermin:  1,
  status:       'Draft' as Invoice['status'],
})

const form  = ref(emptyForm())
const items = ref<InvoiceItem[]>([{ id: Date.now(), nama: '', satuan: 'unit', qty: 1, hargaSatuan: 0, diskon: 0 }])

const addItem = () => {
  items.value.push({ id: Date.now(), nama: '', satuan: 'unit', qty: 1, hargaSatuan: 0, diskon: 0 })
}

const removeItem = (id: number) => {
  items.value = items.value.filter(i => i.id !== id)
}

// Update perihal when tipe changes
watch(() => form.value.tipe, (newTipe) => {
  if (form.value.proyekNama && !editId.value) {
    form.value.perihal = `Invoice ${newTipe} - ${form.value.proyekNama}`
  }
})

// ─── Calculations ─────────────────────────────────────────────────────────────
const subtotal = (item: InvoiceItem) => item.qty * item.hargaSatuan * (1 - item.diskon / 100)

const totalSebelumPPN = (its: InvoiceItem[]) => its.reduce((a, i) => a + subtotal(i), 0)

const totalAkhir = (its: InvoiceItem[], ppn: number) => {
  const sub = totalSebelumPPN(its)
  return sub + (sub * ppn / 100)
}

const rp = (val: number) => 'Rp ' + Math.round(val).toLocaleString('id-ID')

// ─── Tipe Label ───────────────────────────────────────────────────────────────
const tipeLabel = (inv: Invoice) => {
  if (inv.tipe === 'Termin') return `Termin ${inv.nomorTermin ?? ''}`
  return inv.tipe
}

// ─── Open / Close Modal ───────────────────────────────────────────────────────
const openAdd = () => {
  editId.value         = null
  form.value           = emptyForm()
  items.value          = [{ id: Date.now(), nama: '', satuan: 'unit', qty: 1, hargaSatuan: 0, diskon: 0 }]
  selectedProyek.value = null
  proyekSearch.value   = ''
  showModal.value      = true
}

const openEdit = (inv: Invoice) => {
  editId.value = inv.id
  form.value   = {
    nomorInvoice: inv.nomorInvoice,
    tanggal:      inv.tanggal,
    jatuhTempo:   inv.jatuhTempo,
    proyekKode:   inv.proyekKode,
    proyekNama:   inv.proyekNama,
    client:       inv.client,
    alamatClient: inv.alamatClient,
    perihal:      inv.perihal,
    catatan:      inv.catatan,
    ppn:          inv.ppn,
    tipe:         inv.tipe,
    nomorTermin:  inv.nomorTermin ?? 1,
    status:       inv.status,
  }
  items.value          = inv.items.map(i => ({ ...i }))
  proyekSearch.value   = inv.proyekNama
  selectedProyek.value = proyekList.find(pr => pr.kode === inv.proyekKode) || null
  showModal.value      = true
}

const closeModal = () => { showModal.value = false }

const submitForm = () => {
  if (!form.value.proyekKode || !form.value.client) return
  const data: Invoice = {
    id:   editId.value ?? Date.now(),
    ...form.value,
    items: items.value.map(i => ({ ...i })),
  }
  if (editId.value !== null) {
    const idx = invoiceList.value.findIndex(i => i.id === editId.value)
    if (idx !== -1) invoiceList.value[idx] = data
  } else {
    invoiceList.value.unshift(data)
  }
  closeModal()
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const confirmModal = ref({ show: false, id: 0 })
const confirmDelete = (id: number) => { confirmModal.value = { show: true, id } }
const doDelete      = () => {
  invoiceList.value = invoiceList.value.filter(i => i.id !== confirmModal.value.id)
  confirmModal.value.show = false
}

// ─── Detail View ──────────────────────────────────────────────────────────────
const selected   = ref<Invoice | null>(null)
const openDetail = (inv: Invoice) => { selected.value = inv }
const closeDetail = () => { selected.value = null }

// ─── Mark Lunas ───────────────────────────────────────────────────────────────
const markLunas = (id: number) => {
  const idx = invoiceList.value.findIndex(i => i.id === id)
  if (idx !== -1) invoiceList.value[idx].status = 'Lunas'
  if (selected.value?.id === id) selected.value = { ...invoiceList.value[idx] }
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const statusStyle = (s: string) => {
  const map: Record<string, string> = {
    Draft:         'badge badge-pending',
    Terkirim:      'badge badge-penawaran',
    Lunas:         'badge badge-selesai',
    'Jatuh Tempo': 'badge badge-red',
  }
  return map[s] ?? 'badge'
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Draft:         'inv-badge inv-badge-draft',
    Terkirim:      'inv-badge inv-badge-terkirim',
    Lunas:         'inv-badge inv-badge-lunas',
    'Jatuh Tempo': 'inv-badge inv-badge-jt',
  }
  return map[s] ?? 'inv-badge'
}

const tipeBadgeClass = (tipe: string) => {
  if (tipe === 'DP')         return 'tipe-badge tipe-dp'
  if (tipe === 'Termin')     return 'tipe-badge tipe-termin'
  if (tipe === 'Pelunasan')  return 'tipe-badge tipe-pelunasan'
  return 'tipe-badge tipe-lainnya'
}

const statusIcon = (s: string) => {
  if (s === 'Lunas')        return CheckCircle2
  if (s === 'Jatuh Tempo')  return AlertCircle
  if (s === 'Terkirim')     return Clock
  return FileText
}

const formatDate = (d: string) => {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length !== 3) return d
  const y = parts[0]!, m = parts[1]!, day = parts[2]!
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${parseInt(day)} ${bulan[parseInt(m) - 1]} ${y}`
}

// ─── Export PDF ───────────────────────────────────────────────────────────────
const exportToPdf = () => {
  if (!selected.value) return

  const doc = new jsPDF()
  const inv = selected.value

  // Header
  doc.setFontSize(20)
  doc.setTextColor(59, 130, 246)
  doc.text('INVOICE', 14, 22)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Nomor: ${inv.nomorInvoice}`, 14, 30)
  doc.text(`Tanggal: ${formatDate(inv.tanggal)}`, 14, 35)
  doc.text(`Jatuh Tempo: ${formatDate(inv.jatuhTempo)}`, 14, 40)
  doc.text(`Tipe: ${tipeLabel(inv)}`, 14, 45)

  // Client Info
  doc.setFontSize(11)
  doc.setTextColor(40)
  doc.text('Kepada Yth.', 120, 22)
  doc.setFontSize(10)
  doc.text(inv.client, 120, 28)
  const splitAlamat = doc.splitTextToSize(inv.alamatClient, 70)
  doc.text(splitAlamat, 120, 34)

  // Perihal & Proyek
  doc.setFontSize(11)
  doc.text('Perihal: ', 14, 56)
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(inv.perihal, 34, 56)

  doc.setFontSize(11)
  doc.setTextColor(40)
  doc.text('Proyek: ', 14, 62)
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text(`${inv.proyekKode} - ${inv.proyekNama}`, 34, 62)

  // Table
  const tableData = inv.items.map((item, index) => [
    index + 1,
    item.nama,
    item.qty + ' ' + item.satuan,
    rp(item.hargaSatuan),
    item.diskon + '%',
    rp(subtotal(item))
  ])

  autoTable(doc, {
    startY: 72,
    head: [['No', 'Deskripsi', 'Qty', 'Harga Satuan', 'Diskon', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right' },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right' }
    }
  })

  const finalY = (doc as any).lastAutoTable.finalY + 10

  const sub     = totalSebelumPPN(inv.items)
  const ppnNom  = sub * inv.ppn / 100
  const total   = sub + ppnNom

  doc.setFontSize(10)
  doc.text('Subtotal:', 130, finalY)
  doc.text(rp(sub), 196, finalY, { align: 'right' })

  doc.text(`PPN (${inv.ppn}%):`, 130, finalY + 6)
  doc.text(rp(ppnNom), 196, finalY + 6, { align: 'right' })

  doc.setFontSize(12)
  doc.setTextColor(40)
  doc.setFont('helvetica', 'bold')
  doc.text('Total Invoice:', 130, finalY + 14)
  doc.text(rp(total), 196, finalY + 14, { align: 'right' })

  if (inv.catatan) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40)
    doc.text('Catatan:', 14, finalY + 30)
    doc.setTextColor(100)
    const splitCatatan = doc.splitTextToSize(inv.catatan, 180)
    doc.text(splitCatatan, 14, finalY + 36)
  }

  doc.save(`${inv.nomorInvoice.replaceAll('/', '_')}_${inv.client}.pdf`)
}

// ─── Stats ────────────────────────────────────────────────────────────────────
const statTotal     = computed(() => invoiceList.value.length)
const statTerkirim  = computed(() => invoiceList.value.filter(i => i.status === 'Terkirim').length)
const statLunas     = computed(() => invoiceList.value.filter(i => i.status === 'Lunas').length)
const statJatuhTempo= computed(() => invoiceList.value.filter(i => i.status === 'Jatuh Tempo').length)

// ─── Pagination ───────────────────────────────────────────────────────────────
const pageSize    = ref(5)
const currentPage = ref(1)
const totalPages  = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
watch([search, activeFilter], () => { currentPage.value = 1 })
</script>

<template>
  <AdminLayout>
    <!-- ── Toolbar ─────────────────────────────────────────────── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Invoice</h1>
        <p>Kelola dan tagih invoice DP, termin, dan pelunasan proyek klien.</p>
      </div>
      <button class="btn-primary" @click="openAdd">
        <Plus :size="16" />
        Buat Invoice Baru
      </button>
    </div>

    <!-- ── Stats ───────────────────────────────────────────────── -->
    <div class="inv-stats-grid">
      <div class="inv-stat-card">
        <div class="inv-stat-icon" style="background: rgba(59,130,246,0.15); color: #60a5fa;">
          <FileText :size="20" />
        </div>
        <div class="inv-stat-body">
          <div class="inv-stat-label">TOTAL INVOICE</div>
          <div class="inv-stat-value">{{ String(statTotal).padStart(2, '0') }}</div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon" style="background: rgba(245,158,11,0.15); color: #f59e0b;">
          <Clock :size="20" />
        </div>
        <div class="inv-stat-body">
          <div class="inv-stat-label">MENUNGGU BAYAR</div>
          <div class="inv-stat-value">{{ String(statTerkirim).padStart(2, '0') }}</div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon" style="background: rgba(16,185,129,0.15); color: var(--accent-green);">
          <CheckCircle2 :size="20" />
        </div>
        <div class="inv-stat-body">
          <div class="inv-stat-label">LUNAS</div>
          <div class="inv-stat-value">{{ String(statLunas).padStart(2, '0') }}</div>
        </div>
      </div>
      <div class="inv-stat-card">
        <div class="inv-stat-icon" style="background: rgba(239,68,68,0.15); color: var(--accent-red);">
          <AlertCircle :size="20" />
        </div>
        <div class="inv-stat-body">
          <div class="inv-stat-label">JATUH TEMPO</div>
          <div class="inv-stat-value">{{ String(statJatuhTempo).padStart(2, '0') }}</div>
        </div>
      </div>
    </div>

    <!-- ── Tab Filter ──────────────────────────────────────────── -->
    <div class="inv-tab-bar">
      <button
        v-for="f in filterOptions" :key="f"
        class="inv-tab"
        :class="{ active: activeFilter === f }"
        @click="activeFilter = f"
      >
        {{ f === 'Semua' ? 'Semua Invoice' : f }}
      </button>
      <div style="flex: 1;"></div>
      <div class="inv-search-wrap">
        <Search :size="14" style="color: var(--text-muted); flex-shrink: 0;" />
        <input v-model="search" class="inv-search-inp" placeholder="Cari invoice, client, proyek..." />
      </div>
    </div>

    <!-- ── List ───────────────────────────────────────────────── -->
    <div class="inv-list">
      <div v-if="filtered.length === 0" class="card" style="padding: 48px; text-align: center; color: var(--text-muted);">
        <FileText :size="32" style="margin: 0 auto 12px; opacity: 0.3;" />
        <p>Tidak ada invoice ditemukan.</p>
      </div>

      <div
        v-for="inv in paginatedList" :key="inv.id"
        class="inv-list-card"
        @click="openDetail(inv)"
      >
        <!-- Left -->
        <div class="inv-lc-left">
          <div class="inv-lc-top">
            <span class="inv-lc-nomor">{{ inv.nomorInvoice }}</span>
            <span :class="tipeBadgeClass(inv.tipe)">{{ tipeLabel(inv) }}</span>
            <span :class="statusBadge(inv.status)">{{ inv.status }}</span>
          </div>
          <div class="inv-lc-perihal">{{ inv.perihal }}</div>
          <div class="inv-lc-meta">
            <span class="inv-lc-meta-item">
              <Building2 :size="12" />
              {{ inv.client }}
            </span>
            <span class="inv-lc-meta-item">
              <Calendar :size="12" />
              {{ formatDate(inv.tanggal) }}
            </span>
            <span class="inv-lc-meta-item">
              <Clock :size="12" />
              Jatuh Tempo: <strong style="color: var(--text-primary);">{{ formatDate(inv.jatuhTempo) }}</strong>
            </span>
          </div>
        </div>

        <!-- Right -->
        <div class="inv-lc-right" @click.stop>
          <div class="inv-lc-total">{{ rp(totalAkhir(inv.items, inv.ppn)) }}</div>
          <div class="inv-lc-sub">{{ inv.items.length }} Items &bull; Incl. PPN {{ inv.ppn }}%</div>
          <div class="inv-lc-actions">
            <button
              v-if="inv.status === 'Terkirim'"
              class="inv-lunas-btn"
              title="Tandai Lunas"
              @click.stop="markLunas(inv.id)"
            >
              <CheckCircle2 :size="13" /> Tandai Lunas
            </button>
            <button class="inv-icon-btn" title="Edit" @click="openEdit(inv)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="inv-icon-btn inv-icon-del" title="Hapus" @click="confirmDelete(inv.id)">
              <Trash2 :size="15" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────── -->
    <div v-if="filtered.length > 0" class="inv-pagination">
      <span class="inv-page-info">Menampilkan {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filtered.length) }} dari {{ filtered.length }} invoice</span>
      <div class="inv-page-controls">
        <button class="inv-page-btn" :disabled="currentPage <= 1" @click="currentPage--">Sebelumnya</button>
        <button
          v-for="n in totalPages" :key="n"
          class="inv-page-btn inv-page-num"
          :class="{ active: n === currentPage }"
          @click="currentPage = n"
        >{{ n }}</button>
        <button class="inv-page-btn" :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
      </div>
    </div>

    <!-- ── Detail Modal ──────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="selected" class="modal-overlay" @click.self="closeDetail">
        <div class="modal-box" style="max-width: 720px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header" style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
            <div>
              <h2>{{ selected.nomorInvoice }}</h2>
              <p style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">{{ selected.perihal }}</p>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-ghost" style="padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 6px; border-radius: 6px; border: 1px solid var(--border-color);" @click="exportToPdf">
                <Download :size="14" />
                Export PDF
              </button>
              <span :class="tipeBadgeClass(selected.tipe)" style="font-size: 11px;">{{ tipeLabel(selected) }}</span>
              <span :class="statusStyle(selected.status)">{{ selected.status }}</span>
              <button class="modal-close" @click="closeDetail"><X :size="16" /></button>
            </div>
          </div>

          <div class="modal-body">
            <!-- Info Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
              <div class="drawer-info-item">
                <div class="drawer-info-label">Client</div>
                <div class="drawer-info-value">{{ selected.client }}</div>
              </div>
              <div class="drawer-info-item">
                <div class="drawer-info-label">Proyek</div>
                <div class="drawer-info-value" style="color: #60a5fa;">{{ selected.proyekKode }}</div>
              </div>
              <div class="drawer-info-item">
                <div class="drawer-info-label">Tanggal Invoice</div>
                <div class="drawer-info-value">{{ formatDate(selected.tanggal) }}</div>
              </div>
              <div class="drawer-info-item">
                <div class="drawer-info-label">Jatuh Tempo</div>
                <div class="drawer-info-value">{{ formatDate(selected.jatuhTempo) }}</div>
              </div>
              <div class="drawer-info-item" style="grid-column: 1 / -1;">
                <div class="drawer-info-label">Alamat Client</div>
                <div class="drawer-info-value">{{ selected.alamatClient }}</div>
              </div>
            </div>

            <!-- Items Table -->
            <div class="table-card" style="margin-bottom: 20px;">
              <table class="inv-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Deskripsi</th>
                    <th>Sat</th>
                    <th style="text-align: right;">Qty</th>
                    <th style="text-align: right;">Harga Satuan</th>
                    <th style="text-align: right;">Diskon</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in selected.items" :key="item.id">
                    <td style="color: var(--text-muted);">{{ idx + 1 }}</td>
                    <td>{{ item.nama }}</td>
                    <td style="color: var(--text-muted);">{{ item.satuan }}</td>
                    <td style="text-align: right;">{{ item.qty }}</td>
                    <td style="text-align: right;">{{ rp(item.hargaSatuan) }}</td>
                    <td style="text-align: right; color: #60a5fa;">{{ item.diskon }}%</td>
                    <td style="text-align: right; font-weight: 600; color: var(--text-primary);">{{ rp(subtotal(item)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Summary -->
            <div style="max-width: 320px; margin-left: auto;">
              <div class="inv-summary-row">
                <span>Subtotal</span>
                <span>{{ rp(totalSebelumPPN(selected.items)) }}</span>
              </div>
              <div class="inv-summary-row">
                <span>PPN {{ selected.ppn }}%</span>
                <span>{{ rp(totalSebelumPPN(selected.items) * selected.ppn / 100) }}</span>
              </div>
              <div class="inv-summary-row inv-summary-total">
                <span>Total Invoice</span>
                <span>{{ rp(totalAkhir(selected.items, selected.ppn)) }}</span>
              </div>
            </div>

            <!-- Catatan -->
            <div v-if="selected.catatan" style="margin-top: 20px; padding: 12px 14px; background: var(--bg-sidebar); border-radius: 8px; border: 1px solid var(--border-color);">
              <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em;">Catatan</div>
              <p style="font-size: 13px; color: var(--text-secondary);">{{ selected.catatan }}</p>
            </div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeDetail">Tutup</button>
            <button
              v-if="selected.status === 'Terkirim'"
              class="btn-primary btn-half"
              style="background: var(--accent-green);"
              @click="markLunas(selected.id); closeDetail()"
            >
              <CheckCircle2 :size="15" /> Tandai Lunas
            </button>
            <button v-else class="btn-primary btn-half" @click="openEdit(selected!); closeDetail()">Edit Invoice</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Tambah / Edit ──────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width: 820px; max-height: 92vh; overflow-y: auto; width: 95%;">
          <div class="modal-header" style="position: sticky; top: 0; background: var(--bg-card); z-index: 1;">
            <h2>{{ editId !== null ? 'Edit Invoice' : 'Buat Invoice Baru' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>

          <div class="modal-body">

            <!-- ① Pilih Proyek ─────────────────────────────── -->
            <div class="inv-section">
              <div class="inv-section-title">Pilih Proyek</div>
              <div style="position: relative;">
                <div class="inv-proyek-input">
                  <Search :size="15" style="color: var(--text-muted); flex-shrink: 0;" />
                  <input
                    v-model="proyekSearch"
                    class="inv-proyek-inp"
                    placeholder="Cari nama proyek, client, atau kode..."
                    @focus="showProyekDrop = true"
                    @blur="hideProyekDrop"
                  />
                  <ChevronDown :size="14" style="color: var(--text-muted); flex-shrink: 0;" />
                </div>
                <div v-if="showProyekDrop" class="inv-proyek-drop">
                  <div
                    v-for="pr in proyekFiltered" :key="pr.kode"
                    class="inv-proyek-option"
                    @mousedown.prevent="selectProyek(pr)"
                  >
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 13px;">{{ pr.nama }}</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">{{ pr.kode }} &bull; {{ pr.client }}</div>
                  </div>
                  <div v-if="proyekFiltered.length === 0" style="padding: 14px 16px; color: var(--text-muted); font-size: 13px;">Proyek tidak ditemukan</div>
                </div>
              </div>

              <!-- Auto-filled info -->
              <div v-if="form.client" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px;">
                <div class="inv-readonly-field">
                  <label>Client</label>
                  <span>{{ form.client }}</span>
                </div>
                <div class="inv-readonly-field">
                  <label>Kode Proyek</label>
                  <span style="color: #60a5fa;">{{ form.proyekKode }}</span>
                </div>
                <div class="inv-readonly-field" style="grid-column: 1 / -1;">
                  <label>Alamat</label>
                  <span>{{ form.alamatClient }}</span>
                </div>
              </div>
            </div>

            <!-- ② Info Invoice ──────────────────────────────── -->
            <div class="inv-section">
              <div class="inv-section-title">Detail Invoice</div>
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">No. Invoice</label>
                  <input v-model="form.nomorInvoice" class="form-input" placeholder="INV/2024/001" />
                </div>
                <div class="form-field">
                  <label class="form-label">Status</label>
                  <select v-model="form.status" class="form-select">
                    <option v-for="s in ['Draft','Terkirim','Lunas','Jatuh Tempo']" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-field">
                  <label class="form-label">Tanggal Invoice</label>
                  <input v-model="form.tanggal" type="date" class="form-input" />
                </div>
                <div class="form-field">
                  <label class="form-label">Jatuh Tempo</label>
                  <input v-model="form.jatuhTempo" type="date" class="form-input" />
                </div>
              </div>
              <!-- Tipe Tagihan -->
              <div class="form-row" style="margin-top: 4px;">
                <div class="form-field">
                  <label class="form-label">Tipe Tagihan</label>
                  <select v-model="form.tipe" class="form-select">
                    <option value="DP">DP (Uang Muka)</option>
                    <option value="Termin">Termin</option>
                    <option value="Pelunasan">Pelunasan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div class="form-field" v-if="form.tipe === 'Termin'">
                  <label class="form-label">Nomor Termin</label>
                  <input v-model.number="form.nomorTermin" type="number" min="1" class="form-input" placeholder="1" />
                </div>
              </div>
              <div class="form-field" style="margin-top: 4px;">
                <label class="form-label">Perihal</label>
                <input v-model="form.perihal" class="form-input" placeholder="Perihal invoice..." />
              </div>
            </div>

            <!-- ③ Daftar Item ──────────────────────────────── -->
            <div class="inv-section">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                <div class="inv-section-title" style="margin-bottom: 0;">Daftar Item Tagihan</div>
                <button class="btn-ghost" style="font-size: 12px; padding: 6px 12px;" @click="addItem">
                  <Plus :size="13" /> Tambah Item
                </button>
              </div>

              <div class="table-card">
                <table class="inv-table inv-edit-table">
                  <thead>
                    <tr>
                      <th style="width: 36px;">#</th>
                      <th>Deskripsi Item / Pekerjaan</th>
                      <th style="width: 90px;">Satuan</th>
                      <th style="width: 70px; text-align: right;">Qty</th>
                      <th style="width: 140px; text-align: right;">Harga Satuan</th>
                      <th style="width: 80px; text-align: right;">Dis. %</th>
                      <th style="width: 140px; text-align: right;">Subtotal</th>
                      <th style="width: 36px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, idx) in items" :key="item.id">
                      <td style="color: var(--text-muted); font-size: 12px;">{{ idx + 1 }}</td>
                      <td>
                        <input v-model="item.nama" class="inv-cell-input" placeholder="Nama item..." />
                      </td>
                      <td>
                        <input v-model="item.satuan" class="inv-cell-input" placeholder="unit" />
                      </td>
                      <td>
                        <input v-model.number="item.qty" type="number" min="1" class="inv-cell-input inv-cell-right" />
                      </td>
                      <td>
                        <input v-model.number="item.hargaSatuan" type="number" min="0" step="1000" class="inv-cell-input inv-cell-right" />
                      </td>
                      <td>
                        <input v-model.number="item.diskon" type="number" min="0" max="100" class="inv-cell-input inv-cell-right" />
                      </td>
                      <td style="text-align: right; font-size: 12.5px; font-weight: 600; color: var(--text-primary); padding-right: 8px;">
                        {{ rp(subtotal(item)) }}
                      </td>
                      <td>
                        <button class="inv-remove-btn" @click="removeItem(item.id)" :disabled="items.length <= 1" title="Hapus item">
                          <X :size="13" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Totals -->
              <div style="max-width: 300px; margin-left: auto; margin-top: 16px;">
                <div class="inv-summary-row">
                  <span>Subtotal</span>
                  <span>{{ rp(totalSebelumPPN(items)) }}</span>
                </div>
                <div class="inv-summary-row" style="align-items: center;">
                  <span>PPN (%)</span>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <input v-model.number="form.ppn" type="number" min="0" max="100" class="form-input" style="width: 60px; padding: 4px 8px; text-align: right; font-size: 12px;" />
                    <span style="font-size: 12px;">= {{ rp(totalSebelumPPN(items) * form.ppn / 100) }}</span>
                  </div>
                </div>
                <div class="inv-summary-row inv-summary-total">
                  <span>Total Invoice</span>
                  <span>{{ rp(totalAkhir(items, form.ppn)) }}</span>
                </div>
              </div>
            </div>

            <!-- ④ Catatan ─────────────────────────────────── -->
            <div class="inv-section">
              <div class="inv-section-title">Catatan</div>
              <textarea v-model="form.catatan" class="form-input" rows="3" placeholder="Catatan tambahan untuk invoice..." style="resize: vertical;"></textarea>
            </div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal">Batal</button>
            <button
              class="btn-primary btn-half"
              :disabled="!form.proyekKode"
              @click="submitForm"
            >
              {{ editId !== null ? 'Simpan Perubahan' : 'Buat Invoice' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Confirm Delete Modal ───────────────────────────────── -->
    <Teleport to="body">
      <div v-if="confirmModal.show" class="modal-overlay" style="z-index: 9999;" @click.self="confirmModal.show = false">
        <div class="modal-box" style="max-width: 400px; padding: 24px; text-align: center;">
          <div style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(239,68,68,0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-red);">
              <Trash2 :size="22" />
            </div>
          </div>
          <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Hapus Invoice</h3>
          <p style="font-size: 13.5px; color: var(--text-secondary); margin-bottom: 24px;">Apakah Anda yakin ingin menghapus invoice ini? Tindakan ini tidak dapat dibatalkan.</p>
          <div style="display: flex; gap: 12px;">
            <button class="btn-ghost" style="flex: 1; padding: 10px; border-radius: 8px;" @click="confirmModal.show = false">Batal</button>
            <button class="btn-primary" style="flex: 1; padding: 10px; border-radius: 8px; background: var(--accent-red); box-shadow: none;" @click="doDelete">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

  </AdminLayout>
</template>

<style scoped>

/* ── Stats Grid ──────────────────────────────────────────── */
.inv-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 28px;
}
@media (max-width: 800px) { .inv-stats-grid { grid-template-columns: repeat(2, 1fr); } }

.inv-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color 0.18s;
}
.inv-stat-card:hover { border-color: rgba(59,130,246,0.25); }

.inv-stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.inv-stat-body { display: flex; flex-direction: column; gap: 4px; }
.inv-stat-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}
.inv-stat-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

/* ── Tab Bar ─────────────────────────────────────────────── */
.inv-tab-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.inv-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.18s;
  font-family: 'Inter', sans-serif;
  white-space: nowrap;
}
.inv-tab:hover { color: var(--text-primary); }
.inv-tab.active {
  color: #60a5fa;
  border-bottom-color: #60a5fa;
  font-weight: 700;
}

.inv-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 12px;
  margin-bottom: 6px;
}
.inv-search-inp {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13px;
  width: 200px;
  font-family: 'Inter', sans-serif;
}
.inv-search-inp::placeholder { color: var(--text-muted); }

/* ── List ────────────────────────────────────────────────── */
.inv-list { display: flex; flex-direction: column; gap: 10px; }

.inv-list-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  flex-wrap: wrap;
}
.inv-list-card:hover {
  border-color: rgba(59,130,246,0.3);
  background: rgba(255,255,255,0.015);
}

.inv-lc-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.inv-lc-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.inv-lc-nomor {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 3px 10px;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

/* Status Badges */
.inv-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.inv-badge-draft    { background: rgba(107,114,128,0.15); color: #9ca3af; }
.inv-badge-terkirim { background: rgba(245,158,11,0.18);  color: #f59e0b; }
.inv-badge-lunas    { background: rgba(16,185,129,0.18);  color: var(--accent-green); }
.inv-badge-jt       { background: rgba(239,68,68,0.18);   color: var(--accent-red); }

/* Tipe Badges */
.tipe-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 5px;
  letter-spacing: 0.03em;
}
.tipe-dp        { background: rgba(59,130,246,0.15); color: #60a5fa; }
.tipe-termin    { background: rgba(139,92,246,0.18); color: #a78bfa; }
.tipe-pelunasan { background: rgba(16,185,129,0.15); color: var(--accent-green); }
.tipe-lainnya   { background: rgba(107,114,128,0.15); color: #9ca3af; }

.inv-lc-perihal {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.inv-lc-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.inv-lc-meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.inv-lc-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.inv-lc-total {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  white-space: nowrap;
}
.inv-lc-sub {
  font-size: 11.5px;
  color: var(--text-muted);
}
.inv-lc-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  align-items: center;
}

.inv-lunas-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid rgba(16,185,129,0.4);
  background: rgba(16,185,129,0.1);
  color: var(--accent-green);
  cursor: pointer;
  transition: all 0.18s;
  font-family: 'Inter', sans-serif;
}
.inv-lunas-btn:hover { background: rgba(16,185,129,0.2); }

.inv-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-sidebar);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s;
}
.inv-icon-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: rgba(59,130,246,0.4);
}
.inv-icon-btn.inv-icon-del:hover {
  color: var(--accent-red);
  border-color: rgba(239,68,68,0.4);
  background: rgba(239,68,68,0.08);
}

/* ── Pagination ──────────────────────────────────────────── */
.inv-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.inv-page-info {
  font-size: 12.5px;
  color: var(--text-muted);
  font-style: italic;
}
.inv-page-controls { display: flex; gap: 6px; align-items: center; }
.inv-page-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.18s;
  font-family: 'Inter', sans-serif;
}
.inv-page-btn:hover:not(:disabled) {
  color: var(--text-primary);
  border-color: rgba(59,130,246,0.35);
}
.inv-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.inv-page-num { min-width: 36px; text-align: center; }
.inv-page-num.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
  font-weight: 700;
}

/* ── Section in Modal ────────────────────────────────────── */
.inv-section {
  margin-bottom: 28px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}
.inv-section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
.inv-section-title {
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #60a5fa;
  margin-bottom: 14px;
}

/* ── Project Search Dropdown ─────────────────────────────── */
.inv-proyek-input {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0 14px;
  transition: border-color var(--transition-fast);
}
.inv-proyek-input:focus-within { border-color: #3b82f6; }
.inv-proyek-inp {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13.5px;
  padding: 11px 0;
  font-family: 'Inter', sans-serif;
}
.inv-proyek-inp::placeholder { color: var(--text-muted); }

.inv-proyek-drop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  z-index: 500;
  max-height: 220px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.inv-proyek-option {
  padding: 10px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--border-color);
}
.inv-proyek-option:last-child { border-bottom: none; }
.inv-proyek-option:hover { background: var(--bg-card-hover); }

/* ── Read-only field ─────────────────────────────────────── */
.inv-readonly-field {
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 9px 14px;
}
.inv-readonly-field label {
  display: block;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  margin-bottom: 3px;
}
.inv-readonly-field span { font-size: 13.5px; color: var(--text-primary); font-weight: 500; }

/* ── Table ───────────────────────────────────────────────── */
.table-card {
  background: var(--bg-sidebar);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow-x: auto;
}
.inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.inv-table th {
  text-align: left;
  padding: 12px 14px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
  background: rgba(255,255,255,0.02);
}
.inv-table th:first-child { border-top-left-radius: 12px; }
.inv-table th:last-child  { border-top-right-radius: 12px; }
.inv-table td { padding: 12px 14px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
.inv-table tbody tr:hover td { background: rgba(255,255,255,0.01); }
.inv-table tbody tr:last-child td { border-bottom: none; }

.inv-edit-table .inv-cell-input {
  width: 100%;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  color: var(--text-primary);
  font-size: 13px;
  padding: 5px 7px;
  font-family: 'Inter', sans-serif;
  transition: border-color var(--transition-fast);
  outline: none;
  min-width: 0;
}
.inv-edit-table .inv-cell-input:focus {
  border-color: #3b82f6;
  background: rgba(59,130,246,0.05);
}
.inv-cell-right { text-align: right; }
input[type=number].inv-cell-right { text-align: right; }

.inv-remove-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: all var(--transition-fast);
}
.inv-remove-btn:hover:not(:disabled) { color: var(--accent-red); background: rgba(239,68,68,0.1); }
.inv-remove-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── Summary ─────────────────────────────────────────────── */
.inv-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 0;
  font-size: 13px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-subtle);
}
.inv-summary-row:last-child { border-bottom: none; }
.inv-summary-total {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid var(--border-color);
}

</style>
