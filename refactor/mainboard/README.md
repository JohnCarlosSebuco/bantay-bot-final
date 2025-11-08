# BantayBot Main Board - Refactored

ESP32 main control board with Firebase integration and bird detection handling.

## Architecture

```
Main Board receives:
  ← Camera Board (bird detection + image URL)
  ← Mobile App (commands via HTTP/Firebase)

Main Board controls:
  → DFPlayer Mini (audio)
  → PCA9685 Servos (arm movement)
  → TMC2225 Stepper (head rotation)
  → RS485 Soil Sensor (4-in-1)
  → Firebase Firestore (cloud sync)
```

## Hardware

- **Board**: ESP32 DevKit v1 or similar
- **Memory**: ~250KB free heap with Firebase loaded
- **Peripherals**:
  - DFPlayer Mini (Serial1)
  - RS485 Soil Sensor (Serial2)
  - PCA9685 (I2C)
  - TMC2225 Stepper Driver
  - DHT22 Sensor

## Features

✅ **Firebase Firestore** - device status, sensor data, detection logging
✅ **Bird detection receiver** - HTTP POST endpoint from camera
✅ **Image URL logging** - stores ImageBB URLs in Firestore
✅ **Autonomous alarm** - triggers on camera detection
✅ **Sensor monitoring** - RS485 4-in-1 soil sensor
✅ **Audio control** - 7 tracks (skip track 3)
✅ **Servo control** - 6-cycle oscillation pattern
✅ **Stepper control** - head rotation ±180°
✅ **HTTP API** - mobile app endpoints

## Configuration

### 1. WiFi & Firebase

Already configured in `config.h`:
```cpp
#define WIFI_SSID "HUAWEI-E5330-6AB9"
#define WIFI_PASSWORD "16yaad0a"
#define FIREBASE_PROJECT_ID "cloudbantaybot"
#define API_KEY "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
```

### 2. Pin Configuration

All pins defined in `config.h`:
- **DFPlayer**: GPIO 27 (RX), GPIO 26 (TX)
- **RS485**: GPIO 4 (RE), GPIO 17 (RX), GPIO 16 (TX)
- **Stepper**: GPIO 13 (STEP), GPIO 15 (DIR), GPIO 14 (EN)
- **Servos**: GPIO 21 (SDA), GPIO 22 (SCL)
- **DHT22**: GPIO 2
- **Speaker**: GPIO 12

### 3. Firebase Setup

Ensure Firebase Console has:
- ✅ Anonymous Authentication enabled
- ✅ Firestore database created
- ✅ Collections: `devices`, `sensor_data`, `detection_history`

## Arduino IDE Settings

- **Board**: ESP32 Dev Module
- **Partition Scheme**: Default 4MB with spiffs
- **CPU Frequency**: 240MHz
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Upload Speed**: 115200

## Libraries Required

Install via Arduino Library Manager:

1. **Firebase ESP Client** by Mobizt (v4.x)
2. **ArduinoJson** (v6.x)
3. **ESPAsyncWebServer** by me-no-dev
4. **AccelStepper** by Mike McCauley
5. **DHT sensor library** by Adafruit
6. **DFRobotDFPlayerMini** by DFRobot
7. **Adafruit PWM Servo Driver Library**

## Upload Process

1. Connect ESP32 via USB
2. Select correct COM port
3. Upload sketch
4. Open Serial Monitor (115200 baud)

## Serial Monitor Output

```
🤖 BantayBot Main Board with Firebase - Starting...
💾 Free heap: 250000 bytes
✅ DFPlayer Mini initialized
📶 Connecting to WiFi...
✅ WiFi connected!
📍 IP address: 192.168.8.100
🔥 Initializing Firebase...
✅ Firebase connected!
📧 User ID: xyz123abc
✅ HTTP endpoints configured
🌐 HTTP server started on port 81
🚀 BantayBot Main Board ready!
```

## HTTP API Endpoints

### Status
```http
GET http://192.168.8.100:81/status
```

Response:
```json
{
  "device": "main_board",
  "status": "online",
  "firebase": true,
  "soilHumidity": 55.5,
  "soilTemperature": 28.3,
  "soilConductivity": 1250,
  "ph": 6.8,
  "currentTrack": 1,
  "volume": 20,
  "servoActive": false,
  "headPosition": 0,
  "birdsToday": 3,
  "freeHeap": 220000
}
```

