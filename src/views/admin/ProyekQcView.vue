<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { ArrowLeft, Plus, AlertCircle, CheckCircle, ChevronDown, X, Pencil, Trash2, RefreshCw } from '@lucide/vue'
import {
  proyeksApi,
  proyekQcApi,
  proyekTimApi,
  type ProyekResponse,
  type ProyekQcResponse,
  type QcSectionResponse,
  type ProyekTimResponse
} from '@/services/api'

const route = useRoute()
const router = useRouter()
const proyekId = Number(route.params.id)

// ── Types ──────────────────────────────────────────────────────────────────
type QcStatus = 'Draft' | 'Dalam Review' | 'Lulus' | 'Revisi'
const statuses: QcStatus[] = ['Draft', 'Dalam Review', 'Lulus', 'Revisi']

// ── State ──
const proyek = ref<ProyekResponse | null>(null)
const qcData = ref<ProyekQcResponse | null>(null)
const proyekTims = ref<ProyekTimResponse[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [pRes, qRes, tRes] = await Promise.all([
      proyeksApi.show(proyekId),
      proyekQcApi.get(proyekId),
      proyekTimApi.list(proyekId)
    ])
    proyek.value = pRes.data
    qcData.value = qRes.data
    if (!qcData.value.qc_tanggal) {
      qcData.value.qc_tanggal = new Date().toISOString().slice(0, 10)
    }
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat data'
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

// ── computed helpers ──
const qcStatus = computed({
  get: () => qcData.value?.status || 'Draft',
  set: async (val: QcStatus) => {
    if (qcData.value) {
      qcData.value.status = val
      await proyekQcApi.update(proyekId, { status: val })
    }
  }
})

const qcPic = computed({
  get: () => qcData.value?.qc_pic || proyek.value?.pic || 'Belum dipilih',
  set: (val: string) => {
    if (qcData.value) {
      qcData.value.qc_pic = val
      proyekQcApi.update(proyekId, { qc_pic: val })
    }
  }
})

const qcTanggal = computed(() => qcData.value?.qc_tanggal || '')

const allMembers = computed(() => proyekTims.value.map(t => t.nama_anggota))

const isEditingPic = ref(false)
const searchPicText = ref('')
const picInputRef = ref<HTMLInputElement | null>(null)

const filteredUsers = computed(() => {
  const q = searchPicText.value.toLowerCase()
  return allMembers.value.filter(u => u.toLowerCase().includes(q))
})

const selectPic = (u: string) => {
  qcPic.value = u
  isEditingPic.value = false
}

const openEditPic = () => {
  searchPicText.value = ''
  isEditingPic.value = true
  nextTick(() => {
    picInputRef.value?.focus()
  })
}

const onPicInputBlur = () => {
  setTimeout(() => { isEditingPic.value = false }, 150)
}

const sections = computed(() => qcData.value?.sections || [])

const completedSec = (sec: QcSectionResponse) => sec.items.filter(i => i.checked).length
const isSectionComplete = (sec: QcSectionResponse) => sec.items.length > 0 && completedSec(sec) === sec.items.length
const totalItems = computed(() => sections.value.reduce((a, s) => a + s.items.length, 0))
const completedItems = computed(() => sections.value.reduce((a, s) => a + completedSec(s), 0))
const percent = computed(() => totalItems.value === 0 ? 0 : Math.round((completedItems.value / totalItems.value) * 100))

const failItems = computed(() => {
  const result: { section: string; item: any }[] = []
  sections.value.forEach(sec => {
    sec.items.filter(i => !i.checked).forEach(i => result.push({ section: sec.title, item: i }))
  })
  return result
})

const statusClass = (s: string) => ({
  'Draft': 'badge-qc-draft',
  'Dalam Review': 'badge-qc-dalamreview',
  'Lulus': 'badge-qc-lulus',
  'Revisi': 'badge-qc-revisi',
}[s] || 'badge-qc-draft')

// Auto save item toggle
const toggleItem = async (itemId: number, checked: boolean) => {
  try {
    await proyekQcApi.toggleItem(proyekId, itemId, { checked })
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan status')
  }
}

// ── Add sub-item inline (per section) ────────────────────────────────────────
const showAddItemModal = ref(false)
const addItemForm = ref({ sectionIdx: 0, text: '' })

const openAddItem = (idx: number) => {
  addItemForm.value = { sectionIdx: idx, text: '' }
  showAddItemModal.value = true
}
const closeAddItem = () => { showAddItemModal.value = false }
const submitAddItem = async () => {
  if (!addItemForm.value.text.trim()) return
  saving.value = true
  try {
    const section = sections.value[addItemForm.value.sectionIdx]
    const updatedSections = [...sections.value]
    updatedSections[addItemForm.value.sectionIdx].items.push({
      id: Date.now(), // temp id, will be overridden by server
      text: addItemForm.value.text.trim(),
      checked: false,
      note: null
    })
    
    // We update the entire QC sections to add the new item (the API receives a full JSON for sections)
    // Actually the update endpoint takes `sections: any[]` which fully replaces/syncs them
    await proyekQcApi.update(proyekId, { sections: updatedSections })
    await fetchData()
    closeAddItem()
  } catch (e: any) {
    alert(e.message || 'Gagal menambah item')
  } finally {
    saving.value = false
  }
}

// ── Add/Edit Section (Judul + Sub Judul list) ──────────────────────────────────────
const showAddSectionModal = ref(false)
const editSectionIdx = ref(-1)
const newSectionTitle = ref('')
const newSectionItems = ref<{id?: number, text: string, checked?: boolean, note?: string | null}[]>([{ text: '' }])

const openAddSection = () => {
  editSectionIdx.value = -1
  newSectionTitle.value = ''
  newSectionItems.value = [{ text: '' }]
  showAddSectionModal.value = true
}

const openEditSection = (idx: number) => {
  editSectionIdx.value = idx
  const sec = sections.value[idx]
  newSectionTitle.value = sec.title
  newSectionItems.value = sec.items.map(item => ({ ...item }))
  if (newSectionItems.value.length === 0) newSectionItems.value = [{ text: '' }]
  showAddSectionModal.value = true
}

const closeAddSection = () => { showAddSectionModal.value = false }

const addSubItem = () => { newSectionItems.value.push({ text: '' }) }
const removeSubItem = (idx: number) => {
  if (newSectionItems.value.length > 1) newSectionItems.value.splice(idx, 1)
}

const submitAddSection = async () => {
  if (!newSectionTitle.value.trim()) return
  saving.value = true
  try {
    const validItems = newSectionItems.value.filter(i => i.text.trim())
    const updatedSections = JSON.parse(JSON.stringify(sections.value))
    
    if (editSectionIdx.value === -1) {
      updatedSections.push({
        title: newSectionTitle.value.trim(),
        sort_order: updatedSections.length,
        items: validItems.map(i => ({ text: i.text.trim(), checked: false }))
      })
    } else {
      updatedSections[editSectionIdx.value].title = newSectionTitle.value.trim()
      updatedSections[editSectionIdx.value].items = validItems.map(i => ({
        id: i.id,
        text: i.text.trim(),
        checked: i.checked || false,
        note: i.note || null
      }))
    }
    
    await proyekQcApi.update(proyekId, { sections: updatedSections })
    await fetchData()
    closeAddSection()
  } catch (e: any) {
    alert(e.message || 'Gagal menyimpan seksi')
  } finally {
    saving.value = false
  }
}

const deleteSection = async (idx: number) => {
  if (confirm('Yakin ingin menghapus seksi ini beserta semua item di dalamnya?')) {
    try {
      const updatedSections = [...sections.value]
      updatedSections.splice(idx, 1)
      await proyekQcApi.update(proyekId, { sections: updatedSections })
      await fetchData()
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus seksi')
    }
  }
}

const goBack = () => router.push(`/admin/proyek/${proyekId}`)
</script>

<template>
  <AdminLayout>
    <div style="max-width: 860px; margin: 0 auto; padding-bottom: 60px;">

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
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.06em;">
              {{ proyek?.kode }} · QC / Pengujian
            </div>
            <h1 style="font-size: 20px; color: var(--text-primary); margin: 0; font-weight: 700;">{{ proyek?.nama }}</h1>
          </div>
        </div>
        <!-- Right controls: status pills + add section -->
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button
              v-for="s in statuses" :key="s"
              class="qc-status-pill"
              :class="{ active: qcStatus === s }"
              @click="qcStatus = s"
            >{{ s }}</button>
          </div>
          <button class="btn-primary" style="gap: 6px;" @click="openAddSection">
            <Plus :size="14" /> Tambah Seksi
          </button>
        </div>
      </div>

      <!-- ── Score card ── -->
      <div class="card" style="padding: 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
        <div class="qcp-donut-wrap">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10" />
            <circle cx="40" cy="40" r="32" fill="none"
              :stroke="percent === 100 ? '#22c55e' : percent >= 70 ? '#f59e0b' : '#ef4444'"
              stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="`${2 * Math.PI * 32}`"
              :stroke-dashoffset="`${2 * Math.PI * 32 * (1 - percent / 100)}`"
              transform="rotate(-90 40 40)"
              style="transition: stroke-dashoffset 0.5s ease;"
            />
          </svg>
          <div class="qcp-donut-label">{{ percent }}%</div>
        </div>
        <div style="flex: 1; min-width: 180px;">
          <div style="font-size: 22px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">
            {{ completedItems }} / {{ totalItems }}
            <span style="font-size: 14px; font-weight: 400; color: var(--text-muted); margin-left: 4px;">item lulus</span>
          </div>
          <div style="font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
            QC oleh: 
            <div v-if="!isEditingPic" style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--text-primary);" @click="openEditPic" title="Ubah PIC QC">
              <strong>{{ qcPic }}</strong>
              <Pencil :size="12" style="color: var(--text-muted);" />
            </div>
            <div v-else style="position: relative;">
              <input 
                v-model="searchPicText" 
                ref="picInputRef"
                class="form-input" 
                style="padding: 2px 8px; font-size: 13px; min-height: 24px; width: 150px; border-color: var(--accent-orange);"
                placeholder="Cari user..."
                @blur="onPicInputBlur"
                @keydown.enter.prevent="filteredUsers.length > 0 && selectPic(filteredUsers[0])"
              />
              <div class="combo-dropdown" style="top: calc(100% + 4px); width: 200px; z-index: 10;">
                <ul class="combo-list">
                  <li
                    v-for="u in filteredUsers"
                    :key="u"
                    class="combo-item"
                    @mousedown.prevent="selectPic(u)"
                  >
                    {{ u }}
                  </li>
                  <li v-if="filteredUsers.length === 0" class="combo-empty">
                    User tidak ditemukan
                  </li>
                </ul>
              </div>
            </div>
            · {{ qcTanggal }}
          </div>
          <div style="margin-top: 8px;">
            <span :class="statusClass(qcStatus)" style="font-size: 12px; padding: 4px 12px; border-radius: 20px;">{{ qcStatus }}</span>
          </div>
        </div>

        <!-- Fail summary -->
        <div v-if="failItems.length > 0" class="qcp-fail-box">
          <div style="font-size: 12px; font-weight: 700; color: #ef4444; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            <AlertCircle :size="13" /> {{ failItems.length }} item belum lulus
          </div>
          <div v-for="fi in failItems.slice(0, 3)" :key="fi.item.id" style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 3px; line-height: 1.4;">
            · {{ fi.item.text }}
          </div>
          <div v-if="failItems.length > 3" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
            +{{ failItems.length - 3 }} lainnya...
          </div>
        </div>
      </div>

      <!-- ── QC Sections ── -->
      <div class="qcp-sections">
        <div v-for="(sec, idx) in sections" :key="idx" class="qcp-section">
          <!-- Section header -->
          <div class="qcp-section-hdr" @click="sec.isExpanded = !sec.isExpanded">
            <div style="display: flex; align-items: center; gap: 10px;">
              <CheckCircle v-if="isSectionComplete(sec)" :size="16" style="color: #22c55e;" />
              <AlertCircle v-else :size="16" style="color: var(--accent-orange);" />
              <span class="qcp-section-title">{{ sec.title }}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <span class="qcp-section-count" :style="isSectionComplete(sec) ? 'color:#22c55e' : ''">
                {{ completedSec(sec) }}/{{ sec.items.length }}
              </span>
              
              <!-- Edit/Delete actions -->
              <div class="qcp-section-actions" @click.stop>
                <button class="action-btn edit-btn" title="Edit Seksi" @click="openEditSection(idx)">
                  <Pencil :size="14" />
                </button>
                <button class="action-btn delete-btn" title="Hapus Seksi" @click="deleteSection(idx)">
                  <Trash2 :size="14" />
                </button>
              </div>

              <ChevronDown :size="16" :style="{ transition: 'transform 0.2s', transform: sec.isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--text-muted)' }" />
            </div>
          </div>

          <!-- Items -->
          <div v-show="sec.isExpanded" class="qcp-section-body">
            <label v-for="item in sec.items" :key="item.id" class="qcp-item">
              <input type="checkbox" v-model="item.checked" @change="toggleItem(item.id, item.checked)" class="qc-checkbox" />
              <div class="qcp-item-text-wrap">
                <div class="qcp-item-text" :class="{ 'qcp-item-done': item.checked }">{{ item.text }}</div>
                <div v-if="item.note && !item.checked" class="qcp-item-note">
                  <AlertCircle :size="11" /> {{ item.note }}
                </div>
              </div>
            </label>
            <!-- Add item -->
            <button class="qcp-add-item-btn" @click.stop="openAddItem(idx)">
              <Plus :size="13" /> Tambah Item
            </button>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Modal Tambah Sub Item (per seksi) ── -->
    <Teleport to="body">
      <div v-if="showAddItemModal" class="modal-overlay" @click.self="closeAddItem">
        <div class="modal-box" style="max-width: 480px;">
          <div class="modal-header">
            <h2>Tambah Sub Item</h2>
            <button class="modal-close" @click="closeAddItem"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Deskripsi Sub Item *</label>
                <input v-model="addItemForm.text" class="form-input" placeholder="Cth: Perangkat terpasang dengan kuat" @keyup.enter="submitAddItem" />
              </div>
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeAddItem">Batal</button>
            <button class="btn-primary btn-half" @click="submitAddItem">Tambah</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal Tambah/Edit Seksi QC (Judul + Sub Judul) ── -->
    <Teleport to="body">
      <div v-if="showAddSectionModal" class="modal-overlay" @click.self="closeAddSection">
        <div class="modal-box" style="max-width: 560px;">
          <div class="modal-header">
            <h2>{{ editSectionIdx === -1 ? 'Tambah Seksi QC' : 'Edit Seksi QC' }}</h2>
            <button class="modal-close" @click="closeAddSection"><X :size="16" /></button>
          </div>
          <div class="modal-body">

            <!-- Judul Seksi -->
            <div class="form-row single" style="margin-bottom: 20px;">
              <div class="form-field">
                <label class="form-label">Judul Seksi *</label>
                <input
                  v-model="newSectionTitle"
                  class="form-input"
                  placeholder="Cth: Instalasi Hardware"
                />
              </div>
            </div>

            <!-- Sub Judul list -->
            <div style="margin-bottom: 8px;">
              <label class="form-label" style="margin-bottom: 10px; display: block;">Sub Item Checklist</label>
              <div
                v-for="(item, idx) in newSectionItems"
                :key="idx"
                class="sub-item-row"
              >
                <span class="sub-item-num">{{ idx + 1 }}</span>
                <input
                  v-model="newSectionItems[idx].text"
                  class="form-input"
                  :placeholder="`Sub item ${idx + 1}...`"
                  @keyup.enter="addSubItem"
                />
                <button
                  type="button"
                  class="sub-item-del"
                  :disabled="newSectionItems.length === 1"
                  @click="removeSubItem(idx)"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>

            <!-- Tombol tambah baris -->
            <button class="qcp-add-item-btn" style="margin-top: 8px;" @click="addSubItem">
              <Plus :size="13" /> Tambah Baris Sub Item
            </button>

          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeAddSection">Batal</button>
            <button class="btn-primary btn-half" @click="submitAddSection">Simpan Seksi</button>
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

