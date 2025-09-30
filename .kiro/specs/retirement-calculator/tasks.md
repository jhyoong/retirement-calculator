# Implementation Plan

## Phase 1: Enhanced Income Modeling

- [x] 1. Update core data models for multiple income sources
  - Extend TypeScript interfaces to support IncomeSource and updated RetirementData models
  - Implement validation functions for different income source types
  - Create migration logic for existing simple income data to new structure
  - Write unit tests for new data model validation
  - _Requirements: 1.1, 1.2, 8.3_

- [x] 2. Implement IncomeManager component
  - Create IncomeManager class with methods for adding, removing, and calculating income sources
  - Implement income type-specific calculation logic (regular job, fixed-period, one-time, etc.)
  - Add validation for each income source type with specific business rules
  - Write comprehensive unit tests for all income calculation scenarios
  - _Requirements: 1.3, 1.4, 1.5, 1.7_

- [x] 3. Create income source UI components
  - Build tabbed interface structure with Income tab as primary focus
  - Implement dynamic form components for different income source types
  - Create add/remove income source functionality with proper form validation
  - Add real-time preview of total monthly income from all sources
  - _Requirements: 1.1, 1.6, 1.8_

- [x] 4. Update calculation engine for multiple income sources
  - Modify CalculationEngine to work with IncomeManager for total contribution calculations
  - Implement time-based income calculations (start/end dates, contribution percentages)
  - Add support for annual increases and varying contribution rates
  - Write integration tests for complex income scenarios
  - _Requirements: 1.6, 1.8_

- [x] 5. Update UI controller and data persistence for Phase 1
  - Modify UIController to handle income source management
  - Update DataManager to save and load new income source data structure
  - Implement backward compatibility for existing user data
  - Test complete income management workflow from UI to storage
  - _Requirements: 1.8, 2.1, 2.2, 8.3_

## Phase 2: Monthly Projections and Charts

- [ ] 6. Implement ProjectionManager for detailed calculations
  - Create ProjectionManager class with monthly projection generation
  - Implement inflation adjustment calculations for all monetary values
  - Add retirement phase calculations with monthly withdrawal projections
  - Write unit tests for monthly projection accuracy over long time periods
  - _Requirements: 6.1, 6.3, 6.4_

- [ ] 7. Build ChartManager with Chart.js integration
  - Add Chart.js dependency and configure for retirement projections
  - Implement accumulation phase chart showing fund growth over time
  - Create retirement phase chart showing fund depletion with monthly spending
  - Add chart interaction features (tooltips, zooming, data point details)
  - _Requirements: 6.1, 6.2, 6.7_

- [ ] 8. Create detailed table view for monthly data
  - Implement table component showing month-by-month breakdown of projections
  - Add sorting and filtering capabilities for large datasets
  - Create pagination for handling 40+ years of monthly data efficiently
  - Implement CSV export functionality for table data
  - _Requirements: 6.4, 6.5, 6.7_

- [ ] 9. Integrate charts and tables into results UI
  - Create Results tab with chart/table toggle functionality
  - Implement responsive design for charts on mobile and desktop
  - Add clear visual indicators for retirement phase transition
  - Create loading states for heavy calculation and chart rendering
  - _Requirements: 6.6, 6.7_

- [ ] 10. Update calculation engine for monthly projections
  - Modify CalculationEngine to generate MonthlyProjection arrays
  - Implemewnt efficient algorithms for calculating 600+ months of data
  - Add inflation adjustments to all monetary calculations
  - Write performance tests to ensure calculations complete within reasonable time
  - _Requirements: 6.3, 6.4, 6.5_

## Phase 3: Expense Management

- [ ] 11. Implement ExpenseManager component
  - Create ExpenseManager class with methods for adding, removing, and calculating expenses
  - Implement expense type-specific calculation logic (regular, loan, annual, one-time)
  - Add loan payment calculation functionality with principal, interest, and term
  - Write comprehensive unit tests for all expense calculation scenarios
  - _Requirements: 7.2, 7.3, 7.4, 7.8_

- [ ] 12. Create expense management UI components
  - Build Expense tab with dynamic forms for different expense types
  - Implement add/remove expense functionality with type-specific validation
  - Create loan calculator interface with payment preview
  - Add real-time preview of total monthly expenses and net available income
  - _Requirements: 7.1, 7.2, 7.8_

- [ ] 13. Integrate expenses into calculation pipeline
  - Modify calculation engine to subtract expenses from gross income
  - Update ProjectionManager to include expense calculations in monthly projections
  - Implement net contribution calculations (income minus expenses)
  - Add expense impact visualization to charts and tables
  - _Requirements: 7.5, 7.6, 7.7_

- [ ] 14. Update data models and persistence for expenses
  - Extend RetirementData interface to include Expense array
  - Update DataManager to handle expense data persistence
  - Implement data migration for users upgrading from previous phases
  - Write integration tests for complete expense management workflow
  - _Requirements: 7.8, 2.1, 2.2, 8.3_

## Integration and Finalization

- [ ] 15. Implement phased deployment system
  - Create feature flag system to enable/disable features by phase
  - Implement graceful UI degradation when features are not available
  - Add clear user feedback about which features are currently enabled
  - Write tests for feature flag functionality and phase transitions
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [ ] 16. Update import/export for enhanced data models
  - Modify ImportExportManager to handle new data structures (income sources, expenses)
  - Implement data format versioning for backward compatibility
  - Add validation for imported data with new fields
  - Test import/export round-trip functionality with all new features
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 8.3_

- [ ] 17. Performance optimization and testing
  - Optimize calculation performance for complex scenarios with multiple income/expense sources
  - Implement web workers for heavy monthly projection calculations if needed
  - Add comprehensive integration tests covering all three phases
  - Test application performance with realistic user data scenarios
  - _Requirements: 6.5, 8.1, 9.1, 9.2_

- [ ] 18. Final UI polish and responsive design
  - Update CSS for tabbed interface and new components
  - Ensure responsive design works across all new features
  - Add loading states and progress indicators for long calculations
  - Implement accessibility features for charts and complex forms
  - _Requirements: 6.7, 9.4_

- [ ] 19. Documentation and deployment preparation
  - Update user documentation for new features
  - Create migration guide for users upgrading from basic version
  - Test final build with all phases enabled
  - Verify deployment compatibility with Cloudflare Pages
  - _Requirements: 8.4, 9.1, 9.3_