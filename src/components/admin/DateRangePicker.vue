<script setup lang="ts">
/**
 * Date Range Picker modern (rentang tanggal) — tanpa dependensi eksternal.
 *
 *Pola: pilih tanggal awal → klik tanggal akhir → langsung emits.
 * Mendukung preset cepat, navigasi 2 bulan, dan pratinjau sorotan rentang.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from '@lucide/vue'

export interface DateRange {
  start: string | null
  end: string | null
}

const props = withDefaults(
  defineProps<{
    modelValue?: DateRange | null
    placeholder?: string
  }>(),
  {
    modelValue: () => ({ start: null, end: null }),
    placeholder: 'Pilih Rentang Tanggal',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
  'change': [value: DateRange]
}>()

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

// Tanggal pilihan (sinkron dengan prop, bisa diubah sebelum selesai)
const start = ref<string | null>(props.modelValue?.start ?? null)
const end = ref<string | null>(props.modelValue?.end ?? null)
const hover = ref<string | null>(null)

// Bulan yang ditampilkan (kiri) + bulan berikutnya (kanan)
const viewMonth = ref<Date>(startOfMonth(new Date()))

interface CalendarCell {
  iso: string
  day: number
  inMonth: boolean
}

function toIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

/**
 * Grid kalender 7 kolom (Sen–Min). Sel di luar bulan tetap ditampilkan
 * agar jarak antar bulan tetap konsisten.
 */
function buildMonth(base: Date): CalendarCell[] {
  const year = base.getFullYear()
  const month = base.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const total = Math.ceil((offset + daysInMonth) / 7) * 7

  const cells: CalendarCell[] = []
  for (let i = 0; i < total; i++) {
    const date = new Date(year, month, 1 - offset + i)
    cells.push({ iso: toIso(date), day: date.getDate(), inMonth: date.getMonth() === month })
  }
  return cells
}

const leftCells = computed(() => buildMonth(viewMonth.value))
const rightCells = computed(() => buildMonth(addMonths(viewMonth.value, 1)))

const monthTitle = computed(() => {
  const l = viewMonth.value
  const r = addMonths(l, 1)
  return l.getFullYear() === r.getFullYear()
    ? `${BULAN[l.getMonth()]} – ${BULAN[r.getMonth()]} ${l.getFullYear()}`
    : `${BULAN[l.getMonth()]} ${l.getFullYear()} – ${BULAN[r.getMonth()]} ${r.getFullYear()}`
})

const triggerLabel = computed(() => {
  if (start.value && end.value) return `${formatShort(start.value)} – ${formatShort(end.value)}`
  if (start.value) return `${formatShort(start.value)} – …`
  return props.placeholder
})

function formatShort(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso

  const year = parts[0] ?? ''
  const month = BULAN[parseInt(parts[1] ?? '1', 10) - 1] ?? ''
  const day = parts[2] ?? ''
  if (!year || !month || !day) return iso

  return `${parseInt(day, 10)} ${month.slice(0, 3)} ${year}`
}

function isSelected(iso: string): boolean {
  return iso === start.value || iso === end.value
}

function isInRange(iso: string): boolean {
  if (start.value && end.value) return iso > start.value && iso < end.value
  if (start.value && hover.value && !end.value) return iso > start.value && iso < hover.value
  return false
}

function isEdge(iso: string): boolean {
  return iso === start.value || iso === end.value
}

function onDayClick(cell: CalendarCell) {
  if (!cell.inMonth) {
    // Klik sel bulan lain → lompat ke bulan tersebut
    const parts = cell.iso.split('-')
    viewMonth.value = new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
  }

  if (!start.value || (start.value && end.value)) {
    start.value = cell.iso
    end.value = null
    return
  }

  if (cell.iso < start.value) {
    start.value = cell.iso
    return
  }

  end.value = cell.iso
  emitChange()
}

function emitChange() {
  const value: DateRange = { start: start.value, end: end.value }
  emit('update:modelValue', value)
  emit('change', value)
}

const presets = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const iso = (d: Date) => toIso(d)
  const lastDay = new Date(y, m + 1, 0).getDate()

  return [
    { label: '7 Hari', start: iso(new Date(y, m, lastDay - 6)), end: iso(now) },
    { label: '30 Hari', start: iso(new Date(y, m, Math.max(1, lastDay - 29))), end: iso(now) },
    { label: 'Bulan Ini', start: iso(new Date(y, m, 1)), end: iso(new Date(y, m, lastDay)) },
    { label: 'Bulan Lalu', start: iso(new Date(y, m - 1, 1)), end: iso(new Date(y, m, 0)) },
    {
      label: 'Semester Ini',
      start: iso(m <= 5 ? new Date(y, 0, 1) : new Date(y, 6, 1)),
      end: iso(m <= 5 ? new Date(y, 5, 30) : new Date(y, 11, 31)),
    },
    { label: 'Tahun Ini', start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) },
  ]
})

