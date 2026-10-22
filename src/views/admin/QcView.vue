<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  Search, ChevronRight, ChevronLeft,
  ShieldCheck, AlertCircle, RotateCcw, Clock3, FileSearch
} from '@lucide/vue'

const router = useRouter()

interface ProyekQcSummary {
  id: number
  kode: string
  nama: string
  statusProyek: string
  totalQc: number
  lulusCount: number
  reviewCount: number
  revisiCount: number
  draftCount: number
  progressPercent: number
  lastUpdate: string
}

const proyekList = ref<ProyekQcSummary[]>([
  { id: 1, kode: 'P#S-2024-031', nama: 'CCTV Warehouse Surabaya',    statusProyek: 'Berjalan',      totalQc: 3, lulusCount: 2, reviewCount: 1, revisiCount: 0, draftCount: 0, progressPercent: 85, lastUpdate: '2024-07-01' },
  { id: 2, kode: 'P#S-2024-032', nama: 'Access Control Office CBD',  statusProyek: 'QC',            totalQc: 2, lulusCount: 0, reviewCount: 1, revisiCount: 1, draftCount: 0, progressPercent: 50, lastUpdate: '2024-06-14' },
  { id: 3, kode: 'P#S-2024-033', nama: 'Fire Alarm RS Medika',       statusProyek: 'Berjalan',      totalQc: 2, lulusCount: 1, reviewCount: 0, revisiCount: 0, draftCount: 1, progressPercent: 40, lastUpdate: '2024-06-13' },
  { id: 4, kode: 'P#S-2024-035', nama: 'PA System Gedung A Pemkab',  statusProyek: 'Berjalan',      totalQc: 1, lulusCount: 1, reviewCount: 0, revisiCount: 0, draftCount: 0, progressPercent: 100, lastUpdate: '2024-06-11' },
  { id: 5, kode: 'P#S-2024-028', nama: 'CCTV Perumahan Grand',       statusProyek: 'Selesai',       totalQc: 0, lulusCount: 0, reviewCount: 0, revisiCount: 0, draftCount: 0, progressPercent: 0,  lastUpdate: '—' },
  { id: 6, kode: 'P#S-2024-027', nama: 'Jaringan LAN Kantor Pusat',  statusProyek: 'Selesai',       totalQc: 4, lulusCount: 4, reviewCount: 0, revisiCount: 0, draftCount: 0, progressPercent: 100, lastUpdate: '2024-05-30' },
  { id: 7, kode: 'P#S-2024-036', nama: 'CCTV Terminal Pelabuhan',    statusProyek: 'Belum Dimulai', totalQc: 0, lulusCount: 0, reviewCount: 0, revisiCount: 0, draftCount: 0, progressPercent: 0,  lastUpdate: '—' },
])

// ─── Status proyek config ─────────────────────────────────────────────────────
const statusPrCfg: Record<string, { color: string; bg: string }> = {
  'Berjalan':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'QC':            { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  'Serah Terima':  { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  'Selesai':       { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  'Belum Dimulai': { color: '#4a5568', bg: 'rgba(74,85,104,0.12)' },
}

// ─── Global stats ─────────────────────────────────────────────────────────────
const totalQc     = computed(() => proyekList.value.reduce((s, p) => s + p.totalQc, 0))
const totalLulus  = computed(() => proyekList.value.reduce((s, p) => s + p.lulusCount, 0))
const totalReview = computed(() => proyekList.value.reduce((s, p) => s + p.reviewCount, 0))
const totalRevisi = computed(() => proyekList.value.reduce((s, p) => s + p.revisiCount, 0))

// ─── Progress ring SVG helper ─────────────────────────────────────────────────
const ringStrokeDash = (pct: number) => {
  const r = 22, circ = 2 * Math.PI * r
  const fill = (pct / 100) * circ
  return `${fill} ${circ}`
}
const ringColor = (pct: number) => {
  if (pct === 100) return '#22c55e'
  if (pct >= 70)  return '#3b82f6'
  if (pct >= 40)  return '#f59e0b'
  return '#ef4444'
}

// ─── Search + Pagination ──────────────────────────────────────────────────────
const searchQ    = ref('')
const currentPage = ref(1)
const itemsPerPage = 5

const filtered = computed(() => {
  const q = searchQ.value.toLowerCase()
  if (!q) return proyekList.value
  return proyekList.value.filter(p =>
    p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q)
  )
})

const totalPages   = computed(() => Math.ceil(filtered.value.length / itemsPerPage))
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filtered.value.slice(start, start + itemsPerPage)
})

