import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@detection_history';
const MAX_HISTORY_ITEMS = 100;

class DetectionHistoryService {
  /**
   * Add a new detection event to history
   */
  async addDetection(detectionData) {
    try {
      const history = await this.getHistory();

      const newDetection = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: detectionData.type || 'bird',
        confidence: detectionData.confidence || 0,
        position: detectionData.position || { x: 0, y: 0 },
        size: detectionData.size || 0,
        ...detectionData,
      };

      // Add to beginning of array
      history.unshift(newDetection);

      // Keep only last MAX_HISTORY_ITEMS
      const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));

      return newDetection;
    } catch (error) {
      console.error('Error adding detection:', error);
      return null;
    }
  }

  /**
   * Get all detection history
   */
  async getHistory() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }

  /**
   * Get detections for today
   */
  async getTodayDetections() {
    try {
      const history = await this.getHistory();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return history.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= today;
      });
    } catch (error) {
      console.error('Error getting today detections:', error);
      return [];
    }
  }

  /**
   * Get detection statistics
   */
  async getStatistics() {
    try {
      const history = await this.getHistory();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayDetections = history.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= today;
      });

      // Group by hour
      const hourlyData = new Array(24).fill(0);
      todayDetections.forEach(item => {
        const hour = new Date(item.timestamp).getHours();
        hourlyData[hour]++;
      });

      // Find peak hour
      let peakHour = 0;
      let maxDetections = 0;
      hourlyData.forEach((count, hour) => {
        if (count > maxDetections) {
          maxDetections = count;
          peakHour = hour;
        }
      });

      // Calculate average detections per hour
      const activeHours = hourlyData.filter(count => count > 0).length;
      const avgPerHour = activeHours > 0 ? todayDetections.length / activeHours : 0;

      return {
        totalToday: todayDetections.length,
        totalAllTime: history.length,
        peakHour,
        peakHourDetections: maxDetections,
        avgPerHour: Math.round(avgPerHour * 10) / 10,
        hourlyData,
        lastDetection: history[0] || null,
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        totalToday: 0,
        totalAllTime: 0,
        peakHour: 0,
        peakHourDetections: 0,
        avgPerHour: 0,
        hourlyData: new Array(24).fill(0),
        lastDetection: null,
      };
    }
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  /**
   * Delete a specific detection by ID
   */
  async deleteDetection(id) {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(item => item.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting detection:', error);
      return false;
    }
  }

  /**
   * Export history as JSON
   */
  async exportHistory() {
    try {
      const history = await this.getHistory();
      const stats = await this.getStatistics();

      return {
        exportDate: new Date().toISOString(),
        statistics: stats,
        detections: history,
      };
    } catch (error) {
      console.error('Error exporting history:', error);
      return null;
    }
  }
}

const detectionHistoryService = new DetectionHistoryService();

export default detectionHistoryService;