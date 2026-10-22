<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import {
  Plus, Trash2, Pencil, Check, X, ShieldCheck, ToggleLeft,
  Eye, FilePlus, Pen, Eraser, Users, Settings, Loader2, AlertCircle,
} from '@lucide/vue'
import { useRolesStore } from '@/stores/roles'
import type { RoleResponse, PermissionPayload } from '@/services/api'

const rolesStore = useRolesStore()

onMounted(() => { rolesStore.fetchRoles() })

// ─── Permission types ─────────────────────────────────────────────────────────
type PermType = 'view' | 'create' | 'edit' | 'delete'
const PERM_TYPES: { key: PermType; label: string; color: string }[] = [
  { key: 'view',   label: 'Lihat',  color: '#3b82f6' },
  { key: 'create', label: 'Tambah', color: '#22c55e' },
  { key: 'edit',   label: 'Edit',   color: '#f59e0b' },
  { key: 'delete', label: 'Hapus',  color: '#ef4444' },
]

// ─── Feature definitions ──────────────────────────────────────────────────────
interface Feature {
  key: string
  label: string
  desc: string
  perms: PermType[]
}
interface FeatureSection {
  section: string
  icon: string
  color: string
  features: Feature[]
}

const allSections: FeatureSection[] = [
  {
    section: 'Utama',
    icon: '🏠',
    color: '#94a3b8',
    features: [
      { key: 'dashboard', label: 'Dashboard', desc: 'Ringkasan statistik dan grafik utama', perms: ['view'] },
    ],
  },
  {
    section: 'Sales',
    icon: '📣',
    color: '#06b6d4',
    features: [
      { key: 'crm',        label: 'CRM Client',      desc: 'Kelola lead, prospek, dan follow-up klien', perms: ['view','create','edit','delete'] },
      { key: 'survei',     label: 'Form Survei',      desc: 'Buat dan kelola form survei lapangan',      perms: ['view','create','edit','delete'] },
      { key: 'penawaran',  label: 'Penawaran Harga',  desc: 'Buat quotation dan proposal harga',         perms: ['view','create','edit','delete'] },
    ],
  },
  {
    section: 'Operasional',
    icon: '⚙️',
    color: '#a78bfa',
    features: [
      { key: 'proyek',       label: 'Proyek',           desc: 'Database dan monitoring proyek aktif',         perms: ['view','create','edit','delete'] },
      { key: 'log_pekerjaan',label: 'Log Pekerjaan',    desc: 'Catatan harian aktivitas + foto dokumentasi',  perms: ['view','create','edit','delete'] },
      { key: 'masterpart',   label: 'Master Part',      desc: 'Kelola data suku cadang dan supplier',         perms: ['view','create','edit','delete'] },
      { key: 'procurement',  label: 'Procurement',      desc: 'Pembelian material, supplier, bukti transfer', perms: ['view','create','edit','delete'] },
      { key: 'qc',           label: 'Quality Control',  desc: 'Checklist QC sebelum serah terima proyek',    perms: ['view','create','edit','delete'] },
    ],
  },
  {
    section: 'Keuangan',
    icon: '💰',
    color: '#22c55e',
    features: [
      { key: 'invoice',    label: 'Invoice',    desc: 'Kelola invoice DP, termin, dan pelunasan', perms: ['view','create','edit','delete'] },
      { key: 'pembukuan',  label: 'Pembukuan',  desc: 'Kas masuk dan keluar perusahaan',          perms: ['view','create','edit','delete'] },
      { key: 'arus_kas',   label: 'Arus Kas',   desc: 'Laporan cashflow operasional, investasi',  perms: ['view'] },
      { key: 'laba_rugi',  label: 'Laba Rugi',  desc: 'Laporan P&L, margin kotor dan bersih',    perms: ['view'] },
      { key: 'neraca',     label: 'Neraca',     desc: 'Balance sheet, aset, liabilitas, ekuitas', perms: ['view'] },
      { key: 'fee_tim',    label: 'Fee Tim',    desc: 'Penghitungan komisi tim lapangan',         perms: ['view','create','edit','delete'] },
    ],
  },
  {
    section: 'Sistem',
    icon: '🔧',
    color: '#f59e0b',
    features: [
      { key: 'user_mgmt', label: 'User Management', desc: 'Kelola akun dan status pengguna',      perms: ['view','create','edit','delete'] },
      { key: 'role_mgmt', label: 'Role Management',  desc: 'Konfigurasi hak akses per role',      perms: ['view','create','edit','delete'] },
    ],
  },
]

