import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIncomeStore } from './income'
import type { IncomeStream, OneOffReturn } from '@/types'

describe('Income Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Frequency Conversion', () => {
    it('converts daily income to monthly', () => {
      const store = useIncomeStore()
      const monthly = store.convertToMonthly(100, 'daily')
      expect(monthly).toBeCloseTo(3044, 0) // 100 * 30.44
    })

    it('converts weekly income to monthly', () => {
      const store = useIncomeStore()
      const monthly = store.convertToMonthly(1000, 'weekly')
      expect(monthly).toBeCloseTo(4333.33, 2) // 1000 * 52 / 12
    })

    it('converts monthly income to monthly (no change)', () => {
      const store = useIncomeStore()
      const monthly = store.convertToMonthly(5000, 'monthly')
      expect(monthly).toBe(5000)
    })

    it('converts yearly income to monthly', () => {
      const store = useIncomeStore()
      const monthly = store.convertToMonthly(120000, 'yearly')
      expect(monthly).toBe(10000) // 120000 / 12
    })

    it('converts custom frequency to monthly', () => {
      const store = useIncomeStore()
      const monthly = store.convertToMonthly(2000, 'custom', 14) // Bi-weekly
      expect(monthly).toBeCloseTo(4348.21, 2)
    })

    it('handles custom frequency with no days specified', () => {
      const store = useIncomeStore()
      const monthly = store.convertToMonthly(2000, 'custom')
      expect(monthly).toBe(0)
    })

    it('handles custom frequency with zero days', () => {
      const store = useIncomeStore()
      const monthly = store.convertToMonthly(2000, 'custom', 0)
      expect(monthly).toBe(0)
    })
  })

  describe('Income Source Management', () => {
    it('adds income source', () => {
      const store = useIncomeStore()
      const source: IncomeStream = {
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2024-01',
      }

      store.addIncomeSource(source)
      expect(store.incomeSources).toHaveLength(1)
      expect(store.incomeSources[0]).toEqual(source)
    })

    it('removes income source', () => {
      const store = useIncomeStore()
      const source: IncomeStream = {
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2024-01',
      }

      store.addIncomeSource(source)
      expect(store.incomeSources).toHaveLength(1)

      store.removeIncomeSource('1')
      expect(store.incomeSources).toHaveLength(0)
    })

    it('updates income source', () => {
      const store = useIncomeStore()
      const source: IncomeStream = {
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2024-01',
      }

      store.addIncomeSource(source)
      store.updateIncomeSource('1', { amount: 6000 })

      expect(store.incomeSources[0].amount).toBe(6000)
      expect(store.incomeSources[0].name).toBe('Salary')
    })

    it('calculates total monthly income from multiple sources', () => {
      const store = useIncomeStore()

      store.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2024-01',
      })

      store.addIncomeSource({
        id: '2',
        name: 'Rental',
        type: 'rental',
        amount: 2000,
        frequency: 'monthly',
        startDate: '2024-01',
      })

      expect(store.totalMonthlyIncome).toBe(7000)
    })

    it('calculates total monthly income with different frequencies', () => {
      const store = useIncomeStore()

      store.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2024-01',
      })

      store.addIncomeSource({
        id: '2',
        name: 'Side Gig',
        type: 'business',
        amount: 1000,
        frequency: 'weekly',
        startDate: '2024-01',
      })

      expect(store.totalMonthlyIncome).toBeCloseTo(9333.33, 2)
    })
  })

  describe('One-off Returns Management', () => {
    it('adds one-off return', () => {
      const store = useIncomeStore()
      const oneOff: OneOffReturn = {
        id: '1',
        date: '2025-06',
        amount: 10000,
        description: 'Bonus'
      }

      store.addOneOffReturn(oneOff)
      expect(store.oneOffReturns).toHaveLength(1)
      expect(store.oneOffReturns[0]).toEqual(oneOff)
    })

    it('removes one-off return', () => {
      const store = useIncomeStore()
      const oneOff: OneOffReturn = {
        id: '1',
        date: '2025-06',
        amount: 10000,
        description: 'Bonus'
      }

      store.addOneOffReturn(oneOff)
      expect(store.oneOffReturns).toHaveLength(1)

      store.removeOneOffReturn('1')
      expect(store.oneOffReturns).toHaveLength(0)
    })

    it('updates one-off return', () => {
      const store = useIncomeStore()
      const oneOff: OneOffReturn = {
        id: '1',
        date: '2025-06',
        amount: 10000,
        description: 'Bonus'
      }

      store.addOneOffReturn(oneOff)
      store.updateOneOffReturn('1', { amount: 15000 })

      expect(store.oneOffReturns[0].amount).toBe(15000)
      expect(store.oneOffReturns[0].description).toBe('Bonus')
    })
  })

  describe('Data Management', () => {
    it('loads data', () => {
      const store = useIncomeStore()
      const sources: IncomeStream[] = [{
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2024-01',
      }]

      const returns: OneOffReturn[] = [{
        id: '1',
        date: '2025-06',
        amount: 10000,
        description: 'Bonus'
      }]

      store.loadData(sources, returns)
      expect(store.incomeSources).toHaveLength(1)
      expect(store.oneOffReturns).toHaveLength(1)
    })

    it('resets to defaults', () => {
      const store = useIncomeStore()

      store.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2024-01',
      })

      store.addOneOffReturn({
        id: '1',
        date: '2025-06',
        amount: 10000,
        description: 'Bonus'
      })

      store.resetToDefaults()
      expect(store.incomeSources).toHaveLength(0)
      expect(store.oneOffReturns).toHaveLength(0)
    })
  })
})
