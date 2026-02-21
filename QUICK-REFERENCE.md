# Quick Reference - ES6 Modules in FinChronicle

## The Short Answer

**Q: Can I use import statements in vanilla JS?**
**A: YES! ✅** Here's how:

```javascript
// file1.js - EXPORT functions/variables
export function hello() { return 'Hello!'; }
export const name = 'FinChronicle';

// file2.js - IMPORT and use them
import { hello, name } from './file1.js';  // ⚠️ .js required!
console.log(hello(), name);
```

## Three Required Steps

### 1. Add `export` to your modules
```javascript
// state.js
export const APP_VERSION = '3.10.2';
export let transactions = [];
```

### 2. Add `import` in main file
```javascript
// app.js
import { APP_VERSION, transactions } from './state.js';
```

### 3. Add `type="module"` in HTML
```html
<script type="module" src="./app.js"></script>
```

## Important Rules

| Rule | Example |
|------|---------|
| ✅ Must use `.js` extension | `import { x } from './file.js'` |
| ✅ Must serve via HTTP | `http://localhost:8000` |
| ✅ Must use `type="module"` | `<script type="module">` |
| ❌ Don't use `file://` | Opens in browser directly won't work |
| ❌ Don't omit extension | `'./file'` won't work, use `'./file.js'` |

## FinChronicle Files

```
app.js          → Main app (imports everything)
├── state.js    → State & constants (exported)
├── db.js       → Database functions (exported)
├── utils.js    → Utilities (exported)
└── ui.js       → UI functions (exported)
```

## Test It

```bash
# 1. Start server
python3 -m http.server 8000

# 2. Open browser
open http://localhost:8000

# 3. Check console (F12)
# Should see: "FinChronicle initialized successfully"
```

## Common Issues

| Error | Solution |
|-------|----------|
| "Failed to load module" | Check `.js` extension in import |
| "CORS error" | Use HTTP server, not `file://` |
| "Unexpected token 'export'" | Add `type="module"` to script tag |

## More Info

- [IMPORT-EXPORT-GUIDE.md](IMPORT-EXPORT-GUIDE.md) - Complete guide
- [MODULARIZATION-COMPLETE.md](MODULARIZATION-COMPLETE.md) - Architecture
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Testing checklist

---

**That's it!** ES6 modules work natively in all modern browsers. No webpack, no babel, no npm needed! 🎉
