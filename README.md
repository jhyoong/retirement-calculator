# Retirement Calculator

A Vue 3 + TypeScript retirement calculator with import/export functionality.

## Features

- Calculate future retirement value with compound interest
- Real-time input validation
- Inflation-adjusted projections
- Export/Import data as JSON
- Mobile-responsive design

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

## Deployment

### Cloudflare Pages

1. **Connect Repository**
   - Go to Cloudflare Pages dashboard
   - Click "Create a project"
   - Connect your GitHub repository

2. **Build Configuration**
   ```yaml
   Build command: npm run build
   Build output directory: dist
   Root directory: (leave empty)
   Environment variables: NODE_VERSION = 18
   ```

3. **Build Settings**
   - Framework preset: Vite
   - Node version: 18 or higher

### GitHub Actions (Optional CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check
      - run: npm run test:run
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=retirement-calculator
```

**Required GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

### Alternative Deployment Options

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Netlify:**
```bash
npm i -g netlify-cli
netlify deploy --prod
```

## Project Structure

```
src/
├── components/          # Vue components
│   ├── InputField.vue
│   ├── RetirementForm.vue
│   ├── ResultsDisplay.vue
│   └── ImportExport.vue
├── stores/             # Pinia stores
│   └── retirement.ts
├── utils/              # Utility functions
│   ├── calculations.ts
│   ├── calculations.test.ts
│   └── importExport.ts
├── types/              # TypeScript types
│   └── index.ts
├── App.vue             # Root component
├── main.ts             # Entry point
└── style.css           # Global styles
```

## Data Format

Export/Import uses this JSON schema:

```json
{
  "version": "1.0.0",
  "exportDate": "2025-10-01T12:00:00.000Z",
  "user": {
    "currentAge": 30,
    "retirementAge": 65,
    "currentSavings": 50000,
    "monthlyContribution": 1000,
    "expectedReturnRate": 0.07,
    "inflationRate": 0.03
  }
}
```

## Phase 1 Complete

This is the Phase 1 MVP implementation with:
- ✅ Basic retirement calculator
- ✅ 6 input fields with validation
- ✅ Real-time calculations
- ✅ Future value projection
- ✅ Inflation adjustment
- ✅ Import/Export JSON
- ✅ Mobile-responsive UI
- ✅ Comprehensive tests (26 passing)

See `detailed_roadmap.md` for future phases.
