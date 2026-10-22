import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  rolesApi,
  type RoleResponse,
  type CreateRolePayload,
  type PermissionPayload,
} from '@/services/api'

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<RoleResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRoles() {
    loading.value = true
    error.value = null
    try {
      const res = await rolesApi.list()
      roles.value = res.data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Gagal memuat data role.'
    } finally {
      loading.value = false
    }
  }

  async function createRole(payload: CreateRolePayload) {
    const res = await rolesApi.create(payload)
    roles.value.push(res.role)
    return res.role
  }

  async function updateRole(id: number, payload: Partial<CreateRolePayload>) {
    const res = await rolesApi.update(id, payload)
    const idx = roles.value.findIndex((r) => r.id === id)
    if (idx !== -1) roles.value[idx] = res.role
    return res.role
  }

  async function updatePermissions(id: number, permissions: PermissionPayload[]) {
    const res = await rolesApi.updatePermissions(id, permissions)
    const idx = roles.value.findIndex((r) => r.id === id)
    if (idx !== -1) roles.value[idx] = res.role
    return res.role
  }

  async function deleteRole(id: number) {
    await rolesApi.delete(id)
    const idx = roles.value.findIndex((r) => r.id === id)
    if (idx !== -1) roles.value.splice(idx, 1)
  }

  return {
    roles,
    loading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    updatePermissions,
    deleteRole,
  }
})
