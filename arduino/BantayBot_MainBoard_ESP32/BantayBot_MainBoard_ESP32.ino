/**
 * BantayBot Main Control Board - ESP32 (WiFi + HTTP Version)
 * Based on your working esp32board-noCam.ino
 *
 * Controls: Audio (DFPlayer), Servos (PCA9685), Stepper Motor, RS485 Soil Sensor, PIR
 * Hardware: ESP32 DevKit v1 or similar
 *
 * Features: WiFi connection + HTTP API for app control
 */

#include "DFRobotDFPlayerMini.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <WiFi.h>
#include <WebServer.h>

// ===========================
// WiFi Configuration
// ===========================
const char* ssid = "YOUR_WIFI_SSID";        // Change this!
const char* password = "YOUR_WIFI_PASSWORD";  // Change this!

WebServer server(81);  // HTTP server on port 81

// ==== DFPlayer Mini ====
HardwareSerial mySerial(1);
DFRobotDFPlayerMini player;
int currentTrack = 1;
const int totalTracks = 7;   // 7 songs total
int volumeLevel = 20;

// ==== Soil Sensor (RS485, on Serial2) ====
#define RE 4        // MAX485 DE/RE pin (direction control)
#define RXD2 17     // ESP32 RX pin (connect to MAX485 RO)
#define TXD2 16     // ESP32 TX pin (connect to MAX485 DI)

// ===== Modbus Queries (Slave ID=1, FC=3, correct CRCs) =====
const byte humi[] = {0x01, 0x03, 0x00, 0x00, 0x00, 0x01, 0x84, 0x0A}; // Humidity
const byte temp[] = {0x01, 0x03, 0x00, 0x01, 0x00, 0x01, 0xD5, 0xCA}; // Temperature
const byte cond[] = {0x01, 0x03, 0x00, 0x02, 0x00, 0x01, 0x25, 0xCA}; // Conductivity
const byte phph[] = {0x01, 0x03, 0x00, 0x03, 0x00, 0x01, 0x74, 0x0A}; // pH
byte values[11];

// ==== Stepper Motor (TMC2225) ====
#define STEP_PIN 25
#define DIR_PIN 33
#define EN_PIN 32
const int STEPS_PER_LOOP = 20;
const int STEP_DELAY_US = 800;

// ==== PCA9685 Servos ====
Adafruit_PWMServoDriver pwm = Adafruit_PWMServoDriver();
#define SERVO_MIN 120
#define SERVO_MAX 600
#define SERVO_ARM1 0
#define SERVO_ARM2 1
int servoAngle = 0;
int servoStep = 3;
unsigned long lastServoUpdate = 0;
const unsigned long servoInterval = 30;

// ==== PIR Sensor ====
#define PIR_PIN 14
bool motionDetected = false;
unsigned long motionStart = 0;
unsigned long cooldownStart = 0;
bool inCooldown = false;

// ==== Soil Sensor Timing ====
unsigned long lastSoilRead = 0;
const unsigned long soilInterval = 2000;

// ==== Servo Motion Control ====
int servoCycles = 0;
bool servoActive = false;

