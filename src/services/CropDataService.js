import FirebaseService from './FirebaseService';
import { FIREBASE_COLLECTIONS } from '../config/hardware.config';

class CropDataService {
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

  // ===========================
  // Harvest Data Management
  // ===========================

  /**
   * Add harvest data
   */
  async addHarvestData(harvestData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const harvestCollection = db.collection(FIREBASE_COLLECTIONS.HARVEST_DATA);

      const data = {
        ...harvestData,
        created_at: db.FieldValue.serverTimestamp(),
        updated_at: db.FieldValue.serverTimestamp()
      };

      const docRef = await harvestCollection.add(data);
      console.log('✅ Harvest data added:', docRef.id);
      return { success: true, id: docRef.id };

    } catch (error) {
      console.error('❌ Error adding harvest data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get harvest data with optional filtering
   */
  async getHarvestData(filters = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return [];
    }

    try {
      let query = db.collection(FIREBASE_COLLECTIONS.HARVEST_DATA);

      // Apply filters
      if (filters.cropType) {
        query = query.where('cropType', '==', filters.cropType);
      }
      if (filters.startDate) {
        query = query.where('harvestDate', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('harvestDate', '<=', filters.endDate);
      }

      // Order by harvest date (most recent first)
      query = query.orderBy('harvestDate', 'desc');

      // Apply limit if specified
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const harvestData = [];

      snapshot.forEach((doc) => {
        harvestData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`📊 Retrieved ${harvestData.length} harvest records`);
      return harvestData;

    } catch (error) {
      console.error('❌ Error getting harvest data:', error);
      return [];
    }
  }

  /**
   * Subscribe to harvest data updates
   */
  subscribeToHarvestData(callback, filters = {}) {
    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return null;
    }

    try {
      let query = db.collection(FIREBASE_COLLECTIONS.HARVEST_DATA);

      // Apply filters
      if (filters.cropType) {
        query = query.where('cropType', '==', filters.cropType);
      }

      // Order by harvest date (most recent first)
      query = query.orderBy('harvestDate', 'desc');

      // Apply limit if specified
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const unsubscribe = query.onSnapshot((snapshot) => {
        const harvestData = [];
        snapshot.forEach((doc) => {
          harvestData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        console.log(`📊 Harvest data updated: ${harvestData.length} records`);
        callback(harvestData);
      }, (error) => {
        console.error('❌ Error subscribing to harvest data:', error);
        callback([]);
      });

      return unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up harvest data subscription:', error);
      return null;
    }
  }

  /**
   * Update harvest data
   */
  async updateHarvestData(harvestId, updates) {
    if (!this.initialized) {
      await this.initialize();
    }

    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const harvestDoc = db.collection(FIREBASE_COLLECTIONS.HARVEST_DATA).doc(harvestId);

      const data = {
        ...updates,
        updated_at: db.FieldValue.serverTimestamp()
      };

      await harvestDoc.update(data);
      console.log('✅ Harvest data updated:', harvestId);
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating harvest data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete harvest data
   */
  async deleteHarvestData(harvestId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      await db.collection(FIREBASE_COLLECTIONS.HARVEST_DATA).doc(harvestId).delete();
      console.log('✅ Harvest data deleted:', harvestId);
      return { success: true };

    } catch (error) {
      console.error('❌ Error deleting harvest data:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================
  // Rainfall Data Management
  // ===========================

  /**
   * Add rainfall log entry
   */
  async addRainfallLog(rainfallData) {
    if (!this.initialized) {
      await this.initialize();
    }

    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const rainfallCollection = db.collection(FIREBASE_COLLECTIONS.RAINFALL_LOG);

      const data = {
        ...rainfallData,
        created_at: db.FieldValue.serverTimestamp()
      };

      const docRef = await rainfallCollection.add(data);
      console.log('✅ Rainfall log added:', docRef.id);
      return { success: true, id: docRef.id };

    } catch (error) {
      console.error('❌ Error adding rainfall log:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get rainfall data with optional filtering
   */
  async getRainfallData(filters = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return [];
    }

    try {
      let query = db.collection(FIREBASE_COLLECTIONS.RAINFALL_LOG);

      // Apply date filters
      if (filters.startDate) {
        query = query.where('date', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('date', '<=', filters.endDate);
      }

      // Order by date (most recent first)
      query = query.orderBy('date', 'desc');

      // Apply limit if specified
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const rainfallData = [];

      snapshot.forEach((doc) => {
        rainfallData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`🌧️ Retrieved ${rainfallData.length} rainfall records`);
      return rainfallData;

    } catch (error) {
      console.error('❌ Error getting rainfall data:', error);
      return [];
    }
  }

  /**
   * Subscribe to rainfall data updates
   */
  subscribeToRainfallData(callback, filters = {}) {
    const db = FirebaseService.getDatabase();
    if (!db) {
      console.error('❌ Firebase not initialized');
      return null;
    }

    try {
      let query = db.collection(FIREBASE_COLLECTIONS.RAINFALL_LOG);

      // Apply date filters
      if (filters.startDate) {
        query = query.where('date', '>=', filters.startDate);
      }
      if (filters.endDate) {
        query = query.where('date', '<=', filters.endDate);
      }

      // Order by date (most recent first)
      query = query.orderBy('date', 'desc');

      // Apply limit if specified
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const unsubscribe = query.onSnapshot((snapshot) => {
        const rainfallData = [];
        snapshot.forEach((doc) => {
          rainfallData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        console.log(`🌧️ Rainfall data updated: ${rainfallData.length} records`);
        callback(rainfallData);
      }, (error) => {
        console.error('❌ Error subscribing to rainfall data:', error);
        callback([]);
      });

      return unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up rainfall data subscription:', error);
      return null;
    }
  }

  // ===========================
  // Data Analytics
  // ===========================

  /**
   * Get harvest summary statistics
   */
  async getHarvestSummary(timeRange = 'month') {
    const harvestData = await this.getHarvestData();

    // Calculate summary statistics
    const summary = {
      totalHarvests: harvestData.length,
      totalYield: 0,
      averageYield: 0,
      cropTypes: {},
      recentHarvest: null
    };

    if (harvestData.length > 0) {
      summary.totalYield = harvestData.reduce((sum, harvest) => sum + (harvest.yield || 0), 0);
      summary.averageYield = summary.totalYield / harvestData.length;
      summary.recentHarvest = harvestData[0]; // Most recent (already sorted)

      // Count by crop type
      harvestData.forEach(harvest => {
        const cropType = harvest.cropType || 'unknown';
        summary.cropTypes[cropType] = (summary.cropTypes[cropType] || 0) + 1;
      });
    }

    return summary;
  }

  /**
   * Get rainfall summary statistics
   */
  async getRainfallSummary(timeRange = 'month') {
    const rainfallData = await this.getRainfallData();

    const summary = {
      totalEntries: rainfallData.length,
      totalRainfall: 0,
      averageRainfall: 0,
      recentRainfall: null
    };

    if (rainfallData.length > 0) {
      summary.totalRainfall = rainfallData.reduce((sum, entry) => sum + (entry.amount || 0), 0);
      summary.averageRainfall = summary.totalRainfall / rainfallData.length;
      summary.recentRainfall = rainfallData[0]; // Most recent (already sorted)
    }

    return summary;
  }
}

export default new CropDataService();