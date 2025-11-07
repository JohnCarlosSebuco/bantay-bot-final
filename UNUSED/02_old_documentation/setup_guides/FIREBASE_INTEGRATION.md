# Firebase Integration for BantayBot React Native App

This document outlines the Firebase integration implemented to enable real-time data synchronization between the Arduino devices and the React Native mobile application.

## Overview

The Firebase integration provides:
- **Real-time sensor data** from Arduino to mobile app
- **Command sending** from mobile app to Arduino
- **Crop and rainfall data management**
- **Offline persistence** for better user experience
- **HTTP fallback** for backward compatibility

## Architecture

### Firebase Services
- **FirebaseService**: Core Firebase initialization and configuration
- **DeviceService**: Real-time device status and sensor data subscriptions
- **CommandService**: Command sending to Arduino devices via Firebase
- **CropDataService**: Harvest and rainfall data management

### Enhanced MainBoardService
- **Primary mode**: Firebase real-time listeners
- **Fallback mode**: HTTP polling (existing functionality)
- **Automatic switching** between modes based on Firebase availability

## Files Added/Modified

### New Files
- `src/config/firebase.config.js` - Firebase project configuration
- `src/config/hardware.config.js` - Combined hardware and Firebase constants
- `src/services/FirebaseService.js` - Core Firebase service
- `src/services/DeviceService.js` - Device and sensor data subscriptions
- `src/services/CommandService.js` - Command sending service
- `src/services/CropDataService.js` - Crop data management service
- `android/app/google-services.json` - Android Firebase configuration

### Modified Files
- `package.json` - Added Firebase React Native dependencies
- `App.js` - Added Firebase initialization
- `src/services/MainBoardService.js` - Enhanced with Firebase integration
- `android/build.gradle` - Added Google Services plugin
- `android/app/build.gradle` - Added Google Services plugin

## Firebase Project Configuration

The integration uses the existing Firebase project from the PWA:
- **Project ID**: `cloudbantaybot`
- **Database**: Firestore
- **Collections**: devices, sensor_data, commands, detection_history, harvest_data, rainfall_log, settings

## Usage Examples

### Subscribing to Sensor Data
```javascript
import DeviceService from './src/services/DeviceService';

const unsubscribe = DeviceService.subscribeToSensorData('main_001', (data) => {
  console.log('Sensor data:', data);
  // Update UI with real-time sensor data
});

// Cleanup
unsubscribe();
```

### Sending Commands
```javascript
import CommandService from './src/services/CommandService';

// Play audio
await CommandService.playAudio();

// Set volume
await CommandService.setVolume(25);

// Trigger alarm
await CommandService.triggerAlarm();
```

### Managing Crop Data
```javascript
import CropDataService from './src/services/CropDataService';

// Add harvest data
await CropDataService.addHarvestData({
  cropType: 'tomato',
  yield: 15.5,
  harvestDate: new Date(),
  quality: 'excellent'
});

// Subscribe to harvest updates
const unsubscribe = CropDataService.subscribeToHarvestData((harvests) => {
  console.log('Harvest data updated:', harvests);
});
```

## MainBoardService Integration

The MainBoardService automatically switches between Firebase and HTTP modes:

```javascript
import MainBoardService from './src/services/MainBoardService';

// Start monitoring (uses Firebase by default)
MainBoardService.startPolling();

// Toggle mode if needed
MainBoardService.toggleFirebaseMode(false); // Switch to HTTP
MainBoardService.toggleFirebaseMode(true);  // Switch to Firebase

// Check current mode
const mode = MainBoardService.getConnectionMode(); // 'firebase' or 'http'
```

## Data Flow

### Arduino → Firebase → React Native
1. Arduino writes sensor data to Firestore collection `sensor_data/{device_id}`
2. DeviceService subscribes to real-time updates
3. MainBoardService receives data and emits to UI components
4. UI components update automatically

### React Native → Firebase → Arduino
1. User triggers action in UI
2. CommandService writes command to Firestore collection `commands/{device_id}/pending`
3. Arduino polls for pending commands
4. Arduino executes command and updates status

## Collections Schema

### sensor_data/{device_id}
```javascript
{
  soilHumidity: 45.2,
  soilTemperature: 25.1,
  soilConductivity: 1500,
  ph: 6.8,
  motion: false,
  currentTrack: 1,
  volume: 20,
  servoActive: false,
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### commands/{device_id}/pending/{command_id}
```javascript
{
  action: "play_audio",
  params: { track: 2 },
  status: "pending",
  created_at: "2024-01-01T12:00:00.000Z"
}
```

### harvest_data/{harvest_id}
```javascript
{
  cropType: "tomato",
  yield: 15.5,
  harvestDate: "2024-01-01",
  quality: "excellent",
  created_at: "2024-01-01T12:00:00.000Z"
}
```

## Error Handling

- **Firebase connection failure**: Automatic fallback to HTTP polling
- **Network disconnection**: Offline persistence maintains data until reconnection
- **Command timeout**: Commands expire after specified time
- **Device offline**: Status indicators show connection state

## Testing

To test the integration:

1. **Start the React Native app**: The app will initialize Firebase on startup
2. **Monitor console logs**: Check for Firebase initialization messages
3. **Test real-time data**: Sensor data should update automatically when Arduino publishes
4. **Test commands**: UI controls should send commands through Firebase
5. **Test offline mode**: Disconnect internet and verify HTTP fallback

## Next Steps

1. **Update Arduino firmware** to use the same Firebase project
2. **Configure security rules** in Firebase Console
3. **Test end-to-end integration** with real Arduino hardware
4. **Optimize data update intervals** based on usage patterns
5. **Implement push notifications** for critical alerts

## Benefits

- **Real-time updates**: Instant sensor data without polling delays
- **Global access**: Monitor and control from anywhere with internet
- **Offline support**: App works offline and syncs when reconnected
- **Scalability**: Can support multiple Arduino devices
- **Data persistence**: Historical data automatically stored in cloud
- **Backward compatibility**: HTTP polling still available as fallback