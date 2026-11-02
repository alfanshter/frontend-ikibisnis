# AGENTS.md — Frontend Ikibisnis

> Turunan dari `../AGENTS.md`. **Baca `../AGENTS.md` terlebih dahulu** — aturan di sana berlaku penuh.
> File ini berisi aturan **spesifik frontend** yang lebih detail.

## Stack (WAJIB pakai yang sudah ada, jangan ganti library tanpa alasan)
Vue 3.5 (`<script setup>` + Composition API) · TypeScript 6 · Pinia 3 · Vue Router 5 · Vite 8 ·
`@lucide/vue` (ikon) · `vue-toastification` (toast) · `chart.js` + `vue-chartjs` (grafik) ·
`jspdf` + `jspdf-autotable` (PDF) · `xlsx` (Excel) · Vitest + `@vue/test-utils` (testing).

---

## 1. Pemetaan Layer (arsitektur wajib)

```
View (.vue)  ──►  Pinia Store  ──►  services/api.ts  ──►  Backend API
   │                                      (SATU-SATUNYA HTTP)
   └── utils/ (helper murni, tanpa efek samping)
```

Aturan tegas:

1. **`services/api.ts` adalah satu-satunya file yang boleh melakukan HTTP.** Tidak ada `fetch`/`axios` di `.vue`, store, atau util.
2. **View tidak boleh memanggil API langsung.** View memanggil action store, lalu membaca state store.
3. **Store tidak boleh tahu bentuk HTML.** Store hanya menangani data, loading, error.
4. **Utils tidak boleh melakukan I/O jaringan.** `utils/` = fungsi murni (currency, whatsapp, format).

---

## 2. Aturan Folder

| Lokasi | Isi | Penamaan |
|---|---|---|
| `src/views/` | Halaman | `PascalCase` + suffix `View.vue` (mis. `ProyekView.vue`, `DetailProyekView.vue`) |
| `src/views/admin/` | Halaman area admin | `PascalCase` + suffix `View.vue` |
| `src/components/` | Komponen reusable | `PascalCase.vue` (`SignaturePad.vue`) |
| `src/components/admin/` | Komponen khusus area admin | `PascalCase.vue` |
| `src/layouts/` | Layout | `PascalCase.vue` (`AdminLayout.vue`) |
| `src/stores/` | Pinia store | `camelCase.ts` (`auth.ts`, `penawaran.ts`) |
| `src/services/` | Layer API | `api.ts` (single file; pecah ke `api/<modul>.ts` bila > 800 baris) |
| `src/utils/` | Helper murni | `camelCase.ts` |
| `src/router/` | Route | `index.ts` |
| `src/__tests__/` | Unit test | `*.spec.ts` |

- Komponen yang dipakai di ≥2 halaman → wajib diekstrak ke `components/`.
- Jangan menaruh komponen view-scope di `components/` root jika hanya dipakai 1 view.

---

## 3. Penamaan & Gaya Kode

- **TypeScript strict** aktif (`noUncheckedIndexedAccess: true`). Dilarang menambah `any` baru.
- Type alias untuk union/enum: `export type StatusProyek = 'Belum Dimulai' | ...` (bukan `enum`).
- Interface response: `XxxResponse`, payload kirim: `XxxPayload`, meta: `XxxMeta`.
- Nama fungsi: **camelCase**; komponen & class: **PascalCase**.
- Event handler: `handleXxx` / `onXxx` / `openXxx` / `submitXxx`.
- Konstanta: `UPPER_SNAKE_CASE` (const PAGE_SIZE = 15).
- **Tanpa semicolon** di akhir statement (Prettier: `semi: false`).
- **Single quote**, indent 2 spaces, print width 100 (`.prettierrc.json` + `.editorconfig`).
- Urutan import: `vue` → library pihak ketiga → `@/...` → komponen lokal.
- Komentar berbahasa Indonesia, menjelaskan *kenapa*.
- Garis pemisah seksi: `// ─── Nama Seksi ─────` (mengikuti pola repo).

---

## 4. Aturan Store (Pinia)

Gunakan **setup-style store** (bukan options-style) — konsisten dengan repo:

```ts
export const useXxxStore = defineStore('xxx', () => {
  const items = ref<XxxResponse[]>([])
  const meta = ref<XxxMeta>({ total: 0, current_page: 1, last_page: 1 })
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchItems(params?: XxxParams) {
    loading.value = true
    error.value = null
    try {
      const res = await xxxApi.list(params)
      items.value = res.data
      meta.value = res.meta
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Gagal memuat data.'
    } finally {
      loading.value = false
    }
  }

  return { items, meta, loading, error, fetchItems }
})
```

