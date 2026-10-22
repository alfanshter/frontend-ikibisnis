import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usersApi, type UserResponse, type UserMeta, type CreateUserPayload } from '@/services/api'

export const useUsersStore = defineStore('users', () => {
  const users = ref<UserResponse[]>([])
  const meta = ref<UserMeta>({ total: 0, aktif: 0, nonaktif: 0, current_page: 1, last_page: 1 })
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers(params?: { search?: string; status?: string; role_id?: number | string }) {
    loading.value = true
    error.value = null
    try {
      const res = await usersApi.list(params)
      users.value = res.data
      meta.value = res.meta
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Gagal memuat data user.'
    } finally {
      loading.value = false
    }
  }

  async function createUser(payload: CreateUserPayload) {
    const res = await usersApi.create(payload)
    users.value.unshift(res.user)
    meta.value.total++
    if (res.user.status === 'aktif') meta.value.aktif++
    else meta.value.nonaktif++
    return res.user
  }

  async function updateUser(id: number, payload: Partial<CreateUserPayload>) {
    const res = await usersApi.update(id, payload)
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx !== -1) users.value[idx] = res.user
    return res.user
  }

  async function toggleStatus(id: number) {
    const res = await usersApi.toggleStatus(id)
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx !== -1) {
      const old = users.value[idx]!
      users.value[idx] = res.user
      // Update meta counters
      if (old.status === 'aktif') {
        meta.value.aktif--
        meta.value.nonaktif++
      } else {
        meta.value.aktif++
        meta.value.nonaktif--
      }
    }
    return res.user
  }

  async function deleteUser(id: number) {
    await usersApi.delete(id)
    const idx = users.value.findIndex((u) => u.id === id)
    if (idx !== -1) {
      const old = users.value[idx]!
      if (old.status === 'aktif') meta.value.aktif--
      else meta.value.nonaktif--
      meta.value.total--
      users.value.splice(idx, 1)
    }
  }

  return {
    users,
    meta,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    toggleStatus,
    deleteUser,
  }
})