// ===========================
// Setup
// ===========================
void setup() {
  Serial.begin(115200);
  Serial.println("\n🤖 BantayBot Main Board Starting...");

  // ---- WiFi Connection ----
  WiFi.begin(ssid, password);
  Serial.print("📡 Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected!");
    Serial.print("📍 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n⚠️ WiFi failed - continuing without network");
  }

  // ---- DFPlayer ----
  mySerial.begin(9600, SERIAL_8N1, 27, 26);
  delay(100);

  if (player.begin(mySerial)) {
    Serial.println("✅ DFPlayer Mini online");
    player.volume(volumeLevel);
  } else {
    Serial.println("⚠️ DFPlayer Mini failed! Check wiring");
    while (true) delay(1000);  // Stop here if DFPlayer fails
  }

  // ---- Soil Sensor ----
  Serial2.begin(4800, SERIAL_8N1, RXD2, TXD2);
  pinMode(RE, OUTPUT);
  digitalWrite(RE, LOW);
  Serial.println("✅ Soil Sensor Initialized");

  // ---- Stepper ----
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(EN_PIN, OUTPUT);
  digitalWrite(EN_PIN, LOW);  // Enable (active LOW)
  digitalWrite(DIR_PIN, HIGH);
  Serial.println("✅ Stepper Initialized");

  // ---- PCA9685 ----
  Wire.begin(21, 22);
  pwm.begin();
  pwm.setPWMFreq(50);
  Serial.println("✅ PCA9685 Initialized");

  // ---- PIR ----
  pinMode(PIR_PIN, INPUT);
  Serial.println("✅ PIR Initialized");

  // ---- Setup HTTP Server ----
  setupHTTPServer();

  Serial.println("🚀 BantayBot Main Board Ready!");
}

// ===========================
// Main Loop
// ===========================
void loop() {
  server.handleClient();  // Handle HTTP requests
  unsigned long now = millis();

  // ---- PIR Detection ----
  if (!inCooldown && digitalRead(PIR_PIN) == HIGH && !motionDetected) {
    motionDetected = true;
    motionStart = now;
    servoActive = true;
    servoCycles = 0;

    // Play next track
    currentTrack++;
    if (currentTrack == 3) currentTrack++;  // skip track 3
    if (currentTrack > totalTracks) currentTrack = 1;
    if (currentTrack == 3) currentTrack++;  // skip track 3 again

    player.play(currentTrack);
    Serial.print("🎯 PIR Triggered! Playing track ");
    Serial.println(currentTrack);
  }

  // ---- Motion Active: Stop Motor while playing ----
  if (motionDetected) {
    updateServos();

    if (now - motionStart >= 120000UL) {  // 2 minutes
      player.stop();
      motionDetected = false;
      inCooldown = true;
      cooldownStart = now;
      Serial.println("⏸️ Stopped after 2 minutes, entering cooldown");
    }
  } else {
    // ---- Motor Normal Run ----
    stepStepper(STEPS_PER_LOOP);
  }

  // ---- Cooldown Check (30s) ----
  if (inCooldown && (now - cooldownStart >= 30000UL)) {
    inCooldown = false;
    Serial.println("✅ Cooldown complete");
  }

  // ---- Read Soil Sensors ----
  if (now - lastSoilRead >= soilInterval) {
    lastSoilRead = now;

    float humidity = readSensor(humi) / 10.0;
    float temperature = readSensor(temp) / 10.0;
    float conductivity = readSensor(cond);
    float ph = readSensor(phph) / 10.0;

    if (humidity > -90) {  // Valid reading
      Serial.print("💧 Humidity: "); Serial.print(humidity); Serial.println("%");
      Serial.print("🌡️ Temp: "); Serial.print(temperature); Serial.println("°C");
      Serial.print("⚡ Conductivity: "); Serial.print(conductivity); Serial.println(" µS/cm");
      Serial.print("🧪 pH: "); Serial.println(ph);
      Serial.println("---");
    }
  }

  delay(10);
}

// ==== Soil Sensor Function ====
float readSensor(const byte *cmd) {
  digitalWrite(RE, HIGH);
  delay(10);

  // Send command
  for (uint8_t i = 0; i < 8; i++) Serial2.write(cmd[i]);
  Serial2.flush();

  // Back to receive
  digitalWrite(RE, LOW);
  delay(200);

  // Read response
  int i = 0;
  while (Serial2.available() > 0 && i < 7) {
    values[i] = Serial2.read();
    i++;
  }

  if (i < 5) return -999; // error, no data

  int raw = (values[3] << 8) | values[4];
  return raw;
}

// ==== Stepper Motor Non-blocking Step ====
void stepStepper(int steps) {
  for (int i = 0; i < steps; i++) {
    digitalWrite(STEP_PIN, HIGH);
    delayMicroseconds(STEP_DELAY_US);
    digitalWrite(STEP_PIN, LOW);
    delayMicroseconds(STEP_DELAY_US);
  }
}

