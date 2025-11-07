/*
 * BantayBot Unified - Complete Smart Crop Protection System
 * Combines ESP32-CAM + DFPlayer Mini + RS485 Soil Sensor + PCA9685 Servos
 * Designed for Filipino farmers with full mobile app integration
 */

#define DISABLE_CAMERA 1

#if !DISABLE_CAMERA
#include "esp_camera.h"
#endif
 #include <WiFi.h>
 #include <ESPAsyncWebServer.h>
 #include <AsyncWebSocket.h>
 #include <ArduinoJson.h>
 #include <AccelStepper.h>
 #include <DHT.h>
 #include "DFRobotDFPlayerMini.h"
 #include <Wire.h>
 #include <Adafruit_PWMServoDriver.h>
 
// Camera model
#if !DISABLE_CAMERA
#include "board_config.h"
#endif
 
 // ===========================
 // WiFi Credentials
 // ===========================
 const char *ssid = "TPI HALL";
 const char *password = "TPIHall2024!";
 
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
 // Hardware Objects
 // ===========================
 HardwareSerial dfPlayerSerial(1);  // Serial1 for DFPlayer
 DFRobotDFPlayerMini dfPlayer;
 
 DHT dht(DHT_PIN, DHT_TYPE);
 AccelStepper stepper(AccelStepper::DRIVER, STEPPER_STEP_PIN, STEPPER_DIR_PIN);
 Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();
 
 AsyncWebServer server(80);
 AsyncWebSocket ws("/ws");
 
 // ===========================
 // System State
 // ===========================
 // Audio State
 int currentTrack = 1;
 const int totalTracks = 7;
 int volumeLevel = 20;  // 0-30
 bool audioPlaying = false;
 
 // Servo State
 #define SERVO_MIN 120
 #define SERVO_MAX 600
 int leftArmAngle = 90;
 int rightArmAngle = 90;
 bool servoOscillating = false;
 int servoOscillationSpeed = 30;  // milliseconds between updates
 unsigned long lastServoUpdate = 0;
 int servoDirection = 1;
 
 // RS485 Soil Sensor State
 const byte cmd_humidity[] = {0x01,0x03,0x00,0x00,0x00,0x01,0x84,0x0A};
 const byte cmd_temp[] = {0x01,0x03,0x00,0x01,0x00,0x01,0xD5,0xCA};
 const byte cmd_conductivity[] = {0x01,0x03,0x00,0x02,0x00,0x01,0x25,0xCA};
 const byte cmd_ph[] = {0x01,0x03,0x00,0x03,0x00,0x01,0x74,0x0A};
 byte sensorValues[11];
 float soilHumidity = 0.0;
 float soilTemperature = 0.0;
 float soilConductivity = 0.0;
 float soilPH = 0.0;
 
 // Stepper Motor State
 int currentHeadPosition = 0;  // degrees
 #define STEPS_PER_REVOLUTION 3200
 
 // Bird Detection State
 bool birdDetectionEnabled = true;
 int detectionSensitivity = 2;
 int detectionThreshold = 25;
 int minBirdSize = 1000;
 int maxBirdSize = 30000;
 int birdsDetectedToday = 0;
 unsigned long lastDetectionTime = 0;
 const unsigned long DETECTION_COOLDOWN = 10000;
 
 // DHT Sensor State (backup)
 float dhtTemperature = 0.0;
 float dhtHumidity = 0.0;
 
 // Motion Detection
 bool motionDetected = false;
 unsigned long lastSensorUpdate = 0;
 const unsigned long SENSOR_UPDATE_INTERVAL = 2000;
 
// Camera Settings (only when camera is enabled)
#if !DISABLE_CAMERA
int cameraResolution = FRAMESIZE_QVGA;
int cameraBrightness = 0;
int cameraContrast = 0;
bool grayscaleMode = false;
#endif
 
// Frame buffers and detection zone (only when camera is enabled)
#if !DISABLE_CAMERA
camera_fb_t *currentFrame = NULL;
uint8_t *prevGrayBuffer = NULL;
uint8_t *currGrayBuffer = NULL;
const int GRAY_BUFFER_SIZE = 320 * 240;
int detectionZoneTop = 0;
int detectionZoneBottom = 144;
int detectionZoneLeft = 0;
int detectionZoneRight = 320;
#endif
 
 // Hardware availability flags
 bool hasDFPlayer = false;
 bool hasRS485Sensor = false;
 bool hasServos = false;
 
 // ===========================
 // Function Declarations
 // ===========================
