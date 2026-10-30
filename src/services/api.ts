/**
 * API Service Layer
 * Menghubungkan frontend ke backend Laravel (http://127.0.0.1:8000/api)
 */

// const BASE_URL = 'https://ikibisnis.ptpws.id/api'
const BASE_URL = 'http://127.0.0.1:8000/api'

function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

async function request<T>(
  method: string,
  path: string,
  body?: Record<string, unknown> | FormData,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  let fetchBody: any = undefined
  if (body) {
    if (body instanceof FormData) {
      fetchBody = body
    } else {
      headers['Content-Type'] = 'application/json'
      fetchBody = JSON.stringify(body)
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: fetchBody,
  })

  const data = await res.json()

  if (!res.ok) {
    // Throw validation / error messages from Laravel
    const msg =
      data?.message ||
      (data?.errors ? Object.values(data.errors).flat().join(', ') : 'Terjadi kesalahan.')
    throw new Error(msg)
  }

  return data as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: UserResponse }>('POST', '/login', { email, password }),

  me: () => request<{ user: UserResponse }>('GET', '/me'),

  logout: () => request<{ message: string }>('POST', '/logout'),
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: { search?: string; status?: string; role_id?: number | string }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.status) qs.set('status', params.status)
    if (params?.role_id) qs.set('role_id', String(params.role_id))
    return request<{ data: UserResponse[]; meta: UserMeta }>('GET', `/users?${qs}`)
  },

  show: (id: number) => request<{ user: UserResponse }>('GET', `/users/${id}`),

  create: (payload: CreateUserPayload) =>
    request<{ user: UserResponse }>('POST', '/users', payload as unknown as Record<string, unknown>),

  update: (id: number, payload: Partial<CreateUserPayload>) =>
    request<{ user: UserResponse }>('PUT', `/users/${id}`, payload as unknown as Record<string, unknown>),

  toggleStatus: (id: number) =>
    request<{ user: UserResponse }>('PUT', `/users/${id}/toggle-status`),

  delete: (id: number) => request<{ message: string }>('DELETE', `/users/${id}`),
}

// ─── Roles ────────────────────────────────────────────────────────────────────
export const rolesApi = {
  list: () => request<{ data: RoleResponse[] }>('GET', '/roles'),

  create: (payload: CreateRolePayload) =>
    request<{ role: RoleResponse }>('POST', '/roles', payload as unknown as Record<string, unknown>),

  update: (id: number, payload: Partial<CreateRolePayload>) =>
    request<{ role: RoleResponse }>('PUT', `/roles/${id}`, payload as unknown as Record<string, unknown>),

  updatePermissions: (id: number, permissions: PermissionPayload[]) =>
    request<{ role: RoleResponse }>('PUT', `/roles/${id}/permissions`, { permissions }),

  delete: (id: number) => request<{ message: string }>('DELETE', `/roles/${id}`),
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserResponse {
  id: number
  name: string
  email: string
  status: 'aktif' | 'nonaktif'
  avatar_color: string
  last_login_at: string | null
  created_at: string | null
  initials: string
  is_active: boolean
  role_id: number | null
  role: RoleResponse | null
}

export interface UserMeta {
  total: number
  aktif: number
  nonaktif: number
  current_page: number
  last_page: number
}

export interface RoleResponse {
  id: number
  name: string
  slug: string
  description: string | null
  color: string
  is_system: boolean
  user_count: number
  active_permissions_count: number
  total_permissions_count: number
  permissions: PermissionResponse[]
}

export interface PermissionResponse {
  id: number
  role_id: number
  module: string
  module_label: string
  section: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface CreateUserPayload {
  name: string
  email: string
  password?: string
  role_id: number | string
  status: 'aktif' | 'nonaktif'
}

export interface CreateRolePayload {
  name: string
  description?: string
  color?: string
}

export interface PermissionPayload {
  module: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

// ─── Transactions API ──────────────────────────────────────────────────────────
export interface TransactionResponse {
  id: number
  type: 'masuk' | 'keluar'
  name: string
  date: string
  category: string | null
  proyekId: string | null
  amount: number
  created_by: number | null
  created_at: string
}

export interface TransactionStatsResponse {
  current_period: {
    month: number
    year: number
    total_masuk: number
    total_keluar: number
    saldo_bersih: number
  }
  chart_data: Array<{
    month: string
    raw_month: number
    raw_year: number
    masuk: number
    keluar: number
    masuk_jt: number
    keluar_jt: number
  }>
}

export const transactionsApi = {
  list(params?: { type?: string; category?: string; month?: number; year?: number; page?: number }) {
    const qs = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== ('' as unknown)) qs.append(k, String(v))
      })
    }
    return request<{ data: TransactionResponse[]; meta: any }>('GET', `/transactions?${qs.toString()}`)
  },
  stats(params?: { month?: number; year?: number }) {
    const qs = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== ('' as unknown)) qs.append(k, String(v))
      })
    }
    return request<TransactionStatsResponse>('GET', `/transactions/stats?${qs.toString()}`)
  },
  create(data: { type: string; name: string; date: string; category?: string; proyekId?: string; amount: number }) {
    return request<{ message: string; data: TransactionResponse }>('POST', '/transactions', data as unknown as Record<string, unknown>)
  },
  update(id: number, data: { type: string; name: string; date: string; category?: string; proyekId?: string; amount: number }) {
    return request<{ message: string; data: TransactionResponse }>('PUT', `/transactions/${id}`, data as unknown as Record<string, unknown>)
  },
  delete(id: number) {
    return request<{ message: string }>('DELETE', `/transactions/${id}`)
  },
}

// ─── Financial Reports API ─────────────────────────────────────────────────────

export interface ArusKasItem {
  label: string
  amount: number
  category: string | null
  date: string
  type: 'masuk' | 'keluar'
}

export interface ArusKasSection {
  key: string
  title: string
  color: string
  items: ArusKasItem[]
  subtotal: number
}

export interface ArusKasTrendItem {
  month: string
  raw_month: number
  raw_year: number
  masuk: number
  keluar: number
  net: number
  net_jt: number
}

export interface ArusKasResponse {
  period: { month: number; year: number }
  sections: ArusKasSection[]
  net_cash_flow: number
  saldo_awal: number
  saldo_akhir: number
  trend: ArusKasTrendItem[]
}

