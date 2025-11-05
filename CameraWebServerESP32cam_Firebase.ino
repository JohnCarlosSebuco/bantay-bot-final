/*
 * BantayBot Camera ESP32-CAM with Firebase Integration
 * Enhanced Bird Detection and Crop Monitoring with Cloud Connectivity
 * Supports real-time streaming and detection reporting to Firebase
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncWebSocket.h>
#include <ArduinoJson.h>
#include <AccelStepper.h>
#include <DHT.h>

// Firebase includes
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// Camera model configuration
#include "board_config.h"

// ===========================
// WiFi Credentials
// ===========================
const char *ssid = "vivo Y16";
const char *password = "00001111";

// ===========================
// Firebase Configuration
// ===========================
#define FIREBASE_PROJECT_ID "cloudbantaybot"
#define API_KEY "AIzaSyDbNM81-xOLGjQ5iiSOiXGBaV19tdJUFdg"
#define FIREBASE_AUTH_DOMAIN "cloudbantaybot.firebaseapp.com"

// Device IDs (must match React Native app)
#define CAMERA_DEVICE_ID "camera_001"

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool firebaseConnected = false;
unsigned long lastFirebaseUpdate = 0;
unsigned long lastCommandCheck = 0;
const unsigned long FIREBASE_UPDATE_INTERVAL = 5000;  // 5 seconds
const unsigned long COMMAND_CHECK_INTERVAL = 1000;    // 1 second

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

// ===========================
// Firebase Functions
// ===========================

void tokenStatusCallback(TokenInfo info) {
  Serial.printf("Token status: %s\n", info.status == token_status_ready ? "ready" : "not ready");
}

void initializeFirebase() {
  Serial.println("🔥 Initializing Firebase for Camera...");

  // Configure Firebase
  config.api_key = API_KEY;

  // Assign the token status callback function
  config.token_status_callback = tokenStatusCallback;

  // Set timeouts
  config.timeout.serverResponse = 10 * 1000;  // 10 seconds
  config.timeout.socketConnection = 10 * 1000;

  // For Firestore, we need proper authentication
  // Anonymous authentication (make sure it's enabled in Firebase Console)
  auth.user.email = "";
  auth.user.password = "";

  Serial.println("📝 Starting Firebase connection...");

  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Wait for Firebase to be ready with better error reporting
  int attempts = 0;
  while (!Firebase.ready() && attempts < 20) {
    Serial.print(".");
    delay(1000);
    attempts++;

    if (attempts % 5 == 0) {
      Serial.printf("\nAttempt %d/20...\n", attempts);
    }
  }

  if (Firebase.ready()) {
    firebaseConnected = true;
    Serial.println("\n✅ Firebase connected successfully!");
    Serial.printf("📧 User ID: %s\n", auth.token.uid.c_str());
    updateCameraDeviceStatus();
  } else {
    firebaseConnected = false;
    Serial.println("\n❌ Firebase connection failed, using HTTP fallback");
    Serial.println("💡 Check: API key, Firebase Console authentication settings");
  }
}

void updateCameraDeviceStatus() {
  if (!firebaseConnected) return;

  FirebaseJson json;
  json.set("ip_address", WiFi.localIP().toString());
  json.set("last_seen", Firebase.getCurrentTime());
  json.set("status", "online");
  json.set("firmware_version", "2.0.0-firebase-camera");
  json.set("heap_free", ESP.getFreeHeap());
  json.set("stream_url", "http://" + WiFi.localIP().toString() + ":80/stream");
  json.set("detection_enabled", birdDetectionEnabled);
  json.set("birds_detected_today", birdsDetectedToday);

  String path = "devices/" + String(CAMERA_DEVICE_ID);

  if (Firebase.Firestore.patchDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw(), "")) {
    Serial.println("✅ Camera device status updated");
  } else {
    Serial.println("❌ Failed to update camera device status: " + fbdo.errorReason());
  }
}

void reportBirdDetection(int birdSize, int confidence) {
  if (!firebaseConnected) return;

  FirebaseJson json;
  json.set("device_id", CAMERA_DEVICE_ID);
  json.set("timestamp", Firebase.getCurrentTime());
  json.set("bird_size", birdSize);
  json.set("confidence", confidence);
  json.set("detection_zone", String(detectionZoneLeft) + "," + String(detectionZoneTop) + "," +
           String(detectionZoneRight) + "," + String(detectionZoneBottom));
  json.set("camera_resolution", cameraResolution);
  json.set("sensitivity", detectionSensitivity);

  String path = "detection_history";

  if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
    Serial.println("🐦 Bird detection reported to Firebase");
    birdsDetectedToday++;
  } else {
    Serial.println("❌ Failed to report bird detection: " + fbdo.errorReason());
  }
}

void checkFirebaseCommands() {
  if (!firebaseConnected) return;

  String path = "commands/" + String(CAMERA_DEVICE_ID) + "/pending";

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
        executeCameraCommand(action, paramsData.stringValue);

        // Delete processed command
        String commandId = extractDocumentId(result.stringValue);
        String deletePath = path + "/" + commandId;
        Firebase.Firestore.deleteDocument(&fbdo, FIREBASE_PROJECT_ID, "", deletePath.c_str());
      }
    }
  }
}

void executeCameraCommand(String action, String params) {
  Serial.println("📷 Executing camera command: " + action);

  if (action == "enable_detection") {
    birdDetectionEnabled = true;
    Serial.println("🐦 Bird detection enabled");
  }
  else if (action == "disable_detection") {
    birdDetectionEnabled = false;
    Serial.println("🚫 Bird detection disabled");
  }
  else if (action == "set_sensitivity") {
    // Parse sensitivity from params (simplified)
    int sensitivity = params.substring(params.indexOf(":") + 1).toInt();
    if (sensitivity >= 1 && sensitivity <= 3) {
      detectionSensitivity = sensitivity;
      // Adjust detection threshold based on sensitivity
      switch(sensitivity) {
        case 1: detectionThreshold = 35; break; // Low sensitivity
        case 2: detectionThreshold = 25; break; // Medium sensitivity
        case 3: detectionThreshold = 15; break; // High sensitivity
      }
      Serial.println("🎯 Detection sensitivity set to: " + String(sensitivity));
    }
  }
  else if (action == "set_brightness") {
    int brightness = params.substring(params.indexOf(":") + 1).toInt();
    if (brightness >= -2 && brightness <= 2) {
      cameraBrightness = brightness;
      sensor_t *s = esp_camera_sensor_get();
      s->set_brightness(s, brightness);
      Serial.println("💡 Camera brightness set to: " + String(brightness));
    }
  }
  else if (action == "set_contrast") {
    int contrast = params.substring(params.indexOf(":") + 1).toInt();
    if (contrast >= -2 && contrast <= 2) {
      cameraContrast = contrast;
      sensor_t *s = esp_camera_sensor_get();
      s->set_contrast(s, contrast);
      Serial.println("🔳 Camera contrast set to: " + String(contrast));
    }
  }
  else if (action == "rotate_head") {
    int angle = params.substring(params.indexOf(":") + 1).toInt();
    rotateHead(angle);
  }

  Serial.println("✅ Camera command executed: " + action);
}

String extractDocumentId(String docPath) {
  int lastSlash = docPath.lastIndexOf('/');
  return docPath.substring(lastSlash + 1);
}

// ===========================
// Bird Detection Functions
// ===========================

void setupBirdDetection() {
  // Allocate memory for grayscale buffers
  prevGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);
  currGrayBuffer = (uint8_t*)malloc(GRAY_BUFFER_SIZE);

  if (!prevGrayBuffer || !currGrayBuffer) {
    Serial.println("❌ Failed to allocate memory for bird detection");
    birdDetectionEnabled = false;
    return;
  }

  Serial.println("✅ Bird detection initialized");
}

void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer) {
  if (fb->format != PIXFORMAT_JPEG) {
    // Already in RGB565 or other format, convert to grayscale
    for (int i = 0; i < fb->len; i += 2) {
      uint16_t pixel = (fb->buf[i+1] << 8) | fb->buf[i];
      uint8_t r = (pixel >> 11) << 3;
      uint8_t g = ((pixel >> 5) & 0x3F) << 2;
      uint8_t b = (pixel & 0x1F) << 3;
      grayBuffer[i/2] = (r * 0.299 + g * 0.587 + b * 0.114);
    }
  }
}

bool detectBirdMotion() {
  if (!birdDetectionEnabled) return false;

  // Capture current frame
  currentFrame = esp_camera_fb_get();
  if (!currentFrame) {
    Serial.println("❌ Failed to capture frame for detection");
    return false;
  }

  // Convert to grayscale
  convertToGrayscale(currentFrame, currGrayBuffer);

  bool birdDetected = false;

  // If we have a previous frame, perform motion detection
  if (previousFrame) {
    int changedPixels = 0;
    int totalPixels = 0;

    // Compare frames within detection zone
    for (int y = detectionZoneTop; y < detectionZoneBottom; y++) {
      for (int x = detectionZoneLeft; x < detectionZoneRight; x++) {
        int index = y * 320 + x;
        if (index < GRAY_BUFFER_SIZE) {
          int diff = abs(currGrayBuffer[index] - prevGrayBuffer[index]);
          if (diff > detectionThreshold) {
            changedPixels++;
          }
          totalPixels++;
        }
      }
    }

    // Check if motion indicates a bird
    if (changedPixels > minBirdSize && changedPixels < maxBirdSize) {
      unsigned long now = millis();
      if (now - lastDetectionTime > DETECTION_COOLDOWN) {
        birdDetected = true;
        lastDetectionTime = now;

        int confidence = map(changedPixels, minBirdSize, maxBirdSize, 50, 95);
        Serial.printf("🐦 BIRD DETECTED! Size: %d pixels, Confidence: %d%%\n", changedPixels, confidence);

        // Report to Firebase
        reportBirdDetection(changedPixels, confidence);

        // Trigger alarm on main board (send signal)
        // This could be done via HTTP call to main board or Firebase command
        triggerAlarmSequence();
      }
    }
  }

  // Store current frame as previous for next comparison
  if (previousFrame) {
    esp_camera_fb_return(previousFrame);
  }
  previousFrame = currentFrame;

  // Copy current gray buffer to previous
  memcpy(prevGrayBuffer, currGrayBuffer, GRAY_BUFFER_SIZE);

  return birdDetected;
}

void triggerAlarmSequence() {
  Serial.println("🚨 TRIGGERING ALARM SEQUENCE!");

  // Send command to main board via Firebase
  if (firebaseConnected) {
    FirebaseJson json;
    json.set("action", "trigger_alarm");
    json.set("source", "camera_detection");
    json.set("timestamp", Firebase.getCurrentTime());
    json.set("status", "pending");

    String path = "commands/main_001/pending";

    if (Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", path.c_str(), json.raw())) {
      Serial.println("📡 Alarm command sent to main board via Firebase");
    }
  }

  // Also trigger local speaker if connected
  digitalWrite(SPEAKER_PIN, HIGH);
  delay(500);
  digitalWrite(SPEAKER_PIN, LOW);
}

// ===========================
// Sensor Functions
// ===========================

void readSensors() {
  // Read DHT22 sensor
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();

  // Read soil moisture (analog)
  soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  soilMoisture = map(soilMoisture, 0, 4095, 0, 100); // Convert to percentage

  // Read motion sensor
  motionDetected = digitalRead(MOTION_SENSOR_PIN);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("❌ Failed to read from DHT sensor!");
    temperature = 0.0;
    humidity = 0.0;
  }
}

// ===========================
// Stepper Motor Functions
// ===========================

void setupStepper() {
  pinMode(STEPPER_ENABLE_PIN, OUTPUT);
  digitalWrite(STEPPER_ENABLE_PIN, LOW); // Enable stepper

  stepper.setMaxSpeed(1000);
  stepper.setAcceleration(500);
  stepper.setCurrentPosition(0);

  Serial.println("✅ Stepper motor initialized");
}

void rotateHead(int targetDegrees) {
  // Convert degrees to steps
  long targetSteps = (long)targetDegrees * STEPS_PER_REVOLUTION / 360;

  Serial.printf("🔄 Rotating head to %d degrees (%ld steps)\n", targetDegrees, targetSteps);

  stepper.moveTo(targetSteps);
  currentHeadPosition = targetDegrees;

  // Motor will move in main loop via stepper.run()
}

// ===========================
// Camera Functions
// ===========================

void setupCamera() {
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
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Frame size and quality
  config.frame_size = FRAMESIZE_QVGA; // 320x240 for detection
  config.jpeg_quality = 12;
  config.fb_count = 2;

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return;
  }

  Serial.println("✅ Camera initialized");
}

void startCameraServer() {
  // Stream endpoint
  server.on("/stream", HTTP_GET, [](AsyncWebServerRequest *request) {
    AsyncWebServerResponse *response = request->beginChunkedResponse(
      "multipart/x-mixed-replace; boundary=frame",
      [](uint8_t *buffer, size_t maxLen, size_t index) -> size_t {
        camera_fb_t *fb = esp_camera_fb_get();
        if (!fb) return 0;

        size_t len = 0;
        if (index == 0) {
          len = snprintf((char*)buffer, maxLen,
            "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n",
            fb->len);
        }

        if (len < maxLen) {
          size_t copyLen = min(fb->len - (index - len), maxLen - len);
          memcpy(buffer + len, fb->buf + (index - len), copyLen);
          len += copyLen;
        }

        esp_camera_fb_return(fb);
        return len;
      }
    );
    request->send(response);
  });

  // Status endpoint
  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    DynamicJsonDocument doc(1024);
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["soilMoisture"] = soilMoisture;
    doc["motionDetected"] = motionDetected;
    doc["headPosition"] = currentHeadPosition;
    doc["detectionEnabled"] = birdDetectionEnabled;
    doc["birdsDetectedToday"] = birdsDetectedToday;
    doc["firebaseMode"] = firebaseConnected;

    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  server.begin();
  Serial.println("🌐 Camera server started");
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  Serial.println("📷 BantayBot Camera with Firebase - Starting...");

  // Initialize pins
  pinMode(SPEAKER_PIN, OUTPUT);
  pinMode(MOTION_SENSOR_PIN, INPUT);
  digitalWrite(SPEAKER_PIN, LOW);

  // Initialize sensors
  dht.begin();

  // Setup stepper motor
  setupStepper();

  // Setup camera
  setupCamera();

  // Setup bird detection
  setupBirdDetection();

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

  // Start camera server
  startCameraServer();

  Serial.println("🚀 BantayBot Camera with Firebase ready!");
  Serial.println("🔥 Firebase mode: " + String(firebaseConnected ? "ENABLED" : "DISABLED (HTTP fallback)"));
  Serial.println("📷 Camera stream: http://" + WiFi.localIP().toString() + "/stream");
}

void loop() {
  unsigned long currentTime = millis();

  // Read sensors periodically
  if (currentTime - lastSensorUpdate >= SENSOR_UPDATE_INTERVAL) {
    readSensors();
    lastSensorUpdate = currentTime;
  }

  // Perform bird detection
  detectBirdMotion();

  // Handle stepper motor movements
  stepper.run();

  // Firebase operations
  if (firebaseConnected) {
    // Update device status
    if (currentTime - lastFirebaseUpdate >= FIREBASE_UPDATE_INTERVAL) {
      updateCameraDeviceStatus();
      lastFirebaseUpdate = currentTime;
    }

    // Check for Firebase commands
    if (currentTime - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
      checkFirebaseCommands();
      lastCommandCheck = currentTime;
    }
  }

  // Small delay to prevent overwhelming the system
  delay(50);
}