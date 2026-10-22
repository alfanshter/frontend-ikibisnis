<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { Search, Plus, Pencil, UserCheck, UserX, X, ShieldCheck, User, Mail, Lock, Loader2, AlertCircle } from '@lucide/vue'
import { useUsersStore } from '@/stores/users'
import { useRolesStore } from '@/stores/roles'
import type { UserResponse, CreateUserPayload } from '@/services/api'

const usersStore = useUsersStore()
const rolesStore = useRolesStore()

// ─── Load on mount ────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([usersStore.fetchUsers(), rolesStore.fetchRoles()])
})

// ─── Search / Filter ──────────────────────────────────────────────────────────
const search = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return usersStore.users
  return usersStore.users.filter(
    (u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role?.name ?? '').toLowerCase().includes(q),
  )
})

// ─── Pagination ──────────────────────────────────────────────────────────────
const currentPage = ref(1)
const pageSize = ref(15)

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch(search, () => {
  currentPage.value = 1
})

watch(totalPages, (newTotal) => {
  if (currentPage.value > newTotal) {
    currentPage.value = Math.max(1, newTotal)
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getRoleBadgeStyle = (role: UserResponse['role']) => {
  const color = role?.color ?? '#6366f1'
  return {
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}55`,
  }
}

// ─── Toggle Status ────────────────────────────────────────────────────────────
const togglingId = ref<number | null>(null)
const actionError = ref('')

const toggleStatus = async (user: UserResponse) => {
  actionError.value = ''
  togglingId.value = user.id
  try {
    await usersStore.toggleStatus(user.id)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Gagal mengubah status.'
  } finally {
    togglingId.value = null
  }
}

// ─── Modal Add / Edit ─────────────────────────────────────────────────────────
const showModal = ref(false)
const editUser = ref<UserResponse | null>(null)
const modalError = ref('')
const saving = ref(false)

interface FormData {
  name: string
  email: string
  role_id: string
  status: 'aktif' | 'nonaktif'
  password: string
}

const emptyForm = (): FormData => ({
  name: '',
  email: '',
  role_id: String(rolesStore.roles[0]?.id ?? ''),
  status: 'aktif',
  password: '',
})

const form = ref<FormData>(emptyForm())

const openAdd = () => {
  editUser.value = null
  form.value = emptyForm()
  modalError.value = ''
  showModal.value = true
}

const openEdit = (u: UserResponse) => {
  editUser.value = u
  form.value = {
    name: u.name,
    email: u.email,
    role_id: String(u.role_id ?? ''),
    status: u.status,
    password: '',
  }
  modalError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  modalError.value = ''
}

const submitForm = async () => {
  if (!form.value.name.trim() || !form.value.email.trim()) {
    modalError.value = 'Nama dan email wajib diisi.'
    return
  }
  if (!editUser.value && !form.value.password.trim()) {
    modalError.value = 'Password wajib diisi untuk user baru.'
    return
  }
  saving.value = true
  modalError.value = ''
  try {
    if (editUser.value) {
      const payload: Partial<CreateUserPayload> = {
        name: form.value.name,
        email: form.value.email,
        role_id: form.value.role_id,
        status: form.value.status,
      }
      if (form.value.password.trim()) payload.password = form.value.password
      await usersStore.updateUser(editUser.value.id, payload)
    } else {
      await usersStore.createUser({
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        role_id: form.value.role_id,
        status: form.value.status,
      })
    }
    closeModal()
  } catch (e) {
    modalError.value = e instanceof Error ? e.message : 'Terjadi kesalahan.'
  } finally {
    saving.value = false
  }
}

// ─── Confirm Delete ───────────────────────────────────────────────────────────
const deleteTarget = ref<UserResponse | null>(null)
const deleting = ref(false)

const confirmDelete = (u: UserResponse) => {
  deleteTarget.value = u
}
const cancelDelete = () => {
  deleteTarget.value = null
}
const actualDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await usersStore.deleteUser(deleteTarget.value.id)
    deleteTarget.value = null
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Gagal menghapus user.'
    deleteTarget.value = null
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <!-- ── Toolbar ─────────────────────────────────────────── -->
    <div class="page-toolbar">
      <div class="page-toolbar-left">
        <h1>User Management</h1>
        <p>Kelola akun pengguna sistem</p>
      </div>
      <button class="btn-primary" @click="openAdd" id="btn-tambah-user">
        <Plus :size="16" />
        Tambah User
      </button>
    </div>

    <!-- ── Action error ────────────────────────────────────── -->
    <div v-if="actionError" class="um-action-error">
      <AlertCircle :size="14" />
      {{ actionError }}
    </div>

    <!-- ── Stats Cards ─────────────────────────────────────── -->
    <div class="um-stats">
      <div class="um-stat-card">
        <div class="um-stat-num">
          <Loader2 v-if="usersStore.loading" :size="28" class="spinner" />
          <span v-else>{{ usersStore.meta.total }}</span>
        </div>
        <div class="um-stat-label">Total User</div>
      </div>
      <div class="um-stat-card um-stat-aktif">
        <div class="um-stat-num" style="color: var(--accent-green);">{{ usersStore.meta.aktif }}</div>
        <div class="um-stat-label">Aktif</div>
      </div>
      <div class="um-stat-card um-stat-nonaktif">
        <div class="um-stat-num" style="color: var(--accent-red);">{{ usersStore.meta.nonaktif }}</div>
        <div class="um-stat-label">Nonaktif</div>
      </div>
    </div>

    <!-- ── Search ──────────────────────────────────────────── -->
    <div class="search-wrap" style="margin-bottom: 20px;">
      <Search class="search-icon" :size="16" />
      <input
        v-model="search"
        class="search-input"
        type="text"
        placeholder="Cari nama, email, atau role..."
        id="search-user"
      />
    </div>

    <!-- ── Loading state ──────────────────────────────────── -->
    <div v-if="usersStore.loading" class="um-loading">
      <Loader2 :size="32" class="spinner" />
      <span>Memuat data pengguna...</span>
    </div>

    <!-- ── Error state ────────────────────────────────────── -->
    <div v-else-if="usersStore.error" class="um-error-state">
      <AlertCircle :size="20" />
      <span>{{ usersStore.error }}</span>
      <button class="btn-ghost" @click="usersStore.fetchUsers()">Coba Lagi</button>
    </div>

    <!-- ── Table ───────────────────────────────────────────── -->
    <div v-else class="table-card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Dibuat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">
              Tidak ada user ditemukan.
            </td>
          </tr>
          <tr v-for="u in paginatedUsers" :key="u.id">
            <!-- Nama + Avatar -->
            <td>
              <div class="um-user-cell">
                <div class="um-avatar" :style="{ background: u.avatar_color }">
                  {{ u.initials }}
                </div>
                <div class="um-user-info">
                  <div class="um-user-name">{{ u.name }}</div>
                  <div class="um-user-sub" v-if="u.role?.slug === 'super-admin'">Super Admin</div>
                </div>
              </div>
            </td>

            <!-- Email -->
            <td class="um-email">{{ u.email }}</td>

            <!-- Role -->
            <td>
              <span class="role-badge" :style="getRoleBadgeStyle(u.role)">
                {{ u.role?.name ?? '—' }}
              </span>
            </td>

            <!-- Status -->
            <td>
              <span class="badge" :class="u.status === 'aktif' ? 'badge-selesai' : 'badge-pending'">
                {{ u.status === 'aktif' ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>

            <!-- Dibuat -->
            <td class="um-date">{{ u.created_at?.slice(0, 10) ?? '—' }}</td>

            <!-- Aksi -->
            <td>
              <div class="action-btns">
                <button class="btn-edit" @click="openEdit(u)" :id="`btn-edit-${u.id}`">
                  <Pencil :size="13" style="display:inline; margin-right:3px;" />Edit
                </button>
                <button
                  v-if="u.status === 'aktif'"
                  class="btn-nonaktif"
                  @click="toggleStatus(u)"
                  :disabled="togglingId === u.id"
                  :id="`btn-nonaktif-${u.id}`"
                >
                  <Loader2 v-if="togglingId === u.id" :size="13" class="spinner" style="margin-right:3px;" />
                  <UserX v-else :size="13" style="display:inline; margin-right:3px;" />
                  Nonaktifkan
                </button>
                <button
                  v-else
                  class="btn-aktifkan"
                  @click="toggleStatus(u)"
                  :disabled="togglingId === u.id"
                  :id="`btn-aktifkan-${u.id}`"
                >
                  <Loader2 v-if="togglingId === u.id" :size="13" class="spinner" style="margin-right:3px;" />
                  <UserCheck v-else :size="13" style="display:inline; margin-right:3px;" />
                  Aktifkan
                </button>
                <button
                  v-if="u.role?.slug !== 'super-admin'"
                  class="btn-del"
                  @click="confirmDelete(u)"
                  :id="`btn-del-${u.id}`"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────── -->
    <div v-if="filtered.length > 0" class="crm-pagination" style="display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size: 13px; color: var(--text-muted);">
        Total: {{ filtered.length }} user
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <button
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="prevPage"
        >&lt;</button>
        <span class="page-info">{{ currentPage }} / {{ totalPages || 1 }}</span>
        <button
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="nextPage"
        >&gt;</button>
      </div>
    </div>

    <!-- ── Modal Add / Edit ───────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-box">
          <div class="modal-header">
            <h2>{{ editUser ? 'Edit User' : 'Tambah User Baru' }}</h2>
            <button class="modal-close" @click="closeModal"><X :size="16" /></button>
          </div>

          <div class="modal-body">
            <!-- Error -->
            <div v-if="modalError" class="um-modal-error">{{ modalError }}</div>

            <!-- Nama -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">
                  <User :size="12" style="display:inline;margin-right:4px;opacity:.7;" />
                  Nama Lengkap *
                </label>
                <input v-model="form.name" class="form-input" placeholder="Nama pengguna" id="input-nama-user" />
              </div>
            </div>

            <!-- Email -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">
                  <Mail :size="12" style="display:inline;margin-right:4px;opacity:.7;" />
                  Email *
                </label>
                <input v-model="form.email" type="email" class="form-input" placeholder="email@contoh.com" id="input-email-user" />
              </div>
            </div>

            <!-- Password -->
            <div class="form-row single">
              <div class="form-field">
                <label class="form-label">
                  <Lock :size="12" style="display:inline;margin-right:4px;opacity:.7;" />
                  Password {{ editUser ? '(kosongkan jika tidak diubah)' : '*' }}
                </label>
                <input v-model="form.password" type="password" class="form-input" placeholder="••••••••" id="input-password-user" />
              </div>
            </div>

            <!-- Role + Status -->
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">
                  <ShieldCheck :size="12" style="display:inline;margin-right:4px;opacity:.7;" />
                  Role
                </label>
                <select v-model="form.role_id" class="form-select" id="select-role-user">
                  <option v-for="r in rolesStore.roles" :key="r.id" :value="String(r.id)">
                    {{ r.name }}
                  </option>
                </select>
              </div>
              <div class="form-field">
                <label class="form-label">Status</label>
                <select v-model="form.status" class="form-select" id="select-status-user">
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-footer modal-footer-split">
            <button class="btn-ghost btn-half" @click="closeModal" :disabled="saving">Batal</button>
            <button class="btn-primary btn-half" @click="submitForm" id="btn-submit-user" :disabled="saving">
              <Loader2 v-if="saving" :size="14" class="spinner" />
              {{ saving ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Confirm Delete ─────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-overlay" @click.self="cancelDelete">
        <div class="modal-box" style="max-width: 420px;">
          <div class="modal-header">
            <h2 style="color: var(--accent-red);">Hapus User</h2>
            <button class="modal-close" @click="cancelDelete"><X :size="16" /></button>
          </div>
          <div class="modal-body">
            <div class="confirm-delete-bar" style="border-radius: var(--radius-md);">
              <span class="confirm-delete-text">
                Yakin ingin menghapus user <strong style="color:#fff;">{{ deleteTarget.name }}</strong>?
                Tindakan ini tidak dapat dibatalkan.
              </span>
              <div class="confirm-delete-btns">
                <button class="confirm-btn confirm-no" @click="cancelDelete" :disabled="deleting">Tidak</button>
                <button class="confirm-btn confirm-yes" @click="actualDelete" :disabled="deleting">
                  <Loader2 v-if="deleting" :size="13" class="spinner" />
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<style scoped>
/* ── Stats ────────────────────────────────────────────── */
.um-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.um-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 22px 28px;
  text-align: center;
  transition: transform var(--transition-fast), border-color var(--transition-fast);
}
.um-stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.12);
}
.um-stat-aktif   { border-top: 2px solid var(--accent-green); }
.um-stat-nonaktif{ border-top: 2px solid var(--accent-red); }

.um-stat-num {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
  margin-bottom: 6px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.um-stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ── Loading / Error ──────────────────────────────────── */
.um-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  color: var(--text-muted);
  font-size: 14px;
}

.um-error-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: var(--radius-md);
  color: #fca5a5;
  font-size: 14px;
  margin-bottom: 16px;
}

.um-action-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: var(--radius-sm);
  color: #fca5a5;
  font-size: 13px;
  margin-bottom: 16px;
}

/* ── Table Cells ──────────────────────────────────────── */
.um-user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.um-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #111;
  flex-shrink: 0;
}

.um-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.um-user-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 13.5px;
}
.um-user-sub {
  font-size: 11.5px;
  color: var(--accent-orange);
  font-weight: 500;
}

.um-email {
  color: var(--text-secondary);
  font-size: 13px;
}
.um-date {
  color: var(--text-muted);
  font-size: 13px;
}

/* ── Role Badges (dynamic color via :style) ───────────── */
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* ── Action Buttons ───────────────────────────────────── */
.btn-nonaktif {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-red);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-fast);
  display: inline-flex;
  align-items: center;
}
.btn-nonaktif:hover:not(:disabled) { color: #fca5a5; }
.btn-nonaktif:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-aktifkan {
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-green);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-fast);
  display: inline-flex;
  align-items: center;
}
.btn-aktifkan:hover:not(:disabled) { color: #6ee7b7; }
.btn-aktifkan:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-del {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color var(--transition-fast);
}
.btn-del:hover { color: var(--accent-red); }

/* ── Modal Error ──────────────────────────────────────── */
.um-modal-error {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  font-size: 13px;
  color: #fca5a5;
  margin-bottom: 12px;
}

/* ── Spinner ──────────────────────────────────────────── */
.spinner { animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Pagination */
.crm-pagination {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px 4px; font-size: 13px; color: var(--text-secondary);
}
.page-btn {
  padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border-color);
  background: var(--bg-card); color: var(--text-primary); cursor: pointer; transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: var(--accent-orange); color: var(--accent-orange); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-weight: 600; }
</style>
