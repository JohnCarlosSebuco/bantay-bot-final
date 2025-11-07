# 🚀 BantayBot Integration Guide

## Quick Start - Dashboard Integration

### Step 1: Update DashboardScreen.js Imports

```javascript
// Add these imports at the top
import SoilSensorCard from '../components/SoilSensorCard';
import AudioPlayerControl from '../components/AudioPlayerControl';
import ServoArmControl from '../components/ServoArmControl';
import QuickActionButton from '../components/QuickActionButton';
import StatusIndicator from '../components/StatusIndicator';
import { useI18n, LocaleContext } from '../i18n/i18n';
```

### Step 2: Extract New Sensor Data

```javascript
// In your WebSocket data handler, extract new fields:
const handleData = (data) => {
  setSensorData({
    // Existing fields
    motion: data?.motion || 0,
    temperature: data?.dhtTemperature || 0,
    humidity: data?.dhtHumidity || 0,
    headPosition: data?.headPosition || 0,

    // NEW: RS485 Soil Sensor
    soilHumidity: data?.soilHumidity || 0,
    soilTemperature: data?.soilTemperature || 0,
    soilConductivity: data?.soilConductivity || 0,
    ph: data?.ph || 7.0,

    // NEW: Audio State
    currentTrack: data?.currentTrack || 1,
    volume: data?.volume || 20,
    audioPlaying: data?.audioPlaying || false,

    // NEW: Servo State
    leftArmAngle: data?.leftArmAngle || 90,
    rightArmAngle: data?.rightArmAngle || 90,
    oscillating: data?.oscillating || false,

    // Existing bird detection
    birdDetectionEnabled: data?.birdDetectionEnabled || true,
    birdsDetectedToday: data?.birdsDetectedToday || 0,
    detectionSensitivity: data?.detectionSensitivity || 2,

    // NEW: Hardware capabilities
    hasDFPlayer: data?.hasDFPlayer || false,
    hasRS485Sensor: data?.hasRS485Sensor || false,
    hasServos: data?.hasServos || false,
  });
};
```

### Step 3: Add New WebSocket Commands

```javascript
// Audio commands
const playTrack = (track) => {
  WebSocketService.send({
    command: 'PLAY_TRACK',
    value: track
  });
};

const stopAudio = () => {
  WebSocketService.send({
    command: 'STOP_AUDIO'
  });
};

const nextTrack = () => {
  WebSocketService.send({
    command: 'NEXT_TRACK'
  });
};

const setVolume = (vol) => {
  WebSocketService.send({
    command: 'SET_VOLUME',
    value: vol
  });
};

// Servo commands
const setServoAngle = (servo, angle) => {
  WebSocketService.send({
    command: 'SET_SERVO_ANGLE',
    servo: servo,  // 0 or 1
    value: angle
  });
};

const toggleServoOscillation = () => {
  WebSocketService.send({
    command: 'TOGGLE_SERVO_OSCILLATION'
  });
};
```

### Step 4: Replace Dashboard UI

