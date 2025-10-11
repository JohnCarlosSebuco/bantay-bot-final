import { CONFIG } from '../config/config';
import MainBoardService from './MainBoardService';

class WebSocketService {
  constructor() {
    // Main board uses HTTP polling (MainBoardService)
    // Camera board uses WebSocket
    this.cameraWs = null;     // Camera board (detection, camera controls)

    this.listeners = {};
    this.cameraReconnectAttempts = 0;
    this.isCameraConnecting = false;

    // Connection state
    this.cameraConnected = false;

    // Bind main board service events
    MainBoardService.on('connected', (status) => {
      this.emit('main_connected', status);
      this.emit('connected', this.isFullyConnected());
    });

    MainBoardService.on('data', (data) => {
      this.emit('main_data', data);
      this.emit('data', data);  // Legacy compatibility
    });

    MainBoardService.on('error', (error) => {
      this.emit('error', { source: 'main', error });
    });
  }

  /**
   * Connect to both ESP32 boards
   */
  connectAll() {
    this.connectMain();
    this.connectCamera();
  }

  /**
   * Connect to Main Control Board ESP32 (uses HTTP polling)
   */
  connectMain() {
    MainBoardService.startPolling(2000);  // Poll every 2 seconds
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
    return MainBoardService.getConnectionStatus() && this.cameraConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      main: MainBoardService.getConnectionStatus(),
      camera: this.cameraConnected,
      fullyConnected: this.isFullyConnected(),
    };
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
   * Send command to main board (uses HTTP)
   */
  async sendToMain(message) {
    // Map WebSocket-style commands to HTTP endpoints
    const command = message.command;
    const value = message.value;

    switch (command) {
      case 'SOUND_ALARM':
        return await MainBoardService.triggerAlarm();
      case 'PLAY_TRACK':
        return await MainBoardService.playTrack(value);
      case 'NEXT_TRACK':
        return await MainBoardService.nextTrack();
      case 'SET_VOLUME':
        return await MainBoardService.setVolume(value);
      case 'MOVE_ARMS':
        return await MainBoardService.moveArms();
      case 'STOP_MOVEMENT':
      case 'STOP_AUDIO':
        return await MainBoardService.stop();
      default:
        console.warn('Unknown main board command:', command);
        return { success: false, error: 'Unknown command' };
    }
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
    MainBoardService.disconnect();
    if (this.cameraWs) {
      this.cameraWs.close();
      this.cameraWs = null;
      this.cameraConnected = false;
    }
  }
}

export default new WebSocketService();