export interface LabaRugiItem {
  label: string
  amount: number
  type: 'masuk' | 'keluar'
  date: string
  signed_amount?: number
}

export interface LabaRugiTrendItem {
  month: string
  raw_month: number
  raw_year: number
  laba: number
  laba_jt: number
}

export interface LabaRugiResponse {
  period: { month: number; year: number }
  pendapatan: { items: LabaRugiItem[]; total: number }
  hpp: { items: LabaRugiItem[]; total: number }
  beban_opex: { items: LabaRugiItem[]; total: number }
  non_operasional: { items: LabaRugiItem[]; total: number }
  summary: {
    laba_kotor: number
    laba_operasional: number
    laba_sebelum_pajak: number
    pajak: number
    laba_bersih: number
    margin_kotor: number
    margin_bersih: number
    hpp_ratio: number
  }
  trend: LabaRugiTrendItem[]
}

export interface NeracaItem {
  id: number | null
  label: string
  amount: number
  date: string
  type: string
}

export interface NeracaResponse {
  date: string
  aset: {
    lancar: { items: NeracaItem[]; total: number }
    tetap: { items: NeracaItem[]; total: number }
    total: number
  }
  liabilitas: {
    jangka_pendek: { items: NeracaItem[]; total: number }
    jangka_panjang: { items: NeracaItem[]; total: number }
    total: number
  }
  ekuitas: { items: NeracaItem[]; total: number }
  total_liab_ekuitas: number
  is_balanced: boolean
  rasio: {
    current_ratio: number
    debt_ratio: number
    equity_ratio: number
  }
}

export interface FinancialEntryResponse {
  id: number
  type: 'aset_lancar' | 'aset_tetap' | 'liabilitas_pendek' | 'liabilitas_panjang' | 'ekuitas'
  label: string
  amount: number
  date: string
  notes: string | null
  created_by: number | null
  created_at: string
}

function buildQs(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return ''
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, String(v))
  })
  return qs.toString() ? `?${qs.toString()}` : ''
}

export const reportsApi = {
  arusKas(params?: { month?: number; year?: number }) {
    return request<ArusKasResponse>('GET', `/reports/arus-kas${buildQs(params)}`)
  },
  labaRugi(params?: { month?: number; year?: number }) {
    return request<LabaRugiResponse>('GET', `/reports/laba-rugi${buildQs(params)}`)
  },
  neraca(params?: { date?: string }) {
    return request<NeracaResponse>('GET', `/reports/neraca${buildQs(params)}`)
  },
}

export const financialEntriesApi = {
  list(params?: { type?: string; date?: string }) {
    return request<{ data: FinancialEntryResponse[] }>('GET', `/financial-entries${buildQs(params)}`)
  },
  create(data: { type: string; label: string; amount: number; date: string; notes?: string }) {
    return request<{ message: string; data: FinancialEntryResponse }>('POST', '/financial-entries', data as unknown as Record<string, unknown>)
  },
  update(id: number, data: { type: string; label: string; amount: number; date: string; notes?: string }) {
    return request<{ message: string; data: FinancialEntryResponse }>('PUT', `/financial-entries/${id}`, data as unknown as Record<string, unknown>)
  },
  delete(id: number) {
    return request<{ message: string }>('DELETE', `/financial-entries/${id}`)
  },
}

// ── Master Data (Parts) ────────────────────────────────────────────────────────
export interface PartSupplierResponse {
  id: number
  nama: string
  kontak: string
  harga: number
  leadTime: string
  catatan: string
  isPrimary: boolean
}

export interface PartResponse {
  id: number
  nama: string
  sku: string
  kategori: string
  merek: string
  spesifikasi: string
  satuan: string
  stokMin: number
  suppliers: PartSupplierResponse[]
}

