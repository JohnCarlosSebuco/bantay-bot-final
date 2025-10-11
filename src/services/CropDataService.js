import AsyncStorage from '@react-native-async-storage/async-storage';

const CROP_DATA_KEY = '@crop_data';
const HARVEST_HISTORY_KEY = '@harvest_history';
const ENVIRONMENTAL_HISTORY_KEY = '@environmental_history';
const RAINFALL_LOG_KEY = '@rainfall_log';

class CropDataService {
  /**
   * Save current crop information
   */
  async saveCropData(cropData) {
    try {
      await AsyncStorage.setItem(CROP_DATA_KEY, JSON.stringify({
        ...cropData,
        lastUpdated: new Date().toISOString(),
      }));
      return true;
    } catch (error) {
      console.error('Error saving crop data:', error);
      return false;
    }
  }

  /**
   * Get current crop information
   */
  async getCropData() {
    try {
      const data = await AsyncStorage.getItem(CROP_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting crop data:', error);
      return null;
    }
  }

  /**
   * Add harvest record
   */
  async addHarvestRecord(harvestData) {
    try {
      const history = await this.getHarvestHistory();

      const newRecord = {
        id: Date.now().toString(),
        date: harvestData.date || new Date().toISOString(),
        cropType: harvestData.cropType,
        yield: parseFloat(harvestData.yield),
        quality: harvestData.quality || 'good',
        plotSize: parseFloat(harvestData.plotSize || 0),
        notes: harvestData.notes || '',
        weatherConditions: harvestData.weatherConditions || {},
        birdDamagePercent: parseFloat(harvestData.birdDamagePercent || 0),
        ...harvestData,
      };

      history.unshift(newRecord);

      await AsyncStorage.setItem(HARVEST_HISTORY_KEY, JSON.stringify(history));
      return newRecord;
    } catch (error) {
      console.error('Error adding harvest record:', error);
      return null;
    }
  }

  /**
   * Get all harvest history
   */
  async getHarvestHistory() {
    try {
      const data = await AsyncStorage.getItem(HARVEST_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting harvest history:', error);
      return [];
    }
  }

  /**
   * Get harvest history for specific crop
   */
  async getHarvestHistoryByCrop(cropType) {
    try {
      const history = await this.getHarvestHistory();
      return history.filter(record => record.cropType === cropType);
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate average yield for crop type
   */
  async getAverageYield(cropType) {
    try {
      const history = await this.getHarvestHistoryByCrop(cropType);

      if (history.length === 0) return 0;

      const totalYield = history.reduce((sum, record) => sum + record.yield, 0);
      return totalYield / history.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Log daily environmental data
   */
  async logEnvironmentalData(data) {
    try {
      const history = await this.getEnvironmentalHistory();

      const today = new Date().toISOString().split('T')[0];

      // Check if entry for today exists
      const existingIndex = history.findIndex(record =>
        record.date.split('T')[0] === today
      );

      const newRecord = {
        date: new Date().toISOString(),
        avgTemp: parseFloat(data.avgTemp || 0),
        avgHumidity: parseFloat(data.avgHumidity || 0),
        avgSoilMoisture: parseFloat(data.avgSoilMoisture || 0),
        minTemp: parseFloat(data.minTemp || data.avgTemp || 0),
        maxTemp: parseFloat(data.maxTemp || data.avgTemp || 0),
        stressEvents: data.stressEvents || [],
        optimalConditions: data.optimalConditions || false,
        ...data,
      };

      if (existingIndex >= 0) {
        // Update existing record
        history[existingIndex] = newRecord;
      } else {
        // Add new record
        history.unshift(newRecord);
      }

      // Keep only last 90 days
      const trimmed = history.slice(0, 90);

      await AsyncStorage.setItem(ENVIRONMENTAL_HISTORY_KEY, JSON.stringify(trimmed));
      return newRecord;
    } catch (error) {
      console.error('Error logging environmental data:', error);
      return null;
    }
  }

  /**
   * Get environmental history
   */
  async getEnvironmentalHistory() {
    try {
      const data = await AsyncStorage.getItem(ENVIRONMENTAL_HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting environmental history:', error);
      return [];
    }
  }

  /**
   * Add rainfall record
   */
  async addRainfallRecord(amount, date = new Date()) {
    try {
      const rainfallLog = await this.getRainfallLog();

      const newRecord = {
        id: Date.now().toString(),
        date: date.toISOString(),
        amount: parseFloat(amount),
        notes: '',
      };

      rainfallLog.unshift(newRecord);

      // Keep only last 90 days
      const trimmed = rainfallLog.slice(0, 90);

      await AsyncStorage.setItem(RAINFALL_LOG_KEY, JSON.stringify(trimmed));
      return newRecord;
    } catch (error) {
      console.error('Error adding rainfall record:', error);
      return null;
    }
  }

  /**
   * Get rainfall log
   */
  async getRainfallLog() {
    try {
      const data = await AsyncStorage.getItem(RAINFALL_LOG_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting rainfall log:', error);
      return [];
    }
  }

  /**
   * Delete harvest record
   */
  async deleteHarvestRecord(id) {
    try {
      const history = await this.getHarvestHistory();
      const filtered = history.filter(record => record.id !== id);
      await AsyncStorage.setItem(HARVEST_HISTORY_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting harvest record:', error);
      return false;
    }
  }

  /**
   * Delete rainfall record
   */
  async deleteRainfallRecord(id) {
    try {
      const log = await this.getRainfallLog();
      const filtered = log.filter(record => record.id !== id);
      await AsyncStorage.setItem(RAINFALL_LOG_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting rainfall record:', error);
      return false;
    }
  }

  /**
   * Clear all crop data
   */
  async clearAllData() {
    try {
      await AsyncStorage.multiRemove([
        CROP_DATA_KEY,
        HARVEST_HISTORY_KEY,
        ENVIRONMENTAL_HISTORY_KEY,
        RAINFALL_LOG_KEY,
      ]);
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Export all data
   */
  async exportData() {
    try {
      const cropData = await this.getCropData();
      const harvestHistory = await this.getHarvestHistory();
      const envHistory = await this.getEnvironmentalHistory();
      const rainfallLog = await this.getRainfallLog();

      return {
        exportDate: new Date().toISOString(),
        cropData,
        harvestHistory,
        environmentalHistory: envHistory,
        rainfallLog,
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  /**
   * Get statistics summary
   */
  async getStatisticsSummary() {
    try {
      const harvestHistory = await this.getHarvestHistory();
      const envHistory = await this.getEnvironmentalHistory();
      const rainfallLog = await this.getRainfallLog();

      const totalHarvests = harvestHistory.length;
      const totalYield = harvestHistory.reduce((sum, h) => sum + h.yield, 0);
      const avgYield = totalHarvests > 0 ? totalYield / totalHarvests : 0;

      const totalRainfall = rainfallLog.reduce((sum, r) => sum + r.amount, 0);
      const avgDailyTemp = envHistory.length > 0 ?
        envHistory.reduce((sum, e) => sum + e.avgTemp, 0) / envHistory.length : 0;

      return {
        harvests: {
          total: totalHarvests,
          totalYield: totalYield.toFixed(1),
          avgYield: avgYield.toFixed(1),
        },
        environment: {
          daysTracked: envHistory.length,
          avgTemp: avgDailyTemp.toFixed(1),
        },
        rainfall: {
          total: totalRainfall.toFixed(1),
          eventsLogged: rainfallLog.length,
        },
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }
}

const cropDataService = new CropDataService();
export default cropDataService;