void startCameraServer();
void setupLedFlash();
 void setupStepper();
 void setupSensors();
 void setupDFPlayer();
 void setupRS485();
 void setupServos();
void setupBirdDetection();
 void readSensors();
float readRS485Sensor(const byte *cmd);
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                     AwsEventType type, void *arg, uint8_t *data, size_t len);
void sendSensorData();
void rotateHead(int targetDegrees);
void soundAlarm(int duration = 2000);
void playTrack(int track);
void stopAudio();
void nextTrack();
void setVolume(int vol);
void setServoAngle(int servo, int angle);
void updateServoOscillation();
void performBirdDetection(); // will be stubbed when camera disabled
#if !DISABLE_CAMERA
void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer);
bool detectMotion();
void applyCameraSettings();
#endif
void updateDetectionSensitivity();
 
 // ===========================
 // Setup
 // ===========================
 void setup() {
   Serial.begin(115200);
   Serial.setDebugOutput(true);
   Serial.println("\n\n🤖 BantayBot Unified - Starting...");
 
   // Initialize Camera
#if !DISABLE_CAMERA
   camera_config_t config;
   config.ledc_channel = LEDC_CHANNEL_0;
   config.ledc_timer = LEDC_TIMER_0;
   config.pin_d0 = Y2_GPIO_NUM;
   config.pin_d1 = Y3_GPIO_NUM;
   config.pin_d2 = Y4_GPIO_NUM;
   config.pin_d3 = Y5_GPIO_NUM;
   config.pin_d4 = Y6_GPIO_NUM;
   config.pin_d5 = Y7_GPIO_NUM;
   config.pin_d6 = Y8_GPIO_NUM;
   config.pin_d7 = Y9_GPIO_NUM;
   config.pin_xclk = XCLK_GPIO_NUM;
   config.pin_pclk = PCLK_GPIO_NUM;
   config.pin_vsync = VSYNC_GPIO_NUM;
   config.pin_href = HREF_GPIO_NUM;
   config.pin_sccb_sda = SIOD_GPIO_NUM;
   config.pin_sccb_scl = SIOC_GPIO_NUM;
   config.pin_pwdn = PWDN_GPIO_NUM;
   config.pin_reset = RESET_GPIO_NUM;
   config.xclk_freq_hz = 20000000;
   config.frame_size = FRAMESIZE_UXGA;
   config.pixel_format = PIXFORMAT_JPEG;
   config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
   config.fb_location = CAMERA_FB_IN_PSRAM;
   config.jpeg_quality = 12;
   config.fb_count = 1;
 
   if (config.pixel_format == PIXFORMAT_JPEG) {
     if (psramFound()) {
       config.jpeg_quality = 10;
       config.fb_count = 2;
       config.grab_mode = CAMERA_GRAB_LATEST;
     } else {
       config.frame_size = FRAMESIZE_SVGA;
       config.fb_location = CAMERA_FB_IN_DRAM;
     }
   }
 
   esp_err_t err = esp_camera_init(&config);
   if (err != ESP_OK) {
     Serial.printf("❌ Camera init failed: 0x%x\n", err);
     return;
   }
 
   sensor_t *s = esp_camera_sensor_get();
   if (s->id.PID == OV3660_PID) {
     s->set_vflip(s, 1);
     s->set_brightness(s, 1);
     s->set_saturation(s, -2);
   }
   s->set_framesize(s, FRAMESIZE_QVGA);
 
 #if defined(LED_GPIO_NUM)
   setupLedFlash();
 #endif
#else
  // Camera disabled at compile time
  birdDetectionEnabled = false;
#endif
 
   // Connect WiFi
   WiFi.begin(ssid, password);
   WiFi.setSleep(false);
   Serial.print("📡 WiFi connecting");
   while (WiFi.status() != WL_CONNECTED) {
     delay(500);
     Serial.print(".");
   }
   Serial.println("\n✅ WiFi connected");
 
   // Initialize components
   setupStepper();
   setupSensors();
   setupDFPlayer();
   setupRS485();
   setupServos();
  setupBirdDetection();
 
  #if !DISABLE_CAMERA
  startCameraServer();
  #endif
 
   // Setup WebSocket
   ws.onEvent(onWebSocketEvent);
   server.addHandler(&ws);
   server.begin();
 
   Serial.print("🌐 Camera Ready! http://");
   Serial.println(WiFi.localIP());
   Serial.print("📡 WebSocket: ws://");
   Serial.print(WiFi.localIP());
   Serial.println("/ws");
   Serial.println("🚀 BantayBot Unified - Ready!");
 }
 
 // ===========================
 // Main Loop
 // ===========================
 void loop() {
   ws.cleanupClients();
   stepper.run();
 
   // Update servo oscillation if active
   if (servoOscillating) {
     updateServoOscillation();
   }
 
   // Bird detection
  #if !DISABLE_CAMERA
  if (birdDetectionEnabled) {
    performBirdDetection();
  }
  #endif
 
   // Read sensors periodically
   unsigned long currentMillis = millis();
   if (currentMillis - lastSensorUpdate >= SENSOR_UPDATE_INTERVAL) {
     lastSensorUpdate = currentMillis;
     readSensors();
     sendSensorData();
   }
 
   delay(10);
 }
 
 // ===========================
 // Hardware Setup Functions
 // ===========================
 void setupStepper() {
   pinMode(STEPPER_ENABLE_PIN, OUTPUT);
   digitalWrite(STEPPER_ENABLE_PIN, LOW);
   stepper.setMaxSpeed(1000);
   stepper.setAcceleration(500);
   stepper.setCurrentPosition(0);
   Serial.println("✅ Stepper motor initialized");
 }
 
 void setupSensors() {
   pinMode(SPEAKER_PIN, OUTPUT);
   digitalWrite(SPEAKER_PIN, LOW);
   dht.begin();
   Serial.println("✅ DHT22 sensor initialized");
 }
 
 void setupDFPlayer() {
   dfPlayerSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX, DFPLAYER_TX);
   delay(100);
 
   if (dfPlayer.begin(dfPlayerSerial)) {
     hasDFPlayer = true;
     dfPlayer.volume(volumeLevel);
     Serial.println("✅ DFPlayer Mini initialized");
   } else {
     Serial.println("⚠️ DFPlayer Mini not found - using speaker relay");
     hasDFPlayer = false;
   }
 }
 
 void setupRS485() {
   Serial2.begin(4800, SERIAL_8N1, RS485_RX, RS485_TX);
   pinMode(RS485_RE, OUTPUT);
   digitalWrite(RS485_RE, LOW);
 
   // Test sensor
   delay(100);
   float testRead = readRS485Sensor(cmd_humidity);
   if (testRead > -900) {
     hasRS485Sensor = true;
     Serial.println("✅ RS485 soil sensor initialized");
   } else {
     Serial.println("⚠️ RS485 sensor not found - using analog sensor");
     hasRS485Sensor = false;
   }
 }
 
 void setupServos() {
   Wire.begin(SERVO_SDA, SERVO_SCL);
   pwm.begin();
   pwm.setPWMFreq(50);
 
   // Test servos
   delay(100);
   setServoAngle(SERVO_ARM1, 90);
   setServoAngle(SERVO_ARM2, 90);
   delay(100);
 
   hasServos = true;
   Serial.println("✅ PCA9685 servos initialized");
 }
 
