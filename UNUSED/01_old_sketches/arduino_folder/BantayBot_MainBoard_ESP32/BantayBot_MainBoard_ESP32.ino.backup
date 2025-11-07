/**
 * BantayBot Main Control Board - ESP32
 * Controls: Audio (DFPlayer), Servos (PCA9685), Stepper Motor, RS485 Soil Sensor, PIR
 *
 * Hardware: ESP32 DevKit v1 or similar
 * Features: WebSocket API, Sensor monitoring, Motor control, Audio playback
 */

#include "DFRobotDFPlayerMini.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncWebSocket.h>
#include <ArduinoJson.h>
#include "config.h"

// ===========================
// Hardware Objects
// ===========================
HardwareSerial mySerial(1);  // DFPlayer Serial
DFRobotDFPlayerMini player;
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();

AsyncWebServer server(WEBSOCKET_PORT);
AsyncWebSocket ws("/ws");

// ===========================
// System State Variables
// ===========================
// Audio State
int currentTrack = 1;
int volumeLevel = DEFAULT_VOLUME;
bool audioPlaying = false;

// Servo State
int leftArmAngle = 90;
int rightArmAngle = 90;
bool servoActive = false;
int servoCycles = 0;
int servoAngle = 0;
int servoStep = 3;
unsigned long lastServoUpdate = 0;

// Stepper Motor State
int currentHeadPosition = 0;  // Current angle in degrees
bool stepperMoving = false;

// RS485 Soil Sensor Data
byte sensorValues[11];
float soilHumidity = 0.0;
float soilTemperature = 0.0;
float soilConductivity = 0.0;
float soilPH = 7.0;

// PIR Motion State
bool motionDetected = false;
unsigned long motionStart = 0;
unsigned long cooldownStart = 0;
bool inCooldown = false;

// Timing
unsigned long lastSensorRead = 0;

// Hardware availability flags
bool hasDFPlayer = false;
bool hasRS485Sensor = false;
bool hasServos = false;

// ===========================
// Function Declarations
// ===========================
void setupDFPlayer();
void setupRS485();
void setupServos();
void setupStepper();
void setupPIR();
float readRS485Sensor(const byte *cmd);
void readAllSensors();
void stepStepper(int steps);
void rotateHeadTo(int targetDegrees);
void updateServos();
void playTrack(int track);
void nextTrack();
void stopAudio();
void setVolume(int vol);
void setServoAngle(int servo, int angle);
void activateServoOscillation();
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                     AwsEventType type, void *arg, uint8_t *data, size_t len);
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void sendSensorData();

// ===========================
// Setup
// ===========================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n🤖 BantayBot Main Control Board Starting...");

  // WiFi Setup
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📡 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  Serial.print("📍 IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize hardware components
  setupDFPlayer();
  setupRS485();
  setupServos();
  setupStepper();
  setupPIR();

  // Setup WebSocket
  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);

  // Add health check endpoint
  server.on("/health", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "application/json", "{\"status\":\"ok\"}");
  });

  server.begin();

  Serial.print("📡 WebSocket server: ws://");
  Serial.print(WiFi.localIP());
  Serial.print(":");
  Serial.println(WEBSOCKET_PORT);
  Serial.println("✅ BantayBot Main Board Ready!");
}

