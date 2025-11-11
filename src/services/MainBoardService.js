import { CONFIG } from '../config/config';
import ConfigService from './ConfigService';
import DeviceService from './DeviceService';
import CommandService from './CommandService';
import { DEVICE_CONFIG } from '../config/hardware.config';

/**
 * Firebase-enhanced service for Main ESP32 Control Board
 * Uses Firebase real-time listeners as primary source with HTTP polling as fallback
 */
class MainBoardService {
  constructor() {
    this.updateBaseUrl();
    this.pollingInterval = null;
    this.listeners = {};
    this.isConnected = false;
    this.lastData = null;
    this.useFirebase = true;
    this.firebaseSubscriptions = [];

    // Subscribe to config changes
    ConfigService.subscribe((config) => {
      this.updateBaseUrl();
    });

    // Initialize Firebase services
    this.initializeFirebase();
  }

  /**
   * Update base URL from ConfigService or CONFIG
   */
  updateBaseUrl() {
    const config = ConfigService.isInitialized ? ConfigService.get() : CONFIG;
    const mainIP = config.mainBoardIP || CONFIG.MAIN_ESP32_IP;
    const mainPort = config.mainBoardPort || CONFIG.MAIN_ESP32_PORT;
    this.baseUrl = `http://${mainIP}:${mainPort}`;
    console.log(`📡 Main Board URL updated: ${this.baseUrl}`);
  }

  /**
   * Initialize Firebase services and subscriptions
   */
  async initializeFirebase() {
    try {
      console.log('🔥 Initializing Firebase services for MainBoardService...');

      // Initialize device service
      await DeviceService.initialize();
      await CommandService.initialize();

      console.log('✅ Firebase services initialized for MainBoardService');
    } catch (error) {
      console.error('❌ Failed to initialize Firebase services:', error);
      this.useFirebase = false;
      console.log('📡 Falling back to HTTP polling mode');
    }
  }

  /**
   * Start data monitoring (Firebase real-time or HTTP polling fallback)
   */
  startPolling(interval = 2000) {
    this.stopPolling();

    if (this.useFirebase) {
      console.log('🔥 Starting Firebase real-time monitoring...');
      this.startFirebaseListeners();
    } else {
      console.log('📡 Starting HTTP polling fallback...');
      this.startHttpPolling(interval);
    }
  }

  /**
   * Start Firebase real-time listeners
   */
  startFirebaseListeners() {
    const deviceId = DEVICE_CONFIG.MAIN_DEVICE_ID;

    // Subscribe to sensor data
    const sensorUnsubscribe = DeviceService.subscribeToSensorData(deviceId, (data) => {
      if (data && Object.keys(data).length > 0) {
        // Mark as connected
        if (!this.isConnected) {
          this.isConnected = true;
          this.emit('connected', true);
          console.log('✅ Main Board connected via Firebase');
        }

        // Transform Firebase data to match existing format
        this.lastData = {
          type: 'sensor_data',
          soilHumidity: data.soilHumidity || data.soil_humidity,
          soilTemperature: data.soilTemperature || data.soil_temperature,
          soilConductivity: data.soilConductivity || data.soil_conductivity,
          ph: data.ph,
          motion: data.motion || data.motionDetected,
          currentTrack: data.currentTrack || data.current_track,
          volume: data.volume,
          servoActive: data.servoActive || data.servo_active,
          timestamp: data.timestamp || Date.now(),
        };

        this.emit('data', this.lastData);
      }
    });

    if (sensorUnsubscribe) {
      this.firebaseSubscriptions.push(sensorUnsubscribe);
    }

    // Subscribe to device status
    const deviceUnsubscribe = DeviceService.subscribeToDevice(deviceId, (deviceData) => {
      if (deviceData) {
        const isOnline = DeviceService.isDeviceOnline(deviceData.last_seen);

        if (isOnline !== this.isConnected) {
          this.isConnected = isOnline;
          this.emit('connected', isOnline);
          console.log(`📱 Device ${deviceId} ${isOnline ? 'connected' : 'disconnected'}`);
        }
      }
    });

    if (deviceUnsubscribe) {
      this.firebaseSubscriptions.push(deviceUnsubscribe);
    }
  }

  /**
   * Start HTTP polling as fallback
   */
  startHttpPolling(interval = 2000) {
    // Initial fetch
    this.fetchStatus();

    // Start polling
    this.pollingInterval = setInterval(() => {
      this.fetchStatus();
    }, interval);

    console.log(`📡 Started HTTP polling Main Board at ${this.baseUrl}`);
  }

  /**
   * Stop data monitoring (both Firebase and HTTP polling)
   */
  stopPolling() {
    // Stop HTTP polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🛑 Stopped HTTP polling Main Board');
    }

