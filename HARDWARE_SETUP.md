# 🔌 BantayBot Hardware Setup Guide

## 📋 Complete Bill of Materials

### Core Components
| Component | Quantity | Purpose | Estimated Cost (PHP) |
|-----------|----------|---------|---------------------|
| ESP32-CAM (AI Thinker) | 1 | Main controller + camera | ₱300-400 |
| DFPlayer Mini | 1 | MP3 audio playback | ₱150-200 |
| RS485 Soil Sensor (4-in-1) | 1 | Soil monitoring | ₱800-1200 |
| MAX485 Module | 1 | RS485 to TTL converter | ₱50-80 |
| PCA9685 (16-channel PWM) | 1 | Servo controller | ₱200-300 |
| TMC2225 Stepper Driver | 1 | Silent stepper control | ₱250-350 |
| NEMA 17 Stepper Motor | 1 | Head rotation | ₱400-600 |
| SG90 Micro Servos | 2 | Arm movement | ₱100-150 each |
| DHT22 Sensor | 1 | Backup temp/humidity | ₱150-200 |
| 5V Relay Module | 1 | Speaker control | ₱50-80 |
| MicroSD Card (8GB+) | 1 | Audio storage + camera | ₱200-300 |

### Power Supply
| Component | Quantity | Purpose | Estimated Cost (PHP) |
|-----------|----------|---------|---------------------|
| 12V 5A Power Adapter | 1 | Main power source | ₱400-600 |
| LM2596 Buck Converter (12V→5V) | 1 | ESP32 power regulation | ₱80-120 |
| Electrolytic Capacitor 1000µF 25V | 2 | Power stabilization | ₱20-30 each |

### Audio & Mechanics
| Component | Quantity | Purpose | Estimated Cost (PHP) |
|-----------|----------|---------|---------------------|
| 3W 4Ω Speaker/Horn | 1 | Bird deterrent sound | ₱150-250 |
| Plastic Enclosure (20x15x10cm) | 1 | Weather protection | ₱300-500 |
| Jumper Wires (M-F, M-M) | 1 set | Connections | ₱100-150 |
| Breadboard (optional, testing) | 1 | Prototyping | ₱150-200 |

**Total Estimated Cost: ₱4,500 - ₱6,500 PHP**

---

## 🔧 Detailed Wiring Diagram

### ESP32-CAM Pin Mapping

```
ESP32-CAM (AI Thinker Module)
================================
Camera Pins (Built-in, no wiring needed):
- XCLK, PCLK, VSYNC, HREF, D0-D7 (internal)

Available GPIO Pins for Peripherals:
GPIO 2  - DHT22 Data Pin (with 10kΩ pull-up to 3.3V)
GPIO 4  - RS485 RE/DE Control
GPIO 12 - Speaker Relay Control
GPIO 13 - Stepper STEP
GPIO 14 - Stepper EN (Enable)
GPIO 15 - Stepper DIR (Direction)
GPIO 16 - RS485 TX (Serial2)
GPIO 17 - RS485 RX (Serial2)
GPIO 21 - I2C SDA (PCA9685)
GPIO 22 - I2C SCL (PCA9685)
GPIO 26 - DFPlayer TX
GPIO 27 - DFPlayer RX

Power Pins:
5V   - Power input (from buck converter)
3.3V - Logic power output (for sensors)
GND  - Common ground
```

---

## 📐 Component-by-Component Wiring

### 1. DFPlayer Mini (Audio Module)

