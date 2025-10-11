import { CONFIG } from '../config/config';

class WebSocketService {
  constructor() {
    // Dual WebSocket connections
    this.mainWs = null;       // Main control board (sensors, motors, audio)
    this.cameraWs = null;     // Camera board (detection, camera controls)

    this.listeners = {};
    this.mainReconnectAttempts = 0;
    this.cameraReconnectAttempts = 0;
    this.isMainConnecting = false;
    this.isCameraConnecting = false;

    // Connection state
    this.mainConnected = false;
    this.cameraConnected = false;
  }

  /**
   * Connect to both ESP32 boards
   */
  connectAll() {
    this.connectMain();
    this.connectCamera();
  }

  /**
   * Connect to Main Control Board ESP32
   */
  connectMain(ip = CONFIG.MAIN_ESP32_IP, path = CONFIG.MAIN_WEBSOCKET_PATH) {
    if (this.isMainConnecting || (this.mainWs && this.mainWs.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isMainConnecting = true;
    const url = `ws://${ip}:${CONFIG.MAIN_ESP32_PORT}${path}`;
    console.log('Connecting to Main Board:', url);

    try {
      this.mainWs = new WebSocket(url);

      this.mainWs.onopen = () => {
        console.log('✅ Main Board WebSocket connected');
        this.isMainConnecting = false;
        this.mainReconnectAttempts = 0;
        this.mainConnected = true;
        this.emit('main_connected', true);
        this.emit('connected', this.isFullyConnected());
      };

      this.mainWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('main_data', data);

          // Handle specific message types
          if (data && data.type === 'sensor_data') {
            this.emit('data', data);  // Legacy compatibility
          } else if (data && data.type === 'motion_alert') {
            this.emit('alert', data);
          }
        } catch (error) {
          console.error('Error parsing main board message:', error);
        }
      };

      this.mainWs.onerror = (error) => {
        console.error('Main Board WebSocket error:', error);
        this.isMainConnecting = false;
        this.mainConnected = false;
        this.emit('error', { source: 'main', error });
      };

      this.mainWs.onclose = () => {
        console.log('❌ Main Board WebSocket disconnected');
        this.isMainConnecting = false;
        this.mainConnected = false;
        this.emit('main_connected', false);
        this.emit('connected', this.isFullyConnected());
        this.attemptReconnectMain();
      };
    } catch (error) {
      console.error('Failed to connect to main board:', error);
      this.isMainConnecting = false;
      this.attemptReconnectMain();
    }
  }

  /**
   * Connect to Camera ESP32-CAM
   */
  connectCamera(ip = CONFIG.CAMERA_ESP32_IP, path = CONFIG.CAMERA_WEBSOCKET_PATH) {
    if (this.isCameraConnecting || (this.cameraWs && this.cameraWs.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isCameraConnecting = true;
    const url = `ws://${ip}:${CONFIG.CAMERA_ESP32_PORT}${path}`;
    console.log('Connecting to Camera Board:', url);

    try {
      this.cameraWs = new WebSocket(url);

      this.cameraWs.onopen = () => {
        console.log('✅ Camera Board WebSocket connected');
        this.isCameraConnecting = false;
        this.cameraReconnectAttempts = 0;
        this.cameraConnected = true;
        this.emit('camera_connected', true);
        this.emit('connected', this.isFullyConnected());
      };

      this.cameraWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('camera_data', data);

          // Handle specific message types
          if (data && data.type === 'bird_detection') {
            this.emit('alert', data);
          } else if (data && data.type === 'camera_status') {
            this.emit('camera_status', data);
          }
        } catch (error) {
          console.error('Error parsing camera board message:', error);
        }
      };

      this.cameraWs.onerror = (error) => {
        console.error('Camera Board WebSocket error:', error);
        this.isCameraConnecting = false;
        this.cameraConnected = false;
        this.emit('error', { source: 'camera', error });
      };

      this.cameraWs.onclose = () => {
        console.log('❌ Camera Board WebSocket disconnected');
        this.isCameraConnecting = false;
        this.cameraConnected = false;
        this.emit('camera_connected', false);
        this.emit('connected', this.isFullyConnected());
        this.attemptReconnectCamera();
      };
    } catch (error) {
      console.error('Failed to connect to camera board:', error);
      this.isCameraConnecting = false;
      this.attemptReconnectCamera();
    }
  }

  /**
   * Legacy connect method - connects to main board only
   */
  connect(ip = CONFIG.ESP32_IP, path = CONFIG.WEBSOCKET_PATH) {
    // Use main board connection for backward compatibility
    this.connectMain(ip, path);
  }

  /**
   * Check if both connections are established
   */
  isFullyConnected() {
    return this.mainConnected && this.cameraConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      main: this.mainConnected,
      camera: this.cameraConnected,
      fullyConnected: this.isFullyConnected(),
    };
  }

  /**
   * Reconnection logic
   */
  attemptReconnectMain() {
    if (this.mainReconnectAttempts < 5) {
      this.mainReconnectAttempts++;
      setTimeout(() => {
        console.log(`🔄 Main Board reconnection attempt ${this.mainReconnectAttempts}`);
        this.connectMain();
      }, CONFIG.RECONNECT_INTERVAL);
    }
  }

  attemptReconnectCamera() {
    if (this.cameraReconnectAttempts < 5) {
      this.cameraReconnectAttempts++;
      setTimeout(() => {
        console.log(`🔄 Camera Board reconnection attempt ${this.cameraReconnectAttempts}`);
        this.connectCamera();
      }, CONFIG.RECONNECT_INTERVAL);
    }
  }

  /**
   * Send command to main board
   */
  sendToMain(message) {
    if (this.mainWs && this.mainWs.readyState === WebSocket.OPEN) {
      this.mainWs.send(JSON.stringify(message));
      return true;
    }
    console.warn('Main board not connected, cannot send message');
    return false;
  }

  /**
   * Send command to camera board
   */
  sendToCamera(message) {
    if (this.cameraWs && this.cameraWs.readyState === WebSocket.OPEN) {
      this.cameraWs.send(JSON.stringify(message));
      return true;
    }
    console.warn('Camera board not connected, cannot send message');
    return false;
  }

  /**
   * Legacy send method - sends to main board
   */
  send(message) {
    return this.sendToMain(message);
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
   * Disconnect from all boards
   */
  disconnect() {
    if (this.mainWs) {
      this.mainWs.close();
      this.mainWs = null;
      this.mainConnected = false;
    }
    if (this.cameraWs) {
      this.cameraWs.close();
      this.cameraWs = null;
      this.cameraConnected = false;
    }
  }
}

export default new WebSocketService();