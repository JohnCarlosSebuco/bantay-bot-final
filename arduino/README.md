# 🤖 BantayBot Arduino Firmware

Complete Arduino firmware for the BantayBot crop protection system, designed for Filipino farmers.

---

## 📁 Project Structure

```
arduino/
├── BantayBot_Camera_ESP32CAM/
│   ├── BantayBot_Camera_ESP32CAM.ino  # Main camera firmware
│   └── board_config.h                  # AI Thinker pin definitions
│
├── BantayBot_MainBoard_ESP32/
│   ├── BantayBot_MainBoard_ESP32.ino  # Main control board firmware
│   └── config.h                        # Hardware configuration & pins
│
├── libraries/                          # Shared libraries (optional)
│
├── ARDUINO_UPLOAD_GUIDE.md            # Step-by-step upload instructions
└── README.md                           # This file
```

---

## 🔧 Hardware Requirements

### Camera Board (ESP32-CAM)
- **Board:** AI Thinker ESP32-CAM module
- **Camera:** OV2640 or OV3660 (built-in)
- **Memory:** 4MB Flash with PSRAM
- **Power:** 5V 2A minimum
- **Programmer:** USB-to-TTL adapter (FTDI/CH340)

### Main Control Board (ESP32 DevKit)
- **Board:** ESP32 DevKit v1 or similar (30-pin)
- **Flash:** 4MB minimum
- **Peripherals:**
  - DFPlayer Mini (MP3 audio)
  - RS485 4-in-1 soil sensor
  - PCA9685 servo controller (2 servos)
  - TMC2225 stepper driver
  - PIR motion sensor
- **Power:** 12V 5A power supply with buck converter to 5V

---

## 📋 Quick Start

### 1. Install Arduino IDE & Libraries

```bash
# Install Arduino IDE 2.x from: https://www.arduino.cc/en/software

# Add ESP32 board support:
# File → Preferences → Additional Board Manager URLs:
# https://espressif.github.io/arduino-esp32/package_esp32_index.json

# Install ESP32 boards:
# Tools → Board → Boards Manager → Search "esp32" → Install

# Install required libraries via Library Manager:
- ESPAsyncWebServer (1.2.3+)
- AsyncTCP (1.1.1+)
- ArduinoJson (6.21.0+)
- DFRobotDFPlayerMini (1.0.5+)  # Main board only
- Adafruit PWM Servo Driver (2.4.1+)  # Main board only
```

### 2. Configure WiFi Credentials

**Camera Board:**
Edit `BantayBot_Camera_ESP32CAM/BantayBot_Camera_ESP32CAM.ino` lines 18-19:
```cpp
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";
```

**Main Board:**
Edit `BantayBot_MainBoard_ESP32/config.h` lines 10-11:
```cpp
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
```

### 3. Upload Firmware

**See `ARDUINO_UPLOAD_GUIDE.md` for detailed instructions!**

**Quick Summary:**
- **Camera Board:** Select "AI Thinker ESP32-CAM", bridge GPIO 0 to GND, upload, remove bridge
- **Main Board:** Select "ESP32 Dev Module", upload directly via USB

### 4. Note IP Addresses

After upload, open Serial Monitor (115200 baud) and note the IP addresses:
- Camera Board: e.g., `192.168.1.28` (port 80)
- Main Board: e.g., `192.168.1.29` (port 81)

Update these in your React Native app: `src/config/config.js`

---

## 🎯 Features

### Camera Board Features
- **Camera Streaming:** HTTP MJPEG stream at `/stream`
- **Bird Detection:** Motion-based detection with adjustable sensitivity
- **WebSocket API:** Real-time bird alerts and camera status
- **Camera Controls:** Brightness, contrast, grayscale mode
- **Detection Zones:** Configurable detection area

### Main Board Features
- **Soil Monitoring:** RS485 4-in-1 sensor (humidity, temp, conductivity, pH)
- **Audio Playback:** DFPlayer Mini with 7 MP3 tracks (skips track 3)
- **Servo Control:** 2-channel oscillation mode via PCA9685
- **Stepper Motor:** Head rotation -180° to +180°
- **PIR Motion Detection:** Auto-trigger alarm on motion
- **WebSocket API:** Real-time sensor data and control commands

---

## 📡 API Reference

### Camera Board WebSocket (ws://[IP]:80/ws)

**Commands (Send):**
```json
{"command": "TOGGLE_DETECTION"}
{"command": "SET_SENSITIVITY", "value": 2}  // 1=Low, 2=Med, 3=High
{"command": "RESET_BIRD_COUNT"}
{"command": "SET_BRIGHTNESS", "value": 1}   // -2 to +2
{"command": "SET_CONTRAST", "value": 0}     // -2 to +2
{"command": "TOGGLE_GRAYSCALE"}
```

**Messages (Receive):**
```json
// Camera status
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

**Commands (Send):**
```json
// Movement
{"command": "MOVE_ARMS"}                              // 6-cycle oscillation
{"command": "ROTATE_HEAD", "value": 45}               // Rotate to 45°
{"command": "ROTATE_HEAD_LEFT", "value": 45}          // Rotate +45° from current
{"command": "ROTATE_HEAD_RIGHT", "value": 45}         // Rotate -45° from current
{"command": "ROTATE_HEAD_CENTER"}                     // Return to 0°
{"command": "STOP_MOVEMENT"}                          // Stop all servos

