# Retirement Calculator

A comprehensive retirement planning tool built with Vue 3 and TypeScript, featuring income/expense tracking, loan management, CPF integration, and interactive visualizations.

## Features

- **Basic Planning**: Set retirement age, current savings, and expected return rates
- **Income Sources**: Track multiple income streams with varied frequencies (salary, rental, dividends, etc.)
- **Expense Tracking**: Plan retirement expenses by category with custom inflation rates
- **Loan Management**: Model loans with amortization schedules and extra payments
- **CPF Integration**: Singapore CPF account tracking with contribution calculations and CPF Life estimates
- **Visualizations**: Interactive charts and detailed monthly breakdowns
- **Sustainability Analysis**: See how long your retirement savings will last
- **Import/Export**: Save and load your retirement plans as JSON
- **Mobile-responsive**: Works on desktop and mobile devices

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests once
npm run test:run

# Type check
npm run type-check

# Verify deployment readiness
npm run verify-deployment
```

## Tech Stack

- **Vue 3** with Composition API (`<script setup>`)
- **TypeScript** in strict mode
- **Pinia** for state management
- **Chart.js** with vue-chartjs for visualizations
- **Tailwind CSS** for styling
- **Vitest** for testing (374 tests across 21 test files)
- **Vite** for build tooling

## Project Structure

```
src/
├── components/          # Vue components
│   ├── RetirementForm.vue       # Basic retirement inputs
│   ├── IncomeTab.vue            # Income sources management
│   ├── ExpenseTab.vue           # Expenses and loans
│   ├── CPFForm.vue              # CPF account configuration
│   ├── ResultsDisplay.vue       # Calculation results
│   ├── VisualizationsTab.vue    # Charts and tables
│   ├── ImportExport.vue         # Data import/export
│   └── ...
├── stores/             # Pinia stores
│   ├── retirement.ts   # Basic retirement data
│   ├── income.ts       # Income sources
│   ├── expense.ts      # Expenses and loans
│   └── cpf.ts          # CPF accounts
├── utils/              # Calculations and utilities
│   ├── calculations.ts          # Core retirement calculations
│   ├── loanCalculations.ts      # Loan amortization
│   ├── monthlyProjections.ts    # Pre-retirement projections
│   ├── postRetirementProjections.ts  # Post-retirement analysis
│   ├── cpfContributions.ts      # CPF contribution calculations
│   ├── cpfInterest.ts           # CPF interest calculations
│   ├── cpfTransitions.ts        # CPF age-55 transitions
│   ├── cpfLife.ts               # CPF Life payout estimates
│   └── importExport.ts          # Data import/export
├── types/              # TypeScript types
│   └── index.ts
├── App.vue             # Root component with tabs
└── main.ts             # Entry point
```

## Data Format

Export/Import saves all your data as JSON, including:
- Basic retirement settings (age, savings, rates)
- Income sources and one-off returns
- Expenses, loans, and one-time expenses
- CPF account balances and settings

Exports include version information and timestamps for data migration support.
