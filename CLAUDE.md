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
- Run a single test file: `npm test -- src/services/CalculationEngine.test.ts`

### Type Checking & Linting
- `npm run type-check` - Run TypeScript type checking without emitting files
- `npm run lint` - Alias for type-check

### Deployment
- `npm run verify-deployment` - Verify build meets deployment requirements for Cloudflare Pages

## Architecture Overview

### Application Structure
This is a TypeScript-based retirement calculator built with Vite and vanilla TypeScript (no framework). The application uses a service-oriented architecture with clear separation of concerns:

**Entry Point**: `src/main.ts` - Initializes UIController and renders HTML structure inline

**Layers**:
- **Controllers**: Coordinate between UI and services (UIController is the main coordinator)
- **Services**: Business logic and data management (CalculationEngine, DataManager, IncomeManager, etc.)
- **Components**: UI-specific logic (IncomeSourceUI, TabManager, ResultsUI)
- **Types**: TypeScript type definitions centralized in `src/types/index.ts`
- **Utils**: Shared utilities (validation, migration helpers)

### Key Services

**CalculationEngine** (`src/services/CalculationEngine.ts`):
- Performs all retirement calculations using compound interest formulas
- Validates input data comprehensively
- Supports both simple (constant contribution) and time-based calculations (varying income over time)
- Key methods:
  - `calculateFutureValue()` - Standard compound interest with monthly contributions
  - `calculateFutureValueWithTimeBasedIncome()` - Month-by-month calculation for variable income
  - `calculateRetirement()` - Main calculation entry point
  - `validateInputs()` - Comprehensive input validation

**DataManager** (`src/services/DataManager.ts`):
- Handles localStorage persistence
- Automatically migrates legacy data formats
- Validates data structure on load
- Converts date strings to Date objects when loading

**IncomeManager** (`src/services/IncomeManager.ts`):
- Manages multiple income sources with different characteristics
- Supports income types: regular_job, fixed_period, one_time, rental, investment
- Calculates time-based contributions accounting for:
  - Start/end dates
  - Annual increases
  - Contribution percentages
  - One-time payments

**ImportExportManager** (`src/services/ImportExportManager.ts`):
- Handles data export to JSON with versioning
- Validates imported data structure and version compatibility
- Creates downloadable JSON files for backup

**NotificationService** (`src/services/NotificationService.ts`):
- Global notification system for user feedback
- Supports success, error, info, and warning notifications
- Auto-dismisses after timeout

### UI Components

**UIController** (`src/controllers/UIController.ts`):
- Main coordinator for the entire application
- Initializes all services and components
- Handles form validation and error display
- Implements debounced real-time calculations (300ms delay)
- Auto-saves data to localStorage
- Manages import/export flows

**IncomeSourceUI** (`src/components/IncomeSourceUI.ts`):
- Manages income source form and list display
- Dynamic form fields based on income type selection
- Real-time summary calculations
- Callback pattern to notify parent of changes

**TabManager** (`src/components/TabManager.ts`):
- Manages tab navigation between Income Sources, Basic Info, and Results
- Uses ARIA attributes for accessibility

**ResultsUI** (`src/components/ResultsUI.ts`):
- Displays calculation results with formatted currency
- Updates UI based on CalculationResult

### Data Flow
1. User interacts with UI (form inputs, income sources)
2. UIController captures events with debounced handlers
3. Data flows to IncomeManager and CalculationEngine services
4. Results flow back through UIController to UI components
5. DataManager auto-saves to localStorage
6. NotificationService provides user feedback

### TypeScript Configuration
- Strict mode enabled with comprehensive linting rules
- Target: ES2022, Module: ESNext
- Bundler module resolution (Vite)
- Test files excluded from compilation

### Data Persistence
All user data is stored in browser localStorage with automatic migration from legacy formats. The system supports:
- Import/Export for data backup and portability
- Version tracking for data compatibility
- Automatic data validation on load

### Testing Strategy
- Unit tests for all services (using Vitest)
- Integration tests for data flow (`src/integration.test.ts`)
- Performance tests for calculation engine
- Tests use `.test.ts` suffix and are excluded from production builds

### Deployment Target
Static site deployment to Cloudflare Pages with:
- PWA support via service worker
- Offline functionality
- SEO optimization
- Performance headers configured

## Development Notes

### When Adding New Features
- Add types first in `src/types/index.ts`
- Implement service logic with comprehensive validation and error handling
- Add unit tests for new service methods
- Update UIController to integrate new functionality
- Update relevant UI components
- Test import/export compatibility if data model changes

### Data Model Changes
If changing RetirementData or related types:
- Update migration logic in `src/utils/validation.ts`
- Test backward compatibility with legacy data
- Update ImportExportManager version handling if needed
- Add migration tests

### Calculation Logic
- Always validate inputs before calculations
- Handle edge cases (zero interest, negative values, overflow)
- Round monetary values to 2 decimal places
- Use month-by-month calculations for time-based income sources
- Legacy monthlyContribution field maintained for backward compatibility
