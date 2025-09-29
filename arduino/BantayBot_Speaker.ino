#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
#include "DFRobotDFPlayerMini.h"

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Hardware Serial for DFPlayer
HardwareSerial mySerial(1);
DFRobotDFPlayerMini player;

// WebSocket server
WebSocketsServer webSocket = WebSocketsServer(81);

// Pin definitions
#define PIR_PIN 14
#define TRIG_PIN 5
#define ECHO_PIN 18
#define BUZZER_PIN 4
#define SERVO1_PIN 13
#define SERVO2_PIN 12

// Servo objects
Servo servo1;
Servo servo2;

// Sound alarm variables
bool isPlaying = false;
bool motionState = false;
unsigned long lastMotionTime = 0;
const unsigned long playDuration = 30000; // 30 seconds
int currentTrack = 1;
const int totalTracks = 3;
bool speakerAlarmEnabled = true;
bool manualAlarmTriggered = false;

// Sensor variables
float temperature = 0;
float humidity = 0;
float distance = 0;
int soilMoisture = 0;

// Alert management
unsigned long lastAlertTime = 0;
const unsigned long alertCooldown = 5000; // 5 seconds between alerts

void setup() {
  Serial.begin(115200);

  // Initialize DFPlayer Mini
  mySerial.begin(9600, SERIAL_8N1, 27, 26); // RX=27, TX=26

  if (player.begin(mySerial)) {
    Serial.println("DFPlayer Mini online.");
    player.volume(25);  // Set volume (0-30)
  } else {
    Serial.println("Connecting to DFPlayer Mini failed!");
  }

  // Initialize pins
  pinMode(PIR_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Initialize servos
  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  servo1.write(90);
  servo2.write(90);

  // Connect to WiFi
  connectToWiFi();

  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  Serial.println("BantayBot with Speaker Ready!");
}

void loop() {
  webSocket.loop();

  // Check motion sensor
  checkMotionSensor();

  // Read other sensors
  readSensors();

  // Send sensor data periodically
  static unsigned long lastDataSend = 0;
  if (millis() - lastDataSend > 1000) { // Send data every second
    sendSensorData();
    lastDataSend = millis();
  }

  // Handle sound playback duration
  handleSoundPlayback();
}

void checkMotionSensor() {
  int motion = digitalRead(PIR_PIN);

  if (motion == HIGH && !motionState) {
    // Motion detected
    motionState = true;
    Serial.println("Motion detected!");
    lastMotionTime = millis();

    // Send alert to app
    if (millis() - lastAlertTime > alertCooldown) {
      sendAlert("motion", "Motion detected by PIR sensor!");
      lastAlertTime = millis();
    }

    // Start playing sound if enabled and not already playing
    if (speakerAlarmEnabled && !isPlaying) {
      startSoundAlarm();
    }
  }

  if (motion == LOW && motionState) {
    // Motion ended
    motionState = false;
    Serial.println("No motion");
  }
}

void startSoundAlarm() {
  if (!isPlaying) {
    player.play(currentTrack);
    isPlaying = true;
    Serial.print("Sound alarm started (Track ");
    Serial.print(currentTrack);
    Serial.println(")");

    // Move to next track for next detection
    currentTrack++;
    if (currentTrack > totalTracks) {
      currentTrack = 1; // loop back to first track
    }
  }
}

void stopSoundAlarm() {
  if (isPlaying) {
    player.stop();
    isPlaying = false;
    manualAlarmTriggered = false;
    Serial.println("Sound alarm stopped");
  }
}

void handleSoundPlayback() {
  // Stop sound if duration passed without motion (unless manually triggered)
  if (isPlaying && !manualAlarmTriggered && (millis() - lastMotionTime > playDuration)) {
    stopSoundAlarm();
  }
}

void readSensors() {
  // Read ultrasonic sensor for distance
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  distance = duration * 0.034 / 2;

  // Check if object is too close
  if (distance > 0 && distance < 20) {
    if (millis() - lastAlertTime > alertCooldown) {
      sendAlert("proximity", "Object detected too close!");
      lastAlertTime = millis();

      // Trigger sound alarm if enabled
      if (speakerAlarmEnabled && !isPlaying) {
        startSoundAlarm();
      }
    }
  }

  // Simulate temperature and humidity (replace with actual sensor readings)
  temperature = 25.0 + random(-50, 50) / 10.0;
  humidity = 60.0 + random(-100, 100) / 10.0;
  soilMoisture = random(200, 800);
}

void sendSensorData() {
  DynamicJsonDocument doc(256);
  doc["type"] = "data";
  doc["motion"] = motionState;
  doc["distance"] = distance;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = soilMoisture;
  doc["speakerAlarmActive"] = isPlaying;
  doc["speakerAlarmEnabled"] = speakerAlarmEnabled;

  String output;
  serializeJson(doc, output);
  webSocket.broadcastTXT(output);
}

void sendAlert(String alertType, String message) {
  DynamicJsonDocument doc(256);
  doc["type"] = "alert";
  doc["alertType"] = alertType;
  doc["message"] = message;
  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);
  webSocket.broadcastTXT(output);
}

