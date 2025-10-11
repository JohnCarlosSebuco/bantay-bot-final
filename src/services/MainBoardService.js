import { CONFIG } from '../config/config';

/**
 * HTTP-based service for Main ESP32 Control Board
 * Uses HTTP polling instead of WebSocket for reliability with standard WebServer library
 */
class MainBoardService {
  constructor() {
    this.baseUrl = `http://${CONFIG.MAIN_ESP32_IP}:${CONFIG.MAIN_ESP32_PORT}`;
    this.pollingInterval = null;
    this.listeners = {};
    this.isConnected = false;
    this.lastData = null;
  }

  /**
   * Start polling the main board for sensor data
   */
  startPolling(interval = 2000) {
    this.stopPolling();

    // Initial fetch
    this.fetchStatus();

    // Start polling
    this.pollingInterval = setInterval(() => {
      this.fetchStatus();
    }, interval);

    console.log(`📡 Started polling Main Board at ${this.baseUrl}`);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('🛑 Stopped polling Main Board');
    }
  }

  /**
   * Fetch current status from main board
   */
  async fetchStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      if (response.ok) {
        const data = await response.json();

        // Mark as connected
        if (!this.isConnected) {
          this.isConnected = true;
          this.emit('connected', true);
          console.log('✅ Main Board connected');
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
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (this.isConnected) {
        this.isConnected = false;
        this.emit('connected', false);
        console.error('❌ Main Board connection lost:', error.message);
      }
      this.emit('error', error);
      return null;
    }
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
   * Control Methods (matching WebSocket commands)
   */

  async playTrack(track) {
    return this.sendCommand('/play', { track });
  }

  async nextTrack() {
    // Get current status, increment track
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
    return this.sendCommand('/volume', { level });
  }

  async moveArms() {
    return this.sendCommand('/move-arms');
  }

  async stop() {
    return this.sendCommand('/stop');
  }

  async triggerAlarm() {
    // Note: /trigger-alarm endpoint may not exist in all firmware versions
    // Fallback: Play next track + move arms
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
   * Disconnect
   */
  disconnect() {
    this.stopPolling();
    this.isConnected = false;
    this.emit('connected', false);
  }
}

export default new MainBoardService();
