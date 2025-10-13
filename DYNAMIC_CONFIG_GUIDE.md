# BantayBot Dynamic Configuration System

## Overview

This guide explains the new dynamic configuration system that eliminates hardcoded WiFi credentials, IP addresses, and other settings. Everything is now configurable through the mobile app or ESP32 web portals without code changes!

## Features Implemented

### Mobile App (React Native)
✅ **ConfigService** - Centralized configuration management with persistent storage
✅ **NetworkDiscoveryService** - Auto-detect ESP32 devices on the network
✅ **Enhanced Settings Screen** - Separate inputs for Camera Board and Main Board
✅ **Network Scanner** - Automatically find BantayBot devices on your network
✅ **Connection Testing** - Test both boards independently

### Arduino (ESP32)
✅ **WiFi Manager** - No more hardcoded WiFi credentials!
✅ **Enhanced Setup Portal** - Shows IP address on success page with 30-second display (no Serial Monitor needed!)
✅ **Persistent Storage** - Settings saved to ESP32 flash memory
✅ **mDNS Broadcasting** - Access boards via `bantaybot-main.local` and `bantaybot-camera.local`
✅ **Auto-Fallback** - If WiFi fails, automatically switches to setup mode
✅ **Info Endpoint** - `/info` endpoint returns board status in JSON format
✅ **Reset Endpoint** - `/reset-config` endpoint to clear stored credentials

---

## First Time Setup

### Step 1: Configure Main Board ESP32

1. **Upload the updated firmware** to the Main Board ESP32
2. **Power on the board** - Since it has no saved WiFi credentials, it will automatically enter setup mode
3. **Look for the WiFi network**: `BantayBot-Main-Setup`
   - Password: `bantaybot123`
4. **Connect your phone/computer** to this network
5. **Open a browser** and go to: `http://192.168.4.1`
6. **Enter your WiFi credentials**:
   - WiFi SSID: Your home/network WiFi name
   - WiFi Password: Your WiFi password
7. **Click "Save & Connect"**
8. **The board will connect to WiFi and show the IP address on the success page**
   - A large display will show the assigned IP (e.g., `172.24.26.193`)
   - The board will restart automatically after 30 seconds
   - **No Serial Monitor needed!** The IP is shown directly in your browser
9. **Write down the IP address** or take a screenshot before the 30-second timer expires

### Step 2: Configure Camera Board ESP32-CAM

1. **Upload the updated firmware** to the Camera Board
2. **Power on the board** - It will enter setup mode automatically
3. **Look for the WiFi network**: `BantayBot-Camera-Setup`
   - Password: `bantaybot123`
4. **Connect your phone/computer** to this network
5. **Open a browser** and go to: `http://192.168.4.1`
6. **Enter configuration**:
   - WiFi SSID: Your home/network WiFi name
   - WiFi Password: Your WiFi password
   - Main Board IP: The IP you noted from Step 1 (e.g., `172.24.26.193`)
   - Main Board Port: `81` (default)
7. **Click "Save & Connect"**
8. **The board will connect and show BOTH IP addresses on the success page**:
   - Camera Board IP (e.g., `172.24.26.194`)
   - Main Board IP (confirms connection)
   - The board will restart automatically after 30 seconds
   - **No Serial Monitor needed!** All info is shown in your browser
9. **Write down the Camera IP address** or take a screenshot

### Step 3: Configure Mobile App

1. **Open the BantayBot app**
2. **Go to Settings tab**
3. **Use Auto-Discovery** (Recommended):
   - Tap "Scan Network" button
   - Wait for the scan to complete
   - The app will automatically find and fill in the IP addresses!
4. **Or manually enter IPs**:
   - Camera Board IP: (from Step 2)
   - Camera Board Port: `80`
   - Main Board IP: (from Step 1)
   - Main Board Port: `81`
5. **Test Connections** - Tap "Test Connections" to verify
6. **Save Settings**

---

## Using the System

### Automatic mDNS with Fallback

The app now uses **smart connection strategies** with automatic fallback:

1. **First attempt**: Tries mDNS hostnames
   - Main Board: `bantaybot-main.local:81`
   - Camera Board: `bantaybot-camera.local:80`
2. **Fallback**: If mDNS fails, automatically tries saved IP addresses
3. **No configuration needed**: The app handles this automatically!

**Benefits**:
- No need to remember IP addresses
- Works even if router assigns new IPs
- Automatic fallback ensures reliability
- No extra setup required

**Note**: You can disable mDNS in Settings if needed (defaults to enabled)

### Changing WiFi Network

If you need to connect to a different WiFi network:

