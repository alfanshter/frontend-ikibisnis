import { defineStore } from 'pinia'
import { penawaransApi } from '@/services/api'
import type { PenawaranResponse } from '@/services/api'
import { useToast } from 'vue-toastification'

export const usePenawaranStore = defineStore('penawaran', {
  state: () => ({
    penawarans: [] as PenawaranResponse[],
    selectedData: null as PenawaranResponse | null,
    selectedId: null as number | null,
    
    loadingList: false,
    loadingDetail: false,
    saving: false,
    
    filters: {
      search: '',
      status: ''
    }
  }),
  actions: {
    async fetchAll() {
      this.loadingList = true
      try {
        const res = await penawaransApi.list(this.filters)
        this.penawarans = res.data
        if (this.selectedId) {
          const stillExists = this.penawarans.find(p => p.id === this.selectedId)
          if (!stillExists) {
            this.selectedId = null
            this.selectedData = null
          }
        }
      } catch (err: any) {
        useToast().error(err.response?.data?.message || 'Gagal memuat daftar penawaran')
      } finally {
        this.loadingList = false
      }
    },
    
    async fetchOne(id: number) {
      this.loadingDetail = true
      try {
        const res = await penawaransApi.show(id)
        this.selectedData = res.data
      } catch (err: any) {
        useToast().error(err.response?.data?.message || 'Gagal memuat detail penawaran')
      } finally {
        this.loadingDetail = false
      }
    },
    
    selectId(id: number | null) {
      this.selectedId = id
      if (!id) this.selectedData = null
    },
    
    setFilter(key: 'search'|'status', value: string) {
      this.filters[key] = value
      this.fetchAll()
    }
  }
})
