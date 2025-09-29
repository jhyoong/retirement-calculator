# Retirement Calculator

A simple retirement calculator web application that helps users plan for retirement by calculating projected savings and retirement income. Built as a static site for deployment on Cloudflare Pages.

## Features

- Calculate projected retirement savings using compound interest
- Calculate estimated monthly retirement income
- Automatic data persistence using browser localStorage
- Import/Export functionality for data backup and portability
- Responsive design for mobile and desktop
- Works entirely offline (client-side only)

## Development

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run TypeScript linting

### Project Structure

```
src/
├── components/     # UI components
├── services/       # Business logic services
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── main.ts         # Application entry point
└── style.css       # Global styles
```

## Deployment

This project is configured for deployment on Cloudflare Pages as a static site.

### Build Configuration

The project uses Vite with the following optimizations for static hosting:
- Relative asset paths
- Optimized file naming for caching
- Source maps for debugging
- Minification for production

### Deployment Steps

1. Build the project:
```bash
npm run build
```

2. The `dist/` directory contains all files needed for deployment

3. Deploy the `dist/` directory to Cloudflare Pages

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is private and not licensed for public use.