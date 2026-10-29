<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { formatRp } from '@/utils/currency'
import {
  Wallet, Banknote, Clock, Users,
  Search, ChevronDown, CheckCircle2,
  AlertCircle, ChevronRight, BadgeCheck, Star, Building2
} from '@lucide/vue'

const router = useRouter()

// ── Types ──
type TipeKaryawan  = 'Karyawan Tetap' | 'Freelance'
type StatusPembayaran = 'Belum Dibayar' | 'Sebagian' | 'Lunas'

interface GlobalFeeItem {
  id: number
  proyekId: number
  proyekKode: string
  proyekNama: string
  nama: string
  tipe: TipeKaryawan
  role: string
  feeTotal: number
  feeDibayar: number
  statusBayar: StatusPembayaran
}

// ── Mock Data (Global) ──
const feeList = ref<GlobalFeeItem[]>([
  { id: 101, proyekId: 1, proyekKode: 'P#S-2024-031', proyekNama: 'CCTV Warehouse Surabaya', nama: 'Rizal Firmansyah', tipe: 'Karyawan Tetap', role: 'Project Manager', feeTotal: 5000000, feeDibayar: 5000000, statusBayar: 'Lunas' },
  { id: 102, proyekId: 1, proyekKode: 'P#S-2024-031', proyekNama: 'CCTV Warehouse Surabaya', nama: 'Joko Susilo', tipe: 'Karyawan Tetap', role: 'Teknisi Utama', feeTotal: 3500000, feeDibayar: 3500000, statusBayar: 'Lunas' },
  { id: 103, proyekId: 1, proyekKode: 'P#S-2024-031', proyekNama: 'CCTV Warehouse Surabaya', nama: 'Bayu Pradana', tipe: 'Freelance', role: 'Helper Teknisi', feeTotal: 2000000, feeDibayar: 1000000, statusBayar: 'Sebagian' },
  { id: 104, proyekId: 2, proyekKode: 'P#S-2024-032', proyekNama: 'Access Control Office CBD', nama: 'Budi Santoso', tipe: 'Karyawan Tetap', role: 'Programmer', feeTotal: 4000000, feeDibayar: 0, statusBayar: 'Belum Dibayar' },
  { id: 105, proyekId: 2, proyekKode: 'P#S-2024-032', proyekNama: 'Access Control Office CBD', nama: 'Agus Subagyo', tipe: 'Freelance', role: 'Drafter', feeTotal: 1500000, feeDibayar: 500000, statusBayar: 'Sebagian' },
  { id: 106, proyekId: 3, proyekKode: 'P#S-2024-033', proyekNama: 'Fire Alarm RS Medika', nama: 'Rizal Firmansyah', tipe: 'Karyawan Tetap', role: 'Project Manager', feeTotal: 6000000, feeDibayar: 0, statusBayar: 'Belum Dibayar' },
  { id: 107, proyekId: 3, proyekKode: 'P#S-2024-033', proyekNama: 'Fire Alarm RS Medika', nama: 'Dimas Wicaksono', tipe: 'Freelance', role: 'Teknisi Kabel', feeTotal: 2500000, feeDibayar: 0, statusBayar: 'Belum Dibayar' },
  { id: 108, proyekId: 4, proyekKode: 'P#S-2024-035', proyekNama: 'PA System Gedung A', nama: 'Joko Susilo', tipe: 'Karyawan Tetap', role: 'Teknisi Utama', feeTotal: 4500000, feeDibayar: 4500000, statusBayar: 'Lunas' },
])

// ── Status config ──
const statusCfg: Record<StatusPembayaran, { color: string; bg: string; border: string; icon: any }> = {
  'Belum Dibayar': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.25)',   icon: AlertCircle  },
  'Sebagian':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.25)',  icon: Clock        },
  'Lunas':         { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.25)',   icon: CheckCircle2 },
}

const tipeCfg: Record<TipeKaryawan, { color: string; bg: string; icon: any }> = {
  'Karyawan Tetap': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  icon: BadgeCheck },
  'Freelance':      { color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  icon: Star       },
}