export const partsApi = {
  list: () => request<{ data: PartResponse[] }>('GET', '/parts'),
  create: (data: Omit<PartResponse, 'id'>) => request<{ data: PartResponse }>('POST', '/parts', data),
  update: (id: number, data: Omit<PartResponse, 'id'>) => request<{ data: PartResponse }>('PUT', `/parts/${id}`, data),
  destroy: (id: number) => request('DELETE', `/parts/${id}`),
  importExcel: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const token = getToken()
    const res = await fetch(`${BASE_URL}/parts/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'application/json' } : { Accept: 'application/json' },
      body: fd,
    })
    const data = await res.json()
    if (!res.ok) {
      const msg = data?.message || (data?.errors ? Object.values(data.errors).flat().join(', ') : 'Upload gagal.')
      throw new Error(msg)
    }
    return data
  },
  downloadTemplate: async () => {
    const token = getToken()
    const res = await fetch(`${BASE_URL}/parts/template`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Gagal mengunduh template')
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'template_master_part.xlsx')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}

// ── Clients Database API ───────────────────────────────────────────────────────
export interface ClientResponse {
  id: number
  nama: string
  perusahaan: string | null
  telepon: string | null
  email: string | null
  alamat: string | null
  catatan: string | null
  created_at: string
  updated_at: string
}

export interface ClientPayload {
  nama: string
  perusahaan?: string | null
  telepon?: string | null
  email?: string | null
  alamat?: string | null
  catatan?: string | null
}

export const clientsApi = {
  list(params?: { search?: string }) {
    return request<ClientResponse[]>('GET', `/clients${buildQs(params)}`)
  },
  show(id: number) {
    return request<ClientResponse>('GET', `/clients/${id}`)
  },
  create(payload: ClientPayload) {
    return request<ClientResponse>('POST', '/clients', payload as unknown as Record<string, unknown>)
  },
  update(id: number, payload: Partial<ClientPayload>) {
    return request<ClientResponse>('PUT', `/clients/${id}`, payload as unknown as Record<string, unknown>)
  },
  delete(id: number) {
    return request<{ message: string }>('DELETE', `/clients/${id}`)
  },
}

// ── CRM Leads API ────────────────────────────────────────────────────────────

export type LeadStatus = 'Prospek' | 'Survey' | 'Penawaran' | 'Deal' | 'Pending' | 'Batal'
export type LeadSumber = 'WhatsApp' | 'Referensi' | 'Website' | 'Instagram' | 'Langsung' | 'Telepon'

export interface LeadResponse {
  id: number
  kode_lead?: string | null
  tanggal: string
  nama: string
  perusahaan: string
  pic_id: number | null
  pic: string | null
  kebutuhan: string | null
  sumber: LeadSumber
  estimasi: number | null
  status: LeadStatus
  phone: string | null
  email: string | null
  lokasi: string | null
  catatan: string | null
  tipe_proyek: string | null
  skala: string | null
  intensitas: string | null
  tipe_kontrak?: 'Langsung' | 'Sewa' | null
  sewa_durasi_bulan?: number | null
  skema_pembayaran?: 'Bulanan' | 'Sekaligus' | null
  sewa_mulai?: string | null
  sewa_selesai?: string | null
  nominal_per_bulan?: number | null
  akses_tipe?: 'personal' | 'role' | 'semua' | null
  allowed_roles?: (string | number)[] | null
  assigned_users?: number[] | null
  created_by: number | null
  created_at: string
  updated_at: string
  surveis_count?: number
  surveis?: Partial<SurveiResponse>[]
  penawarans?: LeadPenawaranSummaryResponse[]
  proyek?: { id: number; nama: string } | null
}

export interface LeadPenawaranSummaryResponse {
  id: number
  nomor_penawaran: string
  tanggal: string
  valid_until: string | null
  status: string
  total_harga: number
}

export interface LeadActivityResponse {
  id: number
  lead_id: number
  title: string
  description: string | null
  date: string
  created_by: number | null
  created_by_name?: string
  created_at: string
}

export interface LeadStatsResponse {
  by_status: Array<{ status: string; count: number }>
  total: number
  total_estimasi: number
}

export interface LeadPayload {
  tanggal: string
  nama: string
  perusahaan: string
  pic_id?: number | null
  akses_tipe?: 'personal' | 'role' | 'semua'
  tampilkan_nilai?: boolean
  allowed_roles?: (string | number)[]
  assigned_users?: number[]
  kebutuhan?: string
  sumber: LeadSumber
  estimasi?: number | null
  status: LeadStatus
  phone?: string
  email?: string
  lokasi?: string
  catatan?: string
  tipe_proyek?: string
  skala?: string
  intensitas?: string
  tipe_kontrak?: 'Langsung' | 'Sewa'
  sewa_durasi_bulan?: number
  skema_pembayaran?: 'Bulanan' | 'Sekaligus'
  sewa_mulai?: string
  sewa_selesai?: string
  nominal_per_bulan?: number
}

export const leadsApi = {
  list(params?: { search?: string; status?: string; tipe_kontrak?: string; page?: number }) {
    return request<{ data: LeadResponse[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>(
      'GET', `/leads${buildQs(params)}`
    )
  },
  stats() {
    return request<LeadStatsResponse>('GET', '/leads/stats')
  },
  show(id: number) {
    return request<{
      data: LeadResponse
      activities: LeadActivityResponse[]
      surveis: Partial<SurveiResponse>[]
      penawarans: LeadPenawaranSummaryResponse[]
    }>('GET', `/leads/${id}`)
  },
  create(payload: LeadPayload) {
    return request<{ message: string; data: LeadResponse }>('POST', '/leads', payload as unknown as Record<string, unknown>)
  },
  update(id: number, payload: Partial<LeadPayload>) {
    return request<{ message: string; data: LeadResponse }>('PUT', `/leads/${id}`, payload as unknown as Record<string, unknown>)
  },
  updateStatus(id: number, status: LeadStatus) {
    return request<{ message: string; data: LeadResponse }>('PATCH', `/leads/${id}/status`, { status })
  },
  delete(id: number) {
    return request<{ message: string }>('DELETE', `/leads/${id}`)
  },
}

export const leadActivitiesApi = {
  list(leadId: number) {
    return request<{ data: LeadActivityResponse[] }>('GET', `/leads/${leadId}/activities`)
  },
  create(leadId: number, payload: { title: string; description?: string; date: string }) {
    return request<{ message: string; data: LeadActivityResponse; lead_status: string }>(
      'POST', `/leads/${leadId}/activities`, payload as unknown as Record<string, unknown>
    )
  },
  delete(leadId: number, activityId: number) {
    return request<{ message: string }>('DELETE', `/leads/${leadId}/activities/${activityId}`)
  },
}

// ── Form Survei API ─────────────────────────────────────────────────────────

export type SurveiStatus = 'Dijadwalkan' | 'Selesai' | 'Batal'

export interface SurveiQuestionResponse {
  id: number
  label: string
  answer: string
  notes: string
  urutan: number
}

export interface SurveiCategoryResponse {
  id: number
  name: string
  urutan: number
  questions: SurveiQuestionResponse[]
}

export interface SurveiProgressResponse {
  total: number
  answered: number
  percent: number
}

export interface SurveiResponse {
  id: number
  lead_id: number | null
  client: string
  perusahaan: string | null
  surveyor: string | null
  lokasi: string | null
  tanggal: string
  waktu: string | null
  kebutuhan: string | null
  estimasi: number
  status: SurveiStatus
  catatan: string | null
  rekomendasi: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  categories?: SurveiCategoryResponse[]
  progress: SurveiProgressResponse
}

export interface SurveiPayload {
  lead_id?: number | null
  client: string
  perusahaan?: string
  surveyor?: string
  lokasi?: string
  tanggal: string
  waktu?: string
  kebutuhan?: string
  estimasi?: number
  status?: SurveiStatus
}

export interface SurveiSyncPayload {
  categories: Array<{
    id?: number | null
    name: string
    urutan: number
    questions: Array<{
      id?: number | null
      label: string
      answer: string
      notes: string
      urutan: number
    }>
  }>
  estimasi?: number
  catatan?: string
  rekomendasi?: string
}

export interface SurveiStatsResponse {
  by_status: Array<{ status: string; count: number }>
  total: number
}

export const surveisApi = {
  list(params?: { search?: string; status?: string; page?: number }) {
    return request<{ data: SurveiResponse[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>(
      'GET', `/surveis${buildQs(params)}`
    )
  },

  stats() {
    return request<SurveiStatsResponse>('GET', '/surveis/stats')
  },

  show(id: number) {
    return request<{ data: SurveiResponse }>('GET', `/surveis/${id}`)
  },

  create(payload: SurveiPayload) {
    return request<{ message: string; data: SurveiResponse }>('POST', '/surveis', payload as unknown as Record<string, unknown>)
  },

  update(id: number, payload: Partial<SurveiPayload> & { catatan?: string; rekomendasi?: string }) {
    return request<{ message: string; data: SurveiResponse }>('PUT', `/surveis/${id}`, payload as unknown as Record<string, unknown>)
  },

  updateStatus(id: number, status: SurveiStatus) {
    return request<{ message: string; data: SurveiResponse }>('PATCH', `/surveis/${id}/status`, { status })
  },

  sync(id: number, payload: SurveiSyncPayload) {
    return request<{ message: string; data: SurveiResponse }>('POST', `/surveis/${id}/sync`, payload as unknown as Record<string, unknown>)
  },

  delete(id: number) {
    return request<{ message: string }>('DELETE', `/surveis/${id}`)
  },
}

export interface DocumentNumbering {
  id: number
  module: string
  module_label: string
  format: string
  starting_number: number
  digit: number
  current_number: number
  next_preview?: string
}

// ─── Api Instances ───────────────────────────────────────────────────────────────
export interface AuditLogResponse {
  id: number
  user_name: string
  action: string
  auditable_type: string
  auditable_id: number
  old_values: any
  new_values: any
  ip_address: string
  created_at: string
}

export const auditLogsApi = {
  list(params?: { user_id?: number; action?: string; auditable_type?: string; auditable_id?: number; survei_id?: number; page?: number }) {
    const qs = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v))
      })
    }
    return request<{ data: AuditLogResponse[]; meta: any }>('GET', `/audit-logs?${qs.toString()}`)
  }
}

// ─── Penawaran ────────────────────────────────────────────────────────────────
export interface PenawaranItemResponse {
  id: number
  part_id: number | null
  jenis_item: 'barang' | 'jasa'
  pajak_type: 'tanpa_pajak' | 'dengan_pajak' | 'termasuk_pajak'
  pajak_persen: number
  nama_item: string
  deskripsi: string | null
  qty: number
  harga_satuan: number
  total_harga: number
}

export interface PenawaranResponse {
  id: number
  lead_id: number | null
  survei_id: number | null
  client_name: string
  perusahaan: string
  phone?: string | null
  nomor_penawaran: string
  tanggal: string
  valid_until: string | null
  status: string
  catatan: string | null
  subtotal: number
  pajak: number
  diskon: number
  total_harga: number
  items?: PenawaranItemResponse[]
  created_by: string
  created_at: string
  updated_at: string
}

export const penawaransApi = {
  list(params?: { search?: string; status?: string }) {
    const qs = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, String(v))
      })
    }
    const q = qs.toString()
    return request<{ data: PenawaranResponse[] }>('GET', `/penawarans${q ? '?' + q : ''}`)
  },
  show(id: number) {
    return request<{ data: PenawaranResponse }>('GET', `/penawarans/${id}`)
  },
  create(payload: any) {
    return request<{ message: string; data: PenawaranResponse }>('POST', '/penawarans', payload)
  },
  update(id: number, payload: any) {
    return request<{ message: string; data: PenawaranResponse }>('PUT', `/penawarans/${id}`, payload)
  },
  updateStatus(id: number, status: string) {
    return request<{ message: string; data: PenawaranResponse }>('PATCH', `/penawarans/${id}/status`, { status })
  },
  delete(id: number) {
    return request<{ message: string }>('DELETE', `/penawarans/${id}`)
  }
}

// ─── Proyek API ───────────────────────────────────────────────────────────────

export type StatusProyek = 'Belum Dimulai' | 'Berjalan' | 'QC' | 'Serah Terima' | 'Selesai' | 'Hold'
export type TipeKontrakProyek = 'Reguler' | 'Sewa'
export type SkemaPembayaranSewa = 'Bulanan' | 'Sekaligus' | 'Termin'

export interface ProyekSewaPerpanjanganResponse {
  id: number
  tanggal_perpanjangan: string
  sewa_mulai_lama: string | null
  sewa_selesai_lama: string | null
  sewa_mulai_baru: string
  sewa_selesai_baru: string
  durasi_bulan: number
  nominal: number
  nominal_format: string
  skema_pembayaran: string | null
  catatan: string | null
  created_by: string | null
  created_at: string
}

export interface ProyekResponse {
  id: number
  kode: string
  nama: string
  client: string
  client_nama: string
  perusahaan: string | null
  phone: string | null
  email: string | null
  kategori: string | null
  divisi: string | null
  tipe_kontrak: TipeKontrakProyek
  sewa_mulai: string | null
  sewa_selesai: string | null
  sewa_durasi_bulan: number | null
  skema_pembayaran: SkemaPembayaranSewa | null
  nominal_per_bulan: number | null
  nominal_per_bulan_format: string | null
  status_sewa: string | null
  sisa_hari_sewa: number | null
  pic_id: number | null
  pic: string | null
  akses_tipe?: 'personal' | 'role' | 'semua' | null
  tampilkan_nilai?: boolean
  allowed_roles?: (string | number)[] | null
  tanggal: string | null
  targetSelesai: string | null
  target_selesai: string | null
  deskripsi: string | null
  nilai: number
  nilai_format: string
  progress: number
  status: StatusProyek
  status_pembayaran?: 'Belum Dibayar' | 'Sebagian' | 'Lunas' | string
  total_dibayar?: number
  total_dibayar_format?: string
  sisa_pembayaran?: number
  sisa_pembayaran_format?: string
  penawaran_id: number | null
  created_by: number | null
  created_at: string
  updated_at: string
  tim?: ProyekTimResponse[]
  perpanjangan_sewas?: ProyekSewaPerpanjanganResponse[]
  pembayarans?: ProyekPembayaranResponse[]
}

export interface ProyekStatsResponse {
  by_status: Array<{ status: string; count: number }>
  total: number
  nilai_total: number
  total_sewa?: number
}

export interface ProyekPayload {
  nama: string
  client_nama?: string
  perusahaan?: string
  phone?: string
  email?: string
  kategori?: string
  divisi?: string
  tipe_kontrak?: TipeKontrakProyek
  sewa_mulai?: string
  sewa_selesai?: string
  sewa_durasi_bulan?: number
  skema_pembayaran?: SkemaPembayaranSewa
  nominal_per_bulan?: number
  status_sewa?: string
  pic_id?: number | null
  akses_tipe?: 'personal' | 'role' | 'semua'
  tampilkan_nilai?: boolean
  allowed_roles?: (string | number)[]
  tim?: Array<{ user_id?: number | null; nama: string; role?: string }>
  tanggal?: string
  target_selesai?: string
  deskripsi?: string
  nilai?: number
  progress?: number
  status?: StatusProyek
  penawaran_id?: number | null
  lead_id?: number | null
}

export const proyeksApi = {
  list(params?: { search?: string; status?: string; tipe_kontrak?: string; page?: number }) {
    return request<{ data: ProyekResponse[]; meta: { current_page: number; last_page: number; per_page: number; total: number } }>(
      'GET', `/proyeks${buildQs(params)}`
    )
  },
  stats() {
    return request<ProyekStatsResponse>('GET', '/proyeks/stats')
  },
  show(id: number) {
    return request<{ data: ProyekResponse }>('GET', `/proyeks/${id}`)
  },
  create(payload: ProyekPayload) {
    return request<{ message: string; data: ProyekResponse }>('POST', '/proyeks', payload as unknown as Record<string, unknown>)
  },
  update(id: number, payload: Partial<ProyekPayload>) {
    return request<{ message: string; data: ProyekResponse }>('PUT', `/proyeks/${id}`, payload as unknown as Record<string, unknown>)
  },
  updateStatus(id: number, status: StatusProyek) {
    return request<{ message: string; data: ProyekResponse }>('PATCH', `/proyeks/${id}/status`, { status })
  },
  updateProgress(id: number, progress: number) {
    return request<{ message: string; data: ProyekResponse }>('PATCH', `/proyeks/${id}/progress`, { progress })
  },
  perpanjangSewa(id: number, payload: {
    durasi_bulan: number
    sewa_mulai_baru?: string
    sewa_selesai_baru: string
    nominal: number
    skema_pembayaran?: string
    catatan?: string
    generate_invoices?: boolean
  }) {
    return request<{ message: string; data: ProyekResponse }>('POST', `/proyeks/${id}/perpanjang-sewa`, payload as unknown as Record<string, unknown>)
  },
  generateSewaInvoices(id: number, payload: {
    skema: 'Bulanan' | 'Sekaligus'
    ppn?: number
    jatuh_tempo_hari?: number
  }) {
    return request<{ message: string; count: number }>('POST', `/proyeks/${id}/generate-sewa-invoices`, payload as unknown as Record<string, unknown>)
  },
  bayarLangsung(id: number, payload: {
    nominal?: number
    tanggal_bayar?: string
    metode_pembayaran?: string
    catatan?: string
    masuk_pembukuan?: boolean
    status_pembayaran?: 'Lunas' | 'Sebagian' | 'Belum Dibayar'
  }) {
    return request<{ message: string; data: ProyekResponse; pembayaran?: ProyekPembayaranResponse }>(
      'POST', `/proyeks/${id}/bayar-langsung`, payload as unknown as Record<string, unknown>
    )
  },
  updateStatusPembayaran(id: number, status_pembayaran: string) {
    return request<{ message: string; data: ProyekResponse }>(
      'PATCH', `/proyeks/${id}/status-pembayaran`, { status_pembayaran }
    )
  },
  delete(id: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${id}`)
  },
}

