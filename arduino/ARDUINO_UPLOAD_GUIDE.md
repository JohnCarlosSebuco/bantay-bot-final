# 🔧 BantayBot Arduino Upload Guide

Complete step-by-step instructions for uploading firmware to both ESP32 boards.

---

## 📋 Prerequisites

### Required Software
1. **Arduino IDE 2.x** or **Arduino IDE 1.8.19+**
   - Download: https://www.arduino.cc/en/software

2. **ESP32 Board Support**
   - In Arduino IDE: File → Preferences
   - Add to "Additional Board Manager URLs":
     ```
     https://espressif.github.io/arduino-esp32/package_esp32_index.json
     ```
   - Go to: Tools → Board → Boards Manager
   - Search "esp32" and install "esp32 by Espressif Systems"

3. **USB-to-TTL Adapter** (for ESP32-CAM)
   - FTDI FT232RL or CH340G
   - Must support 3.3V or 5V operation

### Required Libraries

Install via Arduino IDE (Tools → Manage Libraries):

| Library Name | Version | Required For |
|--------------|---------|--------------|
| ESPAsyncWebServer | 1.2.3+ | Both boards |
| AsyncTCP | 1.1.1+ | Both boards |
| ArduinoJson | 6.21.0+ | Both boards |
| DFRobotDFPlayerMini | 1.0.5+ | Main board |
| Adafruit PWM Servo Driver | 2.4.1+ | Main board |
| Wire | Built-in | Main board |

**Installation Steps:**
```
1. Open Arduino IDE
2. Go to: Sketch → Include Library → Manage Libraries
3. Search for each library above
4. Click "Install" for each
```

---

## 📷 Part 1: Camera ESP32-CAM Upload

### Hardware Setup

1. **Connect USB-to-TTL to ESP32-CAM:**
   ```
   ESP32-CAM    USB-to-TTL
   ─────────    ──────────
   5V       →   5V (or 3.3V)
   GND      →   GND
   U0R (RX) →   TX
   U0T (TX) →   RX
   ```

2. **Enter Programming Mode:**
   - Bridge `GPIO 0` to `GND` (use jumper wire)
   - This puts ESP32-CAM into flash mode

3. **Power On:**
   - Connect USB-to-TTL to computer
   - Red LED on ESP32-CAM should light up

### Arduino IDE Configuration

1. **Select Board:**
   - Tools → Board → ESP32 Arduino → **AI Thinker ESP32-CAM**

2. **Configure Settings:**
   ```
   Board: "AI Thinker ESP32-CAM"
   Upload Speed: "115200"
   Flash Frequency: "80MHz"
   Flash Mode: "QIO"
   Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"
   Core Debug Level: "None"
   Port: [Select your USB-to-TTL port]
   ```

3. **Update WiFi Credentials:**
   - Open `BantayBot_Camera_ESP32CAM.ino`
   - Find lines 18-19:
     ```cpp
     const char *ssid = "YOUR_WIFI_SSID";
     const char *password = "YOUR_WIFI_PASSWORD";
     ```
   - Replace with your WiFi name and password

### Upload Process

1. **Verify Code:**
   - Click ✓ (Verify) button
   - Wait for "Done compiling" message
   - Fix any errors before continuing

2. **Upload:**
   - Ensure GPIO 0 is connected to GND
   - Click → (Upload) button
   - Wait for "Connecting..." message
   - You should see:
     ```
     Connecting.....
     Chip is ESP32-D0WDQ6 (revision 1)
     Writing at 0x00001000... (X %)
     ```
   - Upload takes ~2-3 minutes

3. **Remove Programming Mode:**
   - **IMPORTANT:** Disconnect GPIO 0 from GND
   - Press RESET button on ESP32-CAM
   - Or power cycle (unplug and replug USB)

### Verify Camera Board

1. **Open Serial Monitor:**
   - Tools → Serial Monitor
   - Set baud rate to: **115200**

2. **Expected Output:**
   ```
   📷 BantayBot Camera Module Starting...
   📡 WiFi connecting......
   ✅ WiFi connected
   ✅ Bird detection initialized
   ✅ Camera HTTP server started
   🌐 Camera Ready! http://192.168.1.XX
   📡 WebSocket: ws://192.168.1.XX/ws
   ✅ BantayBot Camera Module Ready!
   ```

3. **Note the IP Address** (e.g., 192.168.1.28)
   - You'll need this for the mobile app configuration