const getInitials = (name: string) => {
  if (!name) return 'U'
  const p = name.split(' ')
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase()
}

// ── Filters ──
const searchQ = ref('')
const filterStatus = ref<StatusPembayaran | 'Semua'>('Semua')

// Extract unique projects for filter
const uniqueProjects = computed(() => {
  const proyeks = new Map<number, string>()
  feeList.value.forEach(f => proyeks.set(f.proyekId, f.proyekKode))
  return Array.from(proyeks.entries()).map(([id, kode]) => ({ id, kode }))
})
const filterProyek = ref<number | 'Semua'>('Semua')

const filteredList = computed(() => feeList.value.filter(f => {
  const q = searchQ.value.toLowerCase()
  const matchSearch = !q || f.nama.toLowerCase().includes(q) || f.role.toLowerCase().includes(q) || f.proyekNama.toLowerCase().includes(q)
  const matchStatus = filterStatus.value === 'Semua' || f.statusBayar === filterStatus.value
  const matchProyek = filterProyek.value === 'Semua' || f.proyekId === filterProyek.value
  return matchSearch && matchStatus && matchProyek
}))

// ── Pagination ──
const pageSize = ref(10)
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / pageSize.value)))
const paginatedList = computed(() => filteredList.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

watch([searchQ, filterStatus, filterProyek], () => { currentPage.value = 1 })

// ── Stats (Global) ──
const totalFee = computed(() => filteredList.value.reduce((s, f) => s + f.feeTotal, 0))
const totalDibayar = computed(() => filteredList.value.reduce((s, f) => s + f.feeDibayar, 0))
const totalSisa = computed(() => totalFee.value - totalDibayar.value)
const pctDibayar = computed(() => totalFee.value > 0 ? ((totalDibayar.value / totalFee.value) * 100).toFixed(0) : '0')

const fmtRp = (n: number | string | null | undefined) => formatRp(n)

const openProyekFee = (proyekId: number) => {
  router.push(`/admin/proyek/${proyekId}/fee-tim`)
}

</script>

<template>
  <AdminLayout>
    <!-- ── Toolbar ── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Fee Tim (Global)</h1>
        <p>Ringkasan pembayaran fee tim dan freelance di seluruh proyek</p>
      </div>
    </div>

    <!-- ── Stats ── -->
    <div class="gf-stats">
      <div class="gf-stat-card">
        <div class="gf-stat-icon" style="background:rgba(245,158,11,0.12); color:var(--accent-orange);"><Wallet :size="20" /></div>
        <div>
          <div class="gf-stat-label">Total Kewajiban Fee</div>
          <div class="gf-stat-val">{{ fmtRp(totalFee) }}</div>
        </div>
      </div>
      <div class="gf-stat-card">
        <div class="gf-stat-icon" style="background:rgba(34,197,94,0.12); color:#22c55e;"><Banknote :size="20" /></div>
        <div>
          <div class="gf-stat-label">Total Telah Dibayar</div>
          <div class="gf-stat-val" style="color:#22c55e;">{{ fmtRp(totalDibayar) }}</div>
        </div>
      </div>
      <div class="gf-stat-card">
        <div class="gf-stat-icon" style="background:rgba(239,68,68,0.12); color:#ef4444;"><Clock :size="20" /></div>
        <div>
          <div class="gf-stat-label">Sisa Belum Dibayar</div>
          <div class="gf-stat-val" style="color:#ef4444;">{{ fmtRp(totalSisa) }}</div>
        </div>
      </div>
      <div class="gf-stat-card">
        <div class="gf-stat-icon" style="background:rgba(59,130,246,0.12); color:#3b82f6;"><Users :size="20" /></div>
        <div>
          <div class="gf-stat-label">Total Personil</div>
          <div class="gf-stat-val" style="color:#3b82f6;">{{ filteredList.length }}</div>
        </div>
      </div>
    </div>

    <!-- ── Realisasi Bar ── -->
    <div class="card" style="padding: 20px 24px; margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <span style="font-size:14px; font-weight:700; color:var(--text-primary);">Realisasi Pembayaran Keseluruhan</span>
        <span style="font-size:13px; color:var(--text-muted);">
          <span style="color:#22c55e; font-weight:700;">{{ fmtRp(totalDibayar) }}</span>
          &nbsp;/&nbsp;{{ fmtRp(totalFee) }}
          &nbsp;·&nbsp;
          <span style="color:var(--accent-orange); font-weight:700; font-size:14px;">{{ pctDibayar }}%</span>
        </span>
      </div>
      <div style="background:rgba(255,255,255,0.06); border-radius:10px; height:12px; overflow:hidden;">
        <div
          style="height:100%; border-radius:10px; background:linear-gradient(90deg,#22c55e,#16a34a); transition:width 0.5s ease;"
          :style="{ width: pctDibayar + '%' }"
        ></div>
      </div>
    </div>

    <!-- ── Filter Bar ── -->
    <div class="gf-filter-bar">
      <div class="gf-search-wrap">
        <Search :size="15" class="gf-search-icon" />
        <input v-model="searchQ" class="gf-search-input" placeholder="Cari nama anggota, role, atau nama proyek..." />
      </div>
      <div style="display:flex; gap:10px; flex-wrap: wrap;">
        <div class="gf-select-wrap">
          <select v-model="filterProyek" class="gf-select">
            <option value="Semua">Semua Proyek</option>
            <option v-for="p in uniqueProjects" :key="p.id" :value="p.id">{{ p.kode }}</option>
          </select>
          <ChevronDown :size="13" class="gf-select-arrow" />
        </div>
        <div class="gf-select-wrap">
          <select v-model="filterStatus" class="gf-select">
            <option value="Semua">Semua Status</option>
            <option value="Belum Dibayar">Belum Dibayar</option>
            <option value="Sebagian">Sebagian</option>
            <option value="Lunas">Lunas</option>
          </select>
          <ChevronDown :size="13" class="gf-select-arrow" />
        </div>
      </div>
    </div>

    <!-- ── Table ── -->
    <div class="table-card">
      <div class="table-responsive">
        <table class="gf-table">
          <thead>
            <tr>
              <th>Personil</th>
              <th>Proyek</th>
              <th style="text-align: right;">Fee Total</th>
              <th style="text-align: right;">Dibayar</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="paginatedList.length === 0">
              <td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                Tidak ada data fee yang sesuai dengan filter pencarian.
              </td>
            </tr>
            <tr v-for="f in paginatedList" :key="f.id" class="gf-row" @click="openProyekFee(f.proyekId)">
              <td>
                <div style="display:flex; align-items:center; gap:12px;">
                  <div class="gf-avatar" :style="{ background: tipeCfg[f.tipe].bg, color: tipeCfg[f.tipe].color }">
                    {{ getInitials(f.nama) }}
                  </div>
                  <div>
                    <div style="font-weight:600; color:var(--text-primary); font-size:13.5px; margin-bottom:2px;">{{ f.nama }}</div>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <span style="font-size:12px; color:var(--text-secondary);">{{ f.role }}</span>
                      <span class="gf-dot"></span>
                      <span style="font-size:11px;" :style="{ color: tipeCfg[f.tipe].color }">{{ f.tipe }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td>
                <div style="display:flex; align-items:center; gap:8px;">
                  <div class="gf-proyek-icon"><Building2 :size="13" /></div>
                  <div>
                    <div style="font-family:monospace; font-weight:700; color:var(--accent-blue); font-size:12px; margin-bottom:1px;">{{ f.proyekKode }}</div>
                    <div style="font-size:12px; color:var(--text-secondary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ f.proyekNama }}</div>
                  </div>
                </div>
              </td>
              <td style="text-align: right; font-family: monospace; font-weight: 600; font-size: 13.5px;">
                {{ fmtRp(f.feeTotal) }}
              </td>
              <td style="text-align: right;">
                <div style="font-family: monospace; font-weight: 600; font-size: 13.5px;" :style="{ color: f.feeDibayar > 0 ? '#22c55e' : 'var(--text-muted)' }">
                  {{ fmtRp(f.feeDibayar) }}
                </div>
                <div v-if="f.feeTotal > f.feeDibayar" style="font-size: 10.5px; color: #ef4444; margin-top: 2px;">
                  Sisa: {{ fmtRp(f.feeTotal - f.feeDibayar) }}
                </div>
              </td>
              <td>
                <div
                  class="gf-status-badge"
                  :style="{ color: statusCfg[f.statusBayar].color, background: statusCfg[f.statusBayar].bg, border: `1px solid ${statusCfg[f.statusBayar].border}` }"
                >
                  <component :is="statusCfg[f.statusBayar].icon" :size="12" />
                  {{ f.statusBayar }}
                </div>
              </td>
              <td style="text-align: right; width: 40px;">
                <button class="gf-go-btn" title="Kelola Fee di Proyek">
                  <ChevronRight :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div v-if="filteredList.length > 0" class="gf-pagination">
        <span class="gf-page-info">Menampilkan {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredList.length) }} dari {{ filteredList.length }} data</span>
        <div class="gf-page-controls">
          <button class="gf-page-btn" :disabled="currentPage <= 1" @click="currentPage--">Sebelumnya</button>
          <button v-for="n in totalPages" :key="n" class="gf-page-btn" :class="{ active: n === currentPage }" @click="currentPage = n">{{ n }}</button>
          <button class="gf-page-btn" :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