void setupBirdDetection() {
#if !DISABLE_CAMERA
   prevGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);
   currGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);
 
   if (!prevGrayBuffer || !currGrayBuffer) {
     Serial.println("❌ Failed to allocate detection buffers");
     birdDetectionEnabled = false;
     return;
   }
 
   memset(prevGrayBuffer, 0, GRAY_BUFFER_SIZE);
   memset(currGrayBuffer, 0, GRAY_BUFFER_SIZE);
   updateDetectionSensitivity();
   Serial.println("✅ Bird detection initialized");
#else
  // Camera disabled: skip allocation and detection
  birdDetectionEnabled = false;
  Serial.println("ℹ️ Camera disabled - bird detection off");
#endif
 }
 
 // ===========================
 // Sensor Functions
 // ===========================
 void readSensors() {
   // Read DHT22 (backup sensor)
   dhtTemperature = dht.readTemperature();
   dhtHumidity = dht.readHumidity();
   if (isnan(dhtTemperature)) dhtTemperature = 0.0;
   if (isnan(dhtHumidity)) dhtHumidity = 0.0;
 
   // Read RS485 soil sensor if available
   if (hasRS485Sensor) {
     soilHumidity = readRS485Sensor(cmd_humidity) / 10.0;
     soilTemperature = readRS485Sensor(cmd_temp) / 10.0;
     soilConductivity = readRS485Sensor(cmd_conductivity);
     soilPH = readRS485Sensor(cmd_ph) / 10.0;
   }
 }
 
 float readRS485Sensor(const byte *cmd) {
   digitalWrite(RS485_RE, HIGH);
   delay(10);
   for (uint8_t i = 0; i < 8; i++) Serial2.write(cmd[i]);
   Serial2.flush();
   digitalWrite(RS485_RE, LOW);
   delay(10);
 
   int i = 0;
   while (Serial2.available() > 0 && i < 7) {
     sensorValues[i] = Serial2.read();
     i++;
   }
   if (i < 5) return -999;
   int raw = (sensorValues[3] << 8) | sensorValues[4];
   return raw;
 }
 
 // ===========================
 // Audio Functions
 // ===========================
 void playTrack(int track) {
   if (!hasDFPlayer) {
     soundAlarm(2000);
     return;
   }
 
   // Skip track 3
   if (track == 3) track = 4;
   if (track > totalTracks) track = 1;
   if (track == 3) track = 4;
 
   currentTrack = track;
   dfPlayer.play(track);
   audioPlaying = true;
   Serial.printf("🎵 Playing track %d\n", track);
 }
 
 void stopAudio() {
   if (hasDFPlayer) {
     dfPlayer.stop();
   }
   audioPlaying = false;
   Serial.println("⏸️ Audio stopped");
 }
 
 void nextTrack() {
   currentTrack++;
   if (currentTrack == 3) currentTrack = 4;
   if (currentTrack > totalTracks) currentTrack = 1;
   playTrack(currentTrack);
 }
 
 void setVolume(int vol) {
   volumeLevel = constrain(vol, 0, 30);
   if (hasDFPlayer) {
     dfPlayer.volume(volumeLevel);
   }
   Serial.printf("🔊 Volume: %d\n", volumeLevel);
 }
 
 // ===========================
 // Servo Functions
 // ===========================
 void setServoAngle(int servo, int angle) {
   angle = constrain(angle, 0, 180);
   int pulse = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
   pwm.setPWM(servo, 0, pulse);
 
   if (servo == SERVO_ARM1) leftArmAngle = angle;
   else if (servo == SERVO_ARM2) rightArmAngle = angle;
 }
 
 void updateServoOscillation() {
   unsigned long now = millis();
   if (now - lastServoUpdate >= servoOscillationSpeed) {
     lastServoUpdate = now;
 
     leftArmAngle += servoDirection * 5;
     rightArmAngle += servoDirection * 5;
 
     if (leftArmAngle >= 180 || leftArmAngle <= 0) {
       servoDirection = -servoDirection;
     }
 
     setServoAngle(SERVO_ARM1, leftArmAngle);
     setServoAngle(SERVO_ARM2, 180 - rightArmAngle);  // Mirror movement
   }
 }
 
 // ===========================
 // Stepper Motor Functions
 // ===========================
 void rotateHead(int targetDegrees) {
   targetDegrees = constrain(targetDegrees, -180, 180);
   long targetSteps = (long)((float)targetDegrees / 360.0 * STEPS_PER_REVOLUTION);
   stepper.moveTo(targetSteps);
   currentHeadPosition = targetDegrees;
   Serial.printf("🔄 Head to: %d°\n", targetDegrees);
 }
 
 void soundAlarm(int duration) {
   Serial.println("📢 Sounding alarm!");
   digitalWrite(SPEAKER_PIN, HIGH);
   delay(duration);
   digitalWrite(SPEAKER_PIN, LOW);
 }
 
 // ===========================
 // WebSocket Functions
 // ===========================
 void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                      AwsEventType type, void *arg, uint8_t *data, size_t len) {
   switch (type) {
     case WS_EVT_CONNECT:
       Serial.printf("📱 Client #%u connected\n", client->id());
       sendSensorData();
       break;
     case WS_EVT_DISCONNECT:
       Serial.printf("📱 Client #%u disconnected\n", client->id());
       break;
     case WS_EVT_DATA:
       handleWebSocketMessage(arg, data, len);
       break;
     default:
       break;
   }
 }
 
 void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
   AwsFrameInfo *info = (AwsFrameInfo*)arg;
   if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
     data[len] = 0;
     String message = String((char*)data);
 
     StaticJsonDocument<200> doc;
     DeserializationError error = deserializeJson(doc, message);
     if (error) {
       Serial.printf("❌ JSON error: %s\n", error.c_str());
       return;
     }
 
     const char* command = doc["command"];
     int value = doc["value"] | 0;
 
     // Audio Commands
     if (strcmp(command, "PLAY_TRACK") == 0) {
       playTrack(value);
     }
     else if (strcmp(command, "STOP_AUDIO") == 0) {
       stopAudio();
     }
     else if (strcmp(command, "NEXT_TRACK") == 0) {
       nextTrack();
     }
     else if (strcmp(command, "SET_VOLUME") == 0) {
       setVolume(value);
     }
     // Servo Commands
     else if (strcmp(command, "SET_SERVO_ANGLE") == 0) {
       int servo = doc["servo"] | 0;
       setServoAngle(servo, value);
     }
     else if (strcmp(command, "TOGGLE_SERVO_OSCILLATION") == 0) {
       servoOscillating = !servoOscillating;
       Serial.printf("🦾 Oscillation: %s\n", servoOscillating ? "ON" : "OFF");
     }
     else if (strcmp(command, "SET_OSCILLATION_SPEED") == 0) {
       servoOscillationSpeed = constrain(value, 10, 100);
     }
     // Head Rotation Commands
     else if (strcmp(command, "ROTATE_HEAD_LEFT") == 0) {
       rotateHead(currentHeadPosition + (value ? value : 90));
     }
     else if (strcmp(command, "ROTATE_HEAD_RIGHT") == 0) {
       rotateHead(currentHeadPosition - (value ? value : 90));
     }
     else if (strcmp(command, "ROTATE_HEAD_CENTER") == 0) {
       rotateHead(0);
     }
     // Detection Commands
     else if (strcmp(command, "TOGGLE_DETECTION") == 0) {
       birdDetectionEnabled = !birdDetectionEnabled;
       Serial.printf("🐦 Detection: %s\n", birdDetectionEnabled ? "ON" : "OFF");
     }
     else if (strcmp(command, "SET_SENSITIVITY") == 0) {
       detectionSensitivity = constrain(value, 1, 3);
       updateDetectionSensitivity();
     }
     else if (strcmp(command, "RESET_BIRD_COUNT") == 0) {
       birdsDetectedToday = 0;
     }
    // Camera Commands
    #if !DISABLE_CAMERA
    else if (strcmp(command, "SET_BRIGHTNESS") == 0) {
      cameraBrightness = constrain(value, -2, 2);
      applyCameraSettings();
    }
    else if (strcmp(command, "SET_CONTRAST") == 0) {
      cameraContrast = constrain(value, -2, 2);
      applyCameraSettings();
    }
    else if (strcmp(command, "TOGGLE_GRAYSCALE") == 0) {
      grayscaleMode = !grayscaleMode;
      applyCameraSettings();
    }
    #endif
     // System Commands
     else if (strcmp(command, "SOUND_ALARM") == 0) {
       if (hasDFPlayer) playTrack(currentTrack);
       else soundAlarm(value ? value : 2000);
     }
     else if (strcmp(command, "RESET_SYSTEM") == 0) {
       ESP.restart();
     }
   }
 }
 
 void sendSensorData() {
   StaticJsonDocument<768> doc;
 
   // Motion & Basic Sensors
   doc["motion"] = motionDetected;
   doc["headPosition"] = currentHeadPosition;
 
   // DHT22 (backup sensor)
   doc["dhtTemperature"] = dhtTemperature;
   doc["dhtHumidity"] = dhtHumidity;
 
   // RS485 Soil Sensor
   doc["soilHumidity"] = hasRS485Sensor ? soilHumidity : dhtHumidity;
   doc["soilTemperature"] = hasRS485Sensor ? soilTemperature : dhtTemperature;
   doc["soilConductivity"] = hasRS485Sensor ? soilConductivity : 0;
   doc["ph"] = hasRS485Sensor ? soilPH : 7.0;
 
   // Audio State
   doc["currentTrack"] = currentTrack;
   doc["volume"] = volumeLevel;
   doc["audioPlaying"] = audioPlaying;
 
   // Servo State
   doc["leftArmAngle"] = leftArmAngle;
   doc["rightArmAngle"] = rightArmAngle;
   doc["oscillating"] = servoOscillating;
 
   // Bird Detection
   doc["birdDetectionEnabled"] = birdDetectionEnabled;
   doc["birdsDetectedToday"] = birdsDetectedToday;
   doc["detectionSensitivity"] = detectionSensitivity;
 
   // Hardware Capabilities
   doc["hasDFPlayer"] = hasDFPlayer;
   doc["hasRS485Sensor"] = hasRS485Sensor;
   doc["hasServos"] = hasServos;
 
   doc["timestamp"] = millis();
 
   String output;
   serializeJson(doc, output);
   ws.textAll(output);
 }
 
 // ===========================
 // Bird Detection Functions
 // ===========================
 void updateDetectionSensitivity() {
   switch (detectionSensitivity) {
     case 1:
       detectionThreshold = 40;
       minBirdSize = 2000;
       maxBirdSize = 40000;
       break;
     case 2:
       detectionThreshold = 25;
       minBirdSize = 1000;
       maxBirdSize = 30000;
       break;
     case 3:
       detectionThreshold = 15;
       minBirdSize = 500;
       maxBirdSize = 25000;
       break;
   }
 }
 
