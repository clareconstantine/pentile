# App Store Launch Checklist

## Web
- [ ] Confirm Vercel deployment is live and on a custom domain

## Mobile

### 1. Finish the app
- [ ] UI polish (footer layout, etc.)
- [ ] Mobile feature parity with web
- [ ] Test as a standalone build (not Expo Go) — `eas build` and install the .ipa/.apk directly

### 2. App assets
- [x] App icon — 1024×1024px, no transparency, no rounded corners
- [x] Splash screen
- [ ] Screenshots — multiple device sizes required
  - iOS: iPhone 6.7", 6.5", iPad
  - Android: various sizes

### 3. Configure app.json
- [ ] `bundleIdentifier` (iOS, e.g. `com.yourname.pentile`)
- [ ] `package` (Android, e.g. `com.yourname.pentile`)
- [ ] `version`, `buildNumber` (iOS), `versionCode` (Android)
- [ ] Display name, orientation (landscape-only — verify Apple guidelines)

### 4. Developer accounts
- [ ] Apple Developer Program — $99/year, up to 48hrs to activate (start early!)
- [ ] Google Play Developer — $25 one-time

### 5. EAS Build setup
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform all
```
EAS handles certificates and signing.

### 6. Privacy policy
- [x] Write a simple privacy policy (no user data collected = easy)
- [x] Host it at a public URL — https://clareconstantine.github.io/pentile/privacy-policy

### 7. Store listings
- [ ] App description and keywords
- [ ] Category: Games
- [ ] Age rating questionnaire
- [ ] Screenshots (from step 2)

### 8. Submit
```bash
eas submit --platform all
```
- Apple review: typically 1–3 days
- Android review: usually faster

## Risks / things to watch
- **Apple review** — landscape-only apps are fine but less common; make sure the app feels complete
- **Standalone build** — test before submitting, not just Expo Go
- **Monetization** — if adding a paywall later, in-app purchase is significant extra work (RevenueCat helps)