// ─── Proyek Tim ───────────────────────────────────────────────────────────────
export const proyekTimApi = {
  list(proyekId: number) {
    return request<{ data: ProyekTimResponse[] }>('GET', `/proyeks/${proyekId}/tim`)
  },
  add(proyekId: number, payload: { user_id?: number | null; nama: string; role?: string }) {
    return request<{ message: string; data: ProyekTimResponse }>('POST', `/proyeks/${proyekId}/tim`, payload as unknown as Record<string, unknown>)
  },
  remove(proyekId: number, timId: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${proyekId}/tim/${timId}`)
  },
}

// ─── Log Pekerjaan ────────────────────────────────────────────────────────────
export interface LogPekerjaanFoto {
  id?: number
  url: string
  label?: string
  keterangan?: string
}

export interface LogPekerjaanResponse {
  id: number
  proyek_id: number
  tanggal: string
  aktivitas: string
  tim: string[]
  durasi: string | null
  kendala: string | null
  status_verifikasi?: 'Menunggu Review' | 'Sesuai' | 'Perlu Revisi'
  catatan_revisi?: string | null
  verified_by?: number | null
  verified_at?: string | null
  verifier?: { id: number; name: string; role?: string } | null
  fotos: LogPekerjaanFoto[]
  created_by: number | null
  creator?: { id: number; name: string; email?: string; role?: string } | null
  created_at: string
}

export interface LogPekerjaanPayload {
  tanggal: string
  aktivitas: string
  tim?: string[]
  durasi?: string | number
  kendala?: string
  fotos?: LogPekerjaanFoto[]
}

export const logPekerjaanApi = {
  list(proyekId: number) {
    return request<{ data: LogPekerjaanResponse[] }>('GET', `/proyeks/${proyekId}/log-pekerjaan`)
  },
  create(proyekId: number, payload: LogPekerjaanPayload | FormData) {
    return request<{ message: string; data: LogPekerjaanResponse }>('POST', `/proyeks/${proyekId}/log-pekerjaan`, payload as any)
  },
  update(proyekId: number, logId: number, payload: Partial<LogPekerjaanPayload> | FormData) {
    const method = payload instanceof FormData ? 'POST' : 'PUT'
    return request<{ message: string; data: LogPekerjaanResponse }>(method, `/proyeks/${proyekId}/log-pekerjaan/${logId}`, payload as any)
  },
  delete(proyekId: number, logId: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${proyekId}/log-pekerjaan/${logId}`)
  },
  verifikasi(proyekId: number, logId: number, payload: { status_verifikasi: 'Menunggu Review' | 'Sesuai' | 'Perlu Revisi'; catatan_revisi?: string }) {
    return request<{ message: string; data: LogPekerjaanResponse }>('PATCH', `/proyeks/${proyekId}/log-pekerjaan/${logId}/verifikasi`, payload)
  },
}