// ===========================
// Main Loop
// ===========================
void loop() {
  unsigned long now = millis();
  ws.cleanupClients();

  // ---- PIR Detection ----
  if (!inCooldown && digitalRead(PIR_PIN) == HIGH && !motionDetected) {
    motionDetected = true;
    motionStart = now;
    servoActive = true;
    servoCycles = 0;

    // Play next track
    currentTrack++;
    if (currentTrack == SKIP_TRACK) currentTrack++;
    if (currentTrack > TOTAL_TRACKS) currentTrack = 1;
    if (currentTrack == SKIP_TRACK) currentTrack++;

    if (hasDFPlayer) {
      playTrack(currentTrack);
    }

    Serial.print("🎯 PIR Triggered! Playing track ");
    Serial.println(currentTrack);

    // Send alert
    StaticJsonDocument<256> alertDoc;
    alertDoc["type"] = "motion_alert";
    alertDoc["message"] = "Motion detected!";
    alertDoc["track"] = currentTrack;
    alertDoc["timestamp"] = millis();
    String alertMsg;
    serializeJson(alertDoc, alertMsg);
    ws.textAll(alertMsg);
  }

  // ---- Motion Active: Servo oscillation while playing ----
  if (motionDetected) {
    updateServos();

    if (now - motionStart >= MOTION_TIMEOUT) {
      if (hasDFPlayer) player.stop();
      motionDetected = false;
      inCooldown = true;
      cooldownStart = now;
      Serial.println("⏸️ Stopped after 2 minutes, entering cooldown");
    }
  } else {
    // ---- Motor Normal Run (if stepper needs continuous movement) ----
    // stepStepper(20);  // Uncomment if you want continuous rotation
  }

  // ---- Cooldown Check (30s) ----
  if (inCooldown && (now - cooldownStart >= MOTION_COOLDOWN)) {
    inCooldown = false;
    Serial.println("✅ Cooldown complete, ready for next detection");
  }

  // ---- Read Sensors Periodically ----
  if (now - lastSensorRead >= SENSOR_UPDATE_INTERVAL) {
    lastSensorRead = now;
    readAllSensors();
    sendSensorData();
  }

  delay(10);
}

// ===========================
// Hardware Setup Functions
// ===========================
void setupDFPlayer() {
  mySerial.begin(9600, SERIAL_8N1, DFPLAYER_RX, DFPLAYER_TX);
  delay(100);

  if (player.begin(mySerial)) {
    hasDFPlayer = true;
    player.volume(volumeLevel);
    Serial.println("✅ DFPlayer Mini initialized");
  } else {
    Serial.println("⚠️ DFPlayer Mini not found");
    hasDFPlayer = false;
  }
}

void setupRS485() {
  Serial2.begin(RS485_BAUD, SERIAL_8N1, RS485_RX, RS485_TX);
  pinMode(RS485_RE, OUTPUT);
  digitalWrite(RS485_RE, LOW);
  delay(100);

  // Test sensor
  float testRead = readRS485Sensor(CMD_HUMIDITY);
  if (testRead > -900) {
    hasRS485Sensor = true;
    Serial.println("✅ RS485 soil sensor initialized");
  } else {
    Serial.println("⚠️ RS485 sensor not found");
    hasRS485Sensor = false;
  }
}

void setupServos() {
  Wire.begin(SERVO_SDA, SERVO_SCL);
  pwm.begin();
  pwm.setPWMFreq(SERVO_FREQ);
  delay(100);

  // Set to neutral position
  setServoAngle(SERVO_ARM1, 90);
  setServoAngle(SERVO_ARM2, 90);

  hasServos = true;
  Serial.println("✅ PCA9685 servos initialized");
}

void setupStepper() {
  pinMode(STEPPER_STEP_PIN, OUTPUT);
  pinMode(STEPPER_DIR_PIN, OUTPUT);
  pinMode(STEPPER_EN_PIN, OUTPUT);
  digitalWrite(STEPPER_EN_PIN, LOW);  // Enable stepper (active LOW)
  digitalWrite(STEPPER_DIR_PIN, HIGH);
  Serial.println("✅ Stepper motor initialized");
}

void setupPIR() {
  pinMode(PIR_PIN, INPUT);
  Serial.println("✅ PIR sensor initialized");
}

