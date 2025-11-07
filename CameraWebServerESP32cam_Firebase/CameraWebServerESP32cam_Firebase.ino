/*
 * BantayBot Camera Board - ESP32-CAM with ImageBB Integration
 * Refactored Architecture: Camera uploads to ImageBB, notifies Main Board
 *
 * Features:
 * - Camera streaming and bird detection
 * - Image capture and upload to ImageBB
 * - HTTP notification to Main Board with image URL
 * - No Firebase library (saves memory)
 * - Simple and lightweight
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <base64.h>
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
  config.pixel_format = PIXFORMAT_JPEG;

  // Frame size and quality - Use DRAM instead of PSRAM
  config.frame_size = FRAMESIZE_QVGA; // 320x240
  config.jpeg_quality = 12;  // 10-63, lower = better quality
  config.fb_count = 1;       // Only 1 buffer
  config.fb_location = CAMERA_FB_IN_DRAM;  // Use internal RAM
  config.grab_mode = CAMERA_GRAB_LATEST;

  Serial.println("📷 Camera config: QVGA, quality 12, 1 buffer in DRAM");

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

String uploadToImageBB(camera_fb_t *fb) {
  if (!fb) {
    Serial.println("❌ No frame buffer to upload");
    return "";
  }

  Serial.println("📤 Uploading image to ImageBB...");
  Serial.printf("📊 Image size: %d bytes\n", fb->len);

  // Convert image to base64
  String base64Image = base64::encode(fb->buf, fb->len);
  Serial.printf("📊 Base64 size: %d bytes\n", base64Image.length());

  // Prepare HTTP POST
  HTTPClient http;
  http.begin(IMGBB_UPLOAD_URL);
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");

  // Build POST data
  String postData = "key=" + String(IMGBB_API_KEY) + "&image=" + base64Image;

  // Send POST request
  Serial.println("🌐 Sending to ImageBB...");
  int httpResponseCode = http.POST(postData);

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
      } else {
        Serial.println("❌ ImageBB API returned error");
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
  if (fb->format != PIXFORMAT_JPEG) {
    // Already in RGB565 or other format, convert to grayscale
    for (int i = 0; i < fb->len; i += 2) {
      uint16_t pixel = (fb->buf[i + 1] << 8) | fb->buf[i];
      uint8_t r = (pixel >> 11) << 3;
      uint8_t g = ((pixel >> 5) & 0x3F) << 2;
      uint8_t b = (pixel & 0x1F) << 3;
      grayBuffer[i / 2] = (r * 0.299 + g * 0.587 + b * 0.114);
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

        // Upload image to ImageBB
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

  // Store current frame as previous for next comparison
  if (previousFrame) {
    esp_camera_fb_return(previousFrame);
  }
  previousFrame = currentFrame;

  // Copy current gray buffer to previous
  memcpy(prevGrayBuffer, currGrayBuffer, GRAY_BUFFER_SIZE);

  return birdDetected;
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

  // Print final memory status
  Serial.printf("💾 Final free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("📦 Final free PSRAM: %d bytes\n", ESP.getFreePsram());

  Serial.println("🚀 BantayBot Camera Board ready!");
  Serial.println("📸 Bird detection: " + String(birdDetectionEnabled ? "ENABLED" : "DISABLED"));
  Serial.println("🔗 Main Board: http://" + String(MAIN_BOARD_IP) + ":" + String(MAIN_BOARD_PORT));
}

void loop() {
  // Perform bird detection
  detectBirdMotion();

  // Small delay to prevent overwhelming the system
  delay(100);
}