<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  Search, ChevronRight, ChevronLeft, Clock, CheckCircle,
  AlertTriangle, FolderOpen, BarChart2
} from '@lucide/vue'

const router = useRouter()

// ─── Proyek master list + summary stats per proyek ───────────────────────────
interface ProyekLog {
  id: number
  kode: string
  nama: string
  status: string
  totalLog: number
  normalCount: number
  kendalaCount: number
  totalJam: number
  lastUpdate: string
}

const proyekList = ref<ProyekLog[]>([
  { id: 1, kode: 'P#S-2024-031', nama: 'CCTV Warehouse Surabaya',    status: 'Berjalan',      totalLog: 3, normalCount: 2, kendalaCount: 1, totalJam: 17, lastUpdate: '2024-07-01' },
  { id: 2, kode: 'P#S-2024-032', nama: 'Access Control Office CBD',  status: 'QC',            totalLog: 2, normalCount: 2, kendalaCount: 0, totalJam: 11, lastUpdate: '2024-06-14' },
  { id: 3, kode: 'P#S-2024-033', nama: 'Fire Alarm RS Medika',       status: 'Berjalan',      totalLog: 2, normalCount: 1, kendalaCount: 1, totalJam: 12, lastUpdate: '2024-06-13' },
  { id: 4, kode: 'P#S-2024-035', nama: 'PA System Gedung A Pemkab',  status: 'Berjalan',      totalLog: 1, normalCount: 1, kendalaCount: 0, totalJam: 5,  lastUpdate: '2024-06-11' },
  { id: 5, kode: 'P#S-2024-028', nama: 'CCTV Perumahan Grand',       status: 'Selesai',       totalLog: 0, normalCount: 0, kendalaCount: 0, totalJam: 0,  lastUpdate: '—' },
  { id: 6, kode: 'P#S-2024-027', nama: 'Jaringan LAN Kantor Pusat',  status: 'Selesai',       totalLog: 0, normalCount: 0, kendalaCount: 0, totalJam: 0,  lastUpdate: '—' },
  { id: 7, kode: 'P#S-2024-036', nama: 'CCTV Terminal Pelabuhan',    status: 'Belum Dimulai', totalLog: 0, normalCount: 0, kendalaCount: 0, totalJam: 0,  lastUpdate: '—' },
  { id: 8, kode: 'P#S-2024-034', nama: 'Security System Hotel Bali', status: 'Serah Terima',  totalLog: 0, normalCount: 0, kendalaCount: 0, totalJam: 0,  lastUpdate: '—' },
])

