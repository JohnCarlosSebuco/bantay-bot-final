# 🎯 BantayBot Hardware-App Alignment Summary

**Date:** October 11, 2025
**Status:** ✅ COMPLETE

This document summarizes the complete hardware-app alignment based on the existing Arduino codes found in `existingArduinoCodes/`.

---

## 📋 What Was Done

### 1. Hardware Analysis ✅

**Analyzed Existing Arduino Codes:**
- `existingArduinoCodes/CameraWebServerESP32camcodey.ino` - ESP32-CAM camera module
- `existingArduinoCodes/esp32board-noCam.ino` - Main control board with all peripherals

**Hardware Configuration Identified:**

| Component | Hardware | Pins | Details |
|-----------|----------|------|---------|
| **Camera Board** | AI Thinker ESP32-CAM | Built-in camera pins | OV2640/OV3660, QVGA resolution |
| **Audio** | DFPlayer Mini | RX:GPIO27, TX:GPIO26 | 7 tracks (skip track 3), volume 0-30 |
| **Soil Sensor** | RS485 4-in-1 | RX:GPIO17, TX:GPIO16, RE:GPIO4 | 4800 baud, Modbus RTU |
| **Stepper Motor** | TMC2225 driver | STEP:GPIO25, DIR:GPIO33, EN:GPIO32 | Head rotation |
| **Servos** | PCA9685 (2 servos) | SDA:GPIO21, SCL:GPIO22 | Oscillation mode: 6 cycles |
| **PIR Sensor** | HC-SR501 | GPIO14 | Motion detection, 2min timeout, 30s cooldown |

### 2. Arduino Firmware Created ✅

**New Arduino Project Structure:**
```
arduino/
├── BantayBot_Camera_ESP32CAM/
│   ├── BantayBot_Camera_ESP32CAM.ino    # Camera + WebSocket firmware
│   └── board_config.h                    # AI Thinker pin definitions
│
├── BantayBot_MainBoard_ESP32/
│   ├── BantayBot_MainBoard_ESP32.ino    # Main control board firmware
│   └── config.h                          # Hardware configuration
│
├── ARDUINO_UPLOAD_GUIDE.md              # Upload instructions
└── README.md                             # Project overview
```

**Key Features Implemented:**

**Camera Board:**
- HTTP camera streaming at `/stream`
- WebSocket API on port 80
- Bird detection with adjustable sensitivity (1-3)
- Camera controls (brightness, contrast, grayscale)
- Real-time bird detection alerts

**Main Board:**
- WebSocket API on port 81
- RS485 soil sensor reading (humidity, temp, conductivity, pH)
- DFPlayer audio control (7 tracks, skip track 3)
- PCA9685 servo control with oscillation mode
- Stepper motor head rotation (-180° to +180°)
- PIR motion detection with auto-trigger
- Hardware auto-detection (graceful degradation if components missing)

### 3. React Native App Updated ✅

**Updated Files:**

1. **`src/config/config.js`** ✅
   - Added dual ESP32 configuration (camera + main board)
   - `CAMERA_ESP32_IP` / `CAMERA_ESP32_PORT` (default: 192.168.1.28:80)
   - `MAIN_ESP32_IP` / `MAIN_ESP32_PORT` (default: 192.168.1.29:81)
   - Added audio config (7 tracks, skip track 3)
   - Added stepper motor config (-180° to +180°)
   - Added servo oscillation config (6 cycles, 30ms interval)
   - Added PIR config (2min timeout, 30s cooldown)

2. **`src/services/WebSocketService.js`** ✅
   - Dual WebSocket support (main board + camera board)
   - Separate connections: `mainWs` and `cameraWs`
   - Connection methods: `connectMain()`, `connectCamera()`, `connectAll()`
   - Send methods: `sendToMain()`, `sendToCamera()`
   - Connection status tracking
   - Independent reconnection logic for each board
   - Backward compatible with legacy `send()` method

**Connection Status API:**
```javascript
WebSocketService.getConnectionStatus()
// Returns: { main: true, camera: true, fullyConnected: true }
```

