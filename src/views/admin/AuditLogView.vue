<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { auditLogsApi, type AuditLogResponse } from '@/services/api'
import {
  FileText, Plus, Pencil, Trash2, X, Search, Clock, User, Tag, 
  Activity, ArrowRight, Database, ChevronLeft, ChevronRight, Eye, ShieldAlert
} from '@lucide/vue'

const logs = ref<AuditLogResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const selectedLog = ref<AuditLogResponse | null>(null)

// Pagination & Filter
const currentPage = ref(1)
const lastPage = ref(1)
const filterAction = ref('')

async function fetchLogs(page = 1) {
  loading.value = true
  error.value = null
  try {
    const res = await auditLogsApi.list({
      page,
      action: filterAction.value || undefined,
    })
    logs.value = res.data
    currentPage.value = res.meta.current_page
    lastPage.value = res.meta.last_page
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat log aktivitas.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})

const getActionIcon = (action: string) => {
  if (action === 'created') return Plus
  if (action === 'updated') return Pencil
  if (action === 'deleted') return Trash2
  return FileText
}

const getActionColor = (action: string) => {
  if (action === 'created') return '#10b981'
  if (action === 'updated') return '#3b82f6'
  if (action === 'deleted') return '#ef4444'
  return '#8b5cf6'
}

const getActionBg = (action: string) => {
  if (action === 'created') return 'rgba(16, 185, 129, 0.15)'
  if (action === 'updated') return 'rgba(59, 130, 246, 0.15)'
  if (action === 'deleted') return 'rgba(239, 68, 68, 0.15)'
  return 'rgba(139, 92, 246, 0.15)'
}

const getActionLabel = (action: string) => {
  if (action === 'created') return 'CREATE'
  if (action === 'updated') return 'UPDATE'
  if (action === 'deleted') return 'DELETE'
  return action.toUpperCase()
}

