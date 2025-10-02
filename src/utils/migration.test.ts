import { describe, it, expect } from 'vitest'
import { migrateV1ToV2, convertMonthlyContributionToIncomeSource, needsMigration, getDataVersion } from './migration'
import type { RetirementData, UserData } from '@/types'

describe('Data Migration', () => {
  describe('migrateV1ToV2', () => {
    it('migrates v1.0.0 data to v2.0.0', () => {
      const v1Data: RetirementData = {
        version: '1.0.0',
        exportDate: '2024-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          monthlyContribution: 1000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03
        }
      }

      const migrated = migrateV1ToV2(v1Data)

      expect(migrated.version).toBe('2.0.0')
      expect(migrated.user.currentAge).toBe(30)
      expect(migrated.user.monthlyContribution).toBe(1000)
      expect(migrated.user.incomeSources).toBeUndefined()
      expect(migrated.user.oneOffReturns).toBeUndefined()
    })

    it('does not modify v2.0.0 data', () => {
      const v2Data: RetirementData = {
        version: '2.0.0',
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          monthlyContribution: 1000,
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

      const result = migrateV1ToV2(v2Data)

      expect(result.version).toBe('2.0.0')
      expect(result.user.incomeSources).toHaveLength(1)
    })
  })

  describe('convertMonthlyContributionToIncomeSource', () => {
    it('converts monthly contribution to income source', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 2000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03
      }

      const converted = convertMonthlyContributionToIncomeSource(userData)

      expect(converted.incomeSources).toHaveLength(1)
      expect(converted.incomeSources![0].amount).toBe(2000)
      expect(converted.incomeSources![0].frequency).toBe('monthly')
      expect(converted.incomeSources![0].type).toBe('custom')
      expect(converted.monthlyContribution).toBe(2000) // Kept for compatibility
    })

    it('does not convert if monthlyContribution is 0', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03
      }

      const converted = convertMonthlyContributionToIncomeSource(userData)

      expect(converted.incomeSources).toBeUndefined()
    })

    it('does not convert if income sources already exist', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
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

      const converted = convertMonthlyContributionToIncomeSource(userData)

      expect(converted.incomeSources).toHaveLength(1)
      expect(converted.incomeSources![0].name).toBe('Salary') // Original unchanged
    })
  })

  describe('needsMigration', () => {
    it('returns true for v1.0.0 data', () => {
      const data: RetirementData = {
        version: '1.0.0',
        exportDate: '2024-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          monthlyContribution: 1000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03
        }
      }

      expect(needsMigration(data)).toBe(true)
    })

    it('returns true for v2.0.0 data (needs migration to v3)', () => {
      const data: RetirementData = {
        version: '2.0.0',
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          monthlyContribution: 1000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03
        }
      }

      expect(needsMigration(data)).toBe(true) // Updated for Phase 4
    })
  })

  describe('getDataVersion', () => {
    it('returns correct version', () => {
      const data: RetirementData = {
        version: '2.0.0',
        exportDate: '2025-01-01T00:00:00.000Z',
        user: {
          currentAge: 30,
          retirementAge: 65,
          currentSavings: 50000,
          monthlyContribution: 1000,
          expectedReturnRate: 0.07,
          inflationRate: 0.03
        }
      }

      expect(getDataVersion(data)).toBe('2.0.0')
    })
  })
})