**Method 1: Reset via Endpoint** (Easiest - No Serial Monitor!)
1. Connect to the board's current IP in your browser
2. Go to: `http://[board-ip]/reset-config`
   - Main Board: `http://[main-ip]:81/reset-config`
   - Camera Board: `http://[camera-ip]:80/reset-config`
3. The board will clear credentials and restart in setup mode
4. Follow the First Time Setup steps again

**Method 2: Physical Reset**
1. Power cycle the board while holding the BOOT button
2. The board will clear saved credentials and enter setup mode
3. Follow the First Time Setup steps again

### Network Auto-Discovery

The mobile app uses **smart discovery** to find your BantayBot devices:

1. Open Settings
2. Tap "Scan Network"
3. **Phase 1**: App tries mDNS first (fast - a few seconds)
   - If devices are found via mDNS, discovery completes immediately
4. **Phase 2**: If mDNS fails, falls back to IP scanning (30-60 seconds)
   - Scans common IP ranges on your network
5. Found devices are automatically filled in
6. Tap "Test Connections" to verify
7. Save settings

**Smart features**:
- Detects if mDNS is available and configures accordingly
- Shows connection method used (mDNS or IP scan)
- Minimizes wait time by trying fast methods first

---

## Configuration Files

### Mobile App Files
- `src/services/ConfigService.js` - Centralized config management
- `src/services/NetworkDiscoveryService.js` - Network scanning
- `src/screens/SettingsScreen.js` - Enhanced UI with separate board inputs
- `src/services/WebSocketService.js` - Updated to use dynamic config
- `src/services/MainBoardService.js` - Updated to use dynamic config

### Arduino Files
- `arduino/BantayBot_MainBoard_ESP32/BantayBot_MainBoard_ESP32.ino` - WiFi Manager + mDNS
- `arduino/BantayBot_Camera_ESP32CAM/BantayBot_Camera_ESP32CAM.ino` - WiFi Manager + mDNS + Main Board IP

---

## Troubleshooting

### Board Won't Connect to WiFi

1. **Check credentials** - Make sure SSID and password are correct
2. **Signal strength** - Move board closer to router
3. **5GHz vs 2.4GHz** - ESP32 only supports 2.4GHz WiFi
4. **Reset and try again** - Power cycle and re-enter credentials

### Can't Find Setup Network

1. **Wait 30 seconds** after power-on for board to start AP mode
2. **Check board is powered** - Look for LED indicators
3. **Refresh WiFi list** on your phone/computer
4. **Try different device** - Some devices have trouble with ESP32 APs

### Network Scan Not Finding Devices

1. **Ensure boards are on same network** as your phone
2. **Disable VPN** - VPNs can prevent local network discovery
3. **Check firewall** - Some networks block scanning
4. **Use manual IP entry** - Enter IPs directly instead

### Boards Lost Configuration

This happens if:
- Flash memory was erased
- Firmware was re-uploaded without preserving settings
- Board experienced corruption

**Solution**: Re-run First Time Setup

### App Can't Connect After Configuration

1. **Verify IPs are correct** - Check Serial Monitor for actual IPs
2. **Test connections** - Use "Test Connections" in Settings
3. **Check network** - Ensure phone and boards are on same WiFi
4. **Restart app** - Sometimes app needs restart after config change

---

## Advanced Features

### Persistent Storage

All configuration is stored in ESP32 flash memory using the Preferences library:
- **Main Board**: Namespace `bantaybot`
- **Camera Board**: Namespace `bantaybot-cam`

Settings persist across:
- Power cycles
- Reboots
- Firmware updates (if flash is not erased)

### mDNS Discovery

Both boards broadcast their presence via mDNS:
- `bantaybot-main.local` → Main Board (port 81)
- `bantaybot-camera.local` → Camera Board (port 80)

Benefits:
- No need to remember IP addresses
- Works even if DHCP assigns new IPs
- Easier network troubleshooting

### Configuration Endpoints

**Main Board** (`http://[IP]:81`):
- `/status` - Get sensor data (JSON)
- `/info` - Get board info (WiFi status, IP, hostname, etc.)
- `/reset-config` - Clear stored credentials and restart in setup mode
- `/play?track=N` - Play audio track
- `/volume?level=N` - Set volume
- `/move-arms` - Trigger servo oscillation
- `/stop` - Stop all movement
- `/trigger-alarm` - Trigger bird alarm

**Camera Board** (`http://[IP]:80`):
- `/stream` - View camera stream
- `/cam.mjpeg` - MJPEG stream endpoint
- `/info` - Get board info (WiFi status, IP, hostname, Main Board config)
- `/reset-config` - Clear stored credentials and restart in setup mode
- WebSocket `/ws` - Real-time detection alerts

**New endpoints** (`/info` and `/reset-config`):
- No Serial Monitor needed - get all info via HTTP
- Reset configuration remotely without physical access
- Returns JSON data for easy integration

