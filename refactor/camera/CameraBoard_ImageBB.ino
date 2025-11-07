/*
 * BantayBot Camera Board - ESP32-CAM with ImageBB Integration
 * Refactored Architecture: Smart capture on detection + on-demand streaming
 *
 * Features:
 * - Bird detection with automatic upload to ImageBB (10s cooldown)
 * - On-demand manual capture via HTTP GET /capture (2s rate limit)
 * - HTTP settings endpoint for remote configuration (brightness, contrast)
 * - HTTP notification to Main Board with image URL + detected flag
 * - Smart upload caching to prevent conflicts between detection and manual capture
 * - No Firebase library (saves memory)
 * - Memory efficient: ~180KB free heap
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <base64.h>
#include <ESPAsyncWebServer.h>
#include "board_config.h"

// ===========================
// WiFi Credentials
// ===========================
const char *WIFI_SSID = "HUAWEI-E5330-6AB9";
const char *WIFI_PASSWORD = "16yaad0a";

// ===========================
// ImageBB Configuration
// ===========================
const char *IMGBB_API_KEY = "3e8d9f103a965f49318d117decbedd77";  // Get free API key from https://api.imgbb.com/
const char *IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

// ===========================
// Main Board Configuration
// ===========================
const char *MAIN_BOARD_IP = "192.168.8.100";  // Update with your main board IP
const int MAIN_BOARD_PORT = 81;

// Device IDs
#define CAMERA_DEVICE_ID "camera_001"

// ===========================
// Bird Detection Settings
// ===========================
bool birdDetectionEnabled = true;
int detectionSensitivity = 2;  // 1=low, 2=medium, 3=high
int detectionThreshold = 25;    // Pixel difference threshold
int minBirdSize = 1000;         // Minimum pixels for bird
int maxBirdSize = 30000;        // Maximum pixels for bird
int birdsDetectedToday = 0;
unsigned long lastDetectionTime = 0;
const unsigned long DETECTION_COOLDOWN = 10000;  // 10 second cooldown

// On-Demand Capture & Upload Tracking
unsigned long lastUploadTime = 0;  // Track last upload (detection or manual)
String lastImageUrl = "";  // Cache last uploaded image URL
const unsigned long UPLOAD_COOLDOWN = 2000;  // 2 seconds between any uploads

// Frame Buffer for Motion Detection
camera_fb_t *currentFrame = NULL;  // Temporary frame buffer (returned immediately after use)
uint8_t *prevGrayBuffer = NULL;    // Previous frame grayscale data for comparison
uint8_t *currGrayBuffer = NULL;    // Current frame grayscale data
const int GRAY_BUFFER_SIZE = 320 * 240;  // QVGA resolution (320x240 pixels)

// Detection Zone (default: upper 60% of frame)
int detectionZoneTop = 0;
int detectionZoneBottom = 144;  // 60% of 240 pixels
int detectionZoneLeft = 0;
int detectionZoneRight = 320;

// Camera Settings
int cameraResolution = FRAMESIZE_QVGA;  // Default QVGA for detection
int cameraBrightness = 0;   // -2 to 2
int cameraContrast = 0;     // -2 to 2

// HTTP Server
AsyncWebServer server(80);  // Camera on port 80

// ===========================
// Camera Functions
// ===========================

void setupCamera() {
  Serial.println("🔍 Checking PSRAM status:");
  Serial.printf("📦 PSRAM size: %d bytes\n", ESP.getPsramSize());
  Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());

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
  config.pixel_format = PIXFORMAT_GRAYSCALE;  // Grayscale for motion detection (1 byte/pixel)

  // Frame size and quality - Use DRAM instead of PSRAM
  config.frame_size = FRAMESIZE_QVGA; // 320x240
  config.jpeg_quality = 12;  // Not used for grayscale, but keep for compatibility
  config.fb_count = 1;       // Only 1 buffer (we return it immediately after use)
  config.fb_location = CAMERA_FB_IN_DRAM;  // Use internal RAM
  config.grab_mode = CAMERA_GRAB_LATEST;

  Serial.println("📷 Camera config: QVGA Grayscale, 1 buffer in DRAM");

  // Camera init with error handling
  Serial.println("🔧 Initializing camera...");
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return;
  }

  Serial.println("✅ Camera initialized successfully!");
  Serial.printf("💾 Remaining heap: %d bytes\n", ESP.getFreeHeap());

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

// ===========================
// ImageBB Upload Functions
// ===========================

String urlEncode(String str) {
  String encoded = "";
  char c;
  char code0;
  char code1;

  for (int i = 0; i < str.length(); i++) {
    c = str.charAt(i);
    if (c == '+') {
      encoded += "%2B";
    } else if (c == '/') {
      encoded += "%2F";
    } else if (c == '=') {
      encoded += "%3D";
    } else {
      encoded += c;
    }
  }
  return encoded;
}

String uploadToImageBB(camera_fb_t *fb) {
  if (!fb) {
    Serial.println("❌ No frame buffer to upload");
    return "";
  }

  Serial.println("📤 Uploading image to ImageBB...");
  Serial.printf("📊 Raw image size: %d bytes (format: %d)\n", fb->len, fb->format);

  // Convert grayscale frame to JPEG for ImageBB
  uint8_t *jpg_buf = NULL;
  size_t jpg_len = 0;

  if (fb->format == PIXFORMAT_GRAYSCALE) {
    Serial.println("🔧 Converting grayscale to JPEG...");
    bool converted = frame2jpg(fb, 60, &jpg_buf, &jpg_len);  // 60% quality (optimized for size)

    if (!converted || !jpg_buf) {
      Serial.println("❌ Failed to convert grayscale to JPEG");
      return "";
    }
    Serial.printf("✅ JPEG conversion successful: %d bytes\n", jpg_len);
  } else {
    // Already in JPEG or other format, use as-is
    jpg_buf = fb->buf;
    jpg_len = fb->len;
  }

  // Convert JPEG to base64
  String base64Image = base64::encode(jpg_buf, jpg_len);
  Serial.printf("📊 Base64 size: %d bytes\n", base64Image.length());

  // URL encode the base64 string (critical for ImageBB API)
  // Converts +, /, = characters to %2B, %2F, %3D to prevent corruption
  Serial.println("🔧 URL encoding base64 string...");
  String encodedImage = urlEncode(base64Image);
  Serial.printf("📊 Encoded size: %d bytes\n", encodedImage.length());

  // Prepare HTTP POST
  HTTPClient http;
  http.begin(IMGBB_UPLOAD_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  http.setTimeout(15000);  // 15 second timeout

  // Build POST data with URL-encoded image
  String postData = "key=" + String(IMGBB_API_KEY) + "&image=" + encodedImage;

  // Send POST request
  Serial.println("🌐 Sending to ImageBB...");
  int httpResponseCode = http.POST(postData);

  // Free JPEG buffer if we allocated it
  if (fb->format == PIXFORMAT_GRAYSCALE && jpg_buf) {
    free(jpg_buf);
  }

  String imageUrl = "";

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("📥 HTTP Response code: %d\n", httpResponseCode);

    // Parse JSON response
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      if (doc["success"].as<bool>()) {
        imageUrl = doc["data"]["url"].as<String>();
        String thumbnailUrl = doc["data"]["thumb"]["url"].as<String>();
        Serial.println("✅ Upload successful!");
        Serial.println("🔗 Image URL: " + imageUrl);
        Serial.println("🔗 Thumb URL: " + thumbnailUrl);

        // Cache URL and timestamp for on-demand capture optimization
        lastImageUrl = imageUrl;
        lastUploadTime = millis();
      } else {
        Serial.println("❌ ImageBB API returned error");
        Serial.println("Response: " + response);
      }
    } else {
      Serial.println("❌ JSON parsing failed");
    }
  } else {
    Serial.printf("❌ HTTP POST failed: %d\n", httpResponseCode);
  }

  http.end();
  return imageUrl;
}

// ===========================
// Main Board Communication
// ===========================

bool notifyMainBoard(String imageUrl, int birdSize, int confidence) {
  Serial.println("📡 Notifying Main Board...");

  HTTPClient http;
  String url = "http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT) + "/bird_detected";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload
  DynamicJsonDocument doc(512);
  doc["deviceId"] = CAMERA_DEVICE_ID;
  doc["timestamp"] = millis();
  doc["imageUrl"] = imageUrl;
  doc["birdSize"] = birdSize;
  doc["confidence"] = confidence;
  doc["detectionZone"] = String(detectionZoneLeft) + "," + String(detectionZoneTop) + "," +
                         String(detectionZoneRight) + "," + String(detectionZoneBottom);
  doc["detected"] = (birdSize > 0);  // True if bird, false if stream update

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("📦 Payload: " + jsonString);

  // Send POST request
  int httpResponseCode = http.POST(jsonString);

  bool success = false;
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ Main Board responded: %d\n", httpResponseCode);
    Serial.println("📥 Response: " + response);
    success = true;
  } else {
    Serial.printf("❌ Failed to contact Main Board: %d\n", httpResponseCode);
  }

  http.end();
  return success;
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
  Serial.printf("💾 Free heap after detection buffers: %d bytes\n", ESP.getFreeHeap());
}

void convertToGrayscale(camera_fb_t *fb, uint8_t *grayBuffer) {
  if (fb->format == PIXFORMAT_GRAYSCALE) {
    // Already grayscale! Just copy directly (1 byte per pixel)
    memcpy(grayBuffer, fb->buf, fb->len);
  } else if (fb->format == PIXFORMAT_RGB565) {
    // Convert RGB565 to grayscale for motion detection
    // RGB565: RRRRR GGGGGG BBBBB (16 bits per pixel)
    for (int i = 0; i < fb->len; i += 2) {
      // Read RGB565 pixel (little endian)
      uint16_t pixel = (fb->buf[i+1] << 8) | fb->buf[i];

      // Extract RGB components and expand to 8 bits
      uint8_t r = (pixel >> 11) << 3;        // 5 bits -> 8 bits
      uint8_t g = ((pixel >> 5) & 0x3F) << 2; // 6 bits -> 8 bits
      uint8_t b = (pixel & 0x1F) << 3;       // 5 bits -> 8 bits

      // Convert to grayscale using standard weights
      grayBuffer[i/2] = (uint8_t)(r * 0.299 + g * 0.587 + b * 0.114);
    }
  } else {
    // For other formats, log warning
    Serial.println("⚠️  Unsupported pixel format for motion detection");
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
  static bool hasFirstFrame = false;

  // If we have a previous frame buffer (grayscale data), perform motion detection
  if (hasFirstFrame) {
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

        // Upload image to ImageBB (uses currentFrame before we return it)
        String imageUrl = uploadToImageBB(currentFrame);

        if (imageUrl.length() > 0) {
          // Notify main board with image URL
          notifyMainBoard(imageUrl, changedPixels, confidence);
          birdsDetectedToday++;
        } else {
          Serial.println("⚠️  Image upload failed, notifying without image");
          notifyMainBoard("", changedPixels, confidence);
        }
      }
    }
  }

  // ✅ CRITICAL FIX: Return frame buffer immediately after use
  // We only need the grayscale data in currGrayBuffer, not the frame buffer itself
  esp_camera_fb_return(currentFrame);
  currentFrame = NULL;

  // Copy current gray buffer to previous for next iteration comparison
  memcpy(prevGrayBuffer, currGrayBuffer, GRAY_BUFFER_SIZE);
  hasFirstFrame = true;  // Mark that we now have data in prevGrayBuffer

  return birdDetected;
}

// ===========================
// Camera Settings Application
// ===========================

void applyCameraSettings() {
  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, cameraBrightness);
    s->set_contrast(s, cameraContrast);
    s->set_framesize(s, (framesize_t)cameraResolution);
    Serial.println("✅ Camera settings applied");
  }
}

// ===========================
// Setup and Main Loop
// ===========================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("📷 BantayBot Camera Board with ImageBB - Starting...");

  // Print initial memory status
  Serial.println("🔍 Initial memory status:");
  Serial.printf("💾 Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 PSRAM size: %d bytes\n", ESP.getPsramSize());
  Serial.printf("📦 Free PSRAM: %d bytes\n", ESP.getFreePsram());

  // Setup camera
  setupCamera();

  // Setup bird detection
  setupBirdDetection();

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📶 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected!");
  Serial.println("📍 IP address: " + WiFi.localIP().toString());

  // HTTP endpoint for settings changes
  server.on("/settings", HTTP_POST, [](AsyncWebServerRequest *request){}, NULL,
    [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
      Serial.println("📡 Received settings update");

      DynamicJsonDocument doc(512);
      DeserializationError error = deserializeJson(doc, data, len);

      if (error) {
        Serial.println("❌ JSON parsing failed");
        request->send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
      }

      // Apply settings
      if (doc.containsKey("brightness")) {
        cameraBrightness = doc["brightness"];
        Serial.printf("🔆 Brightness: %d\n", cameraBrightness);
      }
      if (doc.containsKey("contrast")) {
        cameraContrast = doc["contrast"];
        Serial.printf("🎨 Contrast: %d\n", cameraContrast);
      }
      if (doc.containsKey("streamInterval")) {
        streamInterval = doc["streamInterval"];
        Serial.printf("⏱️  Stream interval: %d ms\n", streamInterval);
      }
      if (doc.containsKey("streamingEnabled")) {
        streamingEnabled = doc["streamingEnabled"];
        Serial.printf("📹 Streaming: %s\n", streamingEnabled ? "ON" : "OFF");
      }

      applyCameraSettings();

      request->send(200, "application/json", "{\"status\":\"ok\",\"message\":\"Settings applied\"}");
    }
  );

  // On-demand capture endpoint
  server.on("/capture", HTTP_GET, [](AsyncWebServerRequest *request) {
    unsigned long now = millis();

    // Check if recent upload occurred (detection or previous manual capture)
    if (now - lastUploadTime < UPLOAD_COOLDOWN && lastImageUrl.length() > 0) {
      Serial.println("📸 Recent upload detected, returning cached URL");
      String response = "{\"status\":\"cached\",\"imageUrl\":\"" + lastImageUrl + "\",\"message\":\"Recent image (<%ds ago)\"}";
      request->send(200, "application/json", response);
      return;
    }

    Serial.println("📸 Manual capture requested");

    // Capture new frame
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("❌ Manual capture failed");
      request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"Camera capture failed\"}");
      return;
    }

    // Upload to ImageBB
    String imageUrl = uploadToImageBB(fb);
    esp_camera_fb_return(fb);

    if (imageUrl.length() > 0) {
      Serial.println("✅ Manual capture uploaded");
      String response = "{\"status\":\"ok\",\"imageUrl\":\"" + imageUrl + "\",\"message\":\"New capture uploaded\"}";
      request->send(200, "application/json", response);
    } else {
      Serial.println("❌ Upload failed");
      request->send(500, "application/json", "{\"status\":\"error\",\"message\":\"ImageBB upload failed\"}");
    }
  });

  server.begin();
  Serial.println("🌐 HTTP server started on port 80");

  // Print final memory status
  Serial.printf("💾 Final free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 Final free PSRAM: %d bytes\n", ESP.getFreePsram());

  Serial.println("🚀 BantayBot Camera Board ready!");
  Serial.println("📸 Bird detection: " + String(birdDetectionEnabled ? "ENABLED" : "DISABLED"));
  Serial.println("🔗 Main Board: http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT));
  Serial.println("📷 Manual capture: GET http://" + WiFi.localIP().toString() + "/capture");
  Serial.println("⚙️  Settings: POST http://" + WiFi.localIP().toString() + "/settings");
}

void loop() {
  // Bird detection (uploads on detection only)
  detectBirdMotion();

  // Small delay to prevent overwhelming the system
  delay(100);
}
