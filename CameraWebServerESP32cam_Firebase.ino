/*
 * BantayBot Camera ESP32-CAM with Firebase Integration
 * Enhanced Bird Detection and Crop Monitoring with Cloud Connectivity
 * Supports real-time streaming and detection reporting to Firebase
 */

#include "esp_camera.h"
#include <WiFi.h>
// MEMORY OPTIMIZATION: Removed heavy libraries to prevent crash
// #include <ESPAsyncWebServer.h>  // TOO HEAVY for ESP32-CAM
// #include <AsyncWebSocket.h>     // TOO HEAVY for ESP32-CAM
#include <ArduinoJson.h>
// #include <AccelStepper.h>  // NOT NEEDED on camera board - stepper is on main board
// #include <DHT.h>  // DISABLED - GPIO conflict with camera

// Firebase includes
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>

// Camera model configuration
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
// STEPPER MOTOR DISABLED - should be on Main Board, not Camera
// #define STEPPER_STEP_PIN 13   // GPIO13
// #define STEPPER_DIR_PIN 15    // GPIO15
// #define STEPPER_ENABLE_PIN 14 // GPIO14

// SPEAKER DISABLED - should be on Main Board, not Camera
// #define SPEAKER_PIN 12        // GPIO12

// Sensors
// WARNING: ESP32-CAM has limited GPIO pins. GPIO 2 conflicts with camera!
// DHT sensor disabled to avoid conflicts with camera pins
// #define DHT_PIN 2             // GPIO2 - CONFLICTS WITH CAMERA!
#define SOIL_MOISTURE_PIN 33  // Analog pin for soil moisture (if needed)
#define MOTION_SENSOR_PIN 16  // GPIO16 for PIR/motion

// DHT Sensor - DISABLED due to GPIO conflict
// #define DHT_TYPE DHT22
// DHT dht(DHT_PIN, DHT_TYPE);

// Stepper Motor - DISABLED (on Main Board)
// #define STEPS_PER_REVOLUTION 3200  // 200 * 16 (microstepping)
// AccelStepper stepper(AccelStepper::DRIVER, STEPPER_STEP_PIN, STEPPER_DIR_PIN);

// WebSocket Server - DISABLED (too heavy for ESP32-CAM memory)
// AsyncWebServer server(80);
// AsyncWebSocket ws("/ws");

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

void cameraTokenCallback(TokenInfo info) {
  if (info.status == token_status_error) {
    Serial.printf("Token error: %s\n", info.error.message.c_str());
  }
  Serial.printf("Token status: %s\n", info.status == token_status_ready ? "ready" : "not ready");
}

void initializeFirebase() {
  Serial.println("🔥 Initializing Firebase for Camera...");

  // Configure Firebase
  config.api_key = API_KEY;

  // Assign the token status callback function
  config.token_status_callback = cameraTokenCallback;

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
    updateCameraDeviceStatus();
  } else {
    firebaseConnected = false;
    Serial.println("\n❌ Firebase connection failed, using HTTP fallback");
    Serial.printf("💡 Error: %s\n", config.signer.signupError.message.c_str());
    Serial.println("💡 Make sure Anonymous Authentication is enabled in Firebase Console");
  }
}

void updateCameraDeviceStatus() {
  if (!firebaseConnected) return;

  FirebaseJson json;
  // Firestore requires fields to be formatted with type information
  json.set("fields/ip_address/stringValue", WiFi.localIP().toString());
  json.set("fields/last_seen/integerValue", String(millis()));
  json.set("fields/status/stringValue", "online");
  json.set("fields/firmware_version/stringValue", "2.0.0-firebase-camera");
  json.set("fields/heap_free/integerValue", String(ESP.getFreeHeap()));
  json.set("fields/stream_url/stringValue", "http://" + WiFi.localIP().toString() + ":80/stream");
  json.set("fields/detection_enabled/booleanValue", birdDetectionEnabled);
  json.set("fields/birds_detected_today/integerValue", String(birdsDetectedToday));

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
  // Firestore requires fields to be formatted with type information
  json.set("fields/device_id/stringValue", CAMERA_DEVICE_ID);
  json.set("fields/timestamp/integerValue", String(millis()));
  json.set("fields/bird_size/integerValue", String(birdSize));
  json.set("fields/confidence/integerValue", String(confidence));
  json.set("fields/detection_zone/stringValue", String(detectionZoneLeft) + "," + String(detectionZoneTop) + "," +
           String(detectionZoneRight) + "," + String(detectionZoneBottom));
  json.set("fields/camera_resolution/stringValue", cameraResolution);
  json.set("fields/sensitivity/integerValue", String(detectionSensitivity));

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

  // SPEAKER DISABLED - on Main Board
  // digitalWrite(SPEAKER_PIN, HIGH);
  // delay(500);
  // digitalWrite(SPEAKER_PIN, LOW);
}