### 4. Documentation Created ✅

**New Documentation:**
- `arduino/ARDUINO_UPLOAD_GUIDE.md` - Complete upload instructions for both boards
- `arduino/README.md` - Arduino project overview and API reference

**Updated Documentation:**
- Pin configurations match existing hardware
- WebSocket API documented for both boards
- Testing procedures aligned with hardware

---

## 🔌 Hardware-App Communication Protocol

### Camera Board WebSocket (ws://[IP]:80/ws)

**App → Camera Commands:**
```json
{"command": "TOGGLE_DETECTION"}
{"command": "SET_SENSITIVITY", "value": 2}      // 1=Low, 2=Med, 3=High
{"command": "RESET_BIRD_COUNT"}
{"command": "SET_BRIGHTNESS", "value": 1}       // -2 to +2
{"command": "SET_CONTRAST", "value": 0}         // -2 to +2
{"command": "TOGGLE_GRAYSCALE"}
```

**Camera → App Messages:**
```json
// Status updates
{
  "type": "camera_status",
  "birdDetectionEnabled": true,
  "birdsDetectedToday": 5,
  "detectionSensitivity": 2,
  "brightness": 0,
  "contrast": 0,
  "grayscale": false
}

// Bird detection alert
{
  "type": "bird_detection",
  "message": "Bird detected!",
  "count": 6,
  "timestamp": 123456
}
```

### Main Board WebSocket (ws://[IP]:81/ws)

**App → Main Board Commands:**
```json
// Movement
{"command": "MOVE_ARMS"}                           // Trigger 6-cycle oscillation
{"command": "ROTATE_HEAD", "value": 45}            // Rotate to 45°
{"command": "ROTATE_HEAD_LEFT", "value": 45}       // Relative rotation
{"command": "ROTATE_HEAD_RIGHT", "value": 45}
{"command": "ROTATE_HEAD_CENTER"}                  // Return to 0°
{"command": "STOP_MOVEMENT"}                       // Emergency stop

// Audio
{"command": "SOUND_ALARM"}                         // Play current track
{"command": "PLAY_TRACK", "value": 1}              // Play specific track
{"command": "NEXT_TRACK"}                          // Next track (auto-skip 3)
{"command": "STOP_AUDIO"}
{"command": "SET_VOLUME", "value": 25}             // 0-30

// Servos
{"command": "SET_SERVO_ANGLE", "servo": 0, "value": 90}

// System
{"command": "CALIBRATE_SENSORS"}
{"command": "RESET_SYSTEM"}
{"command": "TEST_BUZZER"}
```

**Main Board → App Messages:**
```json
// Sensor data (every 2 seconds)
{
  "type": "sensor_data",
  "soilHumidity": 55.5,
  "soilTemperature": 28.3,
  "soilConductivity": 1250,
  "ph": 6.8,
  "motion": false,
  "inCooldown": false,
  "headPosition": 0,
  "currentTrack": 1,
  "volume": 20,
  "audioPlaying": false,
  "leftArmAngle": 90,
  "rightArmAngle": 90,
  "servoActive": false,
  "hasDFPlayer": true,
  "hasRS485Sensor": true,
  "hasServos": true,
  "timestamp": 123456
}

// Motion alert
{
  "type": "motion_alert",
  "message": "Motion detected!",
  "track": 2,
  "timestamp": 123456
}
```

---

## 📝 Setup Checklist

### Arduino Setup

- [ ] **Install Arduino IDE 2.x**
- [ ] **Add ESP32 board support** (via Board Manager)
- [ ] **Install required libraries:**
  - ESPAsyncWebServer
  - AsyncTCP
  - ArduinoJson
  - DFRobotDFPlayerMini
  - Adafruit PWM Servo Driver

### Camera Board Setup

- [ ] **Configure WiFi** in `BantayBot_Camera_ESP32CAM.ino` (lines 18-19)
- [ ] **Select board:** AI Thinker ESP32-CAM
- [ ] **Upload firmware** (bridge GPIO 0 to GND)
- [ ] **Note IP address** from Serial Monitor
- [ ] **Test camera stream:** `http://[IP]/stream`

