/**
 * Application-wide constants
 * Centralizes magic numbers and commonly used values
 */

// =============================================================================
// TIME AND CALENDAR CONSTANTS
// =============================================================================

/** Number of months in a year */
export const MONTHS_PER_YEAR = 12;

/** Number of weeks in a year */
export const WEEKS_PER_YEAR = 52;

/** Average number of days in a month (accounting for leap years) */
export const AVERAGE_DAYS_PER_MONTH = 30.44;

/** Number of days in a year (accounting for leap years) */
export const DAYS_PER_YEAR = 365.25;

// =============================================================================
// PRECISION AND ROUNDING
// =============================================================================

/** Precision multiplier for rounding to 2 decimal places */
export const DECIMAL_PRECISION = 100;

/** Maximum iterations for long-running calculations (100 years in months) */
export const MAX_CALCULATION_MONTHS = 1200;

/**
 * Round a number to 2 decimal places
 * @param value - Number to round
 * @returns Rounded number
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * DECIMAL_PRECISION) / DECIMAL_PRECISION;
}

// =============================================================================
// AGE CONSTANTS
// =============================================================================

/** Minimum valid age for validation */
export const MIN_AGE = 0;

/** Maximum valid age for validation */
export const MAX_AGE = 120;

/** CPF age 55 transition (SA closes, RA created) */
export const CPF_AGE_55 = 55;

/** CPF Life payout start age */
export const CPF_LIFE_AGE = 65;

/** Maximum CPF Life deferral age */
export const CPF_MAX_DEFERRAL_AGE = 70;

/** Default maximum age for projections */
export const DEFAULT_MAX_AGE = 95;

/** Default life expectancy for calculations */
export const DEFAULT_LIFE_EXPECTANCY = 90;

// =============================================================================
// VALIDATION LIMITS
// =============================================================================

/** Minimum valid year for date validation */
export const MIN_YEAR = 1900;

/** Maximum valid year for date validation */
export const MAX_YEAR = 2200;

/** Minimum valid month (January) */
export const MIN_MONTH = 1;

/** Maximum valid month (December) */
export const MAX_MONTH = 12;

/** Minimum inflation rate (-50%) */
export const MIN_INFLATION_RATE = -0.5;

/** Maximum inflation rate (100%) */
export const MAX_INFLATION_RATE = 1;

/** Minimum rate for percentage fields (0%) */
export const MIN_RATE = 0;

/** Maximum rate for percentage fields (100%) */
export const MAX_RATE = 1;

/** Maximum loan term in months (50 years) */
export const MAX_LOAN_TERM_MONTHS = 600;

// =============================================================================
// FINANCIAL THRESHOLDS
// =============================================================================

/** Sustainable withdrawal rate threshold (5% annually) */
export const SUSTAINABLE_WITHDRAWAL_RATE = 0.05;

/** Income target threshold for CPF Life recommendations (90%) */
export const INCOME_TARGET_THRESHOLD = 0.9;

/** Minimum balance threshold for loan calculations */
export const MIN_BALANCE_THRESHOLD = 0.01;

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/** Default current age */
export const DEFAULT_CURRENT_AGE = 30;

/** Default retirement age */
export const DEFAULT_RETIREMENT_AGE = 65;

/** Default current savings */
export const DEFAULT_SAVINGS = 50000;

/** Default expected return rate (7% annually) */
export const DEFAULT_RETURN_RATE = 0.07;

/** Default inflation rate (3% annually) */
export const DEFAULT_INFLATION_RATE = 0.03;

/** Default monthly living expenses */
export const DEFAULT_LIVING_EXPENSES = 3000;

/** Default annual interest rate for CPF RA */
export const DEFAULT_CPF_INTEREST_RATE = 0.04;

// =============================================================================
// DATE FORMAT CONSTANTS
// =============================================================================

/** Day suffix for date strings (YYYY-MM-01) */
export const DATE_DAY_SUFFIX = '-01';

/** Far future date for ongoing expenses */
export const FAR_FUTURE_DATE = '9999-12';

/** Date format regex (YYYY-MM) */
export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}$/;

/** Padding character for month strings */
export const DATE_PADDING_CHAR = '0';

/** Padding length for month strings */
export const DATE_PADDING_LENGTH = 2;

// =============================================================================
// CPF LIFE PLAN CONSTANTS
// =============================================================================

/** Default CPF Life plan */
export const DEFAULT_CPF_PLAN = 'standard' as const;

/** CPF Life Basic Plan payout multiplier (15% higher initial) */
export const CPF_BASIC_PLAN_MULTIPLIER = 1.15;

/** CPF Life Escalating Plan payout multiplier (15% lower initial) */
export const CPF_ESCALATING_PLAN_MULTIPLIER = 0.85;

/** CPF Life Standard Plan payout multiplier (baseline) */
export const CPF_STANDARD_PLAN_MULTIPLIER = 1.0;

/** CPF Life Escalating Plan annual increase rate (2% per year) */
export const CPF_ESCALATION_RATE = 0.02;
