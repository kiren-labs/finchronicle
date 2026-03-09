#!/usr/bin/env node

/**
 * Build script for FinChronicle - Zero Dependencies
 * Minifies CSS and JavaScript files using pure Node.js
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = process.cwd();
const CSS_DIR = path.join(BASE_DIR, 'css');
const JS_DIR = path.join(BASE_DIR, 'js');
const DIST_DIR = path.join(BASE_DIR, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

console.log('🔨 Building FinChronicle...\n');

// ============================================================================
// CSS Minifier (pure JavaScript)
// ============================================================================

function minifyCSS(content) {
  // Remove comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Normalize whitespace
  content = content.replace(/\s+/g, ' ');
  
  // Remove spaces around CSS operators
  content = content.replace(/\s*([{}:;,>+~\[\]])\s*/g, '$1');
  
  // Fix spacing after : for properties (add single space)
  content = content.replace(/([^:]):(?=[^\s])/g, '$1: ');
  
  // Remove trailing semicolons before }
  content = content.replace(/;}/g, '}');
  
  // Remove last semicolon before }
  content = content.replace(/;\s*}/g, '}');
  
  return content.trim();
}

// ============================================================================
// JavaScript Minifier (basic - pure JavaScript)
// ============================================================================

function minifyJS(content) {
  // Remove block comments (but not banners with /** style)
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove line comments
  content = content.replace(/\/\/.*?$/gm, '');
  
  // Normalize whitespace (but preserve string contents)
  let result = '';
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    // Track string state
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (inString) {
      result += char;
    } else {
      // Outside strings: collapse whitespace
      if (/\s/.test(char)) {
        // Keep one space around operators/keywords, but remove extra
        if (result && !/[\s({\[,;:]$/.test(result) && !/^[\s)\}\],;:]/.test(content[i + 1] || '')) {
          result += ' ';
        }
      } else {
        result += char;
      }
    }
  }
  
  // Final cleanup
  result = result.replace(/\s+/g, ' ');
  result = result.replace(/\s*([{}()\[\];:,.])\s*/g, '$1');
  result = result.replace(/([a-zA-Z0-9_])\s+([a-zA-Z0-9_])/g, '$1 $2');
  
  return result.trim();
}

// ============================================================================
// Minify CSS files
// ============================================================================

const cssFiles = ['tokens.css', 'styles.css', 'dark-mode.css'];

console.log('📦 Minifying CSS...');

cssFiles.forEach(file => {
  const input = path.join(CSS_DIR, file);
  const output = path.join(DIST_DIR, `${file.replace('.css', '.min.css')}`);
  
  try {
    const content = fs.readFileSync(input, 'utf8');
    const minified = minifyCSS(content);
    fs.writeFileSync(output, minified);
    
    const originalSize = fs.statSync(input).size;
    const minifiedSize = fs.statSync(output).size;
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
    
    console.log(`  ✓ ${file}`);
    console.log(`    ${(originalSize / 1024).toFixed(1)} KiB → ${(minifiedSize / 1024).toFixed(1)} KiB (${savings}% smaller)`);
  } catch (err) {
    console.error(`  ✗ Failed to minify ${file}:`, err.message);
  }
});

// ============================================================================
// Minify JavaScript files
// ============================================================================

console.log('\n📦 Minifying JavaScript...');

const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js'));

jsFiles.forEach(file => {
  const input = path.join(JS_DIR, file);
  const output = path.join(DIST_DIR, file);
  
  try {
    const content = fs.readFileSync(input, 'utf8');
    const minified = minifyJS(content);
    fs.writeFileSync(output, minified);
    
    const originalSize = fs.statSync(input).size;
    const minifiedSize = fs.statSync(output).size;
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
    
    console.log(`  ✓ ${file}`);
    console.log(`    ${(originalSize / 1024).toFixed(1)} KiB → ${(minifiedSize / 1024).toFixed(1)} KiB (${savings}% smaller)`);
  } catch (err) {
    console.error(`  ✗ Failed to minify ${file}:`, err.message);
  }
});

// ============================================================================
// Copy HTML and other assets
// ============================================================================

console.log('\n📦 Copying assets...');

const filesToCopy = ['index.html', 'manifest.json', 'sw.js'];

filesToCopy.forEach(file => {
  try {
    const input = path.join(BASE_DIR, file);
    const output = path.join(DIST_DIR, file);
    
    if (fs.existsSync(input)) {
      fs.copyFileSync(input, output);
      console.log(`  ✓ ${file}`);
    }
  } catch (err) {
    console.error(`  ✗ Failed to copy ${file}:`, err.message);
  }
});

// Copy icons directory
try {
  const iconsSrc = path.join(BASE_DIR, 'icons');
  const iconsDest = path.join(DIST_DIR, 'icons');
  
  if (!fs.existsSync(iconsDest)) {
    fs.mkdirSync(iconsDest, { recursive: true });
  }
  
  fs.readdirSync(iconsSrc).forEach(file => {
    fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDest, file));
  });
  console.log(`  ✓ icons/`);
} catch (err) {
  console.error(`  ✗ Failed to copy icons:`, err.message);
}

console.log('\n✅ Build complete!\n');
console.log('📍 Output: ./dist/');
console.log('📝 Next steps:');
console.log('   1. Test the app: python3 -m http.server 8000 --directory dist');
console.log('   2. Update index.html references if deploying to production:');
console.log('      - css/styles.css     → styles.min.css');
console.log('      - css/tokens.css     → tokens.min.css');
console.log('      - css/dark-mode.css  → dark-mode.min.css\n');