4. **Test Camera Stream:**
   - Open browser
   - Go to: `http://[CAMERA_IP_ADDRESS]/stream`
   - You should see live camera feed

---

## 🎛️ Part 2: Main Control Board ESP32 Upload

### Hardware Setup

1. **Connect ESP32 DevKit:**
   - Use standard micro-USB cable
   - Connect to computer
   - Blue LED should light up

2. **No Programming Mode Needed:**
   - ESP32 DevKit has auto-reset circuit
   - Automatically enters programming mode during upload

### Arduino IDE Configuration

1. **Select Board:**
   - Tools → Board → ESP32 Arduino → **ESP32 Dev Module**

2. **Configure Settings:**
   ```
   Board: "ESP32 Dev Module"
   Upload Speed: "921600"
   CPU Frequency: "240MHz (WiFi/BT)"
   Flash Frequency: "80MHz"
   Flash Mode: "QIO"
   Flash Size: "4MB (32Mb)"
   Partition Scheme: "Default 4MB with spiffs"
   Core Debug Level: "None"
   Port: [Select your ESP32 port - usually COM3/COM4/COM5]
   ```

### Configure Hardware Settings

1. **Open `config.h`**

2. **Update WiFi Credentials (lines 10-11):**
   ```cpp
   #define WIFI_SSID "YOUR_WIFI_SSID"
   #define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
   ```

3. **Verify Pin Assignments:**
   - Check that pin definitions match your hardware connections
   - See `HARDWARE_SETUP.md` for wiring diagram
   - **DO NOT change unless you modified the physical wiring**

### Upload Process

1. **Verify Code:**
   - Click ✓ (Verify) button
   - Wait for "Done compiling"

2. **Upload:**
   - Click → (Upload) button
   - Progress bar should appear immediately
   - Upload takes ~1-2 minutes

3. **Auto-Reset:**
   - ESP32 automatically resets after upload
   - No manual intervention needed

### Verify Main Board

1. **Open Serial Monitor:**
   - Tools → Serial Monitor
   - Set baud rate to: **115200**

2. **Expected Output:**
   ```
   🤖 BantayBot Main Control Board Starting...
   📡 Connecting to WiFi..........
   ✅ WiFi connected
   📍 IP Address: 192.168.1.XX
   ✅ DFPlayer Mini initialized
   ✅ RS485 soil sensor initialized
   ✅ PCA9685 servos initialized
   ✅ Stepper motor initialized
   ✅ PIR sensor initialized
   📡 WebSocket server: ws://192.168.1.XX:81/ws
   ✅ BantayBot Main Board Ready!
   ```

3. **Note the IP Address** (e.g., 192.168.1.29)
   - You'll need this for the mobile app

4. **Check for Hardware Warnings:**
   - If you see `⚠️ DFPlayer Mini not found` - check wiring
   - If you see `⚠️ RS485 sensor not found` - check sensor connections
   - Servos and stepper should always initialize successfully

---

## 📱 Part 3: Configure Mobile App

### Update App Configuration

1. **Open React Native Project:**
   ```bash
   cd bantay-bot
   ```

2. **Edit `src/config/config.js`:**
   ```javascript
   export const CONFIG = {
     // Camera ESP32-CAM (from Part 1)
     CAMERA_ESP32_IP: '192.168.1.28',  // ← Use camera IP here
     CAMERA_ESP32_PORT: 80,

     // Main Control Board (from Part 2)
     MAIN_ESP32_IP: '192.168.1.29',    // ← Use main board IP here
     MAIN_ESP32_PORT: 81,

     // ... rest of config
   };
   ```

3. **Start the App:**
   ```bash
   npx expo start
   ```

4. **Test Connections:**
   - App should connect to both boards
   - Check Console for:
     ```
     ✅ Main Board WebSocket connected
     ✅ Camera Board WebSocket connected
     ```

---

## 🔍 Troubleshooting

### Camera Board Issues

**Problem: "Failed to connect" / Stuck on "Connecting..."**
- **Fix 1:** Ensure GPIO 0 is connected to GND before upload
- **Fix 2:** Try lowering upload speed to 115200
- **Fix 3:** Hold "BOOT" button while clicking Upload (if present)

**Problem: Camera init failed 0x105**
- **Cause:** Incorrect camera model or pin configuration
- **Fix:** Verify you selected "AI Thinker ESP32-CAM" board
- **Check:** Ensure `board_config.h` pins match your module

**Problem: Brownout detector triggered**
- **Cause:** Insufficient power supply
- **Fix:** Use powered USB hub or external 5V 2A adapter