// ─── Proyek QC ────────────────────────────────────────────────────────────────
export interface QcItemResponse {
  id: number
  text: string
  checked: boolean
  note: string | null
}

export interface QcSectionResponse {
  id: number
  title: string
  sort_order: number
  isExpanded: boolean
  items: QcItemResponse[]
}

export interface ProyekQcResponse {
  id: number
  proyek_id: number
  qc_pic: string | null
  qc_tanggal: string | null
  status: 'Draft' | 'Dalam Review' | 'Lulus' | 'Revisi'
  sections: QcSectionResponse[]
}

export const proyekQcApi = {
  get(proyekId: number) {
    return request<{ data: ProyekQcResponse }>('GET', `/proyeks/${proyekId}/qc`)
  },
  update(proyekId: number, payload: Partial<{ qc_pic: string; qc_tanggal: string; status: string; sections: any[] }>) {
    return request<{ message: string; data: ProyekQcResponse }>('PUT', `/proyeks/${proyekId}/qc`, payload as unknown as Record<string, unknown>)
  },
  toggleItem(proyekId: number, itemId: number, payload: { checked?: boolean; note?: string }) {
    return request<{ message: string; data: QcItemResponse }>('PATCH', `/proyeks/${proyekId}/qc/items/${itemId}`, payload as unknown as Record<string, unknown>)
  },
}

