import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, type UserResponse } from '@/services/api'

// Shape: { [module]: { can_view, can_create, can_edit, can_delete } }
type PermMap = Record<string, { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }>

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<UserResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const userName = computed(() => user.value?.name ?? '')
  const userRole = computed(() => user.value?.role?.name ?? '')
  const userInitials = computed(() => user.value?.initials ?? '')
  const userAvatarColor = computed(() => user.value?.avatar_color ?? '#6366f1')
  const isSuperAdmin = computed(() => user.value?.role?.slug === 'super-admin')

  /**
   * Flat permission map keyed by module slug.
   * Super Admin gets full access to everything without checking the DB.
   */
  const permissionMap = computed<PermMap>(() => {
    if (isSuperAdmin.value) {
      // Super Admin: grant all modules implicitly
      const allTrue = { can_view: true, can_create: true, can_edit: true, can_delete: true }
      const superMap: PermMap = {}
      const ALL_MODULES = [
        'dashboard', 'crm', 'survei', 'penawaran',
        'proyek', 'log_pekerjaan', 'procurement', 'qc',
        'invoice', 'pembukuan', 'arus_kas', 'laba_rugi', 'neraca', 'fee_tim',
        'user_mgmt', 'role_mgmt',
      ]
      ALL_MODULES.forEach(m => { superMap[m] = { ...allTrue } })
      return superMap
    }

    const map: PermMap = {}
    const perms = user.value?.role?.permissions ?? []
    perms.forEach((p) => {
      map[p.module] = {
        can_view:   p.can_view,
        can_create: p.can_create,
        can_edit:   p.can_edit,
        can_delete: p.can_delete,
      }
    })
    return map
  })

  /**
   * Check if the current user has a specific permission.
   * @param module  e.g. 'crm', 'user_mgmt'
   * @param action  'view' | 'create' | 'edit' | 'delete'
   */
  function can(module: string, action: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean {
    if (isSuperAdmin.value) return true
    const perm = permissionMap.value[module]
    if (!perm) return false
    return perm[`can_${action}`] === true
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const data = await authApi.login(email, password)
      token.value = data.token
      user.value = data.user
      localStorage.setItem('auth_token', data.token)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Login gagal.'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const data = await authApi.me()
      user.value = data.user
    } catch {
      // Token invalid – clear session
      logout()
    }
  }

  async function logout() {
    try {
      if (token.value) await authApi.logout()
    } catch {
      // Ignore errors on logout
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isLoggedIn,
    isSuperAdmin,
    userName,
    userRole,
    userInitials,
    userAvatarColor,
    permissionMap,
    can,
    login,
    fetchMe,
    logout,
  }
})