### Main Board Setup

- [ ] **Configure WiFi** in `config.h` (lines 10-11)
- [ ] **Verify pin assignments** match your wiring
- [ ] **Select board:** ESP32 Dev Module
- [ ] **Upload firmware** (auto-reset, no GPIO bridge needed)
- [ ] **Note IP address** from Serial Monitor
- [ ] **Prepare DFPlayer SD card:**
  - Format as FAT32
  - Create `/mp3/` folder
  - Add files: 0001.mp3, 0002.mp3, 0004.mp3, 0005.mp3, 0006.mp3, 0007.mp3

### App Configuration

- [ ] **Update `src/config/config.js`:**
  - Set `CAMERA_ESP32_IP` to camera board IP
  - Set `MAIN_ESP32_IP` to main board IP
- [ ] **Test connections:**
  - Run app: `npx expo start`
  - Check console for WebSocket connections
  - Verify sensor data appears
  - Test all controls

---

## 🧪 Testing Procedure

### 1. Hardware Power-On Test
```
✅ Both ESP32 boards power up (red LEDs on)
✅ WiFi connects within 10 seconds
✅ Serial Monitor shows "Ready!" on both boards
✅ IP addresses displayed in Serial Monitor
```

### 2. Camera Board Test
```
✅ Browser access: http://[CAMERA_IP]/stream
✅ Camera feed displays
✅ WebSocket connects on port 80
✅ Bird detection triggers on motion
```

### 3. Main Board Test
```
✅ WebSocket connects on port 81
✅ Soil sensor reads valid data (not -999 or 0)
✅ DFPlayer plays track 1
✅ Servos move to 90° on startup
✅ PIR triggers motion alert
```

### 4. App Integration Test
```
✅ App shows "Connected" status for both boards
✅ Sensor data updates every 2 seconds
✅ Camera feed displays in app
✅ All controls respond:
   - ✅ Move Arms (oscillation)
   - ✅ Rotate Head (left/right/center)
   - ✅ Play Audio (tracks 1,2,4,5,6,7)
   - ✅ Volume control
   - ✅ Detection sensitivity
✅ Alerts appear on motion/bird detection
```

### 5. End-to-End Test
```
Scenario: Bird detection triggers alarm
1. ✅ Camera detects motion
2. ✅ Bird detection alert sent to app
3. ✅ App displays notification
4. ✅ Main board receives command (optional auto-trigger)
5. ✅ DFPlayer plays deterrent sound
6. ✅ Servos oscillate (if configured)
7. ✅ Head rotates toward detection
```

---

## 🔧 Configuration Quick Reference

### WiFi Setup (Both Boards)

**Camera Board** (`BantayBot_Camera_ESP32CAM.ino`):
```cpp
const char *ssid = "YOUR_WIFI_NAME";
const char *password = "YOUR_WIFI_PASSWORD";
```

**Main Board** (`config.h`):
```cpp
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
```

### App Configuration (`src/config/config.js`)

```javascript
export const CONFIG = {
  // Camera Board
  CAMERA_ESP32_IP: '192.168.1.28',    // ← Change to your camera IP
  CAMERA_ESP32_PORT: 80,

  // Main Board
  MAIN_ESP32_IP: '192.168.1.29',      // ← Change to your main board IP
  MAIN_ESP32_PORT: 81,

  // Audio
  TOTAL_AUDIO_TRACKS: 7,
  SKIP_TRACK: 3,

  // Other settings...
};
```

---

## ⚠️ Important Notes

### Audio Tracks
- **7 total tracks** (0001.mp3 through 0007.mp3)
- **Track 3 is skipped** (0003.mp3 not used)
- Firmware automatically increments past track 3
- Volume range: 0-30

### PIR Motion Detection
- **Trigger:** Motion detected on GPIO14
- **Action:** Plays next track, activates servo oscillation
- **Timeout:** 2 minutes (120,000ms)
- **Cooldown:** 30 seconds before next detection

