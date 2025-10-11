#include "esp_camera.h"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncWebSocket.h>
#include <ArduinoJson.h>
#include <AccelStepper.h>
#include <DHT.h>

// ===========================
// Select camera model
// ===========================
// Make sure in board_config.h you set:
// #define CAMERA_MODEL_AI_THINKER
#include "board_config.h"

// ===========================
// Enter your WiFi credentials
// ===========================
const char *ssid = "vivo Y16";
const char *password = "00001111";

// ===========================
// Pin Definitions
// ===========================
// Stepper Motor (NEMA 17) - Using available GPIO pins
#define STEPPER_STEP_PIN 13   // GPIO13
#define STEPPER_DIR_PIN 15    // GPIO15
#define STEPPER_ENABLE_PIN 14 // GPIO14

// Horn Speaker - Via Relay or Transistor
#define SPEAKER_PIN 12        // GPIO12

// Sensors
#define DHT_PIN 2             // GPIO2 for DHT22
#define SOIL_MOISTURE_PIN 33  // Analog pin for soil moisture
#define MOTION_SENSOR_PIN 16  // GPIO16 for PIR/motion

// DHT Sensor
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// Stepper Motor Setup
// NEMA 17: 200 steps per revolution (1.8° per step)
// Using driver mode (adjust based on your driver: 1/16 microstepping common)
#define STEPS_PER_REVOLUTION 3200  // 200 * 16 (microstepping)
AccelStepper stepper(AccelStepper::DRIVER, STEPPER_STEP_PIN, STEPPER_DIR_PIN);

// WebSocket Server
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// System State
int currentHeadPosition = 0;  // Current head angle in degrees
bool motionDetected = false;
float temperature = 0.0;
float humidity = 0.0;
int soilMoisture = 0;
unsigned long lastSensorUpdate = 0;
const unsigned long SENSOR_UPDATE_INTERVAL = 1000;  // 1 second

// Bird Detection State
bool birdDetectionEnabled = true;
int detectionSensitivity = 2;  // 1=low, 2=medium, 3=high
int detectionThreshold = 25;    // Pixel difference threshold
int minBirdSize = 1000;         // Minimum pixels for bird
int maxBirdSize = 30000;        // Maximum pixels for bird
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;
const unsigned long DETECTION_COOLDOWN = 10000;  // 10 second cooldown

// Frame Buffer for Motion Detection
camera_fb_t *currentFrame = NULL;
camera_fb_t *previousFrame = NULL;
uint8_t *prevGrayBuffer = NULL;
uint8_t *currGrayBuffer = NULL;
const int GRAY_BUFFER_SIZE = 320 * 240;  // QVGA resolution

// Detection Zone (default: upper 60% of frame)
int detectionZoneTop = 0;
int detectionZoneBottom = 144;  // 60% of 240 pixels
int detectionZoneLeft = 0;
int detectionZoneRight = 320;

// Camera Settings
int cameraResolution = FRAMESIZE_QVGA;  // Default QVGA for detection
int cameraBrightness = 0;   // -2 to 2
int cameraContrast = 0;     // -2 to 2
bool grayscaleMode = false;

void startCameraServer();
void setupLedFlash();
void setupStepper();
void setupSensors();
void setupBirdDetection();
void readSensors();
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                     AwsEventType type, void *arg, uint8_t *data, size_t len);
void sendSensorData();
void rotateHead(int targetDegrees);
void soundAlarm(int duration = 2000);
void performBirdDetection();
void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer);
bool detectMotion();
void applyCameraSettings();
void updateDetectionSensitivity();

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();

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
  } else {
    config.frame_size = FRAMESIZE_240X240;
  }

  // camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);
    s->set_brightness(s, 1);
    s->set_saturation(s, -2);
  }
  if (config.pixel_format == PIXFORMAT_JPEG) {
    s->set_framesize(s, FRAMESIZE_QVGA);
  }

#if defined(LED_GPIO_NUM)
  setupLedFlash();
