# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server (Vite on port 5173)
- `npm run build` - Build for production (runs type check then builds)
- `npm run build:prod` - Production build with full validation (type check + tests + build)
- `npm run preview` - Preview production build locally

### Testing
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- Run a single test file: `npm test -- src/utils/calculations.test.ts`

### Type Checking & Linting
- `npm run type-check` - Run TypeScript type checking without emitting files
- `npm run lint` - Alias for type-check

### Deployment
- `npm run verify-deployment` - Verify build meets deployment requirements for Cloudflare Pages

## Architecture Overview

### Stack & Framework
This is a **Vue 3 + TypeScript + Pinia** retirement calculator built with Vite. The application uses:
- **Vue 3** with Composition API (`<script setup>`)
- **Pinia** for state management (NOT Vuex)
- **Chart.js** with vue-chartjs for data visualizations
- **Tailwind CSS** for styling
- **Vitest** for testing
- **TypeScript** in strict mode

### Application Structure

**Entry Point**: `src/main.ts` - Creates Vue app, initializes Pinia, mounts to DOM

**Layers**:
- **Components**: Vue SFC components for UI (`.vue` files)
- **Stores**: Pinia stores for state management (`src/stores/`)
- **Utils**: Business logic and utilities (`src/utils/`)
- **Types**: TypeScript type definitions (`src/types/index.ts`)

### State Management (Pinia Stores)

**Retirement Store** (`src/stores/retirement.ts`):
- Main store for basic retirement calculation inputs
- Manages: currentAge, retirementAge, currentSavings, expectedReturnRate, inflationRate
- Computed properties: `userData`, `validation`, `results`
- Integrates with IncomeStore (Phase 2) and ExpenseStore (Phase 4)
- Actions: update methods, loadData, resetToDefaults

**Income Store** (`src/stores/income.ts`):
- Phase 2 addition for varied income sources
- Manages: `incomeSources` array, `oneOffReturns` array
- Computed: `totalMonthlyIncome` (normalizes all frequencies to monthly)
- Helpers: `convertToMonthly()` - converts daily/weekly/yearly/custom frequencies to monthly amounts
- Actions: add/remove/update methods for both income sources and one-off returns
- Phase 6: Income sources can be marked as `cpfEligible` for CPF contribution calculations

**Expense Store** (`src/stores/expense.ts`):
- Phase 4 addition for retirement expense tracking, Phase 5 addition for loans
- Manages: `expenses` array, `loans` array (Phase 5), `oneTimeExpenses` array (Phase 5)
- Computed: `totalMonthlyExpenses`, `expensesByCategory`, `totalsByCategory`
- Default: Single "Living Expenses" entry ($3000/month, 3% inflation)
- Actions: add/remove/update methods for expenses, loans, and one-time expenses

**CPF Store** (`src/stores/cpf.ts`):
- Phase 6 addition for Singapore CPF integration
- Manages: CPF account balances (OA, SA, MA, RA), contribution settings, retirement sum preference
- Tracks: Initial balances, housing usage from OA, user settings
- Computed: `cpfEnabled` (whether CPF feature is active), `totalCPFBalance`
- Actions: update methods for balances and settings, reset to defaults

### Calculation Logic

**Core Calculations** (`src/utils/calculations.ts`):
- `calculateFutureValueWithIncomeSources()` - Month-by-month calculation for variable income streams, expenses, loans, and one-time expenses
- `calculateRetirement()` - Main entry point, uses month-by-month calculation with income sources, includes Phase 4 sustainability metrics
- `validateInputs()` - Comprehensive validation for all input types including expenses, loans, and one-time expenses

**Loan Calculations** (`src/utils/loanCalculations.ts`):
- Phase 5 addition for loan amortization
- `calculateLoanPayment()` - Calculate monthly payment using standard amortization formula
- `getLoanPaymentForMonth()` - Get payment amount for specific month (0 if loan not active)
- Handles extra payments for early repayment

**CPF Calculations** (`src/utils/cpfContributions.ts`, `cpfInterest.ts`, `cpfTransitions.ts`, `cpfLife.ts`):
- Phase 6 addition for Singapore CPF system
- `cpfConfig.ts` - Configuration data: contribution rates, allocation percentages, interest rates, wage ceilings, retirement sums
- `cpfContributions.ts` - Calculate CPF contributions from salary (age-dependent rates, wage ceiling limits)
- `cpfInterest.ts` - Calculate monthly interest with extra interest tiers (OA 2.5%, SMRA 4.0%, up to 6% extra)
- `cpfTransitions.ts` - Age 55 transitions (SA closure, RA creation), retirement sum calculations (BRS/FRS/ERS)
- `cpfLife.ts` - CPF Life annuity payout estimates for post-retirement income
- All calculations based on 2025 CPF regulations (see CPF_INFO.md for detailed rules)

**Monthly Projections** (`src/utils/monthlyProjections.ts`):
- Phase 3 addition for chart and table visualizations
- `generateMonthlyProjections()` - Month-by-month data from current age to retirement
- Returns array of `MonthlyDataPoint` with income, expenses, contributions, portfolio value, growth
- Handles income sources, expenses, loans, one-time expenses
- Phase 6: Includes CPF monthly snapshots when CPF is enabled