function applyPreset(preset: { start: string; end: string }) {
  start.value = preset.start
  end.value = preset.end
  viewMonth.value = startOfMonth(new Date(`${preset.start}T00:00:00`))
  emitChange()
}

function clearSelection() {
  start.value = null
  end.value = null
  hover.value = null
  emitChange()
}

function toggle() {
  open.value = !open.value
}

function shift(amount: number) {
  viewMonth.value = addMonths(viewMonth.value, amount)
}

function onDocumentClick(e: MouseEvent) {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="drp" ref="rootEl">
    <button
      type="button"
      class="drp-trigger"
      :class="{ active: start && end, open }"
      @click.stop="toggle"
    >
      <CalendarDays :size="14" />
      <span class="drp-trigger-label">{{ triggerLabel }}</span>
      <ChevronDown :size="14" class="drp-trigger-chevron" :class="{ open }" />
    </button>

    <div v-if="open" class="drp-popover" @click.stop>
      <div class="drp-head">
        <button type="button" class="drp-nav" title="Sebelumnya" @click="shift(-1)">
          <ChevronLeft :size="15" />
        </button>
        <div class="drp-title">{{ monthTitle }}</div>
        <button type="button" class="drp-nav" title="Berikutnya" @click="shift(1)">
          <ChevronRight :size="15" />
        </button>
      </div>

      <div class="drp-calendars">
        <div v-for="(cells, idx) in [leftCells, rightCells]" :key="idx" class="drp-calendar">
          <div class="drp-weekdays">
            <span v-for="h in HARI" :key="h">{{ h }}</span>
          </div>
          <div class="drp-grid">
            <button
              v-for="cell in cells"
              :key="cell.iso"
              type="button"
              class="drp-day"
              :class="{
                'outside': !cell.inMonth,
                'selected': isSelected(cell.iso),
                'in-range': isInRange(cell.iso),
                'range-start': isEdge(cell.iso) && cell.iso === start,
                'range-end': isEdge(cell.iso) && cell.iso === end,
              }"
              @mouseenter="hover = cell.iso"
              @mouseleave="hover = null"
              @click="onDayClick(cell)"
            >
              {{ cell.day }}
            </button>
          </div>
        </div>
      </div>

      <div class="drp-footer">
        <div class="drp-presets">
          <button
            v-for="p in presets"
            :key="p.label"
            type="button"
            class="drp-preset"
            @click="applyPreset(p)"
          >
            {{ p.label }}
          </button>
        </div>
        <button type="button" class="drp-clear" @click="clearSelection">Reset</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drp {
  position: relative;
  display: inline-flex;
}

.drp-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-base);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.drp-trigger:hover {
  border-color: var(--accent-blue);
  color: var(--text-primary);
}

.drp-trigger.active {
  color: var(--accent-blue);
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.1);
}

.drp-trigger.open {
  border-color: var(--accent-blue);
  color: var(--text-primary);
}

.drp-trigger-label {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drp-trigger-chevron {
  transition: transform 0.18s ease;
}

.drp-trigger-chevron.open {
  transform: rotate(180deg);
}

/* ── Popover ─────────────────────────────────────────────────────────────── */
.drp-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1400;
  width: max-content;
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  animation: drp-in 0.14s ease;
}

@keyframes drp-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.drp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.drp-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.drp-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.16s ease;
}

.drp-nav:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.drp-calendars {
  display: flex;
  gap: 18px;
}

.drp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}

.drp-weekdays span {
  text-align: center;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-muted);
  padding-bottom: 4px;
}

.drp-grid {
  display: grid;
  grid-template-columns: repeat(7, 30px);
  grid-auto-rows: 30px;
  gap: 2px;
}

.drp-day {
  position: relative;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 12px;
  font-family: 'Inter', sans-serif;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;
}

.drp-day:hover {
  background: rgba(255, 255, 255, 0.08);
}

.drp-day.outside {
  color: var(--text-muted);
  opacity: 0.45;
}

.drp-day.in-range {
  background: rgba(59, 130, 246, 0.16);
  border-radius: 0;
}

.drp-day.selected {
  background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
  color: #fff;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(59, 130, 246, 0.35);
}

.drp-day.range-start {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

.drp-day.range-end {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

/* ── Footer ──────────────────────────────────────────────────────────────── */
.drp-footer {
  display: flex;
  align-items: center;
  justify-content: between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.drp-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.drp-preset {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.16s ease;
}

.drp-preset:hover {
  color: var(--accent-blue);
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.1);
}

.drp-clear {
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
}

.drp-clear:hover {
  color: var(--accent-red);
}

@media (max-width: 640px) {
  .drp-calendars {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
