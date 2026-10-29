<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { formatRp } from '@/utils/currency'
import {
  ArrowLeft, Plus, Search, FileText, X, Trash2,
  CheckCircle2, Clock, AlertCircle, Building2, Calendar, DollarSign, RefreshCw,
  BookOpen, CreditCard
} from '@lucide/vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  proyeksApi,
  proyekInvoicesApi,
  type ProyekResponse,
  type ProyekInvoiceResponse,
  type ProyekInvoiceItem
} from '@/services/api'

const route    = useRoute()
const router   = useRouter()
const proyekId = Number(route.params.id)

// ─── State ───────────────────────────────────────────────────────────────────
const proyek = ref<ProyekResponse | null>(null)
const invoiceList = ref<ProyekInvoiceResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [pRes, iRes] = await Promise.all([
      proyeksApi.show(proyekId),
      proyekInvoicesApi.list(proyekId)
    ])
    proyek.value = pRes.data
    invoiceList.value = iRes.data
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

// ─── Filters ──────────────────────────────────────────────────────────────────
const search       = ref('')
const activeFilter = ref<'Semua' | 'Draft' | 'Terkirim' | 'Lunas' | 'Jatuh Tempo'>('Semua')
const filterOptions = ['Semua', 'Draft', 'Terkirim', 'Lunas', 'Jatuh Tempo'] as const

const filtered = computed(() => {
  let list = invoiceList.value
  if (activeFilter.value !== 'Semua') list = list.filter(i => i.status === activeFilter.value)
  const q = search.value.toLowerCase().trim()
  if (q) list = list.filter(i =>
    (i.nomor_invoice && i.nomor_invoice.toLowerCase().includes(q)) ||
    (i.perihal && i.perihal.toLowerCase().includes(q))
  )
  return list
})

// ─── Stats ────────────────────────────────────────────────────────────────────
const statTotal      = computed(() => invoiceList.value.length)
const statTerkirim   = computed(() => invoiceList.value.filter(i => i.status === 'Terkirim').length)
const statLunas      = computed(() => invoiceList.value.filter(i => i.status === 'Lunas').length)
const statJatuhTempo = computed(() => invoiceList.value.filter(i => i.status === 'Jatuh Tempo').length)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const subtotal         = (item: ProyekInvoiceItem) => item.qty * item.harga_satuan * (1 - item.diskon / 100)
const totalSebelumPPN  = (its: ProyekInvoiceItem[]) => its.reduce((a, i) => a + subtotal(i), 0)
const totalAkhir       = (its: ProyekInvoiceItem[], ppn: number) => { const sub = totalSebelumPPN(its); return sub + sub * ppn / 100 }
const rp               = (val: number | string | null | undefined) => formatRp(val)
const tipeLabel        = (inv: ProyekInvoiceResponse) => inv.tipe === 'Termin' ? `Termin ${inv.nomor_termin ?? ''}` : inv.tipe

const formatDate = (d: string | null) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
  return `${parseInt(day!)} ${bulan[parseInt(m!) - 1]} ${y}`
}

const tipeBadgeClass = (tipe: string) => ({
  'DP': 'tipe-badge tipe-dp',
  'Termin': 'tipe-badge tipe-termin',
  'Pelunasan': 'tipe-badge tipe-pelunasan',
  'Sewa': 'tipe-badge tipe-sewa',
  'Sewa Bulanan': 'tipe-badge tipe-sewa',
}[tipe] ?? 'tipe-badge tipe-lainnya')

const statusBadge = (s: string) => ({
  'Draft': 'inv-badge inv-badge-draft',
  'Terkirim': 'inv-badge inv-badge-terkirim',
  'Lunas': 'inv-badge inv-badge-lunas',
  'Jatuh Tempo': 'inv-badge inv-badge-jt',
}[s] ?? 'inv-badge')

const statusIcon = (s: string) => {
  if (s === 'Lunas') return CheckCircle2
  if (s === 'Jatuh Tempo') return AlertCircle
  if (s === 'Terkirim') return Clock
  return FileText
}

// ─── Form ─────────────────────────────────────────────────────────────────────
const showModal = ref(false)
const editId    = ref<number | null>(null)

const emptyForm = () => ({
  nomor_invoice: `INV/${new Date().getFullYear()}/${String(invoiceList.value.length + 1).padStart(3, '0')}`,
  tanggal:      new Date().toISOString().slice(0, 10),
  jatuh_tempo:   new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  perihal:      '',
  catatan:      '',
  ppn:          11,
  tipe:         'DP' as ProyekInvoiceResponse['tipe'],
  nomor_termin:  1,
  status:       'Draft' as ProyekInvoiceResponse['status'],
})
const form  = ref(emptyForm())
const items = ref<ProyekInvoiceItem[]>([{ nama: '', satuan: 'unit', qty: 1, harga_satuan: 0, diskon: 0, hargaSatuan: 0 }])

const addItem    = () => items.value.push({ nama: '', satuan: 'unit', qty: 1, harga_satuan: 0, diskon: 0, hargaSatuan: 0 })
const removeItem = (idx: number) => { items.value.splice(idx, 1) }