- Satu store per modul domain (`stores/proyek.ts`, `stores/lead.ts`, …). Jangan campur domain berbeda dalam 1 store.
- Setiap action async wajib punya `loading` + `error` dan selalu `finally` untuk reset loading.
- Pesan error dalam Bahasa Indonesia.
- Store **tidak** menyimpan data turunan yang bisa dihitung → pakai `computed` di view.
- Setelah mutasi, update array lokal (bukan refetch penuh) bila server sudah mengembalikan data terbaru.
- Store `auth` adalah **pemilik tunggal** token: `localStorage.getItem('auth_token')` / `setItem` / `removeItem` **hanya** di `stores/auth.ts`.

---

## 5. Aturan Layer API (`services/api.ts`)

- Helper `request<T>(method, path, body)` sudah tersedia — gunakan, jangan tulis ulang.
- **`BASE_URL` hanya boleh diubah di satu tempat** (bagian atas `api.ts`). Jika butuh dev/prod, gunakan `import.meta.env.VITE_API_URL` dengan fallback lokal.
- Setiap modul API diekspor sebagai objek: `export const proyeksApi = { list, show, create, update, remove }`.
- **Tipe response didefinisikan berdampingan** dengan fungsi API-nya di file yang sama.
- Saat menambah field baru di backend → **wajib** menambah/memperbarui interface TS-nya.
- Handling error sudah ada di layer ini (mengambil `message`/`errors` Laravel) → di view cukup pakai `err.message`.
- **Aset biner (gambar kop/footer/watermark/TTD) TIDAK boleh diambil dari link storage mentah.** Frontend & API berada di domain berbeda, dan file `public/storage` dilayani web server langsung (melewati middleware CORS) sehingga `fetch()`-nya diblokir browser. Ambil lewat endpoint API: `pdfSettingsApi.imageUrl(type)` → `GET /api/settings/penawaran-pdf/image/{type}`. Preview `<img>` tetap boleh memakai `getStorageUrl()`.

```ts
// Pola yang benar
export interface ProyekResponse { id: number; kode: string; nama: string; nilai: number }

export const proyeksApi = {
  list: (params?: { search?: string; status?: string }) =>
    request<{ data: ProyekResponse[]; meta: ProyekMeta }>('GET', '/proyeks', params),
  show: (id: number) => request<{ proyek: ProyekResponse }>('GET', `/proyeks/${id}`),
  create: (payload: ProyekPayload) => request<{ proyek: ProyekResponse }>('POST', '/proyeks', payload),
  update: (id: number, payload: Partial<ProyekPayload>) =>
    request<{ proyek: ProyekResponse }>('PUT', `/proyeks/${id}`, payload),
  remove: (id: number) => request<{ message: string }>('DELETE', `/proyeks/${id}`),
}
```

---

## 5.1 Komponen Reusable di `components/admin/`

| Komponen | Fungsi |
|---|---|
| `DateRangePicker.vue` | Date range picker kustom (tanpa library): pilih tanggal awal → tanggal akhir, plus preset cepat (7 Hari, 30 Hari, Bulan Ini, Bulan Lalu, Semester Ini, Tahun Ini). `v-model` berupa `{ start: string \| null, end: string \| null }`, emit `change` saat range selesai dipilih. |

- Komponen picker/filter **wajib reusable** (dipakai di >1 halaman → taruh di `components/admin/`), bukan ditulis ulang per view.
- Popup/popover wajib memakai `position: absolute/fixed` + `z-index` di atas modal lain, dan menutup saat klik di luar (`document.addEventListener('click', ...)` + `removeEventListener` di `onBeforeUnmount`).

## 5.2 Kontrak Filter Periode Laporan

Backend menerima parameter periode pada endpoint laporan/transaksi:

| Parameter | Nilai | Keterangan |
|---|---|---|
| `period` | `month` \| `semester` \| `year` \| `custom` | Preset periode (default `month`) |
| `month` | 1–12 | Bulan acuan (menentukan semester aktif) |
| `year` | tahun | Tahun acuan |
| `start_date` / `end_date` | `YYYY-MM-DD` | Rentang kustom; bila keduanya diisi, **mengENSEDEHKAN preset** `period` |

Response `current_period` selalu berisi: `period`, `label` (Indonesia), `start_date`, `end_date`, `total_masuk`, `total_keluar`, `saldo_bersih`.

Aturan frontend:
- Preset & rentang kustom **tidak boleh aktif bersamaan** → memilih preset membersihkan rentang, dan sebaliknya.
- Label periode & rentang tanggal **selalu diambil dari server** (`current_period.label`), dengan fallback lokal hanya saat data belum termuat.
- Judul grafik & sub-label kartu statistik wajib mengikuti periode aktif.

