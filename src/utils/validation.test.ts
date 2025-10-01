import { describe, it, expect } from 'vitest'
import { validateInputs } from './calculations'
import type { UserData, IncomeStream, OneOffReturn } from '@/types'

describe('Phase 2 Validation', () => {
  describe('Income Source Validation', () => {
    it('validates income source with valid data', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01',
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects income source with empty name', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: '',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01',
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].name')).toBe(true)
    })

    it('rejects income source with negative amount', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: -1000,
          frequency: 'monthly',
          startDate: '2025-01',
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].amount')).toBe(true)
    })

    it('rejects invalid start date format', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025/01', // Wrong format
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].startDate')).toBe(true)
    })

    it('rejects invalid end date format', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01',
          endDate: 'invalid'
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].endDate')).toBe(true)
    })

    it('rejects end date before start date', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-12',
          endDate: '2025-01' // Before start
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].endDate')).toBe(true)
    })

    it('rejects end date equal to start date', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'monthly',
          startDate: '2025-01',
          endDate: '2025-01' // Same as start
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].endDate')).toBe(true)
    })

    it('rejects custom frequency without days specified', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'custom',
          startDate: '2025-01',
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].customFrequencyDays')).toBe(true)
    })

    it('rejects custom frequency with zero days', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [{
          id: '1',
          name: 'Salary',
          type: 'salary',
          amount: 5000,
          frequency: 'custom',
          customFrequencyDays: 0,
          startDate: '2025-01',
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'incomeSource[0].customFrequencyDays')).toBe(true)
    })

    it('validates multiple income sources', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 0,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [
          {
            id: '1',
            name: 'Salary',
            type: 'salary',
            amount: 5000,
            frequency: 'monthly',
            startDate: '2025-01',
          },
          {
            id: '2',
            name: 'Rental',
            type: 'rental',
            amount: 2000,
            frequency: 'monthly',
            startDate: '2025-06',
          }
        ]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(true)
    })
  })

  describe('One-off Return Validation', () => {
    it('validates one-off return with valid data', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        oneOffReturns: [{
          id: '1',
          date: '2026-06',
          amount: 10000,
          description: 'Annual bonus'
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(true)
    })

    it('rejects invalid date format', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        oneOffReturns: [{
          id: '1',
          date: '06/2026', // Wrong format
          amount: 10000,
          description: 'Annual bonus'
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'oneOffReturn[0].date')).toBe(true)
    })

    it('rejects zero amount', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        oneOffReturns: [{
          id: '1',
          date: '2026-06',
          amount: 0,
          description: 'Annual bonus'
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'oneOffReturn[0].amount')).toBe(true)
    })

    it('rejects negative amount', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        oneOffReturns: [{
          id: '1',
          date: '2026-06',
          amount: -5000,
          description: 'Annual bonus'
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'oneOffReturn[0].amount')).toBe(true)
    })

    it('rejects empty description', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        oneOffReturns: [{
          id: '1',
          date: '2026-06',
          amount: 10000,
          description: ''
        }]
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'oneOffReturn[0].description')).toBe(true)
    })
  })

  describe('Backward Compatibility', () => {
    it('validates Phase 1 data without income sources', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(true)
    })

    it('validates with empty income sources array', () => {
      const userData: UserData = {
        currentAge: 30,
        retirementAge: 65,
        currentSavings: 50000,
        monthlyContribution: 1000,
        expectedReturnRate: 0.07,
        inflationRate: 0.03,
        incomeSources: [],
        oneOffReturns: []
      }

      const result = validateInputs(userData)
      expect(result.isValid).toBe(true)
    })
  })
})
