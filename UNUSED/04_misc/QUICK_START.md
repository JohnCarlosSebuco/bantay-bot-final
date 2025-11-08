# BantayBot with mDNS - Quick Start Guide

## ✅ What's Been Done

1. ✅ Installed `react-native-zeroconf` for native mDNS support
2. ✅ Generated native Android project with `expo prebuild`
3. ✅ Enabled mDNS in config (`USE_MDNS: true`)
4. ✅ Configured Android SDK location
5. ⏳ **Currently building and installing on your Android device...**

## 📱 Once the Build Completes

The app will automatically:
- Install on your connected Android device
- Launch the BantayBot app
- Show you the updated interface with mDNS support

## 🎯 Testing mDNS Auto-Discovery

**Prerequisites:**
- Both ESP32 boards powered on
- Both connected to WiFi (same network as your phone)
- Phone WiFi connected to same network

**Steps:**
1. Open the BantayBot app on your phone
2. Go to **Settings** tab (bottom navigation)
3. Scroll down to **"Auto-Discovery"** section
4. Tap **"Scan Network"** button

**What should happen:**
```
🔍 Starting mDNS scan...
✅ Found bantaybot-camera at 172.24.26.144:80
✅ Found bantaybot-main at 172.24.26.193:81
📝 Auto-filled IP addresses
```

**Time:** 3-5 seconds (much faster than IP scanning!)

5. Tap **"Test Connections"** to verify both devices
6. Both should show **✅ Connected**

## 🎉 What's Now Available

### Fast Auto-Discovery
- **mDNS First**: Tries native mDNS discovery (3-5 seconds)
- **IP Scan Fallback**: If mDNS fails, scans network (30-60 seconds)
- **Manual Backup**: Can always enter IPs manually

### Connection Flow
```
User taps "Scan Network"
    ↓
Try mDNS Discovery (fast)
    ↓
Found devices? → Yes → Auto-fill IPs ✅
    ↓
    No
    ↓
Try IP Scanning (slower)
    ↓
Found devices? → Yes → Auto-fill IPs ✅
    ↓
    No
    ↓
User enters IPs manually
```

## 📝 Console Logs

You'll see these logs when mDNS works:
```
✅ mDNS module loaded successfully
📡 Using native mDNS discovery...
🔍 Starting mDNS scan for _http._tcp.local.
✅ mDNS scanning started
🔍 Found service: bantaybot-camera
🔍 Found service: bantaybot-main
✅ BantayBot device resolved: {name: 'bantaybot-camera', ip: '172.24.26.144', ...}
✅ BantayBot device resolved: {name: 'bantaybot-main', ip: '172.24.26.193', ...}
✅ Native mDNS found 2 device(s)
```

## 🔧 Troubleshooting

### "No devices found" with mDNS

**Check ESP32 Boards:**
1. Open Serial Monitor for Main Board
2. Look for: `✅ mDNS responder started: bantaybot-main.local`
3. Check Camera Board Serial Monitor
4. Look for: `✅ mDNS responder started: bantaybot-camera.local`

**Test from Computer (same WiFi):**
```bash
ping bantaybot-main.local
ping bantaybot-camera.local
```

Should resolve to your IPs (172.24.26.x)

### mDNS not working?

**Fallback options:**
1. App will automatically try IP scanning (slower but works)
2. Enter IPs manually in Settings (always works)
3. Check that phone has Location permission (required on Android for network scanning)

### Build taking too long?

First build takes 5-10 minutes. Subsequent builds are much faster (1-2 minutes).

## 🚀 What to Do While Building

While the app is building, make sure:
- [ ] Both ESP32 boards are powered on
- [ ] Both are connected to WiFi
- [ ] Check Serial Monitor shows mDNS started
- [ ] Phone is on same WiFi network
- [ ] Phone has good WiFi signal

## ✨ After Installation

1. App launches automatically
2. Go to **Dashboard** - might show "Not Connected" initially
3. Go to **Settings**
4. Tap **"Scan Network"**
5. Wait 3-5 seconds
6. See devices auto-discovered!
7. Tap **"Save Settings"**
8. Tap **"Test Connections"**
9. Go back to **Dashboard** - should now show sensor data and camera feed!

## 📊 Expected Performance

| Discovery Method | Speed | Reliability |
|-----------------|-------|-------------|
| **mDNS** (New!) | 3-5 sec | High (if same network) |
| **IP Scan** | 30-60 sec | Medium (slower) |
| **Manual IP** | Instant | 100% (always works) |

## 🎓 How mDNS Works

```
ESP32 Main Board broadcasts:
  "I'm bantaybot-main at 172.24.26.193:81"

ESP32 Camera broadcasts:
  "I'm bantaybot-camera at 172.24.26.144:80"

BantayBot App listens:
  "Found bantaybot-* devices!"
  → Extracts IP addresses
  → Auto-fills Settings
  → User taps "Save"
  → Connected! 🎉
```

## 📞 Need Help?

1. Check console logs (look for mDNS messages)
2. Verify ESP32 Serial Monitor shows mDNS started
3. Test `ping bantaybot-main.local` from computer
4. Use manual IP entry as reliable fallback
5. Make sure all devices on same WiFi network

---

**Current Status:** ⏳ Building... (check progress in terminal)

Once you see "BUILD SUCCESSFUL" and the app launches, you're ready to go!
