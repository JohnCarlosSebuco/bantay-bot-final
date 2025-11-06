# BantayBot Camera Board - Refactored

Lightweight ESP32-CAM firmware with ImageBB integration.

## Architecture

```
Camera Board → ImageBB → Main Board → Firebase
```

- Camera captures and detects birds
- Uploads images to ImageBB (free CDN)
- Notifies Main Board with image URL
- Main Board handles all Firebase operations

## Hardware

- **Board**: AI Thinker ESP32-CAM
- **Camera**: OV2640 (QVGA 320x240)
- **Memory**: 4MB PSRAM (WiFi uses it all, camera uses DRAM)

## Features

✅ **No Firebase library** - saves 100KB+ memory
✅ **Bird detection** - frame differencing algorithm
✅ **ImageBB upload** - simple HTTP POST
✅ **Main Board notification** - sends detection + image URL
✅ **Adjustable sensitivity** - 3 levels (low/medium/high)
✅ **Detection cooldown** - 10 seconds between alerts

## Configuration

### 1. Get ImageBB API Key (FREE)

1. Go to https://api.imgbb.com/
2. Sign up for free account
3. Get your API key
4. Update in `CameraBoard_ImageBB.ino`:
   ```cpp
   const char *IMGBB_API_KEY = "YOUR_KEY_HERE";
   ```

### 2. Update Main Board IP

In `CameraBoard_ImageBB.ino`:
```cpp
const char *MAIN_BOARD_IP = "192.168.8.100";  // Your main board IP
const int MAIN_BOARD_PORT = 81;
```

### 3. WiFi Credentials

Already hardcoded:
```cpp
const char *WIFI_SSID = "HUAWEI-E5330-6AB9";
const char *WIFI_PASSWORD = "16yaad0a";
```

## Arduino IDE Settings

- **Board**: AI Thinker ESP32-CAM
- **Partition Scheme**: Huge APP (3MB No OTA/1MB SPIFFS)
- **PSRAM**: Enabled
- **CPU Frequency**: 240MHz
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Upload Speed**: 115200

## Libraries Required

Install via Arduino Library Manager:

1. **ArduinoJson** (v6.x)
2. **ESP32** board package (v2.x)
3. **base64** by Densaugeo

## Upload Process

1. Connect ESP32-CAM via USB-TTL adapter
2. Connect GPIO0 to GND (boot mode)
3. Press reset button
4. Upload sketch
5. Disconnect GPIO0 from GND
6. Press reset button

## Serial Monitor Output

```
📷 BantayBot Camera Board with ImageBB - Starting...
💾 Free heap: 264640 bytes
✅ Camera initialized successfully!
✅ Bird detection initialized
✅ WiFi connected!
📍 IP address: 192.168.8.102
🚀 BantayBot Camera Board ready!
```

## Bird Detection Flow

```
1. Capture frame every 100ms
2. Compare with previous frame (motion detection)
3. If motion detected in size range:
   a. Capture JPEG image
   b. Convert to base64
   c. POST to ImageBB API
   d. Get image URL
   e. POST to Main Board with URL + metadata
   f. Main Board triggers alarm + logs to Firebase
```

## Memory Usage

- **Free heap before WiFi**: 264KB
- **Free heap after WiFi**: 154KB
- **Free heap after camera**: 206KB (camera uses DRAM, not heap)
- **Free heap after detection buffers**: ~150KB

## Troubleshooting

### Camera init failed
- Check camera ribbon cable connection
- Ensure camera is AI Thinker model (not other ESP32-CAM variants)

### ImageBB upload failed
- Check API key is valid
- Ensure internet connection is working
- Check image size (max 32MB, typical 15-30KB)

### Main Board not responding
- Verify main board IP address
- Check main board is running and on port 81
- Test with: `curl http://192.168.8.100:81/status`

### Out of memory crashes
- Bird detection uses ~150KB RAM for grayscale buffers
- Reduce image quality if needed (increase `config.jpeg_quality`)
- Disable bird detection if only streaming needed

## API Reference

### ImageBB Upload

```http
POST https://api.imgbb.com/1/upload
Content-Type: application/x-www-form-urlencoded

key=YOUR_API_KEY&image=BASE64_IMAGE
```

Response:
```json
{
  "success": true,
  "data": {
    "url": "https://i.ibb.co/xyz123/image.jpg",
    "thumb": {
      "url": "https://i.ibb.co/xyz123/thumb.jpg"
    }
  }
}
```

### Main Board Notification

```http
POST http://192.168.8.100:81/bird_detected
Content-Type: application/json

{
  "deviceId": "camera_001",
  "timestamp": 1234567890,
  "imageUrl": "https://i.ibb.co/xyz123/bird.jpg",
  "birdSize": 1500,
  "confidence": 85,
  "detectionZone": "0,0,320,144"
}
```

Response:
```json
{
  "status": "ok",
  "action": "alarm_triggered"
}
```

## Files

- `CameraBoard_ImageBB.ino` - Main sketch
- `board_config.h` - Camera pin definitions
- `README.md` - This file
