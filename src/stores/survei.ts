import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  surveisApi,
  type SurveiResponse,
  type SurveiPayload,
  type SurveiSyncPayload,
  type SurveiStatus,
} from '@/services/api'

export const useSurveiStore = defineStore('survei', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const surveis       = ref<SurveiResponse[]>([])
  const selectedId    = ref<number | null>(null)
  const selectedData  = ref<SurveiResponse | null>(null)

  const loading       = ref(false)  // list loading
  const loadingDetail = ref(false)  // detail loading
  const saving        = ref(false)  // save/sync

  const error         = ref<string | null>(null)

  // ── Getters ────────────────────────────────────────────────────────────────
  const selected = () => selectedData.value

  // ── Actions ────────────────────────────────────────────────────────────────

  async function fetchAll(params?: { search?: string; status?: string }) {
    loading.value = true
    error.value   = null
    try {
      const res = await surveisApi.list(params)
      surveis.value = res.data
    } catch (e: any) {
      error.value = e.message || 'Gagal memuat data survei'
    } finally {
      loading.value = false
    }
  }

  async function fetchOne(id: number) {
    loadingDetail.value = true
    error.value         = null
    try {
      const res = await surveisApi.show(id)
      selectedData.value = res.data

      // Also update the item in the list
      const idx = surveis.value.findIndex(s => s.id === id)
      if (idx !== -1) {
        surveis.value[idx] = { ...surveis.value[idx], ...res.data }
      }
    } catch (e: any) {
      error.value = e.message || 'Gagal memuat detail survei'
    } finally {
      loadingDetail.value = false
    }
  }

  async function create(payload: SurveiPayload): Promise<SurveiResponse | null> {
    saving.value = true
    error.value  = null
    try {
      const res = await surveisApi.create(payload)
      surveis.value.unshift(res.data)
      selectedId.value   = res.data.id
      selectedData.value = res.data
      return res.data
    } catch (e: any) {
      error.value = e.message || 'Gagal menjadwalkan survei'
      return null
    } finally {
      saving.value = false
    }
  }

  async function updateStatus(id: number, status: SurveiStatus): Promise<boolean> {
    saving.value = true
    error.value  = null
    try {
      const res = await surveisApi.updateStatus(id, status)
      // Patch in list
      const idx = surveis.value.findIndex(s => s.id === id)
      if (idx !== -1) surveis.value[idx].status = status
      // Patch selected
      if (selectedData.value?.id === id) selectedData.value.status = status
      return true
    } catch (e: any) {
      error.value = e.message || 'Gagal memperbarui status'
      return false
    } finally {
      saving.value = false
    }
  }

  async function syncForm(id: number, payload: SurveiSyncPayload): Promise<boolean> {
    saving.value = true
    error.value  = null
    try {
      const res = await surveisApi.sync(id, payload)
      selectedData.value = res.data

      // Patch progress in list
      const idx = surveis.value.findIndex(s => s.id === id)
      if (idx !== -1) {
        surveis.value[idx] = { ...surveis.value[idx], ...res.data }
      }
      return true
    } catch (e: any) {
      error.value = e.message || 'Gagal menyimpan form survei'
      return false
    } finally {
      saving.value = false
    }
  }

  async function updateMeta(id: number, payload: { catatan?: string; rekomendasi?: string; estimasi?: number; surveyor?: string; status?: SurveiStatus }): Promise<boolean> {
    saving.value = true
    error.value  = null
    try {
      const res = await surveisApi.update(id, payload)
      selectedData.value = res.data
      const idx = surveis.value.findIndex(s => s.id === id)
      if (idx !== -1) surveis.value[idx] = { ...surveis.value[idx], ...res.data }
      return true
    } catch (e: any) {
      error.value = e.message || 'Gagal memperbarui survei'
      return false
    } finally {
      saving.value = false
    }
  }

  async function deleteSurvei(id: number): Promise<boolean> {
    saving.value = true
    error.value  = null
    try {
      await surveisApi.delete(id)
      surveis.value = surveis.value.filter(s => s.id !== id)
      if (selectedId.value === id) {
        selectedId.value   = surveis.value[0]?.id ?? null
        selectedData.value = null
      }
      return true
    } catch (e: any) {
      error.value = e.message || 'Gagal menghapus survei'
      return false
    } finally {
      saving.value = false
    }
  }

  function selectId(id: number) {
    selectedId.value = id
    selectedData.value = null  // clear so detail panel shows skeleton
  }

  function clearError() {
    error.value = null
  }

  return {
    surveis,
    selectedId,
    selectedData,
    loading,
    loadingDetail,
    saving,
    error,
    selected,
    fetchAll,
    fetchOne,
    create,
    updateStatus,
    syncForm,
    updateMeta,
    deleteSurvei,
    selectId,
    clearError,
  }
})
