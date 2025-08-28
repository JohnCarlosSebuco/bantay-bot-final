import AsyncStorage from '@react-native-async-storage/async-storage';
import WebSocketService from './WebSocketService';

class HistoryService {
  constructor() {
    this.isStarted = false;
    this.listeners = {};
    this.lastEnvSavedAt = 0;
  }

  async start() {
    if (this.isStarted) return;
    this.isStarted = true;

    WebSocketService.on('data', this.handleData);
  }

  stop() {
    if (!this.isStarted) return;
    this.isStarted = false;

    WebSocketService.off('data', this.handleData);
  }

  handleData = async (data) => {
    try {
      const now = Date.now();

      // Motion events: log only when motion is detected (1)
      if (data && data.motion === 1) {
        await this.appendMotion({
          timestamp: now,
          distance: typeof data.distance === 'number' && isFinite(data.distance) ? data.distance : null,
        });
      }

      // Environmental sample every 60s
      if (now - this.lastEnvSavedAt >= 60 * 1000) {
        this.lastEnvSavedAt = now;
        await this.appendEnv({
          timestamp: now,
          temperature: typeof data.temperature === 'number' && isFinite(data.temperature) ? data.temperature : null,
          humidity: typeof data.humidity === 'number' && isFinite(data.humidity) ? data.humidity : null,
          soilMoisture: typeof data.soilMoisture === 'number' && isFinite(data.soilMoisture) ? data.soilMoisture : null,
        });
      }
    } catch (e) {
      // swallow errors to avoid impacting app flow
    }
  };

  async appendMotion(entry) {
    const key = 'history_motion';
    const list = await this.getList(key);
    list.unshift(entry);
    // Trim to last 500 items
    const trimmed = list.slice(0, 500);
    await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    this.emit('update');
  }

  async appendEnv(entry) {
    const key = 'history_env';
    const list = await this.getList(key);
    list.unshift(entry);
    // Trim to last 500 items
    const trimmed = list.slice(0, 500);
    await AsyncStorage.setItem(key, JSON.stringify(trimmed));
    this.emit('update');
  }

  async getMotionHistory() {
    return this.getList('history_motion');
  }

  async getEnvHistory() {
    return this.getList('history_env');
  }

  async clearAll() {
    await AsyncStorage.multiRemove(['history_motion', 'history_env']);
    this.emit('update');
  }

  async getList(key) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }

  off(event, cb) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((fn) => fn !== cb);
  }

  emit(event) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }
}

export default new HistoryService();


