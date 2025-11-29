# SwapBuds Cookie Policy

**Last Updated:** November 28, 2025
**Effective Date:** March 17, 2026

## 1. What Are Cookies?

Cookies are small text files stored on your device (computer, phone, tablet) that websites send when you visit them. Cookies help websites remember information about you and your preferences.

**Types of cookies:**

- **Session cookies:** Deleted when you close your browser
- **Persistent cookies:** Remain on your device until they expire
- **First-party cookies:** Set by SwapBuds
- **Third-party cookies:** Set by other services we use
- **Tracking cookies:** Monitor your behavior across websites

---

## 2. How We Use Cookies

### A. Essential Cookies (Strictly Necessary)

**Purpose:** Required for Platform to function

| Cookie       | Purpose                              | Duration | Type        |
| ------------ | ------------------------------------ | -------- | ----------- |
| `session_id` | Authentication, keep you logged in   | Session  | First-party |
| `csrf_token` | Security, prevent cross-site attacks | Session  | First-party |
| `auth_token` | Store JWT token (encrypted)          | 30 days  | First-party |
| `device_id`  | Identify your device                 | 1 year   | First-party |

**Cannot be disabled:** These cookies are essential for you to use SwapBuds. Disabling them will prevent login and core functionality.

### B. Functionality Cookies (Preferences)

**Purpose:** Remember your choices and settings

| Cookie                | Purpose                             | Duration | Type        |
| --------------------- | ----------------------------------- | -------- | ----------- |
| `theme_mode`          | Remember dark/light mode preference | 1 year   | First-party |
| `language`            | Remember language selection         | 1 year   | First-party |
| `notification_prefs`  | Remember notification preferences   | 1 year   | First-party |
| `sidebar_collapsed`   | Remember if sidebar is open/closed  | Session  | First-party |
| `delivery_preference` | Remember your delivery method       | 1 year   | First-party |

**Can be disabled:** You can control these in settings (⚙️ → Preferences). Disabling them means your preferences reset.

### C. Analytics Cookies

**Purpose:** Understand how users interact with Platform

| Cookie            | Purpose                        | Processor        | Duration |
| ----------------- | ------------------------------ | ---------------- | -------- |
| `_ga`             | Google Analytics session ID    | Google Analytics | 2 years  |
| `_gat`            | Google Analytics throttle rate | Google Analytics | 1 minute |
| `_gid`            | Google Analytics user ID       | Google Analytics | 24 hours |
| `analytics_token` | Our internal analytics         | SwapBuds/Vercel  | 6 months |

**Purpose of data:**

- Understand page views and traffic
- Identify popular features
- Detect errors and bugs
- Improve performance
- Understand user flows

**Data shared with:**

- Google Analytics (anonymized data)
- Vercel Analytics (performance metrics)
- No third-party tracking

**Can be disabled:** You can disable analytics cookies by opting out in Cookie Preferences. Note: This may prevent us from identifying and fixing bugs.

### D. Advertising & Tracking Cookies

**SwapBuds policy:** We do NOT use advertising or tracking cookies.

We do **NOT** use:

- ❌ Facebook Pixel
- ❌ Google Ads tracking
- ❌ Retargeting cookies
- ❌ Marketing automation cookies
- ❌ Third-party analytics (except Google Analytics)
- ❌ Social media tracking

---

## 3. Security Cookies

**Additional security measures:**

| Cookie          | Purpose                         | Duration |
| --------------- | ------------------------------- | -------- |
| `rate_limit`    | Prevent spam and abuse          | 1 hour   |
| `bot_check`     | Verify you're human (reCAPTCHA) | Session  |
| `secure_flag`   | Ensure HTTPS connection         | Session  |
| `samesite_flag` | Prevent CSRF attacks            | Session  |

All security cookies are essential and cannot be disabled.

---

## 4. Cookie Management

### Enable/Disable Cookies

#### In SwapBuds:

1. Click ⚙️ Settings (top right)
2. Go to "Privacy" or "Cookies"
3. Enable/disable cookie types:
   - ✅ Essential cookies (always on)
   - ☑️ Functionality cookies (toggle)
   - ☑️ Analytics cookies (toggle)
4. Click "Save Preferences"

Your preferences are saved and remembered.

#### In Your Browser:

**Chrome:**

