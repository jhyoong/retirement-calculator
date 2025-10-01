import type { RetirementData, UserData } from '@/types'

/**
 * Migrate data from v1.0.0 to v2.0.0 format
 * v1 only has monthlyContribution, v2 can have income sources
 */
export function migrateV1ToV2(data: RetirementData): RetirementData {
  // If already v2 or later, return as-is
  if (data.version !== '1.0.0') {
    return data
  }

  // V1 data is already compatible with v2
  // Just update the version number
  return {
    ...data,
    version: '2.0.0',
    user: {
      ...data.user,
      // V1 data doesn't have income sources or one-off returns
      // They will be undefined, which is valid for v2
    }
  }
}

/**
 * Convert legacy monthlyContribution to income source
 * This is an optional migration that users can choose to perform
 */
export function convertMonthlyContributionToIncomeSource(userData: UserData): UserData {
  // If income sources already exist or monthlyContribution is 0, no conversion needed
  if ((userData.incomeSources && userData.incomeSources.length > 0) || userData.monthlyContribution === 0) {
    return userData
  }

  // Create a new income source from the monthly contribution
  return {
    ...userData,
    incomeSources: [{
      id: Date.now().toString(),
      name: 'Monthly Contribution (Legacy)',
      type: 'custom',
      amount: userData.monthlyContribution,
      frequency: 'monthly',
      startDate: new Date().toISOString().slice(0, 7) // Current month
    }],
    // Keep monthlyContribution for backward compatibility
    monthlyContribution: userData.monthlyContribution
  }
}

/**
 * Get data version
 */
export function getDataVersion(data: RetirementData): string {
  return data.version
}

/**
 * Check if data needs migration
 */
export function needsMigration(data: RetirementData): boolean {
  return data.version === '1.0.0'
}