// Audio
{"command": "SOUND_ALARM"}                            // Play current track
{"command": "PLAY_TRACK", "value": 1}                 // Play specific track (1-7, skip 3)
{"command": "NEXT_TRACK"}                             // Play next track
{"command": "STOP_AUDIO"}                             // Stop playback
{"command": "SET_VOLUME", "value": 25}                // Set volume (0-30)
{"command": "TEST_BUZZER"}                            // Test with track 1

// Servos
{"command": "SET_SERVO_ANGLE", "servo": 0, "value": 90}  // Set servo to angle

// System
{"command": "CALIBRATE_SENSORS"}                      // Re-read all sensors
{"command": "RESET_SYSTEM"}                           // Restart ESP32
```

**Messages (Receive):**
```json
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

## ⚙️ Configuration

### Pin Configuration (Main Board)

**Edit `config.h` to match your wiring:**

```cpp
// DFPlayer Mini
#define DFPLAYER_RX 27
#define DFPLAYER_TX 26

// RS485 Soil Sensor
#define RS485_RE 4
#define RS485_RX 17
#define RS485_TX 16

// Stepper Motor (TMC2225)
#define STEPPER_STEP_PIN 25
#define STEPPER_DIR_PIN 33
#define STEPPER_EN_PIN 32

// Servos (PCA9685 I2C)
#define SERVO_SDA 21
#define SERVO_SCL 22

// PIR Motion Sensor
#define PIR_PIN 14
```

**⚠️ WARNING:** Only change these if you modified the physical wiring! Incorrect pins can damage hardware.

### Audio Configuration

**DFPlayer SD Card Setup:**
1. Format SD card as FAT32
2. Create folder: `/mp3/`
3. Add files:
   - `0001.mp3` - Track 1
   - `0002.mp3` - Track 2
   - `0004.mp3` - Track 4 (skip 0003.mp3)
   - `0005.mp3` - Track 5
   - `0006.mp3` - Track 6
   - `0007.mp3` - Track 7

**Why skip track 3?**
- Reserved for future use or specific alarm sound
- Firmware automatically skips it during playback

---

## 🐛 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| Camera won't upload | Bridge GPIO 0 to GND, hold BOOT button |
| DFPlayer not found | Swap RX/TX, check SD card format |
| RS485 returns -999 | Swap A/B terminals, check RE/DE pin |
| Servos jitter | Add 5V 3A external power, 1000µF capacitor |
| Stepper hums but doesn't turn | Check coil wiring, adjust current limit |
| WiFi won't connect | Verify 2.4GHz network, check password |

**See `ARDUINO_UPLOAD_GUIDE.md` for detailed troubleshooting!**

---

## 🧪 Testing

### Hardware Test Sequence

1. **Power Up Test:**
   ```
   ✅ Red power LED on both boards
   ✅ WiFi connects within 10 seconds
   ✅ Serial Monitor shows "Ready!" message
   ```

2. **Camera Board Test:**
   ```
   ✅ Access http://[IP]/stream in browser
   ✅ See live camera feed
   ✅ Wave hand → bird detection alert
   ```

3. **Main Board Test:**
   ```
   ✅ Soil sensor reads valid data (not -999)
   ✅ DFPlayer plays track 1
   ✅ Servos move to 90° on startup
   ✅ PIR triggers alarm on motion
   ```

4. **Integration Test:**
   ```
   ✅ Mobile app connects to both boards
   ✅ Sensor data updates every 2 seconds
   ✅ All controls respond from app
   ```

---

## 📚 Additional Documentation

- `ARDUINO_UPLOAD_GUIDE.md` - Detailed upload instructions
- `../HARDWARE_SETUP.md` - Complete wiring diagram
- `../INTEGRATION_GUIDE.md` - App integration guide
- `../TESTING_CHECKLIST.md` - Pre-deployment testing

---

## 🔄 Updating Firmware

### OTA Updates (Future Feature)
Currently not supported. Use USB upload method.

### Manual Updates
1. Connect USB cable
2. Upload new firmware via Arduino IDE
3. Monitor Serial output to verify
4. Update app config if IP changes

---

## 📞 Support & Community

### Filipino Tech Communities
- **ESP32 Philippines** - Facebook Group
- **Magsasaka Tech** - Farmer technology group
- **CircuitRocks Discord** - Hardware support

### Hardware Suppliers (Philippines)
- **e-Gizmo** - ESP32-CAM, sensors
- **CircuitRocks** - Stepper drivers, modules
- **TechShop PH** - Cables, enclosures

### Online Resources
- Arduino Forum - ESP32 Section
- ESP32 Official Docs
- BantayBot GitHub Repository

---

## 📄 License

This firmware is part of the BantayBot project, designed to help Filipino farmers protect their crops using affordable technology.

**Free for educational and agricultural use. 🇵🇭🌾**

---

## 🙏 Credits

Developed for Filipino farmers by the BantayBot team.

**Mabuhay ang Magsasaka! 🌾**
