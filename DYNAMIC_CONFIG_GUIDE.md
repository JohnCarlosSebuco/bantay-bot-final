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
✅ **Captive Portal** - Easy setup via phone/computer browser
✅ **Persistent Storage** - Settings saved to ESP32 flash memory
✅ **mDNS Broadcasting** - Access boards via `bantaybot-main.local` and `bantaybot-camera.local`
✅ **Auto-Fallback** - If WiFi fails, automatically switches to setup mode

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
8. The board will restart and connect to your WiFi
9. **Note the IP address** shown in Serial Monitor (e.g., `172.24.26.193`)

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
8. The board will restart and connect to your WiFi
9. **Note the Camera IP address** from Serial Monitor

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

### Accessing Boards via mDNS (Optional)

Instead of remembering IP addresses, you can access boards via hostnames:
- **Main Board**: `http://bantaybot-main.local:81`
- **Camera Board**: `http://bantaybot-camera.local:80`

**Note**: mDNS may not work on all networks. If it doesn't work, use IP addresses.

### Changing WiFi Network

If you need to connect to a different WiFi network:

**Method 1: Use the App**
- Go to Settings
- Change the WiFi credentials in app settings
- The boards will automatically reconnect on next restart

**Method 2: Reset Configuration**
1. Connect to the board via Serial Monitor
2. Power cycle the board while holding the BOOT button
3. The board will clear saved credentials and enter setup mode
4. Follow the First Time Setup steps again

### Network Auto-Discovery

The mobile app can automatically find your BantayBot devices:

1. Open Settings
2. Tap "Scan Network"
3. The app will scan your network (takes ~30-60 seconds)
4. Found devices are automatically filled in
5. Tap "Test Connections" to verify
6. Save settings

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
- `/status` - Get sensor data
- `/play?track=N` - Play audio track
- `/volume?level=N` - Set volume
- `/move-arms` - Trigger servo oscillation
- `/stop` - Stop all movement
- `/trigger-alarm` - Trigger bird alarm

**Camera Board** (`http://[IP]:80`):
- `/stream` - View camera stream
- `/cam.mjpeg` - MJPEG stream endpoint
- WebSocket `/ws` - Real-time detection alerts

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

The NetworkDiscoveryService uses:
- **Quick Scan**: Scans IP ranges 1-50, 100-150, 200-255
- **Full Scan**: Scans entire subnet (1-255)
- **Port Testing**: Tests port 80 (camera) and 81 (main board)
- **Timeout**: 2 seconds per IP

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

### After (Dynamic)
```cpp
Preferences preferences;
String wifiSSID = preferences.getString("ssid", "");
String wifiPassword = preferences.getString("password", "");
```
✅ Configure via web browser (no code changes!)
✅ Automatically saves to flash memory
✅ Works with any WiFi network
✅ Automatic fallback to setup mode

---

## Benefits

1. **No More Code Changes**: Configure everything via UI
2. **Portable**: Works on any WiFi network without modifications
3. **User-Friendly**: Simple web portal for configuration
4. **Automatic Discovery**: App can find devices automatically
5. **Persistent**: Configuration survives power cycles
6. **Fallback Mode**: Auto-enters setup if WiFi fails
7. **mDNS Support**: Access via friendly hostnames
8. **Separate Configuration**: Camera and Main Board configured independently

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

You now have a fully dynamic configuration system for BantayBot! No more hardcoded values means:
- Easier deployment
- Better user experience
- More flexibility
- Less maintenance

Enjoy your WiFi-agnostic BantayBot! 🤖
