import firebase from '@react-native-firebase/app';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import firebaseConfig from '../config/firebase.config';
import { CONFIG } from '../config/config';

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.rtdb = null;  // Realtime Database for remote control
    this.initialized = false;
    this.deviceId = CONFIG.DEVICE_ID || 'BANTAY';
    this.statusListener = null;
  }

  /**
   * Initialize Firebase app and services
   */
  async initialize() {
    if (this.initialized) {
      return this.db;
    }

    try {
      // Initialize Firebase app if not already initialized
      if (!firebase.apps.length) {
        this.app = await firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase app initialized');
      } else {
        this.app = firebase.app();
        console.log('✅ Firebase app already initialized');
      }

      // Initialize Firestore
      this.db = firestore();

      // Enable offline persistence
      await this.db.settings({
        persistence: true,
        cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
      });

      // Initialize Realtime Database for remote control
      this.rtdb = database();
      console.log('✅ Realtime Database initialized for remote control');

      this.initialized = true;
      console.log('✅ Firebase services initialized (Firestore + Realtime DB)');

      return this.db;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get Firestore database instance
   */
  getDatabase() {
    if (!this.initialized) {
      console.warn('⚠️ Firebase not initialized. Call initialize() first.');
      return null;
    }
    return this.db;
  }

  /**
   * Get Firebase app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Check if Firebase is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  // ========================================
  // REMOTE CONTROL METHODS (Realtime Database)
  // ========================================

  /**
   * Send a command to the ESP32 via Firebase Realtime Database
   * @param {string} command - Command name (e.g., 'ROTATE_HEAD', 'SOUND_ALARM')
   * @param {any} value - Command value (optional)
   * @returns {Promise<boolean>} - Success status
   */
  async sendCommand(command, value = null) {
    try {
      if (!this.initialized || !this.rtdb) {
        console.error('[Firebase] Not initialized. Call initialize() first.');
        return false;
      }

      const timestamp = Date.now();
      const commandData = {
        command: command,
        value: value,
        timestamp: timestamp,
        processed: false,
        sentFrom: 'mobile_app'
      };

      console.log(`[Firebase] Sending command: ${command}`, value ? `value: ${value}` : '');

      // Write command to Firebase Realtime Database
      await this.rtdb
        .ref(`/devices/${this.deviceId}/commands`)
        .push(commandData);

      console.log(`[Firebase] ✅ Command sent successfully`);
      return true;
    } catch (error) {
      console.error(`[Firebase] ❌ Failed to send command:`, error);
      return false;
    }
  }

  /**
   * Listen to ESP32 status updates from Firebase
   * @param {function} callback - Called when status updates (receives status object)
   */
  onStatusUpdate(callback) {
    if (!this.initialized || !this.rtdb) {
      console.error('[Firebase] Not initialized. Call initialize() first.');
      return;
    }

    console.log(`[Firebase] 📡 Starting to listen for status updates...`);

    this.statusListener = this.rtdb
      .ref(`/devices/${this.deviceId}/status`)
      .on('value', snapshot => {
        const status = snapshot.val();
        if (status) {
          console.log(`[Firebase] 📥 Status update received`);
          callback(status);
        }
      });
  }

  /**
   * Stop listening to status updates
   */
  stopStatusListener() {
    if (this.statusListener && this.rtdb) {
      console.log(`[Firebase] 🛑 Stopping status listener`);
      this.rtdb
        .ref(`/devices/${this.deviceId}/status`)
        .off('value', this.statusListener);
      this.statusListener = null;
    }
  }

  /**
   * Get current device status from Firebase
   * @returns {Promise<object|null>}
   */
  async getStatus() {
    try {
      if (!this.initialized || !this.rtdb) {
        console.error('[Firebase] Not initialized.');
        return null;
      }

      const snapshot = await this.rtdb
        .ref(`/devices/${this.deviceId}/status`)
        .once('value');
      return snapshot.val();
    } catch (error) {
      console.error(`[Firebase] ❌ Failed to get status:`, error);
      return null;
    }
  }

  /**
   * Test Firebase Realtime Database connection
   * @returns {Promise<boolean>}
   */
  async testRealtimeDatabaseConnection() {
    try {
      if (!this.initialized || !this.rtdb) {
        console.error('[Firebase] Not initialized.');
        return false;
      }

      const testRef = this.rtdb.ref(`/devices/${this.deviceId}/test`);
      await testRef.set({
        timestamp: Date.now(),
        message: 'Connection test from mobile app'
      });
      console.log(`[Firebase] ✅ Realtime Database connection test successful`);
      return true;
    } catch (error) {
      console.error(`[Firebase] ❌ Realtime Database connection test failed:`, error);
      return false;
    }
  }

  /**
   * Clean up old processed commands (maintenance)
   * Removes commands older than 1 hour that have been processed
   */
  async cleanupOldCommands() {
    try {
      if (!this.initialized || !this.rtdb) {
        return;
      }

      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const commandsRef = this.rtdb.ref(`/devices/${this.deviceId}/commands`);

      const snapshot = await commandsRef
        .orderByChild('timestamp')
        .endAt(oneHourAgo)
        .once('value');

      const updates = {};
      snapshot.forEach(child => {
        const command = child.val();
        if (command.processed) {
          updates[child.key] = null; // Delete the command
        }
      });

      if (Object.keys(updates).length > 0) {
        await commandsRef.update(updates);
        console.log(`[Firebase] 🧹 Cleaned up ${Object.keys(updates).length} old commands`);
      }
    } catch (error) {
      console.error(`[Firebase] ❌ Failed to cleanup commands:`, error);
    }
  }
}

// Export singleton instance
export default new FirebaseService();

// Export database instance for direct use
export const getFirestore = () => {
  const service = new FirebaseService();
  return service.getDatabase();
};