### Servo Oscillation
- **Mode:** 6 complete back-and-forth cycles
- **Speed:** 30ms per update
- **Range:** 0° to 180° and back
- **Channels:** Left arm (0) and right arm (1) move in opposite directions

### Stepper Motor
- **Range:** -180° to +180°
- **Control:** Absolute positioning or relative rotation
- **Commands:** ROTATE_HEAD, ROTATE_HEAD_LEFT, ROTATE_HEAD_RIGHT, ROTATE_HEAD_CENTER

### RS485 Soil Sensor
- **Baud Rate:** 4800
- **Protocol:** Modbus RTU
- **Measurements:**
  - Humidity (% / 10)
  - Temperature (°C / 10)
  - Conductivity (µS/cm)
  - pH (pH / 10)
- **Update Interval:** 2 seconds
- **Error Value:** -999 (indicates sensor not responding)

---

## 🐛 Troubleshooting

### Camera Board Issues

| Problem | Solution |
|---------|----------|
| Won't upload | Bridge GPIO 0 to GND, hold BOOT button |
| Camera init failed | Verify "AI Thinker ESP32-CAM" board selected |
| No camera feed | Check power (2A minimum), verify camera ribbon cable |
| Brownout errors | Use external 5V 2A power supply |

### Main Board Issues

| Problem | Solution |
|---------|----------|
| DFPlayer not found | Swap RX/TX wires, check SD card format (FAT32) |
| RS485 returns -999 | Swap A/B terminals, verify RE/DE connected to GPIO 4 |
| Servos jitter | Add 5V 3A external power, 1000µF capacitor |
| Stepper hums not turning | Check coil wiring, adjust TMC2225 current limit |

### App Connection Issues

| Problem | Solution |
|---------|----------|
| Can't connect | Verify IP addresses in config.js |
| Only one board connects | Check both boards are powered and on same network |
| Connection drops | Set static IPs in router, check WiFi signal strength |
| No sensor data | Check Serial Monitor for errors on main board |

---

## 📚 Documentation Files

1. **`arduino/README.md`** - Arduino project overview
2. **`arduino/ARDUINO_UPLOAD_GUIDE.md`** - Detailed upload instructions
3. **`HARDWARE_SETUP.md`** - Complete wiring diagram
4. **`INTEGRATION_GUIDE.md`** - App integration guide
5. **`TESTING_CHECKLIST.md`** - Pre-deployment testing

---

## ✅ Next Steps

1. **Upload Arduino Firmware:**
   - Follow `arduino/ARDUINO_UPLOAD_GUIDE.md`
   - Upload camera board first
   - Upload main board second
   - Note both IP addresses

2. **Configure Mobile App:**
   - Update `src/config/config.js` with IP addresses
   - Test connection to both boards
   - Verify all features work

3. **Hardware Assembly:**
   - Follow `HARDWARE_SETUP.md` for wiring
   - Secure components in weatherproof enclosure
   - Test all connections before field deployment

4. **Field Testing:**
   - Use `TESTING_CHECKLIST.md`
   - Verify camera view covers crop area
   - Test bird detection sensitivity
   - Confirm audio is loud enough
   - Check soil sensor placement

5. **Deploy:**
   - Mount at 1.5-2 meters height
   - Face camera east for morning light
   - Ensure weatherproofing is complete
   - Monitor for first 24 hours

---

## 🎉 Summary

✅ **Arduino firmware created** for both boards based on existing hardware
✅ **App configuration updated** to support dual ESP32 setup
✅ **WebSocket service enhanced** for dual connections
✅ **Complete documentation** provided for setup and testing
✅ **Pin configurations verified** against existing Arduino codes
✅ **API protocol documented** for hardware-app communication

**The BantayBot system is now fully aligned between hardware and software!** 🚀

---

## 📞 Support

For issues or questions:
- Check `arduino/ARDUINO_UPLOAD_GUIDE.md` troubleshooting section
- Review Serial Monitor output (115200 baud)
- Join ESP32 Philippines Facebook Group
- Consult existing documentation in `existingArduinoCodes/`

**Mabuhay ang Magsasaka! 🇵🇭🌾**