/* ── Stats ── */
.gf-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
@media (max-width: 900px) { .gf-stats { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .gf-stats { grid-template-columns: 1fr; } }
.gf-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: transform 0.2s;
}
.gf-stat-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.1); }
.gf-stat-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.gf-stat-label {
  font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;
}
.gf-stat-val {
  font-size: 20px; font-weight: 800; color: var(--text-primary); font-family: monospace; line-height: 1.1;
}

/* ── Filter Bar ── */
.gf-filter-bar {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 16px;
}
.gf-search-wrap {
  position: relative; flex: 1; min-width: 250px;
}
.gf-search-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted);
}
.gf-search-input {
  width: 100%; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;
  padding: 10px 14px 10px 38px; color: var(--text-primary); font-size: 13.5px; transition: border-color 0.2s;
}
.gf-search-input:focus { outline: none; border-color: var(--accent-orange); }
.gf-select-wrap { position: relative; }
.gf-select {
  appearance: none; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;
  padding: 10px 34px 10px 14px; color: var(--text-primary); font-size: 13px; font-weight: 500; cursor: pointer;
  min-width: 140px;
}
.gf-select:focus { outline: none; border-color: var(--accent-blue); }
.gf-select-arrow { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; }

/* ── Table ── */
.gf-table { width: 100%; border-collapse: collapse; }
.gf-table th {
  text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);
  padding: 14px 20px; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02); font-weight: 600;
}
.gf-table td { padding: 14px 20px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
.gf-row { cursor: pointer; transition: background 0.15s; }
.gf-row:hover { background: rgba(255,255,255,0.02); }
.gf-row:hover .gf-go-btn { color: var(--accent-orange); background: rgba(245,158,11,0.1); }

.gf-avatar {
  width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}
.gf-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-muted); opacity: 0.5; }

.gf-proyek-icon {
  width: 28px; height: 28px; border-radius: 6px; background: rgba(59,130,246,0.1); color: #60a5fa;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

.gf-status-badge {
  display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600;
  padding: 4px 10px; border-radius: 20px;
}

.gf-go-btn {
  background: transparent; border: none; color: var(--text-muted); cursor: pointer;
  width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}

/* ── Pagination ── */
.gf-pagination {
  display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-top: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;
}
.gf-page-info { font-size: 12.5px; color: var(--text-muted); }
.gf-page-controls { display: flex; gap: 6px; }
.gf-page-btn {
  background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 6px;
  padding: 6px 12px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; transition: all 0.15s;
}
.gf-page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
.gf-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.gf-page-btn.active { background: rgba(59,130,246,0.1); color: #3b82f6; border-color: rgba(59,130,246,0.3); }

</style>