// Auto fill perihal on tipe change
watch(() => form.value.tipe, (t) => {
  if (!editId.value) form.value.perihal = `Invoice ${t} - ${proyek.value?.nama}`
})

const openAdd = () => {
  editId.value = null
  form.value   = emptyForm()
  form.value.perihal = `Invoice DP - ${proyek.value?.nama}`
  items.value  = [{ nama: '', satuan: 'unit', qty: 1, harga_satuan: 0, diskon: 0, hargaSatuan: 0 }]
  showModal.value = true
}
const openEdit = (inv: ProyekInvoiceResponse) => {
  editId.value = inv.id
  form.value   = {
    nomor_invoice: inv.nomor_invoice,
    tanggal: inv.tanggal,
    jatuh_tempo: inv.jatuh_tempo || '',
    perihal: inv.perihal || '',
    catatan: inv.catatan || '',
    ppn: inv.ppn,
    tipe: inv.tipe,
    nomor_termin: inv.nomor_termin ?? 1,
    status: inv.status
  }
  items.value  = inv.items.map(i => ({ ...i }))
  showModal.value = true
}
const closeModal = () => { showModal.value = false }

const submitForm = async () => {
  if (!form.value.nomor_invoice) return
  saving.value = true
  
  // payload mapping
  const payload = {
    ...form.value,
    items: items.value.map(i => ({
      nama: i.nama,
      satuan: i.satuan,
      qty: i.qty,
      harga_satuan: i.harga_satuan,
      diskon: i.diskon
    }))
  }

  try {
    if (editId.value !== null) {
      await proyekInvoicesApi.update(proyekId, editId.value, payload)
    } else {
      await proyekInvoicesApi.create(proyekId, payload)
    }
    closeModal()
    await fetchData()
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan invoice')
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const confirmModal = ref({ show: false, id: 0 })
const confirmDelete = (id: number) => { confirmModal.value = { show: true, id } }
const doDelete = async () => {
  try {
    await proyekInvoicesApi.delete(proyekId, confirmModal.value.id)
    await fetchData()
  } catch (e: any) {
    alert(e.message || 'Gagal menghapus invoice')
  } finally {
    confirmModal.value.show = false
  }
}

// ─── Detail ───────────────────────────────────────────────────────────────────
const selected    = ref<ProyekInvoiceResponse | null>(null)
const openDetail  = (inv: ProyekInvoiceResponse) => { selected.value = inv }
const closeDetail = () => { selected.value = null }

// ─── Bayar Invoice Modal (Otomatis ke Pembukuan) ─────────────────────────────
const showBayarInvoiceModal = ref(false)
const targetPayInvoice      = ref<ProyekInvoiceResponse | null>(null)
const payForm = ref({
  tanggal_bayar:     new Date().toISOString().slice(0, 10),
  nominal:           0,
  metode_pembayaran: 'Transfer Bank BCA',
  catatan:           '',
  masuk_pembukuan:   true,
})

const invoiceMetodeOptions = [
  'Transfer Bank BCA',
  'Transfer Bank Mandiri',
  'Transfer Bank BRI',
  'Transfer Bank BNI',
  'Transfer Bank Lainnya',
  'Tunai / Cash',
  'QRIS',
  'Lainnya',
]

const openBayarInvoiceModal = (inv: ProyekInvoiceResponse) => {
  targetPayInvoice.value = inv
  const total = totalAkhir(inv.items, inv.ppn)
  payForm.value = {
    tanggal_bayar:     new Date().toISOString().slice(0, 10),
    nominal:           total,
    metode_pembayaran: 'Transfer Bank BCA',
    catatan:           `Pelunasan ${inv.nomor_invoice} - ${inv.perihal || ''}`,
    masuk_pembukuan:   true,
  }
  showBayarInvoiceModal.value = true
}

const submitPayInvoice = async () => {
  if (!targetPayInvoice.value) return
  saving.value = true
  try {
    const res = await proyekInvoicesApi.bayar(proyekId, targetPayInvoice.value.id, payForm.value)
    showBayarInvoiceModal.value = false
    alert(res.message || 'Pembayaran berhasil dicatat dan masuk ke Pembukuan!')
    await fetchData()
    if (selected.value?.id === targetPayInvoice.value.id) {
      selected.value = { ...res.data }
    }
  } catch (e: any) {
    alert(e.message || 'Gagal mencatat pembayaran')
  } finally {
    saving.value = false
  }
}

const markLunas = async (id: number) => {
  const inv = invoiceList.value.find(i => i.id === id)
  if (inv) {
    openBayarInvoiceModal(inv)
  }
}

// ─── Export PDF ───────────────────────────────────────────────────────────────
const exportToPdf = () => {
  if (!selected.value || !proyek.value) return
  const doc = new jsPDF()
  const inv = selected.value
  doc.setFontSize(20); doc.setTextColor(59, 130, 246); doc.text('INVOICE', 14, 22)
  doc.setFontSize(10); doc.setTextColor(100)
  doc.text(`Nomor: ${inv.nomor_invoice}`, 14, 30)
  doc.text(`Tanggal: ${formatDate(inv.tanggal)}`, 14, 35)
  doc.text(`Jatuh Tempo: ${formatDate(inv.jatuh_tempo)}`, 14, 40)
  doc.setFontSize(11); doc.setTextColor(40); doc.text('Kepada Yth.', 120, 22)
  doc.setFontSize(10); doc.text(proyek.value.perusahaan || 'Client', 120, 28)
  doc.text(doc.splitTextToSize(proyek.value.kategori || '', 70), 120, 34)
  doc.setFontSize(11); doc.text('Perihal: ', 14, 56); doc.setFontSize(10); doc.setTextColor(80); doc.text(inv.perihal || '', 34, 56)
  doc.setFontSize(11); doc.setTextColor(40); doc.text('Proyek: ', 14, 62); doc.setFontSize(10); doc.setTextColor(80)
  doc.text(`${proyek.value.kode} - ${proyek.value.nama}`, 34, 62)
  autoTable(doc, {
    startY: 72,
    head: [['No', 'Deskripsi', 'Qty', 'Harga Satuan', 'Diskon', 'Subtotal']],
    body: inv.items.map((item, i) => [i + 1, item.nama, item.qty + ' ' + item.satuan, rp(item.harga_satuan), item.diskon + '%', rp(subtotal(item))]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 2: { halign: 'center', cellWidth: 20 }, 3: { halign: 'right' }, 4: { halign: 'right', cellWidth: 20 }, 5: { halign: 'right' } }
  })
  const fY = (doc as any).lastAutoTable.finalY + 10
  const sub = totalSebelumPPN(inv.items); const ppnNom = sub * inv.ppn / 100; const tot = sub + ppnNom
  doc.setFontSize(10)
  doc.text('Subtotal:', 130, fY); doc.text(rp(sub), 196, fY, { align: 'right' })
  doc.text(`PPN (${inv.ppn}%):`, 130, fY + 6); doc.text(rp(ppnNom), 196, fY + 6, { align: 'right' })
  doc.setFontSize(12); doc.setTextColor(40); doc.setFont('helvetica', 'bold')
  doc.text('Total Invoice:', 130, fY + 14); doc.text(rp(tot), 196, fY + 14, { align: 'right' })
  doc.save(`${inv.nomor_invoice.replaceAll('/', '_')}.pdf`)
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const pageSize      = ref(5)
const currentPage   = ref(1)
const totalPages    = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const paginatedList = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
watch([search, activeFilter], () => { currentPage.value = 1 })

const goBack = () => router.push(`/admin/proyek/${proyekId}`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 960px; margin: 0 auto; padding-bottom: 60px;">

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
            <div style="font-size: 11px; color: var(--accent-orange); font-weight: 700; letter-spacing: 0.06em; margin-bottom: 2px;">{{ proyek?.kode }} · Invoice & Penagihan</div>
            <h1 style="font-size: 20px; color: var(--text-primary); margin: 0; font-weight: 700;">{{ proyek?.nama }}</h1>
          </div>
        </div>
        <button class="btn-primary" @click="openAdd">
          <Plus :size="14" style="margin-right: 6px;" /> Buat Invoice
        </button>
      </div>

      <!-- ── Stats ── -->
      <div class="pi-stats">
        <div class="pi-stat">
          <div class="pi-stat-icon" style="background:rgba(59,130,246,0.12); color:#3b82f6;"><FileText :size="16" /></div>
          <div>
            <div class="pi-stat-val">{{ String(statTotal).padStart(2, '0') }}</div>
            <div class="pi-stat-lbl">Total Invoice</div>
          </div>
        </div>
        <div class="pi-stat">
          <div class="pi-stat-icon" style="background:rgba(245,158,11,0.12); color:#f59e0b;"><Clock :size="16" /></div>
          <div>
            <div class="pi-stat-val" style="color:#f59e0b;">{{ String(statTerkirim).padStart(2, '0') }}</div>
            <div class="pi-stat-lbl">Menunggu Bayar</div>
          </div>
        </div>
        <div class="pi-stat">
          <div class="pi-stat-icon" style="background:rgba(34,197,94,0.12); color:#22c55e;"><CheckCircle2 :size="16" /></div>
          <div>
            <div class="pi-stat-val" style="color:#22c55e;">{{ String(statLunas).padStart(2, '0') }}</div>
            <div class="pi-stat-lbl">Lunas</div>
          </div>
        </div>
        <div class="pi-stat">
          <div class="pi-stat-icon" style="background:rgba(239,68,68,0.12); color:#ef4444;"><AlertCircle :size="16" /></div>
          <div>
            <div class="pi-stat-val" style="color:#ef4444;">{{ String(statJatuhTempo).padStart(2, '0') }}</div>
            <div class="pi-stat-lbl">Jatuh Tempo</div>
          </div>
        </div>
        <div class="pi-stat pi-stat-wide">
          <div class="pi-stat-icon" style="background:rgba(245,158,11,0.12); color:var(--accent-orange);"><DollarSign :size="16" /></div>
          <div style="flex: 1;">
            <div class="pi-stat-val pi-val-rp" style="color:var(--accent-orange);">
              {{ rp(invoiceList.reduce((s, inv) => s + totalAkhir(inv.items, inv.ppn), 0)) }}
            </div>
            <div class="pi-stat-lbl">Total Tagihan</div>
          </div>
        </div>
      </div>

      <!-- ── Filter Tabs ── -->
      <div class="inv-tab-bar" style="margin-bottom: 16px;">
        <button
          v-for="f in filterOptions" :key="f"
          class="inv-tab" :class="{ active: activeFilter === f }"
          @click="activeFilter = f"
        >{{ f === 'Semua' ? 'Semua Invoice' : f }}</button>
        <div style="flex: 1;"></div>
        <div class="inv-search-wrap">
          <Search :size="14" style="color: var(--text-muted); flex-shrink: 0;" />
          <input v-model="search" class="inv-search-inp" placeholder="Cari invoice..." />
        </div>
      </div>

      <!-- ── Empty ── -->
      <div v-if="filtered.length === 0" class="card" style="padding: 48px; text-align: center; color: var(--text-muted);">
        <FileText :size="32" style="margin: 0 auto 12px; opacity: 0.3;" />
        <p>Belum ada invoice untuk proyek ini.</p>
        <button class="btn-primary" style="margin-top: 14px;" @click="openAdd"><Plus :size="14" style="margin-right:6px;" /> Buat Invoice Pertama</button>
      </div>

      <!-- ── List ── -->
      <div v-else class="inv-list">
        <div
          v-for="inv in paginatedList" :key="inv.id"
          class="inv-list-card"
          @click="openDetail(inv)"
        >
          <div class="inv-lc-left">
            <div class="inv-lc-top">
              <span class="inv-lc-nomor">{{ inv.nomor_invoice }}</span>
              <span :class="tipeBadgeClass(inv.tipe)">{{ tipeLabel(inv) }}</span>
              <span :class="statusBadge(inv.status)">{{ inv.status }}</span>
            </div>
            <div class="inv-lc-perihal">{{ inv.perihal }}</div>
            <div class="inv-lc-meta">
              <span class="inv-lc-meta-item"><Calendar :size="12" /> {{ formatDate(inv.tanggal) }}</span>
              <span class="inv-lc-meta-item"><Clock :size="12" /> Jatuh Tempo: <strong style="color:var(--text-primary);">{{ formatDate(inv.jatuh_tempo) }}</strong></span>
              <span v-if="inv.pembayaran" class="inv-lc-meta-item" style="color:#4ade80; font-weight:600;">
                <CheckCircle2 :size="12" /> Dibayar {{ formatDate(inv.pembayaran.tanggal_bayar) }} ({{ inv.pembayaran.metode_pembayaran }})
              </span>
              <span v-if="inv.pembayaran?.masuk_pembukuan" class="inv-lc-meta-item" style="color:#c084fc; font-weight:600;">
                <BookOpen :size="12" /> Pembukuan #{{ inv.pembayaran.transaction_id }}
              </span>
            </div>
          </div>
          <div class="inv-lc-right" @click.stop>
            <div class="inv-lc-total">{{ rp(totalAkhir(inv.items, inv.ppn)) }}</div>
            <div class="inv-lc-sub">{{ inv.items.length }} item · PPN {{ inv.ppn }}%</div>
            <div class="inv-lc-actions">
              <button v-if="inv.status === 'Terkirim'" class="inv-lunas-btn" @click.stop="openBayarInvoiceModal(inv)">
                <CreditCard :size="13" /> Bayar / Lunas
              </button>
              <button class="inv-icon-btn" title="Edit" @click.stop="openEdit(inv)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="inv-icon-btn inv-icon-del" title="Hapus" @click.stop="confirmDelete(inv.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Pagination ── -->
      <div v-if="filtered.length > 0" class="inv-pagination">
        <span class="inv-page-info">{{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filtered.length) }} dari {{ filtered.length }} invoice</span>
        <div class="inv-page-controls">
          <button class="inv-page-btn" :disabled="currentPage <= 1" @click="currentPage--">Sebelumnya</button>
          <button v-for="n in totalPages" :key="n" class="inv-page-btn inv-page-num" :class="{ active: n === currentPage }" @click="currentPage = n">{{ n }}</button>
          <button class="inv-page-btn" :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
        </div>
      </div>

    </div>

    <!-- ── Detail Modal ── -->
    <Teleport to="body">
      <div v-if="selected" class="modal-overlay" @click.self="closeDetail">
        <div class="modal-box" style="max-width: 720px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header" style="position:sticky; top:0; background:var(--bg-card); z-index:1;">
            <div>
              <h2>{{ selected.nomor_invoice }}</h2>
              <p style="font-size:12px; color:var(--text-secondary); margin-top:2px;">{{ selected.perihal }}</p>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              <button class="btn-ghost" style="padding:6px 12px; font-size:12px; display:flex; align-items:center; gap:6px; border-radius:6px; border:1px solid var(--border-color);" @click="exportToPdf">
                Export PDF
              </button>
              <span :class="tipeBadgeClass(selected.tipe)" style="font-size:11px;">{{ tipeLabel(selected) }}</span>
              <span :class="statusBadge(selected.status)">{{ selected.status }}</span>
              <button class="modal-close" @click="closeDetail"><X :size="16" /></button>
            </div>
          </div>
          <div class="modal-body">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px;">
              <div class="drawer-info-item"><div class="drawer-info-label">Client</div><div class="drawer-info-value">{{ proyek?.perusahaan || proyek?.clientNama || '—' }}</div></div>
              <div class="drawer-info-item"><div class="drawer-info-label">Proyek</div><div class="drawer-info-value" style="color:#60a5fa;">{{ proyek?.kode }}</div></div>
              <div class="drawer-info-item"><div class="drawer-info-label">Tanggal Invoice</div><div class="drawer-info-value">{{ formatDate(selected.tanggal) }}</div></div>
              <div class="drawer-info-item"><div class="drawer-info-label">Jatuh Tempo</div><div class="drawer-info-value">{{ formatDate(selected.jatuh_tempo) }}</div></div>
              <div class="drawer-info-item" style="grid-column:1/-1;"><div class="drawer-info-label">Alamat Client</div><div class="drawer-info-value">{{ proyek?.alamat || '—' }}</div></div>
            </div>
            <div class="table-card" style="margin-bottom:20px;">
              <table class="inv-table">
                <thead>
                  <tr><th>No</th><th>Deskripsi</th><th>Sat</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Harga Satuan</th><th style="text-align:right;">Diskon</th><th style="text-align:right;">Subtotal</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in selected.items" :key="item.id">
                    <td style="color:var(--text-muted);">{{ idx + 1 }}</td>
                    <td>{{ item.nama }}</td>
                    <td style="color:var(--text-muted);">{{ item.satuan }}</td>
                    <td style="text-align:right;">{{ item.qty }}</td>
                    <td style="text-align:right;">{{ rp(item.harga_satuan) }}</td>
                    <td style="text-align:right; color:#60a5fa;">{{ item.diskon }}%</td>
                    <td style="text-align:right; font-weight:600; color:var(--text-primary);">{{ rp(subtotal(item)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style="max-width:320px; margin-left:auto;">
              <div class="inv-summary-row"><span>Subtotal</span><span>{{ rp(totalSebelumPPN(selected.items)) }}</span></div>
              <div class="inv-summary-row"><span>PPN {{ selected.ppn }}%</span><span>{{ rp(totalSebelumPPN(selected.items) * selected.ppn / 100) }}</span></div>
              <div class="inv-summary-row inv-summary-total"><span>Total Invoice</span><span>{{ rp(totalAkhir(selected.items, selected.ppn)) }}</span></div>
            </div>
            <div v-if="selected.pembayaran" style="margin-top:20px; padding:14px 16px; background:rgba(34,197,94,0.08); border-radius:10px; border:1px solid rgba(34,197,94,0.25);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size:13px; font-weight:700; color:#4ade80; display:flex; align-items:center; gap:6px;">
                  <CheckCircle2 :size="15" /> Pembayaran Telah Lunas
                </div>
                <div v-if="selected.pembayaran.masuk_pembukuan" style="font-size:11.5px; color:#c084fc; display:flex; align-items:center; gap:4px; font-weight:600;">
                  <BookOpen :size="13" /> Kas Masuk #{{ selected.pembayaran.transaction_id }}
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12.5px; color:var(--text-secondary);">
                <div>Tanggal: <strong style="color:var(--text-primary);">{{ formatDate(selected.pembayaran.tanggal_bayar) }}</strong></div>
                <div>Nominal: <strong style="color:#4ade80; font-family:monospace;">{{ rp(selected.pembayaran.nominal) }}</strong></div>
                <div>Metode: <strong style="color:var(--text-primary);">{{ selected.pembayaran.metode_pembayaran }}</strong></div>
                <div>No. Bukti: <strong style="color:var(--text-primary); font-family:monospace;">{{ selected.pembayaran.nomor_pembayaran || '—' }}</strong></div>
              </div>
              <div v-if="selected.pembayaran.catatan" style="font-size:12px; color:var(--text-muted); margin-top:8px; padding-top:6px; border-top:1px dashed rgba(255,255,255,0.1);">
                Catatan: {{ selected.pembayaran.catatan }}
              </div>
            </div>
            <div v-if="selected.catatan" style="margin-top:20px; padding:12px 14px; background:var(--bg-sidebar); border-radius:8px; border:1px solid var(--border-color);">
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px; font-weight:500; text-transform:uppercase; letter-spacing:0.06em;">Catatan</div>
              <p style="font-size:13px; color:var(--text-secondary);">{{ selected.catatan }}</p>
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeDetail">Tutup</button>
            <button v-if="selected.status === 'Terkirim'" class="btn-primary btn-half" style="background:var(--accent-green);" @click="openBayarInvoiceModal(selected!); closeDetail()">
              <CreditCard :size="15" /> Catat Pembayaran
            </button>
            <button v-else-if="selected.status !== 'Lunas'" class="btn-primary btn-half" @click="openEdit(selected!); closeDetail()">Edit Invoice</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Tambah/Edit ── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box" style="max-width:780px; max-height:92vh; overflow-y:auto; width:95%;">
          <div class="modal-header" style="position:sticky; top:0; background:var(--bg-card); z-index:1;">
            <h2>{{ editId !== null ? 'Edit Invoice' : 'Buat Invoice Baru' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <!-- Info Proyek (locked) -->
            <div class="inv-section">
              <div class="inv-section-title">Proyek</div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div class="inv-readonly-field"><label>Nama Proyek</label><span>{{ proyek?.nama }}</span></div>
                <div class="inv-readonly-field"><label>Kode Proyek</label><span style="color:#60a5fa;">{{ proyek?.kode }}</span></div>
                <div class="inv-readonly-field"><label>Client</label><span>{{ proyek?.perusahaan || proyek?.clientNama || '—' }}</span></div>
                <div class="inv-readonly-field"><label>Alamat</label><span>{{ proyek?.alamat || '—' }}</span></div>
              </div>
            </div>
            <!-- Detail Invoice -->
            <div class="inv-section">
              <div class="inv-section-title">Detail Invoice</div>
              <div class="form-row">
                <div class="form-field"><label class="form-label">No. Invoice</label><input v-model="form.nomor_invoice" class="form-input" /></div>
                <div class="form-field">
                  <label class="form-label">Tipe</label>
                  <select v-model="form.tipe" class="form-input">
                    <option v-for="t in ['DP','Termin','Pelunasan','Sewa','Sewa Bulanan','Lainnya']" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
              </div>
              <div v-if="form.tipe === 'Termin'" class="form-row single">
                <div class="form-field"><label class="form-label">Nomor Termin</label><input v-model.number="form.nomor_termin" type="number" min="1" class="form-input" /></div>
              </div>
              <div class="form-row">
                <div class="form-field"><label class="form-label">Tanggal Invoice</label><input v-model="form.tanggal" type="date" class="form-input" /></div>
                <div class="form-field"><label class="form-label">Jatuh Tempo</label><input v-model="form.jatuh_tempo" type="date" class="form-input" /></div>
              </div>
              <div class="form-row">
                <div class="form-field"><label class="form-label">Status</label>
                  <select v-model="form.status" class="form-input">
                    <option v-for="s in ['Draft','Terkirim','Lunas','Jatuh Tempo']" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
                <div class="form-field"><label class="form-label">PPN (%)</label><input v-model.number="form.ppn" type="number" min="0" class="form-input" /></div>
              </div>
              <div class="form-row single">
                <div class="form-field"><label class="form-label">Perihal</label><input v-model="form.perihal" class="form-input" /></div>
              </div>
            </div>
            <!-- Items -->
            <div class="inv-section">
              <div class="inv-section-title" style="display:flex; justify-content:space-between;">
                <span>Item Pekerjaan / Material</span>
                <button class="btn-ghost" style="font-size:12px; padding:4px 10px;" @click="addItem"><Plus :size="12" style="margin-right:4px;" /> Tambah Item</button>
              </div>
              <div v-for="(item, idx) in items" :key="item.id" class="inv-item-row">
                <div class="inv-item-num">{{ idx + 1 }}</div>
                <div class="inv-item-fields">
                  <input v-model="item.nama"         class="form-input"    placeholder="Nama item / pekerjaan" style="flex:2;" />
                  <input v-model="item.satuan"       class="form-input"    placeholder="Sat"   style="flex:0.6;" />
                  <input v-model.number="item.qty"   class="form-input"    type="number" min="1" placeholder="Qty" style="flex:0.6;" />
                  <input v-model.number="item.harga_satuan" class="form-input" type="number" min="0" placeholder="Harga Satuan" style="flex:1.4;" />
                  <input v-model.number="item.diskon" class="form-input"   type="number" min="0" max="100" placeholder="Diskon%" style="flex:0.6;" />
                  <div class="inv-item-sub">{{ rp(subtotal(item)) }}</div>
                </div>
                <button class="inv-item-del" @click="removeItem(item.id)"><X :size="14" /></button>
              </div>
              <div v-if="items.length > 0" style="display:flex; justify-content:flex-end; gap:16px; margin-top:12px; padding-top:12px; border-top:1px solid var(--border-color);">
                <span style="font-size:13px; color:var(--text-muted);">Subtotal: {{ rp(totalSebelumPPN(items)) }}</span>
                <span style="font-size:14px; font-weight:700; color:var(--accent-orange);">Total: {{ rp(totalAkhir(items, form.ppn)) }}</span>
              </div>
            </div>
            <!-- Catatan -->
            <div class="inv-section">
              <div class="inv-section-title">Catatan (opsional)</div>
              <textarea v-model="form.catatan" class="form-textarea" placeholder="Catatan tambahan..." style="min-height:70px;"></textarea>
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm">{{ editId !== null ? 'Simpan Perubahan' : 'Buat Invoice' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Konfirmasi Hapus ── -->
    <Teleport to="body">
      <div v-if="confirmModal.show" class="modal-overlay" @click.self="confirmModal.show = false">
        <div class="modal-box" style="max-width:400px; text-align:center; padding-top:32px;">
          <div style="width:64px; height:64px; border-radius:50%; background:rgba(239,68,68,0.1); color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
            <Trash2 :size="30" />
          </div>
          <h2 style="margin-bottom:10px; font-size:18px; color:var(--text-primary);">Hapus Invoice?</h2>
          <p style="color:var(--text-secondary); font-size:14px; margin-bottom:28px; line-height:1.6;">Data invoice ini akan dihapus secara permanen dan tidak dapat dikembalikan.</p>
          <div class="modal-footer modal-footer-split" style="border-top:none; padding:0;">
            <button class="btn-ghost btn-half" @click="confirmModal.show = false">Batal</button>
            <button class="btn-primary btn-half" style="background:#ef4444; border-color:#ef4444;" @click="doDelete">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Catat Pembayaran Invoice (Otomatis ke Pembukuan) ── -->
    <Teleport to="body">
      <div v-if="showBayarInvoiceModal && targetPayInvoice" class="modal-overlay" @click.self="showBayarInvoiceModal = false">
        <div class="modal-box" style="max-width: 520px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 8px;">
              <CreditCard :size="18" style="color: #22c55e;" />
              <h2 style="font-size: 16px; margin: 0;">Catat Pembayaran Invoice</h2>
            </div>
            <button class="modal-close" @click="showBayarInvoiceModal = false"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Invoice Banner -->
            <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 13.5px; font-weight: 700; color: #93c5fd; font-family: monospace;">
                  {{ targetPayInvoice.nomor_invoice }}
                </span>
                <span style="font-size: 14px; font-weight: 700; color: #4ade80; font-family: monospace;">
                  {{ rp(totalAkhir(targetPayInvoice.items, targetPayInvoice.ppn)) }}
                </span>
              </div>
              <div style="font-size: 12px; color: var(--text-secondary);">
                {{ targetPayInvoice.perihal || 'Invoice Proyek' }}
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Tanggal Pembayaran *</label>
                <input v-model="payForm.tanggal_bayar" type="date" class="form-input" />
              </div>
              <div class="form-field">
                <label class="form-label">Nominal (Rp) *</label>
                <input v-model.number="payForm.nominal" type="number" min="1000" class="form-input" />
              </div>
            </div>

            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Metode Pembayaran *</label>
                <select v-model="payForm.metode_pembayaran" class="form-input">
                  <option v-for="m in invoiceMetodeOptions" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>
            </div>

            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Catatan / Keterangan Transfer</label>
                <input v-model="payForm.catatan" type="text" class="form-input" placeholder="Misal: Transfer BCA a/n Client ref #1234" />
              </div>
            </div>

            <!-- Auto sync checkbox info box -->
            <div style="background: rgba(147, 51, 234, 0.08); border: 1px solid rgba(147, 51, 234, 0.25); border-radius: 8px; padding: 12px 14px;">
              <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
                <input type="checkbox" v-model="payForm.masuk_pembukuan" style="margin-top: 3px; accent-color: #9333ea; width: 16px; height: 16px;" />
                <div>
                  <div style="font-weight: 600; color: #f3e8ff; font-size: 13px;">Otomatis catat kas masuk ke Pembukuan</div>
                  <div style="font-size: 12px; color: #c084fc; line-height: 1.4; margin-top: 2px;">
                    Sistem akan otomatis mencatat transaksi kas masuk di Pembukuan dengan kategori "Pembayaran Client" dan nominal yang sesuai.
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="showBayarInvoiceModal = false" :disabled="saving">Batal</button>
            <button class="btn-primary btn-half" style="background: var(--accent-green);" @click="submitPayInvoice" :disabled="saving">
              {{ saving ? 'Menyimpan...' : 'Tandai Lunas & Sinkron Pembukuan' }}
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

/* ── Stats ── */
.pi-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 1.4fr;
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 900px) { .pi-stats { grid-template-columns: repeat(2, 1fr); } }
.pi-stat {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pi-stat-wide { grid-column: span 1; }
.pi-stat-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.pi-stat-val {
  font-size: 22px; font-weight: 800;
  color: var(--text-primary); font-family: monospace; line-height: 1.2;
}
.pi-val-rp { font-size: 15px; }
.pi-stat-lbl {
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;
}

/* ── Tab bar (reuse from global invoice) ── */
.inv-tab-bar {
  display: flex; align-items: center; gap: 4px;
  border-bottom: 1px solid var(--border-color); padding-bottom: 2px;
}
.inv-tab {
  background: none; border: none; padding: 8px 14px; font-size: 13px;
  color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all 0.15s; font-weight: 500;
}
.inv-tab:hover { color: var(--text-primary); }
.inv-tab.active { color: var(--accent-orange); border-bottom-color: var(--accent-orange); font-weight: 600; }
.inv-search-wrap {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 6px 12px;
}
.inv-search-inp {
  background: transparent; border: none; color: var(--text-primary); font-size: 13px; outline: none; width: 160px;
}

/* ── List card (inherits from global styles, redefine if needed) ── */
.inv-list { display: flex; flex-direction: column; gap: 10px; }
.inv-list-card {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;
  display: flex; justify-content: space-between; align-items: stretch;
  padding: 16px 20px; gap: 20px; cursor: pointer; transition: all 0.2s;
}
.inv-list-card:hover { border-color: rgba(59,130,246,0.25); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.inv-lc-left { flex: 1; min-width: 0; }
.inv-lc-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.inv-lc-nomor { font-family: monospace; font-size: 14px; font-weight: 700; color: var(--text-primary); }
.inv-lc-perihal { font-size: 13px; color: var(--text-secondary); margin-bottom: 6px; }
.inv-lc-meta { display: flex; gap: 16px; flex-wrap: wrap; }
.inv-lc-meta-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); }
.inv-lc-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.inv-lc-total { font-size: 17px; font-weight: 800; color: var(--accent-orange); font-family: monospace; }
.inv-lc-sub { font-size: 11px; color: var(--text-muted); }
.inv-lc-actions { display: flex; gap: 6px; align-items: center; }

/* Badges */
.tipe-badge { font-size: 11px; padding: 2px 9px; border-radius: 20px; font-weight: 600; }
.tipe-dp        { background: rgba(59,130,246,0.1); color: #60a5fa; }
.tipe-termin    { background: rgba(245,158,11,0.1); color: #f59e0b; }
.tipe-pelunasan { background: rgba(34,197,94,0.1);  color: #22c55e; }
.tipe-sewa      { background: rgba(168,85,247,0.12); color: #c084fc; border: 1px solid rgba(168,85,247,0.25); }
.tipe-lainnya   { background: rgba(148,163,184,0.1); color: #94a3b8; }
.inv-badge { font-size: 11px; padding: 2px 9px; border-radius: 20px; font-weight: 600; }
.inv-badge-draft    { background: rgba(107,114,128,0.1); color: #9ca3af; border: 1px solid rgba(107,114,128,0.2); }
.inv-badge-terkirim { background: rgba(245,158,11,0.1);  color: #f59e0b;  border: 1px solid rgba(245,158,11,0.2); }
.inv-badge-lunas    { background: rgba(34,197,94,0.1);   color: #22c55e;  border: 1px solid rgba(34,197,94,0.2); }
.inv-badge-jt       { background: rgba(239,68,68,0.1);   color: #ef4444;  border: 1px solid rgba(239,68,68,0.2); }

/* Action buttons */
.inv-lunas-btn {
  display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600;
  padding: 5px 10px; border-radius: 6px; cursor: pointer;
  background: rgba(34,197,94,0.1); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); transition: all 0.15s;
}
.inv-lunas-btn:hover { background: rgba(34,197,94,0.2); }
.inv-icon-btn {
  background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 5px 7px; color: var(--text-muted);
  cursor: pointer; display: flex; align-items: center; transition: all 0.15s;
}
.inv-icon-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.inv-icon-del:hover { background: rgba(239,68,68,0.1); color: #ef4444; border-color: rgba(239,68,68,0.3); }

/* Pagination */
.inv-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; flex-wrap: wrap; gap: 12px; }
.inv-page-info { font-size: 12px; color: var(--text-muted); }
.inv-page-controls { display: flex; gap: 6px; }
.inv-page-btn {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 500;
  color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.inv-page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
.inv-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.inv-page-num.active { background: rgba(59,130,246,0.1); color: #3b82f6; border-color: rgba(59,130,246,0.3); }

/* Table */
.inv-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.inv-table th { text-align: left; font-size: 10.5px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 14px; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02); }
.inv-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.04); }
.inv-table tr:last-child td { border-bottom: none; }

/* Summary */
.inv-summary-row { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-secondary); padding: 5px 0; border-bottom: 1px solid var(--border-color); }
.inv-summary-total { font-size: 15px; font-weight: 700; color: var(--accent-orange); border-bottom: none; padding-top: 10px; }

/* Modal form */
.inv-section { margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px; }
.inv-section:last-child { border-bottom: none; }
.inv-section-title { font-size: 13px; font-weight: 700; color: var(--text-primary); margin-bottom: 14px; }
.inv-readonly-field { background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; }
.inv-readonly-field label { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
.inv-readonly-field span { font-size: 13px; color: var(--text-primary); font-weight: 500; }
.inv-item-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.inv-item-num { width: 24px; text-align: center; font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
.inv-item-fields { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
.inv-item-fields .form-input { flex: 1; min-width: 80px; }
.inv-item-sub { font-size: 12px; font-weight: 700; color: var(--accent-orange); white-space: nowrap; align-self: center; flex-shrink: 0; min-width: 100px; text-align: right; }
.inv-item-del { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 4px; transition: color 0.15s; }
.inv-item-del:hover { color: #ef4444; }
</style>