watch(searchQ, () => { currentPage.value = 1 })

const goToQc = (id: number) => router.push(`/admin/proyek/${id}/qc`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 980px; margin: 0 auto; padding-bottom: 60px;">

      <!-- ── Page Hero Header ── -->
      <div class="qcg-hero">
        <div class="qcg-hero-icon">
          <ShieldCheck :size="28" />
        </div>
        <div>
          <h1 class="qcg-hero-title">Quality Control</h1>
          <p class="qcg-hero-sub">Pantau status inspeksi dan checklist kelulusan setiap proyek</p>
        </div>
      </div>

      <!-- ── Global Stats ── -->
      <div class="qcg-stats-row">
        <div class="qcg-stat">
          <div class="qcg-stat-top">
            <FileSearch :size="16" style="color:#3b82f6;" />
            <span class="qcg-stat-val" style="color:var(--text-primary);">{{ totalQc }}</span>
          </div>
          <div class="qcg-stat-lbl">Total QC Sheet</div>
        </div>
        <div class="qcg-stat-divider"></div>
        <div class="qcg-stat">
          <div class="qcg-stat-top">
            <ShieldCheck :size="16" style="color:#22c55e;" />
            <span class="qcg-stat-val" style="color:#22c55e;">{{ totalLulus }}</span>
          </div>
          <div class="qcg-stat-lbl">Lulus</div>
        </div>
        <div class="qcg-stat-divider"></div>
        <div class="qcg-stat">
          <div class="qcg-stat-top">
            <Clock3 :size="16" style="color:#f59e0b;" />
            <span class="qcg-stat-val" style="color:#f59e0b;">{{ totalReview }}</span>
          </div>
          <div class="qcg-stat-lbl">Dalam Review</div>
        </div>
        <div class="qcg-stat-divider"></div>
        <div class="qcg-stat">
          <div class="qcg-stat-top">
            <RotateCcw :size="16" style="color:#ef4444;" />
            <span class="qcg-stat-val" style="color:#ef4444;">{{ totalRevisi }}</span>
          </div>
          <div class="qcg-stat-lbl">Perlu Revisi</div>
        </div>
        <div class="qcg-stat-divider"></div>
        <div class="qcg-stat">
          <div class="qcg-stat-top">
            <AlertCircle :size="16" style="color:#8b5cf6;" />
            <span class="qcg-stat-val" style="color:#8b5cf6;">{{ proyekList.filter(p => p.totalQc === 0).length }}</span>
          </div>
          <div class="qcg-stat-lbl">Belum Ada QC</div>
        </div>
      </div>

      <!-- ── Search ── -->
      <div class="search-wrap" style="margin-bottom: 16px;">
        <Search :size="15" class="search-icon" />
        <input v-model="searchQ" class="search-input" placeholder="Cari nama proyek atau kode..." />
      </div>

      <!-- ── Empty ── -->
      <div v-if="filtered.length === 0" style="text-align:center; padding:60px 20px; color:var(--text-muted);">
        <ShieldCheck :size="40" style="margin-bottom:12px; opacity:0.3;" />
        <div style="font-size:14px;">Tidak ada proyek ditemukan.</div>
      </div>

      <!-- ── Proyek List ── -->
      <div v-else class="qcg-list">
        <div
          v-for="p in paginatedList"
          :key="p.id"
          class="qcg-row"
          :class="{ 'qcg-row-revisi': p.revisiCount > 0, 'qcg-row-full': p.progressPercent === 100 && p.totalQc > 0 }"
          @click="goToQc(p.id)"
        >
          <!-- Progress Ring -->
          <div class="qcg-ring-wrap">
            <svg class="qcg-ring" width="60" height="60" viewBox="0 0 60 60">
              <!-- Track -->
              <circle cx="30" cy="30" r="22" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="5" />
              <!-- Fill -->
              <circle
                cx="30" cy="30" r="22" fill="none"
                :stroke="ringColor(p.progressPercent)"
                stroke-width="5"
                stroke-linecap="round"
                :stroke-dasharray="ringStrokeDash(p.progressPercent)"
                stroke-dashoffset="0"
                transform="rotate(-90 30 30)"
                style="transition: stroke-dasharray 0.6s ease;"
              />
              <!-- Pct text -->
              <text x="30" y="35" text-anchor="middle" :fill="ringColor(p.progressPercent)" font-size="10" font-weight="700" font-family="monospace">
                {{ p.progressPercent }}%
              </text>
            </svg>
          </div>

          <!-- Main info -->
          <div class="qcg-info">
            <div class="qcg-info-top">
              <span class="qcg-kode">{{ p.kode }}</span>
              <span class="qcg-status-badge"
                :style="{ color: statusPrCfg[p.statusProyek]?.color, background: statusPrCfg[p.statusProyek]?.bg }"
              >{{ p.statusProyek }}</span>
            </div>
            <div class="qcg-nama">{{ p.nama }}</div>

            <!-- Inline QC status pills -->
            <div v-if="p.totalQc > 0" class="qcg-pills">
              <span v-if="p.lulusCount  > 0" class="qcg-pill qcg-pill-green">✓ {{ p.lulusCount }} Lulus</span>
              <span v-if="p.reviewCount > 0" class="qcg-pill qcg-pill-amber">⏳ {{ p.reviewCount }} Review</span>
              <span v-if="p.revisiCount > 0" class="qcg-pill qcg-pill-red">↺ {{ p.revisiCount }} Revisi</span>
              <span v-if="p.draftCount  > 0" class="qcg-pill qcg-pill-muted">✎ {{ p.draftCount }} Draft</span>
            </div>
            <div v-else class="qcg-empty-qc">Belum ada QC sheet untuk proyek ini</div>
          </div>

          <!-- Stats cluster -->
          <div class="qcg-cluster">
            <div class="qcg-cluster-num">{{ p.totalQc }}</div>
            <div class="qcg-cluster-lbl">Sheet</div>
          </div>

          <!-- Last update + arrow -->
          <div class="qcg-meta">
            <div v-if="p.lastUpdate !== '—'" style="text-align: right;">
              <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 2px;">Terakhir</div>
              <div style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">{{ p.lastUpdate }}</div>
            </div>
            <div v-else style="font-size: 11px; color: var(--text-muted); font-style: italic;">–</div>
            <div class="qcg-arrow-btn">
              <ChevronRight :size="16" />
            </div>
          </div>
        </div>
      </div>

      <!-- ── Footer & Pagination ── -->
      <div v-if="filtered.length > 0" class="qcg-footer">
        <div style="font-size: 12px; color: var(--text-muted);">
          {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filtered.length) }}
          dari {{ filtered.length }} proyek
        </div>

        <div v-if="totalPages > 1" class="qcg-pagination">
          <button class="qcg-pager" :disabled="currentPage === 1" @click="currentPage--">
            <ChevronLeft :size="14" />
          </button>
          <button
            v-for="n in totalPages" :key="n"
            class="qcg-page-num" :class="{ active: n === currentPage }"
            @click="currentPage = n"
          >{{ n }}</button>
          <button class="qcg-pager" :disabled="currentPage === totalPages" @click="currentPage++">
            <ChevronRight :size="14" />
          </button>
        </div>
      </div>

    </div>
  </AdminLayout>