// ─── Status config ────────────────────────────────────────────────────────────
const statusCfg: Record<string, { color: string; bg: string }> = {
  'Berjalan':      { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'QC':            { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'Serah Terima':  { color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  'Selesai':       { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  'Belum Dimulai': { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  'Hold':          { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

// ─── Global stats ─────────────────────────────────────────────────────────────
const totalLog   = computed(() => proyekList.value.reduce((s, p) => s + p.totalLog, 0))
const totalJam   = computed(() => proyekList.value.reduce((s, p) => s + p.totalJam, 0))
const totalKend  = computed(() => proyekList.value.reduce((s, p) => s + p.kendalaCount, 0))
const aktifCount = computed(() => proyekList.value.filter(p => p.totalLog > 0).length)

// ─── Search / Filter ──────────────────────────────────────────────────────────
const searchQ = ref('')

const filtered = computed(() => {
  const q = searchQ.value.toLowerCase()
  if (!q) return proyekList.value
  return proyekList.value.filter(p =>
    p.nama.toLowerCase().includes(q) ||
    p.kode.toLowerCase().includes(q) ||
    p.status.toLowerCase().includes(q)
  )
})

// ─── Pagination ───────────────────────────────────────────────────────────────
const currentPage = ref(1)
const itemsPerPage = ref(5) // Bisa disesuaikan jumlah per halaman

const totalPages = computed(() => Math.ceil(filtered.value.length / itemsPerPage.value))

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filtered.value.slice(start, start + itemsPerPage.value)
})

const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const setPage = (p: number) => { currentPage.value = p }

watch(searchQ, () => {
  currentPage.value = 1
})

const goToLog = (id: number) => router.push(`/admin/proyek/${id}/pekerjaan`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 900px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Header ── -->
      <div style="margin-bottom: 24px;">
        <h1 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px;">Log Pekerjaan</h1>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Pilih proyek untuk melihat dan mencatat aktivitas lapangan</p>
      </div>

      <!-- ── Global Stats ── -->
      <div class="lp-stats">
        <div class="lp-stat-card">
          <div class="lp-stat-icon" style="background:rgba(59,130,246,0.12); color:#3b82f6;">
            <BarChart2 :size="18" />
          </div>
          <div>
            <div class="lp-stat-num">{{ totalLog }}</div>
            <div class="lp-stat-label">Total Log</div>
          </div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-icon" style="background:rgba(99,102,241,0.12); color:#6366f1;">
            <Clock :size="18" />
          </div>
          <div>
            <div class="lp-stat-num" style="color:#6366f1;">{{ totalJam }}<span style="font-size:12px; font-weight:500;"> jam</span></div>
            <div class="lp-stat-label">Total Jam Kerja</div>
          </div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-icon" style="background:rgba(245,158,11,0.12); color:var(--accent-orange);">
            <AlertTriangle :size="18" />
          </div>
          <div>
            <div class="lp-stat-num" style="color:var(--accent-orange);">{{ totalKend }}</div>
            <div class="lp-stat-label">Total Kendala</div>
          </div>
        </div>
        <div class="lp-stat-card">
          <div class="lp-stat-icon" style="background:rgba(34,197,94,0.12); color:#22c55e;">
            <FolderOpen :size="18" />
          </div>
          <div>
            <div class="lp-stat-num" style="color:#22c55e;">{{ aktifCount }}</div>
            <div class="lp-stat-label">Proyek Aktif Log</div>
          </div>
        </div>
      </div>

      <!-- ── Search ── -->
      <div class="lp-search-wrap" style="margin-bottom:16px;">
        <Search :size="15" class="lp-search-icon" />
        <input v-model="searchQ" class="lp-search-input" placeholder="Cari nama proyek, kode, atau status..." />
      </div>

      <!-- ── Empty ── -->
      <div v-if="filtered.length === 0" style="text-align:center; padding:60px 20px; color:var(--text-muted);">
        <FolderOpen :size="40" style="margin-bottom:12px; opacity:0.4;" />
        <div style="font-size:14px;">Tidak ada proyek ditemukan.</div>
      </div>

      <!-- ── Proyek Master List ── -->
      <div v-else class="lp-list">
        <div
          v-for="p in paginatedList"
          :key="p.id"
          class="lp-card"
          @click="goToLog(p.id)"
        >
          <!-- Kiri: Info proyek -->
          <div class="lp-card-left">
            <div class="lp-card-icon">
              <FolderOpen :size="20" />
            </div>
            <div>
              <div class="lp-card-kode">{{ p.kode }}</div>
              <div class="lp-card-nama">{{ p.nama }}</div>
              <div style="margin-top:6px;">
                <span class="lp-status-badge"
                  :style="{ color: statusCfg[p.status]?.color ?? '#94a3b8', background: statusCfg[p.status]?.bg ?? 'rgba(148,163,184,0.1)' }"
                >
                  {{ p.status }}
                </span>
              </div>
            </div>
          </div>

          <!-- Tengah: Summary stats -->
          <div class="lp-card-stats">
            <div class="lp-cs-item">
              <div class="lp-cs-num">{{ p.totalLog }}</div>
              <div class="lp-cs-label">Log</div>
            </div>
            <div class="lp-cs-divider"></div>
            <div class="lp-cs-item">
              <div class="lp-cs-num" style="color:#22c55e;">{{ p.normalCount }}</div>
              <div class="lp-cs-label">Normal</div>
            </div>
            <div class="lp-cs-divider"></div>
            <div class="lp-cs-item">
              <div class="lp-cs-num" :style="p.kendalaCount > 0 ? 'color:var(--accent-orange)' : ''">{{ p.kendalaCount }}</div>
              <div class="lp-cs-label">Kendala</div>
            </div>
            <div class="lp-cs-divider"></div>
            <div class="lp-cs-item">
              <div class="lp-cs-num" style="color:#6366f1;">{{ p.totalJam }}</div>
              <div class="lp-cs-label">Jam</div>
            </div>
          </div>

          <!-- Kanan: Last update + arrow -->
          <div class="lp-card-right">
            <div v-if="p.lastUpdate !== '—'">
              <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px;">Update terakhir</div>
              <div style="font-size:13px; font-weight:600; color:var(--text-secondary);">{{ p.lastUpdate }}</div>
            </div>
            <div v-else style="font-size:12px; color:var(--text-muted); font-style:italic;">Belum ada log</div>
            <ChevronRight :size="18" class="lp-arrow" />
          </div>

          <!-- Kendala indicator bar -->
          <div v-if="p.kendalaCount > 0" class="lp-warn-strip"></div>
        </div>
      </div>

      <!-- Footer + Pagination -->
      <div v-if="filtered.length > 0" style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="font-size: 12px; color: var(--text-muted);">
          Menampilkan {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filtered.length) }} dari {{ filtered.length }} proyek
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
      </div>

    </div>
  </AdminLayout>
</template>

<style scoped>
/* ── Stats ── */
.lp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 650px) { .lp-stats { grid-template-columns: repeat(2, 1fr); } }
.lp-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.lp-stat-icon {
  width: 38px; height: 38px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.lp-stat-num {
  font-size: 22px; font-weight: 800;
  color: var(--text-primary); font-family: monospace; line-height: 1.2;
}
.lp-stat-label {
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px;
}

/* ── Search ── */
.lp-search-wrap { position: relative; }
.lp-search-icon {
  position: absolute; left: 13px; top: 50%;
  transform: translateY(-50%); color: var(--text-muted);
}
.lp-search-input {
  width: 100%; padding: 10px 14px 10px 38px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 10px; color: var(--text-primary); font-size: 13.5px;
  outline: none; box-sizing: border-box; transition: border-color 0.2s;
}
.lp-search-input:focus { border-color: var(--accent-orange); }

/* ── List ── */
.lp-list { display: flex; flex-direction: column; gap: 10px; }
.lp-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 20px;
  padding: 18px 22px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
}
.lp-card:hover {
  border-color: rgba(245,158,11,0.3);
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  transform: translateY(-1px);
}
@media (max-width: 680px) {
  .lp-card { grid-template-columns: 1fr; }
  .lp-card-stats { justify-content: flex-start; }
  .lp-card-right { flex-direction: row; align-items: center; justify-content: space-between; }
}

/* Left */
.lp-card-left {
  display: flex; align-items: flex-start; gap: 14px;
}
.lp-card-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: rgba(245,158,11,0.1); color: var(--accent-orange);
  display: flex; align-items: center; justify-content: center;
}
.lp-card-kode {
  font-size: 11px; font-weight: 700;
  color: var(--accent-orange); letter-spacing: 0.04em; margin-bottom: 3px;
}
.lp-card-nama {
  font-size: 15px; font-weight: 700; color: var(--text-primary);
}
.lp-status-badge {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border-radius: 20px;
  font-size: 11.5px; font-weight: 600;
}

/* Center stats */
.lp-card-stats {
  display: flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border-color);
  border-radius: 10px; padding: 10px 16px;
}
.lp-cs-item { text-align: center; padding: 0 10px; }
.lp-cs-num {
  font-size: 18px; font-weight: 800;
  font-family: monospace; color: var(--text-primary); line-height: 1;
}
.lp-cs-label {
  font-size: 10px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin-top: 3px;
}
.lp-cs-divider {
  width: 1px; height: 30px; background: var(--border-color); flex-shrink: 0;
}

/* Right */
.lp-card-right {
  display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
}
.lp-arrow {
  color: var(--accent-orange); opacity: 0.6;
  transition: opacity 0.15s, transform 0.15s;
}
.lp-card:hover .lp-arrow { opacity: 1; transform: translateX(3px); }

/* Kendala warning strip */
.lp-warn-strip {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #f59e0b, #f97316);
  border-radius: 14px 0 0 14px;
}

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
