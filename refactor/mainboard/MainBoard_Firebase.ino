/*
 * BantayBot Main Board - ESP32 with Firebase Integration
 * Refactored Architecture: Receives detection events from Camera, handles all logic and Firebase
 *
 * Features:
 * - Firebase Firestore integration (device status, sensor data, detection logging)
 * - HTTP endpoint to receive bird detections from Camera Board
 * - DFPlayer Mini audio control
 * - RS485 4-in-1 soil sensor
 * - PCA9685 servo control (arm movement)
 * - TMC2225 stepper motor (head rotation)
 * - DHT22 temperature/humidity sensor
 * - Autonomous alarm triggering
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <AccelStepper.h>
#include <DHT.h>
#include "DFRobotDFPlayerMini.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// Firebase includes
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>

// Configuration
#include "config.h"

// ===========================
// Hardware Objects
// ===========================
HardwareSerial dfPlayerSerial(1);  // Serial1 for DFPlayer
DFRobotDFPlayerMini dfPlayer;

DHT dht(DHT_PIN, DHT_TYPE);
AccelStepper stepper(AccelStepper::DRIVER, STEPPER_STEP_PIN, STEPPER_DIR_PIN);
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

AsyncWebServer server(81);  // Port 81 for main board

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig fbConfig;

bool firebaseConnected = false;
unsigned long lastFirebaseUpdate = 0;
unsigned long lastCommandCheck = 0;
const unsigned long COMMAND_CHECK_INTERVAL = 2000;  // 2 seconds

// ===========================
// System State
// ===========================
// Audio State
int currentTrack = 1;
int volumeLevel = DEFAULT_VOLUME;
bool audioPlaying = false;

// Servo State
int leftArmAngle = 90;
int rightArmAngle = 90;
bool servoOscillating = false;
int servoOscillationCycles = 0;
const int SERVO_TARGET_CYCLES = 6;  // 6 complete cycles
unsigned long lastServoUpdate = 0;

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

// Detection State
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;

// ===========================
// Firebase Functions
// ===========================

void tokenCallback(TokenInfo info) {
  if (info.status == token_status_error) {
    Serial.printf("Token error: %s\n", info.error.message.c_str());
  }
}

void initializeFirebase() {
  Serial.println("🔥 Initializing Firebase...");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());

  // Configure Firebase
  fbConfig.api_key = API_KEY;
  fbConfig.token_status_callback = tokenCallback;
  fbConfig.timeout.serverResponse = 10 * 1000;
  fbConfig.timeout.socketConnection = 10 * 1000;

  // Initialize Firebase
  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);

  // Sign up anonymously
  Serial.println("🔐 Signing up anonymously...");
  if (Firebase.signUp(&fbConfig, &auth, "", "")) {
    Serial.println("✅ Anonymous sign up successful!");
  } else {
    Serial.printf("⚠️ Sign up error: %s\n", fbConfig.signer.signupError.message.c_str());
  }

  // Wait for Firebase to be ready
  Serial.println("⏳ Waiting for Firebase...");
  int attempts = 0;
  while (!Firebase.ready() && attempts < 30) {
    Serial.print(".");
    delay(1000);
    attempts++;
  }

  if (Firebase.ready()) {
    firebaseConnected = true;
    Serial.println("\n✅ Firebase connected!");
    Serial.printf("📧 User ID: %s\n", auth.token.uid.c_str());
    updateDeviceStatus();
  } else {
    firebaseConnected = false;
    Serial.println("\n❌ Firebase connection failed");
  }
}

void updateDeviceStatus() {
  if (!firebaseConnected) return;

  FirebaseJson json;
  json.set("fields/ip_address/stringValue", WiFi.localIP().toString());
  json.set("fields/last_seen/integerValue", String(millis()));
  json.set("fields/status/stringValue", "online");
  json.set("fields/firmware_version/stringValue", "2.0.0-refactor");
  json.set("fields/heap_free/integerValue", String(ESP.getFreeHeap()));

  String path = "devices/" + String(MAIN_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("✅ Device status updated");
  } else {
    Serial.println("❌ Status update failed: " + fbdo.errorReason());
  }
}

void updateSensorData() {
  if (!firebaseConnected) return;

  FirebaseJson json;
  json.set("fields/soilHumidity/doubleValue", soilHumidity);
  json.set("fields/soilTemperature/doubleValue", soilTemperature);
  json.set("fields/soilConductivity/doubleValue", soilConductivity);
  json.set("fields/ph/doubleValue", soilPH);
  json.set("fields/currentTrack/integerValue", String(currentTrack));
  json.set("fields/volume/integerValue", String(volumeLevel));
  json.set("fields/servoActive/booleanValue", servoOscillating);
  json.set("fields/headPosition/integerValue", String(currentHeadPosition));
  json.set("fields/timestamp/integerValue", String(millis()));

  String path = "sensor_data/" + String(MAIN_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("✅ Sensor data updated");
  } else {
    Serial.println("❌ Sensor update failed: " + fbdo.errorReason());
  }
}

void logBirdDetection(String imageUrl, int birdSize, int confidence, String detectionZone) {
  if (!firebaseConnected) return;

  Serial.println("📝 Logging bird detection to Firestore...");

  FirebaseJson json;
  json.set("fields/deviceId/stringValue", CAMERA_DEVICE_ID);
  json.set("fields/timestamp/integerValue", String(millis()));
  json.set("fields/imageUrl/stringValue", imageUrl);
  json.set("fields/birdSize/integerValue", String(birdSize));
  json.set("fields/confidence/integerValue", String(confidence));
  json.set("fields/detectionZone/stringValue", detectionZone);
  json.set("fields/triggered/booleanValue", true);

  String path = "detection_history";

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
    Serial.println("✅ Detection logged to Firestore!");
    birdsDetectedToday++;
  } else {
    Serial.println("❌ Failed to log detection: " + fbdo.errorReason());
  }
}

// ===========================
// RS485 Soil Sensor Functions
// ===========================

byte readRS485(const byte* query, byte* values) {
  // Set RS485 to transmit mode
  digitalWrite(RS485_RE, HIGH);
  delay(10);

  // Send query
  Serial2.write(query, 8);
  Serial2.flush();

  // Set RS485 to receive mode
  digitalWrite(RS485_RE, LOW);
  delay(100);

  // Read response
  byte index = 0;
  unsigned long startTime = millis();
  while (Serial2.available() && index < 11) {
    values[index++] = Serial2.read();
    if (millis() - startTime > 500) break;  // Timeout
  }

  return index;
}

void readRS485Sensor() {
  // Read humidity
  if (readRS485(cmd_humidity, sensorValues) >= 7) {
    soilHumidity = ((sensorValues[3] << 8) | sensorValues[4]) / 10.0;
  }
  delay(100);

  // Read temperature
  if (readRS485(cmd_temp, sensorValues) >= 7) {
    soilTemperature = ((sensorValues[3] << 8) | sensorValues[4]) / 10.0;
  }
  delay(100);

  // Read conductivity
  if (readRS485(cmd_conductivity, sensorValues) >= 7) {
    soilConductivity = ((sensorValues[3] << 8) | sensorValues[4]);
  }
  delay(100);

  // Read pH
  if (readRS485(cmd_ph, sensorValues) >= 7) {
    soilPH = ((sensorValues[3] << 8) | sensorValues[4]) / 10.0;
  }
}

// ===========================
// Audio Functions
// ===========================

void playAudio(int track) {
  // Skip track 3 as specified
  if (track == 3) {
    Serial.println("⚠️  Track 3 is disabled, skipping");
    return;
  }

  if (track >= 1 && track <= TOTAL_TRACKS) {
    dfPlayer.play(track);
    currentTrack = track;
    audioPlaying = true;
    Serial.printf("🎵 Playing track %d\n", track);
  }
}

void stopAudio() {
  dfPlayer.pause();
  audioPlaying = false;
  Serial.println("⏸️  Audio stopped");
}

void setVolume(int level) {
  if (level >= 0 && level <= 30) {
    dfPlayer.volume(level);
    volumeLevel = level;
    Serial.printf("🔊 Volume set to %d\n", level);
  }
}

// ===========================
// Servo Functions
// ===========================

void setServoAngle(uint8_t channel, int angle) {
  int pulse = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
  pwm.setPWM(channel, 0, pulse);
}

void startServoOscillation() {
  servoOscillating = true;
  servoOscillationCycles = 0;
  leftArmAngle = 90;
  rightArmAngle = 90;
  Serial.println("👋 Starting arm oscillation (6 cycles)");
}

void updateServoOscillation() {
  if (!servoOscillating) return;

  unsigned long currentTime = millis();
  if (currentTime - lastServoUpdate < 30) return;  // 30ms update rate

  lastServoUpdate = currentTime;

  // Oscillate between 0 and 180 degrees
  leftArmAngle += 3;
  rightArmAngle -= 3;

  if (leftArmAngle >= 180 || leftArmAngle <= 0) {
    servoOscillationCycles++;
    if (servoOscillationCycles >= SERVO_TARGET_CYCLES) {
      servoOscillating = false;
      leftArmAngle = 90;
      rightArmAngle = 90;
      setServoAngle(SERVO_ARM1, leftArmAngle);
      setServoAngle(SERVO_ARM2, rightArmAngle);
      Serial.println("✅ Oscillation complete");
      return;
    }
  }

  // Constrain angles
  leftArmAngle = constrain(leftArmAngle, 0, 180);
  rightArmAngle = constrain(rightArmAngle, 0, 180);

  setServoAngle(SERVO_ARM1, leftArmAngle);
  setServoAngle(SERVO_ARM2, rightArmAngle);
}

// ===========================
// Stepper Motor Functions
// ===========================

void rotateHead(int targetDegrees) {
  long targetSteps = (long)targetDegrees * STEPS_PER_REVOLUTION / 360;
  stepper.moveTo(targetSteps);
  currentHeadPosition = targetDegrees;
  Serial.printf("🔄 Rotating head to %d degrees\n", targetDegrees);
}

// ===========================
// Alarm Functions
// ===========================

void triggerAlarmSequence() {
  Serial.println("🚨 TRIGGERING ALARM SEQUENCE!");

  // Play audio (random track, skip track 3)
  int track = random(1, TOTAL_TRACKS + 1);
  if (track == 3) track = 4;  // Skip track 3
  playAudio(track);

  // Start servo oscillation
  startServoOscillation();

  // Rotate head (random direction)
  int headAngle = random(0, 2) == 0 ? -90 : 90;
  rotateHead(headAngle);

  Serial.println("✅ Alarm sequence initiated");
}

// ===========================
// HTTP Endpoints
// ===========================

void setupHTTPEndpoints() {
  // Bird detection endpoint - receives notifications from camera
  server.on("/bird_detected", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      Serial.println("📡 Received bird detection from camera!");

      // Parse JSON payload
      DynamicJsonDocument doc(1024);
      DeserializationError error = deserializeJson(doc, data, len);

      if (error) {
        Serial.println("❌ JSON parsing failed");
        request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
      }

      // Extract data
      String deviceId = doc["deviceId"].as<String>();
      String imageUrl = doc["imageUrl"].as<String>();
      int birdSize = doc["birdSize"];
      int confidence = doc["confidence"];
      String detectionZone = doc["detectionZone"].as<String>();

      Serial.printf("🐦 Detection: Size=%d, Confidence=%d%%\n", birdSize, confidence);
      Serial.println("🔗 Image URL: " + imageUrl);

      // Log to Firestore
      logBirdDetection(imageUrl, birdSize, confidence, detectionZone);

      // Trigger alarm
      triggerAlarmSequence();

      // Respond to camera
      request->send(200, "application/json", "{\"status\":\"ok\",\"action\":\"alarm_triggered\"}");
    }
  );

  // Status endpoint
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    DynamicJsonDocument doc(512);
    doc["device"] = "main_board";
    doc["status"] = "online";
    doc["firebase"] = firebaseConnected;
    doc["soilHumidity"] = soilHumidity;
    doc["soilTemperature"] = soilTemperature;
    doc["soilConductivity"] = soilConductivity;
    doc["ph"] = soilPH;
    doc["currentTrack"] = currentTrack;
    doc["volume"] = volumeLevel;
    doc["servoActive"] = servoOscillating;
    doc["headPosition"] = currentHeadPosition;
    doc["birdsToday"] = birdsDetectedToday;
    doc["freeHeap"] = ESP.getFreeHeap();

    String jsonString;
    serializeJson(doc, jsonString);
    request->send(200, "application/json", jsonString);
  });

  // Manual alarm trigger endpoint
  server.on("/trigger-alarm", HTTP_GET, [](AsyncWebServerRequest *request) {
    triggerAlarmSequence();
    request->send(200, "application/json", "{\"status\":\"alarm_triggered\"}");
  });

  // Audio control endpoint
  server.on("/play", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("track")) {
      int track = request->getParam("track")->value().toInt();
      playAudio(track);
      request->send(200, "application/json", "{\"status\":\"playing\"}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Missing track parameter\"}");
    }
  });

  // Volume control endpoint
  server.on("/volume", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("level")) {
      int level = request->getParam("level")->value().toInt();
      setVolume(level);
      request->send(200, "application/json", "{\"status\":\"volume_set\"}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Missing level parameter\"}");
    }
  });

  // Servo control endpoint
  server.on("/move-arms", HTTP_GET, [](AsyncWebServerRequest *request) {
    startServoOscillation();
    request->send(200, "application/json", "{\"status\":\"oscillating\"}");
  });

  // Head rotation endpoint
  server.on("/rotate-head", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("angle")) {
      int angle = request->getParam("angle")->value().toInt();
      rotateHead(angle);
      request->send(200, "application/json", "{\"status\":\"rotating\"}");
    } else {
      request->send(400, "application/json", "{\"error\":\"Missing angle parameter\"}");
    }
  });

  Serial.println("✅ HTTP endpoints configured");
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("🤖 BantayBot Main Board with Firebase - Starting...");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());

  // Initialize pins
  pinMode(RS485_RE, OUTPUT);
  pinMode(STEPPER_ENABLE_PIN, OUTPUT);
  pinMode(SPEAKER_PIN, OUTPUT);
  digitalWrite(RS485_RE, LOW);
  digitalWrite(STEPPER_ENABLE_PIN, HIGH); // Disable stepper initially
  digitalWrite(SPEAKER_PIN, LOW);

  // Initialize I2C for servos
  Wire.begin(SERVO_SDA, SERVO_SCL);
  pwm.begin();
  pwm.setPWMFreq(SERVO_FREQ);

  // Initialize servos to center position
  setServoAngle(SERVO_ARM1, 90);
  setServoAngle(SERVO_ARM2, 90);

  // Initialize RS485 for soil sensor
  Serial2.begin(4800, SERIAL_8N1, RS485_RX, RS485_TX);

  // Initialize DFPlayer Mini
  dfPlayerSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX, DFPLAYER_TX);
  delay(500);
  if (!dfPlayer.begin(dfPlayerSerial)) {
    Serial.println("❌ DFPlayer Mini initialization failed!");
  } else {
    Serial.println("✅ DFPlayer Mini initialized");
    dfPlayer.volume(volumeLevel);
  }

  // Initialize DHT sensor
  dht.begin();

  // Initialize stepper motor
  stepper.setMaxSpeed(1000);
  stepper.setAcceleration(500);

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📶 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.println("📍 IP address: " + WiFi.localIP().toString());

  // Initialize Firebase
  initializeFirebase();

  // Setup HTTP endpoints
  setupHTTPEndpoints();

  // Start HTTP server
  server.begin();
  Serial.println("🌐 HTTP server started on port 81");

  Serial.println("🚀 BantayBot Main Board ready!");
  Serial.println("🔥 Firebase: " + String(firebaseConnected ? "ENABLED" : "DISABLED"));
  Serial.printf("💾 Final free heap: %d bytes\n", ESP.getFreeHeap());
}

// ===========================
// Firebase Command Polling
// ===========================

void checkFirebaseCommands() {
  if (!firebaseConnected) return;
  if (millis() - lastCommandCheck < COMMAND_CHECK_INTERVAL) return;

  lastCommandCheck = millis();

  String path = "commands/main_001/pending";

  if (Firebase.Firestore.listDocuments(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str())) {
    // Get first pending command
    FirebaseJsonArray arr;
    fbdo.get(arr);

    if (arr.size() > 0) {
      FirebaseJson item;
      arr.get(item, 0);

      String action;
      item.get(action, "action");

      Serial.println("📥 Received command: " + action);

      // Execute command
      if (action == "play_audio") {
        int track;
        item.get(track, "params/track");
        playAudio(track);
      }
      else if (action == "set_volume") {
        int volume;
        item.get(volume, "params/volume");
        setVolume(volume);
      }
      else if (action == "oscillate_arms") {
        startServoOscillation();
      }
      else if (action == "rotate_head") {
        int angle;
        item.get(angle, "params/angle");
        rotateHead(angle);
      }
      else if (action == "trigger_alarm") {
        triggerAlarmSequence();
      }

      // Mark as completed
      String docId;
      item.get(docId, "id");
      String completePath = path + "/" + docId;

      FirebaseJson updateDoc;
      updateDoc.set("fields/status/stringValue", "completed");
      updateDoc.set("fields/completed_at/timestampValue", "now");

      Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", completePath.c_str(), updateDoc.raw());
    }
  }
}

void loop() {
  unsigned long currentTime = millis();

  // Read sensors periodically
  static unsigned long lastSensorRead = 0;
  if (currentTime - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readRS485Sensor();
    lastSensorRead = currentTime;

    Serial.printf("📊 Sensors - Humidity: %.1f%%, Temp: %.1fC, Conductivity: %.0f, pH: %.2f\n",
                  soilHumidity, soilTemperature, soilConductivity, soilPH);
  }

  // Update servo oscillation
  updateServoOscillation();

  // Run stepper motor
  stepper.run();

  // Firebase operations
  if (firebaseConnected) {
    // NEW: Check for Firebase commands
    checkFirebaseCommands();

    // Update device status
    if (currentTime - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
      updateDeviceStatus();
      updateSensorData();
      lastFirebaseUpdate = currentTime;
    }
  }

  delay(10);
}