```
DFPlayer Mini Pinout:
┌─────────────────┐
│  1  2  3  4  5  │
│ VCC RX TX DAC_R │
│                 │
│ DAC_L GND IO2   │
│  8  7  6  ...   │
└─────────────────┘

Connections:
DFPlayer Pin 1 (VCC)   → 5V (from buck converter)
DFPlayer Pin 2 (RX)    → ESP32 GPIO 27
DFPlayer Pin 3 (TX)    → ESP32 GPIO 26
DFPlayer Pin 4 (DAC_R) → Speaker + (or relay input)
DFPlayer Pin 7 (GND)   → GND
DFPlayer Pin 8 (DAC_L) → (optional for stereo)

MicroSD Card:
- Format: FAT32
- Folder: /mp3/
- Files: 0001.mp3, 0002.mp3, 0004.mp3, 0005.mp3, 0006.mp3, 0007.mp3
- Note: Track 3 (0003.mp3) is skipped in code
```

**Important Notes:**
- Use 1kΩ resistor in series with RX/TX lines (recommended but optional)
- Ensure SD card is properly inserted before powering on
- Speaker impedance should be 4Ω-8Ω, power rating 2W-5W

---

### 2. RS485 Soil Sensor (via MAX485)

```
MAX485 Module:
┌────────────┐
│ VCC  A  RO │  RO = Receiver Output (to ESP32 RX)
│ GND  B  RE │  RE = Receiver Enable (to ESP32 GPIO 4)
│ DE  DI  TX │  DI = Driver Input (to ESP32 TX)
└────────────┘  DE = Driver Enable (to ESP32 GPIO 4, tied with RE)

Connections:
MAX485 VCC → 5V
MAX485 GND → GND
MAX485 RO  → ESP32 GPIO 17 (RX)
MAX485 DI  → ESP32 GPIO 16 (TX)
MAX485 RE  → ESP32 GPIO 4
MAX485 DE  → ESP32 GPIO 4 (same as RE)
MAX485 A   → Soil Sensor A terminal
MAX485 B   → Soil Sensor B terminal

RS485 Soil Sensor:
Red Wire    → 5V or 12V (check sensor spec, usually 5-12V DC)
Black Wire  → GND
Yellow (A)  → MAX485 A
Blue (B)    → MAX485 B

Sensor Installation:
- Insert probe 10-15cm into soil
- Keep electronics module above ground (waterproof enclosure)
- Avoid direct contact with fertilizer
```

**Important Notes:**
- Sensor address is 0x01 (factory default)
- Baud rate: 4800 bps (configured in code)
- RE and DE pins MUST be tied together
- Test with multimeter: A and B should have ~120Ω impedance

---

### 3. PCA9685 Servo Controller

```
PCA9685 Module:
┌──────────────────────────────┐
│ VCC SCL SDA OE GND V+        │  V+ = External servo power (5V 3A)
│                               │  VCC = Logic power (3.3V or 5V)
│ [PWM Channels 0-15]           │
│  S G V  S G V  ...            │  S = Signal, G = GND, V = V+
└──────────────────────────────┘

Connections:
PCA9685 VCC → 3.3V (ESP32 logic level)
PCA9685 GND → GND (common ground)
PCA9685 SCL → ESP32 GPIO 22
PCA9685 SDA → ESP32 GPIO 21
PCA9685 V+  → 5V 3A (external servo power supply)
PCA9685 OE  → GND (output always enabled)

Servo Connections:
Channel 0 (Left Arm):
  S → PCA9685 Channel 0 Signal
  G → PCA9685 GND
  V → PCA9685 V+

Channel 1 (Right Arm):
  S → PCA9685 Channel 1 Signal
  G → PCA9685 GND
  V → PCA9685 V+
```

**Important Notes:**
- PCA9685 I2C address: 0x40 (default)
- External 5V power MUST be 3A+ for dual servos
- Common ground between ESP32 and servo power is MANDATORY
- Servo frequency: 50Hz (configured in code)

---

### 4. TMC2225 Stepper Driver + NEMA 17