// ─── Proyek Invoice ───────────────────────────────────────────────────────────
export type InvoiceTipe = 'DP' | 'Termin' | 'Pelunasan' | 'Sewa' | 'Sewa Bulanan' | 'Lainnya'
export type InvoiceStatus = 'Draft' | 'Terkirim' | 'Lunas' | 'Jatuh Tempo'

export interface ProyekInvoiceItem {
  id?: number
  nama: string
  satuan: string
  qty: number
  hargaSatuan: number
  harga_satuan: number
  diskon: number
  line_total?: number
}

export interface ProyekInvoiceResponse {
  id: number
  proyek_id: number
  nomorInvoice: string
  nomor_invoice: string
  tanggal: string
  jatuhTempo: string | null
  jatuh_tempo: string | null
  perihal: string | null
  catatan: string | null
  ppn: number
  tipe: InvoiceTipe
  nomorTermin: number | null
  nomor_termin: number | null
  status: InvoiceStatus
  subtotal: number
  total_harga: number
  items: ProyekInvoiceItem[]
  pembayaran?: {
    id: number
    nomor_pembayaran: string | null
    tanggal_bayar: string | null
    nominal: number
    metode_pembayaran: string
    catatan: string | null
    transaction_id: number | null
    masuk_pembukuan: boolean
  } | null
}

export const proyekInvoicesApi = {
  list(proyekId: number) {
    return request<{ data: ProyekInvoiceResponse[] }>('GET', `/proyeks/${proyekId}/invoices`)
  },
  show(proyekId: number, invoiceId: number) {
    return request<{ data: ProyekInvoiceResponse }>('GET', `/proyeks/${proyekId}/invoices/${invoiceId}`)
  },
  create(proyekId: number, payload: any) {
    return request<{ message: string; data: ProyekInvoiceResponse }>('POST', `/proyeks/${proyekId}/invoices`, payload)
  },
  update(proyekId: number, invoiceId: number, payload: any) {
    return request<{ message: string; data: ProyekInvoiceResponse }>('PUT', `/proyeks/${proyekId}/invoices/${invoiceId}`, payload)
  },
  updateStatus(proyekId: number, invoiceId: number, status: InvoiceStatus, paymentData?: { tanggal_bayar?: string; nominal?: number; metode_pembayaran?: string; catatan?: string; masuk_pembukuan?: boolean }) {
    return request<{ message: string; data: ProyekInvoiceResponse }>('PATCH', `/proyeks/${proyekId}/invoices/${invoiceId}/status`, { status, ...paymentData })
  },
  bayar(proyekId: number, invoiceId: number, payload: { tanggal_bayar: string; nominal: number; metode_pembayaran: string; catatan?: string; masuk_pembukuan?: boolean }) {
    return request<{ message: string; data: ProyekInvoiceResponse; pembayaran: any }>('POST', `/proyeks/${proyekId}/invoices/${invoiceId}/bayar`, payload)
  },
  delete(proyekId: number, invoiceId: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${proyekId}/invoices/${invoiceId}`)
  },
}

// ─── Proyek Pembayaran & Jadwal Sewa ─────────────────────────────────────────
export interface ProyekPembayaranResponse {
  id: number
  proyek_id: number
  proyek_invoice_id: number | null
  nomor_invoice?: string | null
  transaction_id: number | null
  nomor_pembayaran: string | null
  bulan_ke: number | null
  periode_bulan: string | null
  tanggal_bayar: string
  nominal: number
  nominal_format: string
  metode_pembayaran: string
  catatan: string | null
  bukti_bayar: string | null
  masuk_pembukuan: boolean
  created_by: string
  created_at: string
}

export interface SewaJadwalItem {
  bulan_ke: number
  periode_bulan: string
  tanggal_periode: string
  tanggal_jatuh_tempo: string
  nominal_tagihan: number
  nominal_tagihan_format: string
  status: 'Lunas' | 'Jatuh Tempo' | 'Menunggu Bayar' | 'Belum Dibayar'
  is_paid: boolean
  is_overdue: boolean
  pembayaran: ProyekPembayaranResponse | null
  invoice: {
    id: number
    nomor_invoice: string
    status: string
    total_harga: number
  } | null
}

export interface SewaJadwalSummary {
  total_nilai_kontrak: number
  total_nilai_kontrak_format: string
  total_sudah_dibayar: number
  total_sudah_dibayar_format: string
  sisa_tagihan: number
  sisa_tagihan_format: string
  total_bulan: number
  bulan_terbayar: number
  bulan_sisa: number
  persen_terbayar: number
}

export interface SewaJadwalResponse {
  jadwal: SewaJadwalItem[]
  summary: SewaJadwalSummary
  proyek: {
    id: number
    kode: string
    nama: string
    sewa_mulai: string | null
    sewa_selesai: string | null
    sewa_durasi_bulan: number
    skema_pembayaran: string | null
    status_sewa: string | null
  }
}

export const proyekPembayaransApi = {
  list(proyekId: number) {
    return request<{ data: ProyekPembayaranResponse[]; total_dibayar: number }>('GET', `/proyeks/${proyekId}/pembayarans`)
  },
  sewaJadwal(proyekId: number) {
    return request<{ data: SewaJadwalResponse }>('GET', `/proyeks/${proyekId}/sewa-jadwal`)
  },
  create(proyekId: number, payload: Partial<ProyekPembayaranResponse> | FormData) {
    return request<{ message: string; data: ProyekPembayaranResponse }>('POST', `/proyeks/${proyekId}/pembayarans`, payload as any)
  },
  update(proyekId: number, pembayaranId: number, payload: Partial<ProyekPembayaranResponse>) {
    return request<{ message: string; data: ProyekPembayaranResponse }>('PUT', `/proyeks/${proyekId}/pembayarans/${pembayaranId}`, payload as any)
  },
  delete(proyekId: number, pembayaranId: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${proyekId}/pembayarans/${pembayaranId}`)
  },
}

