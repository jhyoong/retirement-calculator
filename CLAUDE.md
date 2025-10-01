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
- Integrates with IncomeStore for Phase 2 features
- Actions: update methods, loadData, resetToDefaults

**Income Store** (`src/stores/income.ts`):
- Phase 2 addition for varied income sources
- Manages: `incomeSources` array, `oneOffReturns` array
- Computed: `totalMonthlyIncome` (normalizes all frequencies to monthly)
- Helpers: `convertToMonthly()` - converts daily/weekly/yearly/custom frequencies to monthly amounts
- Actions: add/remove/update methods for both income sources and one-off returns

### Calculation Logic (`src/utils/calculations.ts`)

**Core Functions**:
- `calculateFutureValue()` - Standard compound interest formula: FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]
- `calculateFutureValueWithIncomeSources()` - Month-by-month calculation for variable income streams
- `calculateRetirement()` - Main entry point, auto-detects which calculation method to use
- `validateInputs()` - Comprehensive validation for all input types

**Calculation Behavior**:
- If `incomeSources` exist: uses time-based month-by-month calculation
- Otherwise: falls back to legacy constant `monthlyContribution` formula
- Handles edge cases: zero interest rate, date validation, frequency conversions
- All monetary values rounded to 2 decimal places

### Vue Components

**App.vue**:
- Root component with tab navigation
- 5 tabs: Basic Info, Income Sources, One-Off Returns, Results, Import/Export
- Uses `v-show` for tab content (all rendered, visibility toggled)

**RetirementForm.vue**:
- Basic inputs: ages, savings, contribution, rates
- Binds to retirement store using Pinia

**IncomeSourceForm.vue** & **OneOffReturnForm.vue**:
- Phase 2 components for varied income
- Manage income store arrays

**ResultsDisplay.vue**:
- Displays calculated results from store
- Shows: future value, total contributions, investment growth, inflation-adjusted value

**ImportExport.vue**:
- Export data to JSON with versioning
- Import with validation and migration support

### Data Versioning & Migration

**Current Version**: 2.0.0

**Version History**:
- v1.0.0: Basic calculator with `monthlyContribution` only
- v2.0.0: Added `incomeSources` and `oneOffReturns` support

**Migration** (`src/utils/migration.ts`):
- `migrateV1ToV2()` - Auto-migrates old format to new
- `convertMonthlyContributionToIncomeSource()` - Optional conversion of legacy field
- `monthlyContribution` field maintained for backward compatibility

**Import/Export** (`src/utils/importExport.ts`):
- `exportData()` - Creates versioned RetirementData object
- `validateImportedData()` - Validates structure for both v1 and v2
- `parseImportedFile()` - Reads and validates JSON files

### Type System (`src/types/index.ts`)

**Core Types**:
- `UserData` - All user inputs (Phase 1 + Phase 2 fields)
- `RetirementData` - Export format with version and exportDate
- `CalculationResult` - Calculation outputs
- `ValidationResult` & `ValidationError` - Validation system

**Phase 2 Types**:
- `IncomeStream` - Recurring income with start/end dates
- `OneOffReturn` - One-time future payments
- `IncomeType`: 'salary' | 'rental' | 'dividend' | 'business' | 'custom'
- `IncomeFrequency`: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

### Date Handling
- All dates use YYYY-MM format strings (e.g., "2025-10")
- Date validation via regex: `/^\d{4}-\d{2}$/`
- Month calculations relative to current year/month baseline
- End dates are optional (undefined = ongoing income)

## Development Notes

### Adding New Features
1. Update types in `src/types/index.ts`
2. Add store logic if needed (Pinia store with Composition API)
3. Implement calculations in `src/utils/calculations.ts` with validation
4. Create/update Vue components using `<script setup>` syntax
5. Add unit tests (`.test.ts` files)
6. Update migration logic if data model changes

### Data Model Changes
- Update `RetirementData` or `UserData` types
- Update validation in `validateImportedData()`
- Add migration function in `migration.ts`
- Update version number in `importExport.ts`
- Test import/export compatibility

### Vue Component Guidelines
- Use Composition API with `<script setup lang="ts">`
- Access stores via `useRetirementStore()` or `useIncomeStore()`
- Bind inputs to store refs directly (Pinia handles reactivity)
- Use computed properties from stores for derived values
- Tailwind CSS for all styling

### Testing
- Unit tests for all utils and stores
- Tests use Vitest with JSDOM environment
- Test files excluded from build via tsconfig.json
- Integration test: `src/phase2-integration.test.ts`

### TypeScript Configuration
- Strict mode enabled with all linting flags
- Target: ES2022, Module: ESNext
- Bundler module resolution
- Path alias: `@/*` maps to `src/*`
- `.test.ts` files excluded from compilation