```
TMC2225 Pinout:
┌─────────────────┐
│ EN DIR STEP GND │  Top row (control)
│                 │
│ VM GND B2 B1    │  Bottom row (power + motor)
│ A1 A2 VIO       │
└─────────────────┘

Connections:
TMC2225 EN   → ESP32 GPIO 14
TMC2225 DIR  → ESP32 GPIO 15
TMC2225 STEP → ESP32 GPIO 13
TMC2225 GND  → GND (both GND pins)
TMC2225 VM   → 12V (motor power)
TMC2225 VIO  → 3.3V (logic voltage)
TMC2225 A1   → NEMA 17 coil A1
TMC2225 A2   → NEMA 17 coil A2
TMC2225 B1   → NEMA 17 coil B1
TMC2225 B2   → NEMA 17 coil B2

NEMA 17 Stepper Motor (4-wire):
Black  → TMC2225 A1
Green  → TMC2225 A2
Red    → TMC2225 B1
Blue   → TMC2225 B2
```

**Important Notes:**
- TMC2225 microstepping: 1/16 (default, configured via UART if needed)
- Motor current limit: 0.4-1.0A (adjust via potentiometer on driver)
- Enable pin is active LOW (LOW = motor enabled)
- Add 100µF capacitor between VM and GND for stability

---

### 5. DHT22 Sensor (Backup)

```
DHT22 Pinout:
┌───────┐
│ 1 2 3 4│
│ V D - G│
└───────┘

Pin 1 (VCC)  → 3.3V
Pin 2 (DATA) → ESP32 GPIO 2 (with 10kΩ pull-up resistor to 3.3V)
Pin 3 (NC)   → Not connected
Pin 4 (GND)  → GND

Pull-up Resistor:
10kΩ resistor between DATA (Pin 2) and VCC (3.3V)
```

---

### 6. 5V Relay Module (Speaker Control)

```
Relay Module:
┌────────────────┐
│ VCC GND IN     │  Control side
│                │
│ COM NO NC      │  Switch side
└────────────────┘

Control Connections:
Relay VCC → 5V
Relay GND → GND
Relay IN  → ESP32 GPIO 12

Speaker Connections:
12V+ → Relay COM (common)
Relay NO (normally open) → Speaker +
Speaker - → 12V GND
```

**Important Notes:**
- Relay is active LOW (LOW = relay ON)
- Use relay for high-power speakers (>2W)
- For low-power speakers, connect DFPlayer DAC directly

---

## 🔋 Power Distribution Diagram

```
Main 12V 5A Power Supply
         |
         ├─→ TMC2225 VM (12V for stepper motor)
         |
         ├─→ Relay COM (12V for speaker)
         |
         ├─→ LM2596 Buck Converter Input
         |       |
         |       └─→ 5V Output (regulated)
         |               |
         |               ├─→ ESP32-CAM 5V
         |               ├─→ DFPlayer VCC
         |               ├─→ MAX485 VCC
         |               ├─→ PCA9685 V+ (servo power, requires 3A)
         |               └─→ RS485 Sensor (if 5V model)
         |
         └─→ GND (common ground for ALL components)

Capacitors (for stability):
- 1000µF across 12V input (before buck converter)
- 1000µF across 5V output (after buck converter)
- 100µF across TMC2225 VM and GND
```

**Critical Power Notes:**
- **Common Ground**: ALL components MUST share the same ground
- **ESP32-CAM**: Requires stable 5V 2A minimum (camera draws significant current)
- **Servos**: PCA9685 V+ MUST be 5V 3A (two servos under load = 2A+)
- **Buck Converter**: Use high-quality LM2596 (cheap ones overheat)
- **Wire Gauge**: Use 20-22 AWG for power lines, 24-26 AWG for signals

---

## 🏗️ Assembly Steps

### Step 1: Power Supply Setup (Do This First!)
1. Connect 12V power supply to breadboard power rails
2. Install LM2596 buck converter, adjust output to exactly 5.0V (use multimeter)
3. Add 1000µF capacitors across 12V and 5V rails
4. Test power stability with multimeter before connecting any modules

