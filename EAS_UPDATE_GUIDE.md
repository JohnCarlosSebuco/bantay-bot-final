# EAS Update Guide for BantayBot

## What is EAS Update?

EAS Update allows you to push JavaScript and asset updates to your BantayBot app **instantly** without rebuilding and redistributing the APK. This means:

- **Bug fixes in seconds**, not hours
- **New features** deployed immediately (if JS-only)
- **No Google Play Store wait** for most updates
- **Users get updates automatically** on next app launch

---

## When to Use OTA vs Rebuild

### ✅ Can Update OTA (Instant - No Rebuild)

Use `eas update` for these changes:

**Code Changes:**
- JavaScript/TypeScript bug fixes
- React component updates
- UI layout and styling changes
- Business logic improvements
- Alert system tweaks
- Detection algorithm refinements

**Assets:**
- Images and icons (non-splash/app icon)
- Fonts
- Audio files
- JSON data files

**Examples for BantayBot:**
- Fix ImageBB upload logic
- Improve bird detection sensitivity
- Update dashboard UI
- Change button colors
- Fix typos in text
- Adjust Firebase remote control logic
- Update sensor data display

### ❌ Requires Full Rebuild

Use `eas build` for these changes:

**Native Changes:**
- Installing new native packages (e.g., new Firebase modules)
- Updating existing native dependencies
- Expo SDK upgrades
- Native code modifications
- New Android/iOS permissions

**Configuration Changes:**
- App icon or splash screen
- package.json native dependencies
- App identifier or bundle ID
- Build configuration (eas.json profiles)
- AndroidManifest.xml permissions

**Examples:**
- Adding `@react-native-firebase/storage` (new native module)
- Upgrading from Expo SDK 54 to 55
- Changing app icon
- Adding camera permission

---

## Publishing Updates

### Basic Update Command

```bash
eas update --branch [branch-name] --message "Update description"
```

### Common Update Scenarios

#### 1. Development/Testing Updates
```bash
# Publish to preview branch (for testing)
eas update --branch preview --message "Fix bird detection false positives"
```

#### 2. Production Updates
```bash
# Publish to production branch (for released app)
eas update --branch production --message "Critical bug fix for sensor data"
```

#### 3. Quick Update (Auto-generated Message)
```bash
# Uses git commit message as update message
eas update --branch preview
```

### Update Workflow Example

```bash
# 1. Make your code changes (e.g., fix a bug)
# Edit: src/screens/DashboardScreen.js

# 2. Test locally
npm start

# 3. Commit to git (optional but recommended)
git add .
git commit -m "fix: correct soil sensor threshold calculation"

# 4. Publish OTA update
eas update --branch preview --message "Fix soil sensor thresholds"

# ✨ Done! Update is live in ~30 seconds
# Users will receive it on next app launch
```

---

## Branches & Build Profiles

Your app has multiple branches for different environments:

| Branch | Purpose | Users | Command |
|--------|---------|-------|---------|
| `preview` | Testing builds | Test devices | `eas update --branch preview` |
| `production` | Released app | All users | `eas update --branch production` |

**Important:** The branch must match the build profile users have installed.

---

## Checking Update Status

### View Recent Updates
```bash
eas update:list --branch preview
```

### View Update Details
```bash
eas update:view [update-id]
```

### Delete an Update
```bash
eas update:delete [update-id]
```

---

## How Users Receive Updates

### Automatic Updates (Default)
- App checks for updates **on launch** (`checkAutomatically: "ON_LOAD"`)
- Downloads update in background
- Applies on **next app restart**
- No user action required

### Update Timeline
```
You publish update (30s)
    ↓
User opens app → Downloads update (~1-5 seconds)
    ↓
User closes app
    ↓
User reopens app → Update is active ✅
```

### Forcing Immediate Update (Advanced)

If you need users to get updates without restarting, you can implement a force-update UI in the future (requires code changes).

---

## Rollback Strategy

If you publish a bad update:

```bash
# Option 1: Publish a new update with the fix
eas update --branch production --message "Hotfix: revert breaking change"

# Option 2: Republish a previous working update
# Find the working update ID first
eas update:list --branch production

# Republish it
eas update:republish [update-id] --branch production
```

---

## Free Tier Limits

Your current plan includes:

- **1,000 Monthly Active Users (MAU)** - More than enough for testing
- **100 GiB bandwidth/month**
- **Unlimited update publishes**

