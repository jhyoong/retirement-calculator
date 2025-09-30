#!/usr/bin/env node

/**
 * Deployment verification script for Cloudflare Pages
 * Verifies that the build meets static site requirements
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const DIST_DIR = './dist';
const REQUIRED_FILES = [
  'index.html',
  'sw.js',
  'manifest.json',
  '_headers',
  'vite.svg'
];

const REQUIRED_ASSET_PATTERNS = [
  /index-.*\.js$/,
  /index-.*\.css$/
];

console.log('🔍 Verifying deployment build...\n');

// Check if dist directory exists
if (!existsSync(DIST_DIR)) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Check required files
let allFilesExist = true;
REQUIRED_FILES.forEach(file => {
  const filePath = join(DIST_DIR, file);
  if (existsSync(filePath)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

// Check assets directory
const assetsDir = join(DIST_DIR, 'assets');
if (existsSync(assetsDir)) {
  console.log('✅ assets/ - Directory exists');
  
  // Check for required asset patterns
  const assetFiles = readdirSync(assetsDir);
  
  REQUIRED_ASSET_PATTERNS.forEach(pattern => {
    const found = assetFiles.some(file => pattern.test(file));
    if (found) {
      console.log(`✅ Asset pattern ${pattern} - Found`);
    } else {
      console.log(`❌ Asset pattern ${pattern} - Missing`);
      allFilesExist = false;
    }
  });
} else {
  console.log('❌ assets/ - Directory missing');
  allFilesExist = false;
}

// Verify HTML structure
try {
  const htmlContent = readFileSync(join(DIST_DIR, 'index.html'), 'utf-8');
  
  // Check for essential meta tags
  const checks = [
    { name: 'Viewport meta tag', test: /<meta name="viewport"/ },
    { name: 'Description meta tag', test: /<meta name="description"/ },
    { name: 'Theme color', test: /<meta name="theme-color"/ },
    { name: 'Manifest link', test: /<link rel="manifest"/ },
    { name: 'App div', test: /<div id="app">/ },
    { name: 'Script tag', test: /<script.*src="\.\/assets\/.*\.js"/ }
  ];
  
  checks.forEach(check => {
    if (check.test.test(htmlContent)) {
      console.log(`✅ HTML: ${check.name} - Found`);
    } else {
      console.log(`❌ HTML: ${check.name} - Missing`);
      allFilesExist = false;
    }
  });
} catch (error) {
  console.log('❌ HTML verification failed:', error.message);
  allFilesExist = false;
}

// Verify service worker
try {
  const swContent = readFileSync(join(DIST_DIR, 'sw.js'), 'utf-8');
  
  if (swContent.includes('CACHE_NAME') && swContent.includes('addEventListener')) {
    console.log('✅ Service Worker - Valid structure');
  } else {
    console.log('❌ Service Worker - Invalid structure');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ Service Worker verification failed:', error.message);
  allFilesExist = false;
}

// Verify manifest
try {
  const manifestContent = readFileSync(join(DIST_DIR, 'manifest.json'), 'utf-8');
  const manifest = JSON.parse(manifestContent);
  
  const requiredFields = ['name', 'short_name', 'start_url', 'display'];
  const hasAllFields = requiredFields.every(field => manifest[field]);
  
  if (hasAllFields) {
    console.log('✅ Manifest - Valid structure');
  } else {
    console.log('❌ Manifest - Missing required fields');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ Manifest verification failed:', error.message);
  allFilesExist = false;
}

console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 Deployment verification PASSED!');
  console.log('✅ Ready for Cloudflare Pages deployment');
  console.log('\nNext steps:');
  console.log('1. Upload the dist/ folder to Cloudflare Pages');
  console.log('2. Set build command: npm run build');
  console.log('3. Set build output directory: dist');
  process.exit(0);
} else {
  console.log('❌ Deployment verification FAILED!');
  console.log('Please fix the issues above before deploying.');
  process.exit(1);
}