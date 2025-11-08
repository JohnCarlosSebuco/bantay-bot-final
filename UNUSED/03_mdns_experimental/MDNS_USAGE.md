# Using mDNS Auto-Discovery in BantayBot

## ✅ Setup Complete!

Native mDNS support is now enabled. Your app can automatically discover ESP32 boards without needing IP addresses.

## 🚀 How to Use

### First Time Setup

1. **Make sure both ESP32 boards are powered on** and connected to WiFi
2. **Check they're on the same network** as your phone
3. **Open the BantayBot app** (the custom dev client that's building now)

### Auto-Discovery Methods

#### Method 1: Quick Scan (Recommended)
1. Open the app → Go to **Settings**
2. Scroll to **"Auto-Discovery"** section
3. Tap **"Scan Network"** button
4. Wait 3-5 seconds
5. ✅ Devices found! IPs will auto-fill

#### Method 2: Manual Connection (Fallback)
If auto-discovery doesn't work:
1. Go to **Settings**
2. Manually enter:
   - Camera IP: `172.24.26.144`, Port: `80`
   - Main Board IP: `172.24.26.193`, Port: `81`
3. Tap **"Save Settings"**
4. Tap **"Test Connections"**

## 🔍 What Happens During Scan

```
📡 Starting scan...
├─ Step 1: Try mDNS (3 seconds)
│  ├─ Looking for bantaybot-camera._http._tcp.local
│  └─ Looking for bantaybot-main._http._tcp.local
│
├─ If found: ✅ Auto-fill IPs
└─ If not found: ⏳ Fall back to IP scan (30-60 seconds)
```

## 📊 Expected Results

### Successful mDNS Discovery
```
Console output:
🔍 Starting mDNS scan for _http._tcp.local.
✅ mDNS scanning started
🔍 Found service: bantaybot-camera
🔍 Found service: bantaybot-main
✅ Resolved service: bantaybot-camera (IP: 172.24.26.144)
✅ Resolved service: bantaybot-main (IP: 172.24.26.193)
✅ Native mDNS found 2 device(s)

App UI:
📷 Camera Board: 172.24.26.144:80 ✅
🎛️ Main Board: 172.24.26.193:81 ✅
```

### Failed mDNS Discovery
```
Console output:
🔍 Starting mDNS scan for _http._tcp.local.
⏹️ mDNS scanning stopped
mDNS discovery complete. Found 0 devices.
🔍 Trying hostname resolution fallback...
❌ All strategies failed - falling back to IP scan
🔍 Scanning 172.24.26.1-255 for BantayBot devices...
```

## 🛠️ Troubleshooting

### "No devices found"

**Check ESP32 Boards:**
1. Open Serial Monitor for Main Board
2. Look for: `✅ mDNS responder started: bantaybot-main.local`
3. Open Serial Monitor for Camera Board
4. Look for: `✅ mDNS responder started: bantaybot-camera.local`

**Test from Computer:**
```bash
# On the same WiFi network, try:
ping bantaybot-main.local
ping bantaybot-camera.local

# Should show IP addresses if mDNS works
```

**Check Network:**
- Ensure phone and ESP32 boards are on the **same WiFi network**
- Some WiFi routers block mDNS - try a different network
- Public/Guest WiFi often blocks mDNS

### "mDNS module not available"

If you see this error in console:
```bash
⚠️ mDNS module not available
   Install: npm install react-native-zeroconf
   Then run: npx expo prebuild
```

**Solution:**
```bash
# Rebuild the app
cd bantay-bot
npx expo run:android
```

### Android Permissions

If mDNS isn't working on Android 10+:
1. Go to Android Settings
2. Apps → BantayBot
3. Permissions → Location → Allow (required for network scanning)

### iOS Permissions

On iOS 14+:
1. Go to iOS Settings
2. Privacy → Local Network
3. Enable access for BantayBot

## 📱 Testing Checklist

- [ ] ESP32 Main Board powered on and connected to WiFi
- [ ] ESP32 Camera powered on and connected to WiFi
- [ ] Phone on same WiFi network
- [ ] Opened BantayBot app (custom dev build)
- [ ] Went to Settings
- [ ] Tapped "Scan Network"
- [ ] Devices auto-discovered (or fallback to IP scan)
- [ ] IPs auto-filled in Settings
- [ ] Tapped "Test Connections" → Both show ✅
- [ ] Went to Dashboard → See sensor data and camera feed

## 🎯 Performance Comparison

| Method | Speed | Requires |
|--------|-------|----------|
| **mDNS** | 3-5 seconds | Native module installed |
| **IP Scan** | 30-60 seconds | Nothing (fallback) |
| **Manual IP** | Instant | Know the IPs |

## 🔄 Switching Between Discovery Methods

### Temporarily Disable mDNS
Edit `src/config/config.js`:
```javascript
USE_MDNS: false,  // Change to false
```

### Re-enable mDNS
```javascript
USE_MDNS: true,  // Change back to true
```

No rebuild needed - just restart the app!

## 📝 Console Commands for Debugging

### View mDNS logs
```bash
# Android
adb logcat | grep -i "mdns\|zeroconf\|bantaybot"

# iOS
xcrun simctl spawn booted log stream --predicate 'process == "BantayBot"'
```

### Test from Node.js (for debugging)
```javascript
// In Node REPL or test script
const MDNSService = require('./src/services/MDNSService').default;

MDNSService.scan().then(devices => {
  console.log('Found devices:', devices);
});
```

## 💡 Pro Tips

1. **First scan takes longer** - mDNS needs to discover services
2. **Subsequent scans are faster** - devices are cached
3. **Use static IPs** - Configure your router to assign fixed IPs to ESP32 boards
4. **Name your devices** - Change mDNS names in ESP32 code if you have multiple robots

## 🎓 How mDNS Works

mDNS (Multicast DNS) broadcasts service announcements on the local network:

```
ESP32 Main Board:
  "Hi! I'm bantaybot-main at 172.24.26.193:81"

ESP32 Camera:
  "Hi! I'm bantaybot-camera at 172.24.26.144:80"

BantayBot App:
  "Anyone named 'bantaybot-*'?"
  ← Receives both responses
  → Auto-fills IPs
```

## 📞 Support

Issues? Check:
1. Console logs (look for mDNS messages)
2. ESP32 Serial Monitor output
3. Network connectivity (ping test)
4. Fall back to manual IP entry if needed

Remember: **Manual IP entry always works** as a reliable fallback!
