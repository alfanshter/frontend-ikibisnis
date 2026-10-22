/**
 * Utility functions for WhatsApp formatting and universal link generation (wa.me)
 */

/**
 * Normalizes Indonesian and international phone numbers into proper international format (digits only)
 * Examples:
 *  - '0812-3456-7890'    -> '6281234567890'
 *  - '+62 812 3456 7890' -> '6281234567890'
 *  - '6281234567890'     -> '6281234567890'
 *  - '81234567890'       -> '6281234567890'
 */
export function formatWaNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  let cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  } else if (!cleaned.startsWith('62') && cleaned.length > 0) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

/**
 * Generates direct universal WhatsApp link (wa.me)
 */
export function getWaLink(phone: string | null | undefined, text?: string): string {
  const num = formatWaNumber(phone)
  if (!num) return '#'
  let url = `https://wa.me/${num}`
  if (text) {
    url += `?text=${encodeURIComponent(text)}`
  }
  return url
}

// Alias for compatibility
export const getWaWebLink = getWaLink
