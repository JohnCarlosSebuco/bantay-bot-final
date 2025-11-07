# 🤖 BantayBot Autonomous System Setup

## System Architecture

The BantayBot works **completely autonomously** without needing the mobile app running. The two ESP32 boards communicate directly over WiFi.

```
┌─────────────────────────────────────────────────┐
│                 FARM DEPLOYMENT                 │
│              (No Phone Required!)               │
└─────────────────────────────────────────────────┘

    ┌──────────────┐                ┌──────────────┐
    │ ESP32-CAM    │   WiFi HTTP    │  Main ESP32  │
    │ (Camera)     │ ──────────────>│  (Control)   │
    │ Port 80      │  /trigger-alarm│  Port 81     │
    └──────────────┘                └──────────────┘
           │                               │
           │                               ├─ 🔊 Speaker
           │                               ├─ 🦾 Servos
           │                               ├─ 🔄 Stepper
    📷 Detects Bird                       └─ 🌱 Sensors
           │
           └─> Sends HTTP Request ──> Triggers Alarm Immediately!
```

---

## 🔧 How It Works

### **Step 1: Camera Detects Bird**
- ESP32-CAM constantly monitors for motion
- When bird detected, sends HTTP GET request to main board
- Request URL: `http://192.168.1.29:81/trigger-alarm`

### **Step 2: Main Board Responds**
- Receives request from camera
- Immediately:
  - ✅ Plays next audio track (skips track 3)
  - ✅ Activates servo oscillation (6 cycles)
  - ✅ Logs event to Serial Monitor

### **Step 3: (Optional) App Monitoring**
- If phone with app is nearby, it can:
  - View camera feed
  - See detection count
  - Manually control system
- **But app is NOT required for basic operation!**

---

## ⚙️ Configuration

### **Camera Board Setup**

**File:** `arduino/BantayBot_Camera_ESP32CAM/BantayBot_Camera_ESP32CAM.ino`

**Lines 22-23 - WiFi Credentials:**
```cpp
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";
```

**Lines 28-29 - Main Board IP:**
```cpp
const char *mainBoardIP = "192.168.1.29";  // Change to your main board's actual IP!
const int mainBoardPort = 81;
```

**How to find main board IP:**
1. Upload main board code first
2. Open Serial Monitor
3. Note the IP address displayed (e.g., `192.168.1.29`)
4. Update camera code with this IP

---

### **Main Board Setup**

**File:** `arduino/BantayBot_MainBoard_ESP32/BantayBot_MainBoard_ESP32.ino`

**Lines 20-21 - WiFi Credentials (MUST BE SAME AS CAMERA!):**
```cpp
const char* ssid = "YOUR_WIFI_SSID";        // Same WiFi as camera!
const char* password = "YOUR_WIFI_PASSWORD";  // Same password!
```

---

## 📋 Upload Sequence

### **Step 1: Upload Main Board First**

1. Open `BantayBot_MainBoard_ESP32.ino`
2. Change WiFi credentials (lines 20-21)
3. Select Board: **ESP32 Dev Module**
4. Upload
5. Open Serial Monitor (115200 baud)
6. **Note the IP address** - Example: `192.168.1.29`

Expected output:
```
🤖 BantayBot Main Board Starting...
📡 Connecting to WiFi......
✅ WiFi connected!
📍 IP Address: 192.168.1.29  ← IMPORTANT! Note this!
✅ DFPlayer Mini online
✅ Soil Sensor Initialized
✅ PCA9685 Initialized
✅ PIR Initialized
✅ HTTP server started on port 81
🚀 BantayBot Main Board Ready!
```

---

### **Step 2: Upload Camera Board**

1. Open `BantayBot_Camera_ESP32CAM.ino`
2. Change WiFi credentials (lines 22-23) - **SAME AS MAIN BOARD**
3. **Change main board IP** (line 28) to the IP you noted in Step 1
4. Select Board: **AI Thinker ESP32-CAM**
5. Bridge GPIO 0 to GND
6. Upload
7. Remove GPIO 0 bridge, press RESET
8. Open Serial Monitor (115200 baud)

Expected output:
```
📷 BantayBot Camera Module Starting...
📡 WiFi connecting......
✅ WiFi connected
✅ Bird detection initialized
✅ Camera HTTP server started
🌐 Camera Ready! http://192.168.1.28
📡 WebSocket: ws://192.168.1.28/ws
✅ BantayBot Camera Module Ready!
```

---

## ✅ Testing the System

### **Test 1: Check Both Boards Connected**

