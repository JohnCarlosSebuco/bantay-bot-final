# mDNS Auto-Discovery Setup Guide

This guide explains how to enable native mDNS (Bonjour/Zeroconf) for automatic device discovery in BantayBot.

## Current Status

✅ **IP-based connections work** - You can manually enter IP addresses in Settings
❌ **mDNS auto-discovery requires native module** - Currently disabled (USE_MDNS: false)

## Why mDNS?

mDNS allows the app to automatically discover ESP32 boards without needing to know their IP addresses:
- **Camera Board**: `bantaybot-camera.local`
- **Main Board**: `bantaybot-main.local`

## Option 1: Use IP Addresses (Current Setup - No Changes Needed)

The app currently works with manual IP addresses. This is **the recommended approach** if you:
- Don't mind entering IP addresses manually
- Want to avoid native module setup
- Are using Expo Go for development

**To use this:**
1. Go to Settings in the app
2. Enter your Camera IP: `172.24.26.144` (port 80)
3. Enter your Main Board IP: `172.24.26.193` (port 81)
4. Tap "Save Settings"
5. Tap "Test Connections" to verify

## Option 2: Enable Native mDNS (Advanced)

If you want automatic device discovery, follow these steps:

### Prerequisites
- Cannot use Expo Go (must create custom dev client)
- Requires native module compilation
- Takes 10-15 minutes to set up

### Installation Steps

#### 1. Install Dependencies
```bash
cd bantay-bot
npm install react-native-zeroconf
npx install-expo-modules@latest
```

#### 2. Create Custom Development Build
```bash
# Generate native projects
npx expo prebuild

# Build for Android
npx expo run:android

# OR Build for iOS
npx expo run:ios
```

#### 3. Enable mDNS in Config
Edit `src/config/config.js`:
```javascript
USE_MDNS: true,  // Change from false to true
```

#### 4. Verify Installation
The app will automatically:
- Try mDNS discovery first (fast)
- Fall back to IP scanning if mDNS fails
- Show "Using native mDNS discovery" in console logs

### Testing

1. Make sure both ESP32 boards are powered on and connected to WiFi
2. Open the app and go to Settings
3. Tap "Scan Network" (Auto-Discovery section)
4. The app should find devices via mDNS within 3 seconds
5. IP addresses will be auto-filled

### Troubleshooting

#### "mDNS module not available" Error
- Run `npm install` again
- Run `npx expo prebuild --clean`
- Rebuild the app: `npx expo run:android`

#### No Devices Found
- Check that ESP32 boards are on the same WiFi network
- Verify mDNS is working: `ping bantaybot-main.local` (from computer)
- Check ESP32 Serial Monitor for "mDNS responder started" message
- Try increasing scan timeout in `MDNSService.js` (line 68)

#### iOS Specific Issues
- Go to iOS Settings → Privacy → Local Network
- Enable access for BantayBot app
- mDNS requires local network permission on iOS

## How Auto-Discovery Works

```
┌─────────────────────────────────────┐
│  User taps "Scan Network"          │
└──────────────┬──────────────────────┘
               │
               ▼
     ┌─────────────────┐
     │ mDNS Available? │
     └────┬────────┬────┘
          │        │
      YES │        │ NO
          │        │
          ▼        ▼
   ┌──────────┐  ┌────────────┐
   │  Native  │  │ IP Scan    │
   │  mDNS    │  │ (Fallback) │
   │ 3 sec    │  │ 30-60 sec  │
   └──────────┘  └────────────┘
          │        │
          └────┬───┘
               │
               ▼
     ┌─────────────────┐
     │ Devices Found!  │
     │ Auto-fill IPs   │
     └─────────────────┘
```

## Recommendations

### For Development
- **Use IP addresses** (current setup) - faster, easier
- Keep `USE_MDNS: false`

### For Production
- **Enable mDNS** if deploying to end users
- Provides better user experience (no manual IP entry)
- Requires custom dev client setup

## Related Files

- `src/services/MDNSService.js` - Native mDNS wrapper
- `src/services/NetworkDiscoveryService.js` - Discovery orchestration
- `src/config/config.js` - mDNS configuration
- `src/screens/SettingsScreen.js` - UI for manual/auto discovery

## Support

If you encounter issues:
1. Check console logs for detailed error messages
2. Verify ESP32 boards are advertising mDNS correctly
3. Use IP address method as reliable fallback