```javascript
// Get translation function
const { t } = useI18n();
const { lang } = React.useContext(LocaleContext);

return (
  <ScrollView style={styles.container}>
    {/* Header - keep existing gradient header */}
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
      {/* ... existing header code ... */}
    </LinearGradient>

    <View style={styles.content}>
      {/* Camera View - keep existing */}
      <View style={styles.streamCard}>
        {/* ... existing camera code ... */}
      </View>

      {/* NEW: Soil Sensor Card */}
      {sensorData.hasRS485Sensor && (
        <SoilSensorCard
          humidity={sensorData.soilHumidity}
          temperature={sensorData.soilTemperature}
          conductivity={sensorData.soilConductivity}
          ph={sensorData.ph}
          lang={lang}
        />
      )}

      {/* Bird Detection Status */}
      <View style={styles.birdSection}>
        <StatusIndicator
          status={sensorData.birdDetectionEnabled ? 'good' : 'warning'}
          label={t('bird_detection')}
          value={`${sensorData.birdsDetectedToday} ${t('detections')}`}
          icon="🐦"
          lang={lang}
        />
      </View>

      {/* NEW: Audio Control */}
      {sensorData.hasDFPlayer && (
        <AudioPlayerControl
          currentTrack={sensorData.currentTrack}
          totalTracks={7}
          volume={sensorData.volume}
          audioPlaying={sensorData.audioPlaying}
          onPlay={() => playTrack(sensorData.currentTrack)}
          onStop={stopAudio}
          onNext={nextTrack}
          onVolumeChange={setVolume}
          lang={lang}
        />
      )}

      {/* NEW: Servo Arm Control */}
      {sensorData.hasServos && (
        <ServoArmControl
          leftArmAngle={sensorData.leftArmAngle}
          rightArmAngle={sensorData.rightArmAngle}
          oscillating={sensorData.oscillating}
          onLeftChange={(angle) => setServoAngle(0, angle)}
          onRightChange={(angle) => setServoAngle(1, angle)}
          onToggleOscillation={toggleServoOscillation}
          lang={lang}
        />
      )}

      {/* Head Direction Control - enhanced */}
      <View style={styles.headSection}>
        <Text style={styles.sectionTitle}>{t('head_direction')}</Text>
        <View style={styles.headControls}>
          <QuickActionButton
            icon="⬅️"
            label={t('turn_left')}
            color="#667eea"
            onPress={() => sendCommand('ROTATE_HEAD_LEFT', 90)}
            size="medium"
            style={{ flex: 1, marginRight: 10 }}
          />
          <QuickActionButton
            icon="⏺️"
            label={t('center')}
            color="#51CF66"
            onPress={() => sendCommand('ROTATE_HEAD_CENTER', 0)}
            size="medium"
            style={{ flex: 1, marginHorizontal: 5 }}
          />
          <QuickActionButton
            icon="➡️"
            label={t('turn_right')}
            color="#667eea"
            onPress={() => sendCommand('ROTATE_HEAD_RIGHT', -90)}
            size="medium"
            style={{ flex: 1, marginLeft: 10 }}
          />
        </View>
        <Text style={styles.positionText}>
          {t('current_position')}: {sensorData.headPosition}°
        </Text>
      </View>

      {/* Emergency Actions */}
      <View style={styles.emergencySection}>
        <Text style={styles.emergencyTitle}>{t('emergency_actions')}</Text>
        <View style={styles.emergencyButtons}>
          <QuickActionButton
            icon="📢"
            label={t('scare_birds')}
            sublabel={t('scare_sublabel')}
            color="#FF6B6B"
            onPress={() => sendCommand('SOUND_ALARM')}
            size="large"
            style={{ flex: 1, marginRight: 10 }}
          />
          <QuickActionButton
            icon="🔄"
            label={t('restart')}
            sublabel={t('restart_sublabel')}
            color="#fa709a"
            onPress={() => sendCommand('RESET_SYSTEM')}
            size="large"
            style={{ flex: 1, marginLeft: 10 }}
          />
        </View>
      </View>
    </View>
  </ScrollView>
);
```

### Step 5: Add New Styles

```javascript
const styles = StyleSheet.create({
  // ... keep existing styles ...

  // New styles
  birdSection: {
    marginBottom: 15,
  },
  headSection: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
  },
  headControls: {
    flexDirection: 'row',
    marginVertical: 15,
  },
  positionText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  emergencySection: {
    marginVertical: 20,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 15,
    textAlign: 'center',
  },
  emergencyButtons: {
    flexDirection: 'row',
  },
});
```

---

## Hardware Setup Instructions

### Arduino Libraries to Install

```bash
# Via Arduino Library Manager:
1. DFRobotDFPlayerMini (by DFRobot)
2. Adafruit PWM Servo Driver Library (by Adafruit)
3. Wire (built-in)
4. esp_camera (built-in for ESP32-CAM)
5. WiFi (built-in)
6. ESPAsyncWebServer (by me-no-dev)
7. AsyncTCP (by me-no-dev)
8. ArduinoJson (by Benoit Blanchon v6.x)
9. AccelStepper (by Mike McCauley)
10. DHT sensor library (by Adafruit)
```

### Wiring Diagram

```
ESP32-CAM Connections:
=====================

DFPlayer Mini (MP3 Audio):
  ESP32 GPIO 27 → DFPlayer RX
  ESP32 GPIO 26 → DFPlayer TX
  VCC → 5V
  GND → GND

RS485 Soil Sensor:
  ESP32 GPIO 17 → RS485 RX (via MAX485)
  ESP32 GPIO 16 → RS485 TX (via MAX485)
  ESP32 GPIO 4  → RS485 RE/DE
  A/B → Sensor A/B terminals
  VCC → 5V (or 12V depending on sensor)
  GND → GND

PCA9685 Servo Controller:
  ESP32 GPIO 21 → PCA9685 SDA
  ESP32 GPIO 22 → PCA9685 SCL
  VCC → 5V
  GND → GND
  V+ → External 5V power for servos

  Servo 1 → Channel 0
  Servo 2 → Channel 1

Stepper Motor (via TMC2225 or A4988):
  ESP32 GPIO 13 → STEP
  ESP32 GPIO 15 → DIR
  ESP32 GPIO 14 → EN
  VMOT → 12V
  GND → GND

DHT22 (Backup Sensor):
  ESP32 GPIO 2 → DATA (with 10kΩ pull-up to 3.3V)
  VCC → 3.3V
  GND → GND

Speaker/Horn:
  ESP32 GPIO 12 → Relay IN
  Relay COM → 12V+
  Relay NO → Speaker +
  Speaker - → 12V GND

Power:
  ESP32-CAM: 5V 2A minimum
  Servos: External 5V 3A (via PCA9685 V+)
  Stepper: 12V 2A
  Total recommended: 12V 5A power supply
```

### WiFi Configuration

