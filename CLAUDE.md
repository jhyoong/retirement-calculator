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
- Manages: currentAge, retirementAge, currentSavings, monthlyContribution, expectedReturnRate, inflationRate
- Computed properties: `userData`, `validation`, `results`
- Integrates with IncomeStore (Phase 2) and ExpenseStore (Phase 4)
- Actions: update methods, loadData, resetToDefaults

**Income Store** (`src/stores/income.ts`):
- Phase 2 addition for varied income sources
- Manages: `incomeSources` array, `oneOffReturns` array
- Computed: `totalMonthlyIncome` (normalizes all frequencies to monthly)
- Helpers: `convertToMonthly()` - converts daily/weekly/yearly/custom frequencies to monthly amounts
- Actions: add/remove/update methods for both income sources and one-off returns

**Expense Store** (`src/stores/expense.ts`):
- Phase 4 addition for retirement expense tracking
- Manages: `expenses` array
- Computed: `totalMonthlyExpenses`, `expensesByCategory`, `totalsByCategory`
- Default: Single "Living Expenses" entry ($3000/month, 3% inflation)
- Actions: add/remove/update methods for expenses

### Calculation Logic

**Core Calculations** (`src/utils/calculations.ts`):
- `calculateFutureValue()` - Standard compound interest formula: FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]
- `calculateFutureValueWithIncomeSources()` - Month-by-month calculation for variable income streams
- `calculateRetirement()` - Main entry point, auto-detects calculation method, includes Phase 4 sustainability metrics
- `validateInputs()` - Comprehensive validation for all input types including expenses

**Monthly Projections** (`src/utils/monthlyProjections.ts`):
- Phase 3 addition for chart and table visualizations
- `generateMonthlyProjections()` - Month-by-month data from current age to retirement
- Returns array of `MonthlyDataPoint` with income, expenses, contributions, portfolio value, growth
- Handles both income sources and legacy monthlyContribution

**Post-Retirement Projections** (`src/utils/postRetirementProjections.ts`):
- Phase 4 addition for retirement sustainability analysis
- `generatePostRetirementProjections()` - Month-by-month simulation from retirement to depletion/max age
- Applies category-specific inflation to expenses
- Date-based expense filtering (startDate/endDate in YYYY-MM format)
- Detects portfolio depletion for sustainability warnings

**Calculation Behavior**:
- If `incomeSources` exist: uses time-based month-by-month calculation
- Otherwise: falls back to legacy constant `monthlyContribution` formula
- Phase 4: Calculates `yearsUntilDepletion` and `sustainabilityWarning` when expenses exist
- Handles edge cases: zero interest rate, date validation, frequency conversions
- All monetary values rounded to 2 decimal places

### Vue Components

**App.vue**:
- Root component with tab navigation
- 7 tabs: Basic Info, Income Sources, One-Off Returns, Expenses, Results, Visualizations, Import/Export
- Uses `v-show` for tab content (all rendered, visibility toggled)

**RetirementForm.vue**:
- Basic inputs: ages, savings, contribution, rates
- Binds to retirement store using Pinia

**IncomeSourceForm.vue** & **OneOffReturnForm.vue**:
- Phase 2 components for varied income
- Manage income store arrays

**ExpenseForm.vue**:
- Phase 4 component for retirement expense tracking
- Add/edit/remove expenses with category, amount, inflation, optional date ranges (YYYY-MM format)
- Displays validation errors inline

**ResultsDisplay.vue**:
- Displays calculated results from store
- Shows: future value, total contributions, investment growth, inflation-adjusted value
- Phase 4: Includes SustainabilityDisplay when expenses exist
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

**ImportExport.vue**:
- Export data to JSON with versioning
- Import with validation support

### Data Versioning & Migration

**Export/Import** (`src/utils/importExport.ts`):
- `exportData()` - Creates RetirementData object with exportDate and user data
- `validateImportedData()` - Validates structure for imported JSON
- `parseImportedFile()` - Reads and validates JSON files

### Type System (`src/types/index.ts`)

**Core Types**:
- `UserData` - All user inputs (Phase 1-4 fields)
- `RetirementData` - Export format with version and exportDate
- `CalculationResult` - Calculation outputs (includes Phase 4: yearsUntilDepletion, sustainabilityWarning)
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

### Date Handling
- All dates use YYYY-MM format strings (e.g., "2025-10")
- Date validation via regex: `/^\d{4}-\d{2}$/`
- Month calculations relative to current year/month baseline
- End dates are optional (undefined = ongoing for income/expenses)
- Income sources: startDate required, endDate optional
- Expenses: both startDate and endDate optional (defaults: current month and ongoing)

## Development Notes

### Adding New Features
1. Update types in `src/types/index.ts`
2. Add store logic if needed (Pinia store with Composition API)
3. Implement calculations in `src/utils/calculations.ts` with validation
4. Create/update Vue components using `<script setup>` syntax
5. Add unit tests (`.test.ts` files)

### Vue Component Guidelines
- Use Composition API with `<script setup lang="ts">`
- Access stores via `useRetirementStore()`, `useIncomeStore()`, or `useExpenseStore()`
- Bind inputs to store refs directly (Pinia handles reactivity)
- Use computed properties from stores for derived values
- Tailwind CSS for all styling

### Testing
- Unit tests for all utils and stores
- Tests use Vitest with JSDOM environment
- Test files excluded from build via tsconfig.json
- Integration tests: `src/phase2-integration.test.ts`, `src/phase3-integration.test.ts`, `src/phase4-integration.test.ts`
- Total: 207 tests across 11 test files covering all phases

### TypeScript Configuration
- Strict mode enabled with all linting flags
- Target: ES2022, Module: ESNext
- Bundler module resolution
- Path alias: `@/*` maps to `src/*`
- `.test.ts` files excluded from compilation