// ===========================
// Sensor Functions
// ===========================
float readRS485Sensor(const byte *cmd) {
  digitalWrite(RS485_RE, HIGH);  // TX mode
  delay(10);

  // Send command
  for (uint8_t i = 0; i < 8; i++) {
    Serial2.write(cmd[i]);
  }
  Serial2.flush();

  // Back to receive mode
  digitalWrite(RS485_RE, LOW);
  delay(200);

  // Read response
  int i = 0;
  while (Serial2.available() > 0 && i < 7) {
    sensorValues[i] = Serial2.read();
    i++;
  }

  if (i < 5) return -999;  // Error: no data

  int raw = (sensorValues[3] << 8) | sensorValues[4];
  return raw;
}

void readAllSensors() {
  if (hasRS485Sensor) {
    float rawHumidity = readRS485Sensor(CMD_HUMIDITY);
    float rawTemp = readRS485Sensor(CMD_TEMPERATURE);
    float rawCond = readRS485Sensor(CMD_CONDUCTIVITY);
    float rawPH = readRS485Sensor(CMD_PH);

    if (rawHumidity > -900) soilHumidity = rawHumidity / 10.0;
    if (rawTemp > -900) soilTemperature = rawTemp / 10.0;
    if (rawCond > -900) soilConductivity = rawCond;
    if (rawPH > -900) soilPH = rawPH / 10.0;
  }
}

// ===========================
// Stepper Motor Functions
// ===========================
void stepStepper(int steps) {
  for (int i = 0; i < steps; i++) {
    digitalWrite(STEPPER_STEP_PIN, HIGH);
    delayMicroseconds(800);
    digitalWrite(STEPPER_STEP_PIN, LOW);
    delayMicroseconds(800);
  }
}

