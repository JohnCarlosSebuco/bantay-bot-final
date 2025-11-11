# Firebase Setup Guide for BantayBot Remote Control

This guide will help you set up Firebase Realtime Database for controlling your BantayBot remotely across different networks.

## Overview

The BantayBot app now supports **Hybrid Mode** for controlling your ESP32:
- **Local Mode** (same WiFi): Uses WebSocket for fast, low-latency control
- **Remote Mode** (different networks): Uses Firebase Realtime Database for cloud-based control

The app automatically detects which mode to use based on network connectivity.

---

## Part 1: Firebase Project Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `bantaybot` (or your preferred name)
4. Disable Google Analytics (optional) or configure it
5. Click **"Create project"**

### Step 2: Enable Realtime Database

1. In Firebase Console, select your project
2. Click **"Realtime Database"** in the left sidebar
3. Click **"Create Database"**
4. Choose location closest to you (e.g., `asia-southeast1` for Philippines)
5. Start in **"Test mode"** for now (we'll add security rules later)
6. Click **"Enable"**

Your database URL will look like: `https://bantaybot-xxxxx-default-rtdb.firebaseio.com`

### Step 3: Set Up Database Security Rules

1. In Realtime Database, click the **"Rules"** tab
2. Replace the default rules with these device-specific rules:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

3. Click **"Publish"**

**Note:** These rules allow anyone with your database URL and device ID to read/write. For production, implement proper authentication.

### Step 4: Get Firebase Configuration

1. Click the **gear icon** ⚙️ next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"**
4. Click the **Web icon** (`</>`) to add a web app
5. Register app name: `BantayBot Mobile`
6. **Don't** enable Firebase Hosting
7. Click **"Register app"**
8. Copy the `firebaseConfig` object shown

It will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "bantaybot-xxxxx.firebaseapp.com",
  databaseURL: "https://bantaybot-xxxxx-default-rtdb.firebaseio.com",
  projectId: "bantaybot-xxxxx",
  storageBucket: "bantaybot-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};
```

---

## Part 2: React Native App Configuration

### Step 1: Update Firebase Config

1. Open `src/config/config.js`
2. Find the `FIREBASE_CONFIG` section (around line 24)
3. Replace the placeholder values with your Firebase config from Step 4 above:

```javascript
FIREBASE_CONFIG: {
  apiKey: "YOUR_ACTUAL_API_KEY",  // Replace with your API key
  authDomain: "bantaybot-xxxxx.firebaseapp.com",
  databaseURL: "https://bantaybot-xxxxx-default-rtdb.firebaseio.com",
  projectId: "bantaybot-xxxxx",
  storageBucket: "bantaybot-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
},
```

### Step 2: Set Device ID

1. Still in `config.js`, find `DEVICE_ID` (around line 39)
2. Set a unique 6-character code for your device:

```javascript
DEVICE_ID: "BANTAY",  // Change to your unique code (6 chars recommended)
```

**Important:** This `DEVICE_ID` must match the ID you'll set in your ESP32 Arduino code!

### Step 3: Add Google Services Files

#### For Android:

1. In Firebase Console, go to **Project settings** > **Your apps**
2. Click on your Android app (or add one if not created)
3. Download `google-services.json`
4. Place it in: `android/app/google-services.json`

#### For iOS:

1. In Firebase Console, download `GoogleService-Info.plist`
2. Place it in the `ios/` folder
3. Open Xcode and add it to your project

### Step 4: Test the Configuration

1. Restart your React Native app
2. The app should automatically initialize Firebase on startup
3. Check the console logs for:
   ```
   ✅ Firebase app initialized
   ✅ Realtime Database initialized for remote control
   ```

---

## Part 3: ESP32 Arduino Code Setup

### Step 1: Install Firebase ESP32 Library

1. Open Arduino IDE
2. Go to **Sketch** > **Include Library** > **Manage Libraries**
3. Search for **"Firebase ESP32 Client"** by Mobizt
4. Install version **4.3.x** or later
5. Also install dependency: **"ArduinoJson"** (if not installed)

### Step 2: Add Firebase to Your Arduino Code

Open your main ESP32 sketch file (e.g., `BantayBotUnified.ino`) and add:

#### At the top (includes):

```cpp
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"  // Token generation
#include "addons/RTDBHelper.h"   // Realtime Database helper
```

#### Add Firebase configuration (replace with your actual values):

```cpp
// Firebase Configuration
#define FIREBASE_HOST "bantaybot-xxxxx-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH ""  // Leave empty for open rules, or add your auth token
#define DEVICE_ID "BANTAY"  // MUST match the DEVICE_ID in React Native config.js

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
```

#### Initialize Firebase in `setup()`:

```cpp
void setup() {
  Serial.begin(115200);

  // ... your existing setup code ...

  // Initialize Firebase
  Serial.println("🔥 Initializing Firebase...");
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  if (Firebase.ready()) {
    Serial.println("✅ Firebase connected!");
  } else {
    Serial.println("❌ Firebase connection failed");
  }
}
```

#### Add Command Polling in `loop()`:

```cpp
void loop() {
  // ... your existing code ...

  // Poll Firebase for commands every 500ms
  static unsigned long lastFirebaseCheck = 0;
  if (millis() - lastFirebaseCheck > 500) {
    lastFirebaseCheck = millis();
    checkFirebaseCommands();
  }
}

void checkFirebaseCommands() {
  if (!Firebase.ready()) return;

  String path = "/devices/" + String(DEVICE_ID) + "/commands";

  if (Firebase.RTDB.getJSON(&fbdo, path.c_str())) {
    FirebaseJson &json = fbdo.jsonObject();
    size_t count = json.iteratorBegin();

    for (size_t i = 0; i < count; i++) {
      FirebaseJson::IteratorValue value = json.valueAt(i);

      if (value.type == FirebaseJson::JSON_OBJECT) {
        FirebaseJson commandObj;
        commandObj.setJsonData(value.value);

        // Parse command
        FirebaseJsonData processed, command, cmdValue;
        commandObj.get(processed, "processed");

        if (!processed.boolValue) {  // Only process unprocessed commands
          commandObj.get(command, "command");
          commandObj.get(cmdValue, "value");

          String cmd = command.stringValue;
          int val = cmdValue.intValue;

          Serial.printf("📥 Firebase Command: %s (value: %d)\n", cmd.c_str(), val);

          // Execute command (reuse your existing command handlers)
          executeCommand(cmd, val);

          // Mark as processed
          String cmdPath = path + "/" + String(value.key) + "/processed";
          Firebase.RTDB.setBool(&fbdo, cmdPath.c_str(), true);
        }
      }
    }
    json.iteratorEnd();
  }
}

void executeCommand(String command, int value) {
  // Your existing command execution logic
  // Example:
  if (command == "ROTATE_HEAD") {
    stepper.moveTo(value);
  } else if (command == "SOUND_ALARM") {
    digitalWrite(ALARM_PIN, HIGH);
    delay(2000);
    digitalWrite(ALARM_PIN, LOW);
  } else if (command == "PLAY_TRACK") {
    dfPlayer.play(value);
  }
  // ... add all your commands here ...
}
```

#### Add Status Updates (Optional):

```cpp
void updateFirebaseStatus() {
  if (!Firebase.ready()) return;

  String path = "/devices/" + String(DEVICE_ID) + "/status";

  FirebaseJson json;
  json.set("motion", motionDetected);
  json.set("headPosition", currentHeadPosition);
  json.set("temperature", temperature);
  json.set("humidity", humidity);
  json.set("timestamp", millis());

  Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json);
}