1. Settings → Privacy and security → Cookies and other site data
2. Select "Block all cookies" or "Block third-party cookies"
3. Note: This may break SwapBuds functionality

**Firefox:**

1. Settings → Privacy & Security → Cookies and Site Data
2. Choose "Custom" and select cookie blocking options

**Safari:**

1. Preferences → Privacy → Cookies and website data
2. Choose your preference

**Edge:**

1. Settings → Privacy, search, and services → Cookies and other site data

### Cookie Consent Banner

When you first visit SwapBuds:

- **Banner appears** with cookie notice
- **"Accept All"** button: Accept all cookies
- **"Reject All"** button: Reject non-essential cookies
- **"Preferences"** link: Customize cookie settings
- Your choice is saved in `cookie_consent` cookie

If you later want to change preferences:

1. Go to Settings (⚙️)
2. Click "Cookie Preferences"
3. Update your selections
4. Click "Save"

---

## 5. Third-Party Services & Their Cookies

### Google Analytics

**What it does:**

- Tracks page views and user flows
- Identifies traffic sources
- Measures feature usage
- Reports performance metrics

**Cookies set:**

- `_ga` (2 year duration)
- `_gat` (1 minute)
- `_gid` (24 hours)

**Data shared:**

- Google receives anonymized data
- User IDs are hashed
- IP addresses are masked

**Opt-out:**

- Disable analytics in Cookie Preferences
- Or use Google Analytics Opt-out Browser Extension
- Or disable all cookies

**Privacy:** Google Analytics Privacy Policy: https://policies.google.com/privacy

### Google reCAPTCHA

**What it does:**

- Prevents bots and spam
- Verifies you're human
- Protects against abuse

**Cookies set:**

- Temporary cookies for verification
- No persistent tracking

**Data shared:**

- Google receives verification signals
- IP address and interaction data

**Privacy:** Google reCAPTCHA Privacy: https://policies.google.com/privacy

### Vercel Analytics

**What it does:**

- Monitors Platform performance
- Tracks page load times
- Identifies bottlenecks
- Reports uptime/downtime

**Cookies set:**

- `analytics_token` (6 months)

**Data shared:**

- Vercel receives aggregated metrics
- Not user-specific data

**Privacy:** Vercel Privacy: https://vercel.com/legal/privacy-policy

### Cloudinary (Image Hosting)

**What it does:**

- Hosts and serves images
- Optimizes for different devices
- Tracks CDN performance

**Cookies set:**

- Minimal cookies for CDN optimization

**Data shared:**

- Cloudinary receives usage data
- IP addresses and image requests

**Privacy:** Cloudinary Privacy: https://cloudinary.com/privacy

---

## 6. Cookie Duration & Expiration

**Session cookies:**

- Deleted automatically when you close your browser
- Examples: `session_id`, `auth_token` (while session active)

**Persistent cookies (1-30 days):**

- `rate_limit` (1 hour)
- `language` (7 days)

**Persistent cookies (1-6 months):**

- `analytics_token` (6 months)
- `device_id` (1 year, but can be cleared)
- `theme_mode` (1 year)

**Persistent cookies (1-2 years):**

- `_ga` (2 years) - Google Analytics
- `auth_token` (30 days, but renews on login)

---

## 7. Cookies by Feature

### Authentication/Login

- `auth_token` - Keeps you logged in
- `session_id` - Session tracking
- `csrf_token` - Security protection

### Trading

- `delivery_preference` - Your preferred delivery method
- `last_viewed_trade` - Remember last trade viewed
- `trade_filter` - Remember filter preferences

### Notifications

- `notification_prefs` - Push notification settings
- `notification_dismissed` - Remember dismissed alerts

### User Interface

- `theme_mode` - Dark/light mode
- `language` - Language preference
- `sidebar_collapsed` - UI state

### Analytics/Performance

- `_ga`, `_gat`, `_gid` - Google Analytics
- `analytics_token` - Our analytics
- Performance monitoring data

### Security

- `rate_limit` - Prevent spam
- `bot_check` - Bot protection
- `secure_flag` - HTTPS enforcement

---

## 8. Your Cookie Choices

### Option 1: Accept All Cookies

- Click "Accept All" on banner
- All cookies enabled
- All functionality available
- Analytics enabled

### Option 2: Reject Non-Essential

- Click "Reject All" on banner
- Only essential cookies enabled
- Full functionality maintained
- No analytics tracking

