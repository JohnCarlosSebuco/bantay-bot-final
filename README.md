# 🤖 BantayBot - Smart Crop Protection System
## 🌾 Sistema ng Pangprotekta sa Pananim (Crop Protection System)

A comprehensive IoT system combining ESP32-CAM hardware with a React Native mobile application for automated crop protection and monitoring.

**Isang kompletong sistema para protektahan ang iyong pananim gamit ang ESP32-CAM at mobile app.**

## 📋 Table of Contents
- [🇵🇭 Para sa mga Magsasaka (For Filipino Farmers)](#-para-sa-mga-magsasaka-for-filipino-farmers)
- [System Overview](#system-overview)
- [Hardware Components](#hardware-components)
- [Mobile App Setup](#mobile-app-setup)
- [Arduino Setup](#arduino-setup)
- [Features](#features)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## 🇵🇭 Para sa mga Magsasaka (For Filipino Farmers)

### Ano ang BantayBot?

Ang **BantayBot** ay isang matalinong sistema para protektahan ang iyong pananim laban sa mga ibon at peste. Ginagamit nito ang:
- 📹 **Camera** - Para tingnan ang taniman kahit saan ka
- 🎵 **Tunog** - 7 iba't ibang tunog para takutin ang ibon
- 🦾 **Gumagalaw na Braso** - Para mas mabisa ang pagtakot
- 🌱 **Soil Sensor** - Sukatin ang lupa (pH, sustansya, halumigmig)
- 📊 **Mobile App** - Kontrolin lahat gamit ang cellphone

### Mga Pangunahing Feature (Main Features)

#### ✅ Automatic na Pagprotekta (Automatic Protection)
- Kusang nakakadetect ng ibon gamit ang camera
- Automatic na tumutunog kapag may ibon
- Gumagalaw ang mga braso para takutin pa lalo
- Umiikot ang ulo (180°) para mas malawak ang saklaw

#### ✅ Live Monitoring (Subaybayan Nang Live)
- Tingnan ang taniman kahit nasa bahay ka
- Real-time camera stream sa cellphone
- Makita agad ang temperatura, halumigmig, at kalagayan ng lupa

#### ✅ Advanced Soil Sensor (Modernong Soil Sensor)
- **pH Level** - Alamin kung asido o alkaline ang lupa
- **Konduktibidad** - Sukatin ang sustansya (fertilizer) sa lupa
- **Halumigmig** - Alam kung kailangan ng tubig
- **Temperatura** - Bantayan ang init ng lupa

#### ✅ 7 Tunog Pantakot (7 Scare Sounds)
- Iba't ibang tunog para hindi masanay ang ibon
- Pwedeng i-adjust ang lakas (volume)
- Play/Stop/Next controls sa app

#### ✅ Predictive Analytics (Hulaan ang Ani)
- **Inaasahang Petsa ng Ani** - Based sa temperatura at Growing Degree Days
- **Tinatayang Dami ng Ani** - Prediction ng kilo based sa plot size
- **Crop Health Score** - Overall na kalusugan ng tanim (0-100)
- **Rainfall Tracking** - I-log ang ulan, alamin kung sapat ang tubig

#### ✅ Bird Activity Analysis (Aktibidad ng Ibon)
- Makita kung kailan pinakamaraming ibon (umaga/hapon)
- Trend analysis (tumaas ba o bumaba ngayong linggo)
- Detection history - ilan ibon per araw

### Paano I-install (How to Install)

#### Kailangan Muna (Requirements):
1. **ESP32-CAM Module** - Main controller
2. **Smartphone** - Android o iPhone (with Expo Go app)
3. **WiFi Connection** - Para sa ESP32 at cellphone
4. **12V Power Supply** - Para sa motor at speaker

#### Step 1: I-download ang App
```
1. I-download ang "Expo Go" app sa Google Play o App Store
2. I-install sa cellphone
3. Siguruhing nakakonekta ang phone sa WiFi
```

#### Step 2: I-setup ang ESP32-CAM
```
1. I-download ang Arduino IDE sa computer
2. I-install ang ESP32 Board Support
3. Buksan ang "BantayBotUnified.ino" file
4. Palitan ang WiFi name at password:

   const char *ssid = "Pangalan_ng_WiFi";
   const char *password = "Password_ng_WiFi";

5. I-upload sa ESP32-CAM
6. Buksan ang Serial Monitor, kopyanin ang IP address
```

#### Step 3: I-connect ang Mobile App
```
1. Sa computer, buksan ang project folder
2. Buksan ang "src/config/config.js"
3. Palitan ang ESP32_IP:

   ESP32_IP: '192.168.1.28',  // Lagyan ng IP address ng ESP32

4. Sa terminal, i-type: npm start
5. Mag-lalabas ng QR code
6. Sa cellphone, buksan ang Expo Go
7. I-scan ang QR code
8. Tapos na!
```

### Paano Gamitin (How to Use)

#### Basic Operations (Mga Pangunahing Gamit):

**1. Tingnan ang Taniman (View Farm)**
- Buksan ang app
- Makikita mo agad ang live camera
- Swipe down para i-refresh

**2. Takutin ang Ibon (Scare Birds)**
- Pindot ang "📢 TUMUNOG NA!" button
- O hayaan lang mag-automatic
- Makikita mo sa history kung ilan na ibon

**3. Sukatin ang Lupa (Check Soil)**
- Titingnan mo agad sa dashboard:
  - 💧 Halumigmig (Dry/Sakto/Wet)
  - 🌡️ Temperatura (Malamig/Mabuti/Mainit)
  - ⚡ Konduktibidad (Kulang/Sakto/Sobra sustansya)
  - 🧪 pH Level (Asido/Balanse/Alkaline)

**4. Kontrolin ang Ulo at Braso (Control Head & Arms)**
- Ulo: Pindot Left/Center/Right
- Braso: I-slide ang angle (0-180°)
- O pindot "🔄 Gumalaw" para mag-oscillate

**5. I-adjust ang Tunog (Adjust Sound)**
- Piliin ang track (1-7)
- I-adjust ang volume
- Play/Stop/Next controls

#### Advanced Features:

**1. Mag-track ng Ani (Track Harvest)**
```
Analytics Tab → Harvest Planner
- Lagyan ng crop type (Tomato/Rice/Corn/Eggplant)
- Petsa ng pagtanim
- Laki ng plot
- Makikita ang predicted harvest date at yield
```

**2. I-log ang Ulan (Log Rainfall)**
```
Analytics Tab → Rainfall Tracker
- Pindot "+ Idagdag Ulan Ngayon"
- Lagyan ng amount (mm)
- Makikita kung sapat ba ang tubig
```

**3. Bantayan ang Kalusugan (Monitor Health)**
```
Analytics Tab → Crop Health Monitor
- Makikita ang overall score (0-100)
- May recommendation kung ano dapat gawin
- Color-coded: Green=Mabuti, Yellow=Bantayan, Red=Panganib
```

### Mga Tip para sa Magsasaka (Farmer Tips)

#### Soil Sensor Tips:
- ✅ **pH 5.5-7.5** = Sakto para sa karamihan ng tanim
- ✅ **Conductivity 200-2000** = Sapat ang sustansya
- ⚠️ **pH < 5.5** = Kailangan ng lime (pampalaki pH)
- ⚠️ **pH > 7.5** = Kailangan ng sulfur (pampababa pH)
- ⚠️ **Conductivity < 200** = Kailangan ng fertilizer
- ⚠️ **Conductivity > 2000** = Sobra fertilizer, mag-flush ng tubig

#### Bird Detection Tips:
- 🕐 **Umaga (6-9 AM)** = Pinakamaraming ibon, bantayan
- 🕒 **Hapon (3-5 PM)** = Pangalawang peak time
- 🔄 **Palitan ang tunog** = Para hindi masanay ang ibon
- 📊 **Tingnan ang history** = Alamin kung kailan dumarating

#### Rainfall Tracking:
- 💧 **>50mm per 30 days** = Sapat ang tubig
- 💧 **20-50mm** = Kulang, bantayan
- 💧 **<20mm** = Kritikal, kailangan ng irrigation

### Troubleshooting sa Tagalog

#### Hindi Kumokonekta (Won't Connect)
```
✅ Check: Pareho ba WiFi ng ESP32 at phone?
✅ Check: Tama ba IP address sa config.js?
✅ Try: Restart ESP32 (pindot Reset button)
✅ Try: Restart app (close at buksan ulit)
```

#### Walang Tunog (No Sound)
```
✅ Check: Naka-mute ba? (Tingnan sa header)
✅ Check: May SD card ba sa DFPlayer?
✅ Check: Tama ba wiring ng speaker?
✅ Try: I-adjust ang volume slider
```

#### Hindi Gumagalaw ang Servo (Servos Not Moving)
```
✅ Check: May power ba PCA9685? (external 5V)
✅ Check: Tama ba I2C connections? (SDA=21, SCL=22)
✅ Check: Common ground ba ESP32 at servo power?
✅ Try: Pindot ang preset buttons (Rest/Alert/Wave)
```

#### Mali ang Soil Reading (Wrong Soil Reading)
```
✅ Check: Naka-calibrate ba sensor?
✅ Check: Tama ba RS485 connections?
✅ Try: Swap A at B terminals kung walang reading
✅ Try: Restart system
```

### Mga Suportadong Pananim (Supported Crops)

| Pananim | Base Temp | Required GDD | Optimal Temp | pH Range |
|---------|-----------|--------------|--------------|----------|
| 🍅 Kamatis | 10°C | 2200 | 18-28°C | 6.0-7.0 |
| 🌾 Palay | 10°C | 3000 | 20-35°C | 5.5-6.5 |
| 🌽 Mais | 10°C | 2700 | 18-32°C | 5.5-7.5 |
| 🍆 Talong | 15°C | 1800 | 21-30°C | 5.5-6.5 |

### Contact & Support

**May tanong? May problema?**
1. Basahin ang Troubleshooting section
2. Tingnan ang History para sa errors
3. Check ang Serial Monitor sa Arduino
4. Kumuha ng screenshot, i-share sa technician

**Maligayang Pagsasaka! 🌾🇵🇭**

---

---

## 🌾 System Overview

BantayBot is a solar-powered automated scarecrow system designed for crop protection. It combines:
- **ESP32-CAM** for live video streaming
- **NEMA 17 Stepper Motor** for 180° head rotation
- **Crown Horn Speaker H-5** (8Ω, 20W) for audio deterrent
- **Environmental Sensors** for monitoring crop conditions
- **React Native Mobile App** for remote control and monitoring

---

## 🔧 Hardware Components

### Core Hardware
| Component | Model | Purpose |
|-----------|-------|---------|
| **Microcontroller** | ESP32-CAM (AI-Thinker) | Camera streaming & control |
| **Motor** | NEMA 17 Bipolar Stepper (42mm) | Head rotation mechanism |
| **Speaker** | Crown Horn Speaker H-5 (8Ω, 20W) | Audio alert system |
| **Motor Driver** | A4988/DRV8825/TMC2208 | Stepper motor control |
| **Power** | Solar panel + Battery system | Sustainable power source |

### Sensors
- **DHT22** - Temperature & Humidity monitoring
- **Soil Moisture Sensor** - Soil condition tracking
- **PIR Motion Sensor** - Movement detection

### Pin Configuration (ESP32-CAM)
```
Stepper Motor:
  - STEP: GPIO 13
  - DIR:  GPIO 15
  - EN:   GPIO 14

Horn Speaker:
  - Control: GPIO 12 (via relay/MOSFET)

Sensors:
  - DHT22:         GPIO 2
  - Soil Moisture: GPIO 33 (ADC)
  - Motion:        GPIO 16
```

---

## 📱 Mobile App Setup

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Expo Go app** on your mobile device
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd bantay-bot-final
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure ESP32 IP Address**:
   - Edit `src/config/config.js`
   - Set `ESP32_IP` to your ESP32-CAM's IP address

### Running the Application

#### Start Development Server:
```bash
npm start
```

This will start the Expo development server and display a QR code in the terminal.

#### On Mobile Device (Recommended):
1. Open the **Expo Go** app on your phone
2. Scan the QR code displayed in the terminal
3. The app will load and run on your device
4. Ensure your phone is on the **same WiFi network** as the ESP32

#### Alternative Platforms:
```bash
npm run android   # Android Emulator
npm run ios       # iOS Simulator (Mac only)
npm run web       # Web Browser
```

---

## 🔌 Arduino Setup

### Required Libraries

Install these libraries via Arduino IDE Library Manager:

1. **ESP32 Board Support**
   - In Arduino IDE: `File > Preferences`
   - Add URL: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Tools > Board > Boards Manager > Search "ESP32" > Install

2. **Libraries to Install**:
   ```
   - ESPAsyncWebServer by me-no-dev
   - AsyncTCP by me-no-dev
   - ArduinoJson by Benoit Blanchon (v6.x)
   - AccelStepper by Mike McCauley
   - DHT sensor library by Adafruit
   - Adafruit Unified Sensor (dependency)
   ```

### Hardware Wiring

#### Stepper Motor Connection:
```
ESP32-CAM → Stepper Driver (A4988/DRV8825)
  GPIO 13 → STEP
  GPIO 15 → DIR
  GPIO 14 → ENABLE

Stepper Driver → NEMA 17
  A+, A- → Coil A (Black, Green)
  B+, B- → Coil B (Red, Blue)

Power: 12V DC to stepper driver VIN
```

#### Horn Speaker Connection:
```
⚠️ WARNING: Do NOT connect 20W speaker directly to ESP32!

ESP32 GPIO 12 → Relay/MOSFET Gate
Relay/MOSFET → Speaker (+)
Speaker (-) → Power Supply GND
Power Supply (+12V) → Relay/MOSFET COM
```

#### Sensor Connections:
```
DHT22:
  VCC → 3.3V
  DATA → GPIO 2 (with 10kΩ pull-up to 3.3V)
  GND → GND

Soil Moisture:
  VCC → 3.3V
  AOUT → GPIO 33
  GND → GND

PIR Motion:
  VCC → 5V
  OUT → GPIO 16
  GND → GND
```

### Upload Arduino Code

1. **Configure WiFi Credentials**:
   - Open `CameraWebServerESP32camcode.ino`
   - Edit lines 19-20:
     ```cpp
     const char *ssid = "Your_WiFi_SSID";
     const char *password = "Your_WiFi_Password";
     ```

2. **Select Board & Port**:
   - Board: `AI Thinker ESP32-CAM`
   - Port: Select your FTDI/USB-Serial adapter

3. **Upload**:
   - Connect ESP32-CAM to FTDI adapter (TX→RX, RX→TX)
   - Connect GPIO 0 to GND (programming mode)
   - Click Upload
   - After upload, disconnect GPIO 0 from GND
   - Press RESET button

4. **Get IP Address**:
   - Open Serial Monitor (115200 baud)
   - Note the IP address displayed
   - Update mobile app config with this IP

---

## ✨ Features

### Mobile App Features

#### Core Controls
- 📹 **Live Camera Streaming** - Real-time ESP32-CAM video feed
- 🔄 **Head Rotation Control** - Remote stepper motor control (±180°)
- 📢 **Audio Alerts** - Trigger horn speaker remotely
- 🔊 **Volume Control** - Adjustable speaker volume and mute

#### Smart Bird Detection
- 🦅 **Motion-Based Detection** - Frame differencing algorithm
- 📸 **Camera Controls**:
  - Brightness adjustment (-2 to +2)
  - Contrast adjustment (-2 to +2)
  - Resolution selector (96x96, QVGA, VGA, SVGA)
  - Grayscale mode toggle
- 🎯 **Detection Settings**:
  - Sensitivity levels (Low/Medium/High)
  - Size filtering (bird-sized objects: 1000-30000 pixels)
  - Position filtering (upper 60% of frame)
  - 10-second cooldown between detections
- 📊 **Detection Tracking**:
  - Daily bird count
  - Detection history logging
  - Automatic audio alerts on detection

#### Predictive Analytics & Crop Management
- 🌾 **Harvest Prediction**:
  - Growing Degree Days (GDD) calculation
  - Predicted harvest dates based on crop type
  - Estimated yield predictions per plot size
  - Historical average comparisons
- 📈 **Yield Impact Scoring** (0-100):
  - Environmental conditions impact
  - Water stress impact
  - Bird protection effectiveness
- 🌱 **Crop Health Monitoring**:
  - Real-time health assessment score
  - Temperature, humidity, and soil moisture analysis
  - Optimal range comparisons per crop type
  - Actionable recommendations
- 💧 **Rainfall Tracking**:
  - Manual rainfall logging (no irrigation available)
  - 30-day rainfall analysis
  - Water availability status (sufficient/low/critical)
  - Days since last rain tracking
  - Water stress alerts
- 🦅 **Bird Activity Analytics**:
  - Hourly distribution patterns (24-hour visualization)
  - Peak activity times identification
  - Weekly trend analysis with percentage changes
  - Detection statistics and insights
- 📊 **Comprehensive Reports**:
  - Summary statistics (harvests, environment, rainfall, birds)
  - Key insights generation
  - Data export functionality
  - Historical data management

#### Crop Database Support
- 🍅 **Tomato** - Base temp: 10°C, Required GDD: 2200, Optimal: 18-28°C
- 🌾 **Rice** - Base temp: 10°C, Required GDD: 3000, Optimal: 20-35°C
- 🌽 **Corn** - Base temp: 10°C, Required GDD: 2700, Optimal: 18-32°C
- 🍆 **Eggplant** - Base temp: 15°C, Required GDD: 1800, Optimal: 21-30°C

#### Environmental Monitoring
- 🌡️ **Real-time Sensors**:
  - Temperature & Humidity (DHT22)
  - Soil Moisture levels
  - Bird detection status
- 📅 **Data Logging**:
  - 90-day environmental history
  - 90-day rainfall log
  - Unlimited harvest records
  - Automatic daily aggregation

#### User Interface
- 🎛️ **Quick Actions**:
  - Turn head left/right/center
  - Sound alarm
  - System restart
  - Navigate to analytics sections
- ⚙️ **Settings**:
  - WiFi configuration
  - Audio preferences (volume, mute)
  - Update intervals
  - Connection testing
- 🌐 **Multi-language Support** - English and Tagalog
- 📊 **Real-time Data Updates** - 1-second sensor refresh rate

### Hardware Features
- ⚡ **Solar Powered** - Sustainable operation
- 🎥 **HD Camera** - QVGA/VGA streaming capability with bird detection
- 🔊 **Loud Speaker** - 20W horn for effective deterrent
- 🔄 **Smooth Movement** - AccelStepper for precise control
- 📡 **WebSocket Communication** - Real-time bidirectional data
- 🌡️ **Multi-sensor** - Comprehensive environment monitoring
- 🧠 **On-board Detection** - Frame differencing algorithm on ESP32

---

## ⚙️ Configuration

### Mobile App Configuration
Edit `src/config/config.js`:
```javascript
export const CONFIG = {
  ESP32_IP: '192.168.1.28',    // Your ESP32 IP address
  ESP32_PORT: 80,               // HTTP port
  WEBSOCKET_PATH: '/ws',        // WebSocket endpoint
  UPDATE_INTERVAL: 1000,        // Sensor update rate (ms)
  CONNECTION_TIMEOUT: 5000,     // Connection timeout
  RECONNECT_INTERVAL: 3000      // Auto-reconnect interval
};
```

### Arduino Configuration
Edit `CameraWebServerESP32camcode.ino`:
```cpp
const char *ssid = "Your_WiFi_SSID";
const char *password = "Your_WiFi_Password";

// Adjust stepper motor settings if needed:
#define STEPS_PER_REVOLUTION 3200  // Depends on microstepping
stepper.setMaxSpeed(1000);         // Steps per second
stepper.setAcceleration(500);      // Acceleration rate
```

### Camera Stream URLs
Once ESP32 is running:
- **Camera Stream**: `http://{ESP32_IP}:81/stream`
- **WebSocket**: `ws://{ESP32_IP}/ws`
- **Web Interface**: `http://{ESP32_IP}`

---

## 🐛 Troubleshooting

### Mobile App Issues

#### Camera Not Loading
- Verify ESP32 IP address in config
- Check both devices on same WiFi network
- Try accessing `http://{ESP32_IP}:81/stream` in browser
- Press "Refresh" button in app

#### WebSocket Not Connecting
- Check `ws://{ESP32_IP}/ws` endpoint
- Ensure ESP32 serial monitor shows "WiFi connected"
- Restart both app and ESP32
- Check firewall settings

#### Package Version Warnings
```bash
npm update
```

#### Metro Bundler Issues
```bash
npx expo start -c       # Clear cache
rm -rf node_modules     # Full reinstall
npm install
```

### Hardware Issues

#### Stepper Motor Not Moving
- Check wiring: STEP, DIR, ENABLE pins
- Verify stepper driver power (12V)
- Check ENABLE pin is LOW (enabled)
- Test with Serial Monitor commands

#### Speaker Not Working
- **NEVER** connect speaker directly to ESP32!
- Verify relay/MOSFET is working
- Check 12V power supply for speaker
- Test relay with multimeter

#### Camera Not Streaming
- Check camera ribbon cable connection
- Verify PSRAM is detected (Serial Monitor)
- Try reducing frame size in code
- Power supply must be adequate (5V 2A minimum)

#### Sensors Reading Wrong Values
- DHT22: Check 10kΩ pull-up resistor
- Soil Moisture: Calibrate sensor values
- PIR: Adjust sensitivity potentiometer
- Check all GND connections

#### ESP32 Won't Upload
- GPIO 0 must be connected to GND during upload
- Disconnect GPIO 0 after upload
- Press RESET button after upload
- Check TX/RX are swapped (TX→RX, RX→TX)

---

## 📁 Project Structure

```
bantay-bot-final/
├── CameraWebServerESP32camcode.ino  # Arduino code with bird detection
├── App.js                           # Main app with navigation
├── src/
│   ├── components/
│   │   ├── SpeakerControl.js       # Volume/mute controls
│   │   ├── CameraSettings.js       # Camera configuration UI
│   │   └── DetectionControls.js    # Bird detection controls
│   ├── screens/
│   │   ├── DashboardScreen.js      # Main control screen
│   │   ├── AnalyticsScreen.js      # Predictive analytics dashboard
│   │   ├── HarvestPlannerScreen.js # Crop planning & history
│   │   ├── AddHarvestScreen.js     # Add harvest records
│   │   ├── RainfallTrackerScreen.js # Rainfall logging
│   │   ├── CropHealthMonitorScreen.js # Real-time health assessment
│   │   ├── BirdAnalyticsScreen.js  # Bird activity patterns
│   │   ├── ReportsScreen.js        # Comprehensive reports
│   │   ├── SettingsScreen.js       # Configuration
│   │   ├── HistoryScreen.js        # Event logs
│   │   └── ControlsScreen.js       # Manual controls
│   ├── services/
│   │   ├── WebSocketService.js     # WebSocket client
│   │   ├── SpeakerService.js       # Audio management
│   │   ├── HistoryService.js       # Event logging
│   │   ├── DetectionHistoryService.js # Bird detection logs
│   │   ├── PredictionService.js    # Predictive algorithms
│   │   └── CropDataService.js      # Crop data storage
│   ├── config/
│   │   └── config.js               # App configuration
│   └── i18n/
│       └── i18n.js                 # Translations (EN/TL)
├── assets/
│   └── Hawk.mp3                    # Alert sound
└── package.json                    # Dependencies
```

---

## 📦 Dependencies

### Mobile App
- **expo** (v53.x) - Development platform
- **react-native** (v0.79.x) - Mobile framework
- **@react-navigation/native** - Screen navigation
- **@react-navigation/bottom-tabs** - Tab navigation
- **@react-navigation/stack** - Stack navigation
- **expo-av** - Audio/video functionality
- **@react-native-async-storage/async-storage** - Local data storage
- **@react-native-community/slider** - Volume slider
- **@react-native-picker/picker** - Crop type selection
- **expo-linear-gradient** - UI styling

### Arduino
- **ESP32 Board Support** - Core functionality
- **ESPAsyncWebServer** - HTTP server
- **AsyncWebSocket** - WebSocket server
- **ArduinoJson** - JSON parsing
- **AccelStepper** - Stepper motor control
- **DHT sensor library** - Temperature/humidity

---

## 👥 Team

**Developed by PUP-Lopez BSIT Students**

A capstone project for automated crop protection using IoT technology.

---

## 📄 License

This project is part of an academic requirement and is for educational purposes.

---

## 🆘 Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Serial Monitor output for errors
3. Verify all hardware connections
4. Ensure software versions match requirements

---

## 🧠 Predictive Analytics Algorithms

### Growing Degree Days (GDD) Calculation
```
GDD = (Daily Max Temp + Daily Min Temp) / 2 - Base Temperature

Accumulated GDD = Sum of daily GDD values since planting
Harvest Date = Planting Date + Days to reach Required GDD
```

**Crop-Specific Requirements:**
- Tomato: 2200 GDD (Base: 10°C)
- Rice: 3000 GDD (Base: 10°C)
- Corn: 2700 GDD (Base: 10°C)
- Eggplant: 1800 GDD (Base: 15°C)

### Yield Prediction Formula
```
Base Yield = Historical Average or Crop Database Default
Plot Multiplier = Plot Size / Standard Size (100 sq m)
Predicted Yield = Base Yield × Plot Multiplier × Yield Impact Score / 100
```

### Yield Impact Scoring (0-100)
```
Environmental Score (0-40):
  - Temperature within optimal range: +15 points
  - Humidity within optimal range: +15 points
  - Soil moisture within optimal range: +10 points

Stress Score (0-35):
  - No water stress: +35 points
  - Mild stress: +25 points
  - Moderate stress: +15 points
  - Severe stress: +5 points

Bird Protection Score (0-25):
  - Active detection: +25 points
  - Inactive: +10 points

Final Score = Environmental + Stress + Protection
```

### Crop Health Assessment
```
Health Score = (Temperature Score × 0.35) +
               (Humidity Score × 0.35) +
               (Moisture Score × 0.30)

Score Ranges:
  - 80-100: Excellent
  - 60-79:  Good
  - 40-59:  Fair
  - 0-39:   Poor
```

### Water Stress Detection
```
Based on Soil Moisture vs Crop Optimal Range:

Optimal: Within optimal range
Mild: 5-10% below optimal minimum
Moderate: 10-20% below optimal minimum
Severe: >20% below optimal minimum
```

### Rainfall Analysis
```
30-Day Analysis:
  - Total rainfall accumulation
  - Average per rain event
  - Days since last rain
  - Water availability status:
    * Sufficient: >50mm in 30 days
    * Low: 20-50mm in 30 days
    * Critical: <20mm in 30 days
```

### Bird Pattern Analysis
```
Hourly Distribution:
  - Count detections per hour (0-23)
  - Identify peak hours (top 3)
  - Calculate hourly averages

Weekly Trend:
  - Compare last 7 days vs previous 7 days
  - Calculate percentage change
  - Identify most active day

Insights Generation:
  - Early morning activity (5-9 AM)
  - Midday activity (10-14 PM)
  - Evening activity (15-18 PM)
  - Consistent patterns detection
```

### Data Storage
All data stored locally using AsyncStorage:
- **@crop_data**: Current crop information
- **@harvest_history**: Historical harvest records
- **@environmental_history**: 90 days of conditions
- **@rainfall_log**: 90 days of rainfall events
- **@detection_history**: Bird detection logs (100 recent)

---

## 🚀 Quick Start Summary

1. **Hardware**: Wire ESP32-CAM, stepper motor, speaker, sensors
2. **Arduino**: Install libraries, configure WiFi, upload code
3. **Mobile**: Install dependencies, set ESP32 IP, run app
4. **Connect**: Ensure same WiFi network
5. **Test**: View camera, rotate head, sound alarm
6. **Setup Crop**: Go to Analytics → Harvest Planner
7. **Track Data**: Log harvests and rainfall for predictions

**Happy Farming! 🌾🤖**