    // Stop Firebase subscriptions
    this.firebaseSubscriptions.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.firebaseSubscriptions = [];
    console.log('🛑 Stopped Firebase subscriptions');
  }

  /**
   * Fetch current status from main board with fallback strategy
   */
  async fetchStatus() {
    const strategies = ConfigService.isInitialized
      ? ConfigService.getMainBoardConnectionStrategy()
      : [{ type: 'ip', url: `http://${CONFIG.MAIN_ESP32_IP}:${CONFIG.MAIN_ESP32_PORT}` }];

    // Try each strategy
    for (const strategy of strategies) {
      try {
        const response = await fetch(`${strategy.url}/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        });

        if (response.ok) {
          // Update baseUrl to the working strategy
          this.baseUrl = strategy.url;
          const data = await response.json();

          // Mark as connected
          if (!this.isConnected) {
            this.isConnected = true;
            this.emit('connected', true);
            console.log(`✅ Main Board connected via ${strategy.type}`);
          }

          // Emit sensor data
          this.lastData = {
            type: 'sensor_data',
            soilHumidity: data.soilHumidity,
            soilTemperature: data.soilTemp,
            soilConductivity: data.soilConductivity,
            ph: data.ph,
            motion: data.motionDetected,
            currentTrack: data.currentTrack,
            volume: data.volume,
            servoActive: data.servoActive,
            timestamp: Date.now(),
          };

          this.emit('data', this.lastData);
          return data;
        }
      } catch (error) {
        console.log(`❌ Failed to connect to Main Board via ${strategy.type}: ${error.message}`);
        // Continue to next strategy
      }
    }

    // All strategies failed
    if (this.isConnected) {
      this.isConnected = false;
      this.emit('connected', false);
      console.error('❌ Main Board connection lost - all strategies failed');
    }
    return null;
  }

  /**
   * Send command to main board via HTTP
   */
  async sendCommand(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        timeout: 5000,
      });

      if (response.ok) {
        const text = await response.text();
        console.log(`✅ Command sent: ${endpoint}`, text);
        return { success: true, message: text };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Command failed: ${endpoint}`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Control Methods (Firebase-enhanced with HTTP fallback)
   */

  async playTrack(track) {
    if (this.useFirebase) {
      return await CommandService.setTrack(track);
    }
    return this.sendCommand('/play', { track });
  }

  async nextTrack() {
    if (this.useFirebase) {
      return await CommandService.nextTrack();
    }

    // HTTP fallback - Get current status, increment track
    const status = await this.fetchStatus();
    if (status) {
      let nextTrack = status.currentTrack + 1;
      if (nextTrack === CONFIG.SKIP_TRACK) nextTrack++;
      if (nextTrack > CONFIG.TOTAL_AUDIO_TRACKS) nextTrack = 1;
      if (nextTrack === CONFIG.SKIP_TRACK) nextTrack++;
      return this.playTrack(nextTrack);
    }
    return { success: false, error: 'Could not get current track' };
  }

  async setVolume(level) {
    if (this.useFirebase) {
      return await CommandService.setVolume(level);
    }
    return this.sendCommand('/volume', { level });
  }

  async moveArms() {
    if (this.useFirebase) {
      return await CommandService.oscillateArms();
    }
    return this.sendCommand('/move-arms');
  }

  async stop() {
    if (this.useFirebase) {
      return await CommandService.stop();
    }
    return this.sendCommand('/stop');
  }

  async triggerAlarm() {
    if (this.useFirebase) {
      return await CommandService.triggerAlarm();
    }

    // HTTP fallback: Play next track + move arms
    const playResult = await this.nextTrack();
    const moveResult = await this.moveArms();
    return {
      success: playResult.success && moveResult.success,
      message: 'Alarm triggered (via play + move)',
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
   * Get connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get last received data
   */
  getLastData() {
    return this.lastData;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.stopPolling();
    this.isConnected = false;
    this.emit('connected', false);
    console.log('📱 MainBoardService disconnected');
  }

  /**
   * Toggle between Firebase and HTTP modes
   */
  toggleFirebaseMode(enabled) {
    if (enabled !== this.useFirebase) {
      this.useFirebase = enabled;
      console.log(`🔄 Switching to ${enabled ? 'Firebase' : 'HTTP'} mode`);

      // Restart monitoring with new mode
      if (this.pollingInterval || this.firebaseSubscriptions.length > 0) {
        this.stopPolling();
        this.startPolling();
      }
    }
  }

  /**
   * Get current connection mode
   */
  getConnectionMode() {
    return this.useFirebase ? 'firebase' : 'http';
  }

  /**
   * Ping the ESP32 to check if it's reachable on local network
   * @returns {Promise<boolean>} - True if reachable, false otherwise
   */
  async ping() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);  // 2 second timeout

      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('[MainBoardService] ✅ Ping successful - ESP32 reachable');
        return true;
      }
      return false;
    } catch (error) {
      console.log('[MainBoardService] ⚠️  Ping failed - ESP32 not reachable on local network');
      return false;
    }
  }
}

export default new MainBoardService();