// ==== PCA9685 Servo Update ====
void updateServos() {
  if (!servoActive) return;

  unsigned long now = millis();
  if (now - lastServoUpdate >= servoInterval) {
    lastServoUpdate = now;

    pwm.setPWM(SERVO_ARM1, 0, map(servoAngle, 0, 180, SERVO_MIN, SERVO_MAX));
    pwm.setPWM(SERVO_ARM2, 0, map(180 - servoAngle, 0, 180, SERVO_MIN, SERVO_MAX));

    servoAngle += servoStep;
    if (servoAngle >= 180 || servoAngle <= 0) {
      servoStep = -servoStep;
      servoCycles++;
      if (servoCycles >= 6) {
        servoActive = false;
        servoCycles = 0;
        Serial.println("✅ Servo cycles done");
      }
    }
  }
}

// ===========================
// HTTP Server Setup
// ===========================
void setupHTTPServer() {
  // Status endpoint
  server.on("/status", HTTP_GET, []() {
    String json = "{";
    json += "\"soilHumidity\":" + String(readSensor(humi) / 10.0) + ",";
    json += "\"soilTemp\":" + String(readSensor(temp) / 10.0) + ",";
    json += "\"soilConductivity\":" + String(readSensor(cond)) + ",";
    json += "\"ph\":" + String(readSensor(phph) / 10.0) + ",";
    json += "\"currentTrack\":" + String(currentTrack) + ",";
    json += "\"volume\":" + String(volumeLevel) + ",";
    json += "\"motionDetected\":" + String(motionDetected ? "true" : "false") + ",";
    json += "\"servoActive\":" + String(servoActive ? "true" : "false");
    json += "}";
    server.send(200, "application/json", json);
  });

  // Play track
  server.on("/play", HTTP_GET, []() {
    if (server.hasArg("track")) {
      int track = server.arg("track").toInt();
      if (track == 3) track = 4;  // Skip track 3
      if (track < 1) track = 1;
      if (track > totalTracks) track = totalTracks;
      currentTrack = track;
      player.play(track);
      server.send(200, "text/plain", "Playing track " + String(track));
    } else {
      server.send(400, "text/plain", "Missing track parameter");
    }
  });

  // Volume control
  server.on("/volume", HTTP_GET, []() {
    if (server.hasArg("level")) {
      int vol = server.arg("level").toInt();
      volumeLevel = constrain(vol, 0, 30);
      player.volume(volumeLevel);
      server.send(200, "text/plain", "Volume set to " + String(volumeLevel));
    } else {
      server.send(400, "text/plain", "Missing level parameter");
    }
  });

  // Trigger servo oscillation
  server.on("/move-arms", HTTP_GET, []() {
    servoActive = true;
    servoCycles = 0;
    servoAngle = 0;
    server.send(200, "text/plain", "Servo oscillation started");
  });

  // Stop all movement
  server.on("/stop", HTTP_GET, []() {
    servoActive = false;
    player.stop();
    server.send(200, "text/plain", "All stopped");
  });

  // TRIGGER ALARM (called by camera when bird detected)
  server.on("/trigger-alarm", HTTP_GET, []() {
    // Activate servo oscillation
    servoActive = true;
    servoCycles = 0;
    servoAngle = 0;

    // Play next track (skip track 3)
    currentTrack++;
    if (currentTrack == 3) currentTrack++;
    if (currentTrack > totalTracks) currentTrack = 1;
    if (currentTrack == 3) currentTrack++;

    player.play(currentTrack);

    Serial.println("🚨 ALARM TRIGGERED BY CAMERA! Playing track " + String(currentTrack));
    server.send(200, "text/plain", "Alarm triggered! Track " + String(currentTrack));
  });

  server.begin();
  Serial.println("✅ HTTP server started on port 81");
}