// ─── Fee Tim ──────────────────────────────────────────────────────────────────
export type TipeKaryawan = 'Karyawan Tetap' | 'Freelance'
export type StatusBayar = 'Belum Dibayar' | 'Sebagian' | 'Lunas'

export interface FeeRiwayatResponse {
  id: number
  tanggal: string
  nominal: number
  metode: string | null
  keterangan: string | null
  bukti: string | null
}

export interface ProyekFeeTimResponse {
  id: number
  proyek_id: number
  user_id: number | null
  nama: string
  tipe: TipeKaryawan
  role: string | null
  noRekening: string | null
  no_rekening: string | null
  namaBank: string | null
  nama_bank: string | null
  feeTotal: number
  fee_total: number
  feeDibayar: number
  fee_dibayar: number
  statusBayar: StatusBayar
  status_bayar: StatusBayar
  metodeBayar: string | null
  tanggalBayar: string | null
  keterangan: string | null
  buktiBayar: string | null
  riwayat: FeeRiwayatResponse[]
}

export const proyekFeeTimApi = {
  list(proyekId: number) {
    return request<{ data: ProyekFeeTimResponse[] }>('GET', `/proyeks/${proyekId}/fee-tim`)
  },
  create(proyekId: number, payload: any) {
    return request<{ message: string; data: ProyekFeeTimResponse }>('POST', `/proyeks/${proyekId}/fee-tim`, payload)
  },
  update(proyekId: number, feeId: number, payload: any) {
    return request<{ message: string; data: ProyekFeeTimResponse }>('PUT', `/proyeks/${proyekId}/fee-tim/${feeId}`, payload)
  },
  addRiwayat(proyekId: number, feeId: number, payload: { tanggal: string; nominal: number; metode?: string; keterangan?: string; bukti?: string }) {
    return request<{ message: string; data: ProyekFeeTimResponse }>('POST', `/proyeks/${proyekId}/fee-tim/${feeId}/riwayat`, payload as unknown as Record<string, unknown>)
  },
  delete(proyekId: number, feeId: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${proyekId}/fee-tim/${feeId}`)
  },
}

// ─── Biaya Lain ───────────────────────────────────────────────────────────────
export type KategoriBiaya =
  | 'BBM / Transportasi' | 'Konsumsi / Makan' | 'Alat & Perkakas'
  | 'Bahan Pendukung' | 'Pengiriman / Ekspedisi' | 'Parkir & Tol'
  | 'Komunikasi' | 'Lain-lain'
export type StatusBiayaLain = 'Belum Direimburse' | 'Sudah Direimburse'

export interface ProyekBiayaLainResponse {
  id: number
  proyek_id: number
  tanggal: string
  nama: string
  kategori: KategoriBiaya
  nominal: number
  dibayarOleh: string | null
  dibayar_oleh: string | null
  status: StatusBiayaLain
  keterangan: string | null
  bukti: string | null
  buktiTipe: 'image' | 'pdf' | null
  bukti_tipe: 'image' | 'pdf' | null
}

export const proyekBiayaLainApi = {
  list(proyekId: number) {
    return request<{ data: ProyekBiayaLainResponse[]; total: number }>('GET', `/proyeks/${proyekId}/biaya-lain`)
  },
  create(proyekId: number, payload: any) {
    return request<{ message: string; data: ProyekBiayaLainResponse }>('POST', `/proyeks/${proyekId}/biaya-lain`, payload)
  },
  update(proyekId: number, biayaId: number, payload: any) {
    return request<{ message: string; data: ProyekBiayaLainResponse }>('PUT', `/proyeks/${proyekId}/biaya-lain/${biayaId}`, payload)
  },
  updateStatus(proyekId: number, biayaId: number, status: StatusBiayaLain) {
    return request<{ message: string; data: ProyekBiayaLainResponse }>('PATCH', `/proyeks/${proyekId}/biaya-lain/${biayaId}/status`, { status })
  },
  delete(proyekId: number, biayaId: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${proyekId}/biaya-lain/${biayaId}`)
  },
}

// ─── Procurement ──────────────────────────────────────────────────────────────
export type KategoriProcurement = 'Hardware' | 'Kabel' | 'Aksesoris' | 'Tools' | 'Lainnya'
export type StatusProcurement = 'Pending' | 'Disetujui' | 'Dipesan' | 'Diterima' | 'Dibatalkan'

export interface ProyekProcurementResponse {
  id: number
  proyek_id: number
  namaItem: string
  nama_item: string
  kategori: KategoriProcurement
  qty: number
  satuan: string
  hargaSatuan: number
  harga_satuan: number
  total: number
  supplier: string | null
  tanggalRequest: string
  tanggal_request: string
  tanggalDiterima: string | null
  tanggal_diterima: string | null
  status: StatusProcurement
  catatan: string | null
  requestBy: string | null
  request_by: string | null
  buktiTransfer: string | null
  buktiDiterima: string | null
}

export const proyekProcurementApi = {
  list(proyekId: number) {
    return request<{ data: ProyekProcurementResponse[]; total: number }>('GET', `/proyeks/${proyekId}/procurement`)
  },
  create(proyekId: number, payload: any) {
    return request<{ message: string; data: ProyekProcurementResponse }>('POST', `/proyeks/${proyekId}/procurement`, payload)
  },
  update(proyekId: number, itemId: number, payload: any) {
    return request<{ message: string; data: ProyekProcurementResponse }>('PUT', `/proyeks/${proyekId}/procurement/${itemId}`, payload)
  },
  updateStatus(proyekId: number, itemId: number, status: StatusProcurement) {
    return request<{ message: string; data: ProyekProcurementResponse }>('PATCH', `/proyeks/${proyekId}/procurement/${itemId}/status`, { status })
  },
  delete(proyekId: number, itemId: number) {
    return request<{ message: string }>('DELETE', `/proyeks/${proyekId}/procurement/${itemId}`)
  },
}



// ── Proyek Serah Terima ───────────────────────────────────────────────────
export interface STChecklist {
  id?: number
  text: string
  status: 'OK' | 'OK dengan Catatan' | 'Tidak OK' | null
  catatan?: string | null
}