## 5.3 Library Berat WAJIB Lazy (on-demand)

Pustaka besar **dilarang di-import static** pada halaman yang tidak selalu memakai fiturnya:
`jspdf`, `jspdf-autotable`, `xlsx`, `chart.js`.

```ts
// ❌ import statis — membengkakkan bundle awal halaman
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

// ✅ type-only (dihapus saat build, nol biaya runtime) + dynamic import saat dipakai
import type jsPDF from 'jspdf'

const { default: JsPDF } = await import('jspdf')
const { autoTable } = await import('jspdf-autotable')
const XLSX = await import('xlsx')
```

Aturan:
- Dynamic import dilakukan **di dalam fungsi** yang membutuhkannya, bukan di top-level modul.
- Fungsi pemanggil wajib `async` dan **wajib ditangani error-nya** (`.catch()` / `try-catch`).
- Tipe yang dipakai pada anotasi fungsi (mis. `doc: jsPDF`) tetap di-import dengan `import type`.
- Setelah perubahan, `pnpm run build` **tidak boleh** memunculkan peringatan "chunks are larger than 500 kB".

## 6. Aturan View / Component

### Template & script
- Selalu `<script setup lang="ts">`.
- Halaman admin memakai `<AdminLayout>` (pola: `views/admin/ClientView.vue`).
- Data form disimpan dalam `const form = ref<XxxPayload>({ ... })` — **jangan** `reactive` (pola repo = `ref`).
- Computed filtering & pagination dihitung di view (`filteredItems`, `totalPages`, `paginatedItems`), bukan di store.
- `watch(search, ...)` me-reset `currentPage` ke 1.

### Toast
Pola repo: helper `toast` lokal di dalam view.

```ts
function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const t = useToast()
  t[type]({ message, position: 'top-right', timeout: 3000 })
}
```
- Pesan toast Bahasa Indonesia.
- Sukses → `'success'`, kegagalan → `'error'`, info → `'info'`.
- Jangan menampilkan toast sukses **dan** error sekaligus pada satu aksi.

### Permission (UI)
```ts
const auth = useAuthStore()
const canCreate = computed(() => auth.can('proyek', 'create'))
```
- Tombol create/edit/delete **wajib** di-disable/hide bila permission tidak dimiliki.
- Route-level permission ditangani router (§7).

### Styling
- Gunakan class utility yang sudah ada di `src/assets/admin.css`.
- Hindari `<style scoped>` besar; bila perlu, maksimal ~50 baris dan pakai variabel CSS yang ada.
- Ikon: dari `@lucide/vue` (nama komponen PascalCase).
- Format uang: gunakan `formatRupiah` dari `utils/currency.ts` — **dilarang** `toLocaleString` manual untuk Rupiah.
- Angka monetary dari backend yang sudah berformat (`*_format`) dipakai apa adanya.

---

## 7. Aturan Router

- Semua route baru didaftarkan di `src/router/index.ts`.
- Lazy-load component: `component: () => import('@/views/admin/XxxView.vue')`.
- `meta` wajib: `requiresAuth: true` untuk area admin, plus `permission: '<modul>'` bila applicable.
- `name` route wajib dan unik (camelCase tanpa spasi).
- Route dengan parameter dinamis: `/admin/proyek/:id` → `name: 'admin-proyek-detail'`.
- Route baru wajib punya penanganan permission — jangan andalkan router saja untuk keamanan (tetap cek di backend).

---

## 8. Testing (Vitest)

- Lokasi: `src/__tests__/*.spec.ts` (nama file `camelCase.spec.ts`).
- Minimal test untuk: `utils/` (fungsi murni), store (action + state), service (mock via `vi.mock`).
- Gunakan `mount()` dari `@vue/test-utils`.
- Assertion: `expect(...).toBe(...)` / `.toEqual(...)`.
- Test harus **deterministik** — tidak bergantung waktu nyata (`Date.now()`), random, atau network.

---

## 9. Perintah

```bash
pnpm install
pnpm run dev          # vite dev server
pnpm run type-check   # vue-tsc — WAJIB lulus
pnpm run lint         # eslint + oxlint (auto-fix)
pnpm run format       # prettier
pnpm run test:unit    # vitest
pnpm run build        # build produksi (output: dist/)
```

**Checklist sebelum menyatakan selesai:**
- [ ] `pnpm run type-check` tanpa error
- [ ] `pnpm run lint` tanpa error
- [ ] Tidak ada `console.log` / `debugger` tersisa
- [ ] Tidak ada `any` baru
- [ ] Type di `services/api.ts` sinkron dengan response backend
- [ ] Permission di UI sesuai `auth.can(...)`
