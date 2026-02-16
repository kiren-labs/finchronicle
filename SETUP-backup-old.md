# 🚀 Repository Setup Guide

This guide will help you set up the Finance Tracker repository for the first time.

---

## 📋 Checklist for New Repository

### 1. Create GitHub Repository

```bash
# On GitHub.com:
1. Click "New repository"
2. Name: finchronicle
3. Description: "A beautiful, offline-first Progressive Web App for tracking personal finances"
4. Public repository
5. DO NOT initialize with README (we have one)
6. Create repository
```

### 2. Push Your Code

```bash
# Navigate to offline-tracker folder
cd /Users/kiren.paul/Projects/kiren-labs/personal-finance/offline-tracker

# Initialize git (if not already)
git init

# Add files
git add .

# First commit
git commit -m "Initial commit: Finance Tracker v3.1.0"

# Add remote (replace kiren-labs with your GitHub username)
git remote add origin https://github.com/kiren-labs/finchronicle.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Enable GitHub Pages

```bash
# On GitHub.com:
1. Go to repository Settings
2. Scroll to "Pages" section
3. Source: "Deploy from a branch"
4. Branch: main
5. Folder: / (root)
6. Click "Save"
7. Wait 1-2 minutes
8. Your app will be live at: https://kiren-labs.github.io/finchronicle/
```

### 4. Update README with Your URL

Replace all instances of `kiren-labs` in README_OPENSOURCE.md with your actual GitHub username:

```bash
# Quick find and replace
# macOS/Linux:
sed -i '' 's/kiren-labs/your-actual-username/g' README_OPENSOURCE.md

# Or manually edit README_OPENSOURCE.md
```

Then rename it:
```bash
mv README_OPENSOURCE.md README.md
```

### 5. Set Up Repository Settings

#### Description
```
A beautiful, offline-first Progressive Web App for tracking personal finances
```

#### Website
```
https://kiren-labs.github.io/finchronicle/
```

#### Topics (Tags)
Add these topics to make your repo discoverable:
```
pwa
progressive-web-app
finchronicle
expense-tracker
offline-first
javascript
budget
personal-finance
money-management
no-backend
privacy-first
```

#### About Section
- [x] Include in the home page

### 6. Add Repository Banner (Optional)

Create a banner image at:
```
screenshots/banner.png
```

Dimensions: 1280 x 640 pixels

Update README.md to include it:
```markdown
<div align="center">
  <img src="screenshots/banner.png" alt="Finance Tracker Banner" width="100%"/>
</div>
```

### 7. Enable Discussions (Optional)

```bash
# On GitHub.com:
1. Go to Settings
2. Scroll to "Features"
3. Check "Discussions"
4. Create categories:
   - General
   - Ideas
   - Q&A
   - Show and tell
```

### 8. Set Up GitHub Actions (Optional)

Create `.github/workflows/lighthouse.yml` for automatic Lighthouse testing on each push.

### 9. Add Social Preview

```bash
# On GitHub.com:
1. Go to repository Settings
2. Scroll to "Social preview"
3. Upload image: 1280 x 640 pixels
```

Use a screenshot of your app or create a custom banner.

---

## 📁 Repository Structure

After setup, your repository should have:

```
finchronicle/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── index.html              # Main app
├── sw.js                   # Service worker
├── manifest.json           # PWA manifest
├── robots.txt              # SEO
├── README.md              # Main documentation
├── CONTRIBUTING.md        # Contribution guidelines
├── CHANGELOG.md           # Version history
├── LICENSE               # MIT License
├── VERSION.md            # Version management guide
└── SETUP.md              # This file
```

---

## 🎨 Optional: Add Screenshots

Create a `screenshots/` folder and add:

1. **home.png** - Main screen with summary
2. **add-transaction.png** - Add transaction form
3. **list.png** - Transaction list
4. **dark-mode.png** - Dark mode view
5. **currency.png** - Currency selector
6. **mobile.png** - Mobile view

Take screenshots at:
- Desktop: 1440px width
- Mobile: 375px width (iPhone size)

---

## 🔧 Configuration Files

### GitHub README Badge URLs

Update these in README.md:

```markdown
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)](VERSION.md)
[![Live Demo](https://img.shields.io/badge/demo-live-success.svg)](https://kiren-labs.github.io/finchronicle/)
```

### manifest.json URLs

Update if you change the repository name:

```json
{
  "start_url": "/finchronicle/",
  "scope": "/finchronicle/"
}
```

---

## 🚀 After Setup

### Test Everything

1. Visit your GitHub Pages URL
2. Test on desktop browser
3. Test on mobile device
4. Install as PWA on iPhone
5. Test offline functionality
6. Check all features work

### Promote Your App

1. Share on Twitter/LinkedIn
2. Post on Reddit (r/webdev, r/personalfinance)
3. Submit to:
   - Product Hunt
   - Hacker News
   - Indie Hackers
4. Write a blog post about it
5. Create a demo video

### Monitor

1. Watch for issues on GitHub
2. Check GitHub Stars
3. Monitor web traffic (optional: Google Analytics)
4. Collect user feedback

---

## 📊 Analytics (Optional)

### GitHub Analytics

Track automatically:
- Stars
- Forks
- Issues
- Pull Requests
- Traffic

### Web Analytics

Add Google Analytics (optional):

```html
<!-- Add to index.html <head> -->
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

**Note**: Be transparent about analytics in README!

---

## 🎯 Marketing Checklist

- [ ] Add open source badge to README
- [ ] Create social media preview image
- [ ] Write launch blog post
- [ ] Share on Twitter with hashtags
- [ ] Post on relevant subreddits
- [ ] Submit to Product Hunt
- [ ] Share in Discord/Slack communities
- [ ] Email tech newsletters
- [ ] Create demo video
- [ ] Add to awesome-pwa lists

---

## 🔄 Ongoing Maintenance

### Weekly
- [ ] Check and respond to issues
- [ ] Review pull requests
- [ ] Update dependencies (if added)

### Monthly
- [ ] Review roadmap
- [ ] Plan next version
- [ ] Update documentation

### When Releasing
- [ ] Update VERSION.md
- [ ] Update CHANGELOG.md
- [ ] Update version numbers in code
- [ ] Create GitHub release
- [ ] Announce in Discussions
- [ ] Share on social media

---

## 🆘 Common Issues

### GitHub Pages Not Working

1. Check Settings → Pages is enabled
2. Wait 2-3 minutes for deployment
3. Check repository is Public
4. Verify branch is `main` and folder is `/`

### PWA Not Installing

1. Ensure HTTPS (GitHub Pages has this)
2. Check manifest.json is valid
3. Check service worker registers
4. Use Chrome DevTools → Application → Manifest

### Service Worker Issues

1. Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. Clear cache in DevTools
3. Unregister old service worker
4. Increment CACHE_NAME in sw.js

---

## 📞 Need Help?

- 📖 Read [CONTRIBUTING.md](CONTRIBUTING.md)
- 💬 Start a [GitHub Discussion](https://github.com/kiren-labs/finchronicle/discussions)
- 🐛 Open an [Issue](https://github.com/kiren-labs/finchronicle/issues)

---

**Congratulations on setting up your open-source project! 🎉**

Now go build something amazing! 🚀
