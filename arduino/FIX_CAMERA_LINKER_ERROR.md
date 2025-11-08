# 🔧 Fix Camera Board Linker Error

## The Problem

Error message:
```
undefined reference to `pxCurrentTCB'
collect2.exe: error: ld returned 1 exit status
```

**Cause:** ESP32 Arduino core version 2.0.14+ (2411) has breaking changes that conflict with `ESPAsyncWebServer` library.

---

## ✅ Solution: Downgrade ESP32 Core to 2.0.11

### Step 1: Open Boards Manager

1. Open Arduino IDE
2. Click **Tools** → **Board** → **Boards Manager**
3. Search for "**esp32**"

### Step 2: Install Version 2.0.11

1. Find "**esp32 by Espressif Systems**"
2. Click the dropdown (currently showing 2.0.14 or 3.x)
3. Select **version 2.0.11**
4. Click **Install**
5. Wait for installation to complete

### Step 3: Verify Version

1. Close and reopen Arduino IDE
2. Go to **Tools** → **Board** → **ESP32 Arduino**
3. The version should now be 2.0.11

### Step 4: Upload Camera Code

1. Open `arduino/BantayBot_Camera_ESP32CAM/BantayBot_Camera_ESP32CAM.ino`
2. **Update WiFi credentials** (lines 22-23):
   ```cpp
   const char *ssid = "vivo Y16";          // Your WiFi
   const char *password = "00001111";      // Your password
   ```
3. **Update main board IP** (line 28):
   ```cpp
   const char *mainBoardIP = "172.24.26.193";  // Your main board IP
   ```
4. Select **Board: AI Thinker ESP32-CAM**
5. Bridge **GPIO 0 to GND**
6. Click **Upload** (→)
7. Remove GPIO 0 bridge
8. Press **RESET** button
9. Open **Serial Monitor** (115200 baud)

### Step 5: Expected Output

```
📷 BantayBot Camera Module Starting...
📡 WiFi connecting.....
✅ WiFi connected
✅ Bird detection initialized
✅ Camera HTTP server started
🌐 Camera Ready! http://192.168.1.28
📡 WebSocket: ws://192.168.1.28/ws
✅ BantayBot Camera Module Ready!
```

---

## 🧪 Test Camera Board

### Test 1: Camera Stream

Open browser:
```
http://[CAMERA_IP]/stream
```

You should see live camera feed!

### Test 2: WebSocket Connection

The React Native app will automatically connect when you update the camera IP in `src/config/config.js`:

```javascript
CAMERA_ESP32_IP: '192.168.1.28',  // Change to your camera's actual IP
```

### Test 3: Bird Detection

Wave your hand in front of the camera.

**Camera Serial Monitor should show:**
```
🐦 BIRD DETECTED!
✅ Main board triggered! Response: 200
```

**Main Board Serial Monitor should show:**
```
🚨 ALARM TRIGGERED BY CAMERA! Playing track 2
```

---

## ❓ Why Not Update ESPAsyncWebServer Instead?

The `ESPAsyncWebServer` library hasn't been updated to work with ESP32 core 2.0.14+. Using version 2.0.11 is the officially recommended workaround until the library is updated.

**ESP32 Core 2.0.11 Benefits:**
- ✅ Stable and well-tested
- ✅ Works perfectly with ESPAsyncWebServer
- ✅ Supports all ESP32-CAM features
- ✅ No breaking changes for our code

---

## 🔄 Alternative: Use CameraWebServer Example

If you absolutely cannot downgrade, you can use the built-in example:

1. **File** → **Examples** → **ESP32** → **Camera** → **CameraWebServer**
2. Select AI Thinker board
3. Upload example code
4. It will work, but won't have our custom bird detection features

**Recommendation:** Stick with version 2.0.11 for full BantayBot functionality.

---

## 📋 Summary

| Issue | Solution |
|-------|----------|
| **Error:** `undefined reference to pxCurrentTCB` | Downgrade to ESP32 core 2.0.11 |
| **Current Version:** 2.0.14 (2411) or 3.x | Install 2.0.11 from Boards Manager |
| **Library:** ESPAsyncWebServer | No changes needed |
| **Time:** 2-3 minutes | One-time setup |

---

## ✅ After Fix Checklist

- [ ] ESP32 core version 2.0.11 installed
- [ ] WiFi credentials updated in camera code
- [ ] Main board IP updated in camera code
- [ ] Camera uploads successfully
- [ ] Camera stream works in browser
- [ ] Bird detection triggers alarm
- [ ] WebSocket connects from app

**Once all checked, your BantayBot camera is fully operational! 🎉**

---

**Mabuhay ang Magsasaka! 🇵🇭🌾**