/* QC Status pills */
.qc-status-pill {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  background: rgba(255,255,255,0.04);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.qc-status-pill.active {
  background: rgba(245,158,11,0.15);
  color: var(--accent-orange);
  border-color: rgba(245,158,11,0.4);
}

/* Donut */
.qcp-donut-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
}
.qcp-donut-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
}

/* Fail box */
.qcp-fail-box {
  background: rgba(239,68,68,0.07);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  padding: 12px 16px;
  min-width: 220px;
  max-width: 280px;
}

/* Sections */
.qcp-sections { display: flex; flex-direction: column; gap: 12px; }
.qcp-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}
.qcp-section-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.qcp-section-hdr:hover { background: rgba(255,255,255,0.02); }
.qcp-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.qcp-section-count {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  font-family: monospace;
}
.qcp-section-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
.qcp-section-hdr:hover .qcp-section-actions {
  opacity: 1;
}
.action-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: all 0.2s;
  color: var(--text-muted);
}
.action-btn.edit-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.2);
}
.action-btn.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}
.qcp-section-body {
  border-top: 1px solid var(--border-color);
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.qcp-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}
.qcp-item:hover { background: rgba(255,255,255,0.02); padding-left: 6px; }
.qc-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-orange);
  cursor: pointer;
  margin-top: 2px;
  flex-shrink: 0;
}
.qcp-item-text-wrap { flex: 1; }
.qcp-item-text {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.qcp-item-done {
  text-decoration: line-through;
  color: var(--text-muted);
}
.qcp-item-note {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--accent-orange);
  margin-top: 4px;
  opacity: 0.85;
}
.qcp-add-item-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 7px 12px;
  background: rgba(255,255,255,0.03);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  justify-content: center;
}
.qcp-add-item-btn:hover {
  border-color: var(--accent-orange);
  color: var(--accent-orange);
  background: rgba(245,158,11,0.05);
}

/* Badge QC status */
.badge-qc-draft { background: rgba(100,116,139,0.15); color: #94a3b8; }
.badge-qc-dalamreview { background: rgba(245,158,11,0.15); color: var(--accent-orange); }
.badge-qc-lulus { background: rgba(34,197,94,0.15); color: #22c55e; }
.badge-qc-revisi { background: rgba(239,68,68,0.12); color: #ef4444; }

/* Sub-item rows inside Add Section modal */
.sub-item-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.sub-item-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(245,158,11,0.12);
  color: var(--accent-orange);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sub-item-del {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  color: #ef4444;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: all 0.15s;
}
.sub-item-del:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.sub-item-del:disabled { opacity: 0.3; cursor: not-allowed; }
</style>
