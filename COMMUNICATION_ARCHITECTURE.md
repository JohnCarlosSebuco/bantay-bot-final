# BantayBot Communication Architecture

**Version:** 2.0 (Refactored)
**Date:** 2024-11-07
**Status:** Documentation & Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Required Flows](#required-flows)
4. [JSON Payload Specifications](#json-payload-specifications)
5. [Firebase Collections](#firebase-collections)
6. [Implementation Gaps](#implementation-gaps)
7. [Recommended Architecture](#recommended-architecture)
8. [Implementation Guide](#implementation-guide)

---

## Overview

BantayBot uses a hybrid communication architecture combining:
- **Direct LAN communication** (HTTP/WebSocket) for instant local control
- **Firebase Firestore** for remote access and data persistence
- **ImageBB CDN** for image hosting

### Components

| Component | Hardware | IP Address | Role |
|-----------|----------|------------|------|
| **Camera Board** | ESP32-CAM | 192.168.8.102 | Bird detection, image capture |
| **Main Board** | ESP32 DevKit | 192.168.8.100 | Central control, Firebase sync, hardware control |
| **Mobile App** | React Native | Dynamic | User interface, remote control |
| **Firebase** | Cloud | N/A | Command queue, data storage |
| **ImageBB** | CDN | N/A | Image hosting |

---

## Current Architecture

### Implemented Communication Paths

```
┌─────────────┐
│ ESP32-CAM   │
│ Camera      │
└──────┬──────┘
       │
       │ 1. Detects bird motion
       │ 2. Captures grayscale frame (320x240)
       │ 3. Converts to JPEG (60% quality)
       │ 4. Uploads to ImageBB (base64 + URL encoded)
       │
       ▼
┌─────────────┐
│  ImageBB    │ Returns: https://i.ibb.co/xyz/bird.jpg
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ ESP32-CAM   │
└──────┬──────┘
       │
       │ HTTP POST /bird_detected
       │ Content-Type: application/json
       │ Body: { deviceId, imageUrl, birdSize, confidence, detectionZone }
       │
       ▼
┌─────────────┐
│ ESP32 Main  │ Port 81
│ Board       │
└──────┬──────┘
       │
       ├─► Logs to Firebase (detection_history)
       ├─► Triggers alarm (audio + servos + stepper)
       └─► Responds: {"status":"ok"}
       │
       ▼
┌─────────────┐
│  Firebase   │
│  Firestore  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Mobile App  │ Real-time listeners
└─────────────┘
```

### What Works (✅)

- ✅ Camera detects birds via motion detection
- ✅ Camera uploads images to ImageBB
- ✅ Camera notifies main board (LAN HTTP POST)
- ✅ Main board logs detections to Firebase
- ✅ Main board triggers physical alarm
- ✅ App reads detection history from Firebase
- ✅ App displays images from ImageBB URLs

### What's Missing (❌)

- ❌ **Periodic image upload** (for "fake streaming" feature)
- ❌ **Camera settings endpoint** (brightness, contrast, resolution)
- ❌ **Firebase command polling** in main board firmware
- ❌ **Camera command relay** from main board to camera
- ❌ **App-to-camera settings** communication path

---

## Required Flows

### Flow 1: Detection Event (CURRENT - WORKING)

```
Camera detects bird
  ↓
Upload to ImageBB
  ↓
Send JSON to Main Board (LAN)
  ↓
Main Board logs to Firebase
  ↓
Main Board triggers alarm
  ↓
App displays notification
```

**Status:** ✅ Fully implemented

---

### Flow 2: Periodic Streaming (REQUIRED)

```
Camera (every 5-10 seconds)
  ↓
Capture frame
  ↓
Upload to ImageBB
  ↓
Send JSON to Firebase stream_updates
  ↓
App displays latest image
```

**Purpose:** Create "make-believe stream" without real MJPEG streaming
**Status:** ❌ Not implemented
**Bandwidth:** ~5-10KB per image, ~6-12KB/minute = 360-720KB/hour

---

### Flow 3: App Commands to Main Board (REQUIRED)

```
User taps button in app
  ↓
App writes to Firebase commands/{deviceId}/pending
  ↓
Main Board polls Firebase (every 2 seconds)
  ↓
Main Board executes command
  ↓
Main Board updates command status to "completed"
  ↓
App sees updated status
```

**Purpose:** Remote control from anywhere
**Status:** ⚠️ Partially implemented (app writes, main board doesn't poll)

**Alternative (Fallback):**
```
App → HTTP GET → Main Board → Execute → Respond
```
**Status:** ✅ Works but LAN-only

---

### Flow 4: App Camera Settings (REQUIRED)

**Option A: Direct Camera Polling (RECOMMENDED)**
```
App changes brightness slider
  ↓
App writes to Firebase settings/camera_001
  {
    "brightness": 2,
    "contrast": 0,
    "resolution": "QVGA",
    "updated_at": timestamp
  }
  ↓
Camera polls Firebase every 30 seconds
  ↓
Camera reads settings document
  ↓
Camera applies new settings
```

**Benefits:**
- Simple implementation
- No relay complexity
- Camera independent
- Works even if main board offline

**Option B: Relay via Main Board**
```
App → Firebase → Main Board polls → Main Board HTTP POST → Camera → Apply
```

**Benefits:**
- Main board aware of all commands
- Can log settings changes

**Status:** ❌ Neither implemented

---

## JSON Payload Specifications

### 1. Camera → Main Board (Detection)

**Endpoint:** `POST http://192.168.8.100:81/bird_detected`
**Content-Type:** `application/json`

```json
{
  "deviceId": "camera_001",
  "timestamp": 123456,
  "imageUrl": "https://i.ibb.co/xyz/bird.jpg",
  "birdSize": 1500,
  "confidence": 85,
  "detectionZone": "0,0,320,144",
  "detected": true
}
```

**Field Descriptions:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `deviceId` | string | Camera identifier | `"camera_001"` |
| `timestamp` | integer | Milliseconds since boot | `123456` |
| `imageUrl` | string | ImageBB CDN URL | `"https://i.ibb.co/xyz/bird.jpg"` |
| `birdSize` | integer | Changed pixels (motion magnitude) | `1500` |
| `confidence` | integer | Detection confidence (50-95%) | `85` |
| `detectionZone` | string | Monitored area (left,top,right,bottom) | `"0,0,320,144"` |
| `detected` | boolean | True if bird detected | `true` |

---

### 2. Camera → Firebase (Stream Update)

**Collection:** `stream_updates/camera_001`
**Document:** Auto-generated ID or single document with timestamp

```json
{
  "deviceId": "camera_001",
  "imageUrl": "https://i.ibb.co/abc/stream.jpg",
  "timestamp": "2024-11-07T22:30:15Z",
  "detected": false,
  "resolution": "QVGA",
  "grayscale": true
}
```

**Purpose:** Periodic image upload for "fake streaming" display in app

---

### 3. App → Firebase (Commands to Main Board)

**Collection:** `commands/main_001/pending/{autoId}`

#### Play Audio
```json
{
  "action": "play_audio",
  "params": {
    "track": 5
  },
  "status": "pending",
  "created_at": "2024-11-07T22:30:15Z",
  "completed_at": null
}
```

#### Set Volume
```json
{
  "action": "set_volume",
  "params": {
    "volume": 25
  },
  "status": "pending",
  "created_at": "2024-11-07T22:30:15Z"
}
```

#### Move Servos
```json
{
  "action": "oscillate_arms",
  "params": {},
  "status": "pending",
  "created_at": "2024-11-07T22:30:15Z"
}
```

#### Rotate Head
```json
{
  "action": "rotate_head",
  "params": {
    "angle": 90
  },
  "status": "pending",
  "created_at": "2024-11-07T22:30:15Z"
}
```

#### Trigger Alarm
```json
{
  "action": "trigger_alarm",
  "params": {},
  "status": "pending",
  "created_at": "2024-11-07T22:30:15Z"
}
```

**Status Values:**
- `"pending"` - Waiting for execution
- `"processing"` - Currently executing
- `"completed"` - Successfully executed
- `"failed"` - Execution failed

---

### 4. App → Firebase (Camera Settings)

**Document:** `settings/camera_001`

```json
{
  "brightness": 2,
  "contrast": 0,
  "resolution": "QVGA",
  "grayscale": true,
  "detectionEnabled": true,
  "detectionSensitivity": 2,
  "detectionThreshold": 25,
  "minBirdSize": 1000,
  "maxBirdSize": 30000,
  "streamingEnabled": true,
  "streamInterval": 5000,
  "updated_at": "2024-11-07T22:30:15Z"
}
```

**Field Descriptions:**

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `brightness` | integer | -2 to 2 | Camera brightness adjustment |
| `contrast` | integer | -2 to 2 | Camera contrast adjustment |
| `resolution` | string | `"QQVGA"`, `"QVGA"`, `"VGA"`, `"SVGA"` | Frame resolution |
| `grayscale` | boolean | true/false | Grayscale mode for detection |
| `detectionEnabled` | boolean | true/false | Enable/disable bird detection |
| `detectionSensitivity` | integer | 1-3 | 1=low, 2=medium, 3=high |
| `detectionThreshold` | integer | 10-50 | Pixel difference threshold |
| `minBirdSize` | integer | 500-5000 | Minimum pixels for bird |
| `maxBirdSize` | integer | 10000-50000 | Maximum pixels for bird |
| `streamingEnabled` | boolean | true/false | Enable periodic uploads |
| `streamInterval` | integer | 3000-60000 | Milliseconds between uploads |

---

### 5. Main Board → Firebase (Detection Log)

**Collection:** `detection_history/{autoId}`

```json
{
  "deviceId": "camera_001",
  "timestamp": "2024-11-07T22:30:15Z",
  "imageUrl": "https://i.ibb.co/xyz/bird.jpg",
  "thumbnailUrl": "https://i.ibb.co/xyz/thumb.jpg",
  "birdSize": 1500,
  "confidence": 85,
  "detectionZone": "0,0,320,144",
  "triggered": true,
  "alarmActions": {
    "audio": true,
    "servos": true,
    "headRotation": true
  }
}
```

---

### 6. Main Board → Firebase (Sensor Data)

**Document:** `sensor_data/main_001`

```json
{
  "soilHumidity": 55.5,
  "soilTemperature": 28.3,
  "soilConductivity": 1250,
  "ph": 6.8,
  "dhtTemperature": 30.2,
  "dhtHumidity": 65.0,
  "currentTrack": 5,
  "volume": 20,
  "servoActive": true,
  "headPosition": 90,
  "birdsToday": 12,
  "freeHeap": 220000,
  "timestamp": "2024-11-07T22:30:15Z"
}
```

---

## Firebase Collections

### Collection Structure

```
cloudbantaybot (project)
│
├── devices/
│   ├── main_001/
│   │   ├── ip_address: "192.168.8.100"
│   │   ├── status: "online"
│   │   ├── last_seen: timestamp
│   │   ├── firmware_version: "2.0.0-refactor"
│   │   └── heap_free: 220000
│   │
│   └── camera_001/
│       ├── ip_address: "192.168.8.102"
│       ├── status: "online"
│       ├── last_seen: timestamp
│       └── firmware_version: "2.0.0-refactor"
│
├── sensor_data/
│   └── main_001/
│       └── { ...sensor readings... }
│
├── detection_history/
│   ├── {autoId1}/
│   │   └── { ...detection data... }
│   ├── {autoId2}/
│   │   └── { ...detection data... }
│   └── ...
│
├── stream_updates/
│   └── camera_001/
│       └── { ...latest stream image... }
│
├── commands/
│   ├── main_001/
│   │   └── pending/
│   │       ├── {autoId1}/
│   │       │   └── { ...command data... }
│   │       └── {autoId2}/
│   │           └── { ...command data... }
│   │
│   └── camera_001/
│       └── pending/
│           └── { ...camera commands... }
│
└── settings/
    ├── main_001/
    │   └── { ...main board config... }
    │
    └── camera_001/
        └── { ...camera config... }
```

---

## Implementation Gaps

### Gap 1: Camera Settings Endpoint

**Current:** Camera has no HTTP endpoints to receive configuration changes
**Required:** HTTP POST endpoint to accept settings JSON

**Impact:** Cannot change camera settings from app

**Code Location:** `refactor/camera/CameraBoard_ImageBB.ino`
**Missing:** `/settings` endpoint handler

---

### Gap 2: Firebase Command Polling (Main Board)

**Current:** Main board has no code to poll Firebase commands
**Required:** Loop that checks `commands/main_001/pending` every 2 seconds

**Impact:** Firebase commands from app are written but never executed

**Code Location:** `refactor/mainboard/MainBoard_Firebase.ino`
**Missing:** `checkFirebaseCommands()` function in `loop()`

---

### Gap 3: Periodic Image Upload (Camera)

**Current:** Camera only uploads on bird detection
**Required:** Timer that uploads every 5-10 seconds regardless of detection

**Impact:** No "streaming" feature for app UI

**Code Location:** `refactor/camera/CameraBoard_ImageBB.ino`
**Missing:** Periodic upload timer in `loop()`

---

### Gap 4: Camera Settings Polling

**Current:** Camera doesn't check Firebase for settings changes
**Required:** Poll `settings/camera_001` every 30 seconds and apply changes

**Impact:** Settings changes in app have no effect

**Code Location:** `refactor/camera/CameraBoard_ImageBB.ino`
**Missing:** `checkFirebaseSettings()` function

**Alternative:** Camera HTTP endpoint + main board relay

---

### Gap 5: Stream Updates Collection

**Current:** No Firebase writes for periodic images
**Required:** Update `stream_updates/camera_001` on each periodic upload

**Impact:** App can't display "live" feed

**Code Location:** `refactor/camera/CameraBoard_ImageBB.ino`
**Missing:** Firebase write in periodic upload function

---

## Recommended Architecture

### Optimal Flow (Simplified)

```
┌─────────────────────────────────────────────────────────┐
│                    FIREBASE FIRESTORE                    │
│                   (Central Hub)                          │
│                                                          │
│  Collections:                                            │
│  - detection_history/                                    │
│  - stream_updates/camera_001                             │
│  - commands/main_001/pending/                            │
│  - commands/camera_001/pending/                          │
│  - settings/camera_001                                   │
│  - sensor_data/main_001                                  │
└───────▲─────────────────────────────▲───────────────────┘
        │                             │
        │                             │
    Writes logs              Writes commands & reads data
    Reads commands           Writes settings
        │                             │
        │                             │
┌───────┴─────────┐           ┌───────┴─────────┐
│  ESP32 Main     │◄─HTTP─────┤  Mobile App     │
│  Board          │  POST     │  React Native   │
│  (Port 81)      │           │                 │
└───────▲─────────┘           └─────────────────┘
        │
        │ HTTP POST (LAN)
        │ /bird_detected
        │
┌───────┴─────────┐           ┌─────────────────┐
│  ESP32-CAM      │──Upload──►│    ImageBB      │
│  Camera         │           │    CDN          │
│  (Port 80)      │           │                 │
└─────────────────┘           └─────────────────┘
        │
        │ Polls Firebase
        │ settings/camera_001
        │ (every 30 sec)
        │
        └──────────────────────────────► Firebase
```

### Key Design Decisions

1. **Firebase as Single Source of Truth**
   - All commands go through Firebase
   - All settings stored in Firebase
   - All data logged to Firebase

2. **Direct LAN for Time-Critical**
   - Camera → Main Board (bird detection)
   - Keep HTTP POST for instant notification

3. **Camera Independence**
   - Camera polls its own settings from Firebase
   - No relay needed through main board
   - Reduces coupling

4. **Periodic Streaming**
   - Camera uploads to ImageBB every 5-10 seconds
   - Updates `stream_updates/camera_001` with latest URL
   - App subscribes to real-time changes

5. **Command Execution**
   - Main board polls `commands/main_001/pending`
   - Executes and marks as "completed"
   - App sees status updates

---

## Implementation Guide

### Phase 1: Documentation & Planning ✅

- [x] Document current architecture
- [x] Define required flows
- [x] Specify JSON payloads
- [x] Design Firebase collections
- [x] Identify gaps

---

### Phase 2: Camera Streaming Feature

**Goal:** Add periodic image upload for "fake streaming"

**File:** `refactor/camera/CameraBoard_ImageBB.ino`

**Steps:**

1. **Add global variables (after line 51):**
```cpp
// Streaming configuration
bool streamingEnabled = true;
unsigned long streamInterval = 5000;  // 5 seconds
unsigned long lastStreamUpload = 0;
```

2. **Add function before `loop()`:**
```cpp
void uploadStreamUpdate() {
  if (!streamingEnabled) return;

  Serial.println("📸 Capturing stream frame...");

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Stream capture failed");
    return;
  }

  String imageUrl = uploadToImageBB(fb);
  esp_camera_fb_return(fb);

  if (imageUrl.length() > 0) {
    Serial.println("✅ Stream frame uploaded");
    // Optionally notify main board with "detected: false"
    notifyMainBoard(imageUrl, 0, 0);  // 0 size, 0 confidence = stream update
  }
}
```

3. **Modify `loop()` function:**
```cpp
void loop() {
  // Existing bird detection
  detectBirdMotion();

  // NEW: Periodic stream upload
  if (millis() - lastStreamUpload >= streamInterval) {
    uploadStreamUpdate();
    lastStreamUpload = millis();
  }

  delay(100);
}
```

4. **Modify `notifyMainBoard()` to differentiate (around line 260):**
```cpp
// Add "detected" field to JSON
doc["detected"] = (birdSize > 0);  // True if bird, false if stream update
```

**Testing:**
- Upload sketch to camera
- Watch Serial Monitor
- Should see "Stream frame uploaded" every 5 seconds
- Check ImageBB for new images

---

### Phase 3: Camera Settings Endpoint

**Goal:** Add HTTP endpoint to receive settings changes

**File:** `refactor/camera/CameraBoard_ImageBB.ino`

**Steps:**

1. **Add includes (after line 18):**
```cpp
#include <ESPAsyncWebServer.h>

AsyncWebServer server(80);  // Camera on port 80
```

2. **Add settings function (before `setup()`):**
```cpp
void applyCameraSettings() {
  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, cameraBrightness);
    s->set_contrast(s, cameraContrast);
    s->set_framesize(s, (framesize_t)cameraResolution);
    Serial.println("✅ Camera settings applied");
  }
}
```

3. **Add HTTP endpoint setup (in `setup()` after WiFi connects):**
```cpp
// HTTP endpoint for settings changes
server.on("/settings", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
  [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
    Serial.println("📡 Received settings update");

    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, data, len);

    if (error) {
      Serial.println("❌ JSON parsing failed");
      request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
      return;
    }

    // Apply settings
    if (doc.containsKey("brightness")) {
      cameraBrightness = doc["brightness"];
      Serial.printf("🔆 Brightness: %d\n", cameraBrightness);
    }
    if (doc.containsKey("contrast")) {
      cameraContrast = doc["contrast"];
      Serial.printf("🎨 Contrast: %d\n", cameraContrast);
    }
    if (doc.containsKey("streamInterval")) {
      streamInterval = doc["streamInterval"];
      Serial.printf("⏱️  Stream interval: %d ms\n", streamInterval);
    }
    if (doc.containsKey("streamingEnabled")) {
      streamingEnabled = doc["streamingEnabled"];
      Serial.printf("📹 Streaming: %s\n", streamingEnabled ? "ON" : "OFF");
    }

    applyCameraSettings();

    request->send(200, "application/json", "{\"status\":\"ok\",\"message\":\"Settings applied\"}");
  }
);

server.begin();
Serial.println("🌐 HTTP server started on port 80");
```

**Testing:**
```bash
# Test with curl or Postman
curl -X POST http://192.168.8.102/settings \
  -H "Content-Type: application/json" \
  -d '{"brightness":2,"contrast":1,"streamInterval":10000}'
```

---

### Phase 4: Firebase Command Polling (Main Board)

**Goal:** Main board reads and executes commands from Firebase

**File:** `refactor/mainboard/MainBoard_Firebase.ino`

**Steps:**

1. **Add global variable (after line 51):**
```cpp
unsigned long lastCommandCheck = 0;
const unsigned long COMMAND_CHECK_INTERVAL = 2000;  // 2 seconds
```

2. **Add command checking function (before `loop()`):**
```cpp
void checkFirebaseCommands() {
  if (!firebaseConnected) return;
  if (millis() - lastCommandCheck < COMMAND_CHECK_INTERVAL) return;

  lastCommandCheck = millis();

  String path = "commands/main_001/pending";

  if (Firebase.Firestore.listDocuments(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str())) {
    // Get first pending command
    FirebaseJsonArray arr;
    fbdo.get(arr);

    if (arr.size() > 0) {
      FirebaseJson item;
      arr.get(item, 0);

      String action;
      item.get(action, "action");

      Serial.println("📥 Received command: " + action);

      // Execute command
      if (action == "play_audio") {
        int track;
        item.get(track, "params/track");
        playAudio(track);
      }
      else if (action == "set_volume") {
        int volume;
        item.get(volume, "params/volume");
        setVolume(volume);
      }
      else if (action == "oscillate_arms") {
        startServoOscillation();
      }
      else if (action == "rotate_head") {
        int angle;
        item.get(angle, "params/angle");
        rotateHead(angle);
      }
      else if (action == "trigger_alarm") {
        triggerAlarmSequence();
      }

      // Mark as completed
      String docId;
      item.get(docId, "id");
      String completePath = path + "/" + docId;

      FirebaseJson updateDoc;
      updateDoc.set("fields/status/stringValue", "completed");
      updateDoc.set("fields/completed_at/timestampValue", "now");

      Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", completePath.c_str(), updateDoc.raw());
    }
  }
}
```

3. **Add to `loop()` function:**
```cpp
void loop() {
  // Existing sensor reading code...

  // NEW: Check for Firebase commands
  checkFirebaseCommands();

  // Existing code...
}
```

**Testing:**
- Upload sketch to main board
- Use Firebase Console to manually add command
- Watch Serial Monitor for execution

---

### Phase 5: Mobile App Integration

**Goal:** Ensure app uses proper command flow

**File:** `src/services/MainBoardService.js`

**Verification Steps:**

1. Check that `sendCommand()` writes to Firebase when available
2. Verify fallback to HTTP when Firebase unavailable
3. Test camera settings UI writes to `settings/camera_001`
4. Add stream display component that subscribes to `stream_updates/camera_001`

**No code changes needed** - app already structured correctly!

---

## Testing Checklist

### Camera Board Tests

- [ ] Camera uploads on bird detection
- [ ] Camera uploads every 5-10 seconds (streaming)
- [ ] Camera accepts POST to `/settings`
- [ ] Camera applies brightness changes
- [ ] Camera applies contrast changes
- [ ] Camera applies stream interval changes
- [ ] ImageBB upload succeeds (HTTP 200)
- [ ] Main board receives detection JSON
- [ ] Serial output shows all events

### Main Board Tests

- [ ] Main board receives camera detection
- [ ] Main board logs to Firebase `detection_history`
- [ ] Main board triggers alarm sequence
- [ ] Main board polls Firebase commands
- [ ] Main board executes play_audio command
- [ ] Main board executes set_volume command
- [ ] Main board executes oscillate_arms command
- [ ] Main board executes rotate_head command
- [ ] Main board marks commands as completed
- [ ] Main board responds to camera POST

### Mobile App Tests

- [ ] App displays detection history
- [ ] App shows bird images from ImageBB
- [ ] App displays stream images (updated every 5-10s)
- [ ] App sends commands via Firebase
- [ ] App updates camera settings
- [ ] App sees command status updates
- [ ] App works remotely (not on same WiFi)
- [ ] App falls back to HTTP when needed

---

## Performance Considerations

### Bandwidth Usage

**ImageBB Uploads:**
- Detection events: ~5-10KB per image, irregular
- Stream updates: ~5-10KB per image, every 5-10 seconds
- **Estimated:** 360-720KB per hour (continuous streaming)

**Firebase Operations:**
- Command writes: <1KB per command
- Detection logs: ~2KB per detection
- Stream updates: ~500 bytes per update
- **Estimated:** <1MB per hour (moderate usage)

### Memory Usage

**Camera Board (ESP32-CAM):**
- Heap after camera init: ~180KB free
- HTTP server: ~10KB
- No Firebase library (saves 100KB+)
- **Safe:** Plenty of headroom

**Main Board (ESP32):**
- Heap after Firebase init: ~220KB free
- Firebase polling: Minimal impact
- Command processing: <5KB
- **Safe:** Adequate memory

### Latency

| Operation | Expected Latency |
|-----------|-----------------|
| Camera → Main Board (LAN) | <100ms |
| Camera → ImageBB upload | 1-3 seconds |
| Main Board → Firebase write | 500ms - 2s |
| App → Firebase → Main Board | 2-5 seconds |
| Firebase → App (real-time) | <1 second |
| Camera settings HTTP | <100ms |

---

## Security Considerations

### Firebase Rules

Recommended Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read all
    match /{document=**} {
      allow read: if request.auth != null;
    }

    // Allow authenticated users to write commands
    match /commands/{device}/pending/{command} {
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }

    // Allow devices to write detection logs
    match /detection_history/{detection} {
      allow create: if true;  // Devices may not be authenticated
    }

    // Allow devices to update sensor data
    match /sensor_data/{device} {
      allow write: if true;
    }

    // Allow devices to update stream
    match /stream_updates/{device} {
      allow write: if true;
    }
  }
}
```

### API Key Security

- ✅ Firebase API key is safe to expose (has restricted permissions)
- ✅ ImageBB API key should be kept private but has upload limits
- ⚠️ Consider environment variables for production deployment

---

## Troubleshooting

### Camera not uploading to ImageBB

**Check:**
1. WiFi connected? (Serial: "✅ WiFi connected!")
2. ImageBB API key valid?
3. JPEG conversion successful?
4. URL encoding working?

**Debug:** Look for HTTP response code 200

### Main board not receiving detections

**Check:**
1. Both boards on same WiFi?
2. Main board IP correct in camera sketch?
3. Main board HTTP server started? (Serial: "HTTP server started on port 81")
4. Firewall blocking port 81?

**Test:** `curl http://192.168.8.100:81/status`

### Firebase commands not executing

**Check:**
1. Firebase connected? (Serial: "✅ Firebase connected!")
2. Command polling function added to loop()?
3. Command format correct in Firestore?
4. Device ID matches? (`main_001`)

**Debug:** Add Serial.println in `checkFirebaseCommands()`

### Camera settings not applying

**Check:**
1. HTTP endpoint added?
2. Server started in setup()?
3. JSON parsing successful?
4. `applyCameraSettings()` called?

**Test:** `curl -X POST http://192.168.8.102/settings -d '{"brightness":2}'`

---

## Future Enhancements

### Potential Improvements

1. **Machine Learning Bird Detection**
   - Replace motion detection with TensorFlow Lite
   - Reduce false positives
   - Species identification

2. **Two-Way Audio**
   - Add microphone to camera
   - Stream audio to app
   - Voice commands

3. **Solar Power**
   - Add solar panel + battery
   - Power management
   - Weatherproofing

4. **Multi-Camera Support**
   - Multiple ESP32-CAM devices
   - Synchronized detection
   - 360° coverage

5. **Advanced Streaming**
   - WebRTC for true real-time streaming
   - Lower latency
   - Adaptive quality

---

## References

### Code Files

- `refactor/camera/CameraBoard_ImageBB.ino` - Camera firmware
- `refactor/mainboard/MainBoard_Firebase.ino` - Main board firmware
- `src/services/CommandService.js` - App command service
- `src/services/MainBoardService.js` - App main board service
- `src/services/WebSocketService.js` - App WebSocket service

### External Documentation

- [ImageBB API Documentation](https://api.imgbb.com/)
- [Firebase Firestore Guide](https://firebase.google.com/docs/firestore)
- [ESP32 Camera Library](https://github.com/espressif/esp32-camera)
- [ESP32 Firebase Client](https://github.com/mobizt/Firebase-ESP-Client)

---

## Changelog

### Version 2.0 (2024-11-07)
- Refactored architecture documentation
- Added streaming feature specifications
- Added Firebase command polling guide
- Added camera settings endpoint guide
- Added JSON payload specifications
- Added implementation guide

### Version 1.0 (2024-10-05)
- Initial unified architecture
- Basic Firebase integration
- Camera detection flow

---

**End of Documentation**