**Main Board Serial Monitor:**
```
✅ WiFi connected!
📍 IP Address: 192.168.1.29
```

**Camera Board Serial Monitor:**
```
✅ WiFi connected
📍 IP Address: 192.168.1.28
```

Both should be on the **same network** (192.168.1.X)

---

### **Test 2: Manual Trigger (from Computer)**

Open browser and go to:
```
http://192.168.1.29:81/trigger-alarm
```

**Expected:**
- ✅ Speaker plays audio
- ✅ Servos start moving
- ✅ Main board Serial Monitor shows: `🚨 ALARM TRIGGERED!`

---

### **Test 3: Camera Detection Trigger**

Wave your hand in front of the camera.

**Camera Serial Monitor shows:**
```
🐦 BIRD DETECTED!
✅ Main board triggered! Response: 200
```

**Main Board Serial Monitor shows:**
```
🚨 ALARM TRIGGERED BY CAMERA! Playing track 2
```

**Expected:**
- ✅ Speaker plays audio
- ✅ Servos oscillate
- ✅ System waits 10 seconds before next detection (cooldown)

---

## 🌐 Available Endpoints

### **Main Board (Port 81)**

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| `/status` | GET | Get all sensor data | `http://192.168.1.29:81/status` |
| `/trigger-alarm` | GET | Trigger full alarm sequence | `http://192.168.1.29:81/trigger-alarm` |
| `/play?track=X` | GET | Play specific track (1-7, skip 3) | `http://192.168.1.29:81/play?track=1` |
| `/volume?level=X` | GET | Set volume (0-30) | `http://192.168.1.29:81/volume?level=25` |
| `/move-arms` | GET | Start servo oscillation | `http://192.168.1.29:81/move-arms` |
| `/stop` | GET | Stop all movement | `http://192.168.1.29:81/stop` |

### **Camera Board (Port 80)**

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| `/stream` | GET | View camera feed | `http://192.168.1.28/stream` |
| `/cam.mjpeg` | GET | MJPEG stream | `http://192.168.1.28/cam.mjpeg` |

---

## 🔍 Troubleshooting

### **Camera doesn't trigger main board**

**Check 1: Are both on same WiFi?**
```
Camera IP: 192.168.1.28
Main IP:   192.168.1.29
           ^^^^^^^^^^^  Should be same subnet
```

**Check 2: Is main board IP correct in camera code?**
- Line 28 in camera code should match main board's actual IP

**Check 3: Can camera reach main board?**
From a computer on same network, try:
```
http://192.168.1.29:81/status
```
If this works, the main board is reachable.

**Check 4: Check camera Serial Monitor**
Should see:
```
✅ Main board triggered! Response: 200
```
If you see:
```
❌ Failed to trigger main board: connection refused
```
Then IP address is wrong or main board is not running.

---

### **No audio plays**

**Check 1: DFPlayer SD card**
- Format: FAT32
- Folder: `/mp3/`
- Files: `0001.mp3`, `0002.mp3`, `0004.mp3`, `0005.mp3`, `0006.mp3`, `0007.mp3`
- Track 3 (`0003.mp3`) is skipped

**Check 2: Serial Monitor shows:**
```
⚠️ DFPlayer Mini failed! Check wiring
```
Then check RX/TX wiring (try swapping).

---

### **Servos don't move**

**Check:** External 5V 3A power supply connected to PCA9685 V+ terminal

---

## 📱 Mobile App (Optional)

The app is **optional** for monitoring and manual control.

**Update** `src/config/config.js`:
```javascript
CAMERA_ESP32_IP: '192.168.1.28',    // Camera IP
MAIN_ESP32_IP: '192.168.1.29',      // Main board IP
```

App can:
- ✅ View camera feed
- ✅ See detection count
- ✅ Manually trigger sounds
- ✅ Adjust sensitivity
- ✅ View sensor data

**But the system works perfectly without the app!**

---

## 🎯 System Benefits

✅ **Fully Autonomous** - Works 24/7 without phone
✅ **WiFi Communication** - No wires between boards
✅ **Instant Response** - HTTP request < 100ms
✅ **Redundant Detection** - PIR sensor backup on main board
✅ **Remote Monitoring** - Optional app for statistics
✅ **Low Power** - Can run on solar + battery

---

## 🔋 Power Requirements

**ESP32-CAM:** 5V 2A (USB power bank or solar)
**Main ESP32:** 12V 5A (for servos + stepper)

Can use separate power sources - they only need to share WiFi network!

---

**System Status: ✅ READY FOR AUTONOMOUS DEPLOYMENT! 🌾🇵🇭**
