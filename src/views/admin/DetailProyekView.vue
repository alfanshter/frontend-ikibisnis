<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { ArrowLeft, Trash2, Building2, User, Phone, Mail, Users, ChevronRight, Clock, ClipboardCheck, Handshake, CheckCircle2, PauseCircle, ShoppingCart, Package, DollarSign, Wallet, Receipt, FileText, AlertCircle, RefreshCw } from '@lucide/vue'
import {
  proyeksApi,
  type ProyekResponse, type StatusProyek
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

onMounted(() => {
  fetchProyekDetail()
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
            <div style="font-size: 12px; color: var(--accent-orange); font-weight: 600; letter-spacing: 0.05em;">{{ detailProyek.kode }}</div>
            <h1 style="font-size: 22px; color: var(--text-primary); margin: 0; font-weight: 700;">{{ detailProyek.nama }}</h1>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" style="background: var(--bg-card); color: #ef4444; border: 1px solid var(--border-color); box-shadow: none;" @click="hapusProyek">
            <Trash2 :size="16" style="margin-right: 6px;" /> Hapus
          </button>
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
        <h3 class="dp-section-title">Informasi Internal Proyek</h3>
        <p style="color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; font-size: 14px;">{{ detailProyek.deskripsi || '—' }}</p>
        <div class="dp-info-grid">
          <div class="dp-info-item">
            <div class="dp-info-label">PIC Internal</div>
            <div class="dp-info-value">{{ detailProyek.pic }}</div>
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
        <h3 class="dp-section-title">
          <Users :size="16" style="color: var(--accent-orange);" />
          Tim Proyek
        </h3>
        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
          <div v-if="!detailProyek.tim || detailProyek.tim.length === 0" style="color: var(--text-muted); font-size: 13.5px;">
            Belum ada tim yang ditugaskan.
          </div>
          <div v-else v-for="member in detailProyek.tim" :key="member.id" class="dp-member-card">
            <div class="dp-member-avatar">{{ getInitials(member.nama_anggota) }}</div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">{{ member.nama_anggota }}</div>
              <div style="font-size: 12px; color: var(--text-muted);">{{ member.role || 'Anggota Tim' }}</div>
            </div>
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

</style>
