/**
 * BantayBot Main Board Configuration
 * ESP32 DevKit v1 Board Pin Definitions and Settings
 */

#ifndef CONFIG_H
#define CONFIG_H

// ===========================
// WiFi Configuration
// ===========================
#define WIFI_SSID "HUAWEI-E5330-6AB9"
#define WIFI_PASSWORD "16yaad0a"

// ===========================
// Firebase Configuration
// ===========================
#define FIREBASE_PROJECT_ID "cloudbantaybot"
#define API_KEY "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
#define FIREBASE_AUTH_DOMAIN "cloudbantaybot.firebaseapp.com"

// Device IDs (must match React Native app)
#define MAIN_DEVICE_ID "main_001"
#define CAMERA_DEVICE_ID "camera_001"

// ===========================
// Pin Definitions
// ===========================

// DFPlayer Mini (MP3 Audio)
#define DFPLAYER_RX 27  // Connect to TX of DFPlayer
#define DFPLAYER_TX 26  // Connect to RX of DFPlayer

// RS485 Soil Sensor
#define RS485_RE 4      // Direction control
#define RS485_RX 17     // Serial2 RX
#define RS485_TX 16     // Serial2 TX

// Stepper Motor (Head Rotation)
#define STEPPER_STEP_PIN 13
#define STEPPER_DIR_PIN 15
#define STEPPER_ENABLE_PIN 14

// Servos (PCA9685 - I2C)
#define SERVO_SDA 21
#define SERVO_SCL 22
#define SERVO_ARM1 0    // PCA9685 Channel 0
#define SERVO_ARM2 1    // PCA9685 Channel 1

// Sensors
#define DHT_PIN 2       // DHT22 (backup sensor)
#define DHT_TYPE DHT22
#define SPEAKER_PIN 12  // Horn speaker relay

// ===========================
// Hardware Settings
// ===========================

// Stepper Motor
#define STEPS_PER_REVOLUTION 3200  // 200 * 16 (microstepping)

// Servos
#define SERVO_MIN 120
#define SERVO_MAX 600
#define SERVO_FREQ 50  // 50Hz for servos

// Audio
#define TOTAL_TRACKS 7
#define DEFAULT_VOLUME 20

// ===========================
// Timing Configuration
// ===========================

// Firebase update intervals
#define FIREBASE_UPDATE_INTERVAL 2000   // 2 seconds
#define COMMAND_CHECK_INTERVAL 500      // 500ms

// Sensor reading interval
#define SENSOR_READ_INTERVAL 2000       // 2 seconds

// Available GPIO pins for general use:
// GPIO 0, 5, 18, 19, 23, 25, 32, 33, 34, 35, 36, 39

#endif // CONFIG_H