**Post-Retirement Projections** (`src/utils/postRetirementProjections.ts`):
- Phase 4 addition for retirement sustainability analysis
- `generatePostRetirementProjections()` - Month-by-month simulation from retirement to depletion/max age
- Applies category-specific inflation to expenses
- Date-based expense filtering (startDate/endDate in YYYY-MM format)
- Detects portfolio depletion for sustainability warnings
- Phase 6: Includes CPF Life monthly payouts as income when CPF is enabled

**Calculation Behavior**:
- Always uses month-by-month calculation with income sources (no legacy calculation path)
- Contributions come from income sources minus expenses (no separate monthlyContribution field)
- Phase 4: Calculates `yearsUntilDepletion` and `sustainabilityWarning` when expenses exist
- Phase 5: Includes loan payments and one-time expenses in month-by-month calculations
- Phase 6: CPF contributions deducted from salary income before portfolio contributions, CPF tracked separately with own interest rates
- Handles edge cases: zero interest rate, date validation, frequency conversions
- All monetary values rounded to 2 decimal places

### Vue Components

**App.vue**:
- Root component with tab navigation
- 8 tabs: Basic Info, Income, Expenses, CPF, Results, Visualizations, Import/Export
- Uses `v-show` for tab content (all rendered, visibility toggled)

**RetirementForm.vue**:
- Basic inputs: ages, savings, rates (return rate and inflation rate)
- Binds to retirement store using Pinia
- Note: Monthly contributions are now handled via Income Sources tab

**IncomeTab.vue** (contains IncomeSourceForm.vue & OneOffReturnForm.vue):
- Phase 2 components for varied income
- Manage income store arrays
- Phase 6: Income sources can be flagged as CPF-eligible for automatic contribution calculations

**ExpenseTab.vue** (contains ExpenseForm.vue, LoanForm.vue, OneTimeExpenseForm.vue):
- Phase 4: ExpenseForm for retirement expense tracking with category, amount, inflation, optional date ranges (YYYY-MM format)
- Phase 5: LoanForm for loan tracking with principal, interest rate, term, start date, and optional extra payments
- Phase 5: OneTimeExpenseForm for one-time expenses with amount, date, category, and description
- Displays validation errors inline

**CPFForm.vue**:
- Phase 6 component for CPF account management
- Input CPF account balances (OA, SA, MA, RA)
- Configure CPF settings: retirement sum preference (BRS/FRS/ERS), housing usage
- Enable/disable CPF feature
- Displays CPF-related income sources and contribution breakdown

**ResultsDisplay.vue**:
- Displays calculated results from store
- Shows: future value, total contributions, investment growth, inflation-adjusted value
- Phase 4: Includes SustainabilityDisplay when expenses exist
- Phase 6: Shows CPF account balances and retirement sum status when CPF is enabled
- Shows validation errors with helpful navigation tips

**SustainabilityDisplay.vue**:
- Phase 4 component showing retirement sustainability metrics
- Green/red status based on portfolio depletion
- Warning banner for high withdrawal rates
- Displays years until depletion or "Sustainable" message

**VisualizationsTab.vue**:
- Phase 3 component with chart and table views
- PortfolioChart: Line chart showing portfolio growth over time using Chart.js
- MonthlyBreakdownTable: Detailed month-by-month data table
- Phase 6: Includes CPF account balance visualizations when CPF is enabled

**ImportExport.vue**:
- Export data to JSON with versioning
- Import with validation support
- Phase 6: Includes CPF data in export/import

### Data Versioning & Migration

**Export/Import** (`src/utils/importExport.ts`):
- `exportData()` - Creates RetirementData object with exportDate and user data
- `validateImportedData()` - Validates structure for imported JSON
- `parseImportedFile()` - Reads and validates JSON files

### Type System (`src/types/index.ts`)

**Core Types**:
- `UserData` - All user inputs (Phase 1-5 fields)
- `RetirementData` - Export format with version and exportDate
- `CalculationResult` - Calculation outputs (includes Phase 4: yearsUntilDepletion, sustainabilityWarning, depletionAge)
- `ValidationResult` & `ValidationError` - Validation system

**Phase 2 Types**:
- `IncomeStream` - Recurring income with start/end dates
- `OneOffReturn` - One-time future payments
- `IncomeType`: 'salary' | 'rental' | 'dividend' | 'business' | 'custom'
- `IncomeFrequency`: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

**Phase 3 Types**:
- `MonthlyDataPoint` - Month-by-month projection data for charts/tables
  - Includes: monthIndex, year, month, age, income, expenses, contributions, portfolioValue, growth

**Phase 4 Types**:
- `RetirementExpense` - Expense definition with category, amount, inflation, optional date ranges (YYYY-MM format)
- `PostRetirementDataPoint` - Post-retirement projection data
- `ExpenseCategory`: 'living' | 'healthcare' | 'travel' | 'other'

**Phase 5 Types**:
- `Loan` - Loan definition with principal, interest rate, term, start date, and optional extra payments
- `ExtraPayment` - Extra payment definition with date and amount
- `OneTimeExpense` - One-time expense definition with name, amount, date, category, and description