### Option 3: Customize

- Click "Preferences"
- Select specific cookie types
- Balanced experience
- Your choice is saved

### Option 4: Disable in Browser

- Use browser settings (see above)
- May break some features
- Some cookies may persist

**Our recommendation:**

- Accept essential cookies (required)
- Enable functionality cookies (improves experience)
- Enable analytics (helps us improve)
- Disable if you prefer privacy

---

## 9. Do Not Track (DNT)

If you have DNT enabled in your browser:

- We respect your DNT preference
- Analytics cookies may be disabled
- We will not track across websites
- Essential cookies still used (required)

To enable DNT:

- Chrome: Settings → Privacy → Send "Do Not Track" (toggle on)
- Firefox: Settings → Privacy → Enable "Do Not Track"
- Safari: Preferences → Privacy → "Ask websites not to track me"

---

## 10. Mobile Apps

If SwapBuds has mobile apps:

- Similar cookies and tracking as web
- Mobile storage equivalent to cookies
- Can be cleared in app settings
- Privacy Policy still applies

---

## 11. Children & Cookies

- SwapBuds is for 18+ only
- No cookies specifically target children
- Parents concerned: Contact privacy@swapbuds.com
- Age verification prevents underage access

---

## 12. Cookie Updates

This Cookie Policy may be updated:

- **Minor changes:** Effective immediately
- **Major changes:** 30 days notice
- **Version:** Shown at bottom of this page
- **Previous versions:** Available on request

We'll notify you of material changes via:

- Platform notification
- Updated policy page
- Email (if major changes)

---

## 13. Third-Party Cookies

### Cookies We Set:

- First-party cookies from SwapBuds domain

### Cookies Others Set:

- Google Analytics (Google)
- Google reCAPTCHA (Google)
- Vercel Analytics (Vercel)
- Cloudinary (Cloudinary)

We are **NOT responsible** for:

- Third-party cookie practices
- Third-party data collection
- Third-party security
- Changes to third-party cookies

---

## 14. International Cookies

### GDPR (EU Users):

- Cookies require consent (except essential)
- You can withdraw consent anytime
- Cookie preferences saved in EU compliance mode

### CCPA (California Users):

- We do not sell cookie data
- You have right to opt-out
- Cookie preferences honored

### LGPD (Brazil Users):

- Cookies require clear consent
- Privacy preferences available
- Contact privacy@swapbuds.com for rights

---

## 15. Cookie Troubleshooting

### "Cookies disabled" message:

- Enable cookies in browser settings
- Clear browser cache and cookies
- Try different browser or device
- Contact support@swapbuds.com

### "Can't stay logged in":

- Ensure session cookies are enabled
- Check if cookies are being cleared automatically
- Try disabling browser extensions
- Clear cache and cookies, log in again

### "I don't see my preferences":

- Ensure preference cookies are enabled
- Clear browser cache
- Update your preferences again

### "Ads following me":

- We don't use advertising cookies
- Check browser extensions
- Check other websites' tracking
- Use privacy-focused browser

---

## 16. Privacy & Contact

**Cookie questions:** privacy@swapbuds.com
**Privacy concerns:** privacy@swapbuds.com
**Data requests:** privacy@swapbuds.com

**How to make a request:**

1. Email privacy@swapbuds.com
2. Subject: "Cookie-related request"
3. Include: Your username and specific question
4. Response time: 30 days

---

## 17. Links to Other Policies

- **Terms of Service:** [Link to Terms]
- **Privacy Policy:** [Link to Privacy]
- **Cookie Policy:** You are here

Together, these policies explain how SwapBuds works.

---

## 18. Summary Table

| Cookie Type    | Essential? | Purpose             | Can Disable? |
| -------------- | ---------- | ------------------- | ------------ |
| Authentication | Yes        | Keep you logged in  | No           |
| Security       | Yes        | Prevent attacks     | No           |
| Preferences    | No         | Remember settings   | Yes          |
| Analytics      | No         | Understand usage    | Yes          |
| Advertising    | No\*       | None (we don't use) | N/A          |

\*We do NOT use advertising cookies

---

**Version:** 1.0.0
**Last Updated:** November 28, 2025
**Effective Date:** March 17, 2026

If you have questions about cookies, please contact us at privacy@swapbuds.com.
