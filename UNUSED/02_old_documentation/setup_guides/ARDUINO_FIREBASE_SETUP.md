# Arduino Firebase Integration Setup Guide

This guide explains how to set up the Arduino firmware with Firebase integration for the BantayBot system.

## Overview

The Arduino Firebase integration enables:
- **Real-time sensor data publishing** to Firestore
- **Command receiving** from React Native app via Firebase
- **Bird detection reporting** to cloud database
- **Device status monitoring** and health checks
- **HTTP fallback** for backward compatibility

## Architecture

```
Arduino Devices ↔ Firebase Firestore ↔ React Native App
     ↕                    ↕                     ↕
 HTTP Fallback ←→ Local Network ←→ Direct Connection
```

## Files Structure

```
bantay-bot-final/
├── BantayBotUnified_Firebase.ino          # Main control board
├── CameraWebServerESP32cam_Firebase.ino   # Camera ESP32-CAM
├── BantayBotUnified.ino                   # Original main board (backup)
├── CameraWebServerESP32camcode.ino        # Original camera (backup)
├── arduino/
│   └── libraries.txt                      # Required libraries list
└── ARDUINO_FIREBASE_SETUP.md              # This file
```

## Hardware Requirements

### Main Control Board (ESP32 Dev Module)
- ESP32 DevKit v1 or similar
- DFPlayer Mini (MP3 audio)
- RS485 Soil Sensor
- PCA9685 Servo Driver
- NEMA 17 Stepper Motor
- DHT22 Temperature/Humidity Sensor
- Horn Speaker + Relay

### Camera Board (ESP32-CAM)
- AI-Thinker ESP32-CAM module
- External 5V power supply
- FTDI programmer (for initial upload)
- MicroSD card (optional)

## Software Setup

### 1. Arduino IDE Configuration

1. **Install Arduino IDE** (version 1.8.19 or 2.x)
2. **Add ESP32 Board Package**:
   - File > Preferences
   - Add to "Additional Board Manager URLs":
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Tools > Board > Boards Manager
   - Search "ESP32" and install "ESP32 by Espressif Systems"

### 2. Install Required Libraries

See `arduino/libraries.txt` for complete list. Key libraries:

```bash
# Via Library Manager:
- Firebase ESP Client (v4.4.14+)
- ArduinoJson (v6.21.3+)
- DFRobotDFPlayerMini
- AccelStepper
- Adafruit PWM Servo Driver
- DHT sensor library
- Adafruit Unified Sensor

# Manual Installation:
- ESPAsyncWebServer
- AsyncTCP
```

### 3. WiFi Configuration

Update WiFi credentials in both Arduino files:

```cpp
// Update these lines in both .ino files:
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";
```

### 4. Firebase Configuration

The Firebase configuration is already set up for the `cloudbantaybot` project:

```cpp
#define FIREBASE_PROJECT_ID "cloudbantaybot"
#define API_KEY "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
#define FIREBASE_AUTH_DOMAIN "cloudbantaybot.firebaseapp.com"
```

## Programming the Devices

### Main Control Board

1. **Select Board**: Tools > Board > ESP32 Dev Module
2. **Open File**: `BantayBotUnified_Firebase.ino`
3. **Configure Settings**:
   - Upload Speed: 921600
   - CPU Frequency: 240MHz (WiFi/BT)
   - Flash Size: 4MB (32Mb)
   - Partition Scheme: Default 4MB with spiffs
4. **Upload Code**: Sketch > Upload

### Camera ESP32-CAM

1. **Wiring for Programming**:
   ```
   ESP32-CAM    FTDI
   5V       →   5V
   GND      →   GND
   U0R      →   TX
   U0T      →   RX
   IO0      →   GND (during upload only)
   ```

2. **Select Board**: Tools > Board > AI Thinker ESP32-CAM
3. **Open File**: `CameraWebServerESP32cam_Firebase.ino`
4. **Configure Settings**:
   - Upload Speed: 921600
   - CPU Frequency: 240MHz (WiFi/BT)
   - Flash Size: 4MB (32Mb)
   - Partition Scheme: Huge APP (3MB No OTA)
   - PSRAM: Enabled

5. **Upload Process**:
   - Connect IO0 to GND
   - Press RESET button
   - Click Upload in Arduino IDE
   - When "Connecting..." appears, release RESET
   - After upload, disconnect IO0 from GND
   - Press RESET to run normally

## Firebase Collections Used

### Device Status
- **Collection**: `devices/{device_id}`
- **Purpose**: Track device online status and health
- **Updated by**: Both Arduino devices every 5 seconds

### Sensor Data
- **Collection**: `sensor_data/{device_id}`
- **Purpose**: Real-time sensor readings
- **Updated by**: Main board every 2 seconds

### Commands
- **Collection**: `commands/{device_id}/pending`
- **Purpose**: Send commands from React Native to Arduino
- **Processed by**: Both Arduino devices every 500ms-1s

### Detection History
- **Collection**: `detection_history`
- **Purpose**: Bird detection events and statistics
- **Created by**: Camera board when birds detected

