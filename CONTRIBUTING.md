# Contributing to Finance Tracker

First off, thank you for considering contributing to Finance Tracker! 🎉 It's people like you that make this app better for everyone.

## 🌟 Ways to Contribute

### 1. Report Bugs 🐛
Found a bug? Please [open an issue](https://github.com/kiren-labs/finance-tracker/issues/new?template=bug_report.md) with:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/device information
- Screenshots if applicable

### 2. Suggest Features 💡
Have an idea? [Open a feature request](https://github.com/kiren-labs/finance-tracker/issues/new?template=feature_request.md) with:
- Clear description of the feature
- Why it would be useful
- How it should work
- Any mockups or examples

### 3. Improve Documentation 📝
- Fix typos or unclear instructions
- Add examples or tutorials
- Translate documentation
- Create video guides

### 4. Write Code 🔧
- Fix bugs
- Implement features
- Improve performance
- Add tests

---

## 🚀 Getting Started

### Prerequisites
- Git installed
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Text editor (VS Code recommended)
- Python 3 (for local server)

### Setup Development Environment

1. **Fork the repository**
   - Click "Fork" button on GitHub
   - Clone your fork:
     ```bash
     git clone https://github.com/kiren-labs/finance-tracker.git
     cd finance-tracker
     ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

   Branch naming:
   - `feature/` - New features
   - `fix/` - Bug fixes
   - `docs/` - Documentation
   - `refactor/` - Code refactoring
   - `style/` - UI/CSS changes

3. **Start local server**
   ```bash
   python3 -m http.server 8000
   ```
   Open: http://localhost:8000

4. **Make your changes**
   - Edit `index.html` for UI/features
   - Edit `sw.js` for service worker changes
   - Edit `manifest.json` for PWA settings

---

## 📋 Code Guidelines

### JavaScript Style

```javascript
// Use descriptive variable names
const transactionList = [];  // Good
const tl = [];               // Bad

// Use camelCase for functions and variables
function calculateTotal() { }     // Good
function calculate_total() { }    // Bad

// Add comments for complex logic
// Calculate monthly income by filtering transactions
const monthlyIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

// Use const/let, not var
const MAX_AMOUNT = 1000000;  // Good
var MAX_AMOUNT = 1000000;    // Bad
```

### HTML/CSS Style

```html
<!-- Use semantic HTML -->
<main>  <!-- Good -->
    <section class="card">
        <h2>Title</h2>
    </section>
</main>

<!-- Use meaningful class names -->
<div class="transaction-item">  <!-- Good -->
<div class="ti">                <!-- Bad -->

<!-- Keep inline styles minimal -->
<div class="card">                         <!-- Good -->
<div style="padding: 20px; color: red;">   <!-- Bad -->
```

### Accessibility

- Always add `aria-label` to buttons without text
- Use semantic HTML (`<main>`, `<nav>`, `<button>`)
- Ensure 4.5:1 color contrast ratio
- Test with keyboard navigation
- Test with screen readers

### Version Management

When making changes, update versions:

```javascript
// index.html (line ~1077)
const APP_VERSION = '3.2.0';  // Update this

// sw.js (line 2)
const CACHE_NAME = 'finance-tracker-v6';  // Increment this
```

Versioning rules (Semantic Versioning):
- **MAJOR** (4.0.0): Breaking changes
- **MINOR** (3.2.0): New features, backward compatible
- **PATCH** (3.1.1): Bug fixes only

---

## ✅ Checklist Before Submitting

- [ ] Code follows the style guidelines
- [ ] App works in Chrome, Firefox, Safari, Edge
- [ ] App works on mobile devices
- [ ] Dark mode works correctly
- [ ] No console errors
- [ ] Version numbers updated (if needed)
- [ ] CHANGELOG.md updated
- [ ] Tested offline functionality
- [ ] Tested PWA installation
- [ ] Screenshots added (for UI changes)

---

## 🔄 Pull Request Process

### 1. Test Your Changes

```bash
# Start server
python3 -m http.server 8000

# Test checklist:
✓ All features work
✓ No console errors
✓ Works offline
✓ Dark mode works
✓ Mobile responsive
✓ Installable as PWA
```

### 2. Update Documentation

- Update README.md if needed
- Add entry to CHANGELOG.md:
  ```markdown
  ## [3.2.0] - 2025-01-15
  ### Added
  - Feature description

  ### Fixed
  - Bug fix description
  ```

### 3. Commit Your Changes

```bash
git add .
git commit -m "feat: Add budget tracking feature"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Formatting, styling
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance

Examples:
```
feat: Add recurring transactions
fix: Currency selector not closing on mobile
docs: Update installation instructions
style: Improve button hover states
```

### 4. Push to GitHub

```bash
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Fill out the template:
   - Clear title
   - Description of changes
   - Related issue number
   - Screenshots (for UI changes)
   - Testing done

### 6. Wait for Review

- Maintainers will review within 1-7 days
- Address any feedback
- Once approved, it will be merged!

---

## 🐛 Bug Report Template

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - Device: [e.g. iPhone 12, Desktop]
 - OS: [e.g. iOS 15, Windows 11]
 - Browser: [e.g. Safari 15, Chrome 98]
 - Version: [e.g. v3.1.0]
```

---

## 💡 Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem. Ex. I'm frustrated when [...]

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Add any other context, screenshots, or mockups.
```

---

## 🎨 Design Guidelines

### Colors

```css
/* Light Mode */
--primary: #0051D5;      /* Blue - action buttons */
--success: #34c759;      /* Green - income, positive */
--danger: #ff3b30;       /* Red - expense, delete */
--background: #f5f5f7;   /* Light gray background */
--card: #ffffff;         /* White cards */
--text: #1d1d1f;         /* Dark text */

/* Dark Mode */
--primary: #0A84FF;      /* Lighter blue */
--success: #30d158;      /* Lighter green */
--danger: #ff453a;       /* Lighter red */
--background: #000000;   /* Black background */
--card: #1c1c1e;         /* Dark gray cards */
--text: #f5f5f7;         /* Light text */
```

### Typography

- **Font**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI')
- **Sizes**:
  - Headings: 20-24px
  - Body: 14-16px
  - Small: 12px
  - Numbers: 18-24px

### Spacing

- Use 4px grid: 4, 8, 12, 16, 20, 24px
- Card padding: 16-20px
- Button padding: 12-16px
- Section margins: 16-24px

---

## 🧪 Testing Guidelines

### Manual Testing

Test on:
- ✅ Chrome (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ✅ Safari (desktop & iOS)
- ✅ Edge (desktop)

Test scenarios:
- ✅ Add/edit/delete transactions
- ✅ Switch between tabs
- ✅ Toggle dark mode
- ✅ Change currency
- ✅ Export to CSV
- ✅ Install as PWA
- ✅ Use offline
- ✅ Update app

### Accessibility Testing

- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ Screen reader (VoiceOver, NVDA)
- ✅ Color contrast (use WebAIM checker)
- ✅ Touch targets (min 44x44px)

---

## 📞 Getting Help

Stuck? Need help?

- 💬 [GitHub Discussions](https://github.com/kiren-labs/finance-tracker/discussions)
- 🐛 [Open an issue](https://github.com/kiren-labs/finance-tracker/issues)
- 📧 Or just ask in your PR!

---

## 📜 Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

By participating, you are expected to uphold this code. Please report unacceptable behavior by opening an issue or contacting the project maintainers.

For the full Code of Conduct, see [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 🎉 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Forever appreciated! 💙

---

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Finance Tracker! 🙏**

Every contribution, no matter how small, makes a difference!
