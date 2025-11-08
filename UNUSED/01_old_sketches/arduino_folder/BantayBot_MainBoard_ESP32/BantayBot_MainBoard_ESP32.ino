/**
 * BantayBot Main Control Board - ESP32 (WiFi + HTTP Version)
 * Based on your working esp32board-noCam.ino
 *
 * Controls: Audio (DFPlayer), Servos (PCA9685), Stepper Motor, RS485 Soil Sensor, PIR
 * Hardware: ESP32 DevKit v1 or similar
 *
 * Features: WiFi connection + HTTP API for app control + WiFi Manager + mDNS
 */

#include "DFRobotDFPlayerMini.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <ESPmDNS.h>

// ===========================
// WiFi Configuration with Preferences
// ===========================
Preferences preferences;
String wifiSSID = "";
String wifiPassword = "";
bool wifiConfigured = false;

// WiFi Manager AP settings
const char* apSSID = "BantayBot-Main-Setup";
const char* apPassword = "bantaybot123";  // Default password for setup AP

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

// ==== Alarm Queue System ====
bool alarmInProgress = false;
unsigned long alarmStartTime = 0;
int pendingAlarms = 0;
const int MAX_PENDING_ALARMS = 3;

// ===========================
// Setup
// ===========================
void setup() {
  Serial.begin(115200);
  Serial.println("\n🤖 BantayBot Main Board Starting...");

  // ---- WiFi Configuration with Preferences ----
  preferences.begin("bantaybot", false);
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");

  if (wifiSSID.length() > 0 && wifiPassword.length() > 0) {
    wifiConfigured = true;
    Serial.println("📡 Found saved WiFi credentials");
    Serial.print("   SSID: ");
    Serial.println(wifiSSID);

    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
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

      // Start mDNS
      if (MDNS.begin("bantaybot-main")) {
        Serial.println("✅ mDNS responder started: bantaybot-main.local");
        MDNS.addService("http", "tcp", 81);
      }
    } else {
      Serial.println("\n⚠️ WiFi connection failed - starting AP mode");
      startAPMode();
    }
  } else {
    Serial.println("⚠️ No WiFi credentials found - starting AP mode");
    startAPMode();
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

  // ---- Alarm Queue Processing ----
  if (alarmInProgress) {
    // Check if alarm should end (after 120 seconds or when servos are done)
    if ((now - alarmStartTime >= 120000UL) || (!servoActive && now - alarmStartTime >= 5000UL)) {
      player.stop();
      alarmInProgress = false;
      Serial.println("✅ Alarm completed");

      // Process next alarm from queue if any
      if (pendingAlarms > 0) {
        pendingAlarms--;
        Serial.printf("🔄 Processing next alarm from queue (%d remaining)\n", pendingAlarms);

        // Restart alarm
        alarmInProgress = true;
        alarmStartTime = now;
        servoActive = true;
        servoCycles = 0;
        servoAngle = 0;

        // Play next track
        currentTrack++;
        if (currentTrack == 3) currentTrack++;
        if (currentTrack > totalTracks) currentTrack = 1;
        if (currentTrack == 3) currentTrack++;

        player.play(currentTrack);
        Serial.println("🚨 Queued alarm triggered! Playing track " + String(currentTrack));
      }
    }
  }

  // ---- PIR Detection ----
  if (!inCooldown && digitalRead(PIR_PIN) == HIGH && !motionDetected && !alarmInProgress) {
    motionDetected = true;
    motionStart = now;
    alarmInProgress = true;
    alarmStartTime = now;
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

  // ---- Motion Active: Update Servos ----
  if (motionDetected || alarmInProgress) {
    updateServos();

    if (motionDetected && now - motionStart >= 120000UL) {  // 2 minutes
      player.stop();
      motionDetected = false;
      alarmInProgress = false;
      inCooldown = true;
      cooldownStart = now;
      Serial.println("⏸️ PIR stopped after 2 minutes, entering cooldown");
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
// WiFi Manager Functions
// ===========================
void startAPMode() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apSSID, apPassword);

  IPAddress IP = WiFi.softAPIP();
  Serial.println("🔧 Setup Mode - Access Point Started");
  Serial.print("📡 SSID: ");
  Serial.println(apSSID);
  Serial.print("🔑 Password: ");
  Serial.println(apPassword);
  Serial.print("📍 IP Address: ");
  Serial.println(IP);
  Serial.println("🌐 Open browser and go to: http://192.168.4.1");

  // Setup configuration web page
  setupConfigServer();

  // Keep running the config server
  while (true) {
    server.handleClient();
    delay(10);
  }
}

void setupConfigServer() {
  // Serve configuration page
  server.on("/", HTTP_GET, []() {
    String html = "<html><head><title>BantayBot Main Board Setup</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>body{font-family:Arial;margin:20px;background:#f0f0f0;}";
    html += ".container{max-width:400px;margin:auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
    html += "h1{color:#2196F3;text-align:center;}input,button{width:100%;padding:10px;margin:10px 0;border-radius:5px;border:1px solid #ddd;}";
    html += "button{background:#2196F3;color:white;border:none;cursor:pointer;font-size:16px;}button:hover{background:#0b7dda;}</style></head>";
    html += "<body><div class='container'><h1>🤖 BantayBot Main Board</h1><h3>WiFi Configuration</h3>";
    html += "<form action='/save' method='POST'>";
    html += "<label>WiFi SSID:</label><input name='ssid' placeholder='Enter WiFi SSID' required>";
    html += "<label>WiFi Password:</label><input name='password' type='password' placeholder='Enter WiFi Password' required>";
    html += "<button type='submit'>Save & Connect</button></form></div></body></html>";
    server.send(200, "text/html", html);
  });

  // Save WiFi credentials
  server.on("/save", HTTP_POST, []() {
    String newSSID = server.arg("ssid");
    String newPassword = server.arg("password");

    if (newSSID.length() > 0) {
      preferences.putString("ssid", newSSID);
      preferences.putString("password", newPassword);

      // Send initial response
      String html = "<html><head><title>Connecting...</title>";
      html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}";
      html += ".spinner{border:8px solid #f3f3f3;border-top:8px solid #2196F3;border-radius:50%;width:60px;height:60px;animation:spin 1s linear infinite;margin:20px auto;}";
      html += "@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head>";
      html += "<body><h1>Connecting to WiFi...</h1><div class='spinner'></div><p>Please wait...</p></body></html>";
      server.send(200, "text/html", html);

      delay(1000);

      // Now try to connect to WiFi
      WiFi.mode(WIFI_AP_STA);  // Keep AP running while connecting
      WiFi.begin(newSSID.c_str(), newPassword.c_str());

      Serial.println("Attempting WiFi connection...");
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
      }

      if (WiFi.status() == WL_CONNECTED) {
        String connectedIP = WiFi.localIP().toString();
        Serial.println("\n✅ WiFi connected!");
        Serial.print("📍 IP Address: ");
        Serial.println(connectedIP);

        // Show success page with IP (accessible at 192.168.4.1/success)
        server.on("/success", HTTP_GET, [connectedIP]() {
          String successHtml = "<html><head><title>Success!</title><meta http-equiv='refresh' content='30;url=/'>";
          successHtml += "<style>body{font-family:Arial;text-align:center;padding:30px;background:#f0f0f0;}";
          successHtml += ".success{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:500px;margin:auto;}";
          successHtml += ".ip{font-size:32px;font-weight:bold;color:#2196F3;background:#e3f2fd;padding:20px;border-radius:8px;margin:20px 0;word-break:break-all;}";
          successHtml += ".note{color:#666;font-size:14px;margin-top:20px;}</style></head>";
          successHtml += "<body><div class='success'><h1>✅ Connected!</h1>";
          successHtml += "<p>Write down this IP address:</p>";
          successHtml += "<div class='ip'>" + connectedIP + "</div>";
          successHtml += "<p><strong>Port:</strong> 81</p>";
          successHtml += "<p class='note'>⚡ Board will restart in 30 seconds...<br>Use this IP in your mobile app settings!</p>";
          successHtml += "<p class='note'>💡 Or use hostname: <strong>bantaybot-main.local</strong></p></div></body></html>";
          server.send(200, "text/html", successHtml);
        });

        // Redirect to success page
        server.sendHeader("Location", "/success");
        server.send(302);

        // Wait for user to see the IP, then restart
        delay(30000);
        ESP.restart();
      } else {
        Serial.println("\n❌ WiFi connection failed");
        String failHtml = "<html><head><title>Failed</title><meta http-equiv='refresh' content='5;url=/'>";
        failHtml += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}</style></head>";
        failHtml += "<body><h1>❌ Connection Failed</h1><p>Could not connect to WiFi.<br>Please check your credentials and try again.</p></body></html>";
        server.send(200, "text/html", failHtml);

        delay(5000);
        WiFi.mode(WIFI_AP);  // Go back to AP mode only
      }
    } else {
      server.send(400, "text/plain", "Invalid credentials");
    }
  });

  server.begin();
  Serial.println("✅ Configuration server started on port 81");
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
    if (alarmInProgress) {
      // Alarm already in progress, queue it
      if (pendingAlarms < MAX_PENDING_ALARMS) {
        pendingAlarms++;
        Serial.printf("⏸️ Alarm in progress, queued (%d pending)\n", pendingAlarms);
        server.send(200, "text/plain", "Alarm queued");
      } else {
        Serial.println("⚠️ Alarm queue full, ignoring trigger");
        server.send(503, "text/plain", "Alarm queue full");
      }
    } else {
      // Start alarm immediately
      alarmInProgress = true;
      alarmStartTime = millis();

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
    }
  });

  // Ping endpoint for connection health checks
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "text/plain", "pong");
  });

  // Info endpoint - shows current status (no Serial Monitor needed!)
  server.on("/info", HTTP_GET, []() {
    String json = "{";
    json += "\"device\":\"BantayBot Main Board\",";
    json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"hostname\":\"bantaybot-main.local\",";
    json += "\"port\":81,";
    json += "\"ssid\":\"" + WiFi.SSID() + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"uptime\":" + String(millis() / 1000) + ",";
    json += "\"freeHeap\":" + String(ESP.getFreeHeap());
    json += "}";
    server.send(200, "application/json", json);
  });

  // Diagnostics endpoint
  server.on("/diagnostics", HTTP_GET, []() {
    String json = "{";
    json += "\"device\":\"BantayBot Main Board\",";
    json += "\"uptime\":" + String(millis() / 1000) + ",";
    json += "\"wifiConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"wifiSSID\":\"" + WiFi.SSID() + "\",";
    json += "\"wifiRSSI\":" + String(WiFi.RSSI()) + ",";
    json += "\"ipAddress\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"alarmInProgress\":" + String(alarmInProgress ? "true" : "false") + ",";
    json += "\"pendingAlarms\":" + String(pendingAlarms) + ",";
    json += "\"currentTrack\":" + String(currentTrack) + ",";
    json += "\"volume\":" + String(volumeLevel) + ",";
    json += "\"motionDetected\":" + String(motionDetected ? "true" : "false") + ",";
    json += "\"servoActive\":" + String(servoActive ? "true" : "false") + ",";
    json += "\"inCooldown\":" + String(inCooldown ? "true" : "false") + ",";
    json += "\"freeHeap\":" + String(ESP.getFreeHeap());
    json += "}";
    server.send(200, "application/json", json);
  });

  // Reset configuration endpoint
  server.on("/reset-config", HTTP_GET, []() {
    String html = "<html><head><title>Reset Configuration</title>";
    html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}</style></head>";
    html += "<body><h1>⚠️ Reset Configuration?</h1>";
    html += "<p>This will clear WiFi credentials and restart in setup mode.</p>";
    html += "<form action='/reset-config' method='POST'>";
    html += "<button type='submit' style='padding:15px 30px;background:#f44336;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;'>Reset & Restart</button>";
    html += "</form></body></html>";
    server.send(200, "text/html", html);
  });

  server.on("/reset-config", HTTP_POST, []() {
    preferences.clear();
    String html = "<html><head><title>Reset Complete</title><meta http-equiv='refresh' content='3;url=/'>";
    html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}</style></head>";
    html += "<body><h1>✅ Configuration Reset</h1><p>Restarting in setup mode...</p></body></html>";
    server.send(200, "text/html", html);
    delay(2000);
    ESP.restart();
  });

  server.begin();
  Serial.println("✅ HTTP server started on port 81");
}