// ===========================
// Sensor Functions
// ===========================

void readSensors() {
  // DHT22 sensor DISABLED due to GPIO conflict with camera
  // temperature = dht.readTemperature();
  // humidity = dht.readHumidity();
  temperature = 0.0;  // DHT disabled
  humidity = 0.0;     // DHT disabled

  // Read soil moisture (analog) - optional, may not be connected
  soilMoisture = analogRead(SOIL_MOISTURE_PIN);
  soilMoisture = map(soilMoisture, 0, 4095, 0, 100); // Convert to percentage

  // Read motion sensor
  motionDetected = digitalRead(MOTION_SENSOR_PIN);

  // DHT sensor disabled - no error checking needed
  // if (isnan(temperature) || isnan(humidity)) {
  //   Serial.println("❌ Failed to read from DHT sensor!");
  //   temperature = 0.0;
  //   humidity = 0.0;
  // }
}

// ===========================
// Stepper Motor Functions
// ===========================

void setupStepper() {
  // STEPPER DISABLED - on Main Board
  // pinMode(STEPPER_ENABLE_PIN, OUTPUT);
  // digitalWrite(STEPPER_ENABLE_PIN, LOW);
  // stepper.setMaxSpeed(1000);
  // stepper.setAcceleration(500);
  // stepper.setCurrentPosition(0);
  // Serial.println("✅ Stepper motor initialized");
}

void rotateHead(int targetDegrees) {
  // STEPPER DISABLED - on Main Board
  // long targetSteps = (long)targetDegrees * STEPS_PER_REVOLUTION / 360;
  // Serial.printf("🔄 Rotating head to %d degrees (%ld steps)\n", targetDegrees, targetSteps);
  // stepper.moveTo(targetSteps);
  // currentHeadPosition = targetDegrees;
}

// ===========================
// Camera Functions
// ===========================

void setupCamera() {
  // CRITICAL: Check PSRAM status (should already be initialized by ESP32 framework)
  // ESP32-CAM has 4MB PSRAM that MUST be used for camera frame buffers
  Serial.println("🔍 Checking PSRAM status:");
  Serial.printf("📦 PSRAM size: %d bytes\n", ESP.getPsramSize());
  Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());

  bool psramFound = (ESP.getPsramSize() > 0);
  if (!psramFound) {
    Serial.println("❌ ERROR: PSRAM not available!");
    Serial.println("💡 Solution: In Arduino IDE, go to Tools → PSRAM → Enabled");
    return;
  }

  if (ESP.getFreePsram() == 0) {
    Serial.println("⚠️  WARNING: PSRAM shows 0 bytes free! This may cause issues.");
    Serial.println("💡 Possible cause: Partition scheme or library consuming PSRAM");
  }

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

  // Frame size and quality - optimized based on PSRAM availability
  if (psramFound) {
    // With PSRAM: Use better quality and 2 frame buffers
    config.frame_size = FRAMESIZE_QVGA; // 320x240
    config.jpeg_quality = 10;  // Better quality (lower number = better)
    config.fb_count = 2;       // 2 buffers for smooth streaming
    config.fb_location = CAMERA_FB_IN_PSRAM;  // CRITICAL: Use PSRAM for frame buffers!
    Serial.println("📷 Camera config: QVGA, quality 10, 2 buffers in PSRAM");
  } else {
    // Without PSRAM: Use minimal settings
    config.frame_size = FRAMESIZE_QVGA; // Still QVGA but...
    config.jpeg_quality = 15;  // Lower quality to reduce memory
    config.fb_count = 1;       // Only 1 buffer
    config.fb_location = CAMERA_FB_IN_DRAM;  // Use internal RAM (risky!)
    Serial.println("⚠️  Camera config: QVGA, quality 15, 1 buffer in DRAM (limited)");
  }

  // Add I2C timeout configuration to prevent hang
  config.sccb_i2c_port = 0;  // I2C port number

  // Camera init with error handling
  Serial.println("🔧 Initializing camera...");
  Serial.println("📌 Checking camera hardware connection...");

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);

    // Detailed error messages
    if (err == ESP_ERR_NOT_FOUND) {
      Serial.println("💡 Error: Camera sensor not found on I2C bus");
      Serial.println("   - Check camera module is properly connected");
      Serial.println("   - Verify camera power supply");
      Serial.println("   - Check I2C pins (GPIO 26/27)");
    } else if (err == ESP_ERR_TIMEOUT) {
      Serial.println("💡 Error: Camera I2C timeout");
      Serial.println("   - Camera module may be faulty");
      Serial.println("   - Check I2C pull-up resistors");
    } else {
      Serial.printf("💡 Error code: 0x%x - Unknown camera error\n", err);
    }

    Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());
    Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());
    Serial.println("⚠️  System will continue without camera");
    return;
  }

  Serial.println("✅ Camera initialized successfully!");
  Serial.printf("💾 Remaining heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 Remaining PSRAM: %d bytes\n", ESP.getFreePsram());

  // Test camera by taking a frame
  Serial.println("📸 Testing camera capture...");
  camera_fb_t *fb = esp_camera_fb_get();
  if (fb) {
    Serial.printf("✅ Camera test successful! Frame size: %d bytes\n", fb->len);
    esp_camera_fb_return(fb);
  } else {
    Serial.println("⚠️  Camera test failed - could not capture frame");
  }
}