**What is a MAU?**
A user who downloads at least one update during the month.

**Monitor Usage:**
```bash
eas update:configure --show-usage
```

---

## Common Commands Reference

```bash
# Publish update
eas update --branch preview --message "Description"

# List updates
eas update:list --branch preview

# View specific update
eas update:view [update-id]

# Check configuration
eas update:configure

# View branches
eas branch:list

# Delete update
eas update:delete [update-id]
```

---

## Troubleshooting

### Update Not Appearing

**Problem:** App not receiving updates

**Solutions:**
1. Verify user has a build with updates enabled:
   ```bash
   # Build must be created AFTER enabling EAS Update
   eas build --platform android --profile preview
   ```

2. Check branch matches:
   ```bash
   # Update branch must match build profile branch
   eas update:list --branch preview
   ```

3. Verify app is restarted (not just backgrounded)

4. Check update URL in app.json:
   ```json
   "updates": {
     "url": "https://u.expo.dev/f4705000-111a-4a1c-8e3f-5aa987fd1b81"
   }
   ```

### Update Size Too Large

**Problem:** Update taking too long to download

**Solutions:**
- Compress images before adding
- Remove unused assets
- Split large updates into smaller ones
- Check file sizes: `eas update:list --json`

### "No compatible update found"

**Problem:** Update doesn't match build's runtime version

**Solution:**
- Runtime version in app.json must match between build and update
- If you changed runtimeVersion, you need a new build:
  ```bash
  eas build --platform android --profile preview
  ```

---

## Best Practices

### 1. Test Before Production
```bash
# Always test on preview first
eas update --branch preview --message "Test new feature"

# Verify it works, then publish to production
eas update --branch production --message "Deploy new feature"
```

### 2. Descriptive Messages
```bash
# ❌ Bad
eas update --branch production --message "fixes"

# ✅ Good
eas update --branch production --message "Fix: Soil sensor readings incorrect at high humidity"
```

### 3. Version Control
```bash
# Commit to git before publishing
git add .
git commit -m "fix: correct detection sensitivity threshold"
git push

# Then publish OTA
eas update --branch production --message "Fix detection sensitivity"
```

### 4. Monitor Updates
```bash
# Check update was successful
eas update:list --branch production

# Verify no errors
eas update:view [latest-update-id]
```

### 5. Keep Builds Updated
Every 1-2 months, create a new build with latest native dependencies:
```bash
eas build --platform android --profile production
```

---

## Integration with Firebase Remote Control

The Firebase remote control feature you just implemented **can be updated OTA**!

**Can Update OTA:**
- Firebase command logic (src/services/FirebaseService.js)
- Connection manager improvements (src/services/ConnectionManager.js)
- Control screen UI changes
- New remote commands (if pure JS)

**Requires Rebuild:**
- Updating `@react-native-firebase/database` package version
- Adding new Firebase products (Analytics, Storage, etc.)

---

## Emergency Procedures

### Critical Bug in Production

```bash
# 1. Quickly revert to last working update
eas update:list --branch production
eas update:republish [last-working-id] --branch production

# 2. Or publish hotfix immediately
# (make fix in code first)
eas update --branch production --message "HOTFIX: Critical bird detection crash"
```

### Update Server Down

Users will still be able to use the app with the last successfully downloaded update. No action needed.

---

## Next Steps After Setup

1. **Create First Build with Updates Enabled**
   ```bash
   eas build --platform android --profile preview
   ```

2. **Install Build on Test Device**

3. **Make a Small Test Change**
   - Example: Change a button text in DashboardScreen.js

4. **Publish Test Update**
   ```bash
   eas update --branch preview --message "Test OTA update system"
   ```

5. **Verify Update Received**
   - Close and reopen app
   - Check for your change

6. **Start Using OTA for Real Updates!**

---

## Resources

- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [How EAS Update Works](https://docs.expo.dev/eas-update/how-it-works/)
- [Update Best Practices](https://docs.expo.dev/eas-update/develop-faster/)
- [Deployment Patterns](https://docs.expo.dev/eas-update/deployment-patterns/)

---

## Quick Start After Reading This

To publish your first update:

```bash
# Make code changes
# Test locally

# Publish!
eas update --branch preview --message "My first OTA update"

# That's it!
```

Welcome to instant updates! 🚀
