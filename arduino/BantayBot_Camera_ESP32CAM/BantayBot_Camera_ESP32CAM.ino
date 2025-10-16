/**
 * BantayBot Camera Module - ESP32-CAM
 * Provides camera streaming and basic sensor data via HTTP/WebSocket
 *
 * Hardware: AI Thinker ESP32-CAM
 * Features: Camera stream, motion detection, WebSocket communication + WiFi Manager + mDNS
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <AsyncWebSocket.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ESPmDNS.h>

// Camera model configuration
#include "board_config.h"

// ===========================
// WiFi Configuration with Preferences
// ===========================
Preferences preferences;
String wifiSSID = "";
String wifiPassword = "";
String mainBoardIP = "";
int mainBoardPort = 81;
bool wifiConfigured = false;

// Connection health monitoring
String cachedMainBoardIP = "";           // Cached resolved IP
unsigned long lastConnectionTest = 0;
unsigned long lastSuccessfulTrigger = 0;
unsigned long lastFailedTrigger = 0;
int failedTriggerCount = 0;
int successfulTriggerCount = 0;
bool mainBoardReachable = false;
const unsigned long CONNECTION_TEST_INTERVAL = 30000;  // Test connection every 30s

// WiFi Manager AP settings
const char* apSSID = "BantayBot-Camera-Setup";
const char* apPassword = "bantaybot123";  // Default password for setup AP

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

  // ---- WiFi Configuration with Preferences ----
  preferences.begin("bantaybot-cam", false);
  wifiSSID = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("password", "");
  mainBoardIP = preferences.getString("mainIP", "");
  mainBoardPort = preferences.getInt("mainPort", 81);

  if (wifiSSID.length() > 0 && wifiPassword.length() > 0) {
    wifiConfigured = true;
    Serial.println("📡 Found saved WiFi credentials");
    Serial.print("   SSID: ");
    Serial.println(wifiSSID);

    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
    WiFi.setSleep(false);

    Serial.print("📡 Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ WiFi connected");
      Serial.print("📍 IP Address: ");
      Serial.println(WiFi.localIP());

      // Start mDNS
      if (MDNS.begin("bantaybot-camera")) {
        Serial.println("✅ mDNS responder started: bantaybot-camera.local");
        MDNS.addService("http", "tcp", 80);
      }
    } else {
      Serial.println("\n⚠️ WiFi connection failed - starting AP mode");
      startAPMode();
      return;  // Skip rest of setup until configured
    }
  } else {
    Serial.println("⚠️ No WiFi credentials found - starting AP mode");
    startAPMode();
    return;  // Skip rest of setup until configured
  }

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
// WiFi Auto-Reconnect
// ===========================
void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected! Attempting to reconnect...");

    WiFi.disconnect();
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
    WiFi.setSleep(false);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ WiFi reconnected!");
      Serial.print("📍 IP Address: ");
      Serial.println(WiFi.localIP());

      // Clear cached IP to force re-resolution
      cachedMainBoardIP = "";
    } else {
      Serial.println("\n❌ WiFi reconnection failed");
    }
  }
}

// ===========================
// Connection Health Check
// ===========================
void testMainBoardConnection() {
  if (mainBoardIP.length() == 0) return;

  HTTPClient http;
  bool reachable = false;

  Serial.println("🔍 Testing Main Board connection...");

  // Try cached IP first
  if (cachedMainBoardIP.length() > 0) {
    String url = "http://" + cachedMainBoardIP + ":" + String(mainBoardPort) + "/ping";
    http.begin(url);
    http.setTimeout(1000);

    int httpCode = http.GET();
    http.end();

    if (httpCode == 200) {
      reachable = true;
      Serial.println("✅ Main Board reachable via cached IP");
    }
  }

  // If cached failed, try resolving
  if (!reachable) {
    IPAddress mainIP;
    if (MDNS.queryHost("bantaybot-main", mainIP)) {
      cachedMainBoardIP = mainIP.toString();
      Serial.printf("📌 Resolved and cached Main Board IP: %s\n", cachedMainBoardIP.c_str());

      String url = "http://" + cachedMainBoardIP + ":" + String(mainBoardPort) + "/ping";
      http.begin(url);
      http.setTimeout(1000);

      int httpCode = http.GET();
      http.end();

      if (httpCode == 200) {
        reachable = true;
        Serial.println("✅ Main Board reachable via resolved IP");
      }
    } else {
      Serial.println("⚠️ Failed to resolve Main Board via mDNS");
    }
  }

  mainBoardReachable = reachable;

  if (!reachable) {
    Serial.println("❌ Main Board not reachable");
    cachedMainBoardIP = "";  // Clear cache
  }
}

// ===========================
// Main Loop
// ===========================
void loop() {
  unsigned long now = millis();

  // WiFi reconnection check (every loop, but only acts if disconnected)
  checkWiFiConnection();

  ws.cleanupClients();

  // Periodic connection health check
  if (now - lastConnectionTest >= CONNECTION_TEST_INTERVAL) {
    lastConnectionTest = now;
    testMainBoardConnection();
  }

  // Perform bird detection if enabled
  if (birdDetectionEnabled) {
    performBirdDetection();
  }

  delay(10);
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
    // Handle AsyncWebServer events
    delay(10);
  }
}

void setupConfigServer() {
  // Serve configuration page
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    String html = "<html><head><title>BantayBot Camera Setup</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>body{font-family:Arial;margin:20px;background:#f0f0f0;}";
    html += ".container{max-width:400px;margin:auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
    html += "h1{color:#FF5722;text-align:center;}input,button{width:100%;padding:10px;margin:10px 0;border-radius:5px;border:1px solid #ddd;}";
    html += "button{background:#FF5722;color:white;border:none;cursor:pointer;font-size:16px;}button:hover{background:#E64A19;}</style></head>";
    html += "<body><div class='container'><h1>📷 BantayBot Camera</h1><h3>WiFi Configuration</h3>";
    html += "<form action='/save' method='POST'>";
    html += "<label>WiFi SSID:</label><input name='ssid' placeholder='Enter WiFi SSID' required>";
    html += "<label>WiFi Password:</label><input name='password' type='password' placeholder='Enter WiFi Password' required>";
    html += "<p style='color:#666;font-size:14px;margin-top:20px;'>ℹ️ Camera will automatically connect to Main Board using <strong>bantaybot-main.local</strong></p>";
    html += "<button type='submit'>Save & Connect</button></form></div></body></html>";
    request->send(200, "text/html", html);
  });

  // Save configuration
  server.on("/save", HTTP_POST, [](AsyncWebServerRequest *request){
    String newSSID = "";
    String newPassword = "";

    if (request->hasParam("ssid", true)) newSSID = request->getParam("ssid", true)->value();
    if (request->hasParam("password", true)) newPassword = request->getParam("password", true)->value();

    if (newSSID.length() > 0) {
      preferences.putString("ssid", newSSID);
      preferences.putString("password", newPassword);
      // Default to mDNS hostname for Main Board
      preferences.putString("mainIP", "bantaybot-main.local");
      preferences.putInt("mainPort", 81);

      // Send connecting page
      String html = "<html><head><title>Connecting...</title>";
      html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}";
      html += ".spinner{border:8px solid #f3f3f3;border-top:8px solid #FF5722;border-radius:50%;width:60px;height:60px;animation:spin 1s linear infinite;margin:20px auto;}";
      html += "@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head>";
      html += "<body><h1>Connecting to WiFi...</h1><div class='spinner'></div><p>Please wait...</p></body></html>";
      request->send(200, "text/html", html);

      delay(1000);

      // Try to connect to WiFi
      WiFi.mode(WIFI_AP_STA);
      WiFi.begin(newSSID.c_str(), newPassword.c_str());
      WiFi.setSleep(false);

      Serial.println("Attempting WiFi connection...");
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
      }

      if (WiFi.status() == WL_CONNECTED) {
        String cameraIP = WiFi.localIP().toString();
        Serial.println("\n✅ WiFi connected!");
        Serial.print("📍 Camera IP: ");
        Serial.println(cameraIP);

        // Add success endpoint
        server.on("/success", HTTP_GET, [cameraIP](AsyncWebServerRequest *req){
          String successHtml = "<html><head><title>Success!</title><meta http-equiv='refresh' content='30;url=/'>";
          successHtml += "<style>body{font-family:Arial;text-align:center;padding:30px;background:#f0f0f0;}";
          successHtml += ".success{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:600px;margin:auto;}";
          successHtml += ".ip{font-size:28px;font-weight:bold;color:#FF5722;background:#fbe9e7;padding:15px;border-radius:8px;margin:15px 0;word-break:break-all;}";
          successHtml += ".label{font-size:14px;color:#666;margin-top:5px;}";
          successHtml += ".info{background:#e3f2fd;padding:15px;border-radius:8px;margin:15px 0;font-size:14px;color:#1976d2;}</style></head>";
          successHtml += "<body><div class='success'><h1>✅ Camera Connected!</h1>";
          successHtml += "<p>Camera Board IP Address:</p>";
          successHtml += "<div class='ip'>" + cameraIP + ":80</div>";
          successHtml += "<div class='info'>📡 Camera will automatically connect to Main Board via <strong>bantaybot-main.local:81</strong></div>";
          successHtml += "<p style='margin-top:25px;color:#666;'>⚡ Board will restart in 30 seconds...</p>";
          successHtml += "<p style='color:#666;font-size:14px;'>💡 Access via hostname:<br><strong>bantaybot-camera.local</strong></p></div></body></html>";
          req->send(200, "text/html", successHtml);
        });

        // Redirect to success
        request->redirect("/success");

        delay(30000);
        ESP.restart();
      } else {
        Serial.println("\n❌ WiFi connection failed");
        String failHtml = "<html><head><title>Failed</title><meta http-equiv='refresh' content='5;url=/'>";
        failHtml += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}</style></head>";
        failHtml += "<body><h1>❌ Connection Failed</h1><p>Could not connect to WiFi.<br>Please check your credentials and try again.</p></body></html>";
        request->send(200, "text/html", failHtml);

        delay(5000);
        WiFi.mode(WIFI_AP);
      }
    } else {
      request->send(400, "text/plain", "Invalid credentials");
    }
  });

  server.begin();
  Serial.println("✅ Configuration server started");
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

      // TRIGGER MAIN BOARD ALARM via HTTP
      triggerMainBoardAlarm();

      // Send alert via WebSocket (for app monitoring)
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

// ===========================
// Trigger Main Board Alarm (with retry and caching)
// ===========================
void triggerMainBoardAlarm() {
  if (mainBoardIP.length() == 0) {
    Serial.println("⚠️ Main board IP not configured, skipping alarm trigger");
    failedTriggerCount++;
    lastFailedTrigger = millis();
    return;
  }

  HTTPClient http;
  bool success = false;
  const int MAX_RETRIES = 3;
  const int RETRY_DELAY_MS = 500;

  // Try up to 3 times with retry logic
  for (int attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
    Serial.printf("🔄 Trigger attempt %d/%d...\n", attempt, MAX_RETRIES);

    // Strategy 1: Try cached IP first (fastest)
    if (cachedMainBoardIP.length() > 0) {
      String url = "http://" + cachedMainBoardIP + ":" + String(mainBoardPort) + "/trigger-alarm";
      http.begin(url);
      http.setTimeout(1000);  // 1 second timeout per attempt

      int httpCode = http.GET();
      http.end();

      if (httpCode > 0 && httpCode == 200) {
        Serial.printf("✅ Triggered via cached IP! (attempt %d)\n", attempt);
        success = true;
        successfulTriggerCount++;
        lastSuccessfulTrigger = millis();
        mainBoardReachable = true;
        break;
      } else {
        Serial.printf("⚠️ Cached IP failed on attempt %d: %s\n", attempt, http.errorToString(httpCode).c_str());
        // Clear cache on failure
        if (attempt == MAX_RETRIES) {
          cachedMainBoardIP = "";
        }
      }
    }

    // Strategy 2: Try mDNS hostname
    if (!success && mainBoardIP.indexOf(".local") > 0) {
      String url = "http://" + mainBoardIP + ":" + String(mainBoardPort) + "/trigger-alarm";
      http.begin(url);
      http.setTimeout(1000);

      int httpCode = http.GET();
      http.end();

      if (httpCode > 0 && httpCode == 200) {
        Serial.printf("✅ Triggered via mDNS! (attempt %d)\n", attempt);
        success = true;
        successfulTriggerCount++;
        lastSuccessfulTrigger = millis();
        mainBoardReachable = true;
        break;
      } else {
        Serial.printf("⚠️ mDNS failed on attempt %d\n", attempt);
      }
    }

    // Strategy 3: Try resolving mDNS to IP
    if (!success) {
      IPAddress mainIP;
      if (MDNS.queryHost("bantaybot-main", mainIP)) {
        String resolvedIP = mainIP.toString();
        String url = "http://" + resolvedIP + ":" + String(mainBoardPort) + "/trigger-alarm";
        http.begin(url);
        http.setTimeout(1000);

        int httpCode = http.GET();
        http.end();

        if (httpCode > 0 && httpCode == 200) {
          Serial.printf("✅ Triggered via resolved IP! (attempt %d)\n", attempt);
          // Cache the resolved IP for faster future calls
          cachedMainBoardIP = resolvedIP;
          Serial.printf("📌 Cached Main Board IP: %s\n", cachedMainBoardIP.c_str());
          success = true;
          successfulTriggerCount++;
          lastSuccessfulTrigger = millis();
          mainBoardReachable = true;
          break;
        } else {
          Serial.printf("⚠️ Resolved IP failed on attempt %d\n", attempt);
        }
      } else {
        Serial.printf("⚠️ mDNS resolution failed on attempt %d\n", attempt);
      }
    }

    // Wait before retry (exponential backoff)
    if (!success && attempt < MAX_RETRIES) {
      int delayTime = RETRY_DELAY_MS * attempt;  // 500ms, 1000ms, 1500ms
      Serial.printf("⏳ Retrying in %dms...\n", delayTime);
      delay(delayTime);
    }
  }

  if (!success) {
    Serial.println("❌ All trigger attempts failed after retries");
    failedTriggerCount++;
    lastFailedTrigger = millis();
    mainBoardReachable = false;

    // Flash LED to indicate failure
    #if defined(LED_GPIO_NUM)
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_GPIO_NUM, HIGH);
      delay(100);
      digitalWrite(LED_GPIO_NUM, LOW);
      delay(100);
    }
    #endif
  } else {
    // Flash LED to indicate success
    #if defined(LED_GPIO_NUM)
    digitalWrite(LED_GPIO_NUM, HIGH);
    delay(200);
    digitalWrite(LED_GPIO_NUM, LOW);
    #endif
  }
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

  // Info endpoint - shows current status (no Serial Monitor needed!)
  server.on("/info", HTTP_GET, [](AsyncWebServerRequest *request){
    String json = "{";
    json += "\"device\":\"BantayBot Camera\",";
    json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"hostname\":\"bantaybot-camera.local\",";
    json += "\"port\":80,";
    json += "\"ssid\":\"" + WiFi.SSID() + "\",";
    json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"connected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"mainBoardIP\":\"" + mainBoardIP + "\",";
    json += "\"mainBoardPort\":" + String(mainBoardPort) + ",";
    json += "\"birdDetectionEnabled\":" + String(birdDetectionEnabled ? "true" : "false") + ",";
    json += "\"birdsDetectedToday\":" + String(birdsDetectedToday) + ",";
    json += "\"uptime\":" + String(millis() / 1000) + ",";
    json += "\"freeHeap\":" + String(ESP.getFreeHeap());
    json += "}";
    request->send(200, "application/json", json);
  });

  // Diagnostics endpoint
  server.on("/diagnostics", HTTP_GET, [](AsyncWebServerRequest *request){
    String json = "{";
    json += "\"device\":\"BantayBot Camera\",";
    json += "\"uptime\":" + String(millis() / 1000) + ",";
    json += "\"wifiConnected\":" + String(WiFi.status() == WL_CONNECTED ? "true" : "false") + ",";
    json += "\"wifiSSID\":\"" + WiFi.SSID() + "\",";
    json += "\"wifiRSSI\":" + String(WiFi.RSSI()) + ",";
    json += "\"ipAddress\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"mainBoardIP\":\"" + mainBoardIP + "\",";
    json += "\"cachedMainBoardIP\":\"" + cachedMainBoardIP + "\",";
    json += "\"mainBoardReachable\":" + String(mainBoardReachable ? "true" : "false") + ",";
    json += "\"lastConnectionTest\":" + String(lastConnectionTest / 1000) + ",";
    json += "\"lastSuccessfulTrigger\":" + String(lastSuccessfulTrigger / 1000) + ",";
    json += "\"lastFailedTrigger\":" + String(lastFailedTrigger / 1000) + ",";
    json += "\"successfulTriggers\":" + String(successfulTriggerCount) + ",";
    json += "\"failedTriggers\":" + String(failedTriggerCount) + ",";
    json += "\"successRate\":" + String(successfulTriggerCount + failedTriggerCount > 0 ?
      (float)successfulTriggerCount / (successfulTriggerCount + failedTriggerCount) * 100.0 : 0.0) + ",";
    json += "\"birdDetectionEnabled\":" + String(birdDetectionEnabled ? "true" : "false") + ",";
    json += "\"birdsDetectedToday\":" + String(birdsDetectedToday) + ",";
    json += "\"freeHeap\":" + String(ESP.getFreeHeap());
    json += "}";
    request->send(200, "application/json", json);
  });

  // Reset configuration endpoint
  server.on("/reset-config", HTTP_GET, [](AsyncWebServerRequest *request){
    String html = "<html><head><title>Reset Configuration</title>";
    html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}</style></head>";
    html += "<body><h1>⚠️ Reset Configuration?</h1>";
    html += "<p>This will clear all saved settings and restart in setup mode.</p>";
    html += "<form action='/reset-config' method='POST'>";
    html += "<button type='submit' style='padding:15px 30px;background:#f44336;color:white;border:none;border-radius:5px;cursor:pointer;font-size:16px;'>Reset & Restart</button>";
    html += "</form></body></html>";
    request->send(200, "text/html", html);
  });

  server.on("/reset-config", HTTP_POST, [](AsyncWebServerRequest *request){
    preferences.clear();
    String html = "<html><head><title>Reset Complete</title><meta http-equiv='refresh' content='3;url=/'>";
    html += "<style>body{font-family:Arial;text-align:center;padding:50px;background:#f0f0f0;}</style></head>";
    html += "<body><h1>✅ Configuration Reset</h1><p>Restarting in setup mode...</p></body></html>";
    request->send(200, "text/html", html);
    delay(2000);
    ESP.restart();
  });

  Serial.println("✅ Camera HTTP server started");
}

#if defined(LED_GPIO_NUM)
void setupLedFlash() {
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, LOW);
}
#endif
