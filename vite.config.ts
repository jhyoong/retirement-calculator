import { defineConfig } from 'vite'

export default defineConfig({
  // Ensure compatibility with Cloudflare Pages
  build: {
    // Generate static files for deployment
    outDir: 'dist',
    // Ensure assets are properly referenced
    assetsDir: 'assets',
    // Generate source maps for debugging
    sourcemap: true,
    // Optimize for production
    minify: true,
    // Ensure proper file naming for static hosting
    rollupOptions: {
      output: {
        // Ensure consistent file naming
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  // Configure for static site deployment
  base: './',
  // Ensure proper handling of public assets
  publicDir: 'public'
})