### Step 2: ESP32-CAM Setup
1. Connect ESP32-CAM to 5V and GND
2. Upload BantayBotUnified.ino:
   - Bridge GPIO 0 to GND (programming mode)
   - Use FTDI adapter or USB-to-TTL (5V, RX→TX, TX→RX)
   - Select board: AI Thinker ESP32-CAM
   - Upload speed: 115200
   - Remove GPIO 0 bridge after upload
3. Update WiFi credentials in code (lines 19-20)
4. Open Serial Monitor (115200 baud) to verify boot

### Step 3: I2C Devices (PCA9685)
1. Connect PCA9685 to ESP32: SDA→21, SCL→22, VCC→3.3V, GND→GND
2. Connect external 5V 3A to V+ terminal
3. Test I2C: Serial Monitor should show "✅ PCA9685 initialized"
4. Connect servos to channels 0 and 1

### Step 4: Serial Devices (DFPlayer, RS485)
1. **DFPlayer**: RX→27, TX→26, VCC→5V, GND→GND
   - Insert MicroSD with MP3 files
   - Test: Serial Monitor should show "✅ DFPlayer initialized"
2. **RS485**: Connect MAX485, then soil sensor
   - RE/DE→4, RO→17, DI→16
   - Test: Serial Monitor should show sensor readings

### Step 5: Stepper Motor
1. Connect TMC2225 to ESP32: STEP→13, DIR→15, EN→14
2. Connect motor coils (refer to motor datasheet for coil pairing)
3. Adjust current limit potentiometer (0.4A for NEMA 17)
4. Test rotation via mobile app

### Step 6: Sensors and Relay
1. Connect DHT22 with 10kΩ pull-up resistor
2. Connect relay module to GPIO 12
3. Connect speaker to relay NO terminal

### Step 7: Final Assembly
1. Secure all components in enclosure
2. Cable management (use zip ties, keep power and signal wires separated)
3. Drill holes for camera, speaker, sensors
4. Weatherproofing: silicone sealant around openings
5. Mount on pole/post in field

---

## 🧪 Hardware Testing Procedure

### Power Test
```bash
1. Measure 12V rail: Should be 11.5-12.5V
2. Measure 5V rail: Should be 4.9-5.1V (critical!)
3. Measure 3.3V from ESP32: Should be 3.2-3.4V
4. Check current draw with multimeter:
   - Idle (no servos): ~500mA
   - With camera streaming: ~800mA
   - With servos moving: ~2.5A
```

### Serial Monitor Boot Sequence
```
Expected output (115200 baud):
====================================
    BantayBot Unified System
    Hardware Auto-Detection
====================================

🔍 Detecting hardware...
✅ DFPlayer Mini initialized
✅ RS485 soil sensor initialized
✅ PCA9685 servos initialized
✅ Stepper motor initialized
✅ DHT22 sensor initialized
✅ Bird detection initialized

📡 Connecting to WiFi: YourSSID
✅ WiFi connected
📍 IP Address: 192.168.1.100
🌐 WebSocket server started on ws://192.168.1.100/ws
📹 Camera server started on http://192.168.1.100
```

### Component Tests
1. **DFPlayer**: Send `{"command":"PLAY_TRACK","value":1}` via WebSocket → Should play track 1
2. **RS485 Sensor**: Check Serial Monitor for soil readings every 5 seconds
3. **Servos**: Send `{"command":"SET_SERVO_ANGLE","servo":0,"value":90}` → Left arm moves to 90°
4. **Stepper**: Send `{"command":"ROTATE_HEAD_LEFT","value":90}` → Head rotates left
5. **Relay**: Send `{"command":"SOUND_ALARM"}` → Speaker activates

---

## 🛠️ Troubleshooting Guide

### ESP32-CAM Won't Boot
- **Symptom**: Serial Monitor shows gibberish or no output
- **Fix**: Check 5V power supply (MUST be 2A+), try lower baud rate (9600)

