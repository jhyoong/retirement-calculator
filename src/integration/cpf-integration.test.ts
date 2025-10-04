import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRetirementStore } from '../stores/retirement'
import { useIncomeStore } from '../stores/income'
import { useExpenseStore } from '../stores/expense'
import { useCPFStore } from '../stores/cpf'
import { calculateRetirement } from '../utils/calculations'
import { generateMonthlyProjections } from '../utils/monthlyProjections'

describe('CPF Integration Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const expenseStore = useExpenseStore()
    expenseStore.expenses = []
  })

  describe('CPF Store Integration', () => {
    it('should initialize CPF store with defaults', () => {
      const cpfStore = useCPFStore()

      expect(cpfStore.enabled).toBe(false)
      expect(cpfStore.currentBalances.ordinaryAccount).toBe(0)
      expect(cpfStore.currentBalances.specialAccount).toBe(0)
      expect(cpfStore.currentBalances.medisaveAccount).toBe(0)
      expect(cpfStore.currentBalances.retirementAccount).toBe(0)
      expect(cpfStore.retirementSumTarget).toBe('full')
    })

    it('should allow enabling and setting balances', () => {
      const cpfStore = useCPFStore()

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 50000,
        specialAccount: 30000,
        medisaveAccount: 20000
      })

      expect(cpfStore.enabled).toBe(true)
      expect(cpfStore.currentBalances.ordinaryAccount).toBe(50000)
      expect(cpfStore.currentBalances.specialAccount).toBe(30000)
      expect(cpfStore.currentBalances.medisaveAccount).toBe(20000)
    })
  })

  describe('Salary Income → CPF Flow', () => {
    it('should trigger CPF contribution from salary income', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      // Setup: 30-year-old with $5000 monthly salary
      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 10000
      retirementStore.expectedReturnRate = 0.05

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Software Engineer',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(true)

      const projections = generateMonthlyProjections(retirementStore.userData, 31)

      // Check first month has CPF
      const firstMonth = projections[0]
      expect(firstMonth.cpf).toBeDefined()

      // CPF contribution should be 37% of $5000 = $1850
      expect(firstMonth.cpf!.monthlyContribution.total).toBeCloseTo(1850, 0)

      // Employee contribution (20%) should reduce income
      expect(firstMonth.cpf!.monthlyContribution.employee).toBeCloseTo(1000, 0)
    })

    it('should not trigger CPF for non-salary income', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65
      retirementStore.currentSavings = 10000

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Rental Income',
        type: 'rental',
        amount: 3000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      cpfStore.updateEnabled(true)

      const projections = generateMonthlyProjections(retirementStore.userData, 31)

      // No CPF contribution from rental income
      const firstMonth = projections[0]
      expect(firstMonth.cpf!.monthlyContribution.total).toBe(0)
    })

    it('should handle multiple salary sources', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Main Job',
        type: 'salary',
        amount: 4000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      incomeStore.addIncomeSource({
        id: '2',
        name: 'Part-time',
        type: 'salary',
        amount: 1000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(true)

      const projections = generateMonthlyProjections(retirementStore.userData, 31)

      // CPF on combined $5000 salary
      const firstMonth = projections[0]
      expect(firstMonth.cpf!.monthlyContribution.total).toBeCloseTo(1850, 0)
    })
  })

  describe('CPF Contribution → Account Allocation', () => {
    it('should allocate contributions to OA/SA/MA for age 30', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(true)

      const projections = generateMonthlyProjections(retirementStore.userData, 31)

      const firstMonth = projections[0]
      const allocation = firstMonth.cpf!.monthlyContribution.allocation

      // Age 30: OA 62.17%, SA 16.21%, MA 21.62%, RA 0%
      expect(allocation.toOA).toBeGreaterThan(0)
      expect(allocation.toSA).toBeGreaterThan(0)
      expect(allocation.toMA).toBeGreaterThan(0)
      expect(allocation.toRA).toBe(0) // No RA before 55

      // Total should match contribution
      const total = allocation.toOA + allocation.toSA + allocation.toMA + allocation.toRA
      expect(total).toBeCloseTo(firstMonth.cpf!.monthlyContribution.total, 1)
    })

    it('should accumulate contributions over months', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(true)

      const projections = generateMonthlyProjections(retirementStore.userData)

      // Account balances should grow over time
      const month1 = projections[0]
      const month6 = projections[5]
      const month12 = projections[11]

      expect(month6.cpf!.accounts.ordinaryAccount).toBeGreaterThan(month1.cpf!.accounts.ordinaryAccount)
      expect(month12.cpf!.accounts.ordinaryAccount).toBeGreaterThan(month6.cpf!.accounts.ordinaryAccount)
    })
  })

  describe('CPF Interest Integration', () => {
    it('should apply monthly interest to CPF accounts', () => {
      const retirementStore = useRetirementStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 50000,
        specialAccount: 30000,
        medisaveAccount: 20000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]

      // OA interest: 2.5% annual = ~0.208% monthly
      // SA/MA interest: 4.0% annual = ~0.333% monthly
      expect(month1.cpf!.monthlyInterest.oa).toBeGreaterThan(0)
      expect(month1.cpf!.monthlyInterest.sa).toBeGreaterThan(0)
      expect(month1.cpf!.monthlyInterest.ma).toBeGreaterThan(0)
      expect(month1.cpf!.monthlyInterest.total).toBeGreaterThan(0)
    })

    it('should apply extra interest for balances under 55', () => {
      const retirementStore = useRetirementStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 40
      retirementStore.retirementAge = 41

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 20000, // Max eligible for extra interest under 55
        specialAccount: 40000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]

      // Should have extra interest on first $60k (max $20k from OA)
      expect(month1.cpf!.monthlyInterest.extraInterest).toBeGreaterThan(0)
    })
  })

  describe('Age 55 Transition Integration', () => {
    it('should transition at age 55 exactly once', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 54
      retirementStore.retirementAge = 56

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 100000,
        specialAccount: 113000, // Will hit FRS
        medisaveAccount: 50000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      // Find when age 55 is reached (12 months in)
      const beforeAge55 = projections[11] // Age 54.92
      const afterAge55 = projections[12] // Age 55.0

      // Before age 55: SA should have balance
      expect(beforeAge55.cpf!.accounts.specialAccount).toBeGreaterThan(0)
      expect(beforeAge55.cpf!.accounts.retirementAccount).toBe(0)

      // After age 55: SA should be 0, RA should have balance
      expect(afterAge55.cpf!.accounts.specialAccount).toBe(0)
      expect(afterAge55.cpf!.accounts.retirementAccount).toBeGreaterThan(0)
    })

    it('should transfer funds to meet retirement sum target', () => {
      const retirementStore = useRetirementStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 54
      retirementStore.retirementAge = 56

      cpfStore.updateEnabled(true)
      cpfStore.updateRetirementSumTarget('full') // FRS = $213,000
      cpfStore.updateBalances({
        ordinaryAccount: 100000,
        specialAccount: 150000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      const afterAge55 = projections[12]

      // RA should have approximately FRS amount (may be slightly more due to contributions and interest during the year)
      expect(afterAge55.cpf!.accounts.retirementAccount).toBeGreaterThanOrEqual(213000)
      expect(afterAge55.cpf!.accounts.retirementAccount).toBeLessThan(215000)
    })
  })

  describe('Housing Loan OA Usage', () => {
    it('should use OA for housing loan payments when useCPF is enabled', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      expenseStore.addLoan({
        id: '1',
        name: 'Housing Loan',
        category: 'housing',
        principal: 300000,
        interestRate: 0.03,
        termMonths: 300,
        startDate: '2025-01',
        useCPF: true,
        cpfPercentage: 100
      })

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 50000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]
      const initialOA = 50000

      // OA should be reduced (used for loan payment)
      const month1OA = month1.cpf!.accounts.ordinaryAccount
      expect(month1OA).toBeLessThan(initialOA)
    })

    it('should not use OA for non-housing loans', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      expenseStore.addLoan({
        id: '1',
        name: 'Car Loan',
        category: 'auto',
        principal: 50000,
        interestRate: 0.05,
        termMonths: 60,
        startDate: '2025-01'
      })

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 50000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]
      const initialOA = 50000

      // OA should only be affected by contributions and interest, not loan payment
      // Since car loan is not housing, OA won't be used for it
      const finalOA = month1.cpf!.accounts.ordinaryAccount

      // OA should increase (contributions + interest), not decrease
      expect(finalOA).toBeGreaterThan(initialOA)

      // Verify OA increased by approximately the right amount (contributions + interest)
      const oaIncrease = finalOA - initialOA
      const expectedMinIncrease = month1.cpf!.monthlyContribution.allocation.toOA // At minimum, contributions
      expect(oaIncrease).toBeGreaterThanOrEqual(expectedMinIncrease)
    })

    it('should not use OA for housing loans when useCPF is disabled', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      expenseStore.addLoan({
        id: '1',
        name: 'Housing Loan',
        category: 'housing',
        principal: 300000,
        interestRate: 0.03,
        termMonths: 300,
        startDate: '2025-01',
        useCPF: false // Explicitly disabled
      })

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 50000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]
      const initialOA = 50000

      // OA should not be used for loan, only contributions and interest
      const finalOA = month1.cpf!.accounts.ordinaryAccount

      // OA should increase (contributions + interest), not decrease
      expect(finalOA).toBeGreaterThan(initialOA)

      // Verify OA increased by approximately the right amount (contributions + interest)
      const oaIncrease = finalOA - initialOA
      const expectedMinIncrease = month1.cpf!.monthlyContribution.allocation.toOA // At minimum, contributions
      expect(oaIncrease).toBeGreaterThanOrEqual(expectedMinIncrease)
    })

    it('should use percentage-based CPF payment for housing loans', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const expenseStore = useExpenseStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      expenseStore.addLoan({
        id: '1',
        name: 'Housing Loan',
        category: 'housing',
        principal: 300000,
        interestRate: 0.03,
        termMonths: 300,
        startDate: '2025-01',
        useCPF: true,
        cpfPercentage: 50 // 50% from CPF, 50% from cash
      })

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: 50000
      })

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]
      const initialOA = 50000

      // OA should be reduced, but not by the full loan payment (only 50%)
      const finalOA = month1.cpf!.accounts.ordinaryAccount
      const oaChange = finalOA - initialOA
      const expectedOAIncrease = month1.cpf!.monthlyContribution.allocation.toOA + month1.cpf!.monthlyInterest.oa

      // OA change should be positive (contributions + interest) minus the CPF portion of loan payment
      expect(oaChange).toBeLessThan(expectedOAIncrease) // Some OA was used for loan
      expect(finalOA).toBeLessThan(initialOA + expectedOAIncrease) // Net OA is less than initial + contributions
    })
  })

  describe('CPF Validation', () => {
    it('should warn if CPF enabled but no CPF-eligible income', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 65

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Rental',
        type: 'rental',
        amount: 3000,
        frequency: 'monthly',
        startDate: '2025-01'
      })

      cpfStore.updateEnabled(true)

      expect(() => calculateRetirement(retirementStore.userData)).toThrow(/no CPF-eligible income/)
    })

    it('should validate non-negative balances', () => {
      const cpfStore = useCPFStore()

      cpfStore.updateEnabled(true)
      cpfStore.updateBalances({
        ordinaryAccount: -1000
      })

      const retirementStore = useRetirementStore()
      expect(() => calculateRetirement(retirementStore.userData)).toThrow(/negative/)
    })
  })

  describe('CPF Toggle', () => {
    it('should not calculate CPF when disabled', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(false) // Disabled

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]

      // No CPF data when disabled
      expect(month1.cpf).toBeUndefined()
    })

    it('should calculate CPF when enabled', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      incomeStore.addIncomeSource({
        id: '1',
        name: 'Salary',
        type: 'salary',
        amount: 5000,
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(true) // Enabled

      const projections = generateMonthlyProjections(retirementStore.userData)

      const month1 = projections[0]

      // CPF data present when enabled
      expect(month1.cpf).toBeDefined()
      expect(month1.cpf!.monthlyContribution.total).toBeGreaterThan(0)
    })
  })

  describe('Annual CPF Limit', () => {
    it('should enforce annual contribution limit', () => {
      const retirementStore = useRetirementStore()
      const incomeStore = useIncomeStore()
      const cpfStore = useCPFStore()

      retirementStore.currentAge = 30
      retirementStore.retirementAge = 31

      // High salary to hit annual limit quickly
      incomeStore.addIncomeSource({
        id: '1',
        name: 'High Salary',
        type: 'salary',
        amount: 10000, // Above wage ceiling
        frequency: 'monthly',
        startDate: '2025-01',
        cpfEligible: true
      })

      cpfStore.updateEnabled(true)

      const projections = generateMonthlyProjections(retirementStore.userData)

      // Annual limit is $37,740
      // Check that YTD doesn't exceed this
      const month12 = projections[11]
      expect(month12.cpf!.yearToDateContributions).toBeLessThanOrEqual(37740)
    })
  })
})
