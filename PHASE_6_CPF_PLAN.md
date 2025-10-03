# Phase 6: CPF Integration - Comprehensive Implementation Plan

## Table of Contents
1. [Overview](#overview)
2. [Architecture Summary](#architecture-summary)
3. [Milestone Breakdown](#milestone-breakdown)
4. [Integration Strategy](#integration-strategy)
5. [Testing Strategy](#testing-strategy)
6. [Implementation Order](#implementation-order)
7. [Success Criteria](#success-criteria)

---

## Overview

### Objective
Integrate Singapore's Central Provident Fund (CPF) system into the retirement calculator, providing accurate projections of CPF account balances, contributions, interest growth, and retirement withdrawals based on 2025 regulations.

### Scope
- CPF contribution calculations from salary income
- Four account types: Ordinary Account (OA), Special Account (SA), MediSave Account (MA), Retirement Account (RA)
- Age-dependent contribution and allocation rules
- Interest calculations with extra interest tiers
- Age 55 transitions (SA closure, RA creation)
- Retirement sum requirements (BRS/FRS/ERS)
- CPF Life annuity estimates
- Housing usage tracking from OA
- Post-retirement CPF withdrawals and contributions

### Key Data Sources
- CPF_INFO.md contains all 2025 rates and regulations
- 5 age groups for contribution rates
- 8 age groups for allocation percentages
- Quarterly interest rates (Q4 2025: OA 2.5%, SMRA 4.0%)
- Extra interest tiers (up to 6% for age 55+)
- Wage ceilings: $7,400/month, $37,740/year
- Retirement sums: BRS $106,500, FRS $213,000, ERS $426,000

### Non-Goals (Out of Scope for Phase 6)
- CPF investment schemes (CPFIS)
- MediShield Life / Integrated Shield Plans
- CPF housing grant calculations
- Top-up schemes (RSTU)
- Voluntary contributions beyond salary
- CPF transfer between spouses
- Foreign worker or PR (first 2 years) contribution rates

---

## Architecture Summary

### New Files to Create
```
src/
  stores/
    cpf.ts                          # Pinia store for CPF state
  utils/
    cpfConfig.ts                    # Configuration data (rates, limits, sums)
    cpfContributions.ts             # Contribution calculation logic
    cpfInterest.ts                  # Interest calculation logic
    cpfTransitions.ts               # Age 55+ transitions and withdrawals
    cpfLife.ts                      # CPF Life annuity calculations
    cpfContributions.test.ts        # Tests for contributions
    cpfInterest.test.ts             # Tests for interest
    cpfTransitions.test.ts          # Tests for transitions
    cpfLife.test.ts                 # Tests for CPF Life
  components/
    CPFAccountsForm.vue             # CPF accounts tab UI
    CPFSummary.vue                  # CPF summary display component
  phase6-integration.test.ts        # End-to-end integration tests
```

### Modified Files
```
src/
  types/index.ts                    # Add CPF types
  stores/
    retirement.ts                   # Integration with CPF store
    income.ts                       # Link salary income to CPF
  utils/
    calculations.ts                 # Integrate CPF into main calculation flow
    monthlyProjections.ts           # Add CPF data to monthly snapshots
    postRetirementProjections.ts    # Include CPF Life income
  components/
    App.vue                         # Add CPF Accounts tab
    ResultsDisplay.vue              # Show CPF balances and retirement sums
    VisualizationsTab.vue           # Add CPF account visualization
    ImportExport.vue                # Include CPF data in export/import
```

### Data Flow
```
Salary Income Source
  → CPF Contribution Calculation (age-dependent rates)
  → Employee/Employer Split
  → Allocation to OA/SA/MA/RA (age-dependent percentages)
  → Monthly Interest (OA 2.5%, SMRA 4.0% + extra interest)
  → Age 55 Transition (SA → RA)
  → Retirement Sum Check (BRS/FRS/ERS)
  → Post-Retirement CPF Life Payouts
```

---

## Milestone Breakdown

### Milestone 1: Foundation - CPF Configuration & Type System

#### Objective
Establish the foundational data structures, configuration, and store architecture without implementing calculation logic. This milestone focuses on setting up the framework that all subsequent milestones will build upon.

#### Deliverables

**1. CPF Configuration File (`src/utils/cpfConfig.ts`)**

Create a comprehensive configuration object containing all CPF rules and rates for 2025:

```typescript
export const CPF_CONFIG_2025 = {
  // Contribution rates by age (5 brackets)
  contributionRates: [
    {
      ageMin: 0,
      ageMax: 55,
      employerRate: 0.17,
      employeeRate: 0.20,
      totalRate: 0.37,
      maxMonthlyContribution: 2738
    },
    {
      ageMin: 56,
      ageMax: 60,
      employerRate: 0.155,
      employeeRate: 0.17,
      totalRate: 0.325,
      maxMonthlyContribution: 2405
    },
    // ... 3 more age brackets
  ],

  // Allocation percentages by age (8 brackets)
  allocationRates: [
    {
      ageMin: 0,
      ageMax: 35,
      ordinaryAccount: 0.6217,
      specialAccount: 0.1621,
      medisaveAccount: 0.2162,
      retirementAccount: 0
    },
    // ... 7 more age brackets
  ],

  // Interest rates (Q4 2025)
  interestRates: {
    ordinaryAccount: 0.025,
    specialAccount: 0.04,
    medisaveAccount: 0.04,
    retirementAccount: 0.04,
    extraInterest: {
      under55: {
        rate: 0.01,
        balanceCap: 60000,
        oaCap: 20000
      },
      age55Plus: {
        firstTier: { rate: 0.02, cap: 30000 },
        secondTier: { rate: 0.01, cap: 30000 }
      }
    }
  },

  // Wage ceilings and limits
  wageCeilings: {
    monthlyOrdinaryWage: 7400,
    annualSalaryCeiling: 102000,
    annualCPFLimit: 37740
  },

  // Retirement sums (for those turning 55 in 2025)
  retirementSums: {
    basic: 106500,
    full: 213000,
    enhanced: 426000,
    basicHealthcare: 75500
  },

  // CPF Life payout estimates (for age 65 payouts)
  cpfLifePayouts: {
    basic: { min: 860, max: 930 },
    full: { min: 1610, max: 1730 },
    enhanced: { min: 3100, max: 3330 }
  }
};
```

**2. Type Definitions (`src/types/index.ts`)**

Add comprehensive CPF-related types:

```typescript
// CPF Account Balances
export interface CPFAccounts {
  ordinaryAccount: number;
  specialAccount: number;
  medisaveAccount: number;
  retirementAccount: number; // 0 before age 55
}

// Monthly CPF Contribution
export interface CPFContribution {
  employee: number;
  employer: number;
  total: number;
  allocation: {
    toOA: number;
    toSA: number;
    toMA: number;
    toRA: number;
  };
}

// CPF Monthly Snapshot (for tracking over time)
export interface CPFMonthlySnapshot {
  monthIndex: number;
  age: number;
  accounts: CPFAccounts;
  monthlyContribution: CPFContribution;
  monthlyInterest: {
    oa: number;
    sa: number;
    ma: number;
    ra: number;
    extraInterest: number;
    total: number;
  };
  housingUsage: number;
  yearToDateContributions: number; // For annual limit tracking
}

// CPF Configuration Types
export interface CPFContributionRate {
  ageMin: number;
  ageMax: number;
  employerRate: number;
  employeeRate: number;
  totalRate: number;
  maxMonthlyContribution: number;
}

export interface CPFAllocationRate {
  ageMin: number;
  ageMax: number;
  ordinaryAccount: number;
  specialAccount: number;
  medisaveAccount: number;
  retirementAccount: number;
}

// User CPF Data
export interface CPFData {
  enabled: boolean; // Toggle CPF calculations on/off
  currentBalances: CPFAccounts;
  housingUsage: number;
  retirementSumTarget: 'basic' | 'full' | 'enhanced';
  cpfLifePlan: 'standard' | 'basic' | 'escalating'; // Different CPF Life plans
  manualOverride: boolean; // If user wants to manually set balances
}

// Add to UserData interface
export interface UserData {
  // ... existing fields
  cpf?: CPFData;
}

// Add to MonthlyDataPoint interface
export interface MonthlyDataPoint {
  // ... existing fields
  cpf?: CPFMonthlySnapshot;
}
```

**3. CPF Pinia Store (`src/stores/cpf.ts`)**

Create the state management store using Composition API:

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CPFData, CPFAccounts } from '@/types';

export const useCPFStore = defineStore('cpf', () => {
  // State
  const enabled = ref(false);
  const currentBalances = ref<CPFAccounts>({
    ordinaryAccount: 0,
    specialAccount: 0,
    medisaveAccount: 0,
    retirementAccount: 0
  });
  const housingUsage = ref(0);
  const retirementSumTarget = ref<'basic' | 'full' | 'enhanced'>('full');
  const cpfLifePlan = ref<'standard' | 'basic' | 'escalating'>('standard');
  const manualOverride = ref(false);

  // Computed
  const totalCPFBalance = computed(() => {
    return (
      currentBalances.value.ordinaryAccount +
      currentBalances.value.specialAccount +
      currentBalances.value.medisaveAccount +
      currentBalances.value.retirementAccount
    );
  });

  const cpfData = computed((): CPFData => ({
    enabled: enabled.value,
    currentBalances: currentBalances.value,
    housingUsage: housingUsage.value,
    retirementSumTarget: retirementSumTarget.value,
    cpfLifePlan: cpfLifePlan.value,
    manualOverride: manualOverride.value
  }));

  // Actions
  function updateEnabled(value: boolean) {
    enabled.value = value;
  }

  function updateBalances(balances: Partial<CPFAccounts>) {
    currentBalances.value = { ...currentBalances.value, ...balances };
  }

  function updateHousingUsage(amount: number) {
    housingUsage.value = amount;
  }

  function updateRetirementSumTarget(target: 'basic' | 'full' | 'enhanced') {
    retirementSumTarget.value = target;
  }

  function updateCPFLifePlan(plan: 'standard' | 'basic' | 'escalating') {
    cpfLifePlan.value = plan;
  }

  function updateManualOverride(value: boolean) {
    manualOverride.value = value;
  }

  function resetToDefaults() {
    enabled.value = false;
    currentBalances.value = {
      ordinaryAccount: 0,
      specialAccount: 0,
      medisaveAccount: 0,
      retirementAccount: 0
    };
    housingUsage.value = 0;
    retirementSumTarget.value = 'full';
    cpfLifePlan.value = 'standard';
    manualOverride.value = false;
  }

  function loadData(data: CPFData) {
    enabled.value = data.enabled;
    currentBalances.value = data.currentBalances;
    housingUsage.value = data.housingUsage;
    retirementSumTarget.value = data.retirementSumTarget;
    cpfLifePlan.value = data.cpfLifePlan;
    manualOverride.value = data.manualOverride;
  }

  return {
    // State
    enabled,
    currentBalances,
    housingUsage,
    retirementSumTarget,
    cpfLifePlan,
    manualOverride,
    // Computed
    totalCPFBalance,
    cpfData,
    // Actions
    updateEnabled,
    updateBalances,
    updateHousingUsage,
    updateRetirementSumTarget,
    updateCPFLifePlan,
    updateManualOverride,
    resetToDefaults,
    loadData
  };
});
```

#### Key Criteria Met
- Configuration externalized for easy updates when CPF rules change
- Type safety enforced for all CPF data structures
- Store follows existing Pinia Composition API pattern
- Clear separation between state, computed properties, and actions
- No breaking changes to existing codebase
- Foundation supports all future milestones

#### Testing Requirements (15-20 tests)

**Test File: `src/stores/cpf.test.ts`**

```typescript
describe('CPF Store', () => {
  // Initialization tests
  test('initializes with correct default values')
  test('enabled defaults to false')
  test('all account balances default to 0')
  test('retirement sum target defaults to full')

  // State update tests
  test('updateEnabled changes enabled state')
  test('updateBalances updates account balances')
  test('updateBalances preserves unchanged fields')
  test('updateHousingUsage updates housing usage')
  test('updateRetirementSumTarget changes target')
  test('updateCPFLifePlan changes plan')

  // Computed property tests
  test('totalCPFBalance sums all accounts correctly')
  test('totalCPFBalance includes retirement account')
  test('cpfData returns complete CPF data object')

  // Action tests
  test('resetToDefaults clears all data')
  test('loadData populates store from data object')
  test('loadData handles partial data gracefully')

  // Edge cases
  test('handles negative balances (validation)')
  test('handles large balance values')
});
```

**Test File: `src/utils/cpfConfig.test.ts`**

```typescript
describe('CPF Configuration', () => {
  // Data integrity tests
  test('all contribution rate age brackets are continuous')
  test('all allocation rate age brackets are continuous')
  test('contribution rates sum to totalRate')
  test('allocation percentages sum to 100% (or 1.0)')
  test('wage ceilings are positive numbers')
  test('retirement sums follow BRS < FRS < ERS relationship')
  test('CPF Life payouts follow basic < full < enhanced')

  // Validation tests
  test('all rates are between 0 and 1')
  test('extra interest caps are positive')
  test('age brackets do not overlap')
});
```

#### Implementation Notes
- Configuration should be easily updatable when CPF announces new rates (typically happens in Budget)
- Consider adding a config version field for future-proofing
- Store should be testable in isolation without calculation logic
- All monetary values should be in dollars (not cents) for consistency with existing code

---

### Milestone 2: Contribution Engine

#### Objective
Implement the core CPF contribution calculation engine that determines employee and employer contributions based on salary, age, and wage ceilings. This is the most critical calculation component as it feeds into all subsequent account growth.

#### Deliverables

**1. Contribution Calculation Utilities (`src/utils/cpfContributions.ts`)**

```typescript
import { CPF_CONFIG_2025 } from './cpfConfig';
import type { CPFContribution, CPFContributionRate, CPFAllocationRate } from '@/types';

/**
 * Get contribution rate for a specific age
 */
export function getContributionRate(age: number): CPFContributionRate {
  const rate = CPF_CONFIG_2025.contributionRates.find(
    r => age >= r.ageMin && age <= r.ageMax
  );

  if (!rate) {
    throw new Error(`No contribution rate found for age ${age}`);
  }

  return rate;
}

/**
 * Get allocation rate for a specific age
 */
export function getAllocationRate(age: number): CPFAllocationRate {
  const rate = CPF_CONFIG_2025.allocationRates.find(
    r => age >= r.ageMin && age <= r.ageMax
  );

  if (!rate) {
    throw new Error(`No allocation rate found for age ${age}`);
  }

  return rate;
}

/**
 * Apply wage ceiling to monthly salary
 * Returns the CPF-eligible amount
 */
export function applyCPFWageCeiling(monthlySalary: number): number {
  return Math.min(monthlySalary, CPF_CONFIG_2025.wageCeilings.monthlyOrdinaryWage);
}

/**
 * Check if annual CPF limit has been reached
 * Returns the maximum additional contribution allowed this year
 */
export function getAvailableAnnualContribution(yearToDateContributions: number): number {
  const remaining = CPF_CONFIG_2025.wageCeilings.annualCPFLimit - yearToDateContributions;
  return Math.max(0, remaining);
}

/**
 * Calculate CPF contribution for a given month
 * Handles wage ceilings and annual limits
 *
 * @param monthlySalary - Gross monthly salary
 * @param age - Age during this month
 * @param yearToDateContributions - Total CPF contributions this calendar year (before this month)
 * @returns CPF contribution breakdown
 */
export function calculateCPFContribution(
  monthlySalary: number,
  age: number,
  yearToDateContributions: number = 0
): CPFContribution {
  // Apply monthly wage ceiling
  const cpfEligibleWage = applyCPFWageCeiling(monthlySalary);

  // Get rates for this age
  const contributionRate = getContributionRate(age);
  const allocationRate = getAllocationRate(age);

  // Calculate gross contributions
  let employeeContribution = cpfEligibleWage * contributionRate.employeeRate;
  let employerContribution = cpfEligibleWage * contributionRate.employerRate;
  let totalContribution = employeeContribution + employerContribution;

  // Apply annual limit
  const availableAnnualContribution = getAvailableAnnualContribution(yearToDateContributions);
  if (totalContribution > availableAnnualContribution) {
    // Pro-rate employee and employer contributions
    const scaleFactor = availableAnnualContribution / totalContribution;
    employeeContribution *= scaleFactor;
    employerContribution *= scaleFactor;
    totalContribution = availableAnnualContribution;
  }

  // Allocate to accounts
  const allocation = allocateContributions(totalContribution, allocationRate);

  // Round to 2 decimal places
  return {
    employee: Math.round(employeeContribution * 100) / 100,
    employer: Math.round(employerContribution * 100) / 100,
    total: Math.round(totalContribution * 100) / 100,
    allocation: {
      toOA: Math.round(allocation.toOA * 100) / 100,
      toSA: Math.round(allocation.toSA * 100) / 100,
      toMA: Math.round(allocation.toMA * 100) / 100,
      toRA: Math.round(allocation.toRA * 100) / 100
    }
  };
}

/**
 * Allocate total contribution to accounts based on allocation rates
 */
function allocateContributions(
  totalContribution: number,
  allocationRate: CPFAllocationRate
): { toOA: number; toSA: number; toMA: number; toRA: number } {
  return {
    toOA: totalContribution * allocationRate.ordinaryAccount,
    toSA: totalContribution * allocationRate.specialAccount,
    toMA: totalContribution * allocationRate.medisaveAccount,
    toRA: totalContribution * allocationRate.retirementAccount
  };
}

/**
 * Calculate age at a specific month index
 *
 * @param currentAge - Starting age
 * @param monthIndex - Months from now (0 = current month)
 * @returns Age at that month
 */
export function getAgeAtMonth(currentAge: number, monthIndex: number): number {
  return currentAge + Math.floor(monthIndex / 12);
}

/**
 * Detect if year boundary is crossed (for resetting annual contribution tracking)
 *
 * @param monthIndex - Current month index
 * @returns true if this is January (new year)
 */
export function isNewYear(monthIndex: number): boolean {
  // Assuming monthIndex 0 = current month, check if we're at a January
  const currentMonth = new Date().getMonth(); // 0-11
  const targetMonth = (currentMonth + monthIndex) % 12;
  return targetMonth === 0 && monthIndex > 0;
}
```

**2. Integration with Income Store**

Update `src/stores/income.ts` to identify salary income sources:

```typescript
// Add computed property to detect salary income
const hasSalaryIncome = computed(() => {
  return incomeSources.value.some(source =>
    source.type === 'salary' &&
    source.amount > 0
  );
});

// Add helper to get total monthly salary
const totalMonthlySalary = computed(() => {
  return incomeSources.value
    .filter(source => source.type === 'salary')
    .reduce((sum, source) => sum + convertToMonthly(source.amount, source.frequency), 0);
});
```

#### Key Criteria Met
- Accurate contribution calculation for all 5 age brackets (≤55, 56-60, 61-65, 66-70, >70)
- Monthly wage ceiling enforced ($7,400)
- Annual contribution limit enforced ($37,740)
- Proper allocation to OA/SA/MA/RA based on 8 age-specific allocation rates
- Age progression handled correctly (contributions change as user ages)
- Year-to-date tracking for annual limit enforcement
- Clean separation of concerns (contribution vs allocation logic)

#### Testing Requirements (25-30 tests)

**Test File: `src/utils/cpfContributions.test.ts`**

```typescript
describe('CPF Contributions', () => {
  describe('getContributionRate', () => {
    test('returns correct rate for age 30 (≤55 bracket)')
    test('returns correct rate for age 55 (boundary)')
    test('returns correct rate for age 58 (56-60 bracket)')
    test('returns correct rate for age 63 (61-65 bracket)')
    test('returns correct rate for age 68 (66-70 bracket)')
    test('returns correct rate for age 75 (>70 bracket)')
    test('throws error for invalid age')
  });

  describe('getAllocationRate', () => {
    test('allocates correctly for age 30 (OA 62.17%, SA 16.21%, MA 21.62%)')
    test('allocates correctly for age 40 (OA 56.77%, SA 18.91%, MA 24.32%)')
    test('allocates correctly for age 48 (OA 51.36%, SA 21.62%, MA 27.02%)')
    test('allocates correctly for age 53 (OA 40.55%, SA 31.08%, MA 28.37%)')
    test('allocates to RA for age 58 (after 55)')
    test('allocation percentages sum to 100%')
  });

  describe('applyCPFWageCeiling', () => {
    test('does not cap salary below ceiling ($5000)')
    test('caps salary at ceiling ($7400)')
    test('caps salary above ceiling ($10000 → $7400)')
    test('handles edge case at exactly $7400')
  });

  describe('getAvailableAnnualContribution', () => {
    test('returns full limit when no contributions yet')
    test('returns remaining limit when partially contributed')
    test('returns 0 when limit reached')
    test('returns 0 when limit exceeded')
  });

  describe('calculateCPFContribution', () => {
    // Basic contribution tests
    test('calculates correctly for $5000 salary, age 30')
    test('employee contribution is 20% of eligible wage (age ≤55)')
    test('employer contribution is 17% of eligible wage (age ≤55)')
    test('total is sum of employee and employer')

    // Wage ceiling tests
    test('applies wage ceiling for high salary ($10000)')
    test('contribution does not exceed max monthly amount')

    // Annual limit tests
    test('applies annual limit when year-to-date is near limit')
    test('stops contribution when annual limit reached')
    test('pro-rates employee and employer when hitting annual limit')

    // Allocation tests
    test('allocates to correct accounts for age 30')
    test('allocates to RA for age 58 (post-55)')
    test('allocation amounts sum to total contribution')

    // Age bracket transitions
    test('contribution changes at age 56 (55→56 boundary)')
    test('contribution changes at age 61 (60→61 boundary)')

    // Edge cases
    test('handles zero salary')
    test('handles very small salary ($100)')
    test('rounds to 2 decimal places')
  });

  describe('getAgeAtMonth', () => {
    test('age 30 at month 0 is 30')
    test('age 30 at month 12 is 31')
    test('age 30 at month 11 is still 30')
    test('age 54 at month 13 crosses to 55')
  });

  describe('isNewYear', () => {
    test('returns true at January boundaries')
    test('returns false in middle of year')
    test('handles December to January transition')
  });
});
```

#### Implementation Notes
- **Wage ceiling priority**: Monthly ceiling ($7,400) is checked first, then annual limit ($37,740)
- **Annual limit tracking**: Must track calendar year (Jan-Dec), not rolling 12 months
- **Age transitions**: When user ages from 55 to 56 mid-year, contribution rates change immediately
- **Rounding**: All monetary values rounded to 2 decimal places to match CPF precision
- **Edge case**: If salary > $102,000/year with bonuses, both monthly and annual limits may apply
- **Future enhancement**: Consider 2026 rate increases (already documented in CPF_INFO.md)

---

### Milestone 3: Interest Calculations & Account Growth

#### Objective
Implement accurate interest calculations for all CPF accounts, including extra interest tiers. Track account balances month-by-month as they grow from contributions and compound interest.

#### Deliverables

**1. Interest Calculation Utilities (`src/utils/cpfInterest.ts`)**

```typescript
import { CPF_CONFIG_2025 } from './cpfConfig';
import type { CPFAccounts } from '@/types';

/**
 * Calculate monthly interest for all CPF accounts
 * OA: 2.5% p.a.
 * SA/MA/RA (SMRA): 4.0% p.a.
 *
 * @param accounts - Current account balances
 * @param age - Current age (for determining account eligibility)
 * @returns Monthly interest for each account
 */
export function calculateMonthlyInterest(
  accounts: CPFAccounts,
  age: number
): {
  oa: number;
  sa: number;
  ma: number;
  ra: number;
  total: number;
} {
  const { interestRates } = CPF_CONFIG_2025;

  // Monthly interest rate = annual rate / 12
  const monthlyOARate = interestRates.ordinaryAccount / 12;
  const monthlySMRARate = interestRates.specialAccount / 12; // Same for SA/MA/RA

  const oaInterest = accounts.ordinaryAccount * monthlyOARate;

  // SA only exists before age 55
  const saInterest = age < 55 ? accounts.specialAccount * monthlySMRARate : 0;

  const maInterest = accounts.medisaveAccount * monthlySMRARate;

  // RA only exists from age 55 onwards
  const raInterest = age >= 55 ? accounts.retirementAccount * monthlySMRARate : 0;

  return {
    oa: Math.round(oaInterest * 100) / 100,
    sa: Math.round(saInterest * 100) / 100,
    ma: Math.round(maInterest * 100) / 100,
    ra: Math.round(raInterest * 100) / 100,
    total: Math.round((oaInterest + saInterest + maInterest + raInterest) * 100) / 100
  };
}

/**
 * Calculate extra interest earned
 * Under 55: +1% on first $60k (capped at $20k from OA)
 * 55 and above: +2% on first $30k, +1% on next $30k
 *
 * @param accounts - Current account balances
 * @param age - Current age
 * @returns Monthly extra interest amount
 */
export function calculateExtraInterest(
  accounts: CPFAccounts,
  age: number
): number {
  const { extraInterest } = CPF_CONFIG_2025.interestRates;

  if (age < 55) {
    return calculateExtraInterestUnder55(accounts, extraInterest.under55);
  } else {
    return calculateExtraInterestAge55Plus(accounts, extraInterest.age55Plus);
  }
}

/**
 * Extra interest for members under 55
 * +1% on first $60k of combined balances (capped at $20k from OA)
 */
function calculateExtraInterestUnder55(
  accounts: CPFAccounts,
  config: { rate: number; balanceCap: number; oaCap: number }
): number {
  // Calculate eligible balances
  const oaEligible = Math.min(accounts.ordinaryAccount, config.oaCap);
  const smaEligible = Math.min(
    accounts.specialAccount + accounts.medisaveAccount,
    config.balanceCap - oaEligible
  );

  const totalEligible = oaEligible + smaEligible;
  const cappedEligible = Math.min(totalEligible, config.balanceCap);

  // Monthly extra interest = annual rate / 12
  const monthlyExtraRate = config.rate / 12;
  const extraInterest = cappedEligible * monthlyExtraRate;

  return Math.round(extraInterest * 100) / 100;
}

/**
 * Extra interest for members 55 and above
 * +2% on first $30k, +1% on next $30k (total up to $60k)
 */
function calculateExtraInterestAge55Plus(
  accounts: CPFAccounts,
  config: { firstTier: { rate: number; cap: number }; secondTier: { rate: number; cap: number } }
): number {
  // Combined balances across all accounts
  const totalBalance =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  // First tier: +2% on first $30k
  const firstTierBalance = Math.min(totalBalance, config.firstTier.cap);
  const firstTierRate = config.firstTier.rate / 12;
  const firstTierInterest = firstTierBalance * firstTierRate;

  // Second tier: +1% on next $30k
  const remainingBalance = Math.max(0, totalBalance - config.firstTier.cap);
  const secondTierBalance = Math.min(remainingBalance, config.secondTier.cap);
  const secondTierRate = config.secondTier.rate / 12;
  const secondTierInterest = secondTierBalance * secondTierRate;

  const totalExtraInterest = firstTierInterest + secondTierInterest;
  return Math.round(totalExtraInterest * 100) / 100;
}

/**
 * Apply interest to accounts (updates balances in place)
 * This combines base interest + extra interest
 *
 * @param accounts - Account balances to update
 * @param age - Current age
 * @returns Updated accounts object
 */
export function applyMonthlyInterest(
  accounts: CPFAccounts,
  age: number
): CPFAccounts {
  const baseInterest = calculateMonthlyInterest(accounts, age);
  const extraInterest = calculateExtraInterest(accounts, age);

  // Distribute extra interest proportionally based on account balances
  // (CPF distributes extra interest to accounts proportionally)
  const totalBalance =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  if (totalBalance === 0) {
    return accounts; // No interest if no balance
  }

  // Allocate extra interest proportionally
  const oaShare = accounts.ordinaryAccount / totalBalance;
  const saShare = accounts.specialAccount / totalBalance;
  const maShare = accounts.medisaveAccount / totalBalance;
  const raShare = accounts.retirementAccount / totalBalance;

  return {
    ordinaryAccount: Math.round(
      (accounts.ordinaryAccount + baseInterest.oa + extraInterest * oaShare) * 100
    ) / 100,
    specialAccount: Math.round(
      (accounts.specialAccount + baseInterest.sa + extraInterest * saShare) * 100
    ) / 100,
    medisaveAccount: Math.round(
      (accounts.medisaveAccount + baseInterest.ma + extraInterest * maShare) * 100
    ) / 100,
    retirementAccount: Math.round(
      (accounts.retirementAccount + baseInterest.ra + extraInterest * raShare) * 100
    ) / 100
  };
}

/**
 * Calculate effective interest rate including extra interest
 * Useful for displaying to users
 */
export function getEffectiveInterestRate(
  accounts: CPFAccounts,
  age: number
): {
  oa: number;
  smra: number;
  effective: number; // Weighted average
} {
  const { interestRates } = CPF_CONFIG_2025;

  // Calculate what 1 year of interest would be
  const yearlyBaseInterest = calculateAnnualInterest(accounts, age);
  const yearlyExtraInterest = calculateExtraInterest(accounts, age) * 12;

  const totalBalance =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  const effectiveRate = totalBalance > 0
    ? (yearlyBaseInterest + yearlyExtraInterest) / totalBalance
    : 0;

  return {
    oa: interestRates.ordinaryAccount,
    smra: interestRates.specialAccount,
    effective: Math.round(effectiveRate * 10000) / 10000 // 4 decimal places
  };
}

/**
 * Helper: Calculate annual interest (for effective rate calculation)
 */
function calculateAnnualInterest(accounts: CPFAccounts, age: number): number {
  const { interestRates } = CPF_CONFIG_2025;

  const oaInterest = accounts.ordinaryAccount * interestRates.ordinaryAccount;
  const saInterest = age < 55 ? accounts.specialAccount * interestRates.specialAccount : 0;
  const maInterest = accounts.medisaveAccount * interestRates.medisaveAccount;
  const raInterest = age >= 55 ? accounts.retirementAccount * interestRates.retirementAccount : 0;

  return oaInterest + saInterest + maInterest + raInterest;
}
```

**2. Update Monthly Projections**

Modify `src/utils/monthlyProjections.ts` to include CPF account tracking:

```typescript
// Import CPF utilities
import { calculateCPFContribution } from './cpfContributions';
import { applyMonthlyInterest, calculateExtraInterest, calculateMonthlyInterest } from './cpfInterest';

// In generateMonthlyProjections function:
// Add CPF tracking if CPF is enabled
if (cpfStore.enabled) {
  const cpfAccounts = { ...cpfStore.currentBalances };
  let yearToDateCPFContributions = 0;

  // For each month:
  // 1. Calculate CPF contribution from salary
  // 2. Add contribution to accounts
  // 3. Apply monthly interest
  // 4. Track year-to-date for annual limit
  // 5. Reset year-to-date in January

  // (Implementation in Milestone 5)
}
```

#### Key Criteria Met
- Correct base interest rates (OA 2.5%, SMRA 4.0%)
- Extra interest tiers implemented correctly:
  - Under 55: +1% on first $60k (max $20k from OA)
  - 55+: +2% on first $30k, +1% on next $30k
- Interest compounds monthly
- Effective interest rates can reach up to 6% for age 55+
- SA earns no interest after age 55 (closed)
- RA earns interest from age 55 onwards
- All calculations rounded to 2 decimal places

#### Testing Requirements (20-25 tests)

**Test File: `src/utils/cpfInterest.test.ts`**

```typescript
describe('CPF Interest', () => {
  describe('calculateMonthlyInterest', () => {
    test('OA earns 2.5% annual (0.208% monthly)')
    test('SA earns 4.0% annual for age under 55')
    test('SA earns 0% for age 55 and above')
    test('MA earns 4.0% annual')
    test('RA earns 4.0% annual for age 55+')
    test('RA earns 0% for age under 55')
    test('total interest sums all accounts')
    test('handles zero balances')
  });

  describe('calculateExtraInterest - Under 55', () => {
    test('earns +1% on $60k total balance')
    test('caps OA contribution at $20k')
    test('uses SMA balances after OA cap')
    test('caps total at $60k')
    test('handles balance below $60k')
    test('handles zero balance')
    test('OA-only: $20k OA earns extra interest')
    test('OA-only: $40k OA capped at $20k extra interest')
    test('Mixed: $10k OA + $50k SA = $60k eligible')
    test('Mixed: $5k OA + $70k SA = capped at $60k')
  });

  describe('calculateExtraInterest - Age 55+', () => {
    test('earns +2% on first $30k')
    test('earns +1% on next $30k')
    test('caps at $60k total')
    test('handles balance below $30k (only first tier)')
    test('handles balance between $30k-$60k (both tiers)')
    test('handles balance above $60k (capped)')
    test('uses combined balance from all accounts')
    test('handles zero balance')
  });

  describe('applyMonthlyInterest', () => {
    test('applies base + extra interest correctly')
    test('updates all account balances')
    test('distributes extra interest proportionally')
    test('handles accounts with zero balance')
    test('rounds to 2 decimal places')
  });

  describe('getEffectiveInterestRate', () => {
    test('calculates effective rate with extra interest')
    test('effective rate up to 5% for under 55')
    test('effective rate up to 6% for age 55+')
    test('returns base rates when balance is zero')
    test('weighted average reflects account distribution')
  });

  describe('Interest compounding', () => {
    test('interest compounds over 12 months')
    test('compound interest > simple interest over time')
    test('effective rate matches advertised rate')
  });
});
```

#### Implementation Notes
- **Interest crediting**: CPF credits interest monthly (paid quarterly but calculated monthly)
- **Extra interest distribution**: Proportionally allocated to accounts based on balances
- **Compounding**: Each month's interest is added to principal before next month's calculation
- **Precision**: Use 2 decimal places for all monetary values (CPF standard)
- **Performance**: Interest calculations are lightweight, no optimization needed
- **Future enhancement**: Interest rates change quarterly - consider adding rate change support

---

### Milestone 4: Age 55 Transitions & Retirement Sums

#### Objective
Handle the critical age 55 transition where Special Account closes, Retirement Account opens, and funds are transferred to meet retirement sum requirements. Implement withdrawal rules and retirement sum tracking.

#### Deliverables

**1. Transition Logic (`src/utils/cpfTransitions.ts`)**

```typescript
import { CPF_CONFIG_2025 } from './cpfConfig';
import type { CPFAccounts } from '@/types';

/**
 * Handle age 55 transition
 * - Close Special Account (SA)
 * - Open Retirement Account (RA)
 * - Transfer funds from SA and OA to RA up to Full Retirement Sum
 * - Remaining funds stay in OA
 *
 * @param accounts - Current account balances (before transition)
 * @param retirementSumTarget - User's target: 'basic', 'full', or 'enhanced'
 * @returns Updated accounts after transition
 */
export function handleAge55Transition(
  accounts: CPFAccounts,
  retirementSumTarget: 'basic' | 'full' | 'enhanced' = 'full'
): {
  accounts: CPFAccounts;
  transferred: {
    fromSA: number;
    fromOA: number;
    total: number;
  };
  withdrawable: number;
} {
  // Get retirement sum based on target
  const targetSum = getRetirementSum(retirementSumTarget);

  // Calculate how much to transfer to RA
  let amountToTransfer = targetSum;
  let transferredFromSA = 0;
  let transferredFromOA = 0;

  // Step 1: Transfer SA balance first
  if (accounts.specialAccount > 0) {
    transferredFromSA = Math.min(accounts.specialAccount, amountToTransfer);
    amountToTransfer -= transferredFromSA;
  }

  // Step 2: Transfer from OA if needed to reach target
  if (amountToTransfer > 0 && accounts.ordinaryAccount > 0) {
    transferredFromOA = Math.min(accounts.ordinaryAccount, amountToTransfer);
    amountToTransfer -= transferredFromOA;
  }

  // Calculate new balances
  const newRA = accounts.retirementAccount + transferredFromSA + transferredFromOA;
  const newOA = accounts.ordinaryAccount - transferredFromOA;
  const newSA = 0; // SA is closed

  // Withdrawable amount: anything in OA above what's needed for FRS
  // User can withdraw $5,000 or everything above FRS, whichever is more
  const frs = getRetirementSum('full');
  const excessAboveFRS = Math.max(0, accounts.ordinaryAccount + accounts.specialAccount - frs);
  const withdrawable = Math.max(5000, excessAboveFRS);

  return {
    accounts: {
      ordinaryAccount: newOA,
      specialAccount: newSA,
      medisaveAccount: accounts.medisaveAccount, // Unchanged
      retirementAccount: newRA
    },
    transferred: {
      fromSA: Math.round(transferredFromSA * 100) / 100,
      fromOA: Math.round(transferredFromOA * 100) / 100,
      total: Math.round((transferredFromSA + transferredFromOA) * 100) / 100
    },
    withdrawable: Math.round(withdrawable * 100) / 100
  };
}

/**
 * Get retirement sum amount based on target
 */
export function getRetirementSum(target: 'basic' | 'full' | 'enhanced'): number {
  const { retirementSums } = CPF_CONFIG_2025;

  switch (target) {
    case 'basic':
      return retirementSums.basic;
    case 'full':
      return retirementSums.full;
    case 'enhanced':
      return retirementSums.enhanced;
    default:
      return retirementSums.full;
  }
}

/**
 * Calculate progress toward retirement sum
 *
 * @param raBalance - Current RA balance
 * @param target - Target retirement sum
 * @returns Progress information
 */
export function calculateRetirementSumProgress(
  raBalance: number,
  target: 'basic' | 'full' | 'enhanced'
): {
  target: number;
  current: number;
  shortfall: number;
  percentageComplete: number;
  isMet: boolean;
} {
  const targetAmount = getRetirementSum(target);
  const shortfall = Math.max(0, targetAmount - raBalance);
  const percentageComplete = Math.min(100, (raBalance / targetAmount) * 100);

  return {
    target: targetAmount,
    current: Math.round(raBalance * 100) / 100,
    shortfall: Math.round(shortfall * 100) / 100,
    percentageComplete: Math.round(percentageComplete * 100) / 100,
    isMet: raBalance >= targetAmount
  };
}

/**
 * Calculate withdrawable amount at age 55
 * User can withdraw $5,000 or amount above FRS, whichever is higher
 *
 * @param accounts - Account balances at age 55 (after transition)
 * @param hasProperty - Whether user owns property (affects withdrawal rules)
 * @returns Withdrawable amount
 */
export function calculateAge55Withdrawal(
  accounts: CPFAccounts,
  hasProperty: boolean = false
): {
  minimum: number; // $5,000 minimum
  excessAboveFRS: number; // Amount above FRS
  withdrawable: number; // Max of the two
  canWithdraw: boolean;
} {
  const frs = getRetirementSum('full');
  const totalCPF =
    accounts.ordinaryAccount +
    accounts.specialAccount +
    accounts.medisaveAccount +
    accounts.retirementAccount;

  const minimum = 5000;
  const excessAboveFRS = Math.max(0, accounts.ordinaryAccount); // Excess stays in OA
  const withdrawable = Math.max(minimum, excessAboveFRS);
  const canWithdraw = totalCPF >= minimum;

  return {
    minimum: Math.round(minimum * 100) / 100,
    excessAboveFRS: Math.round(excessAboveFRS * 100) / 100,
    withdrawable: Math.round(withdrawable * 100) / 100,
    canWithdraw
  };
}

/**
 * Handle post-55 monthly contributions
 * After age 55, contributions go to RA up to FRS, then to OA
 *
 * @param accounts - Current account balances
 * @param contribution - Monthly CPF contribution breakdown
 * @returns Updated accounts
 */
export function applyPost55Contribution(
  accounts: CPFAccounts,
  contribution: { toOA: number; toSA: number; toMA: number; toRA: number }
): CPFAccounts {
  const frs = getRetirementSum('full');

  // All RA allocation goes to RA up to FRS
  let amountForRA = contribution.toRA;
  let amountForOA = contribution.toOA;

  // If RA would exceed FRS, overflow goes to OA
  const raAfterContribution = accounts.retirementAccount + amountForRA;
  if (raAfterContribution > frs) {
    const overflow = raAfterContribution - frs;
    amountForRA -= overflow;
    amountForOA += overflow;
  }

  return {
    ordinaryAccount: accounts.ordinaryAccount + amountForOA,
    specialAccount: accounts.specialAccount, // Always 0 after age 55
    medisaveAccount: accounts.medisaveAccount + contribution.toMA,
    retirementAccount: accounts.retirementAccount + amountForRA
  };
}

/**
 * Check if user has met retirement sum requirement
 */
export function hasMetRetirementSum(
  raBalance: number,
  target: 'basic' | 'full' | 'enhanced'
): boolean {
  const targetAmount = getRetirementSum(target);
  return raBalance >= targetAmount;
}

/**
 * Get Basic Healthcare Sum
 */
export function getBasicHealthcareSum(): number {
  return CPF_CONFIG_2025.retirementSums.basicHealthcare;
}

/**
 * Check if MediSave has met BHS
 */
export function hasMetBasicHealthcareSum(maBalance: number): boolean {
  const bhs = getBasicHealthcareSum();
  return maBalance >= bhs;
}
```

#### Key Criteria Met
- SA automatically closes at age 55
- RA created and funded from SA first, then OA
- Retirement sum targets correctly implemented (BRS $106,500, FRS $213,000, ERS $426,000)
- Withdrawal rules enforced ($5,000 minimum)
- Post-55 contributions go to RA up to FRS, overflow to OA
- Retirement sum progress tracking
- BHS tracking for MediSave ($75,500)

#### Testing Requirements (20-25 tests)

**Test File: `src/utils/cpfTransitions.test.ts`**

```typescript
describe('CPF Age 55 Transitions', () => {
  describe('handleAge55Transition', () => {
    test('closes SA and opens RA')
    test('transfers SA balance to RA first')
    test('transfers from OA if SA insufficient for FRS')
    test('leaves excess in OA after meeting FRS')
    test('handles insufficient balance to meet BRS')
    test('handles exactly FRS balance')
    test('handles balance exceeding ERS')
    test('calculates withdrawable amount correctly')
    test('minimum withdrawal is $5,000')

    // Different retirement sum targets
    test('BRS target: transfers $106,500')
    test('FRS target: transfers $213,000')
    test('ERS target: transfers $426,000')

    // Edge cases
    test('handles zero SA balance')
    test('handles zero OA balance')
    test('handles both SA and OA zero')
  });

  describe('getRetirementSum', () => {
    test('returns BRS: $106,500')
    test('returns FRS: $213,000')
    test('returns ERS: $426,000')
    test('defaults to FRS for invalid input')
  });

  describe('calculateRetirementSumProgress', () => {
    test('calculates shortfall correctly')
    test('calculates percentage complete')
    test('marks as met when balance >= target')
    test('marks as not met when balance < target')
    test('handles zero balance')
    test('handles balance exceeding target (100%+)')
  });

  describe('calculateAge55Withdrawal', () => {
    test('minimum withdrawal is $5,000')
    test('can withdraw amount above FRS')
    test('withdrawable is max of minimum and excess')
    test('cannot withdraw if total CPF < $5,000')
    test('handles exactly $5,000 balance')
  });

  describe('applyPost55Contribution', () => {
    test('RA contributions go to RA when below FRS')
    test('RA contributions overflow to OA when RA >= FRS')
    test('OA contributions always go to OA')
    test('MA contributions always go to MA')
    test('SA remains 0 after age 55')
  });

  describe('hasMetRetirementSum', () => {
    test('returns true when RA >= target')
    test('returns false when RA < target')
    test('works for all three targets (BRS/FRS/ERS)')
  });

  describe('Basic Healthcare Sum', () => {
    test('BHS is $75,500')
    test('hasMetBasicHealthcareSum returns true when MA >= BHS')
    test('hasMetBasicHealthcareSum returns false when MA < BHS')
  });
});
```

#### Implementation Notes
- **Transition timing**: Occurs in the month user turns 55
- **One-time event**: Transition happens once, tracked by RA balance becoming non-zero
- **Property pledge**: Optional feature for future enhancement (allows using property value toward FRS)
- **FRS overflow**: After RA reaches FRS, excess contributions go to OA (more flexible for withdrawal)
- **Withdrawal strategy**: Users may choose to withdraw at 55 or leave in RA for higher CPF Life payouts
- **BHS tracking**: Important for MediSave adequacy, displayed in results

---

### Milestone 5: System Integration

#### Objective
Integrate CPF calculations into the existing month-by-month projection system. Connect salary income sources to CPF contributions, handle housing loan OA usage, and ensure CPF accounts are tracked alongside the investment portfolio.

#### Deliverables

**1. Modify Core Calculation Engine (`src/utils/calculations.ts`)**

```typescript
import { useCPFStore } from '@/stores/cpf';
import { calculateCPFContribution, getAgeAtMonth, isNewYear } from './cpfContributions';
import { applyMonthlyInterest } from './cpfInterest';
import { handleAge55Transition, applyPost55Contribution } from './cpfTransitions';

// In calculateFutureValueWithIncomeSources():

const cpfStore = useCPFStore();
const cpfEnabled = cpfStore.enabled;

// Initialize CPF tracking
let cpfAccounts: CPFAccounts = cpfEnabled
  ? { ...cpfStore.currentBalances }
  : { ordinaryAccount: 0, specialAccount: 0, medisaveAccount: 0, retirementAccount: 0 };

let yearToDateCPFContributions = 0;
let hasCompletedAge55Transition = cpfAccounts.retirementAccount > 0;

// For each month in projection:
for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
  const age = currentAge + Math.floor(monthIndex / 12);

  // Reset year-to-date contributions in January
  if (isNewYear(monthIndex) && monthIndex > 0) {
    yearToDateCPFContributions = 0;
  }

  // Check for age 55 transition
  if (age >= 55 && !hasCompletedAge55Transition) {
    const transition = handleAge55Transition(cpfAccounts, cpfStore.retirementSumTarget);
    cpfAccounts = transition.accounts;
    hasCompletedAge55Transition = true;
  }

  // Calculate monthly income from all sources
  const monthlyIncome = calculateMonthlyIncomeForMonth(incomeSources, monthIndex);

  // Separate salary income for CPF calculation
  const salaryIncome = incomeSources
    .filter(source => source.type === 'salary' && isIncomeActiveThisMonth(source, monthIndex))
    .reduce((sum, source) => sum + convertToMonthly(source.amount, source.frequency), 0);

  // Calculate CPF contribution if enabled and has salary
  let cpfContribution = { employee: 0, employer: 0, total: 0, allocation: { toOA: 0, toSA: 0, toMA: 0, toRA: 0 } };
  let takeHomeSalary = salaryIncome;

  if (cpfEnabled && salaryIncome > 0) {
    cpfContribution = calculateCPFContribution(salaryIncome, age, yearToDateCPFContributions);
    takeHomeSalary = salaryIncome - cpfContribution.employee; // Employee contribution reduces take-home
    yearToDateCPFContributions += cpfContribution.total;

    // Add contributions to CPF accounts
    if (age >= 55) {
      cpfAccounts = applyPost55Contribution(cpfAccounts, cpfContribution.allocation);
    } else {
      cpfAccounts.ordinaryAccount += cpfContribution.allocation.toOA;
      cpfAccounts.specialAccount += cpfContribution.allocation.toSA;
      cpfAccounts.medisaveAccount += cpfContribution.allocation.toMA;
    }
  }

  // Calculate monthly expenses including loans
  const monthlyExpenses = calculateMonthlyExpenses(expenses, loans, oneTimeExpenses, monthIndex);

  // Check if housing loan payment can use OA
  const housingLoanPayment = loans
    .filter(loan => loan.category === 'housing' && isLoanActiveThisMonth(loan, monthIndex))
    .reduce((sum, loan) => sum + getLoanPaymentForMonth(loan, monthIndex), 0);

  // Use OA for housing loan payment if available
  let oaUsedForHousing = 0;
  if (cpfEnabled && housingLoanPayment > 0) {
    oaUsedForHousing = Math.min(cpfAccounts.ordinaryAccount, housingLoanPayment);
    cpfAccounts.ordinaryAccount -= oaUsedForHousing;
    cpfStore.updateHousingUsage(cpfStore.housingUsage + oaUsedForHousing);
  }

  // Net cash flow to investment portfolio
  // = Take-home salary + other income - expenses - (housing loan - OA usage)
  const otherIncome = monthlyIncome - salaryIncome;
  const expensesNotCoveredByOA = monthlyExpenses - oaUsedForHousing;
  const netCashFlow = takeHomeSalary + otherIncome - expensesNotCoveredByOA;

  // Apply to portfolio
  portfolioValue += netCashFlow;
  portfolioValue *= (1 + monthlyReturnRate); // Investment growth

  // Apply CPF interest
  if (cpfEnabled) {
    cpfAccounts = applyMonthlyInterest(cpfAccounts, age);
  }

  // Store monthly data point (updated in monthlyProjections.ts)
}
```

**2. Update Monthly Projections (`src/utils/monthlyProjections.ts`)**

```typescript
// Add CPF snapshot to MonthlyDataPoint
export interface MonthlyDataPoint {
  // ... existing fields
  cpf?: CPFMonthlySnapshot;
}

// In generateMonthlyProjections():
// Track CPF data for each month
if (cpfEnabled) {
  dataPoint.cpf = {
    monthIndex,
    age,
    accounts: { ...cpfAccounts },
    monthlyContribution: cpfContribution,
    monthlyInterest: {
      ...calculateMonthlyInterest(cpfAccounts, age),
      extraInterest: calculateExtraInterest(cpfAccounts, age),
      total: /* sum of all interest */
    },
    housingUsage: cpfStore.housingUsage,
    yearToDateContributions
  };
}
```

**3. Update Validation (`src/utils/calculations.ts`)**

```typescript
// Add CPF validation
if (cpfEnabled && !cpfStore.manualOverride) {
  // Validate initial balances are non-negative
  if (Object.values(cpfAccounts).some(balance => balance < 0)) {
    errors.push({
      field: 'cpfAccounts',
      message: 'CPF account balances cannot be negative'
    });
  }

  // Warn if no salary income
  const hasSalaryIncome = incomeStore.incomeSources.some(s => s.type === 'salary');
  if (!hasSalaryIncome) {
    errors.push({
      field: 'cpfIncome',
      message: 'CPF is enabled but no salary income source found'
    });
  }
}
```

**4. Update Retirement Store (`src/stores/retirement.ts`)**

```typescript
// Add CPF store to computed userData
const userData = computed((): UserData => ({
  // ... existing fields
  cpf: cpfStore.enabled ? cpfStore.cpfData : undefined
}));
```

#### Key Criteria Met
- Salary income automatically triggers CPF contributions
- Employee CPF contribution reduces take-home pay (employer portion doesn't affect cash flow)
- CPF accounts tracked separately from investment portfolio
- Housing loan payments can use OA funds (reduces OA balance, increases housing usage)
- Month-by-month projections include CPF account balances
- Age 55 transition handled automatically during projection
- Annual CPF limit enforced across calendar year
- CPF interest applied monthly after contributions

#### Testing Requirements (30-35 tests)

**Test File: `src/phase6-integration.test.ts`**

```typescript
describe('Phase 6: CPF Integration', () => {
  describe('CPF Store Integration', () => {
    test('CPF store initializes correctly')
    test('CPF can be enabled/disabled')
    test('Initial balances can be set')
    test('Retirement sum target can be selected')
  });

  describe('Salary Income → CPF Flow', () => {
    test('salary income triggers CPF contribution')
    test('employee contribution reduces take-home pay')
    test('employer contribution does not affect cash flow')
    test('non-salary income does not trigger CPF')
    test('multiple salary sources combine for CPF calculation')
    test('CPF contributions stop when income ends')
  });

  describe('CPF Contribution → Account Allocation', () => {
    test('contributions allocated to OA/SA/MA for age 30')
    test('contributions allocated to OA/RA/MA for age 58')
    test('allocation changes at age boundaries')
    test('contributions accumulate in correct accounts')
  });

  describe('CPF Interest Integration', () => {
    test('interest applied monthly to all accounts')
    test('extra interest calculated correctly')
    test('interest compounds over multiple months')
    test('effective interest rate displayed in results')
  });

  describe('Age 55 Transition Integration', () => {
    test('SA closes and RA opens at age 55')
    test('funds transferred to meet retirement sum target')
    test('transition happens only once')
    test('post-55 contributions go to RA')
  });

  describe('Housing Loan OA Usage', () => {
    test('housing loan payment uses OA if available')
    test('OA balance reduces when used for housing')
    test('housing usage tracked in CPF store')
    test('partial OA usage when balance insufficient')
    test('no OA usage for non-housing loans')
  });

  describe('Monthly Projections with CPF', () => {
    test('monthly data includes CPF snapshot')
    test('CPF accounts show growth over time')
    test('contributions and interest tracked separately')
    test('year-to-date contributions tracked')
  });

  describe('Validation', () => {
    test('warns if CPF enabled but no salary income')
    test('validates non-negative account balances')
    test('allows disabling CPF')
    test('validates retirement sum target')
  });

  describe('Edge Cases', () => {
    test('handles zero salary income')
    test('handles income starting mid-projection')
    test('handles income ending before retirement')
    test('handles wage ceiling correctly')
    test('handles annual limit correctly')
    test('handles multiple age transitions')
  });

  describe('Export/Import with CPF', () => {
    test('exports include CPF data')
    test('imports restore CPF data correctly')
    test('handles legacy data without CPF')
    test('validates CPF data on import')
  });
});
```

#### Implementation Notes
- **Cash flow logic**: Only employee CPF contribution reduces cash available for portfolio investment
- **Employer contribution**: Comes from employer, not user's cash, so doesn't affect portfolio
- **OA for housing**: Optional feature - user can choose to use OA or cash for housing loans
- **Housing usage tracking**: Accumulates over time, displayed in results (important for knowing OA depletion)
- **CPF vs Portfolio**: CPF accounts are separate from investment portfolio, both shown in visualizations
- **Performance**: Month-by-month calculation already exists, adding CPF adds minimal overhead

---

### Milestone 6: Post-Retirement & CPF Life

#### Objective
Model post-retirement CPF behavior including CPF Life annuity payouts, RA drawdown, and continued contributions if working past retirement age. Integrate CPF Life income into sustainability calculations.

#### Deliverables

**1. CPF Life Calculations (`src/utils/cpfLife.ts`)**

```typescript
import { CPF_CONFIG_2025 } from './cpfConfig';

/**
 * Estimate CPF Life monthly payout based on RA balance
 * Uses 2025 payout estimates for age 65
 *
 * @param raBalance - Retirement Account balance
 * @param plan - CPF Life plan: 'standard', 'basic', or 'escalating'
 * @returns Estimated monthly payout from age 65
 */
export function estimateCPFLifePayout(
  raBalance: number,
  plan: 'standard' | 'basic' | 'escalating' = 'standard'
): number {
  const { cpfLifePayouts, retirementSums } = CPF_CONFIG_2025;

  // Calculate payout based on proportion to retirement sums
  let basePayout: number;

  if (raBalance <= retirementSums.basic) {
    // Pro-rate based on BRS
    const proportion = raBalance / retirementSums.basic;
    basePayout = (cpfLifePayouts.basic.min + cpfLifePayouts.basic.max) / 2 * proportion;
  } else if (raBalance <= retirementSums.full) {
    // Pro-rate based on FRS
    const proportion = raBalance / retirementSums.full;
    basePayout = (cpfLifePayouts.full.min + cpfLifePayouts.full.max) / 2 * proportion;
  } else {
    // Pro-rate based on ERS or higher
    const proportion = raBalance / retirementSums.enhanced;
    basePayout = (cpfLifePayouts.enhanced.min + cpfLifePayouts.enhanced.max) / 2 * proportion;
  }

  // Adjust based on plan type
  const planMultiplier = getPlanMultiplier(plan);
  const estimatedPayout = basePayout * planMultiplier;

  return Math.round(estimatedPayout * 100) / 100;
}

/**
 * Get plan multiplier for different CPF Life plans
 * Standard: baseline
 * Basic: higher initial payout, no escalation
 * Escalating: lower initial, increases over time
 */
function getPlanMultiplier(plan: 'standard' | 'basic' | 'escalating'): number {
  switch (plan) {
    case 'standard':
      return 1.0;
    case 'basic':
      return 1.15; // ~15% higher initial payout
    case 'escalating':
      return 0.85; // ~15% lower initial payout
    default:
      return 1.0;
  }
}

/**
 * Calculate monthly CPF Life payout with escalation
 * Escalating plan increases by ~2% annually
 *
 * @param initialPayout - Payout at age 65
 * @param yearsFromAge65 - Years since turning 65
 * @param plan - CPF Life plan
 * @returns Adjusted monthly payout
 */
export function getCPFLifePayoutForYear(
  initialPayout: number,
  yearsFromAge65: number,
  plan: 'standard' | 'basic' | 'escalating'
): number {
  if (plan === 'escalating' && yearsFromAge65 > 0) {
    const escalationRate = 0.02; // 2% per year
    return initialPayout * Math.pow(1 + escalationRate, yearsFromAge65);
  }

  return initialPayout;
}

/**
 * Calculate when CPF Life payouts begin
 * Typically age 65, but can defer up to age 70
 */
export function getCPFLifePayoutAge(deferToAge?: number): number {
  const defaultAge = 65;
  const maxDeferralAge = 70;

  if (deferToAge && deferToAge > defaultAge && deferToAge <= maxDeferralAge) {
    return deferToAge;
  }

  return defaultAge;
}

/**
 * Calculate RA balance drawdown (if not using CPF Life)
 * User can choose to withdraw RA manually instead of CPF Life
 *
 * @param raBalance - Current RA balance
 * @param monthlyWithdrawal - Amount to withdraw per month
 * @returns Months until RA depletes
 */
export function calculateRADepletion(
  raBalance: number,
  monthlyWithdrawal: number,
  annualInterestRate: number = 0.04
): {
  monthsUntilDepletion: number;
  totalWithdrawn: number;
  totalInterestEarned: number;
} {
  const monthlyRate = annualInterestRate / 12;
  let balance = raBalance;
  let months = 0;
  let totalWithdrawn = 0;
  let totalInterest = 0;

  while (balance > 0 && months < 1200) { // Max 100 years
    const interest = balance * monthlyRate;
    balance += interest;
    totalInterest += interest;

    const withdrawal = Math.min(balance, monthlyWithdrawal);
    balance -= withdrawal;
    totalWithdrawn += withdrawal;

    months++;
  }

  return {
    monthsUntilDepletion: months,
    totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    totalInterestEarned: Math.round(totalInterest * 100) / 100
  };
}

/**
 * Compare CPF Life vs manual withdrawal strategies
 */
export function compareCPFLifeStrategies(
  raBalance: number,
  targetMonthlyIncome: number
): {
  cpfLife: {
    monthlyPayout: number;
    guaranteed: boolean;
    totalLifetimePayout: number; // Assuming life expectancy
  };
  manualWithdrawal: {
    monthlyWithdrawal: number;
    monthsUntilDepletion: number;
    totalWithdrawn: number;
  };
  recommendation: string;
} {
  const lifeExpectancyYears = 90 - 65; // Assume living to 90
  const lifeExpectancyMonths = lifeExpectancyYears * 12;

  // CPF Life option
  const cpfLifePayout = estimateCPFLifePayout(raBalance, 'standard');
  const cpfLifeTotal = cpfLifePayout * lifeExpectancyMonths;

  // Manual withdrawal option
  const manualResult = calculateRADepletion(raBalance, targetMonthlyIncome);

  // Recommendation logic
  let recommendation = '';
  if (cpfLifePayout >= targetMonthlyIncome * 0.9) {
    recommendation = 'CPF Life recommended: Provides guaranteed lifetime income meeting your target.';
  } else if (manualResult.monthsUntilDepletion >= lifeExpectancyMonths) {
    recommendation = 'Either option works: Manual withdrawal can meet target and last beyond life expectancy.';
  } else {
    recommendation = 'CPF Life strongly recommended: Manual withdrawal will deplete before age 90.';
  }

  return {
    cpfLife: {
      monthlyPayout: Math.round(cpfLifePayout * 100) / 100,
      guaranteed: true,
      totalLifetimePayout: Math.round(cpfLifeTotal * 100) / 100
    },
    manualWithdrawal: {
      monthlyWithdrawal: targetMonthlyIncome,
      monthsUntilDepletion: manualResult.monthsUntilDepletion,
      totalWithdrawn: manualResult.totalWithdrawn
    },
    recommendation
  };
}
```

**2. Update Post-Retirement Projections (`src/utils/postRetirementProjections.ts`)**

```typescript
import { estimateCPFLifePayout, getCPFLifePayoutForYear } from './cpfLife';

// In generatePostRetirementProjections():

const cpfStore = useCPFStore();
const cpfEnabled = cpfStore.enabled;

// Initialize CPF Life payout (from age 65)
let cpfLifeMonthlyPayout = 0;
if (cpfEnabled) {
  const raBalanceAtRetirement = /* get from retirement calculation */;
  cpfLifeMonthlyPayout = estimateCPFLifePayout(raBalanceAtRetirement, cpfStore.cpfLifePlan);
}

// For each month in post-retirement:
for (let monthIndex = 0; monthIndex < maxMonths; monthIndex++) {
  const age = retirementAge + Math.floor(monthIndex / 12);
  const yearsFromRetirement = Math.floor(monthIndex / 12);

  // Calculate income (includes CPF Life from age 65)
  let monthlyIncome = 0;

  if (age >= 65 && cpfEnabled) {
    const yearsFrom65 = age - 65;
    monthlyIncome += getCPFLifePayoutForYear(
      cpfLifeMonthlyPayout,
      yearsFrom65,
      cpfStore.cpfLifePlan
    );
  }

  // Add other post-retirement income sources
  monthlyIncome += calculatePostRetirementIncome(incomeSources, monthIndex);

  // Calculate expenses (already implemented)
  const monthlyExpenses = calculateMonthlyExpenses(expenses, monthIndex);

  // Net withdrawal from portfolio = expenses - income
  const netWithdrawal = monthlyExpenses - monthlyIncome;

  // Apply to portfolio
  portfolioValue -= netWithdrawal;
  portfolioValue *= (1 + monthlyReturnRate);

  // Check for depletion
  if (portfolioValue <= 0) {
    depletionAge = age;
    break;
  }
}
```

**3. Update Results Display**

Modify `src/components/ResultsDisplay.vue` to show CPF Life estimates:

```vue
<template>
  <div v-if="cpfStore.enabled" class="cpf-life-summary">
    <h3>CPF Life Estimates</h3>
    <div class="cpf-life-details">
      <div>
        <span>RA Balance at Retirement:</span>
        <strong>{{ formatCurrency(raBalanceAtRetirement) }}</strong>
      </div>
      <div>
        <span>Estimated Monthly Payout (from age 65):</span>
        <strong>{{ formatCurrency(cpfLifePayout) }}</strong>
      </div>
      <div>
        <span>CPF Life Plan:</span>
        <strong>{{ cpfStore.cpfLifePlan }}</strong>
      </div>
      <div>
        <span>Payout Start Age:</span>
        <strong>65</strong>
      </div>
    </div>
  </div>
</template>
```

#### Key Criteria Met
- CPF Life payout estimates based on RA balance (BRS/FRS/ERS)
- Different CPF Life plans supported (Standard, Basic, Escalating)
- Escalating plan increases 2% annually
- Payouts begin at age 65 (default)
- Post-retirement sustainability includes CPF Life income
- RA continues earning 4% interest if not using CPF Life
- Manual withdrawal option available
- Strategy comparison helper for user decision-making

#### Testing Requirements (25-30 tests)

**Test File: `src/utils/cpfLife.test.ts`**

```typescript
describe('CPF Life', () => {
  describe('estimateCPFLifePayout', () => {
    test('estimates payout for BRS ($106,500) → ~$900/month')
    test('estimates payout for FRS ($213,000) → ~$1,700/month')
    test('estimates payout for ERS ($426,000) → ~$3,200/month')
    test('handles RA balance below BRS')
    test('handles RA balance above ERS')
    test('standard plan has baseline multiplier (1.0)')
    test('basic plan has higher initial payout (1.15x)')
    test('escalating plan has lower initial payout (0.85x)')
  });

  describe('getCPFLifePayoutForYear', () => {
    test('standard plan payout remains constant over time')
    test('basic plan payout remains constant over time')
    test('escalating plan increases 2% per year')
    test('escalating: year 10 is ~22% higher than initial')
  });

  describe('getCPFLifePayoutAge', () => {
    test('default payout age is 65')
    test('can defer to age 66-70')
    test('cannot defer beyond 70')
    test('ignores invalid deferral ages')
  });

  describe('calculateRADepletion', () => {
    test('calculates months until RA depletes')
    test('accounts for 4% interest during drawdown')
    test('handles high withdrawal rate (faster depletion)')
    test('handles low withdrawal rate (longer duration)')
    test('stops at 100 years maximum')
    test('returns total withdrawn and interest earned')
  });

  describe('compareCPFLifeStrategies', () => {
    test('recommends CPF Life when payout meets target')
    test('recommends CPF Life when manual withdrawal depletes early')
    test('allows either option when manual withdrawal lasts long enough')
    test('calculates lifetime payout for CPF Life')
    test('compares depletion timelines accurately')
  });

  describe('Integration with post-retirement projections', () => {
    test('CPF Life income reduces portfolio withdrawal')
    test('portfolio lasts longer with CPF Life income')
    test('sustainability improves with CPF Life')
    test('handles case with no CPF Life (RA balance too low)')
  });
});
```

#### Implementation Notes
- **CPF Life is annuity**: Guaranteed for life, never depletes (longevity insurance)
- **Payout estimates**: Based on 2025 tables, actual payouts may vary slightly
- **Plan selection**: Default to Standard plan, allow user to compare all three
- **Escalation**: Escalating plan protects against inflation in later years
- **Deferral**: Deferring to age 70 increases monthly payout (~30-40% higher)
- **Integration**: CPF Life income treated like any other income source in sustainability calculations
- **Display**: Show CPF Life as separate line item in post-retirement income breakdown

---

### Milestone 7: UI & User Experience

#### Objective
Create user-facing components for CPF data entry, visualization, and results display. Ensure intuitive UX that matches existing application patterns and provides clear insights into CPF growth and retirement planning.

#### Deliverables

**1. CPF Accounts Form Component (`src/components/CPFAccountsForm.vue`)**

```vue
<script setup lang="ts">
import { useCPFStore } from '@/stores/cpf';
import { CPF_CONFIG_2025 } from '@/utils/cpfConfig';

const cpfStore = useCPFStore();

const retirementSumOptions = [
  { value: 'basic', label: `Basic ($${CPF_CONFIG_2025.retirementSums.basic.toLocaleString()})`, description: 'Lower retirement sum with property pledge' },
  { value: 'full', label: `Full ($${CPF_CONFIG_2025.retirementSums.full.toLocaleString()})`, description: 'Standard retirement sum' },
  { value: 'enhanced', label: `Enhanced ($${CPF_CONFIG_2025.retirementSums.enhanced.toLocaleString()})`, description: 'Higher retirement sum for higher payouts' }
];

const cpfLifePlanOptions = [
  { value: 'standard', label: 'Standard Plan', description: 'Stable monthly payouts' },
  { value: 'basic', label: 'Basic Plan', description: 'Higher initial payouts, no escalation' },
  { value: 'escalating', label: 'Escalating Plan', description: 'Lower initial, increases 2% yearly' }
];
</script>

<template>
  <div class="cpf-form">
    <div class="form-section">
      <h2>CPF Accounts</h2>
      <p class="description">
        Enable CPF calculations to project your CPF account growth and retirement income.
        If you have existing CPF balances, enter them below. Salary income will automatically
        calculate CPF contributions based on current rates.
      </p>

      <!-- Enable CPF Toggle -->
      <div class="form-group">
        <label>
          <input
            type="checkbox"
            v-model="cpfStore.enabled"
            @change="cpfStore.updateEnabled($event.target.checked)"
          />
          Enable CPF Calculations
        </label>
      </div>

      <template v-if="cpfStore.enabled">
        <!-- Current Balances -->
        <div class="form-section">
          <h3>Current CPF Balances (Optional)</h3>
          <p class="help-text">
            If you have existing CPF savings, enter your current balances. Leave as $0 if starting fresh.
          </p>

          <div class="form-row">
            <div class="form-group">
              <label for="oa-balance">Ordinary Account (OA)</label>
              <input
                id="oa-balance"
                type="number"
                min="0"
                step="100"
                v-model.number="cpfStore.currentBalances.ordinaryAccount"
                @input="cpfStore.updateBalances({ ordinaryAccount: $event.target.value })"
                placeholder="0"
              />
            </div>

            <div class="form-group">
              <label for="sa-balance">Special Account (SA)</label>
              <input
                id="sa-balance"
                type="number"
                min="0"
                step="100"
                v-model.number="cpfStore.currentBalances.specialAccount"
                @input="cpfStore.updateBalances({ specialAccount: $event.target.value })"
                placeholder="0"
                :disabled="retirementStore.currentAge >= 55"
              />
              <span v-if="retirementStore.currentAge >= 55" class="help-text">
                SA closes at age 55
              </span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="ma-balance">MediSave Account (MA)</label>
              <input
                id="ma-balance"
                type="number"
                min="0"
                step="100"
                v-model.number="cpfStore.currentBalances.medisaveAccount"
                @input="cpfStore.updateBalances({ medisaveAccount: $event.target.value })"
                placeholder="0"
              />
            </div>

            <div class="form-group">
              <label for="ra-balance">Retirement Account (RA)</label>
              <input
                id="ra-balance"
                type="number"
                min="0"
                step="100"
                v-model.number="cpfStore.currentBalances.retirementAccount"
                @input="cpfStore.updateBalances({ retirementAccount: $event.target.value })"
                placeholder="0"
                :disabled="retirementStore.currentAge < 55"
              />
              <span v-if="retirementStore.currentAge < 55" class="help-text">
                RA opens at age 55
              </span>
            </div>
          </div>

          <div class="total-balance">
            <strong>Total CPF Balance:</strong>
            <span class="amount">${{ cpfStore.totalCPFBalance.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Housing Usage -->
        <div class="form-section">
          <h3>Housing Usage</h3>
          <div class="form-group">
            <label for="housing-usage">Amount Used for Housing</label>
            <input
              id="housing-usage"
              type="number"
              min="0"
              step="1000"
              v-model.number="cpfStore.housingUsage"
              @input="cpfStore.updateHousingUsage($event.target.value)"
              placeholder="0"
            />
            <span class="help-text">
              CPF OA amount already used for housing (for tracking purposes)
            </span>
          </div>
        </div>

        <!-- Retirement Sum Target -->
        <div class="form-section">
          <h3>Retirement Sum Target</h3>
          <div class="form-group">
            <label>Target Retirement Sum (for age 55)</label>
            <div class="radio-group">
              <div
                v-for="option in retirementSumOptions"
                :key="option.value"
                class="radio-option"
              >
                <label>
                  <input
                    type="radio"
                    :value="option.value"
                    v-model="cpfStore.retirementSumTarget"
                    @change="cpfStore.updateRetirementSumTarget(option.value)"
                  />
                  <div class="option-content">
                    <strong>{{ option.label }}</strong>
                    <span class="option-description">{{ option.description }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- CPF Life Plan -->
        <div class="form-section">
          <h3>CPF Life Plan</h3>
          <div class="form-group">
            <label>Select CPF Life Plan (for age 65 payouts)</label>
            <div class="radio-group">
              <div
                v-for="option in cpfLifePlanOptions"
                :key="option.value"
                class="radio-option"
              >
                <label>
                  <input
                    type="radio"
                    :value="option.value"
                    v-model="cpfStore.cpfLifePlan"
                    @change="cpfStore.updateCPFLifePlan(option.value)"
                  />
                  <div class="option-content">
                    <strong>{{ option.label }}</strong>
                    <span class="option-description">{{ option.description }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Box -->
        <div class="info-box">
          <h4>How CPF Calculations Work</h4>
          <ul>
            <li>Salary income sources automatically calculate CPF contributions based on your age</li>
            <li>Contributions are allocated to OA/SA/MA (or RA after age 55) based on CPF rules</li>
            <li>Accounts earn interest monthly: OA 2.5%, SA/MA/RA 4.0%</li>
            <li>Extra interest earned up to 6% on first $60,000</li>
            <li>At age 55, SA closes and RA opens with funds transferred to meet your retirement sum</li>
            <li>From age 65, CPF Life provides guaranteed monthly payouts</li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Match existing form styles from RetirementForm.vue */
</style>
```

**2. CPF Summary Component (`src/components/CPFSummary.vue`)**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useCPFStore } from '@/stores/cpf';
import { useRetirementStore } from '@/stores/retirement';
import { calculateRetirementSumProgress } from '@/utils/cpfTransitions';
import { estimateCPFLifePayout } from '@/utils/cpfLife';

const cpfStore = useCPFStore();
const retirementStore = useRetirementStore();

// Calculate retirement sum progress
const retirementSumProgress = computed(() => {
  return calculateRetirementSumProgress(
    cpfStore.currentBalances.retirementAccount,
    cpfStore.retirementSumTarget
  );
});

// Estimate CPF Life payout
const cpfLifePayout = computed(() => {
  return estimateCPFLifePayout(
    cpfStore.currentBalances.retirementAccount,
    cpfStore.cpfLifePlan
  );
});

const formatCurrency = (value: number) => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
</script>

<template>
  <div v-if="cpfStore.enabled" class="cpf-summary">
    <h3>CPF Summary</h3>

    <!-- Account Balances -->
    <div class="summary-section">
      <h4>Current Account Balances</h4>
      <div class="balance-grid">
        <div class="balance-item">
          <span class="label">Ordinary Account (OA)</span>
          <span class="value">{{ formatCurrency(cpfStore.currentBalances.ordinaryAccount) }}</span>
        </div>
        <div class="balance-item">
          <span class="label">Special Account (SA)</span>
          <span class="value">{{ formatCurrency(cpfStore.currentBalances.specialAccount) }}</span>
        </div>
        <div class="balance-item">
          <span class="label">MediSave Account (MA)</span>
          <span class="value">{{ formatCurrency(cpfStore.currentBalances.medisaveAccount) }}</span>
        </div>
        <div class="balance-item">
          <span class="label">Retirement Account (RA)</span>
          <span class="value">{{ formatCurrency(cpfStore.currentBalances.retirementAccount) }}</span>
        </div>
      </div>
      <div class="balance-total">
        <span class="label">Total CPF Balance</span>
        <span class="value total">{{ formatCurrency(cpfStore.totalCPFBalance) }}</span>
      </div>
    </div>

    <!-- Retirement Sum Progress (if age 55+) -->
    <div v-if="retirementStore.currentAge >= 55" class="summary-section">
      <h4>Retirement Sum Progress</h4>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${retirementSumProgress.percentageComplete}%` }"
          :class="{ complete: retirementSumProgress.isMet }"
        ></div>
      </div>
      <div class="progress-details">
        <span>{{ formatCurrency(retirementSumProgress.current) }}</span>
        <span>of {{ formatCurrency(retirementSumProgress.target) }}</span>
        <span v-if="!retirementSumProgress.isMet" class="shortfall">
          (Shortfall: {{ formatCurrency(retirementSumProgress.shortfall) }})
        </span>
        <span v-else class="met">Target Met!</span>
      </div>
    </div>

    <!-- CPF Life Estimate -->
    <div class="summary-section">
      <h4>CPF Life Estimate (from age 65)</h4>
      <div class="cpf-life-estimate">
        <span class="label">Estimated Monthly Payout</span>
        <span class="value highlight">{{ formatCurrency(cpfLifePayout) }}/month</span>
      </div>
      <p class="help-text">
        Based on current RA balance and {{ cpfStore.cpfLifePlan }} plan.
        Actual payout may vary based on final RA balance at age 65.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Styling for summary display */
</style>
```

**3. Update Results Display (`src/components/ResultsDisplay.vue`)**

```vue
<template>
  <!-- Add CPF Summary after main results -->
  <CPFSummary v-if="cpfStore.enabled" />
</template>

<script setup lang="ts">
import CPFSummary from './CPFSummary.vue';
import { useCPFStore } from '@/stores/cpf';

const cpfStore = useCPFStore();
</script>
```

**4. Update Visualizations (`src/components/VisualizationsTab.vue`)**

Add CPF account visualization to the chart:

```vue
<script setup lang="ts">
// Add CPF data to chart datasets
const chartData = computed(() => {
  const labels = projections.value.map(p => `${p.year}-${String(p.month).padStart(2, '0')}`);

  const datasets = [
    {
      label: 'Portfolio Value',
      data: projections.value.map(p => p.portfolioValue),
      borderColor: 'rgb(75, 192, 192)',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      fill: true
    }
  ];

  // Add CPF datasets if enabled
  if (cpfStore.enabled) {
    datasets.push(
      {
        label: 'CPF OA',
        data: projections.value.map(p => p.cpf?.accounts.ordinaryAccount || 0),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
        fill: true
      },
      {
        label: 'CPF SA',
        data: projections.value.map(p => p.cpf?.accounts.specialAccount || 0),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true
      },
      {
        label: 'CPF MA',
        data: projections.value.map(p => p.cpf?.accounts.medisaveAccount || 0),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true
      },
      {
        label: 'CPF RA',
        data: projections.value.map(p => p.cpf?.accounts.retirementAccount || 0),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: true
      }
    );
  }

  return { labels, datasets };
});
</script>
```

Add CPF columns to the monthly breakdown table:

```vue
<template>
  <table class="monthly-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Age</th>
        <th>Income</th>
        <th>Expenses</th>
        <th>Contributions</th>
        <th v-if="cpfStore.enabled">CPF Contribution</th>
        <th v-if="cpfStore.enabled">CPF OA</th>
        <th v-if="cpfStore.enabled">CPF SA/RA</th>
        <th v-if="cpfStore.enabled">CPF MA</th>
        <th>Portfolio</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in projections" :key="row.monthIndex">
        <td>{{ row.year }}-{{ String(row.month).padStart(2, '0') }}</td>
        <td>{{ row.age }}</td>
        <td>{{ formatCurrency(row.income) }}</td>
        <td>{{ formatCurrency(row.expenses) }}</td>
        <td>{{ formatCurrency(row.contributions) }}</td>
        <td v-if="cpfStore.enabled">{{ formatCurrency(row.cpf?.monthlyContribution.total || 0) }}</td>
        <td v-if="cpfStore.enabled">{{ formatCurrency(row.cpf?.accounts.ordinaryAccount || 0) }}</td>
        <td v-if="cpfStore.enabled">
          {{ formatCurrency((row.cpf?.accounts.specialAccount || 0) + (row.cpf?.accounts.retirementAccount || 0)) }}
        </td>
        <td v-if="cpfStore.enabled">{{ formatCurrency(row.cpf?.accounts.medisaveAccount || 0) }}</td>
        <td>{{ formatCurrency(row.portfolioValue) }}</td>
      </tr>
    </tbody>
  </table>
</template>
```

**5. Update App.vue**

Add CPF Accounts tab:

```vue
<template>
  <div class="tabs">
    <button @click="currentTab = 'basic'" :class="{ active: currentTab === 'basic' }">
      Basic Info
    </button>
    <button @click="currentTab = 'cpf'" :class="{ active: currentTab === 'cpf' }">
      CPF Accounts
    </button>
    <button @click="currentTab = 'income'" :class="{ active: currentTab === 'income' }">
      Income Sources
    </button>
    <!-- ... other tabs -->
  </div>

  <div class="tab-content">
    <div v-show="currentTab === 'basic'">
      <RetirementForm />
    </div>
    <div v-show="currentTab === 'cpf'">
      <CPFAccountsForm />
    </div>
    <!-- ... other tab contents -->
  </div>
</template>
```

**6. Update Import/Export (`src/components/ImportExport.vue` and `src/utils/importExport.ts`)**

```typescript
// In exportData():
export function exportData(): RetirementData {
  const cpfStore = useCPFStore();

  return {
    version: 6, // Increment version for Phase 6
    exportDate: new Date().toISOString(),
    user: {
      // ... existing fields
      cpf: cpfStore.enabled ? cpfStore.cpfData : undefined
    }
  };
}

// In validateImportedData():
function validateCPFData(cpf: any): ValidationError[] {
  const errors: ValidationError[] = [];

  if (cpf && typeof cpf === 'object') {
    // Validate account balances are non-negative
    const accounts = cpf.currentBalances;
    if (accounts) {
      ['ordinaryAccount', 'specialAccount', 'medisaveAccount', 'retirementAccount'].forEach(field => {
        if (accounts[field] < 0) {
          errors.push({
            field: `cpf.${field}`,
            message: `${field} cannot be negative`
          });
        }
      });
    }

    // Validate retirement sum target
    if (cpf.retirementSumTarget && !['basic', 'full', 'enhanced'].includes(cpf.retirementSumTarget)) {
      errors.push({
        field: 'cpf.retirementSumTarget',
        message: 'Invalid retirement sum target'
      });
    }
  }

  return errors;
}
```

#### Key Criteria Met
- CPF Accounts tab for data entry
- Clear display of current balances and total CPF
- Retirement sum target selection with descriptions
- CPF Life plan selection with explanations
- Progress indicator for retirement sum (age 55+)
- CPF Life payout estimate displayed
- CPF accounts visualized in chart (stacked areas)
- CPF data in monthly breakdown table
- Export/import includes CPF data with validation
- Help text and tooltips for user guidance

#### Testing Requirements (15-20 tests)

**Component Tests:**

```typescript
describe('CPF UI Components', () => {
  describe('CPFAccountsForm', () => {
    test('renders when CPF enabled')
    test('hides when CPF disabled')
    test('allows toggling CPF on/off')
    test('updates store when balances change')
    test('disables SA input for age 55+')
    test('disables RA input for age under 55')
    test('shows retirement sum options correctly')
    test('shows CPF Life plan options correctly')
    test('displays info box with CPF rules')
  });

  describe('CPFSummary', () => {
    test('renders when CPF enabled')
    test('displays all account balances')
    test('shows total CPF balance')
    test('shows retirement sum progress for age 55+')
    test('hides retirement sum progress for under 55')
    test('shows CPF Life payout estimate')
    test('formats currency correctly')
  });

  describe('ResultsDisplay with CPF', () => {
    test('includes CPF Summary component when enabled')
    test('hides CPF Summary when disabled')
  });

  describe('VisualizationsTab with CPF', () => {
    test('adds CPF datasets to chart when enabled')
    test('shows all 4 CPF accounts in legend')
    test('adds CPF columns to table when enabled')
    test('hides CPF data when disabled')
  });

  describe('ImportExport with CPF', () => {
    test('exports include CPF data')
    test('imports restore CPF state correctly')
    test('validates CPF data on import')
    test('handles missing CPF data gracefully')
  });
});
```

#### Implementation Notes
- **Tab placement**: CPF Accounts tab right after Basic Info (early in flow)
- **Conditional rendering**: CPF sections only show when enabled
- **Accessibility**: Proper labels, ARIA attributes, keyboard navigation
- **Responsive design**: Works on mobile and desktop (match existing styles)
- **Visual feedback**: Progress bars, color coding (green for met, red for shortfall)
- **Help text**: Tooltips and info boxes to educate users about CPF rules
- **Chart colors**: Distinct colors for each CPF account, visually separate from portfolio

---

## Integration Strategy

### Order of Integration
1. **Milestone 1**: Foundation (types, config, store) - No external dependencies
2. **Milestone 2**: Contributions - Depends on Milestone 1, integrates with IncomeStore
3. **Milestone 3**: Interest - Depends on Milestone 1, standalone calculations
4. **Milestone 4**: Age 55 Transitions - Depends on Milestones 1-3
5. **Milestone 5**: System Integration - Depends on Milestones 1-4, modifies core calculations
6. **Milestone 6**: Post-Retirement - Depends on Milestones 1-5, modifies post-retirement projections
7. **Milestone 7**: UI - Depends on all previous milestones, final layer

### Integration Points with Existing Systems

**Phase 2 (Income Sources):**
- Detect salary income type
- Use salary amount for CPF contribution calculation
- Other income types (rental, dividend) do not trigger CPF

**Phase 4 (Expenses):**
- Housing expenses can be paid from OA
- Non-housing expenses use cash only

**Phase 5 (Loans):**
- Housing loans can use OA funds
- Track OA usage separately (affects OA balance)
- Other loan types use cash

**Phase 3 (Visualizations):**
- Add CPF account lines to portfolio chart
- Add CPF columns to monthly breakdown table
- Stacked area chart shows portfolio + CPF accounts

**All Phases (Import/Export):**
- Extend RetirementData type to include CPF
- Increment version to 6
- Validate CPF data on import
- Handle legacy exports without CPF data

### Backward Compatibility
- CPF is optional (disabled by default)
- Existing calculations work unchanged when CPF disabled
- Import/export handles legacy data without CPF
- No breaking changes to existing types or APIs

---

## Testing Strategy

### Test Coverage Goals
- **Unit tests**: 150-180 tests across all utilities
- **Integration tests**: 30-35 tests for end-to-end flows
- **Component tests**: 15-20 tests for UI components
- **Total**: ~200-235 new tests

### Testing Priorities
1. **High Priority** (must pass):
   - Contribution calculations (all age groups, wage ceilings)
   - Interest calculations (base + extra interest)
   - Age 55 transitions (SA closure, RA creation)
   - System integration (salary → CPF → portfolio flow)

2. **Medium Priority** (should pass):
   - CPF Life estimates
   - Post-retirement projections with CPF Life
   - UI component rendering and interactions
   - Import/export with CPF data

3. **Low Priority** (nice to have):
   - Edge cases (extreme values, invalid inputs)
   - Performance tests (large date ranges)
   - Accessibility tests

### Test Data
- Use realistic scenarios from CPF_INFO.md
- Test all age brackets (30, 40, 50, 55, 60, 65, 70, 75)
- Test salary ranges ($3000, $5000, $7400, $10000, $15000)
- Test different retirement sum targets (BRS, FRS, ERS)

### Regression Testing
- Ensure existing 222 tests still pass after CPF integration
- Verify calculations with CPF disabled match pre-Phase 6 results
- Test import of legacy data (versions 1-5)

---

## Implementation Order

### Development Sequence
1. **Week 1**: Milestone 1 (Foundation) + Milestone 2 (Contributions)
   - Set up data structures and configuration
   - Implement contribution engine
   - Write unit tests

2. **Week 2**: Milestone 3 (Interest) + Milestone 4 (Age 55)
   - Implement interest calculations
   - Handle age 55 transitions
   - Write unit tests

3. **Week 3**: Milestone 5 (System Integration)
   - Integrate CPF into main calculation flow
   - Connect to income/expense/loan systems
   - Write integration tests

4. **Week 4**: Milestone 6 (Post-Retirement) + Milestone 7 (UI)
   - Implement CPF Life calculations
   - Build UI components
   - Write component tests

5. **Week 5**: Polish and Testing
   - End-to-end testing
   - Bug fixes
   - Documentation updates
   - User acceptance testing

### Commit Strategy
- One commit per milestone (7 commits total)
- Each commit includes code + tests
- Commit messages follow pattern: "Phase 6 Milestone N: [Description]"
- Keep main branch stable (all tests passing)

### Code Review Checkpoints
- After Milestone 2: Review contribution logic
- After Milestone 4: Review transition logic
- After Milestone 5: Review integration approach
- After Milestone 7: Review UI/UX

---

## Success Criteria

### Functional Requirements
- [ ] CPF contributions calculated accurately for all age groups
- [ ] Account balances grow correctly with contributions + interest
- [ ] Extra interest calculated and applied correctly
- [ ] Age 55 transition handled automatically
- [ ] Retirement sum requirements tracked
- [ ] CPF Life payouts estimated accurately
- [ ] Housing loans can use OA funds
- [ ] Post-retirement sustainability includes CPF Life income
- [ ] UI allows enabling/disabling CPF
- [ ] UI displays account balances, progress, and estimates
- [ ] Visualizations include CPF data
- [ ] Export/import includes CPF data

### Quality Requirements
- [ ] All 200+ tests passing (new + existing)
- [ ] Type safety maintained (no TypeScript errors)
- [ ] Code follows existing patterns (Pinia, Vue 3, Composition API)
- [ ] Performance acceptable (no noticeable slowdown)
- [ ] UI responsive and accessible
- [ ] Documentation updated (CLAUDE.md, README if needed)

### User Experience Requirements
- [ ] CPF feature is discoverable and easy to enable
- [ ] Input forms are intuitive with helpful guidance
- [ ] Results display clearly shows CPF impact
- [ ] Visualizations make CPF growth easy to understand
- [ ] Error messages are helpful and actionable
- [ ] Works seamlessly with existing features

### Deployment Requirements
- [ ] Build succeeds (`npm run build:prod`)
- [ ] Type check passes (`npm run type-check`)
- [ ] All tests pass (`npm test`)
- [ ] Cloudflare Pages deployment succeeds
- [ ] No console errors or warnings
- [ ] Performance within acceptable range

---

## Appendix: Key CPF Rules Summary

### Contribution Rates (2025)
- ≤55: 37% (17% employer + 20% employee)
- 56-60: 32.5% (15.5% employer + 17% employee)
- 61-65: 23.5% (12% employer + 11.5% employee)
- 66-70: 16.5% (9% employer + 7.5% employee)
- >70: 12.5% (7.5% employer + 5% employee)

### Interest Rates (Q4 2025)
- OA: 2.5% per annum
- SA/MA/RA: 4.0% per annum
- Extra interest (under 55): +1% on first $60k (max $20k from OA)
- Extra interest (55+): +2% on first $30k, +1% on next $30k

### Wage Ceilings
- Monthly: $7,400
- Annual: $37,740 total contributions

### Retirement Sums (2025)
- BRS: $106,500
- FRS: $213,000
- ERS: $426,000
- BHS: $75,500

### Age 55 Rules
- SA closes, RA opens
- Funds transferred from SA then OA to meet retirement sum
- Can withdraw $5,000 or amount above FRS
- Post-55 contributions go to RA up to FRS

### CPF Life (from Age 65)
- Standard Plan: Stable monthly payouts
- Basic Plan: Higher initial, no escalation
- Escalating Plan: Lower initial, +2% yearly
- Payouts guaranteed for life

---

## Notes
- All monetary values in Singapore dollars (SGD)
- Configuration based on 2025 rates (may need updates in future years)
- CPF rules change periodically - config file makes updates easy
- Some simplifications made (e.g., CPF SA Shielding, property pledges)
- Focus on core CPF functionality relevant to retirement planning
