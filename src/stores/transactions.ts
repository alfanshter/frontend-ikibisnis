import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { transactionsApi, type TransactionResponse, type TransactionStatsResponse, type TransactionPeriod } from '@/services/api'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<TransactionResponse[]>([])
  const stats = ref<TransactionStatsResponse | null>(null)
  const loading = ref(false)
  const statsLoading = ref(false)
  const error = ref<string | null>(null)

  // Pagination state
  const currentPage = ref(1)
  const lastPage = ref(1)
  const total = ref(0)

  // Filter state
  const currentMonth = ref(new Date().getMonth() + 1)
  const currentYear = ref(new Date().getFullYear())
  const period = ref<TransactionPeriod>('month')

  // Rentang tanggal kustom (date range picker). Jika terisi, menggantikan preset periode.
  const startDate = ref<string | null>(null)
  const endDate = ref<string | null>(null)

  async function fetchTransactions(params?: { type?: string; category?: string; page?: number }) {
    loading.value = true
    error.value = null
    try {
      const response = await transactionsApi.list({
        ...params,
        period: period.value,
        month: currentMonth.value,
        year: currentYear.value,
        start_date: startDate.value,
        end_date: endDate.value,
        page: params?.page ?? currentPage.value
      })
      transactions.value = response.data
      currentPage.value = response.meta.current_page
      lastPage.value = response.meta.last_page
      total.value = response.meta.total
    } catch (e: any) {
      error.value = e.message || 'Gagal memuat data transaksi.'
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    statsLoading.value = true
    try {
      stats.value = await transactionsApi.stats({
        period: period.value,
        month: currentMonth.value,
        year: currentYear.value,
        start_date: startDate.value,
        end_date: endDate.value,
      })
    } catch (e: any) {
      console.error('Failed to load transaction stats', e)
    } finally {
      statsLoading.value = false
    }
  }

  /**
   * Ganti periode laporan (bulan / semester / tahun) lalu muat ulang data.
   */
  async function setPeriod(value: TransactionPeriod) {
    // Memilih preset periode akan membersihkan rentang tanggal kustom
    if (period.value === value && !startDate.value && !endDate.value) return
    period.value = value
    startDate.value = null
    endDate.value = null
    currentPage.value = 1
    await Promise.all([fetchTransactions(), fetchStats()])
  }

  /**
   * Terapkan rentang tanggal kustom (hasil date range picker).
   */
  async function setDateRange(start: string | null, end: string | null) {
    const sameRange = startDate.value === start && endDate.value === end
    if (sameRange && period.value === 'custom') return

    startDate.value = start
    endDate.value = end
    period.value = start && end ? 'custom' : period.value
    currentPage.value = 1
    await Promise.all([fetchTransactions(), fetchStats()])
  }

  /**
   * Ganti tahun acuan (untuk periode semester & tahunan).
   */
  async function setYear(value: number) {
    if (currentYear.value === value) return
    currentYear.value = value
    currentPage.value = 1
    await Promise.all([fetchTransactions(), fetchStats()])
  }

  async function addTransaction(data: { type: string; name: string; date: string; category?: string; proyekId?: string; amount: number }) {
    error.value = null
    try {
      await transactionsApi.create(data)
      await fetchTransactions()
      await fetchStats()
    } catch (e: any) {
      error.value = e.message || 'Gagal menambah transaksi.'
      throw e
    }
  }

  async function updateTransaction(id: number, data: { type: string; name: string; date: string; category?: string; proyekId?: string; amount: number }) {
    error.value = null
    try {
      await transactionsApi.update(id, data)
      await fetchTransactions()
      await fetchStats()
    } catch (e: any) {
      error.value = e.message || 'Gagal memperbarui transaksi.'
      throw e
    }
  }

  async function deleteTransaction(id: number) {
    error.value = null
    try {
      await transactionsApi.delete(id)
      await fetchTransactions()
      await fetchStats()
    } catch (e: any) {
      error.value = e.message || 'Gagal menghapus transaksi.'
      throw e
    }
  }

  return {
    transactions,
    stats,
    loading,
    statsLoading,
    error,
    currentPage,
    lastPage,
    total,
    currentMonth,
    currentYear,
    period,
    startDate,
    endDate,
    setPeriod,
    setDateRange,
    setYear,
    fetchTransactions,
    fetchStats,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
})