#endif

  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");

  // Initialize components
  setupStepper();
  setupSensors();
  setupBirdDetection();

  startCameraServer();

  // Setup WebSocket
  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);
  server.begin();

  Serial.print("Camera Ready! Use 'http://");
  Serial.print(WiFi.localIP());
  Serial.println("' to connect");
  Serial.print("WebSocket available at: ws://");
  Serial.print(WiFi.localIP());
  Serial.println("/ws");
}

void loop() {
  // Clean up WebSocket clients
  ws.cleanupClients();

  // Run stepper motor (non-blocking)
  stepper.run();

  // Perform bird detection if enabled
  if (birdDetectionEnabled) {
    performBirdDetection();
  }

  // Read sensors periodically
  unsigned long currentMillis = millis();
  if (currentMillis - lastSensorUpdate >= SENSOR_UPDATE_INTERVAL) {
    lastSensorUpdate = currentMillis;
    readSensors();
    sendSensorData();
  }

  delay(10);  // Small delay to prevent WDT reset
}

// ===========================
// Stepper Motor Functions
// ===========================
void setupStepper() {
  pinMode(STEPPER_ENABLE_PIN, OUTPUT);
  digitalWrite(STEPPER_ENABLE_PIN, LOW);  // Enable stepper driver

  stepper.setMaxSpeed(1000);        // Steps per second
  stepper.setAcceleration(500);     // Steps per second^2
  stepper.setCurrentPosition(0);    // Set home position

  Serial.println("✅ Stepper motor initialized");
}

void rotateHead(int targetDegrees) {
  // Limit rotation to -180° to +180°
  targetDegrees = constrain(targetDegrees, -180, 180);

  // Calculate steps needed
  long targetSteps = (long)((float)targetDegrees / 360.0 * STEPS_PER_REVOLUTION);

  stepper.moveTo(targetSteps);
  currentHeadPosition = targetDegrees;

  Serial.print("🔄 Rotating head to: ");
  Serial.print(targetDegrees);
  Serial.println("°");
}

// ===========================
// Speaker Functions
// ===========================
void soundAlarm(int duration) {
  Serial.println("📢 Sounding alarm!");
  digitalWrite(SPEAKER_PIN, HIGH);
  delay(duration);
  digitalWrite(SPEAKER_PIN, LOW);
}

// ===========================
// Sensor Functions
// ===========================
void setupSensors() {
  pinMode(MOTION_SENSOR_PIN, INPUT);
  pinMode(SPEAKER_PIN, OUTPUT);
  digitalWrite(SPEAKER_PIN, LOW);

  dht.begin();

  Serial.println("✅ Sensors initialized");
}

void readSensors() {
  // Read DHT22
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  // Handle DHT read errors
  if (isnan(temperature)) temperature = 0.0;
  if (isnan(humidity)) humidity = 0.0;

  // Read soil moisture (0-4095 on ESP32)
  soilMoisture = analogRead(SOIL_MOISTURE_PIN);

  // Read motion sensor
  motionDetected = digitalRead(MOTION_SENSOR_PIN);

  // Debug output
  if (motionDetected) {
    Serial.println("⚠️ Motion detected!");
  }
}