### DFPlayer No Sound
- **Symptom**: "⚠️ DFPlayer Mini not found"
- **Fix**:
  1. Swap RX/TX connections
  2. Check SD card format (FAT32)
  3. Verify files are in /mp3/ folder named 0001.mp3, 0002.mp3, etc.
  4. Test with 1kΩ resistors in series with RX/TX

### RS485 Sensor Not Reading
- **Symptom**: All sensor values show 0 or 65535
- **Fix**:
  1. Swap A and B terminals
  2. Check RE/DE connection to GPIO 4
  3. Verify 5V/12V power to sensor
  4. Test baud rate (should be 4800)
  5. Use USB-to-RS485 adapter to test sensor directly

### Servos Jittering
- **Symptom**: Servos shake or don't hold position
- **Fix**:
  1. Increase external power supply to 5V 3A
  2. Add 1000µF capacitor across V+ and GND
  3. Check common ground connection
  4. Reduce servo load (shorter arms)

### Stepper Motor Not Turning
- **Symptom**: Motor hums but doesn't rotate
- **Fix**:
  1. Adjust current limit on TMC2225
  2. Verify coil wiring (A1/A2, B1/B2 pairing)
  3. Check EN pin is LOW (enabled)
  4. Reduce acceleration in code

### WiFi Won't Connect
- **Symptom**: Stuck on "Connecting to WiFi..."
- **Fix**:
  1. Check SSID/password spelling
  2. Verify 2.4GHz network (ESP32 doesn't support 5GHz)
  3. Move closer to router
  4. Check for WiFi channel congestion

---

## 📦 Field Installation Tips

### Location Selection
- **Sun exposure**: Face camera east for morning light (better detection)
- **Height**: Mount 1.5-2 meters above ground for optimal coverage
- **Power**: Plan for 220V AC outlet or solar panel + battery
- **Network**: Ensure WiFi signal strength >-70dBm

### Weatherproofing Checklist
- [ ] IP65 enclosure minimum
- [ ] Silicone seal all cable entries
- [ ] Camera lens: add clear acrylic cover
- [ ] Speaker: waterproof horn or grill
- [ ] Soil sensor: only probe in ground, electronics in enclosure
- [ ] Ventilation: add small vent with mesh (prevent overheating)

### Maintenance Schedule
- **Daily**: Check camera view via mobile app
- **Weekly**: Clean camera lens, check bird count
- **Monthly**: Test all servos, verify sensor calibration
- **Quarterly**: Reboot system, update firmware if available
- **Yearly**: Replace SD card, check all cable connections

---

## 🌾 Optimization for Filipino Climate

### Rainy Season Adjustments
- Raise soil humidity threshold to 75% (very wet is normal)
- Increase speaker volume (rain noise interference)
- Add rain sensor to pause detection during heavy rain

### Hot Season Adjustments
- Add cooling fan to enclosure (powered by 5V rail)
- Lower temperature thresholds (35°C is danger for most crops)
- Increase watering reminders via mobile app

### Typhoon Preparation
- Remove servos and secure them indoors
- Seal all openings with waterproof tape
- Disconnect power (lightning protection)
- Lower mounting pole if possible

---

## 📞 Support & Resources

**Hardware Suppliers (Philippines):**
- e-Gizmo: ESP32-CAM, sensors, modules
- CircuitRocks: Stepper drivers, power supplies
- TechShop PH: Servos, cables, enclosures

**Online Communities:**
- ESP32 Philippines Facebook Group
- Philippine Robotics Society
- Magsasaka Tech (farmer tech group)

**Component Datasheets:**
- ESP32-CAM: https://github.com/raphaelbs/esp32-cam-ai-thinker
- DFPlayer Mini: https://wiki.dfrobot.com/DFPlayer_Mini_SKU_DFR0299
- PCA9685: https://www.nxp.com/docs/en/data-sheet/PCA9685.pdf
- TMC2225: https://www.trinamic.com/products/integrated-circuits/details/tmc2225/

---

**System Status: ✅ READY FOR ASSEMBLY! 🛠️🇵🇭**