// ─── Permission key helper ────────────────────────────────────────────────────
const permKey = (featureKey: string, perm: PermType) => `${featureKey}:${perm}`

const buildFull = () => {
  const r: Record<string, boolean> = {}
  allSections.forEach(s => s.features.forEach(f => f.perms.forEach(p => { r[permKey(f.key, p)] = true })))
  return r
}
const buildNone = () => {
  const r: Record<string, boolean> = {}
  allSections.forEach(s => s.features.forEach(f => f.perms.forEach(p => { r[permKey(f.key, p)] = false })))
  return r
}

// ─── Map API role permissions → local akses map ───────────────────────────────
const apiToAkses = (role: RoleResponse): Record<string, boolean> => {
  const base = buildNone()
  if (role.slug === 'super-admin') return buildFull()
  role.permissions.forEach(p => {
    if (p.can_view)   base[`${p.module}:view`]   = true
    if (p.can_create) base[`${p.module}:create`] = true
    if (p.can_edit)   base[`${p.module}:edit`]   = true
    if (p.can_delete) base[`${p.module}:delete`] = true
  })
  return base
}

// ─── Local role type wrapping API role ───────────────────────────────────────
interface LocalRole {
  id: number
  nama: string
  deskripsi: string
  userCount: number
  isSystem: boolean
  color: string
  akses: Record<string, boolean>
}

const localRoles = computed<LocalRole[]>(() =>
  rolesStore.roles.map(r => ({
    id: r.id,
    nama: r.name,
    deskripsi: r.description ?? '',
    userCount: r.user_count,
    isSystem: r.is_system,
    color: r.color,
    akses: apiToAkses(r),
  }))
)

// ─── Active Role & Edit Mode ──────────────────────────────────────────────────
const selectedId = ref<number | null>(null)
const isEditing  = ref(false)
const draft      = ref<Record<string, boolean>>({})
const saving     = ref(false)
const actionError = ref('')

const selectedRole = computed(() => {
  if (!selectedId.value && localRoles.value.length > 0) return localRoles.value[0]!
  return localRoles.value.find(r => r.id === selectedId.value) ?? (localRoles.value[0] ?? null)
})

const selectRole = (id: number) => { if (!isEditing.value) selectedId.value = id }

const countActive = (akses: Record<string, boolean>) => Object.values(akses).filter(Boolean).length
const totalPerms  = computed(() => Object.keys(buildFull()).length)

// ─── Feature-level "all on/off" helpers ──────────────────────────────────────
const featureAllOn = (f: Feature) => f.perms.every(p => (isEditing.value ? draft.value : selectedRole.value?.akses ?? {})[permKey(f.key, p)])
const featurePartial = (f: Feature) => !featureAllOn(f) && f.perms.some(p => (isEditing.value ? draft.value : selectedRole.value?.akses ?? {})[permKey(f.key, p)])

const toggleFeature = (f: Feature) => {
  if (!isEditing.value) return
  const allOn = featureAllOn(f)
  f.perms.forEach(p => { draft.value[permKey(f.key, p)] = !allOn })
}

const toggleSection = (s: FeatureSection) => {
  if (!isEditing.value) return
  const allOn = s.features.every(f => featureAllOn(f))
  s.features.forEach(f => f.perms.forEach(p => { draft.value[permKey(f.key, p)] = !allOn }))
}

const sectionAllOn = (s: FeatureSection) => s.features.every(f => featureAllOn(f))
const sectionPartial = (s: FeatureSection) => !sectionAllOn(s) && s.features.some(f => featureAllOn(f) || featurePartial(f))

// ─── Edit Mode ────────────────────────────────────────────────────────────────
const startEdit = () => {
  if (!selectedRole.value) return
  draft.value = { ...selectedRole.value.akses }
  isEditing.value = true
}
const cancelEdit = () => { isEditing.value = false; draft.value = {} }