### Bird Detection (Camera calls this)
```http
POST http://192.168.8.100:81/bird_detected
Content-Type: application/json

{
  "deviceId": "camera_001",
  "imageUrl": "https://i.ibb.co/xyz/bird.jpg",
  "birdSize": 1500,
  "confidence": 85,
  "detectionZone": "0,0,320,144"
}
```

### Manual Alarm Trigger
```http
GET http://192.168.8.100:81/trigger-alarm
```

### Audio Control
```http
GET http://192.168.8.100:81/play?track=1
GET http://192.168.8.100:81/volume?level=25
```

### Servo Control
```http
GET http://192.168.8.100:81/move-arms
```

### Head Rotation
```http
GET http://192.168.8.100:81/rotate-head?angle=90
```

## Firebase Collections

### devices/main_001
```json
{
  "ip_address": "192.168.8.100",
  "last_seen": 1234567890,
  "status": "online",
  "firmware_version": "2.0.0-refactor",
  "heap_free": 220000
}
```

### sensor_data/main_001
```json
{
  "soilHumidity": 55.5,
  "soilTemperature": 28.3,
  "soilConductivity": 1250,
  "ph": 6.8,
  "currentTrack": 1,
  "volume": 20,
  "servoActive": false,
  "headPosition": 0,
  "timestamp": 1234567890
}
```

### detection_history (auto-generated ID)
```json
{
  "deviceId": "camera_001",
  "timestamp": 1234567890,
  "imageUrl": "https://i.ibb.co/xyz/bird.jpg",
  "birdSize": 1500,
  "confidence": 85,
  "detectionZone": "0,0,320,144",
  "triggered": true
}
```

## Alarm Sequence

When camera detects a bird:

1. **Camera** uploads image to ImageBB
2. **Camera** POSTs to `/bird_detected` with image URL
3. **Main Board** receives notification
4. **Main Board** logs to Firestore with image URL
5. **Main Board** triggers alarm:
   - Play random audio track (skip track 3)
   - Start 6-cycle servo oscillation
   - Rotate head randomly (±90°)
6. **Main Board** responds to camera: `{"status":"ok"}`

## RS485 Soil Sensor

4-in-1 sensor with Modbus RTU protocol:
- **Soil Humidity**: 0-100% (0.1% resolution)
- **Soil Temperature**: -40 to 80°C (0.1°C resolution)
- **Conductivity**: 0-20000 μS/cm (1 μS/cm resolution)
- **pH**: 3-9 pH (0.1 pH resolution)

Slave ID: 0x01
Baud rate: 4800
Update interval: 2 seconds

## Memory Usage

- **Free heap on boot**: ~250KB
- **Firebase library**: ~30KB
- **ESPAsyncWebServer**: ~20KB
- **Other libraries**: ~15KB
- **Free heap during operation**: ~220KB ✅ **Plenty of room**

## Troubleshooting

### Firebase connection failed
- Check WiFi credentials
- Verify Firebase project ID and API key
- Enable Anonymous Authentication in Firebase Console
- Check firewall isn't blocking Google servers

### DFPlayer not responding
- Check wiring: RX/TX crossed (ESP TX → DFPlayer RX)
- Verify SD card is FAT32 formatted
- Ensure mp3 files are named 0001.mp3, 0002.mp3, etc.
- Check 1K resistor on RX line

### RS485 sensor timeout
- Check MAX485 module wiring
- Verify sensor slave ID is 0x01
- Check baud rate is 4800
- Ensure A/B terminals not swapped

### Servos not moving
- Check I2C connections (SDA/SCL)
- Verify PCA9685 address (default 0x40)
- Check servo power supply (5-6V)
- Test with `move-arms` endpoint

### Stepper motor not rotating
- Check STEP/DIR/EN pin connections
- Verify stepper driver is powered
- Check motor coil connections
- Enable driver: `digitalWrite(STEPPER_ENABLE_PIN, LOW)`

## Files

- `MainBoard_Firebase.ino` - Main sketch
- `config.h` - Configuration and pin definitions
- `README.md` - This file

## Integration with Mobile App

The mobile app polls `/status` endpoint every 2 seconds to get sensor data. It can also:
- Trigger alarm manually
- Control audio playback
- Move servos
- Rotate head

Bird detections are logged to Firestore, and the app displays them from `detection_history` collection with image URLs.

## Next Steps

1. Upload this sketch to ESP32 main board
2. Upload camera sketch to ESP32-CAM
3. Get ImageBB API key and configure camera
4. Update main board IP in camera sketch
5. Power on both boards
6. Check serial monitor for successful initialization
7. Test bird detection
8. Check Firestore for logged detections
9. Test mobile app connectivity