const formatJson = (obj: any) => {
  if (!obj) return '-'
  return JSON.stringify(obj, null, 2)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <AdminLayout>
    <!-- ── Toolbar ── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Audit Log Aktivitas</h1>
        <p>Rekam jejak dan pemantauan aktivitas pengguna di seluruh modul sistem.</p>
      </div>
      <div class="toolbar-actions">
        <div class="filter-group">
          <div class="filter-icon"><Activity :size="14" /></div>
          <select class="filter-select" v-model="filterAction" @change="fetchLogs(1)">
            <option value="">Semua Aksi</option>
            <option value="created">CREATE (Tambah)</option>
            <option value="updated">UPDATE (Edit)</option>
            <option value="deleted">DELETE (Hapus)</option>
          </select>
        </div>
        <button class="btn-ghost btn-refresh" @click="fetchLogs(1)">
          Refresh
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-banner">
      <ShieldAlert :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- Logs Table Container -->
    <div class="audit-card">
      <div class="audit-table-wrapper">
        <table class="audit-table">
          <thead>
            <tr>
              <th width="15%"><Clock :size="13" class="th-icon"/> Waktu</th>
              <th width="20%"><User :size="13" class="th-icon"/> Pengguna</th>
              <th width="20%"><Tag :size="13" class="th-icon"/> Modul</th>
              <th width="15%"><Database :size="13" class="th-icon"/> Data ID</th>
              <th width="15%"><Activity :size="13" class="th-icon"/> Aksi</th>
              <th width="15%" align="center">Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="empty-state">
                <div class="loader-spinner"></div>
                <p>Memuat riwayat aktivitas...</p>
              </td>
            </tr>
            <tr v-else-if="logs.length === 0">
              <td colspan="6" class="empty-state">
                <FileText :size="32" class="empty-icon" />
                <p>Belum ada riwayat aktivitas yang ditemukan.</p>
              </td>
            </tr>
            <tr v-for="log in logs" :key="log.id" class="audit-row">
              <td class="td-time">
                <div class="time-wrap">
                  <span class="time-date">{{ formatDate(log.created_at).split(', ')[0] }}</span>
                  <span class="time-hour">{{ formatDate(log.created_at).split(', ')[1] }}</span>
                </div>
              </td>
              <td>
                <div class="user-info">
                  <div class="user-avatar">{{ log.user_name.charAt(0).toUpperCase() }}</div>
                  <span class="user-name">{{ log.user_name }}</span>
                </div>
              </td>
              <td>
                <span class="module-badge">{{ log.auditable_type }}</span>
              </td>
              <td class="td-id">
                <span class="id-text">#{{ log.auditable_id }}</span>
              </td>
              <td>
                <div class="action-pill" :style="{ color: getActionColor(log.action), background: getActionBg(log.action), border: `1px solid ${getActionColor(log.action)}40` }">
                  <component :is="getActionIcon(log.action)" :size="12" />
                  {{ getActionLabel(log.action) }}
                </div>
              </td>
              <td align="center">
                <button class="btn-detail" @click="selectedLog = log" title="Lihat Perubahan">
                  <Eye :size="14" />
                  <span>Diff</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="audit-pagination" v-if="lastPage > 1">
        <button class="btn-page" :disabled="currentPage === 1" @click="fetchLogs(currentPage - 1)">
          <ChevronLeft :size="16" />
        </button>
        <div class="page-info">
          Halaman <span class="page-current">{{ currentPage }}</span> dari <span class="page-total">{{ lastPage }}</span>
        </div>
        <button class="btn-page" :disabled="currentPage === lastPage" @click="fetchLogs(currentPage + 1)">
          <ChevronRight :size="16" />
        </button>
      </div>
    </div>

    <!-- Modal Detail Log -->
    <Teleport to="body">
      <div v-if="selectedLog" class="modal-overlay" @click.self="selectedLog = null">
        <div class="modal-box diff-modal">
          <div class="modal-header diff-header">
            <div class="header-title-wrap">
              <div class="header-icon" :style="{ color: getActionColor(selectedLog.action), background: getActionBg(selectedLog.action) }">
                <component :is="getActionIcon(selectedLog.action)" :size="18" />
              </div>
              <div>
                <h2>Detail Perubahan Data</h2>
                <p>Melihat detail {{ getActionLabel(selectedLog.action) }} pada modul {{ selectedLog.auditable_type }}</p>
              </div>
            </div>
            <button class="modal-close" @click="selectedLog = null"><X :size="20" /></button>
          </div>
          
          <div class="modal-body diff-body">
            <!-- Meta Info -->
            <div class="diff-meta-grid">
              <div class="meta-item">
                <span class="meta-label">Oleh Pengguna</span>
                <span class="meta-val user-val">
                  <div class="user-avatar-small">{{ selectedLog.user_name.charAt(0).toUpperCase() }}</div>
                  {{ selectedLog.user_name }}
                </span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Waktu Eksekusi</span>
                <span class="meta-val">{{ formatDate(selectedLog.created_at) }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Modul & ID</span>
                <span class="meta-val module-val">{{ selectedLog.auditable_type }} <span class="meta-id">#{{ selectedLog.auditable_id }}</span></span>
              </div>
              <div class="meta-item">
                <span class="meta-label">IP Address</span>
                <span class="meta-val ip-val">{{ selectedLog.ip_address || 'N/A' }}</span>
              </div>
            </div>
            
            <!-- Diff Comparison -->
            <div class="diff-comparison">
              <!-- Old Values -->
              <div class="diff-panel old-panel">
                <div class="panel-head">
                  <div class="panel-title">
                    <div class="dot-red"></div> Data Lama
                  </div>
                </div>
                <div class="panel-content">
                  <pre v-if="selectedLog.old_values && Object.keys(selectedLog.old_values).length > 0">{{ formatJson(selectedLog.old_values) }}</pre>
                  <div v-else class="empty-json">(Tidak ada data lama / Kosong)</div>
                </div>
              </div>
              
              <!-- Arrow separator -->
              <div class="diff-arrow">
                <ArrowRight :size="20" />
              </div>
              
              <!-- New Values -->
              <div class="diff-panel new-panel">
                <div class="panel-head">
                  <div class="panel-title">
                    <div class="dot-green"></div> Data Baru
                  </div>
                </div>
                <div class="panel-content">
                  <pre v-if="selectedLog.new_values && Object.keys(selectedLog.new_values).length > 0">{{ formatJson(selectedLog.new_values) }}</pre>
                  <div v-else class="empty-json">(Tidak ada data baru / Kosong)</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer diff-footer">
            <button class="btn-primary" @click="selectedLog = null">Tutup Jendela</button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Layout & Toolbar ── */
.toolbar-actions { display: flex; gap: 12px; align-items: center; }

.filter-group {
  display: flex;
  align-items: center;
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}
.filter-group:focus-within {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.filter-icon {
  padding: 0 10px 0 12px;
  color: var(--text-muted);
  display: flex; align-items: center; justify-content: center;
}
.filter-select {
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  padding: 9px 12px 9px 0;
  outline: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
}
.filter-select option { background: var(--card-bg); color: var(--text-primary); }

.btn-refresh {
  padding: 8px 16px;
  font-size: 13px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.error-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; margin-bottom: 20px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px; color: #ef4444; font-size: 14px; font-weight: 500;
}

/* ── Table Container ── */
.audit-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  display: flex; flex-direction: column;
}

.audit-table-wrapper {
  overflow-x: auto;
}

.audit-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 800px;
}

.audit-table th {
  background: rgba(255, 255, 255, 0.02);
  padding: 14px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 11px;
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
}
.audit-table th[align="center"] { text-align: center; }

.th-icon {
  vertical-align: -2px; margin-right: 4px; opacity: 0.7;
}

.audit-row {
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background 0.15s;
}
.audit-row:hover { background: rgba(255,255,255,0.02); }
.audit-row:last-child { border-bottom: none; }

.audit-table td { padding: 12px 16px; vertical-align: middle; }

/* Table specific styles */
.time-wrap { display: flex; flex-direction: column; gap: 2px; }
.time-date { font-weight: 500; color: var(--text-primary); font-size: 13px; }
.time-hour { color: var(--text-muted); font-size: 11px; }

.user-info { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: rgba(59, 130, 246, 0.15); color: #60a5fa;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.user-avatar-small {
  width: 20px; height: 20px; border-radius: 50%;
  background: rgba(59, 130, 246, 0.15); color: #60a5fa;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0;
}
.user-name { font-weight: 600; color: var(--text-primary); }

.module-badge {
  display: inline-flex; align-items: center;
  padding: 4px 10px; background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-color); border-radius: 6px;
  font-size: 11.5px; font-weight: 600; color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.id-text { font-family: monospace; font-size: 13px; color: var(--text-muted); background: rgba(255,255,255,0.03); padding: 2px 6px; border-radius: 4px; }

.action-pill {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
}

.btn-detail {
  display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 6px 12px; background: transparent; border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-secondary); font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
  width: 100%; max-width: 80px; margin: 0 auto;
}
.btn-detail:hover {
  background: rgba(255,255,255,0.05); color: var(--text-primary); border-color: rgba(255,255,255,0.2);
}

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-icon { opacity: 0.2; margin-bottom: 12px; }

