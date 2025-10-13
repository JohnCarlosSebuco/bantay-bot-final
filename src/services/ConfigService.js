import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config/config';

/**
 * ConfigService - Centralized configuration management
 * Handles all dynamic configuration with persistent storage
 */
class ConfigService {
  constructor() {
    this.config = {
      // Network Configuration
      cameraIP: CONFIG.CAMERA_ESP32_IP,
      cameraPort: CONFIG.CAMERA_ESP32_PORT,
      mainBoardIP: CONFIG.MAIN_ESP32_IP,
      mainBoardPort: CONFIG.MAIN_ESP32_PORT,

      // WiFi Credentials (for future WiFi provisioning via app)
      wifiSSID: '',
      wifiPassword: '',

      // Connection Settings
      updateInterval: CONFIG.UPDATE_INTERVAL,
      connectionTimeout: CONFIG.CONNECTION_TIMEOUT,
      reconnectInterval: CONFIG.RECONNECT_INTERVAL,

      // App Preferences
      autoReconnect: true,
      notifications: true,

      // Audio Settings
      volume: 1.0,
      isMuted: false,
    };

    this.listeners = [];
    this.isInitialized = false;
  }

  /**
   * Initialize configuration from persistent storage
   */
  async initialize() {
    if (this.isInitialized) return this.config;

    try {
      const keys = [
        'camera_ip',
        'camera_port',
        'main_board_ip',
        'main_board_port',
        'wifi_ssid',
        'wifi_password',
        'update_interval',
        'connection_timeout',
        'reconnect_interval',
        'auto_reconnect',
        'notifications',
        'volume',
        'is_muted',
      ];

      const values = await AsyncStorage.multiGet(keys);

      values.forEach(([key, value]) => {
        if (value !== null) {
          switch (key) {
            case 'camera_ip':
              this.config.cameraIP = value;
              break;
            case 'camera_port':
              this.config.cameraPort = parseInt(value);
              break;
            case 'main_board_ip':
              this.config.mainBoardIP = value;
              break;
            case 'main_board_port':
              this.config.mainBoardPort = parseInt(value);
              break;
            case 'wifi_ssid':
              this.config.wifiSSID = value;
              break;
            case 'wifi_password':
              this.config.wifiPassword = value;
              break;
            case 'update_interval':
              this.config.updateInterval = parseInt(value);
              break;
            case 'connection_timeout':
              this.config.connectionTimeout = parseInt(value);
              break;
            case 'reconnect_interval':
              this.config.reconnectInterval = parseInt(value);
              break;
            case 'auto_reconnect':
              this.config.autoReconnect = JSON.parse(value);
              break;
            case 'notifications':
              this.config.notifications = JSON.parse(value);
              break;
            case 'volume':
              this.config.volume = parseFloat(value);
              break;
            case 'is_muted':
              this.config.isMuted = JSON.parse(value);
              break;
          }
        }
      });

      this.isInitialized = true;
      console.log('✅ ConfigService initialized:', this.config);
      this.notifyListeners();
      return this.config;
    } catch (error) {
      console.error('❌ ConfigService initialization failed:', error);
      this.isInitialized = true; // Use defaults
      return this.config;
    }
  }

  /**
   * Save configuration to persistent storage
   */
  async save() {
    try {
      const pairs = [
        ['camera_ip', this.config.cameraIP],
        ['camera_port', this.config.cameraPort.toString()],
        ['main_board_ip', this.config.mainBoardIP],
        ['main_board_port', this.config.mainBoardPort.toString()],
        ['wifi_ssid', this.config.wifiSSID],
        ['wifi_password', this.config.wifiPassword],
        ['update_interval', this.config.updateInterval.toString()],
        ['connection_timeout', this.config.connectionTimeout.toString()],
        ['reconnect_interval', this.config.reconnectInterval.toString()],
        ['auto_reconnect', JSON.stringify(this.config.autoReconnect)],
        ['notifications', JSON.stringify(this.config.notifications)],
        ['volume', this.config.volume.toString()],
        ['is_muted', JSON.stringify(this.config.isMuted)],
      ];

      await AsyncStorage.multiSet(pairs);
      console.log('✅ Configuration saved');
      this.notifyListeners();
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
      return { success: false, error };
    }
  }

  /**
   * Get current configuration
   */
  get() {
    return { ...this.config };
  }

  /**
   * Update specific configuration values
   */
  async update(updates) {
    this.config = { ...this.config, ...updates };
    return await this.save();
  }

  /**
   * Reset to default values
   */
  async reset() {
    this.config = {
      cameraIP: CONFIG.CAMERA_ESP32_IP,
      cameraPort: CONFIG.CAMERA_ESP32_PORT,
      mainBoardIP: CONFIG.MAIN_ESP32_IP,
      mainBoardPort: CONFIG.MAIN_ESP32_PORT,
      wifiSSID: '',
      wifiPassword: '',
      updateInterval: CONFIG.UPDATE_INTERVAL,
      connectionTimeout: CONFIG.CONNECTION_TIMEOUT,
      reconnectInterval: CONFIG.RECONNECT_INTERVAL,
      autoReconnect: true,
      notifications: true,
      volume: 1.0,
      isMuted: false,
    };

    await this.save();
    return this.config;
  }

  /**
   * Get camera board URL
   */
  getCameraURL() {
    return `http://${this.config.cameraIP}:${this.config.cameraPort}`;
  }

  /**
   * Get camera board WebSocket URL
   */
  getCameraWebSocketURL() {
    return `ws://${this.config.cameraIP}:${this.config.cameraPort}/ws`;
  }

  /**
   * Get main board URL
   */
  getMainBoardURL() {
    return `http://${this.config.mainBoardIP}:${this.config.mainBoardPort}`;
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of configuration changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    });
  }

  /**
   * Test connection to camera board
   */
  async testCameraConnection() {
    try {
      const response = await fetch(`${this.getCameraURL()}/stream`, {
        method: 'GET',
        timeout: 5000,
      });
      return { success: response.ok, status: response.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test connection to main board
   */
  async testMainBoardConnection() {
    try {
      const response = await fetch(`${this.getMainBoardURL()}/status`, {
        method: 'GET',
        timeout: 5000,
      });
      return { success: response.ok, status: response.status };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test both connections
   */
  async testAllConnections() {
    const [cameraResult, mainResult] = await Promise.all([
      this.testCameraConnection(),
      this.testMainBoardConnection(),
    ]);

    return {
      camera: cameraResult,
      mainBoard: mainResult,
      allConnected: cameraResult.success && mainResult.success,
    };
  }
}

export default new ConfigService();