void performBirdDetection() {
#if !DISABLE_CAMERA
   currentFrame = esp_camera_fb_get();
   if (!currentFrame) return;
 
   convertToGrayscale(currentFrame, currGrayBuffer);
 
   static bool firstFrame = true;
   if (!firstFrame && detectMotion()) {
     unsigned long now = millis();
     if (now - lastDetectionTime > DETECTION_COOLDOWN) {
       lastDetectionTime = now;
       birdsDetectedToday++;
 
       Serial.println("🐦 BIRD DETECTED!");
 
       // Trigger response
       if (hasDFPlayer) playTrack(currentTrack);
       else soundAlarm(2000);
 
       if (hasServos) {
         servoOscillating = true;  // Start arm movement
       }
 
       rotateHead(currentHeadPosition + 45);
 
       // Send alert
       StaticJsonDocument<256> alertDoc;
       alertDoc["type"] = "bird_detection";
       alertDoc["message"] = "Nadetect ang ibon!";
       alertDoc["count"] = birdsDetectedToday;
       alertDoc["timestamp"] = millis();
 
       String alertMsg;
       serializeJson(alertDoc, alertMsg);
       ws.textAll(alertMsg);
     }
   } else {
     firstFrame = false;
   }
 
   uint8_t *temp = prevGrayBuffer;
   prevGrayBuffer = currGrayBuffer;
   currGrayBuffer = temp;
 
   esp_camera_fb_return(currentFrame);
#else
  // no-op when camera disabled
#endif
 }
 