```cpp
// In BantayBotUnified.ino, update these lines:
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";
```

---

## Testing Checklist

### Phase 1: Hardware Detection
- [ ] Upload BantayBotUnified.ino to ESP32-CAM
- [ ] Open Serial Monitor (115200 baud)
- [ ] Verify WiFi connection
- [ ] Check hardware detection messages:
  ```
  ✅ DFPlayer Mini initialized
  ✅ RS485 soil sensor initialized
  ✅ PCA9685 servos initialized
  ✅ Stepper motor initialized
  ✅ DHT22 sensor initialized
  ✅ Bird detection initialized
  ```
- [ ] Note the IP address displayed

### Phase 2: Mobile App Connection
- [ ] Update `src/config/config.js` with ESP32 IP
- [ ] Run `npm start`
- [ ] Open Expo Go and scan QR code
- [ ] Verify WebSocket connection (🟢 Nakakonekta)
- [ ] Check all sensor data is updating

### Phase 3: Component Testing
- [ ] **Soil Sensor Card**
  - Humidity reading displays
  - Temperature reading displays
  - Conductivity reading displays
  - pH reading displays
  - Color coding works (green/yellow/red)
  - Progress bars animate correctly

- [ ] **Audio Player Control**
  - Can play tracks 1,2,4,5,6,7
  - Track 3 is skipped
  - Volume slider works (0-30)
  - Play/Stop/Next buttons functional
  - Status indicator updates

- [ ] **Servo Arm Control**
  - Left arm slider moves servo (0-180°)
  - Right arm slider moves servo (0-180°)
  - Visual representation updates
  - Oscillation toggle works
  - Preset buttons function

- [ ] **Head Direction**
  - Turn left rotates head
  - Turn right rotates head
  - Center button returns to 0°
  - Position indicator updates

- [ ] **Emergency Actions**
  - Scare button triggers alarm/audio
  - Restart button resets ESP32

### Phase 4: Language Testing
- [ ] Switch to Tagalog in settings
- [ ] Verify all labels are in Tagalog
- [ ] Switch to English
- [ ] Verify all labels are in English
- [ ] Check both languages on all screens

### Phase 5: Bird Detection
- [ ] Enable detection toggle
- [ ] Trigger motion (wave hand in front of camera)
- [ ] Verify:
  - Audio plays
  - Servos oscillate (if available)
  - Head rotates
  - Bird count increments
  - Alert notification appears

---

## Troubleshooting

### DFPlayer Not Working
```cpp
// Check Serial Monitor for:
"⚠️ DFPlayer Mini not found - using speaker relay"

// Solution:
1. Verify RX/TX connections (swap if needed)
2. Ensure DFPlayer has SD card with MP3 files in /mp3/ folder
3. Files named: 0001.mp3, 0002.mp3, etc.
4. Check 5V power to DFPlayer
```

### RS485 Sensor Not Reading
```cpp
// Check Serial Monitor for:
"⚠️ RS485 sensor not found - using analog sensor"

// Solution:
1. Verify A/B terminal connections
2. Check RE pin is connected to GPIO 4
3. Ensure correct baud rate (4800)
4. Test with multimeter for 5V/12V power
5. Try swapping A and B terminals
```

### Servos Not Moving
```cpp
// Check:
1. PCA9685 I2C address (default 0x40)
2. External 5V power connected to V+ terminal
3. Common ground between ESP32 and servo power
4. Servo channels 0 and 1
```

### WebSocket Not Connecting
```javascript
// Check:
1. ESP32 IP address in config.js matches Serial Monitor
2. Both devices on same WiFi network
3. Firewall not blocking port 80
4. ESP32 WiFi connected (check Serial Monitor)
```

---

## Performance Optimization

### For Slow Networks:
```javascript
// In src/config/config.js
UPDATE_INTERVAL: 3000,  // Increase to 3 seconds
```

### For Limited Memory:
```cpp
// In BantayBotUnified.ino
// Reduce camera resolution
config.frame_size = FRAMESIZE_96X96;
```

### For Better Detection:
```cpp
// Adjust detection sensitivity
detectionSensitivity = 3;  // High sensitivity
updateDetectionSensitivity();
```

---

## Next Steps

1. **Complete Dashboard Integration**
   - Follow Step 1-5 above
   - Test all components
   - Verify WebSocket commands

2. **Update README.md**
   - Add Filipino farmer guide
   - Include wiring diagrams
   - Add troubleshooting section

3. **Test with Real Hardware**
   - Assemble all components
   - Calibrate sensors
   - Test in field conditions

4. **Deploy to Production**
   - Build APK for Android
   - Create user guide video (Tagalog)
   - Prepare training materials for farmers

---

## Support & Resources

- **Arduino Code**: `BantayBotUnified.ino`
- **Components**: `src/components/*.js`
- **Translations**: `src/i18n/i18n.js`
- **Config**: `src/config/config.js`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

**Ready to build a farmer-first experience! 🌾🇵🇭**
