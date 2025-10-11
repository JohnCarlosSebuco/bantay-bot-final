/**
 * BantayBot Camera Module - ESP32-CAM
 * Provides camera streaming and basic sensor data via HTTP/WebSocket
 *
 * Hardware: AI Thinker ESP32-CAM
 * Features: Camera stream, motion detection, WebSocket communication
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncWebSocket.h>
#include <ArduinoJson.h>

// Camera model configuration
#include "board_config.h"

// ===========================
// WiFi Credentials (CHANGE THESE!)
// ===========================
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// ===========================
// Web Server & WebSocket
// ===========================
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ===========================
// Camera Settings
// ===========================
int cameraResolution = FRAMESIZE_QVGA;  // 320x240 for detection
int cameraBrightness = 0;
int cameraContrast = 0;
bool grayscaleMode = false;

// ===========================
// Bird Detection Settings
// ===========================
bool birdDetectionEnabled = true;
int detectionSensitivity = 2;          // 1=Low, 2=Medium, 3=High
int detectionThreshold = 25;
int minBirdSize = 1000;
int maxBirdSize = 30000;
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;
const unsigned long DETECTION_COOLDOWN = 10000;  // 10 seconds

// ===========================
// Detection Buffers
// ===========================
camera_fb_t *currentFrame = NULL;
uint8_t *prevGrayBuffer = NULL;
uint8_t *currGrayBuffer = NULL;
const int GRAY_BUFFER_SIZE = 320 * 240;

// Detection zone (full frame by default)
int detectionZoneTop = 0;
int detectionZoneBottom = 240;
int detectionZoneLeft = 0;
int detectionZoneRight = 320;

// ===========================
// Function Declarations
// ===========================
void startCameraServer();
void setupLedFlash();
void setupBirdDetection();
void performBirdDetection();
void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer);
bool detectMotion();
void applyCameraSettings();
void updateDetectionSensitivity();
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                     AwsEventType type, void *arg, uint8_t *data, size_t len);
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len);
void sendCameraStatus();

// ===========================
// Setup
// ===========================
void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();
  Serial.println("📷 BantayBot Camera Module Starting...");

  // Camera configuration
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

  // Init with high specs to pre-allocate larger buffers
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

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID) {
    s->set_vflip(s, 1);        // Flip vertically
    s->set_brightness(s, 1);   // Slightly brighter
    s->set_saturation(s, -2);  // Less saturation
  }
  // Set to QVGA for detection (320x240)
  if (config.pixel_format == PIXFORMAT_JPEG) {
    s->set_framesize(s, FRAMESIZE_QVGA);
  }

#if defined(LED_GPIO_NUM)
  setupLedFlash();
#endif

  // WiFi connection
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("📡 WiFi connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");

  // Setup bird detection
  setupBirdDetection();

  // Start camera HTTP server
  startCameraServer();

  // Setup WebSocket
  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);
  server.begin();

  Serial.print("🌐 Camera Ready! http://");
  Serial.println(WiFi.localIP());
  Serial.print("📡 WebSocket: ws://");
  Serial.print(WiFi.localIP());
  Serial.println("/ws");
  Serial.println("✅ BantayBot Camera Module Ready!");
}

// ===========================
// Main Loop
// ===========================
void loop() {
  ws.cleanupClients();

  // Perform bird detection if enabled
  if (birdDetectionEnabled) {
    performBirdDetection();
  }

  delay(10);
}

// ===========================
// Bird Detection Setup
// ===========================
void setupBirdDetection() {
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
}

// ===========================
// Bird Detection Functions
// ===========================
void updateDetectionSensitivity() {
  switch (detectionSensitivity) {
    case 1: // Low sensitivity
      detectionThreshold = 40;
      minBirdSize = 2000;
      maxBirdSize = 40000;
      break;
    case 2: // Medium sensitivity
      detectionThreshold = 25;
      minBirdSize = 1000;
      maxBirdSize = 30000;
      break;
    case 3: // High sensitivity
      detectionThreshold = 15;
      minBirdSize = 500;
      maxBirdSize = 25000;
      break;
  }
  Serial.printf("🎯 Detection sensitivity: %d (threshold=%d, size=%d-%d)\n",
                detectionSensitivity, detectionThreshold, minBirdSize, maxBirdSize);
}

void performBirdDetection() {
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

      // Send alert via WebSocket
      StaticJsonDocument<256> alertDoc;
      alertDoc["type"] = "bird_detection";
      alertDoc["message"] = "Bird detected!";
      alertDoc["count"] = birdsDetectedToday;
      alertDoc["timestamp"] = millis();

      String alertMsg;
      serializeJson(alertDoc, alertMsg);
      ws.textAll(alertMsg);
    }
  } else {
    firstFrame = false;
  }

  // Swap buffers
  uint8_t *temp = prevGrayBuffer;
  prevGrayBuffer = currGrayBuffer;
  currGrayBuffer = temp;

  esp_camera_fb_return(currentFrame);
}

void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer) {
  if (fb->format == PIXFORMAT_GRAYSCALE) {
    memcpy(grayBuffer, fb->buf, min((size_t)GRAY_BUFFER_SIZE, fb->len));
  } else {
    // Simple grayscale conversion for JPEG/RGB
    for (int i = 0; i < GRAY_BUFFER_SIZE && i < fb->len; i++) {
      grayBuffer[i] = fb->buf[i];
    }
  }
}

bool detectMotion() {
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
    bool positionMatch = (avgY < (detectionZoneBottom * 0.7));  // Upper 70% of frame
    float movementPercent = (float)changedPixels / totalPixels * 100.0;

    return (sizeMatch && positionMatch && movementPercent > 1.0);
  }
  return false;
}

void applyCameraSettings() {
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
}

// ===========================
// WebSocket Handlers
// ===========================
void onWebSocketEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
                     AwsEventType type, void *arg, uint8_t *data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("📱 Client #%u connected\n", client->id());
      sendCameraStatus();
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

    // Camera control commands
    if (strcmp(command, "TOGGLE_DETECTION") == 0) {
      birdDetectionEnabled = !birdDetectionEnabled;
      Serial.printf("🐦 Detection: %s\n", birdDetectionEnabled ? "ON" : "OFF");
    }
    else if (strcmp(command, "SET_SENSITIVITY") == 0) {
      detectionSensitivity = constrain(value, 1, 3);
      updateDetectionSensitivity();
    }
    else if (strcmp(command, "RESET_BIRD_COUNT") == 0) {
      birdsDetectedToday = 0;
      Serial.println("🔄 Bird count reset");
    }
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

    sendCameraStatus();
  }
}

void sendCameraStatus() {
  StaticJsonDocument<512> doc;

  doc["type"] = "camera_status";
  doc["birdDetectionEnabled"] = birdDetectionEnabled;
  doc["birdsDetectedToday"] = birdsDetectedToday;
  doc["detectionSensitivity"] = detectionSensitivity;
  doc["brightness"] = cameraBrightness;
  doc["contrast"] = cameraContrast;
  doc["grayscale"] = grayscaleMode;
  doc["timestamp"] = millis();

  String output;
  serializeJson(doc, output);
  ws.textAll(output);
}

// ===========================
// Camera HTTP Server Setup
// ===========================
void startCameraServer() {
  // Camera stream endpoint
  server.on("/stream", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "text/html",
      "<html><body><img src='/cam.mjpeg' style='width:100%'></body></html>");
  });

  // MJPEG stream endpoint
  server.on("/cam.mjpeg", HTTP_GET, [](AsyncWebServerRequest *request){
    AsyncWebServerResponse *response = request->beginChunkedResponse("multipart/x-mixed-replace;boundary=frame",
      [](uint8_t *buffer, size_t maxLen, size_t index) -> size_t {
        camera_fb_t * fb = esp_camera_fb_get();
        if (!fb) return 0;

        if (index == 0) {
          size_t len = snprintf((char *)buffer, maxLen,
            "--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
          memcpy(buffer + len, fb->buf, min(maxLen - len, fb->len));
          esp_camera_fb_return(fb);
          return len + min(maxLen - len, fb->len);
        }

        esp_camera_fb_return(fb);
        return 0;
      });
    request->send(response);
  });

  Serial.println("✅ Camera HTTP server started");
}

#if defined(LED_GPIO_NUM)
void setupLedFlash() {
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, LOW);
}
#endif