void startCameraServer() {
  // ASYNC WEB SERVER DISABLED - using Firebase only to save memory
  // AsyncWebServer removed to prevent ESP32-CAM memory crash
  Serial.println("⚠️  HTTP server disabled - use Firebase for remote access");

  /* DISABLED CODE - AsyncWebServer removed
  server.on("/stream", HTTP_GET, [](AsyncWebServerRequest *request) {
    // Camera stream endpoint
  });

  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    // Status endpoint
  });

  server.begin();
  Serial.println("🌐 Camera server started");
  */
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  delay(1000);  // Wait for serial to stabilize
  Serial.println("📷 BantayBot Camera with Firebase - Starting...");

  // Print initial memory status BEFORE anything
  Serial.println("🔍 Initial memory status:");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 PSRAM size: %d bytes\n", ESP.getPsramSize());
  Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());

  // Initialize pins - MINIMAL setup for camera board only
  // pinMode(SPEAKER_PIN, OUTPUT);  // DISABLED - on Main Board
  pinMode(MOTION_SENSOR_PIN, INPUT);
  // digitalWrite(SPEAKER_PIN, LOW);  // DISABLED - on Main Board

  // Initialize sensors - DHT disabled due to GPIO conflict with camera
  // dht.begin();  // DISABLED - GPIO 2 conflicts with camera

  // Setup stepper motor - DISABLED (on Main Board)
  // setupStepper();  // DISABLED - causes memory issues

  // Setup camera
  setupCamera();

  // Setup bird detection - TEMPORARILY DISABLED to save ~150KB RAM
  // setupBirdDetection();  // Re-enable when memory optimized
  Serial.println("⚠️  Bird detection disabled to save memory");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("📶 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.println("📍 IP address: " + WiFi.localIP().toString());

  // Print memory status
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());

  // Initialize Firebase
  initializeFirebase();

  // Start camera server - DISABLED (AsyncWebServer removed to save memory)
  // startCameraServer();  // DISABLED - using Firebase only
  Serial.println("⚠️  HTTP server disabled - using Firebase only");

  Serial.println("🚀 BantayBot Camera with Firebase ready!");
  Serial.println("🔥 Firebase mode: " + String(firebaseConnected ? "ENABLED" : "DISABLED (HTTP fallback)"));
  Serial.printf("💾 Final free heap: %d bytes\n", ESP.getFreeHeap());
  // Serial.println("📷 Camera stream: http://" + WiFi.localIP().toString() + "/stream");  // DISABLED
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

  // Handle stepper motor movements - DISABLED (on Main Board)
  // stepper.run();

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