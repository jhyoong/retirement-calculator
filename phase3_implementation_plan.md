# Phase 3 Implementation Plan: Monthly Breakdowns with Charts and Tables

## Overview
Add visualization and monthly breakdown features following KISS principles. Chart.js integration, monthly data table, and nominal/inflation-adjusted toggle.

## 1. Foundation: Monthly Data Generation
**Create:** `src/utils/monthlyProjections.ts`
- Function to generate month-by-month breakdown from current age to retirement
- Returns array of monthly data points: { month, year, age, income, contributions, portfolioValue, growth }
- Reuse existing calculation logic from `calculateFutureValueWithIncomeSources`
- Support both legacy (constant contribution) and Phase 2 (variable income) modes

**Test:** Create `src/utils/monthlyProjections.test.ts`
- Test constant monthly contribution scenarios
- Test variable income with start/end dates
- Test one-off returns appear in correct month
- Verify cumulative totals match existing `CalculationResult`

**Checkpoint:** Run tests, verify monthly totals equal existing calculations

## 2. Install Chart.js Dependencies
**Action:** Add chart libraries
```bash
npm install chart.js vue-chartjs
```

## 3. Create Chart Component
**Create:** `src/components/PortfolioChart.vue`
- Simple line chart showing portfolio value over time
- X-axis: Timeline (Year-Month or Age)
- Y-axis: Portfolio value
- Single chart initially (expand later if needed)
- Props: monthlyData array, showInflationAdjusted boolean
- Keep styling minimal using Tailwind

**Test:** Visual verification with sample data in development server

**Checkpoint:** Chart renders correctly with mock data

## 4. Create Monthly Breakdown Table
**Create:** `src/components/MonthlyBreakdownTable.vue`
- Responsive table with columns: Month/Year, Age, Income, Contributions, Portfolio Value, Growth
- Initially show all rows (optimize later if performance issues)
- Tailwind table styling for mobile/desktop
- Props: monthlyData array, showInflationAdjusted boolean
- Format currency values using existing formatCurrency pattern

**Test:** Visual verification with varying data volumes

**Checkpoint:** Table displays correctly on mobile and desktop

## 5. Add Inflation Toggle Logic
**Update:** `src/utils/monthlyProjections.ts`
- Add function to convert nominal values to inflation-adjusted
- Apply to entire monthly data array
- Reuse existing `adjustForInflation` function

**Test:** Add test cases for inflation-adjusted conversions

## 6. Create Main Visualizations View
**Create:** `src/components/VisualizationsTab.vue`
- Container component with toggle for nominal/inflation-adjusted
- Include PortfolioChart component
- Include MonthlyBreakdownTable component
- State management for toggle (local ref, no store needed)
- Pass filtered data to child components

**Checkpoint:** All components integrate correctly

## 7. Update App.vue Tab Navigation
**Update:** `src/App.vue`
- Add new "Visualizations" tab (or rename "Results" to include both)
- Wire up VisualizationsTab component
- Keep existing ResultsDisplay for summary cards

**Checkpoint:** Navigation works, all tabs functional

## 8. Type Definitions
**Update:** `src/types/index.ts`
- Add `MonthlyDataPoint` interface
- Add types for chart data if needed

## 9. Integration Testing
**Create:** `src/phase3-integration.test.ts`
- Test full flow: input data → monthly projections → chart/table
- Verify inflation toggle works correctly
- Test with Phase 1 (legacy) and Phase 2 (income sources) data
- Edge cases: zero interest, very short/long timelines

**Checkpoint:** All integration tests pass

## 10. Final Verification
- Run `npm run type-check` - verify no TypeScript errors
- Run `npm run test:run` - all tests pass
- Run `npm run dev` - manual testing in browser
- Test responsive design on mobile viewport
- Verify backward compatibility with existing JSON exports/imports

## Key KISS Principles Applied
- Reuse existing calculation logic, don't duplicate
- Single chart type initially (line chart)
- Simple toggle implementation (local state, not global store)
- No virtual scrolling initially (add only if performance issues)
- No chart export feature initially (Phase 3 spec says add, but defer to avoid complexity)
- Use existing Tailwind patterns for styling

## Success Criteria
1. Monthly breakdown table displays all required columns
2. Portfolio value chart renders timeline correctly
3. Toggle switches between nominal and inflation-adjusted views
4. All calculations match existing summary results
5. No breaking changes to Phase 1 or Phase 2 features
6. All tests pass
7. TypeScript compiles without errors
