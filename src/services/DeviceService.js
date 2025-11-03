import FirebaseService from './FirebaseService';
import { DEVICE_CONFIG, FIREBASE_COLLECTIONS } from '../config/hardware.config';

class DeviceService {
  constructor() {
    this.listeners = {};
    this.subscriptions = {};
  }

  /**
   * Initialize Firebase connection
   */
  async initialize() {
    await FirebaseService.initialize();
  }

  /**
   * Subscribe to device status updates
   */
  subscribeToDevice(deviceId, callback) {
    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return null;
    }

    try {
      const deviceRef = db.collection(FIREBASE_COLLECTIONS.DEVICES).doc(deviceId);

      const unsubscribe = deviceRef.onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          console.log(`📱 Device ${deviceId} status updated:`, data);
          callback(data);
        } else {
          console.log(`📱 Device ${deviceId} not found`);
          callback(null);
        }
      }, (error) => {
        console.error(`❌ Error subscribing to device ${deviceId}:`, error);
        callback(null);
      });

      // Store subscription for cleanup
      this.subscriptions[`device_${deviceId}`] = unsubscribe;
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up device subscription:', error);
      return null;
    }
  }

  /**
   * Subscribe to sensor data updates
   */
  subscribeToSensorData(deviceId, callback) {
    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return null;
    }

    try {
      const sensorRef = db.collection(FIREBASE_COLLECTIONS.SENSOR_DATA).doc(deviceId);

      const unsubscribe = sensorRef.onSnapshot((doc) => {
        if (doc.exists) {
          const data = doc.data();
          console.log(`📊 Sensor data for ${deviceId} updated:`, data);
          callback(data);
        } else {
          console.log(`📊 No sensor data for ${deviceId}`);
          callback({});
        }
      }, (error) => {
        console.error(`❌ Error subscribing to sensor data for ${deviceId}:`, error);
        callback({});
      });

      // Store subscription for cleanup
      this.subscriptions[`sensor_${deviceId}`] = unsubscribe;
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up sensor data subscription:', error);
      return null;
    }
  }

  /**
   * Subscribe to detection history
   */
  subscribeToDetectionHistory(deviceId, callback, limit = 50) {
    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return null;
    }

    try {
      const historyRef = db.collection(FIREBASE_COLLECTIONS.DETECTION_HISTORY)
        .where('device_id', '==', deviceId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      const unsubscribe = historyRef.onSnapshot((snapshot) => {
        const detections = [];
        snapshot.forEach((doc) => {
          detections.push({
            id: doc.id,
            ...doc.data()
          });
        });
        console.log(`🐦 Detection history for ${deviceId} updated: ${detections.length} entries`);
        callback(detections);
      }, (error) => {
        console.error(`❌ Error subscribing to detection history for ${deviceId}:`, error);
        callback([]);
      });

      // Store subscription for cleanup
      this.subscriptions[`detection_${deviceId}`] = unsubscribe;
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up detection history subscription:', error);
      return null;
    }
  }

  /**
   * Check if device is online (last seen within 30 seconds)
   */
  isDeviceOnline(lastSeen) {
    if (!lastSeen) return false;

    const now = Date.now();
    let lastSeenTime;

    // Handle Firestore Timestamp
    if (lastSeen.toMillis) {
      lastSeenTime = lastSeen.toMillis();
    } else if (lastSeen.seconds) {
      lastSeenTime = lastSeen.seconds * 1000;
    } else {
      lastSeenTime = lastSeen;
    }

    return (now - lastSeenTime) < 30000;  // 30 seconds
  }

  /**
   * Get camera stream URL from device
   */
  getCameraStreamUrl(device) {
    if (!device) return null;
    return device.stream_url || `http://${device.ip_address}:80/stream`;
  }

  /**
   * Get default device IDs
   */
  getDefaultDeviceIds() {
    return {
      camera: DEVICE_CONFIG.CAMERA_DEVICE_ID,
      main: DEVICE_CONFIG.MAIN_DEVICE_ID
    };
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup() {
    Object.keys(this.subscriptions).forEach(key => {
      if (this.subscriptions[key]) {
        this.subscriptions[key]();
        delete this.subscriptions[key];
      }
    });
    console.log('🧹 DeviceService subscriptions cleaned up');
  }

  /**
   * Unsubscribe from specific subscription
   */
  unsubscribe(subscriptionKey) {
    if (this.subscriptions[subscriptionKey]) {
      this.subscriptions[subscriptionKey]();
      delete this.subscriptions[subscriptionKey];
      console.log(`🧹 Unsubscribed from ${subscriptionKey}`);
    }
  }
}

export default new DeviceService();