import { describe, it, expect } from 'vitest'
import { exportData, validateImportedData } from './importExport'
import type { UserData, RetirementData } from '@/types'

describe('Import/Export', () => {
  describe('exportData', () => {
    it('exports basic data', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03
      }

      const exported = exportData(userData)

      expect(exported.user).toEqual(userData)
      expect(exported.exportDate).toBeDefined()
    })

    it('exports data with income sources', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01'
        }],
        oneOffReturns: [{
          id: '1',
          date: '2026-06',
          amount: 10000,
          description: 'Bonus'
        }]
      }

      const exported = exportData(userData)

      expect(exported.user.incomeSources).toHaveLength(1)
      expect(exported.user.oneOffReturns).toHaveLength(1)
    })
  })

  describe('validateImportedData', () => {
    it('validates basic data', () => {
      const data: RetirementData = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('validates data with income sources', () => {
      const data: RetirementData = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03,
          incomeSources: [{
            id: '1',
            name: 'Salary',
            type: 'salary',
            amount: 5000,
            frequency: 'monthly',
            startDate: '2025-01'
          }]
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('validates data with one-off returns', () => {
      const data: RetirementData = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03,
          oneOffReturns: [{
            id: '1',
            date: '2026-06',
            amount: 10000,
            description: 'Bonus'
          }]
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('validates data with both income sources and one-off returns', () => {
      const data: RetirementData = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03,
          incomeSources: [{
            id: '1',
            name: 'Salary',
            type: 'salary',
            amount: 5000,
            frequency: 'monthly',
            startDate: '2025-01'
          }],
          oneOffReturns: [{
            id: '1',
            date: '2026-06',
            amount: 10000,
            description: 'Bonus'
          }]
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })

    it('rejects data with missing required fields', () => {
      const data = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          // Missing retirementAge
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03
        }
      }

      expect(validateImportedData(data)).toBe(false)
    })

    it('rejects data with invalid income sources structure', () => {
      const data = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03,
          incomeSources: 'not an array' // Invalid
        }
      }

      expect(validateImportedData(data)).toBe(false)
    })

    it('rejects data with invalid one-off returns structure', () => {
      const data = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03,
          oneOffReturns: [
            {
              id: '1',
              // Missing date
              amount: 10000,
              description: 'Bonus'
            }
          ]
        }
      }

      expect(validateImportedData(data)).toBe(false)
    })

    it('accepts empty income sources array', () => {
      const data: RetirementData = {
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03,
          incomeSources: [],
          oneOffReturns: []
        }
      }

      expect(validateImportedData(data)).toBe(true)
    })
  })
})
