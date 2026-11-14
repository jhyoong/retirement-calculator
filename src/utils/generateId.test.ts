import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateId } from './generateId'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('generateId', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a v4 UUID', () => {
    expect(generateId()).toMatch(UUID_V4)
  })

  it('still works when crypto.randomUUID is missing (plain http pages)', () => {
    const original = crypto.randomUUID
    // Simulate a non-secure context, where browsers leave randomUUID undefined
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    try {
      const a = generateId()
      const b = generateId()
      expect(a).toMatch(UUID_V4)
      expect(b).toMatch(UUID_V4)
      expect(a).not.toBe(b)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })
})
