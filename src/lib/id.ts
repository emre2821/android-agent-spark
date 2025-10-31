let fallbackCounter = 0

const byteToHex = (byte: number) => byte.toString(16).padStart(2, '0')

const generateWithCrypto = (): string | null => {
  if (typeof crypto === 'undefined') {
    return null
  }

  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, byteToHex).join('')

    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return null
}

export const generateUniqueId = (): string => {
  const cryptoId = generateWithCrypto()
  if (cryptoId) {
    return cryptoId
  }

  fallbackCounter = (fallbackCounter + 1) % Number.MAX_SAFE_INTEGER
  const timestamp = Date.now().toString(36)

  // Use crypto.getRandomValues for secure random bytes
  const randomBytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(randomBytes)
  } else {
    // fallback to Math.random if crypto is not available (should be rare)
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256)
    }
  }
  const random = Array.from(randomBytes)
    .map(b => b.toString(36).padStart(2, '0'))
    .join('')
  const counter = fallbackCounter.toString(36)

  return `${timestamp}-${random}-${counter}`
}
