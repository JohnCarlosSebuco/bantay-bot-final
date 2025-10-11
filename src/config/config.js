export const CONFIG = {
  DEMO_MODE: false,

  // Dual ESP32 Setup
  // Camera ESP32-CAM (port 80)
  CAMERA_ESP32_IP: '192.168.1.28',
  CAMERA_ESP32_PORT: 80,
  CAMERA_WEBSOCKET_PATH: '/ws',

  // Main Control Board ESP32 (port 81)
  MAIN_ESP32_IP: '192.168.1.29',      // Change this to your main board's IP
  MAIN_ESP32_PORT: 81,
  MAIN_WEBSOCKET_PATH: '/ws',

  // Legacy single IP (fallback - uses main board)
  ESP32_IP: '192.168.1.29',
  ESP32_PORT: 81,
  WEBSOCKET_PATH: '/ws',

  UPDATE_INTERVAL: 2000,  // 2s for RS485 sensor
  CONNECTION_TIMEOUT: 5000,
  RECONNECT_INTERVAL: 3000,

  // Audio Configuration
  TOTAL_AUDIO_TRACKS: 7,
  SKIP_TRACK: 3,  // Track 3 is skipped

  // Stepper Motor Configuration
  STEPPER_MIN_ANGLE: -180,
  STEPPER_MAX_ANGLE: 180,
  STEPPER_DEFAULT_STEP: 45,

  // Servo Configuration
  SERVO_OSCILLATION_CYCLES: 6,
  SERVO_OSCILLATION_INTERVAL: 30,  // milliseconds

  // PIR Motion Configuration
  MOTION_TIMEOUT: 120000,      // 2 minutes
  MOTION_COOLDOWN: 30000,      // 30 seconds
};

export const SENSOR_THRESHOLDS = {
  // Motion & Distance
  MOTION_ALERT_DISTANCE: 20,

  // Soil Moisture (RS485 Sensor - Humidity %)
  SOIL_HUMIDITY_LOW: 40,      // Below 40% = Dry
  SOIL_HUMIDITY_OPTIMAL: 70,  // 40-70% = Optimal
  // Above 70% = Wet

  // Soil Temperature (RS485 Sensor - °C)
  SOIL_TEMP_LOW: 20,          // Below 20°C = Cold
  SOIL_TEMP_OPTIMAL: 30,      // 20-30°C = Good
  // Above 30°C = Hot

  // Soil Conductivity (RS485 Sensor - µS/cm)
  SOIL_CONDUCTIVITY_LOW: 200,     // Below 200 = Low nutrients
  SOIL_CONDUCTIVITY_OPTIMAL: 2000, // 200-2000 = Optimal
  // Above 2000 = High nutrients (oversaturated)

  // Soil pH (RS485 Sensor - pH scale)
  SOIL_PH_LOW: 5.5,           // Below 5.5 = Too acidic
  SOIL_PH_OPTIMAL: 7.5,       // 5.5-7.5 = Balanced
  // Above 7.5 = Too alkaline

  // Air Temperature (DHT22 backup - °C)
  AIR_TEMP_HIGH: 35,
  AIR_TEMP_LOW: 10,

  // Air Humidity (DHT22 backup - %)
  AIR_HUMIDITY_HIGH: 80,
  AIR_HUMIDITY_LOW: 30,

  // Audio
  AUDIO_VOLUME_MIN: 0,
  AUDIO_VOLUME_MAX: 30,
  AUDIO_VOLUME_DEFAULT: 20,

  // Servo Arms
  SERVO_ANGLE_MIN: 0,
  SERVO_ANGLE_MAX: 180,
  SERVO_ANGLE_DEFAULT: 90,

  // Bird Detection
  DETECTION_COOLDOWN: 10000,  // 10 seconds between detections
};