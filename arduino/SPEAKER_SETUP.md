# BantayBot Speaker Alarm Integration

## Overview
This feature integrates a DFPlayer Mini MP3 module with speaker to provide audio alarm capabilities for the BantayBot security system. When motion is detected, the system can automatically play alarm sounds through the connected speaker.

## Hardware Requirements

### Components Needed:
1. **ESP32 Development Board**
2. **DFPlayer Mini MP3 Module**
3. **Speaker** (3W - 8W recommended)
4. **MicroSD Card** (formatted as FAT32)
5. **PIR Motion Sensor** (HC-SR501 or similar)
6. **Connecting wires**
7. **1kΩ Resistor** (for TX line)

### Pin Connections:

#### DFPlayer Mini to ESP32:
- VCC → 5V
- GND → GND
- RX → GPIO 26 (through 1kΩ resistor)
- TX → GPIO 27
- SPK+ → Speaker positive
- SPK- → Speaker negative

#### PIR Sensor:
- VCC → 5V
- GND → GND
- OUT → GPIO 14

#### Other Sensors (if using):
- Ultrasonic TRIG → GPIO 5
- Ultrasonic ECHO → GPIO 18
- Buzzer → GPIO 4 (optional backup)
- Servo 1 → GPIO 13
- Servo 2 → GPIO 12

## Software Setup

### 1. Prepare the MicroSD Card

1. Format the MicroSD card as FAT32
2. Create a folder named `01` in the root directory
3. Add your alarm sound files:
   - Name them as: `001.mp3`, `002.mp3`, `003.mp3`
   - Maximum 3 tracks supported (can be modified in code)
   - Recommended: Short alarm sounds (5-30 seconds)

### 2. Arduino IDE Setup

1. Install required libraries:
   ```
   - WiFi (built-in)
   - WebSocketsServer by Markus Sattler
   - ArduinoJson by Benoit Blanchon
   - ESP32Servo by Kevin Harrington
   - DFRobotDFPlayerMini by DFRobot
   ```

2. Configure WiFi credentials in the Arduino code:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```

3. Upload the `BantayBot_Speaker.ino` file to your ESP32

### 3. Mobile App Configuration

The mobile app has been updated with new speaker controls:

1. **Dashboard** - Shows speaker alarm status
   - Current playback status (PLAYING/IDLE)
   - Auto-mode status (ENABLED/DISABLED)

2. **Controls Screen** - New speaker control section
   - Start/Stop Speaker Alarm
   - Enable/Disable Auto-mode
   - Switch between tracks
   - Volume controls (if needed)

## Features

### Automatic Motion Detection
- Speaker alarm triggers automatically when motion is detected
- 30-second playback duration by default
- Cycles through available tracks for variety

### Manual Control
- Start/stop alarm manually from the app
- Enable/disable automatic triggering
- Switch between different alarm sounds

### WebSocket Commands

The system responds to these commands:

| Command | Description |
|---------|-------------|
| `START_SPEAKER_ALARM` | Manually start the speaker alarm |
| `STOP_SPEAKER_ALARM` | Stop the speaker alarm |
| `ENABLE_SPEAKER_ALARM` | Enable automatic alarm on motion |
| `DISABLE_SPEAKER_ALARM` | Disable automatic alarm |
| `NEXT_TRACK` | Switch to next alarm sound |
| `SET_VOLUME_LOW` | Set volume to low (10/30) |
| `SET_VOLUME_MEDIUM` | Set volume to medium (20/30) |
| `SET_VOLUME_HIGH` | Set volume to high (30/30) |

## Testing

### 1. Hardware Test
1. Power on the ESP32
2. Check serial monitor for "DFPlayer Mini online" message
3. Verify WiFi connection established

### 2. Speaker Test
1. Open the mobile app
2. Navigate to Controls screen
3. Press "Start Speaker" button
4. Verify sound plays through speaker

### 3. Motion Detection Test
1. Ensure auto-mode is enabled
2. Trigger the PIR sensor with movement
3. Verify speaker alarm activates automatically
4. Check that alarm stops after 30 seconds

## Troubleshooting

### No Sound Output
- Check speaker connections
- Verify MicroSD card is formatted as FAT32
- Ensure MP3 files are in `/01/` folder
- Check DFPlayer module LED (should blink when playing)

### DFPlayer Not Detected
- Check wiring (especially TX/RX connections)
- Add 1kΩ resistor on TX line
- Verify 5V power supply
- Try swapping TX/RX pins

### Motion Detection Issues
- Adjust PIR sensor sensitivity
- Check PIR sensor power (needs 5V)
- Verify GPIO 14 connection
- Allow 30-60 seconds warmup time for PIR

### WebSocket Connection Failed
- Verify WiFi credentials
- Check ESP32 IP address in serial monitor
- Ensure mobile device is on same network
- Update ESP32 IP in mobile app config if needed

## Customization

### Change Playback Duration
Edit in Arduino code:
```cpp
const unsigned long playDuration = 30000; // milliseconds
```

### Add More Tracks
1. Add more MP3 files (004.mp3, 005.mp3, etc.)
2. Update in Arduino code:
```cpp
const int totalTracks = 5; // Update number
```

### Adjust Default Volume
```cpp
player.volume(25); // Range: 0-30
```

## Safety Notes
- Use appropriate speaker wattage for DFPlayer Mini (3W-8W)
- Ensure proper power supply (5V, minimum 1A)
- Avoid playing at maximum volume continuously
- Keep speaker away from moisture

## Support
For issues or questions, refer to the main BantayBot documentation or create an issue in the project repository.