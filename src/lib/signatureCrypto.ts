const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

export function computeDocumentHash(input: string | Uint8Array | ArrayBuffer): string {
  return sha256Hex(toBytes(input))
}

export function generateMagicLinkToken(): string {
  const bytes = new Uint8Array(32)
  const cryptoApi = globalThis.crypto
  if (!cryptoApi?.getRandomValues) throw new Error('Crypto secure indisponible pour generer le lien de signature.')
  cryptoApi.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function hashMagicLinkToken(token: string): string {
  return computeDocumentHash(token)
}

export function generateOtpCode(): string {
  const bytes = new Uint8Array(4)
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes)
  const value = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
  return String(100000 + (value % 900000))
}

export function hashOtp(code: string): string {
  return computeDocumentHash(code.trim())
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  }
  return diff === 0
}

function toBytes(input: string | Uint8Array | ArrayBuffer): Uint8Array {
  if (typeof input === 'string') return new TextEncoder().encode(input)
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  return input
}

function sha256Hex(message: Uint8Array): string {
  const padded = padMessage(message)
  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19
  const w = new Array<number>(64)

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      const base = offset + i * 4
      w[i] = ((padded[base] << 24) | (padded[base + 1] << 16) | (padded[base + 2] << 8) | padded[base + 3]) >>> 0
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = add32(w[i - 16], s0, w[i - 7], s1)
    }

    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = add32(h, s1, ch, K[i], w[i])
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = add32(s0, maj)
      h = g
      g = f
      f = e
      e = add32(d, temp1)
      d = c
      c = b
      b = a
      a = add32(temp1, temp2)
    }

    h0 = add32(h0, a)
    h1 = add32(h1, b)
    h2 = add32(h2, c)
    h3 = add32(h3, d)
    h4 = add32(h4, e)
    h5 = add32(h5, f)
    h6 = add32(h6, g)
    h7 = add32(h7, h)
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, '0'))
    .join('')
}

function padMessage(message: Uint8Array): Uint8Array {
  const bitLength = message.length * 8
  const lengthWithOne = message.length + 1
  const zeroPadding = (64 - ((lengthWithOne + 8) % 64)) % 64
  const output = new Uint8Array(lengthWithOne + zeroPadding + 8)
  output.set(message)
  output[message.length] = 0x80

  const high = Math.floor(bitLength / 0x100000000)
  const low = bitLength >>> 0
  output[output.length - 8] = (high >>> 24) & 0xff
  output[output.length - 7] = (high >>> 16) & 0xff
  output[output.length - 6] = (high >>> 8) & 0xff
  output[output.length - 5] = high & 0xff
  output[output.length - 4] = (low >>> 24) & 0xff
  output[output.length - 3] = (low >>> 16) & 0xff
  output[output.length - 2] = (low >>> 8) & 0xff
  output[output.length - 1] = low & 0xff
  return output
}

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits))
}

function add32(...values: number[]): number {
  return values.reduce((sum, value) => (sum + value) >>> 0, 0)
}