// ===========================
// WebSocket Functions
// ===========================
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                     AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("WebSocket client #%u connected from %s\n",
                    client->id(), client->remoteIP().toString().c_str());
      sendSensorData();  // Send initial data
      break;

    case WS_EVT_DISCONNECT:
      Serial.printf("WebSocket client #%u disconnected\n", client->id());
      break;

    case WS_EVT_DATA:
      handleWebSocketMessage(arg, data, len);
      break;

    case WS_EVT_PONG:
    case WS_EVT_ERROR:
      break;
  }
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;

  if (info->final && info->index == 0 && info->len == len &&
      info->opcode == WS_TEXT) {

    data[len] = 0;  // Null terminate
    String message = String((char*)data);

    Serial.print("📥 Received: ");
    Serial.println(message);

    // Parse JSON
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
      Serial.print("❌ JSON parse error: ");
      Serial.println(error.c_str());
      return;
    }

    const char* command = doc["command"];
    int value = doc["value"] | 0;

    // Handle commands
    if (strcmp(command, "ROTATE_HEAD_LEFT") == 0) {
      rotateHead(currentHeadPosition + (value ? value : 90));
    }
    else if (strcmp(command, "ROTATE_HEAD_RIGHT") == 0) {
      rotateHead(currentHeadPosition - (value ? value : 90));
    }
    else if (strcmp(command, "ROTATE_HEAD_CENTER") == 0) {
      rotateHead(0);
    }
    else if (strcmp(command, "SOUND_ALARM") == 0) {
      soundAlarm(value ? value : 2000);
    }
    else if (strcmp(command, "RESET_SYSTEM") == 0) {
      Serial.println("🔄 Resetting system...");
      ESP.restart();
    }
    // Bird Detection Commands
    else if (strcmp(command, "TOGGLE_DETECTION") == 0) {
      birdDetectionEnabled = !birdDetectionEnabled;
      Serial.printf("🐦 Detection %s\n", birdDetectionEnabled ? "enabled" : "disabled");
    }
    else if (strcmp(command, "SET_SENSITIVITY") == 0) {
      detectionSensitivity = constrain(value, 1, 3);
      updateDetectionSensitivity();
    }
    else if (strcmp(command, "RESET_BIRD_COUNT") == 0) {
      birdsDetectedToday = 0;
      Serial.println("🔄 Bird count reset");
    }
    else if (strcmp(command, "SET_DETECTION_ZONE") == 0) {
      // Expecting: {top, bottom, left, right} in doc
      detectionZoneTop = doc["top"] | 0;
      detectionZoneBottom = doc["bottom"] | 144;
      detectionZoneLeft = doc["left"] | 0;
      detectionZoneRight = doc["right"] | 320;
      Serial.printf("📐 Detection zone: (%d,%d) to (%d,%d)\n",
                    detectionZoneLeft, detectionZoneTop,
                    detectionZoneRight, detectionZoneBottom);
    }
    // Camera Settings Commands
    else if (strcmp(command, "SET_BRIGHTNESS") == 0) {
      cameraBrightness = constrain(value, -2, 2);
      applyCameraSettings();
    }
    else if (strcmp(command, "SET_CONTRAST") == 0) {
      cameraContrast = constrain(value, -2, 2);
      applyCameraSettings();
    }
    else if (strcmp(command, "SET_RESOLUTION") == 0) {
      cameraResolution = constrain(value, FRAMESIZE_96X96, FRAMESIZE_UXGA);
      applyCameraSettings();
    }
    else if (strcmp(command, "TOGGLE_GRAYSCALE") == 0) {
      grayscaleMode = !grayscaleMode;
      applyCameraSettings();
    }
    else {
      Serial.print("❓ Unknown command: ");
      Serial.println(command);
    }
  }
}

void sendSensorData() {
  StaticJsonDocument<512> doc;

  doc["motion"] = motionDetected;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["soilMoisture"] = soilMoisture;
  doc["headPosition"] = currentHeadPosition;
  doc["birdDetectionEnabled"] = birdDetectionEnabled;
  doc["birdsDetectedToday"] = birdsDetectedToday;
  doc["detectionSensitivity"] = detectionSensitivity;
  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);

  ws.textAll(output);
}

// ===========================
// Bird Detection Functions
// ===========================
void setupBirdDetection() {
  // Allocate grayscale buffers
  prevGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);
  currGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);

  if (!prevGrayBuffer || !currGrayBuffer) {
    Serial.println("❌ Failed to allocate detection buffers!");
    birdDetectionEnabled = false;
    return;
  }

  // Initialize buffers to zero
  memset(prevGrayBuffer, 0, GRAY_BUFFER_SIZE);
  memset(currGrayBuffer, 0, GRAY_BUFFER_SIZE);

  updateDetectionSensitivity();

  Serial.println("✅ Bird detection initialized");
}

void updateDetectionSensitivity() {
  switch (detectionSensitivity) {
    case 1:  // Low
      detectionThreshold = 40;
      minBirdSize = 2000;
      maxBirdSize = 40000;
      break;
    case 2:  // Medium (default)
      detectionThreshold = 25;
      minBirdSize = 1000;
      maxBirdSize = 30000;
      break;
    case 3:  // High
      detectionThreshold = 15;
      minBirdSize = 500;
      maxBirdSize = 25000;
      break;
  }
  Serial.printf("📊 Detection sensitivity: %d (threshold: %d)\n",
                detectionSensitivity, detectionThreshold);
}

