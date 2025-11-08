# UNUSED - Archived BantayBot Files

This folder contains old/superseded code and documentation that has been archived for reference.

## ⚠️ Important

**These files are NO LONGER ACTIVE.** The current working code is in the `refactor/` folder at the root of the repository.

## Current Working Architecture

See: **`/refactor/`** folder

- **refactor/camera/CameraBoard_ImageBB.ino** - Active ESP32-CAM code with ImageBB integration
- **refactor/mainboard/MainBoard_Firebase.ino** - Active ESP32 main board code with Firebase

The refactor architecture solves the ESP32-CAM memory crash issue by:
- Removing Firebase from camera board (freed 100KB+ memory)
- Using ImageBB for image hosting (free CDN)
- Main board handles all Firebase operations
- Clean separation of concerns

## Folder Structure

### 01_old_sketches/

**Old Arduino sketches superseded by refactor folder:**

#### root_sketches/
- `BantayBotUnified.ino` - Old unified sketch (WiFi: vivo Y16)
- `CameraWebServerESP32camcode.ino` - Old camera sketch (WiFi: vivo Y16)
- `BantayBotUnified_Firebase.ino` - Old unified with Firebase (crashed on ESP32-CAM)
- `CameraWebServerESP32cam_Firebase.ino` - Old camera with Firebase (memory crash issue)
- `board_config.h` - Old camera pin config (duplicate of refactor/camera/board_config.h)

#### arduino_folder/
- `BantayBot_Camera_ESP32CAM/` - Old camera board sketch
- `BantayBot_MainBoard_ESP32/` - Old main board sketch
- `libraries.txt` - Library list

#### BantayBotUnified_folder/
- `BantayBotUnified.ino` - Duplicate of root BantayBotUnified.ino

#### existingArduinoCodes/
- Very old Arduino code from early development

---

### 02_old_documentation/

**Old development documentation and checkpoints:**

#### checkpoints/
Development checkpoint files tracking project progress:
- `FINAL_VERIFICATION.md`
- `FUNCTIONAL_CHECKPOINT_1.md` through `FUNCTIONAL_CHECKPOINT_5.md`
- `PROGRESS_CHECKPOINT_1.md`
- `PROGRESS_CHECKPOINT_2_FINAL.md`

#### implementation/
Implementation guides and summaries:
- `IMPLEMENTATION_SUMMARY.md`
- `INTEGRATION_GUIDE.md`
- `TESTING_CHECKLIST.md`
- `HARDWARE_APP_ALIGNMENT_SUMMARY.md`
- `AUTONOMOUS_SYSTEM_SETUP.md`
- `COMMUNICATION_PROTOCOL.md`
- `DYNAMIC_CONFIG_GUIDE.md`

#### setup_guides/
Old setup documentation:
- `ARDUINO_FIREBASE_SETUP.md`
- `FIREBASE_INTEGRATION.md`
- `HARDWARE_SETUP.md`

---

### 03_mdns_experimental/

**Experimental mDNS network discovery features:**

- `MDNS_SETUP.md` - mDNS setup guide
- `MDNS_USAGE.md` - mDNS usage documentation
- `MDNSService.js` - React Native mDNS service implementation

Status: Experimental, not fully integrated into production

---

### 04_misc/

**Miscellaneous files:**

- `QUICK_START.md` - Old quick start guide
- `NUL` - Empty error file
- `debugOptimized/` - Android build variant folder

---

## Why Files Were Archived

### Memory Crash Issue (Fixed in Refactor)

The old camera sketches (`CameraWebServerESP32cam_Firebase.ino`) had a critical issue:
- ESP32-CAM has limited memory
- Firebase-ESP-Client library is very large (~100KB+)
- Global static allocation exceeded ESP32's ~94KB limit
- Result: LoadProhibited crash at 0x0000000f during Firebase.begin()

**Solution (refactor folder):**
- Camera uploads images to ImageBB (lightweight HTTP API)
- Camera sends image URL to main board
- Main board handles all Firebase operations
- Camera board freed 100KB+ memory
- No more crashes!

### Superseded Architecture

Old architecture attempted:
```
ESP32-CAM → Firebase Firestore (CRASH!)
```

New refactor architecture:
```
ESP32-CAM → ImageBB → Main Board ESP32 → Firebase Firestore ✅
```

---

## What to Use Instead

| Old File | Use This Instead |
|----------|------------------|
| Any old .ino sketch | `refactor/camera/CameraBoard_ImageBB.ino` or `refactor/mainboard/MainBoard_Firebase.ino` |
| Old setup guides | `refactor/camera/README.md` or `refactor/mainboard/README.md` |
| Old documentation | `refactor/README.md` for architecture overview |
| Old board_config.h | `refactor/camera/board_config.h` |

---

## Reference Information

These files are kept for:
- Historical reference
- Understanding project evolution
- Recovering old implementation details if needed
- Documentation of what didn't work and why

**Do not use these files for new development.**

---

## Active Documentation

For current documentation, see:

- **Root `/README.md`** - Main project overview
- **`/refactor/README.md`** - Refactored architecture guide
- **`/refactor/camera/README.md`** - Camera board setup
- **`/refactor/mainboard/README.md`** - Main board setup
- **`/arduino/README.md`** - Arduino documentation (still useful)
- **`/arduino/ARDUINO_UPLOAD_GUIDE.md`** - Upload instructions
- **`/arduino/FIX_CAMERA_LINKER_ERROR.md`** - Troubleshooting

---

## Timeline

- **Early Development**: existingArduinoCodes/
- **Unified Approach**: BantayBotUnified.ino
- **Firebase Integration Attempt**: BantayBotUnified_Firebase.ino, CameraWebServerESP32cam_Firebase.ino (crashed)
- **Current (Refactored)**: refactor/ folder (working! ✅)

---

*Last Updated: November 2024*
*Branch: chore/cleanup-unused-files*
