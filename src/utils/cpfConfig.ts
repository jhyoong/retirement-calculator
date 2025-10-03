/**
 * CPF Configuration for 2025
 * Contains official rates, limits, and retirement sums from CPF Board
 */

export const CPF_CONFIG_2025 = {
  // Contribution rates by age (5 brackets)
  contributionRates: [
    {
      ageMin: 0,
      ageMax: 55,
      employerRate: 0.17,
      employeeRate: 0.20,
      totalRate: 0.37
    },
    {
      ageMin: 56,
      ageMax: 60,
      employerRate: 0.155,
      employeeRate: 0.17,
      totalRate: 0.325
    },
    {
      ageMin: 61,
      ageMax: 65,
      employerRate: 0.115,
      employeeRate: 0.13,
      totalRate: 0.245
    },
    {
      ageMin: 66,
      ageMax: 70,
      employerRate: 0.09,
      employeeRate: 0.105,
      totalRate: 0.195
    },
    {
      ageMin: 71,
      ageMax: 120,
      employerRate: 0.075,
      employeeRate: 0.075,
      totalRate: 0.15
    }
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
    {
      ageMin: 36,
      ageMax: 40,
      ordinaryAccount: 0.5677,
      specialAccount: 0.1891,
      medisaveAccount: 0.2432,
      retirementAccount: 0
    },
    {
      ageMin: 41,
      ageMax: 45,
      ordinaryAccount: 0.5136,
      specialAccount: 0.2162,
      medisaveAccount: 0.2702,
      retirementAccount: 0
    },
    {
      ageMin: 46,
      ageMax: 50,
      ordinaryAccount: 0.4595,
      specialAccount: 0.2432,
      medisaveAccount: 0.2973,
      retirementAccount: 0
    },
    {
      ageMin: 51,
      ageMax: 55,
      ordinaryAccount: 0.4055,
      specialAccount: 0.3108,
      medisaveAccount: 0.2837,
      retirementAccount: 0
    },
    {
      ageMin: 56,
      ageMax: 60,
      ordinaryAccount: 0.1231,
      specialAccount: 0,
      medisaveAccount: 0.3385,
      retirementAccount: 0.5384
    },
    {
      ageMin: 61,
      ageMax: 65,
      ordinaryAccount: 0.0327,
      specialAccount: 0,
      medisaveAccount: 0.4082,
      retirementAccount: 0.5591
    },
    {
      ageMin: 66,
      ageMax: 120,
      ordinaryAccount: 0.1026,
      specialAccount: 0,
      medisaveAccount: 0.3590,
      retirementAccount: 0.5384
    }
  ],

  // Interest rates (Q4 2025)
  interestRates: {
    ordinaryAccount: 0.025,
    specialAccount: 0.04,
    medisaveAccount: 0.04,
    retirementAccount: 0.04
  },

  // Wage ceilings and limits
  wageCeilings: {
    monthlyOrdinaryWage: 7400,
    annualCPFLimit: 37740
  },

  // Retirement sums (for those turning 55 in 2025)
  retirementSums: {
    basic: 106500,
    full: 213000,
    enhanced: 426000
  }
};
