import { defineStore } from 'pinia'
import { ref } from 'vue'
import { clientsApi, type ClientResponse, type ClientPayload } from '@/services/api'

export const useClientStore = defineStore('client', () => {
  const clients = ref<ClientResponse[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(params?: { search?: string }) {
    loading.value = true
    error.value = null
    try {
      clients.value = await clientsApi.list(params)
    } catch (e: any) {
      error.value = e.message || 'Gagal memuat data klien'
    } finally {
      loading.value = false
    }
  }

  async function create(payload: ClientPayload): Promise<ClientResponse | null> {
    saving.value = true
    error.value = null
    try {
      const client = await clientsApi.create(payload)
      clients.value.unshift(client)
      return client
    } catch (e: any) {
      error.value = e.message || 'Gagal menambahkan klien'
      return null
    } finally {
      saving.value = false
    }
  }

  async function update(id: number, payload: Partial<ClientPayload>): Promise<ClientResponse | null> {
    saving.value = true
    error.value = null
    try {
      const client = await clientsApi.update(id, payload)
      const idx = clients.value.findIndex((c) => c.id === id)
      if (idx !== -1) {
        clients.value[idx] = client
      }
      return client
    } catch (e: any) {
      error.value = e.message || 'Gagal memperbarui klien'
      return null
    } finally {
      saving.value = false
    }
  }

  async function destroy(id: number): Promise<boolean> {
    saving.value = true
    error.value = null
    try {
      await clientsApi.delete(id)
      clients.value = clients.value.filter((c) => c.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message || 'Gagal menghapus klien'
      return false
    } finally {
      saving.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    clients,
    loading,
    saving,
    error,
    fetchAll,
    create,
    update,
    destroy,
    clearError,
  }
})
