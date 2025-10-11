# 🔌 BantayBot Communication Protocol

## System Architecture Overview

The BantayBot uses a **hybrid communication protocol** optimized for reliability and simplicity:

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)            │
│                                                           │
│  ┌───────────────────┐          ┌──────────────────┐   │
│  │  MainBoardService │          │ WebSocketService │   │
│  │   (HTTP Polling)  │          │   (WebSocket)    │   │
│  └─────────┬─────────┘          └────────┬─────────┘   │
└────────────┼──────────────────────────────┼─────────────┘
             │                              │
             │ HTTP (Port 81)               │ WebSocket (Port 80)
             │ GET /status (every 2s)       │ ws://[IP]/ws
             │ GET /play?track=1            │ JSON messages
             │ GET /trigger-alarm           │
             │                              │
      ┌──────▼────────┐              ┌─────▼──────┐
      │  Main ESP32   │──HTTP───────>│ ESP32-CAM  │
      │  (Control)    │  Port 81      │ (Camera)   │
      │  Port 81      │◄─────────────│ Port 80    │
      └───────────────┘  /trigger-alarm └───────────┘
           │
           ├─ 🔊 Speaker (DFPlayer)
           ├─ 🦾 Servos (PCA9685)
           ├─ 🔄 Stepper Motor
           └─ 🌱 Soil Sensor (RS485)
```

---

## Main Board Communication (HTTP)

### Why HTTP Instead of WebSocket?

The main board uses **HTTP polling** instead of WebSocket because:

1. ✅ **Library Compatibility**: Standard `WebServer.h` works reliably without linker errors
2. ✅ **Simplicity**: No complex async server libraries needed
3. ✅ **Stability**: HTTP is stateless - no connection drops to handle
4. ✅ **Sufficient Speed**: 2-second polling is perfect for sensor data (RS485 updates every 2s anyway)
5. ✅ **Arduino-Friendly**: Standard ESP32 core supports it out of the box

### HTTP Endpoints (Main Board - Port 81)

#### GET `/status`
**Returns current sensor data and system state**

Response (JSON):
```json
{
  "soilHumidity": 55.5,
  "soilTemp": 28.3,
  "soilConductivity": 1250,
  "ph": 6.8,
  "currentTrack": 1,
  "volume": 20,
  "motionDetected": false,
  "servoActive": false
}
```

**App polls this every 2 seconds**

---

#### GET `/play?track={1-7}`
**Play specific audio track (skips track 3)**

Example:
```
GET http://192.168.1.29:81/play?track=2
```

Response:
```
Playing track 2
```

---

#### GET `/volume?level={0-30}`
**Set audio volume**

Example:
```
GET http://192.168.1.29:81/volume?level=25
```

Response:
```
Volume set to 25
```

---

#### GET `/move-arms`
**Trigger 6-cycle servo oscillation**

Response:
```
Servo oscillation started
```

---

#### GET `/stop`
**Stop all movement and audio**

Response:
```
All stopped
```

---

#### GET `/trigger-alarm`
**Full alarm sequence (called by camera when bird detected)**

Actions:
1. Play next audio track (auto-skip track 3)
2. Activate servo oscillation (6 cycles)
3. Log to Serial Monitor

Response:
```
Alarm triggered! Track 2
```

---

## Camera Board Communication (WebSocket)

### Why WebSocket for Camera?

The camera board uses **WebSocket** because:

1. ✅ **Real-time Alerts**: Bird detection needs instant notification
2. ✅ **Bidirectional**: App can adjust detection sensitivity in real-time
3. ✅ **Library Support**: ESP32-CAM uses `ESPAsyncWebServer` (already included for camera streaming)
4. ✅ **Efficient**: Camera status updates don't need constant polling

### WebSocket Messages (Camera Board - Port 80)

**WebSocket URL:** `ws://192.168.1.28:80/ws`

---

#### App → Camera Commands

**Toggle Bird Detection:**
```json
{"command": "TOGGLE_DETECTION"}
```

**Set Detection Sensitivity (1=Low, 2=Medium, 3=High):**
```json
{"command": "SET_SENSITIVITY", "value": 2}
```

**Reset Bird Count:**
```json
{"command": "RESET_BIRD_COUNT"}
```

**Adjust Camera Brightness (-2 to +2):**
```json
{"command": "SET_BRIGHTNESS", "value": 1}
```

**Adjust Camera Contrast (-2 to +2):**
```json
{"command": "SET_CONTRAST", "value": 0}
```

**Toggle Grayscale Mode:**
```json
{"command": "TOGGLE_GRAYSCALE"}
```

---

#### Camera → App Messages

**Camera Status (sent on connect and after every setting change):**
```json
{
  "type": "camera_status",
  "birdDetectionEnabled": true,
  "birdsDetectedToday": 5,
  "detectionSensitivity": 2,
  "brightness": 0,
  "contrast": 0,
  "grayscale": false,
  "timestamp": 123456789
}
```

