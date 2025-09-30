import { defineConfig } from 'vite'

export default defineConfig({
  // Ensure compatibility with Cloudflare Pages
  build: {
    // Generate static files for deployment
    outDir: 'dist',
    // Ensure assets are properly referenced
    assetsDir: 'assets',
    // Generate source maps for debugging (smaller for production)
    sourcemap: false,
    // Optimize for production
    minify: 'esbuild',
    // Target modern browsers for better optimization
    target: 'es2020',
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Ensure proper file naming for static hosting
    rollupOptions: {
      // Externalize Node.js specific modules for browser compatibility
      external: ['fsevents'],
      output: {
        // Ensure consistent file naming with content hashing
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Optimize chunk splitting
        manualChunks: {
          // Keep vendor code separate for better caching
          vendor: ['vite']
        }
      }
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096
  },
  // Configure for static site deployment (relative paths for Cloudflare Pages)
  base: './',
  // Ensure proper handling of public assets
  publicDir: 'public',
  // Optimize for production
  define: {
    // Remove development-only code
    __DEV__: false
  },
  // Optimize dependencies
  optimizeDeps: {
    // Include dependencies that should be pre-bundled
    include: []
  }
})