// Call this every 2 seconds in loop():
static unsigned long lastStatusUpdate = 0;
if (millis() - lastStatusUpdate > 2000) {
  lastStatusUpdate = millis();
  updateFirebaseStatus();
}
```

---

## Part 4: Testing Remote Control

### Test Local Mode (Same WiFi):

1. Connect your phone to the same WiFi as ESP32
2. Open the BantayBot app
3. Look for connection status - should show **"Local Mode"**
4. Test any control button (e.g., "Rotate Head")
5. Commands should execute via WebSocket (fast!)

### Test Remote Mode (Different Networks):

1. Disconnect phone from WiFi or switch to mobile data
2. ESP32 remains on its WiFi network
3. Open the BantayBot app
4. Should automatically switch to **"Remote Mode"**
5. Test control buttons - commands now go through Firebase
6. Check Arduino Serial Monitor for:
   ```
   📥 Firebase Command: ROTATE_HEAD (value: 90)
   ```

---

## Troubleshooting

### React Native App Issues:

**"Firebase not initialized"**
- Check that `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) are in the correct locations
- Rebuild the app: `npx expo run:android` or `npx expo run:ios`

**"Commands not sending"**
- Open Firebase Console > Realtime Database
- Check if data appears under `/devices/BANTAY/commands`
- Verify your `DEVICE_ID` in `config.js`

### ESP32 Arduino Issues:

**"Firebase connection failed"**
- Verify WiFi is connected first
- Check `FIREBASE_HOST` is correct (no `https://`)
- Ensure Firebase library is installed correctly

**"Commands not received"**
- Check `DEVICE_ID` matches between app and Arduino
- Verify Firebase security rules allow read/write
- Check Serial Monitor for Firebase errors

**ESP32 Crashes/Reboots:**
- Firebase library uses a lot of memory
- Reduce `fb_esp_client.h` buffer sizes if needed
- Consider using dynamic allocation for large JSON

---

## Firebase Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| Realtime Database | 1 GB stored |
| Simultaneous connections | 100 |
| GB downloaded/month | 10 GB |

For BantayBot usage, this is more than enough since commands are small JSON objects.

---

## Security Best Practices (Optional - For Production)

### 1. Add Authentication:

Update Firebase rules to require authentication:

```json
{
  "rules": {
    "devices": {
      "$deviceId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### 2. Use API Key Restrictions:

In Firebase Console > Project Settings > API Keys:
- Restrict API key to specific apps only

### 3. Enable App Check:

Protects against abusive traffic:
- Go to Firebase Console > App Check
- Enable for your app

---

## Next Steps

1. ✅ Complete Firebase setup
2. ✅ Update React Native config
3. ✅ Update ESP32 Arduino code
4. 🧪 Test local and remote modes
5. 🎉 Enjoy controlling your BantayBot from anywhere!

---

## Support

If you encounter issues, check:
- Firebase Console for database activity
- React Native console logs
- ESP32 Serial Monitor output

For Firebase documentation: https://firebase.google.com/docs/database