**Bird Detection Alert (sent when bird detected):**
```json
{
  "type": "bird_detection",
  "message": "Bird detected!",
  "count": 6,
  "timestamp": 123456789
}
```

---

## Board-to-Board Communication

**ESP32-CAM → Main ESP32 (Autonomous Operation)**

When the camera detects a bird:

1. Camera board sends HTTP GET request:
   ```
   GET http://192.168.1.29:81/trigger-alarm
   ```

2. Main board responds immediately:
   - Plays audio
   - Activates servos
   - Returns `200 OK`

3. System works **fully autonomously** without mobile app

**Configuration:**
- Camera code line 28-29: Set main board IP and port
- Must be on same WiFi network
- Response time: < 100ms

---

## App Service Architecture

### `MainBoardService.js` (New)

**Purpose:** HTTP-based communication with main control board

**Key Methods:**
- `startPolling(interval)` - Begin polling `/status` endpoint
- `fetchStatus()` - Get current sensor data
- `playTrack(track)` - Play audio track
- `setVolume(level)` - Adjust volume
- `moveArms()` - Trigger servo oscillation
- `stop()` - Emergency stop
- `triggerAlarm()` - Full alarm sequence

**Events:**
- `connected` - Connection status changed
- `data` - Sensor data received
- `error` - HTTP request failed

---

### `WebSocketService.js` (Modified)

**Changes:**
- Removed main board WebSocket code
- Now uses `MainBoardService` for main board
- Kept WebSocket only for camera board
- Maps WebSocket-style commands to HTTP calls

**Backward Compatibility:**
- `send()` method still works (calls `sendToMain()`)
- `connectAll()` connects both boards
- Events maintain same structure

---

## Configuration

### `src/config/config.js`

```javascript
// Main Board (HTTP)
MAIN_ESP32_IP: '192.168.1.29',
MAIN_ESP32_PORT: 81,

// Camera Board (WebSocket)
CAMERA_ESP32_IP: '192.168.1.28',
CAMERA_ESP32_PORT: 80,
CAMERA_WEBSOCKET_PATH: '/ws',

UPDATE_INTERVAL: 2000,  // HTTP polling interval
```

---

## Troubleshooting

### Main Board Not Connecting

**Symptom:** Console shows "Main Board connection lost"

**Check:**
1. Is main board powered on?
2. Is it connected to WiFi? (Check Serial Monitor)
3. Is IP address correct in `config.js`?
4. Can you access `http://[IP]:81/status` in browser?

**Test manually:**
```bash
# In browser or curl
http://192.168.1.29:81/status
```

---

### Camera Board Not Connecting

**Symptom:** "Expected HTTP 101 response but was '404 Not Found'"

**Check:**
1. Is camera board powered on?
2. Is it connected to WiFi?
3. Is IP address correct?
4. Is WebSocket endpoint `/ws` available?

**Test manually:**
```bash
# In browser
http://192.168.1.28/stream  # Should show camera feed
```

---

### Camera Can't Trigger Main Board

**Symptom:** Camera detects bird but no alarm plays

**Check:**
1. Are both boards on same WiFi network?
2. Is `mainBoardIP` in camera code correct? (line 28)
3. Can camera reach main board? (Check Serial Monitor on camera for HTTP response)
4. Is main board HTTP server running? (Serial Monitor should show "✅ HTTP server started on port 81")

**Test manually from camera Serial Monitor:**
```cpp
// You should see:
🐦 BIRD DETECTED!
✅ Main board triggered! Response: 200
```

---

## Performance Characteristics

| Feature | Protocol | Latency | Reliability |
|---------|----------|---------|-------------|
| **Sensor Data** | HTTP Polling | 2000ms | ⭐⭐⭐⭐⭐ |
| **Bird Alerts** | WebSocket | < 100ms | ⭐⭐⭐⭐ |
| **Control Commands** | HTTP GET | < 500ms | ⭐⭐⭐⭐⭐ |
| **Board-to-Board** | HTTP GET | < 100ms | ⭐⭐⭐⭐⭐ |

---

## Migration Notes

**For existing code using WebSocket to main board:**

Old way:
```javascript
WebSocketService.sendToMain({ command: 'PLAY_TRACK', value: 2 });
```

New way (same syntax, different implementation):
```javascript
// Still works! Now uses HTTP under the hood
await WebSocketService.sendToMain({ command: 'PLAY_TRACK', value: 2 });
```

**Breaking Changes:** None - API is backward compatible!

---

## Summary

✅ **Main Board:** HTTP polling (reliable, simple, Arduino-friendly)
✅ **Camera Board:** WebSocket (real-time alerts, bidirectional)
✅ **Board-to-Board:** HTTP (autonomous operation)
✅ **App Compatibility:** Fully backward compatible

**This hybrid approach gives the best of both worlds: reliability + real-time features! 🚀**

---

**Mabuhay ang Magsasaka! 🇵🇭🌾**
