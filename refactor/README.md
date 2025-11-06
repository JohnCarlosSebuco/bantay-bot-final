# BantayBot Refactored Architecture

Clean separation of concerns: Camera handles detection and ImageBB, Main Board handles logic and Firebase.

## Architecture Overview

```
┌─────────────────┐      ┌─────────────┐      ┌──────────────┐
│  ESP32-CAM      │      │   ImageBB   │      │  Main Board  │
│  Camera Board   │─────▶│   (CDN)     │      │   ESP32      │
│                 │      └─────────────┘      │              │
│ - Bird detect   │                           │ - Firebase   │
│ - Capture image │      ┌─────────────┐      │ - Audio      │
│ - Upload ImageBB│      │  Detection  │      │ - Servos     │
│ - Send URL ─────┼─────▶│  Endpoint   │─────▶│ - Stepper    │
└─────────────────┘      └─────────────┘      │ - RS485      │
                                               └──────────────┘
                                                      │
                                               ┌──────▼────────┐
                                               │   Firebase    │
                                               │   Firestore   │
                                               │               │
                                               │ - Devices     │
                                               │ - Sensors     │
                                               │ - Detections  │
                                               └───────────────┘
                                                      │
                                               ┌──────▼────────┐
                                               │  Mobile App   │
                                               │  React Native │
                                               └───────────────┘
```

## Why This Architecture?

### ✅ Problems Solved

1. **ESP32-CAM Memory Crash** - Removed Firebase library, freed 100KB+
2. **Image Storage** - ImageBB provides free CDN hosting
3. **Separation of Concerns** - Camera detects, Main Board decides
4. **Cleaner Code** - Each board has single responsibility
5. **Faster Communication** - Small JSON instead of large image transfer

### ✅ Benefits

- **Camera Board**: Lightweight, no Firebase crashes, more memory for detection
- **Main Board**: Full control, Firebase works perfectly, logs with image URLs
- **Mobile App**: No changes needed, works with existing API
- **ImageBB**: Free, fast CDN, automatic thumbnails
- **Firestore**: Clean data structure with image URLs

## Quick Start

### 1. Camera Board Setup

```bash
cd refactor/camera/
```

1. Get free ImageBB API key from https://api.imgbb.com/
2. Edit `CameraBoard_ImageBB.ino`:
   ```cpp
   const char *IMGBB_API_KEY = "your_key_here";
   const char *MAIN_BOARD_IP = "192.168.8.100";  // Your main board IP
   ```
3. Upload to ESP32-CAM
4. See `camera/README.md` for details

### 2. Main Board Setup

```bash
cd refactor/mainboard/
```

1. Check `config.h` (WiFi and Firebase already configured)
2. Upload to ESP32 DevKit
3. See `mainboard/README.md` for details

### 3. Test

1. Power on both boards
2. Check serial monitors for successful initialization
3. Trigger bird detection (wave hand in front of camera)
4. Check Firestore `detection_history` collection
5. Verify image URL is logged
6. Test mobile app

## File Structure

```
refactor/
├── README.md (this file)
├── camera/
│   ├── CameraBoard_ImageBB.ino
│   ├── board_config.h
│   └── README.md
└── mainboard/
    ├── MainBoard_Firebase.ino
    ├── config.h
    └── README.md
```

## Data Flow

### Bird Detection Sequence

```
1. Camera detects motion (frame differencing)
   ↓
2. Camera captures JPEG image (~15-30KB)
   ↓
3. Camera uploads to ImageBB
   POST https://api.imgbb.com/1/upload
   ↓
4. ImageBB returns URLs
   {
     "url": "https://i.ibb.co/xyz/bird.jpg",
     "thumb": "https://i.ibb.co/xyz/thumb.jpg"
   }
   ↓
5. Camera sends to Main Board
   POST http://192.168.8.100:81/bird_detected
   {
     "imageUrl": "https://i.ibb.co/xyz/bird.jpg",
     "birdSize": 1500,
     "confidence": 85
   }
   ↓
6. Main Board logs to Firestore
   detection_history/{auto_id} = {
     "imageUrl": "https://i.ibb.co/xyz/bird.jpg",
     "birdSize": 1500,
     "confidence": 85,
     "triggered": true
   }
   ↓
7. Main Board triggers alarm
   - Play audio track
   - Oscillate servos (6 cycles)
   - Rotate head
   ↓
8. Main Board responds to camera
   { "status": "ok", "action": "alarm_triggered" }
```

