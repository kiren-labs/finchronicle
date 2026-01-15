# Security Policy

## 🔒 Reporting a Vulnerability

The Finance Tracker team takes security seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

If you discover a security vulnerability, please do one of the following:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security Advisories page](https://github.com/kiren-labs/finance-tracker/security/advisories)
   - Click "New draft security advisory"
   - Provide detailed information about the vulnerability

2. **Open a Private Issue**
   - Email the maintainers or open a discussion requesting a private channel
   - Do NOT open a public issue for security vulnerabilities

### What to Include

When reporting a vulnerability, please include:

- **Description**: Clear description of the vulnerability
- **Impact**: What an attacker could achieve
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Affected Versions**: Which versions are affected
- **Suggested Fix**: If you have one (optional)
- **Your Contact Info**: How we can reach you for follow-up

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - **Critical**: 1-7 days
  - **High**: 7-30 days
  - **Medium**: 30-90 days
  - **Low**: Next scheduled release

## 🛡️ Security Measures

### Current Implementation

This PWA implements the following security measures:

1. **Privacy First**
   - All data stored locally (localStorage)
   - No data transmitted to servers
   - No tracking or analytics
   - No user accounts or authentication

2. **Content Security**
   - Service Worker for offline functionality
   - Subresource Integrity (SRI) for CDN resources
   - HTTPS-only (enforced on GitHub Pages)

3. **Code Security**
   - No eval() or dangerous dynamic code execution
   - Input sanitization for user data
   - XSS prevention through proper escaping

### Known Limitations

As a client-side-only PWA, please be aware:

- **Local Storage**: Data is not encrypted at rest
- **Browser Security**: Security depends on browser implementation
- **No Server-Side Validation**: All validation is client-side only
- **Physical Access**: Anyone with device access can view data

## 🔐 Best Practices for Users

To keep your financial data secure:

1. **Device Security**
   - Use device password/biometric lock
   - Keep your device OS updated
   - Don't share your device with untrusted users

2. **Browser Security**
   - Keep your browser updated
   - Use reputable browsers (Chrome, Firefox, Safari, Edge)
   - Clear browser data when using shared devices

3. **Data Backup**
   - Regularly export your data to CSV
   - Store backups securely
   - Don't share export files publicly

4. **Suspicious Activity**
   - If your device is compromised, clear browser data
   - Re-install the app from the official source
   - Review your transactions for unauthorized entries

## 🔍 Security Scope

### In Scope

Security issues we will address:

- Cross-Site Scripting (XSS) vulnerabilities
- Code injection vulnerabilities
- Malicious code execution
- Service Worker security issues
- Dependency vulnerabilities
- Privacy leaks or data exposure

### Out of Scope

Issues we cannot address:

- Physical device access
- Browser vulnerabilities (report to browser vendors)
- Network man-in-the-middle attacks (use HTTPS)
- Loss of data due to browser cache clearing
- Third-party CDN compromise (use SRI to mitigate)

## 📜 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x.x   | ✅ Yes             |
| 2.x.x   | ❌ No              |
| 1.x.x   | ❌ No              |

Only the latest major version receives security updates.

## 🏆 Security Hall of Fame

We recognize and thank security researchers who help us:

<!-- Contributors who report security issues will be listed here -->

- No security reports yet

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PWA Security Best Practices](https://developers.google.com/web/fundamentals/security)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

## 📝 Disclosure Policy

- We follow coordinated disclosure
- We will credit researchers (with permission)
- We aim to fix issues before public disclosure
- We will publish security advisories for severe issues

---

**Thank you for helping keep Finance Tracker secure!** 🙏
