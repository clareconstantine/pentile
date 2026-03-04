# App Store Launch Checklist

## Web
- [ ] Confirm Vercel deployment is live and on a custom domain

## Mobile

### 1. Finish the app
- [x] UI polish (footer layout, etc.)
- [x] Mobile feature parity with web
- [ ] Test as a standalone build (not Expo Go) — `eas build --profile preview --platform ios`, then install .ipa directly
  - Blocked until Apple Developer Program activates

### 2. App assets
- [x] App icon — 1024×1024px (`assets/icon.png`)
- [x] Splash screen (`assets/splash-icon.png`, navy background `#0f1923`)
- [ ] Screenshots — multiple device sizes required
  - iOS: iPhone 6.7", 6.5", iPad

### 3. Configure app.json
- [x] `bundleIdentifier` — `com.clareconstantine.pentile`
- [x] Encryption flag — `ITSAppUsesNonExemptEncryption: false`
- [ ] `version`, `buildNumber` — currently `1.0.0` / `1` (fine for first submission)
- [x] Display name — `pentile`
- [x] Orientation — landscape

### 4. Developer accounts
- [x] EAS — logged in as `clareconstantine`
- [x] EAS project configured — `@clareconstantine/pentile`
- [ ] Apple Developer Program — enrollment in progress (up to 48hrs to activate)
- [ ] Google Play Developer — $25 one-time (skip for now, iOS first)

### 5. EAS Build setup
- [x] `eas.json` configured with `development`, `preview`, `production` profiles
- [x] `appVersionSource: remote`
- To build: `eas build --profile preview --platform ios`

### 6. Privacy policy
- [x] Written (no data collected, contact pentileapp@gmail.com)
- [x] Hosted at https://clareconstantine.github.io/pentile/privacy-policy

### 7. Store listings
- [x] App name — "Pentile"
- [ ] App description and keywords
- [ ] Category: Games
- [ ] Age rating questionnaire
- [ ] Screenshots (from step 2)

### 8. Submit
```bash
eas submit --platform ios
```
- Apple review: typically 1–3 days

## Risks / things to watch
- **Apple review** — landscape-only apps are fine but less common; make sure the app feels complete
- **Standalone build** — test before submitting, not just Expo Go
- **Monetization** — if adding a paywall later, in-app purchase is significant extra work (RevenueCat helps)