---

## Developer Notes

### Adding New Configuration Options

To add new configurable settings:

1. **Update ConfigService.js**:
   ```javascript
   this.config = {
     // ... existing config
     newSetting: defaultValue,
   };
   ```

2. **Update SettingsScreen.js**:
   - Add new input field
   - Add to load/save functions

3. **Update Arduino (if needed)**:
   - Add to Preferences storage
   - Add to web configuration form

### Network Discovery Algorithm

The NetworkDiscoveryService uses **smart discovery** with multiple strategies:

**Phase 1: mDNS Discovery** (Fast - 3 seconds)
- Tests `bantaybot-main.local:81` and `bantaybot-camera.local:80`
- If successful, returns immediately (no IP scan needed)
- Works even if DHCP assigns different IPs

**Phase 2: IP Scanning** (Fallback - 30-60 seconds)
- **Quick Scan**: Scans IP ranges 1-50, 100-150, 200-255
- **Full Scan**: Scans entire subnet (1-255)
- **Port Testing**: Tests port 80 (camera) and 81 (main board)
- **Timeout**: 2 seconds per IP
- **Batch Processing**: Scans 10 IPs at a time to avoid network congestion

**Connection Strategy**:
- All services (WebSocket, MainBoard) try mDNS first, then fall back to IP
- Automatic strategy selection based on what works
- No user intervention required

### Security Considerations

- **Default AP Password**: Change `bantaybot123` to something secure
- **No Encryption**: Configuration portal uses plain HTTP
- **Local Network Only**: Setup only works on local WiFi
- **Credentials Storage**: Stored in ESP32 flash (not encrypted)

---

## What's Different from Before?

### Before (Hardcoded)
```cpp
const char* ssid = "Prince";
const char* password = "mamamoblue";
const char* mainBoardIP = "172.24.26.193";
```
❌ Had to edit code for every WiFi change
❌ Had to recompile and upload firmware
❌ Different credentials for different locations
❌ Required Serial Monitor to see IP addresses
❌ IP changes broke everything

### After (Dynamic with mDNS)
```cpp
Preferences preferences;
String wifiSSID = preferences.getString("ssid", "");
String wifiPassword = preferences.getString("password", "");

// mDNS for hostname resolution
MDNS.begin("bantaybot-main");
```
✅ Configure via web browser (no code changes!)
✅ Automatically saves to flash memory
✅ Works with any WiFi network
✅ Automatic fallback to setup mode
✅ **No Serial Monitor needed** - IP shown on success page
✅ **mDNS support** - use hostnames instead of IPs
✅ **Smart fallback** - tries mDNS first, then IP
✅ **Remote reset** - `/reset-config` endpoint

### Backward Compatibility

The new system is **100% backward compatible**:
- Existing IP-based configurations continue to work
- mDNS is optional (can be disabled in Settings)
- All existing endpoints remain unchanged
- Apps update seamlessly without breaking changes

---

## Benefits

1. **No More Code Changes**: Configure everything via UI
2. **Portable**: Works on any WiFi network without modifications
3. **User-Friendly**: Simple web portal for configuration
4. **Automatic Discovery**: App can find devices automatically via smart discovery
5. **Persistent**: Configuration survives power cycles
6. **Fallback Mode**: Auto-enters setup if WiFi fails
7. **mDNS Support with Fallback**: Access via friendly hostnames, automatically falls back to IP
8. **Separate Configuration**: Camera and Main Board configured independently
9. **No Serial Monitor Needed**: IP addresses shown on success page with 30-second display
10. **Remote Management**: Reset configuration via `/reset-config` endpoint
11. **Production Ready**: Designed for deployment inside robot with no physical access needed
12. **Smart Connection**: Tries fastest method first (mDNS) then falls back automatically

---

## Support

For issues or questions:
1. Check Serial Monitor for debug messages
2. Verify all connections with "Test Connections"
3. Try network scan if manual IP entry fails
4. Reset configuration and start fresh if needed

**Serial Monitor Baud Rate**: 115200

---

## Summary

You now have a **production-ready, fully dynamic configuration system** for BantayBot!

**No more hardcoded values** means:
- Easier deployment
- Better user experience
- More flexibility
- Less maintenance

**No more Serial Monitor dependency** means:
- True production readiness
- Deploy inside robot without worry
- Remote configuration and reset
- User-friendly setup experience

**Smart mDNS with fallback** means:
- Reliable connections even when IPs change
- Automatic discovery and fallback
- Fast connection attempts (mDNS first)
- Works on any network configuration

**The system is fully backward compatible** - existing setups continue to work while benefiting from new features!

Enjoy your WiFi-agnostic, production-ready BantayBot! 🤖