void performBirdDetection() {
  // Capture current frame
  currentFrame = esp_camera_fb_get();
  if (!currentFrame) {
    Serial.println("❌ Camera capture failed!");
    return;
  }

  // Convert to grayscale
  convertToGrayscale(currentFrame, currGrayBuffer);

  // Detect motion if we have a previous frame
  static bool firstFrame = true;
  if (!firstFrame) {
    if (detectMotion()) {
      // Check cooldown period
      unsigned long now = millis();
      if (now - lastDetectionTime > DETECTION_COOLDOWN) {
        lastDetectionTime = now;
        birdsDetectedToday++;

        Serial.println("🐦 BIRD DETECTED!");

        // Trigger alarm
        soundAlarm(2000);

        // Rotate head (simulate tracking)
        rotateHead(currentHeadPosition + 45);

        // Send detection alert
        StaticJsonDocument<256> alertDoc;
        alertDoc["type"] = "bird_detection";
        alertDoc["message"] = "Bird detected!";
        alertDoc["count"] = birdsDetectedToday;
        alertDoc["timestamp"] = millis();

        String alertMsg;
        serializeJson(alertDoc, alertMsg);
        ws.textAll(alertMsg);
      }
    }
  } else {
    firstFrame = false;
  }

  // Swap buffers
  uint8_t *temp = prevGrayBuffer;
  prevGrayBuffer = currGrayBuffer;
  currGrayBuffer = temp;

  // Return frame buffer
  esp_camera_fb_return(currentFrame);
}

void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer) {
  // Simple grayscale conversion for JPEG
  // For actual implementation, you might need to decode JPEG first
  // This is a simplified version

  if (fb->format == PIXFORMAT_GRAYSCALE) {
    memcpy(grayBuffer, fb->buf, min((size_t)GRAY_BUFFER_SIZE, fb->len));
  } else {
    // For JPEG, we'll use a simple approximation
    // In production, decode JPEG to RGB then convert to grayscale
    for (int i = 0; i < GRAY_BUFFER_SIZE && i < fb->len; i++) {
      grayBuffer[i] = fb->buf[i];  // Simplified
    }
  }
}

bool detectMotion() {
  int changedPixels = 0;
  int totalPixels = 0;
  int movementX = 0;
  int movementY = 0;
  int objectPixels = 0;

  // Calculate frame dimensions based on detection zone
  int width = detectionZoneRight - detectionZoneLeft;
  int height = detectionZoneBottom - detectionZoneTop;

  // Compare frames within detection zone
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

  // Calculate object size and position
  if (changedPixels > 0) {
    int avgX = movementX / changedPixels;
    int avgY = movementY / changedPixels;
    objectPixels = changedPixels;

    // Check if object size matches bird characteristics
    bool sizeMatch = (objectPixels >= minBirdSize && objectPixels <= maxBirdSize);

    // Check if object is in upper portion of frame (birds fly/perch high)
    bool positionMatch = (avgY < (detectionZoneBottom * 0.7));

    // Calculate movement percentage
    float movementPercent = (float)changedPixels / totalPixels * 100.0;

    Serial.printf("📹 Motion: %d px (%.1f%%) at (%d,%d) | Size OK: %d | Pos OK: %d\n",
                  objectPixels, movementPercent, avgX, avgY, sizeMatch, positionMatch);

    // Bird detected if both conditions met
    return (sizeMatch && positionMatch && movementPercent > 1.0);
  }

  return false;
}

void applyCameraSettings() {
  sensor_t *s = esp_camera_sensor_get();
  if (!s) return;

  s->set_brightness(s, cameraBrightness);
  s->set_contrast(s, cameraContrast);
  s->set_framesize(s, (framesize_t)cameraResolution);

  if (grayscaleMode) {
    s->set_pixformat(s, PIXFORMAT_GRAYSCALE);
  } else {
    s->set_pixformat(s, PIXFORMAT_JPEG);
  }

  Serial.println("✅ Camera settings applied");
}
