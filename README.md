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
- `npm run build:prod` - Production build with tests and type checking
- `npm run preview` - Preview production build locally
- `npm run verify-deployment` - Verify build meets deployment requirements
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run TypeScript linting
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once

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

This project is optimized for deployment on Cloudflare Pages as a static site with offline functionality.

### Production Features

- **SEO Optimized**: Complete meta tags, Open Graph, and Twitter Card support
- **PWA Ready**: Web app manifest and service worker for offline functionality
- **Performance Optimized**: Asset bundling, minification, and caching headers
- **Static Site**: No server dependencies, works entirely client-side
- **Offline Support**: Service worker caches assets for offline usage

### Build Configuration

The project uses Vite with the following optimizations:
- Relative asset paths for static hosting
- Content-based file hashing for optimal caching
- Minified JavaScript and CSS
- Optimized chunk splitting
- Cloudflare Pages headers for performance

### Deployment Steps

1. **Production Build**:
```bash
npm run build:prod
```
This runs type checking, tests, and builds the optimized production bundle.

2. **Verify Deployment**:
```bash
npm run verify-deployment
```
This ensures all required files are present and properly configured.

3. **Deploy to Cloudflare Pages**:
   - Upload the `dist/` directory contents
   - Set build command: `npm run build`
   - Set build output directory: `dist`
   - No additional configuration needed

### Cloudflare Pages Configuration

The project includes:
- `_headers` file for optimal caching and security headers
- Service worker for offline functionality
- Web app manifest for PWA features
- All assets use relative paths for proper static hosting

### Offline Functionality

The application works completely offline after the first visit:
- Service worker caches all static assets
- localStorage persists user data across sessions
- All calculations happen client-side
- Import/export works without internet connection

## Browser Compatibility

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is private and not licensed for public use.