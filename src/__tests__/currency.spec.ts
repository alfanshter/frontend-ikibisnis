import { describe, it, expect } from 'vitest'
import { formatRupiah, formatRp, formatRpSpaced, formatRupiahShort, parseRupiah } from '../utils/currency'

describe('currency utils', () => {
  it('formats number to standard Indonesian Rupiah format', () => {
    expect(formatRp(113487498)).toBe('Rp113.487.498')
    expect(formatRp('113487498')).toBe('Rp113.487.498')
    expect(formatRp(0)).toBe('Rp0')
  })

  it('formats with space when requested', () => {
    expect(formatRpSpaced(113487498)).toBe('Rp 113.487.498')
  })

  it('handles negative numbers', () => {
    expect(formatRp(-50000)).toBe('-Rp50.000')
    expect(formatRupiah(-50000, { negativeFormat: 'paren' })).toBe('(Rp50.000)')
  })

  it('handles null, undefined, and empty string fallbacks', () => {
    expect(formatRp(null)).toBe('Rp0')
    expect(formatRp(undefined)).toBe('Rp0')
    expect(formatRp('')).toBe('Rp0')
    expect(formatRupiah(null, { fallback: '—' })).toBe('—')
  })

  it('parses formatted rupiah back to number', () => {
    expect(parseRupiah('Rp113.487.498')).toBe(113487498)
    expect(parseRupiah('Rp 113.487.498')).toBe(113487498)
  })
})