## Configuration

### WiFi (hardcoded in both boards)
```cpp
SSID: "HUAWEI-E5330-6AB9"
Password: "16yaad0a"
```

### IP Addresses
- **Main Board**: 192.168.8.100:81 (or DHCP assigned)
- **Camera Board**: 192.168.8.102 (or DHCP assigned)

### Firebase
```cpp
Project ID: "cloudbantaybot"
API Key: "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
```

### ImageBB
- Get free API key: https://api.imgbb.com/
- No account expiration
- 32MB max file size (our images are ~15-30KB)
- Unlimited bandwidth

## Memory Comparison

### Old Architecture (Camera with Firebase)
```
ESP32-CAM:
  Free heap: 154KB
  Firebase library: ~100KB
  Result: CRASH ❌
```

### New Architecture (Camera with ImageBB)
```
ESP32-CAM:
  Free heap: 154KB
  No Firebase: +100KB saved
  ImageBB: Only HTTPClient (~10KB)
  Result: 244KB free ✅
```

### Main Board (unchanged)
```
ESP32 DevKit:
  Free heap: 250KB
  Firebase: Works perfectly ✅
  Plenty of room ✅
```

## Testing

### Test Camera Board
```bash
# Check camera status
curl http://192.168.8.102/status

# View logs
# Open Serial Monitor @ 115200 baud
```

### Test Main Board
```bash
# Check main board status
curl http://192.168.8.100:81/status

# Manually trigger alarm
curl http://192.168.8.100:81/trigger-alarm

# Test audio
curl http://192.168.8.100:81/play?track=1

# Test servos
curl http://192.168.8.100:81/move-arms
```

### Test Integration
```bash
# Simulate camera detection
curl -X POST http://192.168.8.100:81/bird_detected \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "camera_001",
    "imageUrl": "https://i.ibb.co/test/bird.jpg",
    "birdSize": 1500,
    "confidence": 85,
    "detectionZone": "0,0,320,144"
  }'

# Check Firestore for logged detection
```

## Mobile App Integration

The mobile app works **without any changes**:

1. **Polling**: App polls `http://192.168.8.100:81/status` every 2s
2. **Firebase**: App reads from Firestore `detection_history` collection
3. **Image Display**: App shows ImageBB URLs directly
4. **Commands**: App sends HTTP requests to main board
5. **Streaming**: App can request latest snapshot from camera

## Troubleshooting

### Camera not uploading to ImageBB
- Check API key is valid
- Test with curl: `curl https://api.imgbb.com/1/upload -F "key=YOUR_KEY" -F "image=@test.jpg"`
- Check internet connection

### Main board not receiving detections
- Check camera has correct main board IP
- Test endpoint: `curl -X POST http://192.168.8.100:81/bird_detected -H "Content-Type: application/json" -d "{}"`
- Check both boards on same WiFi network

### Firebase not logging
- Check Firebase credentials in `config.h`
- Enable Anonymous Auth in Firebase Console
- Check Firestore rules allow writes
- View Serial Monitor for error messages

### Images not showing in mobile app
- Check Firestore has `imageUrl` field populated
- Test ImageBB URL directly in browser
- Check mobile app has internet access
- Verify ImageBB URLs aren't expired (they shouldn't be)

## Future Enhancements

- [ ] Add image compression before upload
- [ ] Implement image caching on main board
- [ ] Add time-of-day detection rules
- [ ] Implement ML-based bird classification
- [ ] Add battery status monitoring
- [ ] Implement OTA updates
- [ ] Add multi-camera support
- [ ] Implement detection zones from mobile app

## License

MIT License - Use freely for your BantayBot project!

## Support

See individual README files:
- `camera/README.md` - Camera board details
- `mainboard/README.md` - Main board details

For issues, check Serial Monitor output at 115200 baud.