void rotateHeadTo(int targetDegrees) {
  targetDegrees = constrain(targetDegrees, -180, 180);

  int deltaDegrees = targetDegrees - currentHeadPosition;
  int stepsToMove = abs(deltaDegrees) * STEPS_PER_REVOLUTION / 360;

  // Set direction
  digitalWrite(STEPPER_DIR_PIN, deltaDegrees > 0 ? HIGH : LOW);

  // Move
  stepStepper(stepsToMove);
  currentHeadPosition = targetDegrees;

  Serial.printf("🔄 Head rotated to %d°\n", currentHeadPosition);
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

void updateServos() {
  if (!servoActive) return;

  unsigned long now = millis();
  if (now - lastServoUpdate >= SERVO_UPDATE_INTERVAL) {
    lastServoUpdate = now;

    pwm.setPWM(SERVO_ARM1, 0, map(servoAngle, 0, 180, SERVO_MIN, SERVO_MAX));
    pwm.setPWM(SERVO_ARM2, 0, map(180 - servoAngle, 0, 180, SERVO_MIN, SERVO_MAX));

    servoAngle += servoStep;
    if (servoAngle >= 180 || servoAngle <= 0) {
      servoStep = -servoStep;
      servoCycles++;
      if (servoCycles >= SERVO_OSCILLATION_CYCLES) {
        servoActive = false;
        servoCycles = 0;
        Serial.println("✅ Servo cycles complete");
      }
    }
  }
}

void activateServoOscillation() {
  servoActive = true;
  servoCycles = 0;
  servoAngle = 0;
  servoStep = 3;
  Serial.println("🦾 Servo oscillation activated");
}

// ===========================
// Audio Functions
// ===========================
void playTrack(int track) {
  if (!hasDFPlayer) {
    Serial.println("⚠️ DFPlayer not available");
    return;
  }

  // Skip track 3
  if (track == SKIP_TRACK) track = 4;
  if (track > TOTAL_TRACKS) track = 1;
  if (track == SKIP_TRACK) track = 4;

  currentTrack = track;
  player.play(track);
  audioPlaying = true;
  Serial.printf("🎵 Playing track %d\n", track);
}

void nextTrack() {
  currentTrack++;
  if (currentTrack == SKIP_TRACK) currentTrack++;
  if (currentTrack > TOTAL_TRACKS) currentTrack = 1;
  playTrack(currentTrack);
}

void stopAudio() {
  if (hasDFPlayer) {
    player.stop();
  }
  audioPlaying = false;
  Serial.println("⏸️ Audio stopped");
}

void setVolume(int vol) {
  volumeLevel = constrain(vol, 0, 30);
  if (hasDFPlayer) {
    player.volume(volumeLevel);
  }
  Serial.printf("🔊 Volume set to %d\n", volumeLevel);
}

// ===========================
// WebSocket Handlers
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

    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);
    if (error) {
      Serial.printf("❌ JSON error: %s\n", error.c_str());
      return;
    }

    const char* command = doc["command"];
    int value = doc["value"] | 0;

    Serial.printf("📨 Command: %s (value: %d)\n", command, value);

    // Movement Commands
    if (strcmp(command, "MOVE_ARMS") == 0) {
      activateServoOscillation();
    }
    else if (strcmp(command, "ROTATE_HEAD") == 0) {
      rotateHeadTo(value ? value : 45);
    }
    else if (strcmp(command, "ROTATE_HEAD_LEFT") == 0) {
      rotateHeadTo(currentHeadPosition + (value ? value : 45));
    }
    else if (strcmp(command, "ROTATE_HEAD_RIGHT") == 0) {
      rotateHeadTo(currentHeadPosition - (value ? value : 45));
    }
    else if (strcmp(command, "ROTATE_HEAD_CENTER") == 0) {
      rotateHeadTo(0);
    }
    else if (strcmp(command, "STOP_MOVEMENT") == 0) {
      servoActive = false;
      Serial.println("🛑 All movement stopped");
    }

    // Audio Commands
    else if (strcmp(command, "SOUND_ALARM") == 0) {
      playTrack(currentTrack);
    }
    else if (strcmp(command, "PLAY_TRACK") == 0) {
      playTrack(value);
    }
    else if (strcmp(command, "NEXT_TRACK") == 0) {
      nextTrack();
    }
    else if (strcmp(command, "STOP_AUDIO") == 0) {
      stopAudio();
    }
    else if (strcmp(command, "SET_VOLUME") == 0) {
      setVolume(value);
    }
    else if (strcmp(command, "TEST_BUZZER") == 0) {
      playTrack(1);  // Test with track 1
    }

    // Servo Commands
    else if (strcmp(command, "SET_SERVO_ANGLE") == 0) {
      int servo = doc["servo"] | 0;
      setServoAngle(servo, value);
    }

    // System Commands
    else if (strcmp(command, "CALIBRATE_SENSORS") == 0) {
      readAllSensors();
      Serial.println("🔧 Sensors calibrated");
    }
    else if (strcmp(command, "RESET_SYSTEM") == 0) {
      Serial.println("🔄 Resetting system...");
      delay(1000);
      ESP.restart();
    }

    // Send updated status
    sendSensorData();
  }
}

void sendSensorData() {
  StaticJsonDocument<768> doc;

  doc["type"] = "sensor_data";

  // Soil Sensor Data
  doc["soilHumidity"] = soilHumidity;
  doc["soilTemperature"] = soilTemperature;
  doc["soilConductivity"] = soilConductivity;
  doc["ph"] = soilPH;

  // Motion State
  doc["motion"] = motionDetected;
  doc["inCooldown"] = inCooldown;

  // Head Position
  doc["headPosition"] = currentHeadPosition;

  // Audio State
  doc["currentTrack"] = currentTrack;
  doc["volume"] = volumeLevel;
  doc["audioPlaying"] = audioPlaying;

  // Servo State
  doc["leftArmAngle"] = leftArmAngle;
  doc["rightArmAngle"] = rightArmAngle;
  doc["servoActive"] = servoActive;

  // Hardware Status
  doc["hasDFPlayer"] = hasDFPlayer;
  doc["hasRS485Sensor"] = hasRS485Sensor;
  doc["hasServos"] = hasServos;

  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);
  ws.textAll(output);
}
