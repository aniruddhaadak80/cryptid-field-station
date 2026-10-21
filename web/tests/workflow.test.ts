import {describe, expect, it} from 'vitest'
import {canTransition, requiresRanger, validateSubmission} from '../lib/workflow'

describe('workflow transitions', () => {
  it('lets a ranger overturn a rejection', () => {
    expect(canTransition('rejected', 'in-review')).toBe(true)
  })

  it('keeps the override a human decision', () => {
    expect(requiresRanger('rejected', 'in-review')).toBe(true)
    expect(requiresRanger('in-review', 'verified')).toBe(false)
  })

  it('still refuses the moves that were never allowed', () => {
    expect(canTransition('published', 'in-review')).toBe(false)
    expect(canTransition('submitted', 'published')).toBe(false)
    expect(canTransition('verified', 'rejected')).toBe(false)
  })
})

describe('submission validation', () => {
  const base = {
    title: 'Bigfoot near the river',
    cryptidId: 'cryptid-bigfoot',
    reporterName: 'Ranger Kim',
    observedAt: '2026-09-24T21:00:00.000Z',
    story:
      'We tracked a set of large prints for two hours along the north bank before it disappeared into the treeline, and the stride pattern was consistently far longer than any bear we have tracked here.',
  }

  it('accepts a well formed report and normalises the date', () => {
    const result = validateSubmission(base)
    expect(result.ok).toBe(true)
    expect(result.value?.observedAt).toBe('2026-09-24T21:00:00.000Z')
  })

  it('rejects a date the server cannot read instead of throwing', () => {
    const result = validateSubmission({...base, observedAt: 'last tuesday'})
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/observedAt/)
  })

  it('rejects a missing field', () => {
    const result = validateSubmission({...base, story: 'too short'})
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Missing fields/)
  })

  it('rejects a report with no date at all', () => {
    const result = validateSubmission({...base, observedAt: ''})
    expect(result.ok).toBe(false)
  })
})