const saveEdit = async () => {
  if (!selectedRole.value) return
  saving.value = true
  actionError.value = ''
  try {
    // Build permissions payload from draft
    const permissionsPayload: PermissionPayload[] = []
    allSections.forEach(s => s.features.forEach(f => {
      permissionsPayload.push({
        module: f.key,
        can_view:   !!draft.value[permKey(f.key, 'view')],
        can_create: !!draft.value[permKey(f.key, 'create')],
        can_edit:   !!draft.value[permKey(f.key, 'edit')],
        can_delete: !!draft.value[permKey(f.key, 'delete')],
      })
    }))
    await rolesStore.updatePermissions(selectedRole.value.id, permissionsPayload)
    isEditing.value = false
    draft.value = {}
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Gagal menyimpan hak akses.'
  } finally {
    saving.value = false
  }
}

const activateAll = () => { Object.keys(buildFull()).forEach(k => { draft.value[k] = true }) }
const resetAll    = () => { Object.keys(buildNone()).forEach(k => { draft.value[k] = false }) }

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteTarget = ref<LocalRole | null>(null)
const deleting = ref(false)
const openDelete  = (r: LocalRole) => { if (!r.isSystem) deleteTarget.value = r }
const cancelDelete = () => { deleteTarget.value = null }
const actualDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  actionError.value = ''
  try {
    await rolesStore.deleteRole(deleteTarget.value.id)
    if (selectedId.value === deleteTarget.value.id && localRoles.value.length > 0) {
      selectedId.value = localRoles.value[0]?.id ?? null
    }
    deleteTarget.value = null
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Gagal menghapus role.'
    deleteTarget.value = null
  } finally {
    deleting.value = false
  }
}

// ─── Add Role ─────────────────────────────────────────────────────────────────
const showAddModal  = ref(false)
const addForm       = ref({ nama: '', deskripsi: '', color: '#6366f1' })
const addModalError = ref('')
const addSaving     = ref(false)

const openAddModal  = () => { addForm.value = { nama:'', deskripsi:'', color:'#6366f1' }; addModalError.value = ''; showAddModal.value = true }
const closeAddModal = () => { showAddModal.value = false }

const submitAddRole = async () => {
  if (!addForm.value.nama.trim()) { addModalError.value = 'Nama role wajib diisi.'; return }
  addSaving.value = true
  addModalError.value = ''
  try {
    const newRole = await rolesStore.createRole({
      name: addForm.value.nama,
      description: addForm.value.deskripsi,
      color: addForm.value.color,
    })
    selectedId.value = newRole.id
    showAddModal.value = false
  } catch (e) {
    addModalError.value = e instanceof Error ? e.message : 'Gagal membuat role.'
  } finally {
    addSaving.value = false
  }
}

// ─── Badge color via role.color ───────────────────────────────────────────────
const roleBadgeStyle = (role: LocalRole) => ({
  background: `${role.color}22`,
  color: role.color,
  border: `1px solid ${role.color}55`,
})

// ─── View tabs ────────────────────────────────────────────────────────────────
const viewMode = ref<'detail' | 'matrix'>('detail')
</script>

