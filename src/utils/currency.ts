/**
 * Indonesian Rupiah Currency Formatter
 * 
 * Mengacu pada kaidah standar penulisan keuangan Indonesia (PUEBI/EYD):
 * Format lengkap: "Rp113.487.498"
 * Menggunakan pemisah ribuan titik (.)
 */

export interface FormatRupiahOptions {
  /**
   * Tambahkan spasi antara Rp dan angka (cth: "Rp 113.487.498")
   * Default: false (menghasilkan "Rp113.487.498" sesuai standar penulisan Rupiah resmi)
   */
  withSpace?: boolean
  /**
   * Sertakan awalan "Rp"
   * Default: true
   */
  withPrefix?: boolean
  /**
   * Fallback jika nilai null / undefined / NaN / kosong
   * Default: 'Rp0' (jika withPrefix=true) atau '0' (jika withPrefix=false)
   */
  fallback?: string
  /**
   * Format tanda minus jika nilai negatif:
   * 'prefix' -> "-Rp113.487.498"
   * 'paren'  -> "(Rp113.487.498)"
   * Default: 'prefix'
   */
  negativeFormat?: 'prefix' | 'paren'
}

/**
 * Format angka atau string angka ke format Rupiah lengkap Indonesia:
 * Contoh: 113487498 -> "Rp113.487.498"
 * Contoh: "113487498" -> "Rp113.487.498"
 * Contoh: -50000 -> "-Rp50.000"
 */
export function formatRupiah(
  val: number | string | null | undefined,
  options: FormatRupiahOptions = {}
): string {
  const {
    withSpace = false,
    withPrefix = true,
    fallback,
    negativeFormat = 'prefix',
  } = options

  const defaultFallback = fallback !== undefined 
    ? fallback 
    : (withPrefix ? `Rp${withSpace ? ' ' : ''}0` : '0')

  if (val === null || val === undefined || val === '') {
    return defaultFallback
  }

  // Handle number or numeric string safely
  let num: number
  if (typeof val === 'number') {
    num = val
  } else {
    // If it's a string, strip any non-digit chars except minus and period
    const cleaned = String(val).trim().replace(/[^0-9.-]/g, '')
    num = Number(cleaned)
  }

  if (Number.isNaN(num)) {
    return defaultFallback
  }

  const isNegative = num < 0
  const absRounded = Math.round(Math.abs(num))
  const formattedAbs = absRounded.toLocaleString('id-ID')

  const prefix = withPrefix ? `Rp${withSpace ? ' ' : ''}` : ''

  if (isNegative) {
    if (negativeFormat === 'paren') {
      return `(${prefix}${formattedAbs})`
    }
    return `-${prefix}${formattedAbs}`
  }

  return `${prefix}${formattedAbs}`
}

/**
 * Shorthand alias untuk formatRupiah default: "Rp113.487.498"
 */
export function formatRp(
  val: number | string | null | undefined,
  withSpace = false
): string {
  return formatRupiah(val, { withSpace })
}

/**
 * Format Rupiah dengan spasi: "Rp 113.487.498"
 */
export function formatRpSpaced(val: number | string | null | undefined): string {
  return formatRupiah(val, { withSpace: true })
}

/**
 * Format Rupiah singkat untuk grafik, label sempit, dll:
 * Menggunakan format Indonesia (koma untuk pecahan desimal).
 * Contoh: 113487498 -> "Rp113,5 Jt"
 * Contoh: 1500000000 -> "Rp1,5M"
 */
export function formatRupiahShort(
  val: number | string | null | undefined,
  options: { withSpace?: boolean } = {}
): string {
  const { withSpace = false } = options
  const prefix = `Rp${withSpace ? ' ' : ''}`

  if (val === null || val === undefined || val === '') return `${prefix}0`

  const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9.-]/g, ''))
  if (Number.isNaN(num)) return `${prefix}0`

  const isNeg = num < 0
  const abs = Math.abs(num)
  const sign = isNeg ? '-' : ''

  if (abs >= 1_000_000_000) {
    const formatted = (abs / 1_000_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })
    return `${sign}${prefix}${formatted}M`
  }

  if (abs >= 1_000_000) {
    const formatted = (abs / 1_000_000).toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })
    return `${sign}${prefix}${formatted} Jt`
  }

  return `${sign}${prefix}${Math.round(abs).toLocaleString('id-ID')}`
}

/**
 * Parse string nominal (e.g. "Rp 113.487.498" atau "113.487.498") ke integer murni
 */
export function parseRupiah(val: string | number | null | undefined): number {
  if (typeof val === 'number') return Math.round(val)
  if (!val) return 0
  const cleaned = String(val).replace(/[^0-9-]/g, '')
  const parsed = parseInt(cleaned, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}
