/**
 * BantayBot Main Board Configuration
 * Pin definitions and hardware settings for ESP32 main control board
 */

#ifndef BANTAYBOT_CONFIG_H
#define BANTAYBOT_CONFIG_H

// ===========================
// WiFi Configuration
// ===========================
#define WIFI_SSID "YOUR_WIFI_SSID"          // Change this to your WiFi name
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"  // Change this to your WiFi password
#define WEBSOCKET_PORT 81                    // WebSocket port (different from camera on port 80)

// ===========================
// DFPlayer Mini (MP3 Audio)
// ===========================
#define DFPLAYER_RX 27    // Connect to TX of DFPlayer
#define DFPLAYER_TX 26    // Connect to RX of DFPlayer
#define TOTAL_TRACKS 7    // Total number of MP3 files
#define SKIP_TRACK 3      // Track 3 is skipped
#define DEFAULT_VOLUME 20 // 0-30

// ===========================
// RS485 Soil Sensor (4-in-1)
// ===========================
#define RS485_RE 4        // MAX485 DE/RE pin (direction control)
#define RS485_RX 17       // ESP32 RX pin (connect to MAX485 RO)
#define RS485_TX 16       // ESP32 TX pin (connect to MAX485 DI)
#define RS485_BAUD 4800   // Sensor baud rate

// ===========================
// Stepper Motor (TMC2225)
// ===========================
#define STEPPER_STEP_PIN 25
#define STEPPER_DIR_PIN 33
#define STEPPER_EN_PIN 32
#define STEPS_PER_REVOLUTION 200    // Standard NEMA 17: 200 steps/rev (adjust if using microstepping)
#define STEPPER_SPEED 1000          // Steps per second
#define STEPPER_ACCEL 500           // Steps per second²

// ===========================
// PCA9685 Servos (I2C)
// ===========================
#define SERVO_SDA 21
#define SERVO_SCL 22
#define SERVO_FREQ 50       // 50Hz for servos
#define SERVO_MIN 120       // Min pulse length count (adjust for your servos)
#define SERVO_MAX 600       // Max pulse length count
#define SERVO_ARM1 0        // PCA9685 Channel 0 (Left arm)
#define SERVO_ARM2 1        // PCA9685 Channel 1 (Right arm)

// ===========================
// PIR Motion Sensor
// ===========================
#define PIR_PIN 14
#define MOTION_TIMEOUT 120000      // 2 minutes in milliseconds
#define MOTION_COOLDOWN 30000      // 30 seconds cooldown
#define SERVO_OSCILLATION_CYCLES 6 // Number of back-and-forth cycles

// ===========================
// Timing Configuration
// ===========================
#define SENSOR_UPDATE_INTERVAL 2000  // 2 seconds between sensor reads
#define SERVO_UPDATE_INTERVAL 30     // 30ms between servo updates during oscillation

// ===========================
// RS485 Modbus Commands (4-in-1 Soil Sensor)
// ===========================
// These are pre-calculated Modbus RTU commands with CRC
const byte CMD_HUMIDITY[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x01, 0x84, 0x0A};
const byte CMD_TEMPERATURE[] = {0x01, 0x03, 0x00, 0x01, 0x00, 0x01, 0xD5, 0xCA};
const byte CMD_CONDUCTIVITY[] = {0x01, 0x03, 0x00, 0x02, 0x00, 0x01, 0x25, 0xCA};
const byte CMD_PH[] = {0x01, 0x03, 0x00, 0x03, 0x00, 0x01, 0x74, 0x0A};

#endif // BANTAYBOT_CONFIG_H
