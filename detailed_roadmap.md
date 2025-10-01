## Technical Architecture Overview

### Core Technology Stack
- **Frontend Framework**: Vue 3 with TypeScript (simple, reactive, excellent TypeScript support)
- **Build Tool**: Vite (fast, works seamlessly with Cloudflare Pages)
- **Styling**: Tailwind CSS (utility-first, responsive by default)
- **State Management**: Pinia (Vue's official state store, perfect for in-memory data)
- **Charts**: Chart.js with vue-chartjs wrapper
- **Build/Deploy**: GitHub Actions → Cloudflare Pages

### Data Architecture
- All data stored in Pinia store during session
- Import/Export functionality using JSON files
- State structure segregated for main user and spouse
- No persistence between sessions (as requested)

---

## Phase 1: MVP - Basic Retirement Calculator

### Requirements
1. **Input Fields**:
   - Current age
   - Retirement age
   - Current savings
   - Monthly contribution
   - Expected annual return rate (%)
   - Expected inflation rate (%)

2. **Calculations**:
   - Future value of investments at retirement
   - Total contributions vs. investment growth
   - Inflation-adjusted value

3. **Features**:
   - Real-time calculation updates
   - Export configuration as JSON file
   - Import previously saved JSON configuration
   - Basic validation for all inputs

### Implementation Considerations
- Create reusable input components with built-in validation
- Implement a calculation engine as a separate TypeScript module
- Design JSON schema for data export/import
- Mobile-first responsive layout with card-based UI

### Data Schema (Phase 1)
```typescript
interface RetirementData {
  version: string;
  exportDate: string;
  user: {
    currentAge: number;
    retirementAge: number;
    currentSavings: number;
    monthlyContribution: number;
    expectedReturnRate: number;
    inflationRate: number;
  };
}
```

---

## Phase 2: Varied Income Features

### Requirements
1. **Dynamic Income Streams**:
   - Add/remove multiple income sources
   - Each income source has:
     - Name/label
     - Amount
     - Start date (month/year)
     - End date (month/year or ongoing)
     - Frequency (daily/weekly/monthly/yearly/every X days)
   
2. **Income Types**:
   - Salary/wages
   - Rental income
   - Dividends
   - Side business
   - Custom (user-defined)

3. **One-off Investment Returns**:
   - Date of return
   - Amount
   - Description

### Implementation Considerations
- Create an income stream component that can be duplicated
- Implement frequency converter to normalize all income to monthly
- Date picker component for start/end dates
- Validation for date logic (end date after start date)
- Update calculation engine to handle variable income streams

### Extended Schema (Phase 2)
```typescript
interface IncomeStream {
  id: string;
  name: string;
  type: 'salary' | 'rental' | 'dividend' | 'business' | 'custom';
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customFrequencyDays?: number;
  startDate: string; // YYYY-MM
  endDate?: string; // YYYY-MM or null for ongoing
}

interface OneOffReturn {
  id: string;
  date: string; // YYYY-MM
  amount: number;
  description: string;
}
```

---

## Phase 3: Monthly Breakdowns with Charts and Tables

### Requirements
1. **Visualization Features**:
   - Timeline chart showing portfolio growth
   - Monthly breakdown table
   - Toggle between nominal and inflation-adjusted values
   - Milestone markers (retirement age, specific goals)

2. **Table Columns**:
   - Month/Year
   - Age
   - Income (itemized)
   - Contributions
   - Portfolio value
   - Growth this month

3. **Chart Types**:
   - Line chart for portfolio value over time
   - Stacked area chart for income sources
   - Bar chart for annual summaries

### Implementation Considerations
- Implement data aggregation service for chart data
- Add export functionality for charts (PNG/SVG)
- Responsive chart sizing for mobile/desktop
- Performance optimization for large datasets (virtual scrolling for tables)
- Toggle controls for different view options

---

## Phase 4: Retirement Expenses and Inflation

### Requirements
1. **Post-Retirement Expenses**:
   - Monthly living expenses
   - Healthcare costs
   - Travel/leisure budget
   - Other recurring expenses

2. **Inflation Adjustments**:
   - Different inflation rates for different expense categories
   - Medical inflation vs. general inflation

3. **Withdrawal Strategy**:
   - Fixed monthly withdrawal
   - Percentage-based withdrawal
   - Dynamic withdrawal based on portfolio performance

### Implementation Considerations
- Create expense calculator module
- Implement Monte Carlo simulation for success probability
- Add "years until money runs out" calculation
- Warning system for unsustainable withdrawal rates

### Extended Schema (Phase 4)
```typescript
interface RetirementExpense {
  id: string;
  category: 'living' | 'healthcare' | 'travel' | 'other';
  monthlyAmount: number;
  inflationRate: number;
  startAge?: number; // defaults to retirement age
  endAge?: number; // optional end age
}
```

---

## Phase 5: Varied Expenses

### Requirements
1. **Loan Calculations**:
   - Loan amount
   - Interest rate
   - Term length
   - Start date
   - Early repayment options

2. **Irregular Large Expenses**:
   - Home renovation
   - Car purchase
   - Children's education
   - Medical procedures

3. **Tax Considerations**:
   - Income tax (placeholder for Phase 8)
   - Property tax
   - Other taxes

### Implementation Considerations
- Loan amortization calculator component
- Timeline view showing when large expenses occur
- Impact analysis showing effect on retirement goals
- Expense categorization and tagging system

### Extended Schema (Phase 5)
```typescript
interface Loan {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  termMonths: number;
  startDate: string;
  extraPayments?: Array<{date: string; amount: number}>;
}

interface IrregularExpense {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  isRecurring: boolean;
  recurrenceYears?: number;
}
```

---

## Phase 6: CPF Calculations (Singapore)

### Requirements
1. **CPF Account Types**:
   - Ordinary Account (OA)
   - Special Account (SA)
   - Medisave Account (MA)
   - Retirement Account (RA) - after 55

2. **Auto-Calculation Features**:
   - Contribution rates based on age and salary
   - Employer/employee contribution split
   - Annual interest calculation
   - Minimum sum requirements

3. **CPF-Specific Features**:
   - Housing usage from OA
   - Investment scheme options
   - Top-up scenarios
   - Withdrawal rules at different ages

### Implementation Considerations
- Create CPF rules engine based on current regulations
- Annual update mechanism for CPF rates/rules
- Integration with income streams from Phase 2
- CPF Life estimator (annuity calculations)
- Alert system for CPF milestones

### CPF Schema
```typescript
interface CPFData {
  ordinaryAccount: number;
  specialAccount: number;
  medisaveAccount: number;
  retirementAccount?: number; // only after 55
  monthlyContribution: {
    employee: number;
    employer: number;
  };
  housingUsage: number;
  investments: {
    OA: number;
    SA: number;
  };
}
```

---

## Phase 7: Spouse Data

### Requirements
1. **Dual Profile Management**:
   - Complete duplication of all features for spouse
   - Toggle between individual and combined view
   - Separate data storage in state

2. **Shared Elements**:
   - Joint expenses (mortgage, utilities, groceries)
   - Combined retirement goals
   - Household income view

3. **Synchronization Features**:
   - Link shared expenses
   - Combined net worth tracking
   - Joint retirement feasibility

### Implementation Considerations
- Refactor store to handle multiple profiles
- Create profile switcher component
- Implement data merging logic for combined views
- Shared expense allocation options (50/50, proportional, custom)
- Combined export format including both profiles

### Extended Schema (Phase 7)
```typescript
interface CombinedData {
  version: string;
  exportDate: string;
  main: UserProfile;
  spouse?: UserProfile;
  sharedExpenses: SharedExpense[];
  combinedGoals: RetirementGoal[];
}

interface SharedExpense {
  id: string;
  name: string;
  totalAmount: number;
  mainShare: number; // percentage or fixed
  spouseShare: number;
  frequency: string;
}
```

---

## Phase 8: Automatic Income Tax Calculation

### Requirements
1. **IRAS Tax Calculation**:
   - Progressive tax rates
   - Tax reliefs and rebates
   - CPF relief
   - Earned income relief
   - Dependent reliefs

2. **Integration Features**:
   - Automatic calculation based on income streams
   - Tax optimization suggestions
   - Year-end tax estimation
   - Comparison with previous years

### Implementation Considerations
- Create tax calculation engine
- Annual tax rate updates
- Relief eligibility checker
- Tax payment schedule integration
- Export tax summary for filing

---

## Project-Wide Considerations

### User Experience
1. **Progressive Disclosure**: Start simple, reveal complexity as needed
2. **Help System**: Tooltips and contextual help for each field
3. **Validation**: Real-time validation with clear error messages
4. **Responsive Design**: Mobile-first with desktop enhancements

### Technical Considerations
1. **Performance**: 
   - Lazy loading for chart libraries
   - Web Workers for heavy calculations
   - Debounced input handlers

2. **Testing Strategy**:
   - Unit tests for calculation engines
   - Component testing for UI elements
   - E2E tests for critical user flows

3. **Code Organization**:
```
src/
├── components/
│   ├── inputs/
│   ├── charts/
│   ├── tables/
│   └── layouts/
├── stores/
│   ├── retirement.ts
│   ├── income.ts
│   ├── expenses.ts
│   └── cpf.ts
├── utils/
│   ├── calculations/
│   ├── validators/
│   └── formatters/
├── types/
└── views/
```

### Deployment Configuration
```yaml
# Cloudflare Pages configuration
build:
  command: npm run build
  output: dist
  environment:
    - NODE_VERSION: 18
```

### Migration Strategy Between Phases
1. Maintain backward compatibility for JSON imports
2. Version field in export data for migration handling
3. Clear upgrade path messaging for users
4. Feature flags for gradual rollout

Follow KISS principles!!!!