.loader-spinner {
  width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent-blue); border-radius: 50%;
  animation: spin 1s linear infinite; margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Pagination ── */
.audit-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-top: 1px solid var(--border-color);
  background: rgba(255,255,255,0.01);
}
.btn-page {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; background: var(--bg-color); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-primary); cursor: pointer; transition: all 0.2s;
}
.btn-page:not(:disabled):hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.2); }
.btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }
.page-current { font-weight: 600; color: var(--text-primary); }
.page-total { font-weight: 600; color: var(--text-secondary); }

/* ── Diff Modal ── */
.diff-modal { max-width: 850px; width: 95%; display: flex; flex-direction: column; max-height: 90vh; }

.diff-header { padding: 20px 24px; }
.header-title-wrap { display: flex; align-items: center; gap: 16px; }
.header-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
}
.header-title-wrap h2 { font-size: 18px; font-weight: 700; margin: 0 0 4px 0; color: var(--text-primary); }
.header-title-wrap p { margin: 0; font-size: 13px; color: var(--text-muted); }

.diff-body { padding: 24px; overflow-y: auto; background: var(--bg-color); }

.diff-meta-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
  margin-bottom: 24px; padding: 16px; background: var(--bg-card);
  border: 1px solid var(--border-color); border-radius: 12px;
}
@media (max-width: 768px) {
  .diff-meta-grid { grid-template-columns: 1fr 1fr; }
}

.meta-item { display: flex; flex-direction: column; gap: 6px; }
.meta-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.meta-val { font-size: 13px; font-weight: 500; color: var(--text-primary); display: flex; align-items: center; gap: 6px; }
.meta-id { color: var(--text-muted); font-family: monospace; font-size: 12px; }
.ip-val { font-family: monospace; }

.diff-comparison { display: flex; align-items: stretch; gap: 16px; position: relative; }
@media (max-width: 768px) {
  .diff-comparison { flex-direction: column; }
  .diff-arrow { transform: rotate(90deg); margin: 8px auto; }
}

.diff-panel {
  flex: 1; min-width: 0; border: 1px solid var(--border-color);
  border-radius: 12px; background: var(--bg-card); display: flex; flex-direction: column;
  overflow: hidden;
}
.old-panel { border-color: rgba(239, 68, 68, 0.2); }
.new-panel { border-color: rgba(16, 185, 129, 0.2); }

.panel-head { padding: 12px 16px; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.01); }
.old-panel .panel-head { border-bottom-color: rgba(239, 68, 68, 0.1); background: rgba(239, 68, 68, 0.02); }
.new-panel .panel-head { border-bottom-color: rgba(16, 185, 129, 0.1); background: rgba(16, 185, 129, 0.02); }

.panel-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
.dot-red { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.6); }
.dot-green { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6); }

.panel-content { padding: 16px; flex: 1; overflow-x: auto; }
.panel-content pre {
  margin: 0; font-family: 'JetBrains Mono', monospace, monospace; font-size: 12px;
  line-height: 1.5; color: #e2e8f0; tab-size: 2;
}
.old-panel .panel-content pre { color: #fca5a5; }
.new-panel .panel-content pre { color: #6ee7b7; }

.empty-json { font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px 0; }

.diff-arrow {
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); padding: 0 4px;
}

.diff-footer { padding: 16px 24px; }
</style>
