import FirebaseService from './FirebaseService';
import { FIREBASE_COLLECTIONS, COMMAND_TYPES, DEVICE_CONFIG } from '../config/hardware.config';

class CommandService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Firebase connection
   */
  async initialize() {
    await FirebaseService.initialize();
    this.initialized = true;
  }

  /**
   * Send command to device via Firebase
   */
  async sendCommand(deviceId, action, params = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const commandsCollection = db
        .collection(FIREBASE_COLLECTIONS.COMMANDS)
        .doc(deviceId)
        .collection('pending');

      const command = {
        action,
        params,
        status: 'pending',
        created_at: db.FieldValue.serverTimestamp()
      };

      await commandsCollection.add(command);
      console.log(`✅ Command sent to ${deviceId}: ${action}`, params);
      return { success: true };

    } catch (error) {
      console.error(`❌ Error sending command to ${deviceId}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ===========================
  // Audio Commands
  // ===========================

  async playAudio(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.PLAY_AUDIO);
  }

  async stopAudio(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.STOP_AUDIO);
  }

  async nextTrack(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.NEXT_TRACK);
  }

  async prevTrack(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.PREV_TRACK);
  }

  async setVolume(volume, deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_VOLUME, { volume });
  }

  async setTrack(track, deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_TRACK, { track });
  }

  // ===========================
  // Motor Commands
  // ===========================

  async rotateHead(angle, deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_HEAD, { angle });
  }

  async rotateLeft(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_LEFT);
  }

  async rotateRight(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_RIGHT);
  }

  async rotateCenter(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ROTATE_CENTER);
  }

  // ===========================
  // Servo Commands
  // ===========================

  async moveServo(left, right, deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.MOVE_SERVO, { left, right });
  }

  async oscillateArms(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.OSCILLATE_ARMS);
  }

  async stopOscillate(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.STOP_OSCILLATE);
  }

  async armsRest(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ARMS_REST);
  }

  async armsAlert(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ARMS_ALERT);
  }

  async armsWave(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ARMS_WAVE);
  }

  // ===========================
  // Camera Commands
  // ===========================

  async setBrightness(brightness, deviceId = DEVICE_CONFIG.CAMERA_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_BRIGHTNESS, { brightness });
  }

  async setContrast(contrast, deviceId = DEVICE_CONFIG.CAMERA_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_CONTRAST, { contrast });
  }

  async setResolution(resolution, deviceId = DEVICE_CONFIG.CAMERA_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_RESOLUTION, { resolution });
  }

  async toggleGrayscale(deviceId = DEVICE_CONFIG.CAMERA_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.TOGGLE_GRAYSCALE);
  }

  // ===========================
  // Detection Commands
  // ===========================

  async enableDetection(deviceId = DEVICE_CONFIG.CAMERA_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.ENABLE_DETECTION);
  }

  async disableDetection(deviceId = DEVICE_CONFIG.CAMERA_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.DISABLE_DETECTION);
  }

  async setSensitivity(sensitivity, deviceId = DEVICE_CONFIG.CAMERA_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.SET_SENSITIVITY, { sensitivity });
  }

  // ===========================
  // System Commands
  // ===========================

  async restart(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.RESTART);
  }

  async triggerAlarm(deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID) {
    return this.sendCommand(deviceId, COMMAND_TYPES.TRIGGER_ALARM);
  }

  // ===========================
  // Convenience Methods (matching existing MainBoardService interface)
  // ===========================

  /**
   * Play next track (for compatibility with existing app)
   */
  async playTrack(track) {
    return this.setTrack(track);
  }

  /**
   * Move arms (for compatibility with existing app)
   */
  async moveArms() {
    return this.oscillateArms();
  }

  /**
   * Stop all actions (for compatibility with existing app)
   */
  async stop() {
    // Send multiple stop commands
    const results = await Promise.all([
      this.stopAudio(),
      this.stopOscillate(),
      this.armsRest()
    ]);

    return {
      success: results.every(r => r.success),
      message: 'Stop commands sent'
    };
  }
}

export default new CommandService();