<template>
  <AdminLayout>
    <!-- ── Toolbar ── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>Role Management</h1>
        <p>Konfigurasi hak akses granular per role dan fitur</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <!-- View toggle -->
        <div class="rm-view-toggle">
          <button :class="['rm-view-btn', viewMode === 'detail' ? 'active' : '']" @click="viewMode = 'detail'">
            <Settings :size="13" /> Detail
          </button>
          <button :class="['rm-view-btn', viewMode === 'matrix' ? 'active' : '']" @click="viewMode = 'matrix'">
            <Eye :size="13" /> Matrix
          </button>
        </div>
        <button class="btn-primary" @click="openAddModal" id="btn-tambah-role">
          <Plus :size="14" /> Tambah Role
        </button>
      </div>
    </div>

    <!-- ══════════════ DETAIL VIEW ══════════════ -->
    <div v-if="viewMode === 'detail'" class="rm-layout">

      <!-- LEFT: Role List -->
      <div class="rm-role-list">
        <div
          v-for="role in localRoles" :key="role.id"
          class="rm-role-card"
          :class="{ 'rm-role-card-active': selectedId === role.id || (!selectedId && localRoles[0]?.id === role.id) }"
          @click="selectRole(role.id)"
          :id="`role-card-${role.id}`"
        >
          <div class="rm-role-card-top">
            <span class="rm-badge" :style="roleBadgeStyle(role)">{{ role.nama }}</span>
            <span v-if="role.isSystem" class="rm-system-tag">Sistem</span>
          </div>
          <p class="rm-role-desc">{{ role.deskripsi }}</p>
          <div class="rm-role-meta">
            <span><Users :size="11" style="vertical-align:-1px; margin-right:3px;" />{{ role.userCount }} user</span>
            <span>{{ countActive(role.akses) }}/{{ totalPerms }} akses</span>
          </div>
          <!-- Mini permission bar -->
          <div class="rm-mini-bar-wrap">
            <div class="rm-mini-bar" :style="{ width: (totalPerms > 0 ? countActive(role.akses) / totalPerms * 100 : 0) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Detail Panel -->
      <div class="rm-detail-panel" v-if="selectedRole">

        <!-- Panel Header -->
        <div class="rm-detail-header">
          <div class="rm-detail-title-wrap">
            <div class="rm-detail-icon">
              <ShieldCheck :size="18" />
            </div>
            <div>
              <h2 class="rm-detail-title">{{ selectedRole.nama }}</h2>
              <p class="rm-detail-desc">{{ selectedRole.deskripsi }}</p>
            </div>
          </div>
          <div v-if="!isEditing" class="rm-detail-actions">
            <button v-if="!selectedRole.isSystem" class="rm-btn-delete" @click="openDelete(selectedRole)" :id="`btn-delete-role-${selectedRole.id}`">
              <Trash2 :size="13" /> Hapus
            </button>
            <button class="rm-btn-edit" @click="startEdit" :id="`btn-edit-role-${selectedRole.id}`">
              <Pencil :size="13" /> Edit Akses
            </button>
          </div>
          <div v-else class="rm-detail-actions">
            <button class="rm-btn-cancel" @click="cancelEdit" :disabled="saving">Batal</button>
            <button class="rm-btn-save" @click="saveEdit" :disabled="saving">
              <Loader2 v-if="saving" :size="14" class="spinner" />
              <Check v-else :size="14" /> {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>

        <!-- Meta + progress -->
        <div class="rm-detail-meta">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:1;">
            <span>{{ selectedRole.userCount }} pengguna</span>
            <span class="rm-meta-sep">·</span>
            <span><strong style="color: var(--accent-orange);">{{ countActive(selectedRole.akses) }}</strong> dari {{ totalPerms }} akses aktif</span>
          </div>
          <!-- Progress bar -->
          <div class="rm-meta-bar-wrap">
            <div class="rm-meta-bar" :style="{ width: (totalPerms > 0 ? countActive(selectedRole.akses) / totalPerms * 100 : 0) + '%' }"></div>
          </div>
        </div>

        <!-- Legend (in view mode) -->
        <div class="rm-perm-legend">
          <div v-for="pt in PERM_TYPES" :key="pt.key" class="rm-legend-item">
            <span class="rm-legend-dot" :style="{ background: pt.color }"></span>
            <span>{{ pt.label }}</span>
          </div>
        </div>

        <!-- Edit shortcuts -->
        <div v-if="isEditing" class="rm-edit-shortcuts">
          <span style="font-size:12px; color: var(--text-muted);">Pilih cepat:</span>
          <button class="rm-shortcut-btn" @click="activateAll" id="btn-activate-all">Aktifkan Semua</button>
          <span class="rm-meta-sep">·</span>
          <button class="rm-shortcut-btn rm-shortcut-red" @click="resetAll" id="btn-reset-all">Reset Semua</button>
          <template v-for="s in allSections" :key="s.section">
            <span class="rm-meta-sep">·</span>
            <button class="rm-shortcut-btn" @click="toggleSection(s)" style="font-size:11px;">
              {{ sectionAllOn(s) ? '☑' : '☐' }} {{ s.section }}
            </button>
          </template>
        </div>

        <!-- Permission Sections -->
        <div class="rm-modules-wrap">
          <div v-for="section in allSections" :key="section.section" class="rm-section">
            <!-- Section header with toggle-all -->
            <div class="rm-section-header">
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="rm-section-emoji">{{ section.icon }}</span>
                <span class="rm-section-label">{{ section.section }}</span>
              </div>
              <div v-if="isEditing" style="display:flex; align-items:center; gap: 6px;">
                <span style="font-size:11px; color: var(--text-muted);">Pilih semua</span>
                <label class="rm-toggle" @click.prevent="toggleSection(section)">
                  <input type="checkbox" :checked="sectionAllOn(section)" :indeterminate="sectionPartial(section)" readonly />
                  <span class="rm-toggle-track"></span>
                </label>
              </div>
            </div>

            <!-- Feature rows -->
            <div v-for="feat in section.features" :key="feat.key" class="rm-feature-row">
              <!-- Feature name + toggle-all-perms -->
              <div class="rm-feature-info">
                <div class="rm-feature-name">{{ feat.label }}</div>
                <div class="rm-feature-desc">{{ feat.desc }}</div>
              </div>

              <!-- Permission pills -->
              <div class="rm-perms-wrap">
                <div
                  v-for="pt in PERM_TYPES.filter(p => feat.perms.includes(p.key))"
                  :key="pt.key"
                  class="rm-perm-pill"
                  :class="{
                    'rm-perm-on': (isEditing ? draft : selectedRole.akses)[permKey(feat.key, pt.key)],
                    'rm-perm-off': !(isEditing ? draft : selectedRole.akses)[permKey(feat.key, pt.key)],
                    'rm-perm-clickable': isEditing && !selectedRole.isSystem,
                  }"
                  :style="(isEditing ? draft : selectedRole.akses)[permKey(feat.key, pt.key)] ? { background: pt.color + '22', borderColor: pt.color + '60', color: pt.color } : {}"
                  @click="isEditing && !selectedRole.isSystem && (draft[permKey(feat.key, pt.key)] = !draft[permKey(feat.key, pt.key)])"
                  :title="pt.label"
                >
                  <component
                    :is="pt.key === 'view' ? Eye : pt.key === 'create' ? FilePlus : pt.key === 'edit' ? Pen : Eraser"
                    :size="11"
                  />
                  {{ pt.label }}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <div v-else class="rm-empty-panel">
        <ToggleLeft :size="40" style="opacity:.2; margin-bottom:12px;" />
        <p>Pilih role untuk melihat hak akses</p>
      </div>
    </div>

    <!-- ══════════════ MATRIX VIEW ══════════════ -->
    <div v-if="viewMode === 'matrix'" class="rm-matrix-wrap">
      <div class="rm-matrix-scroll">
        <table class="rm-matrix-table">
          <thead>
            <tr>
              <th class="rm-matrix-th-feat">Fitur</th>
              <th v-for="role in localRoles" :key="role.id" class="rm-matrix-th-role">
                <div class="rm-badge rm-badge-sm" :style="roleBadgeStyle(role)">{{ role.nama }}</div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="section in allSections" :key="section.section">
              <tr class="rm-matrix-section-row">
                <td :colspan="localRoles.length + 1" class="rm-matrix-section-cell">
                  {{ section.icon }} {{ section.section }}
                </td>
              </tr>
              <template v-for="feat in section.features" :key="feat.key">
                <tr class="rm-matrix-feat-row">
                  <td class="rm-matrix-feat-cell">
                    <div class="rm-matrix-feat-name">{{ feat.label }}</div>
                    <div class="rm-matrix-feat-desc">{{ feat.desc }}</div>
                  </td>
                  <td v-for="role in localRoles" :key="role.id" class="rm-matrix-perm-cell">
                    <div class="rm-matrix-perm-dots">
                      <div
                        v-for="pt in PERM_TYPES.filter(p => feat.perms.includes(p.key))"
                        :key="pt.key"
                        class="rm-matrix-dot"
                        :style="role.akses[permKey(feat.key, pt.key)] ? { background: pt.color, boxShadow: `0 0 5px ${pt.color}80` } : { background: 'rgba(255,255,255,0.08)' }"
                        :title="`${role.nama} · ${feat.label} · ${pt.label}`"
                      ></div>
                    </div>
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
      <!-- Matrix Legend -->
      <div class="rm-matrix-legend">
        <span style="font-size: 12px; color: var(--text-muted); margin-right: 12px;">Legend:</span>
        <div v-for="pt in PERM_TYPES" :key="pt.key" class="rm-legend-item">
          <span class="rm-legend-dot" :style="{ background: pt.color }"></span>
          <span>{{ pt.label }}</span>
        </div>
        <span style="margin-left: 12px; font-size: 12px; color: var(--text-muted);">
          <span class="rm-legend-dot" style="background: rgba(255,255,255,0.1);"></span> Tidak ada akses
        </span>
      </div>
    </div>

    <!-- ── Modal Tambah Role ── -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
        <div class="modal-box" style="max-width: 480px;">
          <div class="modal-header">
            <h2>Tambah Role Baru</h2>
            <button class="modal-close" @click="closeAddModal"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div v-if="addModalError" class="um-modal-error" style="margin-bottom:8px;">{{ addModalError }}</div>
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Nama Role *</label>
                <input v-model="addForm.nama" class="form-input" placeholder="contoh: Supervisor" id="input-role-nama" />
              </div>
            </div>
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Deskripsi</label>
                <input v-model="addForm.deskripsi" class="form-input" placeholder="Deskripsi singkat role ini" />
              </div>
            </div>
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">Warna Role</label>
                <input v-model="addForm.color" type="color" class="form-input" style="height:42px; padding: 4px 8px; cursor: pointer;" />
                <p style="font-size:12px; color: var(--text-muted); margin-top: 6px;">
                  Hak akses dapat disesuaikan setelah role dibuat.
                </p>
              </div>
            </div>
          </div>
          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeAddModal" :disabled="addSaving">Batal</button>
            <button class="btn-primary btn-half" @click="submitAddRole" id="btn-submit-role" :disabled="addSaving">
              <Loader2 v-if="addSaving" :size="14" class="spinner" />
              {{ addSaving ? 'Menyimpan...' : 'Buat Role' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Confirm Delete ── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-box" style="max-width: 400px; text-align: center; padding-top: 32px;">
          <div style="margin-bottom: 20px;">
            <div style="width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.1);color:#ef4444;display:flex;align-items:center;justify-content:center;margin:0 auto;">
              <Trash2 :size="32" />
            </div>
          </div>
          <h2 style="margin-bottom:12px; font-size:18px; color: var(--text-primary);">Hapus Role</h2>
          <p style="color: var(--text-secondary); font-size:14px; margin-bottom:28px; line-height:1.6; padding:0 10px;">
            Yakin ingin menghapus role <strong style="color:#fff;">{{ deleteTarget.nama }}</strong>?
            User yang memiliki role ini tidak akan memiliki akses.
          </p>
          <div class="modal-footer modal-footer-split" style="border-top:none; padding:0;">
            <button class="btn-ghost btn-half" @click="cancelDelete" :disabled="deleting">Batal</button>
            <button class="btn-primary btn-half" style="background:#ef4444;border-color:#ef4444;" @click="actualDelete" id="btn-confirm-delete-role" :disabled="deleting">
              <Loader2 v-if="deleting" :size="14" class="spinner" />
              {{ deleting ? 'Menghapus...' : 'Ya, Hapus' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Spinner ── */
.spinner { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Layout ── */
.rm-layout {
  display: grid;
  grid-template-columns: 270px 1fr;
  gap: 20px;
  align-items: flex-start;
}
@media (max-width: 800px) { .rm-layout { grid-template-columns: 1fr; } }

/* ── View Toggle ── */
.rm-view-toggle {
  display: flex;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  padding: 3px;
  gap: 2px;
}
.rm-view-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 6px 12px; font-size: 12px; font-weight: 600;
  border: none; background: transparent; color: var(--text-muted);
  cursor: pointer; border-radius: 6px; transition: all 0.15s;
  font-family: 'Inter', sans-serif;
}
.rm-view-btn.active { background: rgba(245,158,11,0.15); color: var(--accent-orange); }
.rm-view-btn:hover:not(.active) { color: var(--text-primary); background: rgba(255,255,255,0.05); }

/* ── Role List ── */
.rm-role-list { display: flex; flex-direction: column; gap: 10px; }
.rm-role-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: all 0.2s;
}
.rm-role-card:hover { border-color: rgba(255,255,255,0.14); transform: translateX(2px); }
.rm-role-card-active { border-color: var(--accent-orange); background: rgba(245,158,11,0.04); }

.rm-role-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.rm-badge {
  display: inline-flex; align-items: center; padding: 3px 10px;
  border-radius: 6px; font-size: 12px; font-weight: 600; letter-spacing: 0.02em;
}
.rm-badge-sm { font-size: 11px; padding: 2px 8px; }
.rm-badge-superadmin { background: rgba(245,158,11,0.18); color: var(--accent-orange);  border: 1px solid rgba(245,158,11,0.35); }
.rm-badge-admin      { background: rgba(59,130,246,0.15);  color: #60a5fa;              border: 1px solid rgba(59,130,246,0.3); }
.rm-badge-karyawan   { background: rgba(139,92,246,0.15);  color: #a78bfa;              border: 1px solid rgba(139,92,246,0.3); }
.rm-badge-marketing  { background: rgba(6,182,212,0.15);   color: #22d3ee;              border: 1px solid rgba(6,182,212,0.3); }
.rm-badge-finance    { background: rgba(16,185,129,0.15);  color: #34d399;              border: 1px solid rgba(16,185,129,0.3); }
.rm-badge-supervisor { background: rgba(249,115,22,0.15);  color: #fb923c;              border: 1px solid rgba(249,115,22,0.3); }
.rm-badge-default    { background: rgba(255,255,255,0.07); color: var(--text-secondary); border: 1px solid var(--border-color); }

.rm-system-tag { font-size: 10px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.07em; text-transform: uppercase; }
.rm-role-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 10px; }
.rm-role-meta { display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 8px; }

.rm-mini-bar-wrap { background: rgba(255,255,255,0.06); border-radius: 4px; height: 4px; overflow: hidden; }
.rm-mini-bar { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #f59e0b, #22c55e); transition: width 0.4s ease; }

/* ── Detail Panel ── */
.rm-detail-panel { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px; overflow: hidden; }
.rm-detail-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; padding: 22px 24px 18px; border-bottom: 1px solid var(--border-color);
}
.rm-detail-title-wrap { display: flex; align-items: flex-start; gap: 14px; }
.rm-detail-icon {
  width: 42px; height: 42px; background: rgba(245,158,11,0.12);
  border: 1px solid rgba(245,158,11,0.25); border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: var(--accent-orange); flex-shrink: 0; margin-top: 2px;
}
.rm-detail-title { font-size: 18px; font-weight: 700; color: var(--text-primary); line-height: 1.2; margin-bottom: 4px; }
.rm-detail-desc { font-size: 13px; color: var(--text-secondary); }
.rm-detail-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

/* Buttons */
.rm-btn-delete {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 14px;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
  border-radius: 8px; color: #ef4444; font-size: 13px; font-weight: 500;
  font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s;
}
.rm-btn-delete:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.5); }
.rm-btn-edit {
  display: inline-flex; align-items: center; gap: 5px; padding: 7px 16px;
  background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3);
  border-radius: 8px; color: var(--accent-orange); font-size: 13px; font-weight: 600;
  font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s;
}
.rm-btn-edit:hover { background: rgba(245,158,11,0.22); }
.rm-btn-cancel {
  padding: 7px 16px; background: rgba(255,255,255,0.04); border: 1px solid var(--border-color);
  border-radius: 8px; color: var(--text-secondary); font-size: 13px;
  font-family: 'Inter', sans-serif; cursor: pointer; transition: all 0.15s;
}
.rm-btn-cancel:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
.rm-btn-save {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 18px;
  background: var(--accent-green); border: none; border-radius: 8px; color: #fff;
  font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif;
  cursor: pointer; transition: all 0.15s;
}
.rm-btn-save:hover { background: #059669; transform: translateY(-1px); }

/* Meta row */
.rm-detail-meta {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 24px; font-size: 13px; color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color); flex-wrap: wrap;
}
.rm-meta-sep { color: var(--text-muted); }
.rm-meta-bar-wrap { flex: 1; min-width: 80px; background: rgba(255,255,255,0.06); border-radius: 4px; height: 5px; overflow: hidden; }
.rm-meta-bar { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #f59e0b, #22c55e); transition: width 0.5s; }

/* Legend */
.rm-perm-legend {
  display: flex; align-items: center; gap: 16px; padding: 10px 24px;
  border-bottom: 1px solid var(--border-color); flex-wrap: wrap;
}
.rm-legend-item { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text-muted); }
.rm-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Edit shortcuts */
.rm-edit-shortcuts {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 24px; border-bottom: 1px solid var(--border-color);
  background: rgba(245,158,11,0.03); flex-wrap: wrap;
}
.rm-shortcut-btn {
  background: none; border: none; color: var(--accent-orange);
  font-size: 12px; font-weight: 600; font-family: 'Inter', sans-serif;
  cursor: pointer; padding: 0; transition: opacity 0.15s;
}
.rm-shortcut-btn:hover { opacity: 0.75; }
.rm-shortcut-red { color: #ef4444; }

/* Section headers */
.rm-modules-wrap { padding: 0 0 16px; }
.rm-section { margin-bottom: 2px; }
.rm-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px 6px; border-top: 1px solid var(--border-color);
}
.rm-section-emoji { font-size: 14px; }
.rm-section-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; color: var(--text-muted);
}

/* Feature rows */
.rm-feature-row {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 24px; border-top: 1px solid rgba(255,255,255,0.035);
  transition: background 0.12s;
}
.rm-feature-row:hover { background: rgba(255,255,255,0.025); }
.rm-feature-info { flex: 1; min-width: 0; }
.rm-feature-name { font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
.rm-feature-desc { font-size: 11.5px; color: var(--text-muted); }

/* Permission pills */
.rm-perms-wrap { display: flex; gap: 5px; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
.rm-perm-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 9px; border-radius: 20px; font-size: 11px; font-weight: 600;
  border: 1px solid transparent; transition: all 0.15s; white-space: nowrap;
  user-select: none;
}
.rm-perm-on {
  /* color set dynamically */
}
.rm-perm-off {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.2);
}
.rm-perm-clickable { cursor: pointer; }
.rm-perm-clickable:hover { opacity: 0.8; transform: scale(1.05); }

/* Toggle switch */
.rm-toggle {
  position: relative; display: inline-block; width: 38px; height: 22px; flex-shrink: 0; cursor: pointer;
}
.rm-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.rm-toggle-track {
  position: absolute; inset: 0; background: rgba(255,255,255,0.1);
  border-radius: 99px; transition: background 0.2s; border: 1px solid rgba(255,255,255,0.12);
}
.rm-toggle-track::after {
  content: ''; position: absolute; left: 3px; top: 3px;
  width: 14px; height: 14px; border-radius: 50%;
  background: rgba(255,255,255,0.5); transition: all 0.2s;
}
.rm-toggle input:checked + .rm-toggle-track { background: var(--accent-green); border-color: var(--accent-green); }
.rm-toggle input:checked + .rm-toggle-track::after { left: calc(100% - 17px); background: #fff; }

/* Empty panel */
.rm-empty-panel {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 14px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 24px; color: var(--text-muted); font-size: 14px;
}

/* ── MATRIX VIEW ── */
.rm-matrix-wrap { overflow: hidden; }
.rm-matrix-scroll { overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-color); }
.rm-matrix-table { width: 100%; border-collapse: collapse; font-size: 12.5px; min-width: 700px; }
.rm-matrix-th-feat {
  text-align: left; padding: 12px 20px; font-size: 11px; font-weight: 700;
  color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
  background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color);
  position: sticky; left: 0; z-index: 2; min-width: 220px;
  white-space: nowrap;
}
.rm-matrix-th-role {
  text-align: center; padding: 12px 10px;
  background: rgba(255,255,255,0.02); border-bottom: 1px solid var(--border-color);
  min-width: 100px;
}
.rm-matrix-section-row {}
.rm-matrix-section-cell {
  padding: 10px 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--text-muted);
  background: rgba(255,255,255,0.025); border-top: 1px solid var(--border-color);
  position: sticky; left: 0;
}
.rm-matrix-feat-row { border-top: 1px solid rgba(255,255,255,0.04); transition: background 0.12s; }
.rm-matrix-feat-row:hover { background: rgba(255,255,255,0.025); }
.rm-matrix-feat-cell {
  padding: 10px 20px; vertical-align: middle;
  position: sticky; left: 0; background: var(--bg-card); z-index: 1;
  border-right: 1px solid var(--border-color);
}
.rm-matrix-feat-name { font-size: 12.5px; font-weight: 600; color: var(--text-primary); }
.rm-matrix-feat-desc { font-size: 11px; color: var(--text-muted); }
.rm-matrix-perm-cell { text-align: center; padding: 8px 10px; vertical-align: middle; }
.rm-matrix-perm-dots { display: flex; gap: 4px; justify-content: center; flex-wrap: wrap; }
.rm-matrix-dot {
  width: 10px; height: 10px; border-radius: 50%; transition: all 0.2s;
}
.rm-matrix-legend {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 16px; flex-wrap: wrap; margin-top: 10px;
}
</style>