void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer) {
#if !DISABLE_CAMERA
   if (fb->format == PIXFORMAT_GRAYSCALE) {
     memcpy(grayBuffer, fb->buf, min((size_t)GRAY_BUFFER_SIZE, fb->len));
   } else {
     for (int i = 0; i < GRAY_BUFFER_SIZE && i < fb->len; i++) {
       grayBuffer[i] = fb->buf[i];
     }
   }
#endif
 }
 
bool detectMotion() {
#if !DISABLE_CAMERA
   int changedPixels = 0;
   int totalPixels = 0;
   int movementX = 0;
   int movementY = 0;
 
   for (int y = detectionZoneTop; y < detectionZoneBottom; y++) {
     for (int x = detectionZoneLeft; x < detectionZoneRight; x++) {
       int idx = y * 320 + x;
       if (idx >= GRAY_BUFFER_SIZE) continue;
 
       int diff = abs(currGrayBuffer[idx] - prevGrayBuffer[idx]);
       if (diff > detectionThreshold) {
         changedPixels++;
         movementX += x;
         movementY += y;
       }
       totalPixels++;
     }
   }
 
   if (changedPixels > 0) {
     int avgY = movementY / changedPixels;
     bool sizeMatch = (changedPixels >= minBirdSize && changedPixels <= maxBirdSize);
     bool positionMatch = (avgY < (detectionZoneBottom * 0.7));
     float movementPercent = (float)changedPixels / totalPixels * 100.0;
 
     return (sizeMatch && positionMatch && movementPercent > 1.0);
   }
   return false;
#else
  return false;
#endif
 }
 
void applyCameraSettings() {
#if !DISABLE_CAMERA
   sensor_t *s = esp_camera_sensor_get();
   if (!s) return;
 
   s->set_brightness(s, cameraBrightness);
   s->set_contrast(s, cameraContrast);
 
   if (grayscaleMode) {
     s->set_pixformat(s, PIXFORMAT_GRAYSCALE);
   } else {
     s->set_pixformat(s, PIXFORMAT_JPEG);
   }
 
   Serial.println("✅ Camera settings applied");
#endif
 }
 