export interface STEquipment {
  id?: number
  nama_item: string
  qty: number
  unit: string
  sn?: string | null
  kondisi: 'Baik' | 'Baik dengan Catatan' | 'Rusak' | 'Tidak Ada'
  catatan?: string | null
}

export interface STDocument {
  id: number
  nama_dokumen: string
  file_url: string
  created_at: string
}

export interface STPhoto {
  id: number
  kategori: 'Sebelum Pekerjaan' | 'Saat Pekerjaan' | 'Setelah Pekerjaan'
  file_url: string
  caption?: string | null
  created_at: string
}

export interface STPunchList {
  id?: number
  temuan: string
  pic?: string | null
  deadline?: string | null
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
  catatan?: string | null
}

export interface ProyekSerahTerimaResponse {
  id: number
  proyek_id: number
  nomor_bast: string | null
  tanggal: string | null
  waktu: string | null
  pic_pws_id: number | null
  pic_client_nama: string | null
  pic_client_jabatan: string | null
  status: string
  hasil_pekerjaan: string | null
  catatan_serah_terima: string | null
  ttd_pws: string | null
  ttd_client: string | null
  ttd_pws_tgl: string | null
  ttd_client_tgl: string | null
  checklists: STChecklist[]
  equipments: STEquipment[]
  documents: STDocument[]
  photos: STPhoto[]
  punch_lists: STPunchList[]
}

export const proyekSerahTerimaApi = {
  get(proyekId: number) {
    return request<{ data: ProyekSerahTerimaResponse }>('GET', `/proyeks/${proyekId}/serah-terima`)
  },
  update(proyekId: number, payload: Partial<ProyekSerahTerimaResponse>) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('PUT', `/proyeks/${proyekId}/serah-terima`, payload as Record<string, unknown>)
  },
  updateChecklists(proyekId: number, checklists: STChecklist[]) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('PUT', `/proyeks/${proyekId}/serah-terima/checklists`, { checklists })
  },
  updateEquipments(proyekId: number, equipments: STEquipment[]) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('PUT', `/proyeks/${proyekId}/serah-terima/equipments`, { equipments })
  },
  updatePunchLists(proyekId: number, punch_lists: STPunchList[]) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('PUT', `/proyeks/${proyekId}/serah-terima/punch-lists`, { punch_lists })
  },
  uploadDocument(proyekId: number, formData: FormData) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('POST', `/proyeks/${proyekId}/serah-terima/documents`, formData)
  },
  deleteDocument(proyekId: number, docId: number) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('DELETE', `/proyeks/${proyekId}/serah-terima/documents/${docId}`)
  },
  uploadPhoto(proyekId: number, formData: FormData) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('POST', `/proyeks/${proyekId}/serah-terima/photos`, formData)
  },
  deletePhoto(proyekId: number, photoId: number) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('DELETE', `/proyeks/${proyekId}/serah-terima/photos/${photoId}`)
  },
  saveSignatures(proyekId: number, payload: { ttd_pws?: string; ttd_client?: string }) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('POST', `/proyeks/${proyekId}/serah-terima/signatures`, payload)
  },
  complete(proyekId: number) {
    return request<{ message: string; data: ProyekSerahTerimaResponse }>('POST', `/proyeks/${proyekId}/serah-terima/complete`)
  }
}

// ─── Document Numbering API ───────────────────────────────────────────────────
export const documentNumberingApi = {
  list: async (): Promise<DocumentNumbering[]> => {
    return request<DocumentNumbering[]>('GET', '/document-numberings')
  },
  create: async (data: any): Promise<DocumentNumbering> => {
    return request<DocumentNumbering>('POST', '/document-numberings', data)
  },
  update: async (id: number, data: any): Promise<DocumentNumbering> => {
    return request<DocumentNumbering>('PUT', `/document-numberings/${id}`, data)
  },
  delete: async (id: number): Promise<void> => {
    return request<void>('DELETE', `/document-numberings/${id}`)
  }
}

// ─── PDF Settings API ─────────────────────────────────────────────────────────
export interface PenawaranPdfSettings {
  pageSize: string
  orientation: string
  showHeader: boolean
  showHeaderImage: boolean
  headerTitle: string
  headerSubtitle: string
  headerImage: string
  headerImageHeight: number
  showFooter: boolean
  showFooterImage: boolean
  footerText: string
  footerImage: string
  footerImageHeight: number
  showWatermark: boolean
  showWatermarkImage: boolean
  watermarkText: string
  watermarkImage: string
  documentIntro: string
  showScopeOfWork: boolean
  scopeOfWork: string
  showTerms: boolean
  termsText: string
  showSignature: boolean
  signatureName: string
  signatureTitle: string
  signatureImage: string
  marginTop: number
  marginRight: number
  marginBottom: number
  marginLeft: number
  fontSize: number
}

export function getStorageUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url
  const base = BASE_URL.replace(/\/api\/?$/, '')
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

export const pdfSettingsApi = {
  getPenawaranPdf: async (): Promise<{ success: boolean; data: Partial<PenawaranPdfSettings> | null }> => {
    return request<{ success: boolean; data: Partial<PenawaranPdfSettings> | null }>('GET', '/settings/penawaran-pdf')
  },
  savePenawaranPdf: async (data: Partial<PenawaranPdfSettings>): Promise<{ success: boolean; message: string; data: PenawaranPdfSettings }> => {
    return request<{ success: boolean; message: string; data: PenawaranPdfSettings }>('POST', '/settings/penawaran-pdf', data as Record<string, unknown>)
  },
  uploadImage: async (file: File, type: 'headerImage' | 'footerImage' | 'watermarkImage' | 'signatureImage'): Promise<{ success: boolean; message: string; url: string; path: string; type: string; data: PenawaranPdfSettings }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    return request<{ success: boolean; message: string; url: string; path: string; type: string; data: PenawaranPdfSettings }>('POST', '/settings/penawaran-pdf/upload-image', formData)
  },
  deleteImage: async (type: 'headerImage' | 'footerImage' | 'watermarkImage' | 'signatureImage'): Promise<{ success: boolean; message: string; type: string; data: PenawaranPdfSettings }> => {
    return request<{ success: boolean; message: string; type: string; data: PenawaranPdfSettings }>('DELETE', '/settings/penawaran-pdf/image', { type })
  }
}