### Main Board Issues

**Problem: DFPlayer not found**
- **Check:** RX/TX connections (swap if needed)
- **Check:** SD card is inserted and formatted as FAT32
- **Check:** MP3 files are in `/mp3/` folder on SD card
- **Test:** Connect DFPlayer to 5V directly (bypass buck converter)

**Problem: RS485 sensor returns -999**
- **Check:** A and B terminals (swap if no response)
- **Check:** RE and DE pins connected to GPIO 4
- **Check:** Baud rate is 4800 in `config.h`
- **Test:** Use USB-to-RS485 adapter to test sensor separately

**Problem: Servos jitter or don't move**
- **Check:** External 5V 3A power connected to PCA9685 V+
- **Check:** Common ground between ESP32 and servo power
- **Fix:** Add 1000µF capacitor across V+ and GND

**Problem: Stepper motor hums but doesn't turn**
- **Check:** Coil wiring (A1/A2, B1/B2 pairs correct)
- **Fix:** Adjust current limit potentiometer on TMC2225
- **Fix:** Check EN pin is LOW (enabled)

### WiFi Issues

**Problem: Won't connect to WiFi**
- **Check:** SSID and password spelling (case-sensitive)
- **Check:** Router is 2.4GHz (ESP32 doesn't support 5GHz)
- **Fix:** Move ESP32 closer to router
- **Fix:** Check for special characters in password (use quotes if needed)

**Problem: Keeps disconnecting**
- **Fix:** Set static IP in router settings
- **Fix:** Disable power saving: `WiFi.setSleep(false);` (already in code)

### Serial Monitor Issues

**Problem: Gibberish/garbage characters**
- **Fix:** Set baud rate to 115200
- **Fix:** Try different baud rate: 9600, 74880, 230400
- **Fix:** Check USB cable quality (data cable, not charge-only)

**Problem: No output at all**
- **Check:** Correct port selected
- **Fix:** Press RESET button on ESP32
- **Fix:** Re-upload with "Core Debug Level: Info"

---

## 🎯 Testing Checklist

### Camera Board Tests
- [ ] Camera stream visible at `http://[IP]/stream`
- [ ] WebSocket connects (check app console)
- [ ] Bird detection triggers (wave hand in front of camera)
- [ ] LED flash works (if connected)

### Main Board Tests
- [ ] WebSocket connects on port 81
- [ ] Soil sensor reads valid data (not -999 or 0)
- [ ] DFPlayer plays audio (track 1)
- [ ] Servos move to 90° on startup
- [ ] Stepper motor can rotate head
- [ ] PIR detects motion and triggers alarm

### App Integration Tests
- [ ] Both boards show "connected" status
- [ ] Sensor data updates every 2 seconds
- [ ] Camera feed displays in app
- [ ] All controls respond (test each button)
- [ ] Alerts appear when motion detected

---

## 🔄 Re-uploading / Updates

### To Update Camera Board:
1. Power off main system
2. Connect camera board to USB-to-TTL
3. Bridge GPIO 0 to GND
4. Upload new code
5. Remove GPIO 0 bridge
6. Reset camera board
7. Reconnect to main system

### To Update Main Board:
1. Simply connect USB cable
2. Upload new code
3. Disconnect USB
4. Power on with main power supply

**Pro Tip:** Keep USB cables accessible for easy updates during development/testing.

---

## 📞 Support

### Common Upload Errors

**`A fatal error occurred: Failed to connect`**
- Press and hold BOOT button while uploading (ESP32-CAM)
- Check USB drivers (install CH340 or CP2102 drivers)

**`Timed out waiting for packet header`**
- Lower upload speed to 115200
- Try different USB port/cable

**`Brownout detector was triggered`**
- Use external power supply (not USB)
- Add 1000µF capacitor near power input

**`Error compiling for board...`**
- Install missing libraries
- Update ESP32 board package to latest version

### Where to Get Help

- **ESP32 Philippines Facebook Group**
- **CircuitRocks Discord**
- **Arduino Forum - ESP32 Section**
- **BantayBot GitHub Issues**

---

## ✅ Next Steps

After successful upload:
1. Read `HARDWARE_SETUP.md` for final assembly
2. Follow `INTEGRATION_GUIDE.md` for app setup
3. Complete `TESTING_CHECKLIST.md` before field deployment
4. Configure your mobile app with the IP addresses noted during upload

---

**Happy Coding! 🚀🇵🇭**