void handleCommand(String command) {
  Serial.print("Received command: ");
  Serial.println(command);

  if (command == "MOVE_ARMS") {
    // Move servos
    servo1.write(45);
    servo2.write(135);
    delay(1000);
    servo1.write(90);
    servo2.write(90);
  }
  else if (command == "ROTATE_HEAD") {
    // Rotate servo
    for (int i = 0; i <= 180; i += 10) {
      servo1.write(i);
      delay(50);
    }
    servo1.write(90);
  }
  else if (command == "STOP_MOVEMENT") {
    // Stop all servos
    servo1.write(90);
    servo2.write(90);
    stopSoundAlarm();
  }
  else if (command == "SOUND_ALARM" || command == "START_SPEAKER_ALARM") {
    // Manually trigger sound alarm
    manualAlarmTriggered = true;
    startSoundAlarm();
  }
  else if (command == "STOP_SPEAKER_ALARM") {
    // Stop sound alarm
    stopSoundAlarm();
  }
  else if (command == "TEST_BUZZER") {
    // Test buzzer (if you still have one)
    digitalWrite(BUZZER_PIN, HIGH);
    delay(500);
    digitalWrite(BUZZER_PIN, LOW);
  }
  else if (command == "ENABLE_SPEAKER_ALARM") {
    speakerAlarmEnabled = true;
    Serial.println("Speaker alarm enabled");
  }
  else if (command == "DISABLE_SPEAKER_ALARM") {
    speakerAlarmEnabled = false;
    stopSoundAlarm();
    Serial.println("Speaker alarm disabled");
  }
  else if (command == "NEXT_TRACK") {
    // Change to next track
    currentTrack++;
    if (currentTrack > totalTracks) {
      currentTrack = 1;
    }
    if (isPlaying) {
      player.play(currentTrack);
    }
  }
  else if (command == "SET_VOLUME_LOW") {
    player.volume(10);
  }
  else if (command == "SET_VOLUME_MEDIUM") {
    player.volume(20);
  }
  else if (command == "SET_VOLUME_HIGH") {
    player.volume(30);
  }
  else if (command == "RESET_SYSTEM") {
    // Reset to defaults
    servo1.write(90);
    servo2.write(90);
    stopSoundAlarm();
    speakerAlarmEnabled = true;
    currentTrack = 1;
    player.volume(25);
  }
  else if (command == "CALIBRATE_SENSORS") {
    // Calibration routine
    Serial.println("Calibrating sensors...");
    delay(2000);
    Serial.println("Calibration complete");
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      break;

    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Connected from %s\n", num, ip.toString().c_str());

      // Send initial status
      DynamicJsonDocument doc(128);
      doc["type"] = "status";
      doc["message"] = "BantayBot connected with speaker support";
      String output;
      serializeJson(doc, output);
      webSocket.sendTXT(num, output);
      break;
    }

    case WStype_TEXT: {
      String msg = String((char*)payload);
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, msg);

      if (!error) {
        String command = doc["command"];
        if (command.length() > 0) {
          handleCommand(command);
        }
      }
      break;
    }
  }
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}