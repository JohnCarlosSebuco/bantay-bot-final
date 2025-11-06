/*
 * BantayBot Unified with Firebase Integration
 * Enhanced Smart Crop Protection System with Cloud Connectivity
 * Combines ESP32-CAM + DFPlayer Mini + RS485 Soil Sensor + PCA9685 Servos + Firebase
 * Designed for Filipino farmers with global mobile app access
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncWebSocket.h>
#include <ArduinoJson.h>
#include <AccelStepper.h>
#include <DHT.h>
#include "DFRobotDFPlayerMini.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

// Firebase includes
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// Camera model
#include "board_config.h"

// ===========================
// WiFi Credentials
// ===========================
const char *ssid = "HUAWEI-E5330-6AB9";
const char *password = "16yaad0a";

// ===========================
// Firebase Configuration
// ===========================
#define FIREBASE_PROJECT_ID "cloudbantaybot"
#define API_KEY "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
#define FIREBASE_AUTH_DOMAIN "cloudbantaybot.firebaseapp.com"

// Device IDs (must match React Native app)
#define MAIN_DEVICE_ID "main_001"
#define CAMERA_DEVICE_ID "camera_001"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool firebaseConnected = false;
unsigned long lastFirebaseUpdate = 0;
unsigned long lastCommandCheck = 0;
const unsigned long FIREBASE_UPDATE_INTERVAL = 2000;  // 2 seconds
const unsigned long COMMAND_CHECK_INTERVAL = 500;     // 500ms

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

// Detection State
bool detectionEnabled = true;
unsigned long lastDetectionTime = 0;
const unsigned long DETECTION_COOLDOWN = 10000; // 10 seconds

// ===========================
// Firebase Functions
// ===========================

void bantayBotTokenCallback(TokenInfo info) {
  if (info.status == token_status_error) {
    Serial.printf("Token error: %s\n", info.error.message.c_str());
  }
  Serial.printf("Token status: %s\n", info.status == token_status_ready ? "ready" : "not ready");
}

void initializeFirebase() {
  Serial.println("🔥 Initializing Firebase...");

  // Configure Firebase
  config.api_key = API_KEY;

  // Assign the token status callback function
  config.token_status_callback = bantayBotTokenCallback;

  // Set timeouts
  config.timeout.serverResponse = 10 * 1000;  // 10 seconds
  config.timeout.socketConnection = 10 * 1000;

  // Sign up anonymously - this creates a new anonymous user automatically
  Serial.println("📝 Creating anonymous Firebase user...");

  // Initialize Firebase first
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Try to sign up anonymously (this will create a new user)
  Serial.println("🔐 Signing up anonymously...");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Anonymous sign up successful!");
  } else {
    Serial.printf("⚠️ Sign up returned: %s\n", config.signer.signupError.message.c_str());
  }

  // Wait for Firebase to be ready with better error reporting
  Serial.println("⏳ Waiting for Firebase to be ready...");
  int attempts = 0;
  while (!Firebase.ready() && attempts < 30) {
    Serial.print(".");
    delay(1000);
    attempts++;

    if (attempts % 5 == 0) {
      Serial.printf("\nAttempt %d/30...\n", attempts);
      if (Firebase.isTokenExpired()) {
        Serial.println("🔄 Token expired, refreshing...");
      }
    }
  }

  if (Firebase.ready()) {
    firebaseConnected = true;
    Serial.println("\n✅ Firebase connected successfully!");
    Serial.printf("📧 User ID: %s\n", auth.token.uid.c_str());

    // Update device status
    updateDeviceStatus();
  } else {
    firebaseConnected = false;
    Serial.println("\n❌ Firebase connection failed, using HTTP fallback");
    Serial.printf("💡 Error: %s\n", config.signer.signupError.message.c_str());
    Serial.println("💡 Make sure Anonymous Authentication is enabled in Firebase Console");
  }
}

void updateDeviceStatus() {
  if (!firebaseConnected) return;

  FirebaseJson json;
  // Firestore requires fields to be formatted with type information
  json.set("fields/ip_address/stringValue", WiFi.localIP().toString());
  json.set("fields/last_seen/integerValue", String(millis()));
  json.set("fields/status/stringValue", "online");
  json.set("fields/firmware_version/stringValue", "2.0.0-firebase");
  json.set("fields/heap_free/integerValue", String(ESP.getFreeHeap()));

  String path = "devices/" + String(MAIN_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("✅ Device status updated");
  } else {
    Serial.println("❌ Failed to update device status: " + fbdo.errorReason());
  }
}

void publishSensorData() {
  if (!firebaseConnected) return;

  FirebaseJson json;
  // Firestore requires fields to be formatted with type information
  json.set("fields/soilHumidity/doubleValue", soilHumidity);
  json.set("fields/soilTemperature/doubleValue", soilTemperature);
  json.set("fields/soilConductivity/doubleValue", soilConductivity);
  json.set("fields/ph/doubleValue", soilPH);
  json.set("fields/currentTrack/integerValue", String(currentTrack));
  json.set("fields/volume/integerValue", String(volumeLevel));
  json.set("fields/servoActive/booleanValue", servoOscillating);
  json.set("fields/timestamp/integerValue", String(millis()));

  String path = "sensor_data/" + String(MAIN_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("📊 Sensor data published to Firebase");
  } else {
    Serial.println("❌ Failed to publish sensor data: " + fbdo.errorReason());
  }
}

void checkFirebaseCommands() {
  if (!firebaseConnected) return;

  String path = "commands/" + String(MAIN_DEVICE_ID) + "/pending";

  // listDocuments requires all 9 parameters: projectId, databaseId, collectionId, pageSize, pageToken, orderBy, mask, showMissing
  if (Firebase.Firestore.listDocuments(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), 100, "", "", "", false)) {
    FirebaseJsonArray arr;
    arr.setJsonArrayData(fbdo.payload().c_str());

    for (size_t i = 0; i < arr.size(); i++) {
      FirebaseJsonData result;
      arr.get(result, i);

      if (result.typeNum == FirebaseJson::JSON_OBJECT) {
        FirebaseJson commandDoc;
        commandDoc.setJsonData(result.stringValue);

        // Extract command data
        FirebaseJsonData actionData, paramsData;
        commandDoc.get(actionData, "fields/action/stringValue");
        commandDoc.get(paramsData, "fields/params/mapValue");

        String action = actionData.stringValue;
        executeFirebaseCommand(action, paramsData.stringValue);

        // Delete processed command
        String commandId = extractDocumentId(result.stringValue);
        String deletePath = path + "/" + commandId;
        Firebase.Firestore.deleteDocument(&fbdo, FIREBASE_PROJECT_ID, "", deletePath.c_str());
      }
    }
  }
}

void executeFirebaseCommand(String action, String params) {
  Serial.println("🎯 Executing Firebase command: " + action);

  if (action == "play_audio") {
    dfPlayer.play(currentTrack);
    audioPlaying = true;
  }
  else if (action == "stop_audio") {
    dfPlayer.stop();
    audioPlaying = false;
  }
  else if (action == "next_track") {
    currentTrack++;
    if (currentTrack == 3) currentTrack++; // Skip track 3
    if (currentTrack > totalTracks) currentTrack = 1;
    if (currentTrack == 3) currentTrack++;
    dfPlayer.play(currentTrack);
  }
  else if (action == "set_volume") {
    // Parse volume from params (simplified)
    int volume = params.substring(params.indexOf(":") + 1).toInt();
    if (volume >= 0 && volume <= 30) {
      volumeLevel = volume;
      dfPlayer.volume(volumeLevel);
    }
  }
  else if (action == "oscillate_arms") {
    servoOscillating = true;
    Serial.println("🤖 Starting arm oscillation");
  }
  else if (action == "stop_oscillate") {
    servoOscillating = false;
    // Return arms to center
    setServoAngle(SERVO_ARM1, 90);
    setServoAngle(SERVO_ARM2, 90);
  }
  else if (action == "trigger_alarm") {
    // Trigger full alarm sequence
    dfPlayer.play(currentTrack);
    servoOscillating = true;
    Serial.println("🚨 ALARM TRIGGERED via Firebase!");
  }

  Serial.println("✅ Command executed: " + action);
}

String extractDocumentId(String docPath) {
  // Extract document ID from Firestore path
  int lastSlash = docPath.lastIndexOf('/');
  return docPath.substring(lastSlash + 1);
}

// ===========================
// Sensor Functions
// ===========================

void readRS485Sensor() {
  // Read soil humidity
  digitalWrite(RS485_RE, HIGH);
  delay(10);
  Serial2.write(cmd_humidity, 8);
  Serial2.flush();
  delay(100);
  digitalWrite(RS485_RE, LOW);

  if (Serial2.readBytes(sensorValues, 7) == 7) {
    soilHumidity = (sensorValues[3] << 8) | sensorValues[4];
    soilHumidity = soilHumidity / 10.0; // Convert to percentage
  }

  delay(200);

  // Read soil temperature
  digitalWrite(RS485_RE, HIGH);
  delay(10);
  Serial2.write(cmd_temp, 8);
  Serial2.flush();
  delay(100);
  digitalWrite(RS485_RE, LOW);

  if (Serial2.readBytes(sensorValues, 7) == 7) {
    soilTemperature = (sensorValues[3] << 8) | sensorValues[4];
    soilTemperature = soilTemperature / 10.0; // Convert to Celsius
  }

  delay(200);

  // Read soil conductivity
  digitalWrite(RS485_RE, HIGH);
  delay(10);
  Serial2.write(cmd_conductivity, 8);
  Serial2.flush();
  delay(100);
  digitalWrite(RS485_RE, LOW);

  if (Serial2.readBytes(sensorValues, 7) == 7) {
    soilConductivity = (sensorValues[3] << 8) | sensorValues[4];
  }

  delay(200);

  // Read soil pH
  digitalWrite(RS485_RE, HIGH);
  delay(10);
  Serial2.write(cmd_ph, 8);
  Serial2.flush();
  delay(100);
  digitalWrite(RS485_RE, LOW);

  if (Serial2.readBytes(sensorValues, 7) == 7) {
    soilPH = (sensorValues[3] << 8) | sensorValues[4];
    soilPH = soilPH / 100.0; // Convert to pH scale
  }
}

// ===========================
// Servo Functions
// ===========================

void setServoAngle(int channel, int angle) {
  int pulse = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
  pwm.setPWM(channel, 0, pulse);
}

void updateServoOscillation() {
  if (!servoOscillating) return;

  if (millis() - lastServoUpdate >= servoOscillationSpeed) {
    leftArmAngle += servoDirection * 5;
    rightArmAngle -= servoDirection * 5;

    if (leftArmAngle >= 170 || leftArmAngle <= 10) {
      servoDirection *= -1;
    }

    setServoAngle(SERVO_ARM1, leftArmAngle);
    setServoAngle(SERVO_ARM2, rightArmAngle);

    lastServoUpdate = millis();
  }
}

// ===========================
// HTTP Endpoints (Fallback)
// ===========================

void setupHTTPEndpoints() {
  // Status endpoint
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    DynamicJsonDocument doc(1024);
    doc["soilHumidity"] = soilHumidity;
    doc["soilTemp"] = soilTemperature;
    doc["soilConductivity"] = soilConductivity;
    doc["ph"] = soilPH;
    doc["currentTrack"] = currentTrack;
    doc["volume"] = volumeLevel;
    doc["servoActive"] = servoOscillating;
    doc["motionDetected"] = false;
    doc["firebaseMode"] = firebaseConnected;

    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // Control endpoints (HTTP fallback)
  server.on("/play", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("track")) {
      int track = request->getParam("track")->value().toInt();
      if (track >= 1 && track <= totalTracks && track != 3) {
        currentTrack = track;
        dfPlayer.play(currentTrack);
        audioPlaying = true;
      }
    }
    request->send(200, "text/plain", "OK");
  });

  server.on("/volume", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (request->hasParam("level")) {
      int level = request->getParam("level")->value().toInt();
      if (level >= 0 && level <= 30) {
        volumeLevel = level;
        dfPlayer.volume(volumeLevel);
      }
    }
    request->send(200, "text/plain", "OK");
  });

  server.on("/move-arms", HTTP_GET, [](AsyncWebServerRequest *request) {
    servoOscillating = true;
    request->send(200, "text/plain", "OK");
  });

  server.on("/stop", HTTP_GET, [](AsyncWebServerRequest *request) {
    dfPlayer.stop();
    audioPlaying = false;
    servoOscillating = false;
    setServoAngle(SERVO_ARM1, 90);
    setServoAngle(SERVO_ARM2, 90);
    request->send(200, "text/plain", "OK");
  });
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  Serial.println("🤖 BantayBot Unified with Firebase - Starting...");

  // Initialize pins
  pinMode(RS485_RE, OUTPUT);
  pinMode(STEPPER_ENABLE_PIN, OUTPUT);
  pinMode(SPEAKER_PIN, OUTPUT);
  digitalWrite(RS485_RE, LOW);
  digitalWrite(STEPPER_ENABLE_PIN, HIGH); // Disable stepper initially

  // Initialize I2C for servos
  Wire.begin(SERVO_SDA, SERVO_SCL);
  pwm.begin();
  pwm.setPWMFreq(50); // 50Hz for servos

  // Initialize servos to center position
  setServoAngle(SERVO_ARM1, 90);
  setServoAngle(SERVO_ARM2, 90);

  // Initialize RS485 for soil sensor
  Serial2.begin(4800, SERIAL_8N1, RS485_RX, RS485_TX);

  // Initialize DFPlayer Mini
  dfPlayerSerial.begin(9600, SERIAL_8N1, DFPLAYER_RX, DFPLAYER_TX);
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
  WiFi.begin(ssid, password);
  Serial.print("📶 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.println("📍 IP address: " + WiFi.localIP().toString());

  // Initialize Firebase
  initializeFirebase();

  // Setup HTTP endpoints (fallback)
  setupHTTPEndpoints();

  // Start HTTP server
  server.begin();
  Serial.println("🌐 HTTP server started on port 80");

  Serial.println("🚀 BantayBot Unified with Firebase ready!");
  Serial.println("🔥 Firebase mode: " + String(firebaseConnected ? "ENABLED" : "DISABLED (HTTP fallback)"));
}

void loop() {
  unsigned long currentTime = millis();

  // Read sensors periodically
  static unsigned long lastSensorRead = 0;
  if (currentTime - lastSensorRead >= 2000) { // Every 2 seconds
    readRS485Sensor();
    lastSensorRead = currentTime;

    Serial.printf("📊 Sensors - Humidity: %.1f%%, Temp: %.1fC, Conductivity: %.0f, pH: %.2f\n",
                  soilHumidity, soilTemperature, soilConductivity, soilPH);
  }

  // Update servo oscillation
  updateServoOscillation();

  // Firebase operations
  if (firebaseConnected) {
    // Publish sensor data to Firebase
    if (currentTime - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
      publishSensorData();
      updateDeviceStatus();
      lastFirebaseUpdate = currentTime;
    }

    // Check for Firebase commands
    if (currentTime - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
      checkFirebaseCommands();
      lastCommandCheck = currentTime;
    }
  }

  // Handle stepper motor movements
  stepper.run();

  // Small delay to prevent overwhelming the system
  delay(10);
}