## Data Flow Examples

### Sensor Data Publishing (Main Board → Firebase)
```cpp
// Arduino publishes every 2 seconds:
{
  "soilHumidity": 45.2,
  "soilTemperature": 25.1,
  "soilConductivity": 1500,
  "ph": 6.8,
  "currentTrack": 1,
  "volume": 20,
  "servoActive": false,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Command Processing (React Native → Firebase → Arduino)
```cpp
// React Native creates command:
{
  "action": "play_audio",
  "params": { "track": 2 },
  "status": "pending",
  "created_at": "2024-01-01T12:00:00.000Z"
}

// Arduino processes and deletes command
```

### Bird Detection (Camera → Firebase)
```cpp
// Camera reports detection:
{
  "device_id": "camera_001",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "bird_size": 1500,
  "confidence": 85,
  "detection_zone": "0,0,320,144"
}
```

## Testing the Integration

### 1. Serial Monitor Check
After uploading, open Serial Monitor (115200 baud) and look for:

```
🤖 BantayBot Unified with Firebase - Starting...
📶 Connecting to WiFi...
✅ WiFi connected!
📍 IP address: 192.168.x.x
🔥 Initializing Firebase...
✅ Firebase connected successfully!
🚀 BantayBot Unified with Firebase ready!
```

### 2. Firebase Console Verification
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Open `cloudbantaybot` project
3. Navigate to Firestore Database
4. Check for data in collections:
   - `devices/main_001` - Should show device status
   - `sensor_data/main_001` - Should update every 2 seconds
   - `devices/camera_001` - Should show camera status

### 3. React Native App Testing
1. Start the React Native app
2. Check console logs for Firebase connection
3. Verify real-time sensor data updates
4. Test sending commands (play audio, move arms, etc.)
5. Verify commands are executed on Arduino

### 4. HTTP Fallback Testing
1. Disconnect Arduino from internet (keep WiFi connected)
2. React Native app should fallback to HTTP mode
3. Local control should still work

## Troubleshooting

### Common Issues

#### 1. Firebase Connection Failed
```
❌ Firebase connection failed, using HTTP fallback
```
**Solutions**:
- Check WiFi credentials
- Verify internet connection
- Check Firebase project configuration
- Ensure API key is correct

#### 2. Compilation Errors
```
error: 'Firebase' was not declared in this scope
```
**Solutions**:
- Install Firebase ESP Client library
- Restart Arduino IDE
- Check library dependencies

#### 3. Upload Failed (ESP32-CAM)
```
Failed to connect to ESP32: Timed out waiting for packet header
```
**Solutions**:
- Connect IO0 to GND during upload
- Press RESET button before upload
- Use 5V power supply (not USB power)
- Try lower upload speed (115200)

#### 4. Memory Issues
```
Sketch too big; see http://www.arduino.cc/en/Guide/Troubleshooting
```
**Solutions**:
- Use "Huge APP" partition scheme
- Remove unnecessary debug statements
- Optimize buffer sizes

#### 5. Sensor Reading Issues
```
❌ Failed to read from DHT sensor!
```
**Solutions**:
- Check sensor wiring
- Verify power supply (3.3V or 5V)
- Add delay between readings
- Check for loose connections

### Debug Tools

#### 1. Serial Monitor Messages
- `✅` = Success operations
- `❌` = Error conditions
- `📊` = Sensor data
- `🔥` = Firebase operations
- `📡` = Network operations
- `🐦` = Bird detection events

#### 2. Firebase Console Logs
- Check Firestore usage statistics
- Monitor real-time document updates
- Review security rules if needed

#### 3. Network Debugging
- Use `ping` to test Arduino IP address
- Access `http://ARDUINO_IP/status` for HTTP fallback
- Check WiFi signal strength

## Performance Optimization

### Memory Management
- Use PSRAM for ESP32-CAM
- Minimize global variables
- Free unused frame buffers promptly

### Network Efficiency
- Batch Firebase operations when possible
- Use appropriate update intervals
- Implement exponential backoff for failures

### Power Consumption
- Use deep sleep when possible
- Disable unused peripherals
- Optimize sensor reading intervals

## Security Considerations

### Firebase Security
- Use Firebase security rules (already configured)
- Avoid exposing API keys in public repositories
- Monitor usage quotas

### Network Security
- Use WPA2/WPA3 WiFi security
- Consider VPN for remote access
- Implement device authentication

## Next Steps

1. **Hardware Assembly**: Wire all components according to pin definitions
2. **Testing**: Verify each subsystem individually
3. **Integration**: Test complete Arduino ↔ Firebase ↔ React Native flow
4. **Deployment**: Install in field environment
5. **Monitoring**: Set up alerts for device offline status

## Support

For issues:
1. Check Serial Monitor output
2. Verify wiring against pin definitions
3. Test HTTP fallback endpoints
4. Check Firebase Console for data flow
5. Review React Native app logs

The Arduino Firebase integration provides robust, scalable connectivity for the BantayBot system while maintaining backward compatibility with the original HTTP-based approach.