**Phase 6 Types**:
- `CPFData` - CPF configuration and balances
- `CPFAccounts` - OA, SA, MA, RA account balances
- `CPFMonthlySnapshot` - Monthly CPF state in projections (contributions, interest, balances)
- `CPFRetirementSum`: 'BRS' | 'FRS' | 'ERS' - Retirement sum preference (Basic/Full/Enhanced)
- See `cpfConfig.ts` for detailed configuration types (rates, limits, allocations)

### Date Handling
- All dates use YYYY-MM format strings (e.g., "2025-10")
- Date validation via regex: `/^\d{4}-\d{2}$/`
- Month calculations relative to current year/month baseline
- End dates are optional (undefined = ongoing for income/expenses)
- Income sources: startDate required, endDate optional
- Expenses: both startDate and endDate optional (defaults: current month and ongoing)
- Loans: startDate required (YYYY-MM format)
- One-time expenses: date required (YYYY-MM format)

## Development Notes

### Adding New Features
1. Update types in `src/types/index.ts`
2. Add store logic if needed (Pinia store with Composition API)
3. Implement calculations in `src/utils/calculations.ts` with validation
4. Create/update Vue components using `<script setup>` syntax
5. Add unit tests (`.test.ts` files)

### Vue Component Guidelines
- Use Composition API with `<script setup lang="ts">`
- Access stores via `useRetirementStore()`, `useIncomeStore()`, `useExpenseStore()`, or `useCPFStore()`
- Bind inputs to store refs directly (Pinia handles reactivity)
- Use computed properties from stores for derived values
- Tailwind CSS for all styling

### Testing
- Unit tests for all utils and stores
- Tests use Vitest with JSDOM environment
- Test files excluded from build via tsconfig.json
- Integration tests: `src/phase2-integration.test.ts`, `src/phase3-integration.test.ts`, `src/phase4-integration.test.ts`, `src/phase5-integration.test.ts`, `src/phase6-integration.test.ts`
- Total: 374 tests across 21 test files covering all phases (1-6)

### TypeScript Configuration
- Strict mode enabled with all linting flags
- Target: ES2022, Module: ESNext
- Bundler module resolution
- Path alias: `@/*` maps to `src/*`
- `.test.ts` files excluded from compilation

## Architecture Decisions

### Removal of monthlyContribution Field (Completed)
The legacy `monthlyContribution` field has been completely removed from the codebase in favor of using income sources exclusively:

**Rationale**:
- Eliminates dual calculation paths (legacy vs. income sources)
- Provides more flexibility for users (variable income, multiple sources, different frequencies)
- Simplifies codebase maintenance and reduces potential bugs
- Better aligns with real-world financial scenarios

**Migration**:
- All calculations now use `calculateFutureValueWithIncomeSources()` month-by-month approach
- Monthly contributions should be added as income sources in the Income Sources tab
- Legacy `calculateFutureValue()` and `calculateTotalContributions()` functions removed
- All 222 tests updated to use income sources instead of monthlyContribution
- UserData type no longer includes monthlyContribution field

**For New Features**:
- Always use income sources for any contribution-related functionality
- Do not add monthlyContribution field back - use income sources instead

### CPF Integration (Phase 6)
The CPF system models Singapore's Central Provident Fund with accurate 2025 regulations:

**Architecture**:
- CPF is optional and disabled by default (users must enable it in CPF tab)
- Income sources can be flagged as `cpfEligible` (typically salary income)
- CPF contributions are deducted from salary before calculating portfolio contributions
- CPF accounts (OA, SA, MA, RA) are tracked separately with their own interest rates
- Age-dependent contribution rates and allocation percentages (see `cpfConfig.ts`)
- Age 55 transitions: SA closes and RA is created with retirement sum requirement

**Key Regulations**:
- Contribution rates: 5 age brackets (≤55, 55-60, 60-65, 65-70, >70)
- Allocation percentages: 8 age brackets with different splits to OA/SA/MA/RA
- Wage ceiling: $7,400/month, $37,740/year (2025 limits)
- Interest rates: OA 2.5%, SA/MA/RA 4.0% (SMRA), extra interest up to 6% on first $60k
- Retirement sums: BRS $106,500, FRS $213,000, ERS $426,000 (2025 values)
- CPF Life payouts: Estimated monthly annuity based on RA balance at retirement

**Data Source**:
- All CPF rules and rates are documented in `CPF_INFO.md`
- Configuration centralized in `src/utils/cpfConfig.ts`
- When CPF regulations change, update `cpfConfig.ts` values

**Known Issues (from next_phase.md)**:
1. Performance: Calculations may have noticeable lag (consider deferring to button trigger)
2. Table width: Not wide enough for all columns (focus on desktop, ignore mobile for now)
3. Negative portfolio values: Needs CPF RA monthly payout implementation
4. Interest calculation: May be too large - double-check math
5. CPF breakdown: Income sources tagged with CPF need contribution breakdown display
6. CPF tab enhancements: Show CPF-tagged income sources after calculation