</template>

<style scoped>
/* ── Hero Header ── */
.qcg-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
}
.qcg-hero-icon {
  width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.1));
  border: 1px solid rgba(34,197,94,0.2);
  color: #22c55e;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 24px rgba(34,197,94,0.1);
}
.qcg-hero-title {
  font-size: 24px; font-weight: 800;
  color: var(--text-primary); margin: 0 0 4px;
}
.qcg-hero-sub {
  font-size: 13px; color: var(--text-muted); margin: 0;
}

/* ── Stats Row ── */
.qcg-stats-row {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 18px 24px;
  margin-bottom: 20px;
  gap: 0;
  flex-wrap: wrap;
}
.qcg-stat {
  flex: 1; min-width: 90px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 4px 8px;
}
.qcg-stat-top {
  display: flex; align-items: center; gap: 8px;
}
.qcg-stat-val {
  font-size: 24px; font-weight: 800;
  font-family: monospace; line-height: 1;
}
.qcg-stat-lbl {
  font-size: 11px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.qcg-stat-divider {
  width: 1px; height: 40px; background: var(--border-color); flex-shrink: 0; margin: 0 4px;
}

/* ── List ── */
.qcg-list { display: flex; flex-direction: column; gap: 8px; }

.qcg-row {
  display: grid;
  grid-template-columns: 72px 1fr auto auto;
  align-items: center;
  gap: 20px;
  padding: 18px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
}
.qcg-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--border-color);
  transition: background 0.2s;
}
.qcg-row:hover {
  border-color: rgba(34,197,94,0.2);
  background: var(--bg-card-hover);
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(0,0,0,0.15);
}
.qcg-row:hover::before { background: #22c55e; }
.qcg-row-revisi { border-color: rgba(239,68,68,0.2); }
.qcg-row-revisi::before { background: #ef4444 !important; }
.qcg-row-full::before { background: #22c55e; }

/* Ring */
.qcg-ring-wrap { display: flex; align-items: center; justify-content: center; }
.qcg-ring { display: block; }

/* Info */
.qcg-info { min-width: 0; }
.qcg-info-top {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px;
}
.qcg-kode {
  font-size: 11px; font-weight: 700; color: var(--text-muted);
  letter-spacing: 0.06em; text-transform: uppercase;
}
.qcg-status-badge {
  font-size: 11px; font-weight: 600;
  padding: 2px 9px; border-radius: 20px;
}
.qcg-nama {
  font-size: 15px; font-weight: 700; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  margin-bottom: 8px;
}
.qcg-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.qcg-pill {
  font-size: 11.5px; font-weight: 600;
  padding: 3px 10px; border-radius: 20px;
}
.qcg-pill-green { background: rgba(34,197,94,0.1); color: #22c55e; }
.qcg-pill-amber { background: rgba(245,158,11,0.1); color: #f59e0b; }
.qcg-pill-red   { background: rgba(239,68,68,0.1); color: #ef4444; }
.qcg-pill-muted { background: rgba(255,255,255,0.05); color: var(--text-muted); }
.qcg-empty-qc {
  font-size: 12px; color: var(--text-muted);
  font-style: italic; padding: 2px 0;
}

/* Cluster */
.qcg-cluster {
  text-align: center; padding: 0 12px;
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
}
.qcg-cluster-num {
  font-size: 24px; font-weight: 800;
  font-family: monospace; color: var(--text-primary); line-height: 1;
}
.qcg-cluster-lbl {
  font-size: 10px; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; margin-top: 3px;
}

/* Meta */
.qcg-meta {
  display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
  min-width: 100px;
}
.qcg-arrow-btn {
  width: 30px; height: 30px; border-radius: 8px;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.15);
  color: #22c55e; opacity: 0.5;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.qcg-row:hover .qcg-arrow-btn {
  opacity: 1;
  transform: translateX(2px);
}
.qcg-row-revisi .qcg-arrow-btn {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.2);
  color: #ef4444;
}

/* ── Footer & Pagination ── */
.qcg-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.qcg-pagination {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px; padding: 5px;
}
.qcg-pager {
  background: transparent; border: none;
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
}
.qcg-pager:hover:not(:disabled) {
  background: rgba(255,255,255,0.05); color: var(--text-primary);
}
.qcg-pager:disabled { opacity: 0.3; cursor: not-allowed; }
.qcg-page-num {
  background: transparent; border: 1px solid transparent;
  min-width: 28px; height: 28px; border-radius: 6px;
  font-size: 13px; font-weight: 600; color: var(--text-secondary);
  cursor: pointer; transition: all 0.2s;
}
.qcg-page-num:hover:not(.active) { background: rgba(255,255,255,0.05); }
.qcg-page-num.active {
  background: rgba(34,197,94,0.12);
  color: #22c55e; border-color: rgba(34,197,94,0.3);
}

@media (max-width: 680px) {
  .qcg-row { grid-template-columns: 60px 1fr; }
  .qcg-cluster, .qcg-meta { display: none; }
  .qcg-stats-row { gap: 8px; }
}
</style>
